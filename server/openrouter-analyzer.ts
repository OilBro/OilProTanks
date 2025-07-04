import * as XLSX from 'xlsx';
import { isMarkedAsNA } from './template-generator';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface SpreadsheetAnalysis {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  mappingSuggestions: Record<string, string>;
  detectedColumns: string[];
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function analyzeSpreadsheetWithOpenRouter(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<SpreadsheetAnalysis> {
  try {
    console.log('=== OpenRouter AI Analysis Starting ===');
    console.log('Analyzing file:', fileName);
    console.log('Sheet names:', workbook.SheetNames);
    
    // Analyze ALL sheets in the workbook
    let allSheetData = '';
    let allHeaders: string[] = [];
    const sheetAnalysis: { [key: string]: any } = {};
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length > 0) {
        console.log(`\nAnalyzing sheet: "${sheetName}" with ${data.length} rows`);
        
        // Get headers from this sheet
        const headers = Array.isArray(data[0]) ? data[0] : Object.keys(data[0] || {});
        console.log(`Headers in "${sheetName}":`, headers);
        
        // Store sheet data for analysis
        sheetAnalysis[sheetName] = data.slice(0, 10); // First 10 rows per sheet
        
        // Add to combined text
        allSheetData += `\n\n=== SHEET: ${sheetName} ===\n`;
        allSheetData += `COLUMNS: ${headers.join(' | ')}\n`;
        
        // Add sample rows
        const sampleRows = data.slice(0, 5);
        sampleRows.forEach((row: any, index: number) => {
          allSheetData += `Row ${index + 1}: ${row.join(' | ')}\n`;
        });
        
        // Look for shell thickness data specifically
        if (sheetName.toLowerCase().includes('shell') || 
            sheetName.toLowerCase().includes('thickness') ||
            sheetName.toLowerCase().includes('course')) {
          console.log(`Sheet "${sheetName}" appears to contain thickness data`);
        }
      }
    }
    
    console.log('\nTotal sheets analyzed:', workbook.SheetNames.length);
    
    const systemPrompt = `You are an expert API 653 tank inspection data extraction specialist. Your task is to analyze tank inspection spreadsheets and extract ALL relevant data accurately. Always return valid JSON with comprehensive data extraction.`;
    
    const userPrompt = `Analyze this MULTI-SHEET tank inspection workbook and extract comprehensive data from ALL sheets:

FILENAME: ${fileName}
TOTAL SHEETS: ${workbook.SheetNames.length}

WORKBOOK DATA:
${allSheetData}

EXTRACTION REQUIREMENTS:
Extract information by searching for ANY of the listed field variations:

1. TANK IDENTIFICATION:
   Search for: tank_number, tank_id, equipment_id, tank_no, tank_num, unit_id, unit_number, vessel_id, vessel_number, tank_tag, equipment_tag, asset_id, asset_number, facility_id, tank_designation, unit_designation, vessel_designation, tank_identifier, equipment_identifier, tank_ref, reference_number, serial_number, tank_serial, equipment_serial, tank_code, unit_code, vessel_code, asset_tag, facility_tag, tank_name, unit_name, vessel_name, equipment_name, tank_label, unit_label, vessel_label

2. CLIENT/OWNER:
   Search for: client_name, customer, company, owner, client, customer_name, company_name, owner_name, facility_owner, tank_owner, operator, operator_name, facility_operator, site_owner, property_owner, lessee, tenant, facility_name, site_name, organization, organization_name, entity, entity_name, corporation, business_name, firm, firm_name, contractor, contractor_name, end_user, user, facility, site, installation, plant, plant_name, refinery, refinery_name, terminal, terminal_name

3. LOCATION:
   Search for: location, area, site, address, facility_location, tank_location, site_location, facility_address, tank_address, site_address, physical_address, mailing_address, street_address, installation_location, plant_location, refinery_location, terminal_location, depot_location, geographic_location, coordinates, gps_coordinates, latitude, longitude, state, province, country, region, zone, district, sector, field, field_location, yard, yard_location, plot, plot_number, area_designation

4. DIMENSIONS:
   Search for: diameter, diameter_ft, diameter_feet, tank_diameter, shell_diameter, internal_diameter, external_diameter, outside_diameter, inside_diameter, od, id, dia, diam, width, tank_width, vessel_width, height, height_ft, height_feet, tank_height, shell_height, overall_height, total_height, vessel_height, length, tank_length, vessel_length, radius, tank_radius, shell_radius, circumference, tank_circumference, shell_circumference

5. CAPACITY:
   Search for: capacity, capacity_gal, capacity_gallons, capacity_bbl, capacity_barrels, capacity_bbls, volume, volume_gal, volume_gallons, volume_bbl, volume_barrels, volume_bbls, tank_capacity, tank_volume, working_capacity, working_volume, nominal_capacity, nominal_volume, design_capacity, design_volume, rated_capacity, rated_volume, maximum_capacity, maximum_volume, max_capacity, max_volume, total_capacity, total_volume, shell_capacity, shell_volume, gross_capacity, gross_volume, net_capacity, net_volume, storage_capacity, storage_volume

Return JSON structure:
{
  "reportData": {
    "tankId": "Extract using any tank identification variation",
    "reportNumber": "Report number if found",
    "service": "Product stored (look for product, contents, service, etc)",
    "inspector": "Inspector/examiner/surveyor/technician name",
    "inspectionDate": "Date in YYYY-MM-DD format",
    "diameter": "Tank diameter in feet",
    "height": "Tank height in feet", 
    "originalThickness": "Original/nominal/design thickness",
    "location": "Physical location using any location variation",
    "owner": "Owner/client using any owner variation",
    "yearsSinceLastInspection": "Years since last inspection",
    "equipment_id": "Equipment ID using any variation",
    "capacity": "Tank capacity using any capacity variation",
    "specificGravity": "SG/density/specific gravity",
    "constructionCode": "API-650, API-653, ASME, etc",
    "yearBuilt": "Year built/constructed/installed",
    "shellMaterial": "Material/steel grade/alloy",
    "roofType": "Roof type/design/style",
    "foundationType": "Foundation/base/support type",
    "numberOfCourses": "Courses/rings/strakes/tiers count",
    "inspectorCertification": "API-653, API-510, ASNT, etc",
    "inspectionCompany": "Company/firm/contractor name",
    "testMethods": "UT, VT, MT, PT, RT, ET methods",
    "corrosionAllowance": "CA/corrosion allowance/margin",
    "jointEfficiency": "Joint/weld efficiency"
  },
  "thicknessMeasurements": [
    {
      "location": "Position (N, S, E, W, degrees, etc)",
      "elevation": "Course/ring/strake/tier number",
      "currentThickness": number,
      "component": "shell/bottom/roof/nozzle",
      "originalThickness": "Original/nominal thickness",
      "measurementType": "shell/bottom_plate/internal_annular/critical_zone/roof/nozzle"
    }
  ],
  "checklistItems": [
    {
      "item": "Inspection item/component",
      "status": "satisfactory/acceptable/needs_repair",
      "notes": "Findings or notes"
    }
  ],
  "confidence": 0.0 to 1.0,
  "mappingSuggestions": {
    "columnName": "suggestedFieldMapping"
  },
  "detectedColumns": ["list", "of", "all", "relevant", "columns"]
}

ADDITIONAL FIELD VARIATIONS TO SEARCH:

6. PRODUCT/SERVICE:
   Search for: product, product_stored, contents, tank_contents, stored_product, material, material_stored, substance, substance_stored, commodity, commodity_stored, fluid, fluid_stored, liquid, liquid_stored, medium, medium_stored, service, tank_service, vessel_service, application, tank_application, vessel_application, use, tank_use, vessel_use, purpose, tank_purpose, vessel_purpose

7. INSPECTION DATE:
   Search for: inspection_date, inspection, date, inspection_performed, inspection_completed, examination_date, examination, assessment_date, assessment, evaluation_date, evaluation, survey_date, survey, review_date, review, test_date, testing_date, inspection_start, inspection_end, inspection_period, inspection_interval, last_inspection, previous_inspection, next_inspection, due_date, inspection_due

8. THICKNESS READINGS:
   Search for: thickness, thickness_reading, thickness_measurement, wall_thickness, plate_thickness, shell_thickness, measured_thickness, actual_thickness, current_thickness, remaining_thickness, minimum_thickness, tmin, t_min, nominal_thickness, tnom, t_nom, original_thickness, torig, t_orig, design_thickness, tdes, t_des, required_thickness, treq, t_req, ultrasonic_thickness, ut_thickness, thickness_value, reading, measurement, gauge, gage

9. SHELL COURSES:
   Search for: course, shell_course, course_number, course_no, shell_number, shell_no, ring, ring_number, ring_no, strake, strake_number, strake_no, tier, tier_number, tier_no, level, level_number, level_no, section, section_number, section_no, plate, plate_number, plate_no, course_designation, shell_designation

10. SPECIFIC GRAVITY:
    Search for: specific_gravity, sg, s.g., density, relative_density, api_gravity, api, gravity, product_density, fluid_density, liquid_density, material_density, substance_density, weight, specific_weight, unit_weight

11. MATERIALS:
    Search for: material, shell_material, tank_material, vessel_material, construction_material, plate_material, steel_grade, material_grade, material_specification, material_spec, steel_specification, steel_spec, alloy, metal, steel_type, carbon_steel, stainless_steel, aluminum, material_type, construction_type, fabrication_material

12. ROOF TYPES:
    Search for: roof_type, roof, tank_roof, vessel_roof, roof_design, roof_style, fixed_roof, floating_roof, cone_roof, dome_roof, flat_roof, shed_roof, umbrella_roof, geodesic_roof, internal_floating_roof, external_floating_roof, ifr, efr, pontoon_roof, pan_roof, double_deck_roof, single_deck_roof

13. FOUNDATION:
    Search for: foundation, foundation_type, tank_foundation, vessel_foundation, base, base_type, tank_base, vessel_base, support, support_type, tank_support, vessel_support, footing, footing_type, tank_footing, vessel_footing, pad, concrete_pad, ring_wall, ringwall, slab, concrete_slab, foundation_design, base_design, support_design

14. CORROSION DATA:
    Search for: corrosion_allowance, ca, corrosion_margin, allowance, margin, safety_margin, design_margin, corrosion_factor, wear_allowance, wastage_allowance, metal_loss_allowance, thickness_allowance, minimum_allowance

15. WELD DATA:
    Search for: joint_efficiency, efficiency, weld_efficiency, joint_factor, efficiency_factor, weld_factor, radiographic_efficiency, rt_efficiency, spot_rt_efficiency, full_rt_efficiency, seamless_efficiency, welded_efficiency

CRITICAL INSTRUCTIONS:
1. Search for ANY variation of these terms across ALL sheets
2. Be case-insensitive when searching
3. Look for abbreviated forms (e.g., "Cap" for capacity, "Dia" for diameter)
4. If multiple variations are found, use the most complete value
5. Convert all measurements to standard units (feet, gallons, inches)
6. Convert all dates to YYYY-MM-DD format
7. PRIORITIZE AST COMP TML SHEET FOR THICKNESS READINGS
8. RESPECT N/A MARKERS - skip data marked as N/A
9. Check for data in merged cells, headers, and footers
10. Look for data that might be split across multiple cells
11. Extract thickness data from tables, grids, or lists
12. Look for patterns like "Course 1", "Shell 1", "Ring 1" for shell course data
13. Look for patterns like "N", "S", "E", "W", "0°", "90°", "180°", "270°" for positions
14. Thickness values should be numbers in range 0.05 to 3.0 inches
15. Return ONLY valid JSON, no explanations`;

    const request: OpenRouterRequest = {
      model: 'anthropic/claude-sonnet-4-20250514', // Latest Claude Sonnet 4 model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 18000 // Tripled for maximum extraction capability
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oilpro-tanks.replit.app',
        'X-Title': 'OilPro Tank Inspection'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    console.log('OpenRouter AI raw response:', content);

    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      console.log('Parsed AI analysis:', JSON.stringify(analysis, null, 2));
      console.log(`AI found ${analysis.thicknessMeasurements?.length || 0} thickness measurements`);
      return analysis as SpreadsheetAnalysis;
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]) as SpreadsheetAnalysis;
        console.log('Extracted AI analysis from text:', JSON.stringify(analysis, null, 2));
        return analysis;
      }
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }
    
  } catch (error) {
    console.error('OpenRouter analysis error:', error);
    
    // Return a basic analysis as fallback
    return {
      reportData: {},
      thicknessMeasurements: [],
      checklistItems: [],
      confidence: 0,
      mappingSuggestions: {},
      detectedColumns: []
    };
  }
}

