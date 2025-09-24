// Manus AI Document Analyzer for Excel and PDF parsing
// Handles intelligent extraction of tank inspection data

interface ManusAnalysisResponse {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  mappingSuggestions: Record<string, string>;
  detectedFields: string[];
  extractedText?: string;
  sections?: Record<string, string>;
  extractionDetails?: {
    tablesFound: number;
    patternsMatched: Record<string, number>;
    sectionsIdentified: string[];
    warnings: string[];
    successfulExtractions: string[];
    failedExtractions: string[];
  };
}

interface ManusAPIRequest {
  document: {
    content: string;
    type: 'excel' | 'pdf';
    metadata?: {
      fileName: string;
      fileSize?: number;
      sheets?: string[];
    };
  };
  extractionConfig: {
    targetFormat: 'api653_inspection';
    extractTables: boolean;
    extractMeasurements: boolean;
    extractChecklists: boolean;
    enhanceOCR?: boolean;
  };
  systemContext?: string;
}

const MANUS_API_URL = 'https://api.manus.ai/v1/document/analyze';

export async function analyzeDocumentWithManus(
  content: string,
  fileName: string,
  documentType: 'excel' | 'pdf',
  sheets?: string[]
): Promise<ManusAnalysisResponse> {
  console.log('=== MANUS AI ANALYSIS STARTING ===');
  console.log('Document:', fileName);
  console.log('Type:', documentType);
  console.log('API Key available:', !!process.env.MANUS_API_KEY);
  
  if (!process.env.MANUS_API_KEY) {
    console.error('Manus API key not configured');
    throw new Error('Manus AI integration requires API key configuration');
  }
  
  try {
    const systemContext = `You are an expert API 653 tank inspection data extraction specialist. 
    Extract comprehensive tank inspection data from the provided document.
    
    Focus on extracting:
    1. Tank identification (ID, location, service/product, customer)
    2. Tank specifications (diameter, height, capacity, materials, construction)
    3. Inspection details (date, inspector, certification, report number)
    4. ALL thickness measurements with precise values and locations
    5. Shell course data (course numbers, thicknesses, corrosion rates)
    6. Bottom/floor measurements
    7. Roof measurements
    8. Nozzle and appurtenance data
    9. Settlement survey data if present
    10. Inspection findings and recommendations
    11. Next inspection dates and intervals
    12. Checklist items with status
    13. Repair recommendations with priorities
    
    For thickness measurements:
    - Extract EXACT numeric values (e.g., 0.375, 0.250)
    - Include units (inches, mm, mils)
    - Note location (course number, position, component)
    - Include original vs current thickness
    - Extract minimum required thickness
    - Note any corrosion rates
    - Include remaining life calculations
    
    For dates, use YYYY-MM-DD format. For numeric values, preserve precision.
    Return structured JSON data matching the expected format.`;
    
    const requestBody: ManusAPIRequest = {
      document: {
        content,
        type: documentType,
        metadata: {
          fileName,
          fileSize: content.length,
          sheets
        }
      },
      extractionConfig: {
        targetFormat: 'api653_inspection',
        extractTables: true,
        extractMeasurements: true,
        extractChecklists: true,
        enhanceOCR: documentType === 'pdf'
      },
      systemContext
    };
    
    console.log('Sending request to Manus AI...');
    
    const response = await fetch(MANUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MANUS_API_KEY}`,
        'X-API-Version': '2024-01',
        'X-Response-Format': 'structured'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Manus API error response:', response.status, errorText);
      throw new Error(`Manus API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('=== MANUS AI RESPONSE RECEIVED ===');
    
    // Process and structure the Manus response
    const analysis = processManusResponse(result, documentType);
    
    console.log('Extracted report data fields:', Object.keys(analysis.reportData));
    console.log('Thickness measurements found:', analysis.thicknessMeasurements.length);
    console.log('Checklist items found:', analysis.checklistItems.length);
    console.log('Confidence score:', analysis.confidence);
    
    return analysis;
    
  } catch (error: any) {
    console.error('Manus AI analysis failed:', error);
    
    // Re-throw the error so the import handler can fall back to OpenRouter
    throw new Error(`Manus AI analysis failed: ${error.message || 'Unknown error'}`);
  }
}

