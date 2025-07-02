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
    // Get sample data from the spreadsheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Limit to first 20 rows for analysis
    const sampleData = data.slice(0, 20);
    
    // Create a text representation of the spreadsheet
    const spreadsheetText = sampleData.map((row: any, index: number) => {
      return `Row ${index + 1}: ${row.join(' | ')}`;
    }).join('\n');
    
    // Get column headers if available
    const headers = Array.isArray(data[0]) ? data[0] : Object.keys(data[0] || {});
    
    const systemPrompt = `You are an expert at analyzing API 653 tank inspection spreadsheets. Your task is to identify and extract inspection data accurately. Always return valid JSON.`;
    
    const userPrompt = `Analyze this tank inspection spreadsheet and extract relevant data:

FILENAME: ${fileName}
COLUMNS: ${headers.join(', ')}

SAMPLE DATA:
${spreadsheetText}

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

Look for variations in naming (Tank #, Vessel ID, etc). Extract all thickness readings found.`;

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

    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      return analysis as SpreadsheetAnalysis;
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SpreadsheetAnalysis;
      }
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
  
  // Process all sheets for additional data
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Use AI's mapping suggestions to extract more data
    for (const row of data) {
      const rowObj = row as any;
      
      // Look for thickness measurements based on detected columns
      for (const col of analysis.detectedColumns) {
        if (col.toLowerCase().includes('thick') || col.toLowerCase().includes('reading')) {
          const value = rowObj[col];
          if (typeof value === 'number' && value > 0 && value < 10) {
            // Check if we already have this measurement
            const exists = thicknessMeasurements.some(m => 
              m.location === (rowObj['Location'] || rowObj['Point'] || col) &&
              m.currentThickness === value
            );
            
            if (!exists) {
              thicknessMeasurements.push({
                location: rowObj['Location'] || rowObj['Point'] || `${sheetName} - ${col}`,
                elevation: rowObj['Elevation'] || rowObj['Height'] || '0',
                currentThickness: value,
                component: determineComponent(sheetName, col),
                measurementType: determineMeasurementType(sheetName, col)
              });
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