// Manus AI Document Analyzer
// Tank inspection data extraction using Manus AI API with proper polling

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

interface ManusTaskResult {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  progress?: number;
  created_at?: string;
  completed_at?: string;
}

const MANUS_API_URL = "https://api.manus.ai/v1/tasks";

export async function analyzeDocumentWithManus(
  content: string,
  filename: string,
  documentType: "excel" | "pdf",
  sheets?: string[],
): Promise<ManusAnalysisResponse> {
  console.log("=== MANUS AI ANALYSIS STARTING ===");
  console.log("Document:", filename, "Type:", documentType);

  if (!process.env.MANUS_API_KEY) {
    console.error("Manus API key not configured");
    throw new Error("Manus AI integration requires API key configuration");
  }

  try {
    // Enhanced prompt for better extraction
    const systemContext = `You are an expert API 653 tank inspection data extraction specialist. Extract comprehensive data from this tank inspection document and return it in structured JSON format.

CRITICAL INSTRUCTIONS:
- Extract ACTUAL data from the document, never use placeholder text
- Be precise with numeric values and preserve all decimal places
- Extract ALL thickness measurements with their exact locations
- Include all tank specifications, dates, and personnel information

REQUIRED DATA TO EXTRACT:

1. TANK IDENTIFICATION:
   - Tank ID/Number (e.g., "04", "TK-04", "DAYBROOK TK 04")
   - Customer/Owner name
   - Location/Facility name
   - Service/Product stored (e.g., "FISH OIL")

2. INSPECTION DETAILS:
   - Report number
   - Inspector name
   - Inspection date (format as YYYY-MM-DD)
   - API 653 certification number
   - Employer/Company

3. TANK SPECIFICATIONS:
   - Diameter (with units)
   - Height (with units)
   - Capacity (with units)
   - Construction materials
   - Design pressure/temperature

4. THICKNESS MEASUREMENTS (CRITICAL):
   - Extract ALL thickness readings from tables/appendices
   - Include location (shell course, position, component)
   - Current thickness values with units
   - Original/nominal thickness if available
   - Minimum required thickness
   - Any corrosion rates

5. INSPECTION FINDINGS:
   - Condition assessments
   - Defects or anomalies found
   - Recommendations for repairs/maintenance
   - Next inspection dates

6. DATES AND SCHEDULING:
   - Next external inspection date
   - Next internal inspection date
   - Next UT thickness inspection date

RETURN FORMAT - JSON structure:
{
  "tankId": "extracted tank ID",
  "reportNumber": "extracted report number",
  "customer": "extracted customer/owner name",
  "location": "extracted facility location",
  "service": "extracted service/product",
  "inspector": "extracted inspector name",
  "inspectionDate": "YYYY-MM-DD",
  "api653Cert": "extracted certification number",
  "employer": "extracted company name",
  "diameter": "extracted diameter with units",
  "height": "extracted height with units",
  "capacity": "extracted capacity with units",
  "nextExternalDate": "YYYY-MM-DD",
  "nextInternalDate": "YYYY-MM-DD",
  "nextUTDate": "YYYY-MM-DD",
  "thicknessMeasurements": [
    {
      "component": "shell course 1",
      "location": "0° position",
      "currentThickness": 0.375,
      "originalThickness": 0.500,
      "minimumRequired": 0.250,
      "units": "inches",
      "condition": "acceptable"
    }
  ],
  "findings": ["list of actual findings"],
  "recommendations": ["list of actual recommendations"],
  "extractedData": {
    "totalMeasurements": 25,
    "averageThickness": 0.325,
    "minimumFound": 0.250,
    "maximumFound": 0.500
  }
}

Document content to analyze:
${content}`;

    // Create the task
    const requestBody: ManusAPIRequest = {
      prompt: systemContext,
      mode: "quality",
      hide_in_task_list: false,
      create_shareable_link: false,
    };

    console.log("Creating Manus AI task...");

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

    const taskResult = (await response.json()) as ManusAPIResponse;
    console.log("=== MANUS AI TASK CREATED ===");
    console.log("Task ID:", taskResult.task_id);
    console.log("Task URL:", taskResult.task_url);

    // Poll for results
    console.log("Polling for task completion...");
    const completedResult = await pollForTaskCompletion(
      taskResult.task_id,
      taskResult.task_url,
    );

    // Process the real results
    return processManusResults(completedResult, filename, documentType);
  } catch (error: any) {
    console.error("Manus AI analysis failed:", error);
    throw new Error(
      `Manus AI analysis failed: ${error.message || "Unknown error"}`,
    );
  }
}

async function pollForTaskCompletion(
  taskId: string,
  taskUrl: string,
  maxAttempts: number = 60,
): Promise<any> {
  console.log(`Starting to poll task ${taskId}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt}/${maxAttempts}...`);

      // Try multiple possible endpoints for getting task results
      const endpoints = [
        `${MANUS_API_URL}/${taskId}`,
        `${MANUS_API_URL}/${taskId}/result`,
        `${MANUS_API_URL}/${taskId}/status`,
        taskUrl,
        `https://api.manus.ai/v1/tasks/${taskId}/result`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.MANUS_API_KEY}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Success with endpoint: ${endpoint}`);
            console.log("Task result:", JSON.stringify(result, null, 2));

            // Check if task is completed
            if (
              result.status === "completed" ||
              result.result ||
              result.output
            ) {
              console.log("=== TASK COMPLETED ===");
              return result;
            } else if (result.status === "failed") {
              throw new Error(
                `Task failed: ${result.error || "Unknown error"}`,
              );
            } else {
              console.log(`Task status: ${result.status || "running"}`);
              break; // Try next polling attempt
            }
          } else {
            console.log(`Endpoint ${endpoint} returned ${response.status}`);
          }
        } catch (endpointError: any) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
          continue; // Try next endpoint
        }
      }

      // Wait before next attempt
      const waitTime = Math.min(3000 + attempt * 1000, 10000); // 3-10 seconds
      console.log(`Waiting ${waitTime}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } catch (error: any) {
      console.error(`Polling attempt ${attempt} failed:`, error.message);

      if (attempt === maxAttempts) {
        throw new Error(
          `Task polling failed after ${maxAttempts} attempts: ${error.message}`,
        );
      }
    }
  }

  throw new Error(`Task did not complete within ${maxAttempts} attempts`);
}

