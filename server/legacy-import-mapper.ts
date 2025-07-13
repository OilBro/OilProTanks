// Legacy Excel Import Field Mapper
// Maps abbreviated field names from old OilPro system to current schema

export const legacyFieldMappings: Record<string, string> = {
  // Basic Information
  'Tank #': 'tankId',
  'Client ID': 'customer',
  'Client PO': 'purchaseOrder',
  'Employer': 'owner',
  'Inspector': 'inspector',
  'Cert No': 'inspectorCertNumber',
  'Const Code': 'constructionCode',
  'Insp date': 'inspectionDate',
  'Report Date': 'reportDate',
  'Address': 'location',
  'Locations': 'locationDetails',
  'Service': 'service',
  'Build date': 'yearBuilt',
  'NDE Test': 'testMethods',
  
  // Tank Specifications
  'Diameter': 'diameter',
  'Heigth': 'height', // Note: typo in original
  'Fnd': 'foundationType',
  'Design Temp': 'designTemperature',
  'Loc Men temp': 'localMinTemp',
  'SG': 'specificGravity',
  'Roof Type': 'roofType',
  'Shell Const': 'shellConstruction',
  'Fill Ht': 'maxFillHeight',
  'Op temp': 'operatingTemperature',
  'Joint Eff': 'jointEfficiency',
  'PLt Spec': 'plateSpecification',
  'Capacity': 'capacity',
  'Type Insp': 'inspectionType',
  'Mfg': 'manufacturer',
  'Report type': 'reportType',
  
  // Course Thicknesses
  'Crs1 t': 'course1Thickness',
  'Crs2 t': 'course2Thickness',
  'Crs3 t': 'course3Thickness',
  'Crs4 t': 'course4Thickness',
  'Crs5 t': 'course5Thickness',
  'Crs6 t': 'course6Thickness',
  'Crs7 t': 'course7Thickness',
  'Crs8 t': 'course8Thickness',
  'Roof t': 'roofThickness',
  'Floor t': 'floorThickness',
  
  // Results Sections
  'Executive Summary': 'executiveSummary',
  'fndresult': 'foundationResults',
  'shellresult': 'shellResults',
  'nozzleresult': 'nozzleResults',
  'roofresults': 'roofResults',
  'floorresults': 'floorResults',
  'ANCILLARYresults': 'ancillaryResults',
  'Otherresults': 'otherResults',
  
  // Recommendations
  'fndrec': 'foundationRecommendations',
  'shellrec': 'shellRecommendations',
  'nozzlerec': 'nozzleRecommendations',
  'roofrec': 'roofRecommendations',
  'floorrec': 'floorRecommendations',
  'ANCILLARYrec': 'ancillaryRecommendations',
  'Otherrec': 'otherRecommendations',
  
  // Next Inspections
  'nxt insp Ext': 'nextExternalInspection',
  'nxt insp Int': 'nextInternalInspection',
  
  // UT Data
  'UT purpose': 'utPurpose',
  'UT Results': 'utResults',
  'UT Insp Date': 'utInspectionDate',
  
  // Settlement Points (SP = Settlement Point, T = Thickness?)
  'SP1': 'settlementPoint1',
  'SP2': 'settlementPoint2',
  'SP3': 'settlementPoint3',
  'SP4': 'settlementPoint4',
  'SP5': 'settlementPoint5',
  'SP6': 'settlementPoint6',
  'SP7': 'settlementPoint7',
  'SP8': 'settlementPoint8',
  'SP9': 'settlementPoint9',
  'SP10': 'settlementPoint10',
  
  // Other Abbreviations
  'Y': 'yearsInService',
  'yn': 'yearsNextInspection',
  'Ry': 'yieldStrength',
  'rca': 'requiredCorrosionAllowance',
  'Ca': 'corrosionAllowance',
  'TMB': 'minimumBottomThickness',
  'TMC': 'minimumCourseThickness',
  'Catmin': 'minimumCorrosionAllowance',
  'UNITS': 'measurementUnits',
  'Cap': 'capacityLabel',
  'State': 'stateLocation'
};

export interface LegacyImportData {
  // Basic Information
  tankId?: string;
  customer?: string;
  inspector?: string;
  inspectionDate?: Date;
  reportDate?: Date;
  location?: string;
  service?: string;
  yearBuilt?: string;
  
