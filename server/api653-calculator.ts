// API 653 Enhanced Calculation Engine
// Implements t-min, remaining life, corrosion rates per API 653 standards

export interface TankParameters {
  diameter: number;  // feet
  height: number;    // feet
  specificGravity: number;
  jointEfficiency: number;
  yieldStrength: number;  // psi
  designStress: number;   // psi
  api650Edition?: string;
  constructionCode?: string;
}

export interface ComponentThickness {
  component: string;
  nominalThickness: number;
  currentThickness: number;
  previousThickness?: number;
  corrosionAllowance: number;
  dateCurrent: Date;
  datePrevious?: Date;
}

export interface CalculationResults {
  component: string;
  tMinRequired: number;
  tActual: number;
  corrosionRateShortTerm?: number;
  corrosionRateLongTerm?: number;
  corrosionRateGoverning?: number;
  remainingLife: number;
  remainingCorrosionAllowance: number;
  status: 'ACCEPTABLE' | 'MONITOR' | 'ACTION REQUIRED' | 'CRITICAL';
  nextInspectionDate: Date;
  api653Reference: string;
}

export interface KPIMetrics {
  percentTMLsComplete: number;
  minRemainingLife: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  overallStatus: 'GO' | 'NO-GO' | 'CONDITIONAL';
  nextInspectionDue: Date;
  containmentMargin?: number;
}

// Calculate minimum required thickness per API 653 Section 4.3.3
export function calculateTMin(
  course: number,
  tankParams: TankParameters,
  isBottom: boolean = false
): number {
  if (isBottom) {
    // Bottom plates per API 653 Section 4.4.5
    // With reinforcing pad or without, depending on annular ring
    return 0.1; // inches - minimum for bottom with no underside corrosion
  }

  // Shell courses per API 653 Section 4.3.3.1
  const D = tankParams.diameter; // feet
  const H = tankParams.height - (course - 1) * 8; // height to bottom of course (assuming 8ft courses)
  const G = tankParams.specificGravity;
  const E = tankParams.jointEfficiency;
  const S = tankParams.designStress || 20000; // psi, typical for A36 steel

  // API 653 Formula 4.1: t_min = 2.6 * D * (H - 1) * G / (S * E)
  // Using the 1-foot method per 4.3.3.1
  const tMin = (2.6 * D * (H - 1) * G) / (S * E);

  // Minimum absolute thickness per Table 4.1
  const absoluteMin = getAbsoluteMinThickness(D);

  return Math.max(tMin, absoluteMin);
}

// Get absolute minimum thickness per API 653 Table 4.1
function getAbsoluteMinThickness(diameter: number): number {
  if (diameter < 50) return 0.1;
  if (diameter < 120) return 0.15;
  if (diameter < 200) return 0.20;
  return 0.25;
}