function processManusResponse(manusResult: any, documentType: string): ManusAnalysisResponse {
  // Extract structured data from Manus response
  const extractedData = manusResult.extracted_data || {};
  const measurements = manusResult.measurements || [];
  const checklists = manusResult.checklists || [];
  const metadata = manusResult.metadata || {};
  
  // Map Manus extracted fields to our schema
  const reportData: Record<string, any> = {
    // Basic Information
    tankId: extractedData.tank_id || extractedData.equipment_id || extractedData.vessel_id,
    customer: extractedData.customer || extractedData.client || extractedData.owner,
    location: extractedData.location || extractedData.facility || extractedData.site,
    service: extractedData.service || extractedData.product || extractedData.contents,
    
    // Tank Specifications
    diameter: normalizeNumericValue(extractedData.diameter),
    height: normalizeNumericValue(extractedData.height),
    capacity: normalizeNumericValue(extractedData.capacity || extractedData.volume),
    capacityUnit: extractedData.capacity_unit || 'BBL',
    yearBuilt: extractedData.year_built || extractedData.construction_year,
    manufacturer: extractedData.manufacturer || extractedData.builder,
    constructionStandard: extractedData.construction_code || extractedData.design_code,
    
    // Materials
    shellMaterial: extractedData.shell_material || extractedData.material,
    roofType: extractedData.roof_type,
    foundationType: extractedData.foundation_type || extractedData.foundation,
    
    // Inspection Details
    reportNumber: extractedData.report_number || extractedData.report_id,
    inspector: extractedData.inspector || extractedData.inspector_name,
    inspectorCertNumber: extractedData.cert_number || extractedData.api_certification,
    inspectionDate: normalizeDate(extractedData.inspection_date),
    
    // Technical Details
    specificGravity: normalizeNumericValue(extractedData.specific_gravity || extractedData.sg),
    designCode: extractedData.design_code || extractedData.construction_standard,
    originalThickness: normalizeNumericValue(extractedData.original_thickness),
    
    // Next Inspections
    lastInternalInspection: normalizeDate(extractedData.last_internal_inspection),
    nextInternalInspection: normalizeDate(extractedData.next_internal_inspection),
    nextExternalInspection: normalizeDate(extractedData.next_external_inspection),
    
    // Findings
    executiveSummary: extractedData.executive_summary,
    findings: extractedData.findings || extractedData.inspection_findings,
    recommendations: extractedData.recommendations,
    
    // Additional fields from extraction
    ...extractAdditionalFields(extractedData)
  };
  
  // Process thickness measurements
  const thicknessMeasurements = processManusThicknessMeasurements(measurements, extractedData);
  
  // Process checklist items
  const checklistItems = processManusChecklistItems(checklists, extractedData);
  
  // Calculate confidence based on extraction completeness
  const confidence = calculateConfidence(reportData, thicknessMeasurements, metadata);
  
  return {
    reportData,
    thicknessMeasurements,
    checklistItems,
    confidence,
    mappingSuggestions: metadata.field_mappings || {},
    detectedFields: Object.keys(reportData).filter(k => reportData[k] != null),
    extractedText: metadata.raw_text,
    sections: metadata.identified_sections,
    extractionDetails: {
      tablesFound: metadata.tables_found || 0,
      patternsMatched: metadata.patterns_matched || {},
      sectionsIdentified: metadata.sections || [],
      warnings: metadata.warnings || [],
      successfulExtractions: metadata.successful_fields || [],
      failedExtractions: metadata.failed_fields || []
    }
  };
}