  // Tank Specifications
  diameter?: number;
  height?: number;
  capacity?: number;
  specificGravity?: number;
  designTemperature?: number;
  operatingTemperature?: number;
  jointEfficiency?: number;
  maxFillHeight?: number;
  
  // Construction Details
  constructionCode?: string;
  foundationType?: string;
  roofType?: string;
  shellConstruction?: string;
  manufacturer?: string;
  
  // Thickness Data
  courseThicknesses: Array<{
    course: string;
    thickness: number;
  }>;
  roofThickness?: number;
  floorThickness?: number;
  
  // Inspection Results
  executiveSummary?: string;
  foundationResults?: string;
  shellResults?: string;
  nozzleResults?: string;
  roofResults?: string;
  floorResults?: string;
  
  // Recommendations
  recommendations: Array<{
    component: string;
    description: string;
  }>;
  
  // Settlement Data
  settlementPoints: Array<{
    point: string;
    value: number;
  }>;
  
  // Next Inspections
  nextExternalInspection?: string;
  nextInternalInspection?: string;
}

export function parseLegacyExcelData(rawData: Array<Array<any>>): LegacyImportData {
  const result: LegacyImportData = {
    courseThicknesses: [],
    recommendations: [],
    settlementPoints: []
  };
  
  // Parse vertical key-value format
  for (const row of rawData) {
    if (!row[0] || row[0] === 'Report No') continue;
    
    const fieldName = String(row[0]).trim();
    const value = row[1];
    
    // Map field using our mappings
    const mappedField = legacyFieldMappings[fieldName];
    
    if (mappedField) {
      // Handle special cases
      if (fieldName.startsWith('Crs') && fieldName.endsWith(' t')) {
        const courseNum = fieldName.match(/Crs(\d+)/)?.[1];
        if (courseNum && value) {
          result.courseThicknesses.push({
            course: `Shell Course ${courseNum}`,
            thickness: parseFloat(value)
          });
        }
      } else if (fieldName.endsWith('rec') && value) {
        // Extract component from recommendation field
        const component = fieldName.replace('rec', '').replace('ANCILLARY', 'Ancillary');
        result.recommendations.push({
          component: component.charAt(0).toUpperCase() + component.slice(1),
          description: String(value)
        });
      } else if (fieldName.startsWith('SP') && value) {
        result.settlementPoints.push({
          point: fieldName,
          value: parseFloat(value)
        });
      } else {
        // Regular field mapping
        switch (mappedField) {
          case 'diameter':
          case 'height':
          case 'capacity':
          case 'specificGravity':
          case 'designTemperature':
          case 'operatingTemperature':
          case 'jointEfficiency':
          case 'maxFillHeight':
          case 'roofThickness':
          case 'floorThickness':
            (result as any)[mappedField] = parseFloat(value);
            break;
            
          case 'inspectionDate':
          case 'reportDate':
            // Excel date serial number conversion
            if (typeof value === 'number') {
              const excelDate = new Date((value - 25569) * 86400 * 1000);
              (result as any)[mappedField] = excelDate;
            }
            break;
            
          default:
            (result as any)[mappedField] = value;
        }
      }
    }
  }
  
  return result;
}

