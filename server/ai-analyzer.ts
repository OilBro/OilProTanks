import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';

/*
The newest Anthropic model is "claude-3-5-sonnet-20241022", not "claude-3-sonnet-20240229".
If the user doesn't specify a model, always prefer using "claude-3-5-sonnet-20241022" as it is the latest model.
*/

const DEFAULT_MODEL_STR = "claude-3-5-sonnet-20241022";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalyzedField {
  fieldName: string;
  value: any;
  confidence: number;
  sourceLocation: string;
}

export interface SpreadsheetAnalysis {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  suggestions: string[];
}

export async function analyzeSpreadsheetWithAI(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<SpreadsheetAnalysis> {
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
  
  const prompt = `You are analyzing an API 653 tank inspection spreadsheet. Please identify and extract the following information:

SPREADSHEET NAME: ${fileName}
COLUMN HEADERS: ${headers.join(', ')}

SAMPLE DATA:
${spreadsheetText}

Please analyze this data and return a JSON response with the following structure:
{
  "reportData": {
    "tankId": "extracted tank ID",
    "reportNumber": "extracted report number", 
    "service": "product/service type (e.g., crude oil, diesel, water)",
    "inspector": "inspector name",
    "inspectionDate": "YYYY-MM-DD format",
    "diameter": "tank diameter in feet",
    "height": "tank height in feet",
    "originalThickness": "original shell thickness",
    "location": "facility/location name",
    "owner": "owner/company name",
    "lastInspection": "YYYY-MM-DD format if available"
  },
  "thicknessMeasurements": [
    {
      "location": "measurement location",
      "elevation": "elevation/height",
      "currentThickness": "thickness value",
      "component": "shell/bottom/roof/etc"
    }
  ],
  "checklistItems": [
    {
      "item": "inspection item description",
      "status": "pass/fail/satisfactory/etc",
      "notes": "any notes"
    }
  ],
  "confidence": 0.85,
  "suggestions": ["Any tips for better data extraction"]
}

Look for variations like "Tank #", "Tank No.", "Vessel ID" for tank ID. For dates, handle various formats. For thickness, look for columns with "thickness", "reading", "measurement", etc.`;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      temperature: 0.1,
      system: "You are an expert at analyzing API 653 tank inspection spreadsheets. Extract data accurately and handle various naming conventions. Always return valid JSON.",
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        const result = JSON.parse(content.text);
        return result as SpreadsheetAnalysis;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Try to extract JSON from the response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as SpreadsheetAnalysis;
        }
        throw new Error('AI response was not valid JSON');
      }
    }
    
    throw new Error('Unexpected AI response format');
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Return a basic analysis as fallback
    return {
      reportData: {},
      thicknessMeasurements: [],
      checklistItems: [],
      confidence: 0,
      suggestions: ['AI analysis failed. Using standard field detection.']
    };
  }
}

export async function extractDetailedMeasurements(
  workbook: XLSX.WorkBook,
  aiSuggestions: SpreadsheetAnalysis
): Promise<any[]> {
  const measurements: any[] = [];
  
  // Process all sheets for thickness data
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Use AI suggestions to identify measurement columns
    const measurementColumns = aiSuggestions.suggestions
      .filter(s => s.includes('thickness') || s.includes('measurement'))
      .map(s => s.toLowerCase());
    
    for (const row of data) {
      const rowObj = row as any;
      
      // Look for thickness values
      for (const [key, value] of Object.entries(rowObj)) {
        if (typeof value === 'number' && value > 0 && value < 10) { // Reasonable thickness range
          const keyLower = key.toLowerCase();
          if (keyLower.includes('thick') || keyLower.includes('reading') || 
              keyLower.includes('measurement') || measurementColumns.some(col => keyLower.includes(col))) {
            
            measurements.push({
              location: rowObj['Location'] || rowObj['Point'] || `${sheetName} - ${key}`,
              elevation: rowObj['Elevation'] || rowObj['Height'] || '0',
              currentThickness: value,
              originalThickness: aiSuggestions.reportData.originalThickness || 0.25,
              component: determineComponent(sheetName, key, rowObj),
              measurementType: determineMeasurementType(sheetName, key, rowObj)
            });
          }
        }
      }
    }
  }
  
  return measurements;
}

function determineComponent(sheetName: string, columnName: string, row: any): string {
  const sheet = sheetName.toLowerCase();
  const col = columnName.toLowerCase();
  
  if (sheet.includes('shell') || col.includes('shell')) return 'Shell';
  if (sheet.includes('bottom') || col.includes('bottom') || col.includes('floor')) return 'Bottom';
  if (sheet.includes('roof') || col.includes('roof')) return 'Roof';
  if (sheet.includes('nozzle') || col.includes('nozzle')) return 'Nozzle';
  
  return 'Shell'; // Default
}

function determineMeasurementType(sheetName: string, columnName: string, row: any): string {
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