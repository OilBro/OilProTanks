export interface CalculationResult {
  corrosionRate: number;
  remainingLife: number;
  status: 'acceptable' | 'monitor' | 'action_required';
}

export function calculateCorrosionRate(
  originalThickness: number,
  currentThickness: number,
  years: number
): number {
  if (!originalThickness || !currentThickness || !years || years === 0) {
    return 0;
  }
  return (originalThickness - currentThickness) / years;
}

export function calculateRemainingLife(
  currentThickness: number,
  corrosionRate: number,
  minimumThickness: number = 0.1
): number {
  if (!currentThickness || !corrosionRate || corrosionRate === 0) {
    return 0;
  }
  const remainingThickness = currentThickness - minimumThickness;
  return Math.max(0, remainingThickness / corrosionRate);
}

export function determineStatus(remainingLife: number): 'acceptable' | 'monitor' | 'action_required' {
  if (remainingLife > 10) return 'acceptable';
  if (remainingLife > 5) return 'monitor';
  return 'action_required';
}

export function calculateMeasurement(
  originalThickness: number,
  currentThickness: number,
  years: number,
  minimumThickness: number = 0.1
): CalculationResult {
  const corrosionRate = calculateCorrosionRate(originalThickness, currentThickness, years);
  const remainingLife = calculateRemainingLife(currentThickness, corrosionRate, minimumThickness);
  const status = determineStatus(remainingLife);

  return {
    corrosionRate,
    remainingLife,
    status
  };
}

export function validateThickness(value: number): boolean {
  return value > 0 && value <= 2.0; // Reasonable range for tank plates
}
