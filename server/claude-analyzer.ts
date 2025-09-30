// Claude AI Document Analyzer for Excel and PDF parsing
// Uses Anthropic's Claude 3.5 Sonnet for intelligent extraction

import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from "xlsx";

interface ClaudeAnalysisResponse {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  detectedFields: string[];
  mappingSuggestions: Record<string, string>;
  extractedText?: string;
  extractionDetails?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

// Initialize Anthropic client
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  if (!anthropic) {
    throw new Error('Anthropic API key not configured');
  }
  return anthropic;
}

const SYSTEM_PROMPT = `You are an expert API 653 tank inspection data extraction specialist. 
Extract comprehensive tank inspection data from documents and return structured JSON.

Focus on extracting:
1. Tank identification (ID, location, service/product, customer)
2. Tank specifications (diameter, height, capacity, materials, construction year)
3. Inspection details (date, inspector, report codes, standards referenced)
4. ALL thickness measurements with precise values and locations:
   - Shell courses (nominal vs current thickness, corrosion rates)
   - Bottom/floor measurements
   - Roof measurements  
   - Nozzles and appurtenances
5. Settlement survey data (elevation measurements, dates)
6. Inspection findings and recommendations
7. Next inspection dates and intervals
8. Checklist items with status/conditions
9. Repair recommendations with priorities

For thickness measurements:
- Extract EXACT numeric values (e.g., 0.375, 0.250)
- Include units (inches, mm, mils)
- Note location (course number, position, component)
- Include original/nominal vs current thickness
- Extract minimum required thickness
- Note any corrosion rates or calculations

Return a JSON object with this structure:
{
  "reportData": {
    "tankId": "...",
    "customer": "...",
    "location": "...",
    "inspectionDate": "YYYY-MM-DD",
    "inspector": "...",
    "tankProduct": "...",
    "tankDiameter": number,
    "tankHeight": number,
    "capacity": "...",
    // ... other fields
  },
  "thicknessMeasurements": [
    {
      "location": "...",
      "component": "...",
      "nominalThickness": number,
      "currentThickness": number,
      "minRequiredThickness": number,
      "corrosionRate": number,
      "unit": "inches"
    }
  ],
  "checklistItems": [
    {
      "item": "...",
      "status": "...",
      "notes": "..."
    }
  ],
  "detectedFields": ["list", "of", "detected", "field", "names"]
}`;

