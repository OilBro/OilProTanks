import * as XLSX from 'xlsx';

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
    
    const systemPrompt = `You are an expert at analyzing API 653 tank inspection spreadsheets. Your task is to identify and extract inspection data accurately. Always return valid JSON.`;
    
    const userPrompt = `Analyze this MULTI-SHEET tank inspection workbook and extract relevant data from ALL sheets:

FILENAME: ${fileName}
TOTAL SHEETS: ${workbook.SheetNames.length}

WORKBOOK DATA:
${allSheetData}

Return a JSON object with this exact structure:
{
  "reportData": {
    "tankId": "extracted tank ID",
    "reportNumber": "report number",
    "service": "product type (crude oil/diesel/water/etc)",
    "inspector": "inspector name",
    "inspectionDate": "YYYY-MM-DD",
    "diameter": "tank diameter",
    "height": "tank height",
    "originalThickness": "original thickness",
    "location": "facility name",
    "owner": "owner/company"
  },
  "thicknessMeasurements": [
    {
      "location": "measurement point",
      "elevation": "height/elevation",
      "currentThickness": number,
      "component": "shell/bottom/roof"
    }
  ],
  "checklistItems": [
    {
      "item": "inspection item",
      "status": "pass/fail/satisfactory",
      "notes": "notes if any"
    }
  ],
  "confidence": 0.0 to 1.0,
  "mappingSuggestions": {
    "columnName": "suggestedFieldMapping"
  },
  "detectedColumns": ["list", "of", "relevant", "columns"]
}

Look for variations in naming (Tank #, Vessel ID, etc). 

IMPORTANT: Extract ALL thickness readings found, especially:
- Shell thickness measurements (look for columns with numeric values between 0.1 and 1.0)
- Course measurements (Course 1, Course 2, etc.)
- Any columns with headers containing "thickness", "reading", "UT", "measured"
- Numeric columns that appear to be thickness values
- Pay special attention to shell/wall thickness data in any format

For each thickness reading found, include it in the thicknessMeasurements array with proper location/elevation info.`;

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
  const importedData: any = { ...analysis.reportData };
  const thicknessMeasurements: any[] = [...analysis.thicknessMeasurements];
  const checklistItems: any[] = [...analysis.checklistItems];
  
  console.log(`Processing ${workbook.SheetNames.length} sheets for additional thickness data`);
  
  // Process ALL sheets for additional thickness data
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`\nProcessing sheet "${sheetName}" with ${data.length} rows`);
    
    // Special handling for sheets that likely contain thickness data
    if (sheetName.toLowerCase().includes('shell') || 
        sheetName.toLowerCase().includes('thickness') ||
        sheetName.toLowerCase().includes('course') ||
        sheetName.toLowerCase().includes('readings') ||
        data.length > 0) { // Process all sheets with data
      
      // Process each row
      for (const row of data) {
        const rowObj = row as any;
        
        // Look for thickness values in any numeric column
        for (const [key, value] of Object.entries(rowObj)) {
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