export function convertToSystemFormat(legacyData: LegacyImportData) {
  // Convert legacy data to our current system format
  const reportData: any = {
    tankId: legacyData.tankId || 'Unknown',
    customer: legacyData.customer,
    location: legacyData.location,
    service: mapServiceType(legacyData.service),
    inspector: legacyData.inspector,
    inspectionDate: legacyData.inspectionDate,
    reportDate: legacyData.reportDate,
    
    // Tank specifications
    diameter: legacyData.diameter,
    height: legacyData.height,
    capacity: legacyData.capacity,
    yearBuilt: parseInt(legacyData.yearBuilt || '0') || undefined,
    
    // Technical data
    specificGravity: legacyData.specificGravity,
    designTemperature: legacyData.designTemperature,
    operatingTemperature: legacyData.operatingTemperature,
    jointEfficiency: legacyData.jointEfficiency,
    maxFillHeight: legacyData.maxFillHeight,
    
    // Construction
    constructionCode: legacyData.constructionCode,
    foundationType: legacyData.foundationType,
    roofType: legacyData.roofType,
    shellConstruction: legacyData.shellConstruction,
    manufacturer: legacyData.manufacturer,
    
    // Summary and findings
    findings: combineFindings(legacyData),
    executiveSummary: legacyData.executiveSummary,
    
    // Next inspections
    nextExternalInspection: legacyData.nextExternalInspection,
    nextInternalInspection: legacyData.nextInternalInspection
  };
  
  // Generate thickness measurements
  const thicknessMeasurements: any[] = [];
  
  // Shell courses
  legacyData.courseThicknesses.forEach(course => {
    thicknessMeasurements.push({
      component: course.course,
      location: 'Average',
      originalThickness: getOriginalThickness(course.course),
      currentThickness: course.thickness.toString(),
      measurementDate: legacyData.inspectionDate || new Date()
    });
  });
  
  // Roof and floor
  if (legacyData.roofThickness) {
    thicknessMeasurements.push({
      component: 'Roof',
      location: 'Average',
      originalThickness: '0.1875', // Standard roof thickness
      currentThickness: legacyData.roofThickness.toString(),
      measurementDate: legacyData.inspectionDate || new Date()
    });
  }
  
  if (legacyData.floorThickness) {
    thicknessMeasurements.push({
      component: 'Bottom',
      location: 'Average',
      originalThickness: '0.250', // Standard bottom thickness
      currentThickness: legacyData.floorThickness.toString(),
      measurementDate: legacyData.inspectionDate || new Date()
    });
  }
  
  // Convert recommendations to repair recommendations
  const repairRecommendations = legacyData.recommendations.map(rec => ({
    component: rec.component,
    description: rec.description,
    priority: determinePriority(rec.description),
    targetDate: calculateTargetDate(rec.description, legacyData.inspectionDate)
  }));
  
  return {
    reportData,
    thicknessMeasurements,
    repairRecommendations
  };
}

function mapServiceType(service?: string): string {
  if (!service) return 'crude';
  
  const serviceMap: Record<string, string> = {
    'engine motor oil': 'lubricating_oil',
    'crude oil': 'crude',
    'diesel': 'diesel',
    'gasoline': 'gasoline',
    'fuel oil': 'fuel_oil',
    'water': 'water'
  };
  
  const normalized = service.toLowerCase();
  return serviceMap[normalized] || 'other';
}

function getOriginalThickness(course: string): string {
  // Standard original thicknesses by course
  const match = course.match(/Course (\d+)/);
  if (match) {
    const courseNum = parseInt(match[1]);
    // Thicker at bottom, thinner at top
    const thicknesses = ['0.625', '0.500', '0.375', '0.3125', '0.250', '0.250', '0.1875', '0.1875'];
    return thicknesses[courseNum - 1] || '0.250';
  }
  return '0.250';
}

function combineFindings(data: LegacyImportData): string {
  const sections = [];
  
  if (data.foundationResults) sections.push(`Foundation: ${data.foundationResults}`);
  if (data.shellResults) sections.push(`Shell: ${data.shellResults}`);
  if (data.nozzleResults) sections.push(`Nozzles: ${data.nozzleResults}`);
  if (data.roofResults) sections.push(`Roof: ${data.roofResults}`);
  if (data.floorResults) sections.push(`Floor: ${data.floorResults}`);
  
  return sections.join('\n\n');
}

function determinePriority(description: string): string {
  const high = /immediate|critical|urgent|safety|leak/i;
  const medium = /monitor|repair|replace|install/i;
  
  if (high.test(description)) return 'high';
  if (medium.test(description)) return 'medium';
  return 'low';
}

function calculateTargetDate(description: string, inspectionDate?: Date): Date {
  const baseDate = inspectionDate || new Date();
  const targetDate = new Date(baseDate);
  
  if (/immediate|urgent|critical/i.test(description)) {
    targetDate.setDate(targetDate.getDate() + 30); // 30 days
  } else if (/monitor/i.test(description)) {
    targetDate.setFullYear(targetDate.getFullYear() + 1); // 1 year
  } else {
    targetDate.setMonth(targetDate.getMonth() + 6); // 6 months
  }
  
  return targetDate;
}