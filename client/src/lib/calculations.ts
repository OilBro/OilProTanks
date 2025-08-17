/**
 * API 653 Thickness Calculations Library
 */

export function validateThickness(value: number): boolean {
  return !isNaN(value) && value > 0 && value < 10; // Reasonable range for thickness in inches
}

export interface CalculationResult {
  corrosionRate: number;
  remainingLife: number;
  status: 'acceptable' | 'monitor' | 'action_required';
}

export function calculateMeasurement(
  originalThickness: number,
  currentThickness: number,
  yearsSinceLastInspection: number
): CalculationResult {
  // Calculate metal loss
  const metalLoss = originalThickness - currentThickness;
  
  // Calculate corrosion rate (inches per year)
  const corrosionRate = yearsSinceLastInspection > 0 
    ? metalLoss / yearsSinceLastInspection 
    : 0;
  
  // Calculate minimum required thickness (simplified - would need component-specific calculations)
  const minThickness = originalThickness * 0.5; // 50% of original as simplified estimate
  
  // Calculate remaining thickness available for corrosion
  const remainingCorrosionAllowance = currentThickness - minThickness;
  
  // Calculate remaining life
  const remainingLife = corrosionRate > 0 
    ? remainingCorrosionAllowance / corrosionRate 
    : 999; // If no corrosion, effectively infinite life
  
  // Determine status based on remaining life
  let status: 'acceptable' | 'monitor' | 'action_required';
  if (remainingLife > 10) {
    status = 'acceptable';
  } else if (remainingLife > 5) {
    status = 'monitor';
  } else {
    status = 'action_required';
  }
  
  // Also check current thickness against minimum
  if (currentThickness <= minThickness) {
    status = 'action_required';
  }
  
  return {
    corrosionRate,
    remainingLife: Math.min(remainingLife, 999), // Cap at 999 years
    status
  };
}

export function calculateTMin(
  diameter: number,
  height: number,
  specificGravity: number = 1.0,
  jointEfficiency: number = 1.0,
  allowableStress: number = 23000 // psi, typical for A36 steel
): number {
  // API 653 formula: t = 2.6 * D * (H - 1) * G / (S * E)
  // Where:
  // t = minimum thickness (inches)
  // D = diameter (feet)
  // H = height (feet)
  // G = specific gravity
  // S = allowable stress (psi)
  // E = joint efficiency
  
  const tMin = (2.6 * diameter * (height - 1) * specificGravity) / (allowableStress * jointEfficiency);
  return Math.max(tMin, 0.1); // Minimum 0.1 inches
}

export function calculateRemainingLifeWithSafetyFactor(
  currentThickness: number,
  minThickness: number,
  corrosionRate: number,
  safetyFactor: number = 2.0
): number {
  const remainingCorrosionAllowance = currentThickness - minThickness;
  
  if (remainingCorrosionAllowance <= 0) {
    return 0; // Already below minimum
  }
  
  if (corrosionRate <= 0) {
    return 999; // No corrosion detected
  }
  
  const remainingLife = remainingCorrosionAllowance / (corrosionRate * safetyFactor);
  return Math.min(remainingLife, 999);
}