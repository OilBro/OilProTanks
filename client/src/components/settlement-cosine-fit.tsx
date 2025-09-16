import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartBlock } from '@/components/layout/ChartBlock';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface SettlementPoint {
  pointNumber: number;
  angle: number;
  measuredElevation: number;
  cosineFitElevation?: number;
  outOfPlane?: number;
}

interface SettlementCosineFitProps {
  measurements: SettlementPoint[];
  tankDiameter: number;
  tankHeight: number;
  yieldStrength?: number; // psi
  elasticModulus?: number; // psi
  onAnalysisComplete?: (results: AnalysisResults) => void;
}

interface AnalysisResults {
  amplitude: number;
  phase: number;
  rSquared: number;
  maxOutOfPlane: number;
  allowableSettlement: number;
  settlementAcceptance: 'ACCEPTABLE' | 'MONITOR' | 'ACTION_REQUIRED';
  annexReference: string;
}

export function SettlementCosineFit({
  measurements,
  tankDiameter,
  tankHeight,
  yieldStrength = 20000,
  elasticModulus = 29000000,
  onAnalysisComplete
}: SettlementCosineFitProps) {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);

  // Perform cosine fit analysis
  const performCosineFit = useMemo(() => {
    if (!measurements || measurements.length < 8) return null;

    // Normalize elevations (subtract mean)
    const meanElevation = measurements.reduce((sum, m) => sum + m.measuredElevation, 0) / measurements.length;
    const normalizedMeasurements = measurements.map(m => ({
      ...m,
      normalizedElevation: m.measuredElevation - meanElevation
    }));

    // Cosine fit using least squares
    // y = A * cos(θ - φ) where A is amplitude, φ is phase
    let bestA = 0;
    let bestPhi = 0;
    let bestRSquared = 0;

    // Grid search for best fit parameters
    for (let phi = 0; phi < 360; phi += 5) {
      const phiRad = (phi * Math.PI) / 180;
      
      // Calculate amplitude using least squares
      let numerator = 0;
      let denominator = 0;
      
      normalizedMeasurements.forEach(m => {
        const angleRad = (m.angle * Math.PI) / 180;
        const cosValue = Math.cos(angleRad - phiRad);
        numerator += m.normalizedElevation * cosValue;
        denominator += cosValue * cosValue;
      });
      
      const A = denominator > 0 ? numerator / denominator : 0;
      
      // Calculate R-squared
      let ssRes = 0;
      let ssTot = 0;
      
      normalizedMeasurements.forEach(m => {
        const angleRad = (m.angle * Math.PI) / 180;
        const fitted = A * Math.cos(angleRad - phiRad);
        ssRes += Math.pow(m.normalizedElevation - fitted, 2);
        ssTot += Math.pow(m.normalizedElevation, 2);
      });
      
      const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
      
      if (rSquared > bestRSquared) {
        bestRSquared = rSquared;
        bestA = A;
        bestPhi = phi;
      }
    }

    // Calculate fitted values and out-of-plane deviations
    const fittedMeasurements = normalizedMeasurements.map(m => {
      const angleRad = (m.angle * Math.PI) / 180;
      const phiRad = (bestPhi * Math.PI) / 180;
      const cosineFitElevation = bestA * Math.cos(angleRad - phiRad);
      const outOfPlane = Math.abs(m.normalizedElevation - cosineFitElevation);
      
      return {
        ...m,
        cosineFitElevation,
        outOfPlane
      };
    });

    const maxOutOfPlane = Math.max(...fittedMeasurements.map(m => m.outOfPlane || 0));

    // Calculate allowable settlement per API 653 Annex B
    const radiusInches = (tankDiameter * 12) / 2;
    const heightInches = tankHeight * 12;
    
    // Simplified API 653 formula for allowable settlement
    // This is a simplified version - actual implementation should use full API 653 equations
    const allowableSettlement = Math.min(
      11 * Math.sqrt(radiusInches),  // API 653 B.3.2.1 formula
      heightInches * 0.01  // 1% of tank height limit
    );

    // Determine acceptance criteria
    let settlementAcceptance: AnalysisResults['settlementAcceptance'] = 'ACCEPTABLE';
    let annexReference = 'API 653 Annex B.3.2.1';
    
    const actualSettlement = Math.abs(bestA) * 2; // Peak-to-peak settlement
    
    if (actualSettlement > allowableSettlement) {
      settlementAcceptance = 'ACTION_REQUIRED';
      annexReference = 'API 653 Annex B.3.2.1 - Settlement exceeds allowable';
    } else if (actualSettlement > allowableSettlement * 0.75) {
      settlementAcceptance = 'MONITOR';
      annexReference = 'API 653 Annex B.3.2.1 - Settlement approaching limit';
    } else if (bestRSquared < 0.90) {
      settlementAcceptance = 'MONITOR';
      annexReference = 'API 653 Annex B.2.2.4 - R² < 0.90, cosine fit may not be appropriate';
    }

    return {
      fittedMeasurements,
      results: {
        amplitude: bestA,
        phase: bestPhi,
        rSquared: bestRSquared,
        maxOutOfPlane,
        allowableSettlement: allowableSettlement / 12, // Convert to feet
        settlementAcceptance,
        annexReference
      }
    };
  }, [measurements, tankDiameter, tankHeight, yieldStrength, elasticModulus]);

  useEffect(() => {
    if (performCosineFit) {
      setAnalysisResults(performCosineFit.results);
      onAnalysisComplete?.(performCosineFit.results);
    }
  }, [performCosineFit, onAnalysisComplete]);

  if (!performCosineFit) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Insufficient data for cosine fit analysis. At least 8 measurement points are required.
        </AlertDescription>
      </Alert>
    );
  }

  const { fittedMeasurements, results } = performCosineFit;

  // Prepare chart data
  const chartData = fittedMeasurements.map(m => ({
    angle: m.angle,
    measured: parseFloat(m.normalizedElevation.toFixed(4)),
    cosineFit: parseFloat(m.cosineFitElevation!.toFixed(4)),
    outOfPlane: parseFloat(m.outOfPlane!.toFixed(4))
  }));

  const getAcceptanceBadge = (acceptance: string) => {
    switch (acceptance) {
      case 'ACCEPTABLE':
        return <Badge className="bg-green-500 text-white">Acceptable</Badge>;
      case 'MONITOR':
        return <Badge className="bg-yellow-500 text-white">Monitor</Badge>;
      case 'ACTION_REQUIRED':
        return <Badge className="bg-red-500 text-white">Action Required</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getAcceptanceIcon = (acceptance: string) => {
    switch (acceptance) {
      case 'ACCEPTABLE':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'MONITOR':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'ACTION_REQUIRED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cosine Fit Analysis Results</span>
            {getAcceptanceBadge(results.settlementAcceptance)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Amplitude</div>
              <div className="text-xl font-bold">{results.amplitude.toFixed(4)} ft</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Phase Angle</div>
              <div className="text-xl font-bold">{results.phase.toFixed(1)}°</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">R² Value</div>
              <div className={`text-xl font-bold ${results.rSquared < 0.9 ? 'text-orange-600' : 'text-green-600'}`}>
                {results.rSquared.toFixed(4)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Max Out-of-Plane</div>
              <div className="text-xl font-bold">{results.maxOutOfPlane.toFixed(4)} ft</div>
            </div>
          </div>

          {/* Acceptance Criteria */}
          <Alert className={`${
            results.settlementAcceptance === 'ACCEPTABLE' ? 'border-green-200 bg-green-50' :
            results.settlementAcceptance === 'MONITOR' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start gap-2">
              {getAcceptanceIcon(results.settlementAcceptance)}
              <div className="flex-1">
                <div className="font-medium mb-1">Settlement Assessment</div>
                <div className="text-sm">
                  <p>Peak-to-Peak Settlement: {(results.amplitude * 2).toFixed(4)} ft</p>
                  <p>Allowable Settlement: {results.allowableSettlement.toFixed(4)} ft</p>
                  <p className="mt-1 italic">{results.annexReference}</p>
                </div>
              </div>
            </div>
          </Alert>

          {/* R² Warning if below 0.90 */}
          {results.rSquared < 0.90 && (
            <Alert className="mt-3 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <strong>Warning:</strong> R² value is below 0.90. Per API 653 Annex B.2.2.4, 
                cosine fit may not be appropriate for this settlement pattern. Consider alternative 
                analysis methods or additional survey points.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Settlement Profile Chart */}
      <ChartBlock height={420}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Settlement Profile - Measured vs. Cosine Fit</CardTitle>
          </CardHeader>
            <CardContent className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="angle" 
                    label={{ value: 'Angle (degrees)', position: 'insideBottom', offset: -5 }}
                    domain={[0, 360]}
                    ticks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                  />
                  <YAxis 
                    label={{ value: 'Elevation (ft)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value: number) => (value as number).toFixed(4)} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="measured" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 4 }}
                    name="Measured"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cosineFit" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Cosine Fit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
        </Card>
      </ChartBlock>

      {/* Out-of-Plane Deviations Chart */}
      <ChartBlock height={340}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Out-of-Plane Deviations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="angle" 
                  label={{ value: 'Angle (degrees)', position: 'insideBottom', offset: -5 }}
                  domain={[0, 360]}
                  ticks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                />
                <YAxis 
                  label={{ value: 'Deviation (ft)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip formatter={(value: number) => (value as number).toFixed(4)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="outOfPlane" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Out-of-Plane"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </ChartBlock>
    </div>
  );
}