function processManusThicknessMeasurements(measurements: any[], extractedData: any): any[] {
  const processed: any[] = [];
  
  // Process measurements array from Manus
  if (Array.isArray(measurements)) {
    measurements.forEach(m => {
      const measurement = {
        location: m.location || m.position || m.component,
        component: m.component || m.type || determineComponent(m.location),
        measurementType: m.measurement_type || determineType(m.component || m.location),
        currentThickness: normalizeThickness(m.current_thickness || m.thickness || m.value),
        originalThickness: normalizeThickness(m.original_thickness || m.nominal),
        minRequiredThickness: normalizeThickness(m.min_required || m.minimum || m.tmin),
        corrosionRate: normalizeNumericValue(m.corrosion_rate || m.cr),
        remainingLife: normalizeNumericValue(m.remaining_life || m.rl),
        courseNumber: extractCourseNumber(m.location || m.course),
        position: m.position || m.orientation,
        elevation: m.elevation,
        method: m.method || 'UT',
        notes: m.notes || m.comments,
        status: determineStatus(
          m.current_thickness || m.thickness,
          m.min_required || m.minimum
        )
      };
      
      // Only add if we have meaningful data
      if (measurement.currentThickness || measurement.originalThickness) {
        processed.push(measurement);
      }
    });
  }
  
  // Also check for shell course data in extracted fields
  if (extractedData.shell_courses || extractedData.courses) {
    const courses = extractedData.shell_courses || extractedData.courses;
    Object.keys(courses).forEach(courseKey => {
      const courseData = courses[courseKey];
      if (courseData && typeof courseData === 'object') {
        const courseNum = extractCourseNumber(courseKey);
        
        // Add thickness data for each position
        ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'].forEach(position => {
          if (courseData[position]) {
            processed.push({
              location: `Course ${courseNum} - ${position.toUpperCase()}`,
              component: 'Shell',
              measurementType: 'shell',
              currentThickness: normalizeThickness(courseData[position]),
              originalThickness: normalizeThickness(courseData.original),
              minRequiredThickness: normalizeThickness(courseData.min_required),
              courseNumber: courseNum,
              position: position.toUpperCase(),
              method: 'UT',
              status: determineStatus(courseData[position], courseData.min_required)
            });
          }
        });
      }
    });
  }
  
  return processed;
}

function processManusChecklistItems(checklists: any[], extractedData: any): any[] {
  const processed: any[] = [];
  
  if (Array.isArray(checklists)) {
    checklists.forEach(item => {
      processed.push({
        category: item.category || item.section || 'General',
        subcategory: item.subcategory || item.type,
        checkItem: item.item || item.description || item.check_item,
        status: normalizeChecklistStatus(item.status || item.result),
        severity: item.severity || item.priority,
        notes: item.notes || item.comments || item.findings,
        location: item.location,
        actionRequired: item.action_required || item.action,
        photosAttached: item.photos || item.has_photos || false
      });
    });
  }
  
  return processed;
}

// Helper functions
function normalizeNumericValue(value: any): string | null {
  if (value == null || value === '') return null;
  
  // Handle string representations of numbers
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    return cleaned || null;
  }
  
  return String(value);
}

function normalizeThickness(value: any): number | null {
  if (value == null || value === '') return null;
  
  let numValue: number;
  
  if (typeof value === 'string') {
    // Remove units and convert to number
    const cleaned = value.replace(/[^\d.]/g, '');
    numValue = parseFloat(cleaned);
  } else {
    numValue = parseFloat(String(value));
  }
  
  return isNaN(numValue) ? null : numValue;
}

function normalizeDate(value: any): string | null {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Try parsing common date formats
    const dateStr = String(value);
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        // Reformat to YYYY-MM-DD
        if (match[1].length === 4) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
      }
    }
  }
  
  return null;
}