export async function processSpreadsheetWithAI(
  workbook: XLSX.WorkBook,
  analysis: SpreadsheetAnalysis
): Promise<{
  importedData: any;
  thicknessMeasurements: any[];
  checklistItems: any[];
}> {
  console.log('AI Analysis reportData:', JSON.stringify(analysis.reportData, null, 2));
  const importedData: any = { ...analysis.reportData };
  
  // Ensure all numeric fields are properly converted from strings
  const numericFields = [
    'diameter', 'height', 'originalThickness', 'yearsSinceLastInspection',
    'capacity', 'specificGravity', 'yearBuilt', 'numberOfCourses', 
    'corrosionAllowance', 'jointEfficiency'
  ];
  
  for (const field of numericFields) {
    if (importedData[field] !== undefined && importedData[field] !== null) {
      const value = importedData[field];
      if (typeof value === 'string') {
        // Remove units like 'ft', 'feet', 'gal', 'gallons', etc.
        const cleanedValue = value.toString()
          .replace(/[^\d.-]/g, '') // Keep only numbers, dots, and minus signs
          .trim();
        
        const parsed = parseFloat(cleanedValue);
        importedData[field] = isNaN(parsed) ? null : parsed;
        
        if (importedData[field] !== null) {
          console.log(`Converted ${field}: "${value}" -> ${importedData[field]}`);
        }
      }
    }
  }
  
  // Ensure service is a string, not an object
  if (importedData.service && typeof importedData.service === 'object') {
    // If service is an object (e.g., {welded_tanks: ..., bolted_tanks: ...}), 
    // extract a string value from it
    if (importedData.service.welded_tanks) {
      importedData.service = 'welded'; // API 650 construction
    } else if (importedData.service.bolted_tanks) {
      importedData.service = 'bolted'; // API RP 12C construction
    } else {
      // Default to the first value if it's an object
      const values = Object.values(importedData.service);
      importedData.service = values[0] || 'other';
    }
    console.log('Converted service object to string:', importedData.service);
  }
  
  // Convert service to lowercase and map to valid values
  if (importedData.service && typeof importedData.service === 'string') {
    const serviceMap: { [key: string]: string } = {
      'crude': 'crude_oil',
      'crude oil': 'crude_oil',
      'crude_oil': 'crude_oil',
      'gasoline': 'gasoline',
      'gas': 'gasoline',
      'diesel': 'diesel',
      'diesel fuel': 'diesel',
      'jet fuel': 'jet_fuel',
      'jet': 'jet_fuel',
      'aviation': 'jet_fuel',
      'water': 'water',
      'chemical': 'chemical',
      'chemicals': 'chemical',
      'waste': 'waste',
      'waste water': 'waste',
      'slop': 'waste',
      'welded': 'other',
      'bolted': 'other'
    };
    
    const serviceLower = importedData.service.toLowerCase().trim();
    importedData.service = serviceMap[serviceLower] || 'other';
    console.log(`Mapped service "${serviceLower}" to "${importedData.service}"`);
  } else {
    importedData.service = 'crude_oil'; // Default
  }
  
  // Process thickness measurements to ensure proper data types
  const thicknessMeasurements: any[] = [];
  if (analysis.thicknessMeasurements && Array.isArray(analysis.thicknessMeasurements)) {
    for (const measurement of analysis.thicknessMeasurements) {
      const processed = {
        ...measurement,
        currentThickness: parseFloat(measurement.currentThickness) || 0,
        originalThickness: measurement.originalThickness ? parseFloat(measurement.originalThickness) : null,
        elevation: measurement.elevation || '0',
        location: measurement.location || 'Unknown',
        component: measurement.component || 'Shell',
        measurementType: measurement.measurementType || 'shell'
      };
      
      // Only add if we have a valid current thickness
      if (processed.currentThickness > 0) {
        thicknessMeasurements.push(processed);
        console.log(`Processed thickness measurement: ${processed.location} = ${processed.currentThickness}`);
      }
    }
  }
  
  const checklistItems: any[] = [...(analysis.checklistItems || [])];
  
  console.log(`Processing ${workbook.SheetNames.length} sheets for additional thickness data`);
  
  // Process ALL sheets for additional thickness data
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`\nProcessing sheet "${sheetName}" with ${data.length} rows`);
    
    // Special handling for sheets that likely contain thickness data
    // Skip base pages with empty readings - prioritize AST COMP TML sheets
    const isBasePageWithEmptyReadings = sheetName.toLowerCase() === 'base' || 
                                       sheetName.toLowerCase().includes('summary');
    const isASTCompSheet = sheetName.toLowerCase().includes('ast comp') || 
                          sheetName.toLowerCase().includes('tml');
    
    if ((sheetName.toLowerCase().includes('shell') || 
         sheetName.toLowerCase().includes('thickness') ||
         sheetName.toLowerCase().includes('course') ||
         sheetName.toLowerCase().includes('readings') ||
         isASTCompSheet ||
         data.length > 0) && !isBasePageWithEmptyReadings) { // Process sheets with data, skip base pages
      
      // Process each row
      for (const row of data) {
        const rowObj = row as any;
        
        // Look for thickness values in any numeric column
        for (const [key, value] of Object.entries(rowObj)) {
          // Skip N/A marked cells
          if (isMarkedAsNA(value) || isMarkedAsNA(rowObj['Course'])) {
            continue;
          }
          
          if (typeof value === 'number' && value > 0.05 && value < 3) {
            // This looks like a thickness measurement
            const location = rowObj['Location'] || rowObj['Course'] || rowObj['Point'] || 
                           rowObj['Elevation'] || key;
            
            // Check if we already have this measurement
            const exists = thicknessMeasurements.some(m => 
              m.location === location && 
              Math.abs(m.currentThickness - value) < 0.001
            );
            
            if (!exists) {
              const measurement = {
                location: location,
                elevation: rowObj['Elevation'] || rowObj['Height'] || '0',
                currentThickness: value,
                component: determineComponent(sheetName, key),
                measurementType: determineMeasurementType(sheetName, key),
                originalThickness: rowObj['Original'] || rowObj['Nominal'] || '0.375',
                createdAt: new Date().toISOString()
              };
              
              thicknessMeasurements.push(measurement);
              console.log(`Added thickness: ${measurement.location} = ${measurement.currentThickness}`);
            }
          }
        }
      }
    }
  }
  
  // Ensure we have required fields
  if (!importedData.reportNumber) {
    importedData.reportNumber = `IMP-${Date.now()}`;
  }
  if (!importedData.status) {
    importedData.status = 'draft';
  }
  if (!importedData.inspectionDate) {
    importedData.inspectionDate = new Date().toISOString().split('T')[0];
  }
  
  // Final validation logging
  console.log('=== FINAL IMPORT DATA VALIDATION ===');
  console.log('Tank ID:', importedData.tankId, 'Type:', typeof importedData.tankId);
  console.log('Service:', importedData.service, 'Type:', typeof importedData.service);
  console.log('Diameter:', importedData.diameter, 'Type:', typeof importedData.diameter);
  console.log('Height:', importedData.height, 'Type:', typeof importedData.height);
  console.log('Original Thickness:', importedData.originalThickness, 'Type:', typeof importedData.originalThickness);
  console.log('Years Since Last:', importedData.yearsSinceLastInspection, 'Type:', typeof importedData.yearsSinceLastInspection);
  console.log('Total Measurements:', thicknessMeasurements.length);
  console.log('Total Checklist Items:', checklistItems.length);
  
  return {
    importedData,
    thicknessMeasurements,
    checklistItems
  };
}

function determineComponent(sheetName: string, columnName: string): string {
  const sheet = sheetName.toLowerCase();
  const col = columnName.toLowerCase();
  
  if (sheet.includes('shell') || col.includes('shell')) return 'Shell';
  if (sheet.includes('bottom') || col.includes('bottom') || col.includes('floor')) return 'Bottom';
  if (sheet.includes('roof') || col.includes('roof')) return 'Roof';
  if (sheet.includes('nozzle') || col.includes('nozzle')) return 'Nozzle';
  
  return 'Shell'; // Default
}

function determineMeasurementType(sheetName: string, columnName: string): string {
  const sheet = sheetName.toLowerCase();
  const col = columnName.toLowerCase();
  
  if (sheet.includes('shell') || col.includes('shell')) return 'shell';
  if (sheet.includes('bottom') || col.includes('bottom')) return 'bottom_plate';
  if (sheet.includes('roof') || col.includes('roof')) return 'roof';
  if (sheet.includes('nozzle') || col.includes('nozzle')) return 'nozzle';
  if (col.includes('annular')) return 'internal_annular';
  if (col.includes('critical')) return 'critical_zone';
  
  return 'shell'; // Default
}