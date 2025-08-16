/**
 * Settlement Analysis Calculator
 * Implements API 653 Annex B calculations for tank settlement
 */

interface SettlementPoint {
  angle: number; // degrees
  elevation: number; // inches (higher value = lower elevation)
}

interface TankParameters {
  diameter: number; // feet
  height: number; // feet
  yieldStrength: number; // psi (default 20,000)
  elasticModulus: number; // psi (default 29,000,000)
}

interface CosineFitResults {
  amplitude: number; // A value (inches)
  phase: number; // B value (radians)
  rSquared: number; // R² correlation coefficient
  normalizedElevations: number[]; // Ui values
  predictedElevations: number[]; // Cosine fit values
  outOfPlaneDeviations: number[]; // Si values
  maxOutOfPlane: number; // Max |Si|
  allowableSettlement: number; // Per B.3.2.1
  settlementAcceptance: 'ACCEPTABLE' | 'MONITOR' | 'ACTION_REQUIRED';
  annexReference: string;
}

interface EdgeSettlementResults {
  measuredSettlement: number; // Bew
  allowableSettlement: number; // Be
  settlementRatio: number; // Bew/Be
  acceptanceCriteria: string;
  isAcceptable: boolean;
}

/**
 * Calculate cosine fit for settlement survey per API 653 Annex B.2.2.4
 */
export function calculateCosineFit(
  points: SettlementPoint[],
  tankParams: TankParameters
): CosineFitResults {
  const n = points.length;
  
  // Convert angles to radians
  const angles = points.map(p => (p.angle * Math.PI) / 180);
  
  // Normalize elevations (subtract mean to get Ui values)
  const meanElevation = points.reduce((sum, p) => sum + p.elevation, 0) / n;
  const normalizedElevations = points.map(p => p.elevation - meanElevation);
  
  // Calculate cosine fit parameters using least squares
  // Model: U = A*cos(θ - B)
  // Expand: U = A*cos(B)*cos(θ) + A*sin(B)*sin(θ)
  // Let a = A*cos(B) and b = A*sin(B)
  
  let sumCos = 0, sumSin = 0;
  let sumCosCos = 0, sumSinSin = 0, sumCosSin = 0;
  let sumUCos = 0, sumUSin = 0;
  
  for (let i = 0; i < n; i++) {
    const theta = angles[i];
    const U = normalizedElevations[i];
    const cos_theta = Math.cos(theta);
    const sin_theta = Math.sin(theta);
    
    sumCos += cos_theta;
    sumSin += sin_theta;
    sumCosCos += cos_theta * cos_theta;
    sumSinSin += sin_theta * sin_theta;
    sumCosSin += cos_theta * sin_theta;
    sumUCos += U * cos_theta;
    sumUSin += U * sin_theta;
  }
  
  // Solve normal equations
  const det = n * (sumCosCos * sumSinSin - sumCosSin * sumCosSin) -
              sumCos * (sumCos * sumSinSin - sumSin * sumCosSin) +
              sumSin * (sumCos * sumCosSin - sumSin * sumCosCos);
              
  const a = (sumUCos * (n * sumSinSin - sumSin * sumSin) -
             sumUSin * (n * sumCosSin - sumCos * sumSin)) / det;
             
  const b = (sumUSin * (n * sumCosCos - sumCos * sumCos) -
             sumUCos * (n * sumCosSin - sumCos * sumSin)) / det;
  
  // Convert back to A and B
  const amplitude = Math.sqrt(a * a + b * b);
  const phase = Math.atan2(b, a); // radians
  
  // Calculate predicted values and R²
  const predictedElevations: number[] = [];
  const outOfPlaneDeviations: number[] = [];
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = amplitude * Math.cos(angles[i] - phase);
    predictedElevations.push(predicted);
    
    const deviation = normalizedElevations[i] - predicted;
    outOfPlaneDeviations.push(deviation);
    
    ssTotal += normalizedElevations[i] * normalizedElevations[i];
    ssResidual += deviation * deviation;
  }
  
  const rSquared = 1 - (ssResidual / ssTotal);
  const maxOutOfPlane = Math.max(...outOfPlaneDeviations.map(Math.abs));
  
  // Calculate allowable settlement per B.3.2.1 (cosine fit method)
  // S_allow = (L²/2H) * (Y/E)
  // where L = arc length between measurement points
  const circumference = Math.PI * tankParams.diameter; // feet
  const arcLength = circumference / n; // feet
  const L = arcLength * 12; // convert to inches
  const H = tankParams.height * 12; // convert to inches
  const Y = tankParams.yieldStrength || 20000; // psi
  const E = tankParams.elasticModulus || 29000000; // psi
  
  const allowableSettlement = (L * L) / (2 * H) * (Y / E);
  
  // Determine acceptance status
  let settlementAcceptance: 'ACCEPTABLE' | 'MONITOR' | 'ACTION_REQUIRED';
  if (maxOutOfPlane <= allowableSettlement) {
    settlementAcceptance = 'ACCEPTABLE';
  } else if (maxOutOfPlane <= 1.5 * allowableSettlement) {
    settlementAcceptance = 'MONITOR';
  } else {
    settlementAcceptance = 'ACTION_REQUIRED';
  }
  
  // Determine Annex reference based on conditions
  let annexReference = 'B.3.2.1'; // Cosine fit method
  if (rSquared >= 0.9 && n >= 8) {
    annexReference = 'B.2.2.4 (Cosine fit validity confirmed)';
  }
  
  return {
    amplitude,
    phase,
    rSquared,
    normalizedElevations,
    predictedElevations,
    outOfPlaneDeviations,
    maxOutOfPlane,
    allowableSettlement,
    settlementAcceptance,
    annexReference
  };
}

