/**
 * API 653 Calculation Functions for Client-Side PDF Generation
 * These are duplicated from server-side to be available in the browser
 */

// API 653 Table 4.1 - Minimum Thickness for Tank Shell
export function calculateMinimumRequiredThickness(
  courseNumber: number,
  tankDiameter: number, // feet
  specificGravity: number,
  fillHeight: number, // feet from bottom of course
  jointEfficiency: number = 0.85,
  allowableStress: number = 23200 // psi for A285-C steel
): number {
  // API 653 Formula: tmin = 2.6 * D * (H - 1) * G / (S * E)
  // Where:
  // D = Tank diameter in feet
  // H = Height of liquid in feet above bottom of course under consideration
  // G = Specific gravity of liquid
  // S = Allowable stress (psi)
  // E = Joint efficiency
  
  const H = Math.max(fillHeight - 1, 0); // API 653 uses (H-1)
  const tmin = (2.6 * tankDiameter * H * specificGravity) / (allowableStress * jointEfficiency);
  
  return Math.max(tmin, 0.1); // Minimum 0.1" per API 653
}

// Calculate corrosion rate
export function calculateCorrosionRate(
  originalThickness: number,
  currentThickness: number,
  ageInYears: number
): { rateInchesPerYear: number; rateMPY: number } {
  if (ageInYears <= 0) {
    return { rateInchesPerYear: 0, rateMPY: 0 };
  }
  
  const loss = originalThickness - currentThickness;
  const rateInchesPerYear = loss / ageInYears;
  const rateMPY = rateInchesPerYear * 1000; // Convert to mils per year
  
  return { rateInchesPerYear, rateMPY };
}

// Calculate remaining life based on current thickness and corrosion rate
export function calculateRemainingLife(
  currentThickness: number,
  minimumRequired: number,
  corrosionRate: number // inches per year
): number {
  if (corrosionRate <= 0) {
    return 999; // No corrosion = infinite life (capped at 999 years)
  }
  
  if (currentThickness <= minimumRequired) {
    return 0; // Already below minimum
  }
  
  const remainingCorrosionAllowance = currentThickness - minimumRequired;
  const remainingLife = remainingCorrosionAllowance / corrosionRate;
  
  return Math.max(0, Math.min(remainingLife, 999)); // Cap at 999 years
}

// Determine inspection interval based on remaining life
export function calculateInspectionInterval(
  remainingLife: number,
  isInternal: boolean
): number {
  // API 653 requirements:
  // External: Lesser of 1/4 remaining life or 5 years
  // Internal: Lesser of 1/2 remaining life or 10 years (if corrosion rate known)
  
  if (isInternal) {
    const halfLife = remainingLife / 2;
    return Math.min(halfLife, 10);
  } else {
    const quarterLife = remainingLife / 4;
    return Math.min(quarterLife, 5);
  }
}

// Get absolute minimum thickness based on tank diameter
export function getAbsoluteMinThickness(diameterFt: number): number {
  // API 653 Table 4.1 minimum thicknesses
  if (diameterFt < 50) {
    return 0.1; // 0.10 inch minimum
  } else if (diameterFt < 120) {
    return 0.1; // 0.10 inch minimum
  } else if (diameterFt < 200) {
    return 0.1; // 0.10 inch minimum
  } else {
    return 0.1; // 0.10 inch minimum for all sizes per API 653
  }
}

// Calculate maximum fill height based on current thickness
export function calculateMaxFillHeight(
  currentThickness: number,
  tankDiameter: number,
  specificGravity: number,
  jointEfficiency: number = 0.85,
  allowableStress: number = 23200
): number {
  // Rearrange API 653 formula to solve for H
  // tmin = 2.6 * D * (H - 1) * G / (S * E)
  // H = (tmin * S * E) / (2.6 * D * G) + 1
  
  const H = (currentThickness * allowableStress * jointEfficiency) / (2.6 * tankDiameter * specificGravity) + 1;
  return Math.max(0, H);
}

// Evaluate component status based on remaining life
export function evaluateComponentStatus(remainingLife: number): {
  status: 'acceptable' | 'monitor' | 'action_required';
  color: string;
  recommendation: string;
} {
  if (remainingLife > 10) {
    return {
      status: 'acceptable',
      color: 'green',
      recommendation: 'Continue routine inspection schedule'
    };
  } else if (remainingLife > 5) {
    return {
      status: 'monitor',
      color: 'yellow',
      recommendation: 'Increase inspection frequency and monitor closely'
    };
  } else {
    return {
      status: 'action_required',
      color: 'red',
      recommendation: 'Immediate repair or replacement required'
    };
  }
}

// Calculate critical length for bottom pitting
export function calculateCriticalLength(
  diameter: number, // feet
  bottomThickness: number // inches
): number {
  // API 653 Section 4.4.5.2 - Critical length formula
  // L = 3.7 * sqrt(D * t)
  // Where D is in feet and t is in inches
  
  return 3.7 * Math.sqrt(diameter * bottomThickness);
}

// Evaluate settlement based on API 653 Annex B
export function evaluateSettlement(
  maxSettlement: number, // inches
  tankDiameter: number, // feet
  edgeSettlement: number // inches
): {
  acceptable: boolean;
  criteria: string;
  recommendation: string;
} {
  // API 653 Annex B settlement criteria
  const allowableEdgeSettlement = tankDiameter * 0.37 / 12; // Convert to inches
  const allowableUniformSettlement = 12; // 12 inches typical maximum
  
  if (edgeSettlement > allowableEdgeSettlement) {
    return {
      acceptable: false,
      criteria: `Edge settlement ${edgeSettlement.toFixed(2)}" exceeds allowable ${allowableEdgeSettlement.toFixed(2)}"`,
      recommendation: 'Foundation repair required'
    };
  }
  
  if (maxSettlement > allowableUniformSettlement) {
    return {
      acceptable: false,
      criteria: `Maximum settlement ${maxSettlement.toFixed(2)}" exceeds allowable ${allowableUniformSettlement}"`,
      recommendation: 'Evaluate tank shell stress and consider releveling'
    };
  }
  
  return {
    acceptable: true,
    criteria: 'Settlement within API 653 limits',
    recommendation: 'Continue monitoring settlement'
  };
}