export async function analyzeDocumentWithClaude(
  content: string,
  filename: string,
  documentType: "excel" | "pdf"
): Promise<ClaudeAnalysisResponse> {
  const startTime = Date.now();
  console.log('=== CLAUDE AI ANALYSIS STARTING ===');
  console.log(`Document: ${filename}`);
  console.log(`Type: ${documentType}`);
  console.log('Model: Claude 3.5 Sonnet');

  try {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 8192,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract all tank inspection data from this ${documentType} document:\n\n${content}`,
        },
      ],
    });

    // Extract the JSON from Claude's response
    const responseText = message.content[0]?.type === 'text' 
      ? message.content[0].text 
      : '';

    // Try to parse JSON from the response
    let parsedData: any = {};
    let parseSuccessful = false;
    try {
      // Find JSON in the response (Claude might include explanatory text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
        parseSuccessful = true;
      } else {
        parsedData = JSON.parse(responseText);
        parseSuccessful = true;
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError);
      // Return a basic structure if parsing fails
      parsedData = {
        reportData: {},
        thicknessMeasurements: [],
        checklistItems: [],
        detectedFields: []
      };
    }

    const processingTime = Date.now() - startTime;
    console.log(`=== CLAUDE AI ANALYSIS COMPLETE ===`);
    console.log(`Processing time: ${processingTime}ms`);
    console.log(`Tokens used: ${message.usage?.input_tokens + message.usage?.output_tokens}`);
    console.log(`Detected fields: ${parsedData.detectedFields?.length || 0}`);
    console.log(`Thickness measurements: ${parsedData.thicknessMeasurements?.length || 0}`);

    // Calculate confidence based on extraction quality
    let confidence = 0;
    if (parseSuccessful) {
      const fieldsFound = Object.keys(parsedData.reportData || {}).length;
      const measurementsFound = parsedData.thicknessMeasurements?.length || 0;
      const checklistFound = parsedData.checklistItems?.length || 0;
      
      // Base confidence on successful parsing
      confidence = 0.5;
      
      // Increase confidence based on data found
      if (fieldsFound > 5) confidence += 0.2;
      if (measurementsFound > 0) confidence += 0.2;
      if (checklistFound > 0) confidence += 0.1;
      
      // Cap at 0.95 for excellent extraction
      confidence = Math.min(confidence, 0.95);
    } else {
      // Low confidence if parsing failed
      confidence = 0.2;
    }

    return {
      reportData: parsedData.reportData || {},
      thicknessMeasurements: parsedData.thicknessMeasurements || [],
      checklistItems: parsedData.checklistItems || [],
      confidence,
      detectedFields: parsedData.detectedFields || Object.keys(parsedData.reportData || {}),
      mappingSuggestions: {},
      extractedText: content.substring(0, 5000), // Store first 5000 chars for reference
      extractionDetails: {
        model: 'claude-3-5-sonnet-latest',
        tokensUsed: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
        processingTime
      }
    };
  } catch (error: any) {
    console.error('Claude AI analysis failed:', error);
    
    // Provide more specific error classification
    if (error.status === 401 || error.message?.includes('401')) {
      console.error('AUTHENTICATION ERROR: Claude API key may be invalid or expired');
    } else if (error.status === 429 || error.message?.includes('429')) {
      console.error('RATE LIMIT ERROR: Too many requests to Claude API');
    } else if (error.message?.includes('timeout')) {
      console.error('TIMEOUT ERROR: Claude API took too long to respond');
    }
    
    throw new Error(`Claude AI analysis failed: ${error.message || 'Unknown error'}`);
  }
}

// Wrapper function for Excel analysis
export async function analyzeExcelWithClaude(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<ClaudeAnalysisResponse> {
  console.log('=== CLAUDE EXCEL ANALYSIS ===');
  
  // Convert workbook to text content for analysis
  let content = '';
  const sheets = workbook.SheetNames;
  
  for (const sheetName of sheets) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    content += `\n=== SHEET: ${sheetName} ===\n`;
    
    // Add the data as CSV-like format
    if (Array.isArray(data)) {
      data.forEach((row: any, index: number) => {
        if (Array.isArray(row)) {
          content += `Row ${index + 1}: ${row.join(' | ')}\n`;
        }
      });
    }

    // Also add as JSON for better structure recognition
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    if (jsonData.length > 0) {
      content += '\n--- Structured Data ---\n';
      content += JSON.stringify(jsonData.slice(0, 100), null, 2); // Limit to first 100 rows
    }
  }
  
  return await analyzeDocumentWithClaude(content, fileName, 'excel');
}

// Wrapper function for PDF analysis  
export async function analyzePDFWithClaude(
  extractedText: string,
  fileName: string,
  metadata?: {
    pages?: number;
    info?: any;
    tables?: string[];
  }
): Promise<ClaudeAnalysisResponse> {
  console.log('=== CLAUDE PDF ANALYSIS ===');
  console.log(`Pages: ${metadata?.pages || 'unknown'}`);
  
  // Add metadata to content if available
  let content = extractedText;
  if (metadata?.tables && metadata.tables.length > 0) {
    content += '\n\n=== EXTRACTED TABLES ===\n';
    content += metadata.tables.join('\n');
  }
  
  const result = await analyzeDocumentWithClaude(content, fileName, 'pdf');
  result.extractedText = extractedText; // Keep full extracted text
  return result;
}