function extractCourseNumber(text: string): number | null {
  if (!text) return null;
  
  const match = text.match(/course\s*(\d+)/i) || text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function determineComponent(location: string): string {
  if (!location) return 'Unknown';
  
  const loc = location.toLowerCase();
  if (loc.includes('shell') || loc.includes('course')) return 'Shell';
  if (loc.includes('bottom') || loc.includes('floor')) return 'Bottom';
  if (loc.includes('roof')) return 'Roof';
  if (loc.includes('nozzle')) return 'Nozzle';
  if (loc.includes('manway')) return 'Manway';
  
  return 'Shell';
}

function determineType(component: string): string {
  if (!component) return 'shell';
  
  const comp = component.toLowerCase();
  if (comp.includes('bottom') || comp.includes('floor')) return 'bottom';
  if (comp.includes('roof')) return 'roof';
  if (comp.includes('nozzle')) return 'nozzle';
  
  return 'shell';
}

function determineStatus(current: any, minimum: any): string {
  const curr = normalizeThickness(current);
  const min = normalizeThickness(minimum);
  
  if (!curr || !min) return 'UNKNOWN';
  
  const ratio = curr / min;
  if (ratio < 1.0) return 'CRITICAL';
  if (ratio < 1.1) return 'ACTION_REQUIRED';
  if (ratio < 1.2) return 'MONITOR';
  
  return 'ACCEPTABLE';
}

function normalizeChecklistStatus(status: string): string {
  if (!status) return 'pending';
  
  const s = status.toLowerCase();
  if (s.includes('satisfactory') || s.includes('pass') || s.includes('good')) return 'satisfactory';
  if (s.includes('unsatisfactory') || s.includes('fail') || s.includes('poor')) return 'unsatisfactory';
  if (s.includes('n/a') || s.includes('not applicable')) return 'na';
  
  return 'pending';
}

function extractAdditionalFields(data: any): Record<string, any> {
  const additional: Record<string, any> = {};
  
  // Extract any additional relevant fields not already mapped
  const relevantFields = [
    'coating_condition', 'insulation_condition', 'settlement_measured',
    'tilt_measured', 'api_rating', 'risk_rating', 'integrity_status',
    'operating_temperature', 'design_temperature', 'joint_efficiency',
    'yield_strength', 'allowable_stress', 'hydro_test_date'
  ];
  
  relevantFields.forEach(field => {
    if (data[field] != null) {
      const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      additional[camelCase] = data[field];
    }
  });
  
  return additional;
}

function calculateConfidence(
  reportData: Record<string, any>,
  measurements: any[],
  metadata: any
): number {
  let score = 0;
  let total = 0;
  
  // Check critical fields
  const criticalFields = ['tankId', 'inspectionDate', 'inspector'];
  criticalFields.forEach(field => {
    total += 2;
    if (reportData[field]) score += 2;
  });
  
  // Check important fields
  const importantFields = ['diameter', 'height', 'service', 'customer', 'location'];
  importantFields.forEach(field => {
    total += 1;
    if (reportData[field]) score += 1;
  });
  
  // Check measurements
  total += 5;
  if (measurements.length > 0) score += Math.min(5, measurements.length / 2);
  
  // Check extraction quality from metadata
  if (metadata.extraction_confidence) {
    total += 3;
    score += metadata.extraction_confidence * 3;
  }
  
  return total > 0 ? score / total : 0;
}

// Export for Excel-specific analysis
export async function analyzeExcelWithManus(
  workbook: any,
  fileName: string
): Promise<ManusAnalysisResponse> {
  // Convert workbook to string representation for Manus
  const content = workbookToString(workbook);
  const sheets = workbook.SheetNames || [];
  
  return analyzeDocumentWithManus(content, fileName, 'excel', sheets);
}

// Export for PDF-specific analysis
export async function analyzePDFWithManus(
  extractedText: string,
  fileName: string,
  additionalContext?: any
): Promise<ManusAnalysisResponse> {
  // Enhance extracted text with additional context if available
  let content = extractedText;
  
  if (additionalContext) {
    if (additionalContext.tables) {
      content += '\n\n=== EXTRACTED TABLES ===\n';
      content += JSON.stringify(additionalContext.tables, null, 2);
    }
    
    if (additionalContext.patterns) {
      content += '\n\n=== DETECTED PATTERNS ===\n';
      content += JSON.stringify(additionalContext.patterns, null, 2);
    }
  }
  
  return analyzeDocumentWithManus(content, fileName, 'pdf');
}

// Helper to convert workbook to string for Manus processing
function workbookToString(workbook: any): string {
  let content = '';
  
  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const data = workbook.utils?.sheet_to_json 
      ? workbook.utils.sheet_to_json(worksheet, { header: 1 })
      : [];
    
    content += `\n=== SHEET: ${sheetName} ===\n`;
    
    if (Array.isArray(data)) {
      data.forEach((row: any, index: number) => {
        if (Array.isArray(row)) {
          content += `Row ${index + 1}: ${row.join(' | ')}\n`;
        }
      });
    }
  });
  
  return content;
}