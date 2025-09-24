// Manus AI Document Analyzer
// Tank inspection data extraction using Manus AI API

import * as XLSX from "xlsx";

interface ManusAnalysisResponse {
  rawData: Record<string, any>;
  thicknessMeasurements: any[];
  confidence: number;
  completionStatus: Record<string, string>;
  samplingInspections: Record<string, string>;
  detectedFields: string[];
  extractedText: string;
  sections: Record<string, string>;
  extractionDetails: {
    tableFound: boolean;
    patternsMatched: Record<string, number>;
    detectedFields: string[];
    warnings: string[];
    successfulExtractions: string[];
    failedExtractions: string[];
  };
}

interface ManusAPIRequest {
  prompt: string;
  attachments?: {
    filename: string;
    url: string;
    mime_type: string;
    size_bytes: number;
  }[];
  mode: "fast" | "quality";
  hide_in_task_list?: boolean;
  create_shareable_link?: boolean;
}

interface ManusAPIResponse {
  task_id: string;
  task_title: string;
  task_url: string;
  shareURL?: string;
}

interface ManusTaskStatus {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  progress?: number;
}

const MANUS_API_URL = "https://api.manus.ai/v1/tasks";

export async function analyzeDocumentWithManus(
  content: string,
  filename: string,
  documentType: "excel" | "pdf",
  sheets?: string[],
): Promise<ManusAnalysisResponse> {
  console.log("=== MANUS AI ANALYSIS STARTING ===");

  if (!process.env.MANUS_API_KEY) {
    console.error("Manus API key not configured");
    throw new Error("Manus AI integration requires API key configuration");
  }

  try {
    const systemContext = `You are an expert API 653 tank inspection data extraction specialist.

Extract comprehensive tank inspection data from the provided document and return the results in a structured JSON format.

CRITICAL: You must extract and return actual data from the document, not placeholder text.

Focus on extracting:
1. Tank identification (ID, location, service/product, customer)
2. Tank specifications (diameter, height, capacity, materials, construction)
3. Inspection details (date, inspector, report codes/standards)
4. ALL thickness measurements with precise values and locations

For thickness measurements:
- Extract EXACT numeric values (e.g., 0.375, 0.250)
- Include units (inches, mm, mils)
- Note location (course number, position, component)
- Include original vs current thickness
- Extract minimum required thickness

For dates, use YYYY-MM-DD format. For numeric values, preserve precision.

Return the extracted data in this JSON structure:
{
  "tankId": "actual tank ID from document",
  "customer": "actual customer name from document", 
  "location": "actual location from document",
  "service": "actual service/product from document",
  "diameter": "actual diameter value",
  "height": "actual height value",
  "capacity": "actual capacity value",
  "inspectionDate": "YYYY-MM-DD",
  "inspector": "actual inspector name",
  "thicknessMeasurements": [
    {
      "component": "shell course 1",
      "location": "0° position",
      "currentThickness": 0.375,
      "originalThickness": 0.500,
      "units": "inches"
    }
  ],
  "findings": ["actual findings from document"],
  "recommendations": ["actual recommendations from document"]
}

Document content to analyze:
${content}`;

    const requestBody: ManusAPIRequest = {
      prompt: systemContext,
      mode: "quality",
      hide_in_task_list: true,
      create_shareable_link: false,
    };

    console.log("Sending request to Manus AI...");

    const response = await fetch(MANUS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MANUS_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manus API error response:", response.status, errorText);
      throw new Error(`Manus API error: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as ManusAPIResponse;
    console.log("=== MANUS AI TASK CREATED ===");
    console.log("Task ID:", result.task_id);
    console.log("Task URL:", result.task_url);

    // For now, return a basic response structure
    // TODO: Implement proper polling in a future update
    return {
      rawData: {
        taskId: result.task_id,
        status: "task_created",
      },
      thicknessMeasurements: [],
      confidence: 0.5,
      completionStatus: {},
      samplingInspections: {},
      detectedFields: ["taskId"],
      extractedText: "",
      sections: {},
      extractionDetails: {
        tableFound: false,
        patternsMatched: {},
        detectedFields: ["taskId"],
        warnings: ["Task created, polling not yet implemented"],
        successfulExtractions: ["task_creation"],
        failedExtractions: [],
      },
    };
  } catch (error: any) {
    console.error("Manus AI analysis failed:", error);
    throw new Error(
      `Manus AI analysis failed: ${error.message || "Unknown error"}`,
    );
  }
}

export async function analyzeExcelWithManus(
  workbook: any,
  filename: string,
): Promise<ManusAnalysisResponse> {
  const content = workbookToString(workbook);
  return analyzeDocumentWithManus(content, filename, "excel");
}

export async function analyzePDFWithManus(
  pdfData: any,
  filename: string,
): Promise<ManusAnalysisResponse> {
  const content =
    typeof pdfData === "string" ? pdfData : JSON.stringify(pdfData);
  return analyzeDocumentWithManus(content, filename, "pdf");
}

function workbookToString(workbook: any): string {
  try {
    const sheets = workbook.SheetNames || [];
    let content = "";

    for (const sheetName of sheets) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        content += `\n=== Sheet: ${sheetName} ===\n`;
        content += XLSX.utils.sheet_to_csv(sheet);
        content += "\n";
      }
    }

    return content;
  } catch (error) {
    console.error("Error converting workbook to string:", error);
    return JSON.stringify(workbook);
  }
}
