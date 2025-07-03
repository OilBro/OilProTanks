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
Extract ALL available information into this JSON structure:

{
  "reportData": {
    "tankId": "Tank identification (look for Tank #, Tank No, Unit, Vessel, AST)",
    "reportNumber": "Report number if found",
    "service": "Product type (crude oil, diesel, water, etc)",
    "inspector": "Inspector name",
    "inspectionDate": "YYYY-MM-DD format",
    "diameter": "Tank diameter (feet or meters)",
    "height": "Tank height (feet or meters)", 
    "originalThickness": "Original/nominal thickness",
    "location": "Physical location/facility name",
    "owner": "Owner/company/client name",
    "yearsSinceLastInspection": "Years since last inspection (number)",
    "equipment_id": "Equipment tag if found",
    "capacity": "Tank capacity if found",
    "specificGravity": "Product specific gravity if found",
    "constructionCode": "API-650, API-653, etc if found",
    "yearBuilt": "Year of construction if found",
    "shellMaterial": "Shell material if found",
    "roofType": "Roof type if found",
    "foundationType": "Foundation type if found",
    "numberOfCourses": "Number of shell courses if found",
    "inspectorCertification": "API-653 certification if found",
    "inspectionCompany": "Inspection company if found",
    "testMethods": "UT, VT, MT, etc if found",
    "corrosionAllowance": "Corrosion allowance if found",
    "jointEfficiency": "Joint efficiency if found"
  },
  "thicknessMeasurements": [
    {
      "location": "Measurement point/position",
      "elevation": "Course number or elevation",
      "currentThickness": number,
      "component": "shell/bottom/roof/nozzle",
      "originalThickness": "Original thickness if available",
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

CRITICAL EXTRACTION RULES:
1. PRIORITIZE AST COMP TML SHEET FOR THICKNESS READINGS:
   - IGNORE thickness readings from base/summary pages - they are often blank placeholders
   - Focus on sheets named: "AST COMP TML", "AST Comp", "Comp TML", "TML"
   - Columns: tml-1, tml-2, _1, _2, or any numeric columns with values 0.05-3.0
   - Shell course data (Course 1, Course 2, etc)
   - Look for patterns like "N", "S", "E", "W" with thickness values
   
2. Search patterns for tank data:
   - Tank: "Tank", "Tank #", "Tank No", "Unit", "Vessel", "AST", "T-"
   - Location: "Location", "Site", "Facility", "Plant"
   - Owner: "Client", "Company", "Owner", "Customer"
   - Dates: Convert any date format to YYYY-MM-DD
   
3. Extract numeric values properly:
   - Thickness values should be numbers, not strings
   - Typical thickness range: 0.05 to 3.0 inches
   - Include values from cells even without headers
   
4. Check every sheet for data - don't skip any
5. If data is missing, use null (not "Not found")
6. Include all data fields even if null
7. RESPECT N/A MARKERS:
   - If a cell or section is marked "N/A", skip that data
   - For thickness sheets: If Course is "N/A", skip entire row
   - Do not extract measurements from sections marked N/A

For each thickness reading found, include it in the thicknessMeasurements array with complete information.`;

    const request: OpenRouterRequest = {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
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
  
  const thicknessMeasurements: any[] = [...analysis.thicknessMeasurements];
  const checklistItems: any[] = [...analysis.checklistItems];
  
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