// Calculate corrosion rates per API 653 Section 4.3.3.5
export function calculateCorrosionRates(
  current: ComponentThickness,
  previousInspection?: ComponentThickness
): { shortTerm?: number; longTerm?: number; governing: number } {
  let shortTermRate: number | undefined;
  let longTermRate: number | undefined;
  
  // Short-term corrosion rate (between last two inspections)
  if (previousInspection && current.datePrevious) {
    const thicknessLoss = previousInspection.currentThickness - current.currentThickness;
    const years = (current.dateCurrent.getTime() - current.datePrevious.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years > 0) {
      shortTermRate = thicknessLoss / years;
    }
  }

  // Long-term corrosion rate (from original to current)
  const totalLoss = current.nominalThickness - current.currentThickness;
  const totalYears = (current.dateCurrent.getTime() - new Date('1990-01-01').getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  longTermRate = totalLoss / totalYears;

  // Governing rate per API 653 (use higher of short-term or long-term)
  const governing = Math.max(shortTermRate || 0, longTermRate || 0);

  return {
    shortTerm: shortTermRate,
    longTerm: longTermRate,
    governing
  };
}

// Calculate remaining life per API 653 Section 6.4.2
export function calculateRemainingLife(
  currentThickness: number,
  tMinRequired: number,
  corrosionRate: number,
  corrosionAllowance: number = 0
): number {
  if (corrosionRate <= 0) {
    return 999; // Infinite life if no corrosion
  }

  const excessThickness = currentThickness - tMinRequired - corrosionAllowance;
  
  if (excessThickness <= 0) {
    return 0; // Already below minimum
  }

  return excessThickness / corrosionRate;
}

// Determine component status based on thickness and remaining life
export function determineStatus(
  currentThickness: number,
  tMinRequired: number,
  remainingLife: number
): 'ACCEPTABLE' | 'MONITOR' | 'ACTION REQUIRED' | 'CRITICAL' {
  const ratio = currentThickness / tMinRequired;

  if (ratio < 1.0) {
    return 'CRITICAL'; // Below minimum required thickness
  } else if (ratio < 1.1 || remainingLife < 2) {
    return 'ACTION REQUIRED'; // Approaching minimum or short remaining life
  } else if (ratio < 1.25 || remainingLife < 5) {
    return 'MONITOR'; // Requires monitoring
  } else {
    return 'ACCEPTABLE'; // Good condition
  }
}

// Calculate next inspection interval per API 653 Table 6.1
export function calculateNextInspectionInterval(
  remainingLife: number,
  corrosionRate: number,
  tankClass: 'I' | 'II' | 'III' = 'II'
): number {
  // API 653 Table 6.1 inspection intervals
  const maxIntervals = {
    'I': { external: 5, internal: 10 },
    'II': { external: 5, internal: 15 },
    'III': { external: 5, internal: 20 }
  };

  // RBI alternative per 6.4.2
  let interval = Math.min(remainingLife / 2, maxIntervals[tankClass].internal);

  // Additional constraints
  if (corrosionRate > 0.005) {
    // High corrosion rate - more frequent inspection
    interval = Math.min(interval, 5);
  }

  return Math.max(interval, 1); // Minimum 1 year
}

// Perform comprehensive API 653 evaluation
export function performAPI653Evaluation(
  components: ComponentThickness[],
  tankParams: TankParameters
): CalculationResults[] {
  const results: CalculationResults[] = [];

  components.forEach((component, index) => {
    // Determine if this is a shell course or bottom/roof
    const isShell = component.component.toLowerCase().includes('course');
    const isBottom = component.component.toLowerCase().includes('floor') || 
                     component.component.toLowerCase().includes('bottom');
    
    // Calculate t-min
    let tMinRequired: number;
    let api653Reference: string;
    
    if (isShell) {
      const courseNumber = parseInt(component.component.match(/\d+/)?.[0] || '1');
      tMinRequired = calculateTMin(courseNumber, tankParams, false);
      api653Reference = 'API 653 Section 4.3.3.1 (Shell)';
    } else if (isBottom) {
      tMinRequired = 0.1; // Bottom plates minimum
      api653Reference = 'API 653 Section 4.4.5 (Bottom)';
    } else {
      tMinRequired = 0.09; // Roof minimum per API 653
      api653Reference = 'API 653 Section 4.3.4 (Roof)';
    }

    // Calculate corrosion rates
    const corrosionRates = calculateCorrosionRates(component);

    // Calculate remaining life
    const remainingLife = calculateRemainingLife(
      component.currentThickness,
      tMinRequired,
      corrosionRates.governing,
      component.corrosionAllowance
    );

    // Determine status
    const status = determineStatus(
      component.currentThickness,
      tMinRequired,
      remainingLife
    );

    // Calculate next inspection date
    const inspectionInterval = calculateNextInspectionInterval(
      remainingLife,
      corrosionRates.governing
    );
    const nextInspectionDate = new Date();
    nextInspectionDate.setFullYear(nextInspectionDate.getFullYear() + inspectionInterval);

    results.push({
      component: component.component,
      tMinRequired,
      tActual: component.currentThickness,
      corrosionRateShortTerm: corrosionRates.shortTerm,
      corrosionRateLongTerm: corrosionRates.longTerm,
      corrosionRateGoverning: corrosionRates.governing,
      remainingLife,
      remainingCorrosionAllowance: component.currentThickness - tMinRequired,
      status,
      nextInspectionDate,
      api653Reference
    });
  });

  return results;
}

// Calculate overall KPI metrics
export function calculateKPIMetrics(
  evaluationResults: CalculationResults[],
  totalTMLsExpected: number,
  totalTMLsComplete: number,
  containmentCapacity?: number,
  requiredCapacity?: number
): KPIMetrics {
  const percentTMLsComplete = (totalTMLsComplete / totalTMLsExpected) * 100;
  
  const minRemainingLife = Math.min(...evaluationResults.map(r => r.remainingLife));
  
  const criticalFindings = evaluationResults.filter(r => r.status === 'CRITICAL').length;
  const majorFindings = evaluationResults.filter(r => r.status === 'ACTION REQUIRED').length;
  const minorFindings = evaluationResults.filter(r => r.status === 'MONITOR').length;
  
  // Determine overall status
  let overallStatus: 'GO' | 'NO-GO' | 'CONDITIONAL';
  if (criticalFindings > 0) {
    overallStatus = 'NO-GO';
  } else if (majorFindings > 0 || percentTMLsComplete < 90) {
    overallStatus = 'CONDITIONAL';
  } else {
    overallStatus = 'GO';
  }
  
  // Find earliest next inspection date
  const nextInspectionDue = new Date(
    Math.min(...evaluationResults.map(r => r.nextInspectionDate.getTime()))
  );
  
  // Calculate containment margin if provided
  let containmentMargin: number | undefined;
  if (containmentCapacity && requiredCapacity) {
    containmentMargin = ((containmentCapacity - requiredCapacity) / requiredCapacity) * 100;
  }
  
  return {
    percentTMLsComplete,
    minRemainingLife,
    criticalFindings,
    majorFindings,
    minorFindings,
    overallStatus,
    nextInspectionDue,
    containmentMargin
  };
}

// Standards compliance mapping
export const STANDARDS_MAPPING = {
  'API_653': {
    'inspection_scope': 'Section 4 - Inspection',
    'shell_evaluation': 'Section 4.3.3 - Shell Evaluation',
    'bottom_evaluation': 'Section 4.4 - Bottom Evaluation',
    'roof_evaluation': 'Section 4.3.4 - Roof Evaluation',
    'settlement': 'Annex B - Evaluation of Tank Bottom Settlement',
    'repairs': 'Section 9 - Tank Repair and Alteration',
    'reconstruction': 'Section 10 - Dismantling and Reconstruction',
    'intervals': 'Section 6 - Inspection Intervals',
    'records': 'Section 13 - Inspection Records'
  },
  'API_650': {
    'design': 'Section 5 - Design',
    'materials': 'Section 4 - Materials',
    'openings': 'Section 5.7 - Shell Openings',
    'nozzles': 'Section 5.8 - Shell Nozzles and Manholes'
  },
  'API_2000': {
    'normal_venting': 'Section 4.3 - Normal Venting Requirements',
    'emergency_venting': 'Section 4.4 - Emergency Venting Requirements'
  },
  'NFPA_30': {
    'spacing': 'Chapter 22 - Storage Tank Buildings',
    'containment': 'Section 22.11 - Containment, Drainage, and Spill Control',
    'fire_protection': 'Chapter 16 - Fire Protection'
  },
  'CFR_112': {
    'spcc_requirements': '40 CFR 112.7 - General SPCC Requirements',
    'secondary_containment': '40 CFR 112.8(c)(2) - Bulk Storage Containers',
    'inspection': '40 CFR 112.8(c)(6) - Periodic Integrity Testing'
  },
  'SSPC_PA2': {
    'measurement': 'Section 6 - Number of Measurements',
    'acceptance': 'Section 8 - Acceptance Criteria',
    'instruments': 'Section 5 - Measuring Instruments'
  }
};

// Generate standards clause references for a given component
export function getStandardsReferences(
  component: string,
  evaluationType: string
): { standard: string; section: string; description: string }[] {
  const references = [];
  
  if (component.toLowerCase().includes('shell')) {
    references.push({
      standard: 'API 653',
      section: STANDARDS_MAPPING.API_653.shell_evaluation,
      description: 'Shell thickness evaluation methodology'
    });
    references.push({
      standard: 'API 650',
      section: STANDARDS_MAPPING.API_650.openings,
      description: 'Original design requirements for shell openings'
    });
  }
  
  if (component.toLowerCase().includes('bottom') || component.toLowerCase().includes('floor')) {
    references.push({
      standard: 'API 653',
      section: STANDARDS_MAPPING.API_653.bottom_evaluation,
      description: 'Bottom plate evaluation criteria'
    });
    references.push({
      standard: '40 CFR 112',
      section: STANDARDS_MAPPING.CFR_112.secondary_containment,
      description: 'Secondary containment integrity'
    });
  }
  
  if (component.toLowerCase().includes('roof')) {
    references.push({
      standard: 'API 653',
      section: STANDARDS_MAPPING.API_653.roof_evaluation,
      description: 'Roof evaluation requirements'
    });
    references.push({
      standard: 'API 2000',
      section: STANDARDS_MAPPING.API_2000.normal_venting,
      description: 'Venting capacity verification'
    });
  }
  
  return references;
}