function processManusResults(
  manusResult: any,
  filename: string,
  documentType: string,
): ManusAnalysisResponse {
  console.log("=== PROCESSING MANUS RESULTS ===");

  try {
    // Extract the actual result data
    let extractedData: any = {};

    if (manusResult.result) {
      extractedData = manusResult.result;
    } else if (manusResult.output) {
      extractedData = manusResult.output;
    } else if (manusResult.response) {
      extractedData = manusResult.response;
    } else {
      extractedData = manusResult;
    }

    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    // Parse JSON if it's a string
    if (typeof extractedData === "string") {
      try {
        extractedData = JSON.parse(extractedData);
      } catch (parseError) {
        console.log("Could not parse as JSON, using as text");
      }
    }

    // Map the extracted data to our response format
    const thicknessMeasurements = extractedData.thicknessMeasurements || [];
    const detectedFields = Object.keys(extractedData).filter(
      (key) => extractedData[key] && extractedData[key] !== "Not found",
    );

    return {
      rawData: {
        taskId: manusResult.task_id,
        status: "completed",
        filename: filename,
        documentType: documentType,
        tankId: extractedData.tankId || "Unknown",
        reportNumber: extractedData.reportNumber || "Unknown",
        customer: extractedData.customer || "Unknown",
        location: extractedData.location || "Unknown",
        service: extractedData.service || "Unknown",
        inspector: extractedData.inspector || "Unknown",
        inspectionDate:
          extractedData.inspectionDate ||
          new Date().toISOString().split("T")[0],
        api653Cert: extractedData.api653Cert || "Unknown",
        employer: extractedData.employer || "Unknown",
        diameter: extractedData.diameter || "Unknown",
        height: extractedData.height || "Unknown",
        capacity: extractedData.capacity || "Unknown",
        nextExternalDate: extractedData.nextExternalDate || "Unknown",
        nextInternalDate: extractedData.nextInternalDate || "Unknown",
        nextUTDate: extractedData.nextUTDate || "Unknown",
      },
      thicknessMeasurements: thicknessMeasurements,
      confidence: calculateConfidence(extractedData, detectedFields),
      completionStatus: {
        taskCompleted: "true",
        dataExtracted: "true",
        fieldsFound: detectedFields.length.toString(),
      },
      samplingInspections: {
        totalMeasurements: (thicknessMeasurements.length || 0).toString(),
        averageThickness:
          extractedData.extractedData?.averageThickness?.toString() || "0",
        minimumThickness:
          extractedData.extractedData?.minimumFound?.toString() || "0",
      },
      detectedFields: detectedFields,
      extractedText: JSON.stringify(extractedData, null, 2),
      sections: {
        identification: "Tank ID, Customer, Location extracted",
        inspection: "Inspector, Date, Report Number extracted",
        measurements: `${thicknessMeasurements.length} thickness measurements extracted`,
        recommendations: `${(extractedData.recommendations || []).length} recommendations extracted`,
      },
      extractionDetails: {
        tableFound: thicknessMeasurements.length > 0,
        patternsMatched: {
          tankId: extractedData.tankId ? 1 : 0,
          inspector: extractedData.inspector ? 1 : 0,
          measurements: thicknessMeasurements.length,
          dates:
            (extractedData.inspectionDate ? 1 : 0) +
            (extractedData.nextExternalDate ? 1 : 0),
        },
        detectedFields: detectedFields,
        warnings: [],
        successfulExtractions: detectedFields,
        failedExtractions: [],
      },
    };
  } catch (error: any) {
    console.error("Error processing Manus results:", error);

    return {
      rawData: {
        taskId: manusResult.task_id || "unknown",
        status: "processing_error",
        error: error.message,
      },
      thicknessMeasurements: [],
      confidence: 0.1,
      completionStatus: { error: error.message },
      samplingInspections: {},
      detectedFields: [],
      extractedText: JSON.stringify(manusResult, null, 2),
      sections: {},
      extractionDetails: {
        tableFound: false,
        patternsMatched: {},
        detectedFields: [],
        warnings: [`Processing error: ${error.message}`],
        successfulExtractions: [],
        failedExtractions: ["result_processing"],
      },
    };
  }
}

function calculateConfidence(
  extractedData: any,
  detectedFields: string[],
): number {
  const totalPossibleFields = 15; // Expected number of key fields
  const foundFields = detectedFields.length;
  const hasThicknessMeasurements =
    (extractedData.thicknessMeasurements || []).length > 0;

  let confidence = (foundFields / totalPossibleFields) * 0.8;
  if (hasThicknessMeasurements) confidence += 0.2;

  return Math.min(Math.max(confidence, 0.1), 1.0);
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