/**
 * Process external ringwall survey with tie-shot normalization
 */
export function processExternalRingwallSurvey(
  points: SettlementPoint[],
  tiePoints?: { index: number; offset: number }[]
): SettlementPoint[] {
  const processedPoints = [...points];
  
  // Apply tie-shot offsets if provided
  if (tiePoints && tiePoints.length > 0) {
    for (const tie of tiePoints) {
      if (tie.index < processedPoints.length) {
        // Remove tie offset from subsequent points
        for (let i = tie.index; i < processedPoints.length; i++) {
          processedPoints[i].elevation -= tie.offset;
        }
      }
    }
  }
  
  return processedPoints;
}

/**
 * Calculate edge settlement (breakover) per API 653 Annex B.3.4
 */
export function calculateEdgeSettlement(
  measuredSettlement: number, // Bew (inches)
  edgeWidth: number, // B (inches)
  radiusToEdge: number, // R (inches)
  tankParams: TankParameters
): EdgeSettlementResults {
  // Calculate allowable edge settlement
  // Be = (B²/2R) * (Y/E)
  const Y = tankParams.yieldStrength || 20000; // psi
  const E = tankParams.elasticModulus || 29000000; // psi
  
  const allowableSettlement = (edgeWidth * edgeWidth) / (2 * radiusToEdge) * (Y / E);
  const settlementRatio = measuredSettlement / allowableSettlement;
  
  const isAcceptable = settlementRatio <= 1.0;
  const acceptanceCriteria = `Per B.3.4: Bew/Be = ${settlementRatio.toFixed(3)} ${
    isAcceptable ? '≤ 1.0 (ACCEPTABLE)' : '> 1.0 (ACTION REQUIRED)'
  }`;
  
  return {
    measuredSettlement,
    allowableSettlement,
    settlementRatio,
    acceptanceCriteria,
    isAcceptable
  };
}

/**
 * Generate settlement analysis summary for reporting
 */
export function generateSettlementSummary(
  cosineFit: CosineFitResults,
  edgeSettlement?: EdgeSettlementResults
): string {
  let summary = `SETTLEMENT ANALYSIS SUMMARY\n`;
  summary += `${'='.repeat(50)}\n\n`;
  
  // Cosine fit results
  summary += `COSINE FIT ANALYSIS:\n`;
  summary += `- R² Value: ${cosineFit.rSquared.toFixed(4)}`;
  summary += cosineFit.rSquared >= 0.9 ? ' (Valid per B.2.2.4)\n' : ' (Below 0.9 threshold)\n';
  summary += `- Amplitude (A): ${cosineFit.amplitude.toFixed(3)} inches\n`;
  summary += `- Phase (B): ${(cosineFit.phase * 180 / Math.PI).toFixed(1)}°\n`;
  summary += `- Max Out-of-Plane: ${cosineFit.maxOutOfPlane.toFixed(3)} inches\n`;
  summary += `- Allowable Settlement: ${cosineFit.allowableSettlement.toFixed(3)} inches\n`;
  summary += `- Status: ${cosineFit.settlementAcceptance}\n`;
  summary += `- Reference: ${cosineFit.annexReference}\n\n`;
  
  // Edge settlement if provided
  if (edgeSettlement) {
    summary += `EDGE SETTLEMENT ANALYSIS:\n`;
    summary += `- Measured Settlement (Bew): ${edgeSettlement.measuredSettlement.toFixed(3)} inches\n`;
    summary += `- Allowable Settlement (Be): ${edgeSettlement.allowableSettlement.toFixed(3)} inches\n`;
    summary += `- Settlement Ratio: ${edgeSettlement.settlementRatio.toFixed(3)}\n`;
    summary += `- ${edgeSettlement.acceptanceCriteria}\n\n`;
  }
  
  // Overall recommendation
  summary += `RECOMMENDATION:\n`;
  if (cosineFit.settlementAcceptance === 'ACCEPTABLE' && 
      (!edgeSettlement || edgeSettlement.isAcceptable)) {
    summary += `Tank settlement is within acceptable limits per API 653 Annex B.\n`;
    summary += `Continue routine monitoring per inspection schedule.`;
  } else if (cosineFit.settlementAcceptance === 'MONITOR') {
    summary += `Tank settlement requires increased monitoring.\n`;
    summary += `Recommend settlement survey at next internal inspection.`;
  } else {
    summary += `Tank settlement exceeds allowable limits.\n`;
    summary += `Engineering evaluation required per API 653 Section 10.`;
  }
  
  return summary;
}

/**
 * Format settlement data for CSV export
 */
export function formatSettlementForCSV(
  points: SettlementPoint[],
  cosineFit: CosineFitResults
): string {
  let csv = 'Point,Angle(deg),Measured(in),Normalized(Ui),Predicted,Out-of-Plane(Si)\n';
  
  for (let i = 0; i < points.length; i++) {
    csv += `${i + 1},`;
    csv += `${points[i].angle.toFixed(1)},`;
    csv += `${points[i].elevation.toFixed(4)},`;
    csv += `${cosineFit.normalizedElevations[i].toFixed(4)},`;
    csv += `${cosineFit.predictedElevations[i].toFixed(4)},`;
    csv += `${cosineFit.outOfPlaneDeviations[i].toFixed(4)}\n`;
  }
  
  return csv;
}