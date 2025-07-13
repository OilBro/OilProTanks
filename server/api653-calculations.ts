// API 653 Standard Calculation Engine
// Implements correct formulas for corrosion rate and remaining life calculations

export interface ThicknessCalculation {
  originalThickness: number;
  currentThickness: number;
  thicknessLoss: number;
  corrosionRate: number; // inches per year
  corrosionRateMPY: number; // mils per year
  remainingLife: number; // years
  status: 'acceptable' | 'monitor' | 'action_required' | 'critical';
}

export interface ShellCourseData {
  courseNumber: number;
  height: number; // feet
  originalThickness: number; // inches
  minimumRequired: number; // inches (calculated per API 653)
  measurements: ThicknessCalculation[];
}

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

// Calculate corrosion rate based on age and thickness loss
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

// Calculate remaining life per API 653
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

// Determine inspection status based on remaining life
export function determineInspectionStatus(
  remainingLife: number,
  currentThickness: number,
  minimumRequired: number
): 'acceptable' | 'monitor' | 'action_required' | 'critical' {
  if (currentThickness < minimumRequired) {
    return 'critical';
  }
  
  if (remainingLife <= 0) {
    return 'critical';
  }
  
  if (remainingLife < 5) {
    return 'action_required';
  }
  
  if (remainingLife < 10) {
    return 'monitor';
  }
  
  return 'acceptable';
}

// Calculate next inspection interval per API 653 Table 6.1
export function calculateNextInspectionInterval(
  corrosionRate: number, // inches per year
  remainingLife: number,
  isBottomCourse: boolean = false
): { external: number; internal: number } {
  const rateMPY = corrosionRate * 1000;
  
  // API 653 Table 6.1 intervals
  let externalInterval: number;
  let internalInterval: number;
  
  if (remainingLife < 1) {
    // Critical condition
    externalInterval = 0;
    internalInterval = 0;
  } else if (rateMPY <= 0.001) {
    // No corrosion
    externalInterval = 5;
    internalInterval = isBottomCourse ? 20 : 30;
  } else if (rateMPY <= 0.005) {
    // Very low corrosion
    externalInterval = 5;
    internalInterval = isBottomCourse ? 20 : 30;
  } else if (rateMPY <= 1.0) {
    // Low corrosion
    externalInterval = 5;
    internalInterval = Math.min(remainingLife / 4, isBottomCourse ? 20 : 30);
  } else if (rateMPY <= 2.0) {
    // Moderate corrosion
    externalInterval = Math.min(remainingLife / 4, 5);
    internalInterval = Math.min(remainingLife / 4, isBottomCourse ? 15 : 20);
  } else {
    // High corrosion
    externalInterval = Math.min(remainingLife / 4, 3);
    internalInterval = Math.min(remainingLife / 4, isBottomCourse ? 10 : 15);
  }
  
  return {
    external: Math.floor(externalInterval),
    internal: Math.floor(internalInterval)
  };
}

// Comprehensive shell course analysis
export function analyzeShellCourse(
  courseData: {
    courseNumber: number;
    height: number;
    originalThickness: number;
    measurements: Array<{ location: string; currentThickness: number }>;
  },
  tankData: {
    diameter: number;
    totalHeight: number;
    specificGravity: number;
    maxFillHeight: number;
    jointEfficiency: number;
    ageInYears: number;
  }
): ShellCourseData {
  // Calculate fill height from bottom of this course
  let fillHeightFromBottom = tankData.maxFillHeight;
  for (let i = 1; i < courseData.courseNumber; i++) {
    fillHeightFromBottom -= courseData.height;
  }
  
  // Calculate minimum required thickness
  const minimumRequired = calculateMinimumRequiredThickness(
    courseData.courseNumber,
    tankData.diameter,
    tankData.specificGravity,
    fillHeightFromBottom,
    tankData.jointEfficiency
  );
  
  // Analyze each measurement
  const calculations: ThicknessCalculation[] = courseData.measurements.map(m => {
    const current = m.currentThickness;
    const original = courseData.originalThickness;
    const loss = original - current;
    
    const { rateInchesPerYear, rateMPY } = calculateCorrosionRate(
      original,
      current,
      tankData.ageInYears
    );
    
    const remainingLife = calculateRemainingLife(
      current,
      minimumRequired,
      rateInchesPerYear
    );
    
    const status = determineInspectionStatus(
      remainingLife,
      current,
      minimumRequired
    );
    
    return {
      originalThickness: original,
      currentThickness: current,
      thicknessLoss: loss,
      corrosionRate: rateInchesPerYear,
      corrosionRateMPY: rateMPY,
      remainingLife,
      status
    };
  });
  
  return {
    courseNumber: courseData.courseNumber,
    height: courseData.height,
    originalThickness: courseData.originalThickness,
    minimumRequired,
    measurements: calculations
  };
}

// Calculate overall tank inspection intervals
export function calculateTankInspectionIntervals(
  shellCourses: ShellCourseData[]
): { externalInterval: number; internalInterval: number; criticalCourse?: number } {
  let minExternalInterval = 999;
  let minInternalInterval = 999;
  let criticalCourse: number | undefined;
  
  for (const course of shellCourses) {
    // Find worst case in this course
    let worstRemainingLife = 999;
    let worstCorrosionRate = 0;
    
    for (const measurement of course.measurements) {
      if (measurement.remainingLife < worstRemainingLife) {
        worstRemainingLife = measurement.remainingLife;
        worstCorrosionRate = measurement.corrosionRate;
      }
    }
    
    const intervals = calculateNextInspectionInterval(
      worstCorrosionRate,
      worstRemainingLife,
      course.courseNumber === 1
    );
    
    if (intervals.external < minExternalInterval) {
      minExternalInterval = intervals.external;
      if (worstRemainingLife < 5) {
        criticalCourse = course.courseNumber;
      }
    }
    
    if (intervals.internal < minInternalInterval) {
      minInternalInterval = intervals.internal;
    }
  }
  
  return {
    externalInterval: minExternalInterval,
    internalInterval: minInternalInterval,
    criticalCourse
  };
}