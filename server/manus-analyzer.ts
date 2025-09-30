// Working Manus AI Document Analyzer
// Tank inspection data extraction using Manus AI API with proper polling

import * as XLSX from 'xlsx';

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
  mode: 'fast' | 'quality';
  hide_in_task_list?: boolean;
  create_shareable_link?: boolean;
}

const MANUS_API_URL = "https://api.manus.ai/v1/tasks";

export async function analyzeDocumentWithManus(
  content: string,
  filename: string,
  documentType: "excel" | "pdf" = "pdf"
): Promise<ManusAnalysisResponse> {
  console.log("🚀 === MANUS AI ANALYSIS STARTING ===");
  console.log(`📄 Document: ${filename}, Type: ${documentType}`);

  if (!process.env.MANUS_API_KEY) {
    console.error("❌ Manus API key not configured");
    throw new Error('Manus AI integration requires API key configuration');
  }

  console.log(`🔑 API Key configured: Yes`);

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
   - Customer/Owner by name
   - Location/Facility by name
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
  "location": "extracted location/facility name",
  "service": "extracted service/product",
  "inspector": "extracted inspector name",
  "inspectionDate": "YYYY-MM-DD",
  "api653Cert": "extracted certification number",
  "employer": "extracted company name",
  "diameter": "extracted diameter with units",
  "height": "extracted height with units",
  "capacity": "extracted capacity with units",
  "constructionMaterial": "extracted materials",
  "nextExternalDate": "YYYY-MM-DD",
  "nextInternalDate": "YYYY-MM-DD",
  "nextUTDate": "YYYY-MM-DD",
  "thicknessMeasurements": [
    {
      "component": "shell course 1",
      "location": "position 1",
      "currentThickness": 0.500,
      "originalThickness": 0.250,
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

    console.log("📝 Creating Manus task...");

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
      console.error("❌ Manus API error response:", response.status, errorText);
      throw new Error(`Manus API error: ${response.status} - ${errorText}`);
    }

    const taskResult = (await response.json()) as any;
    console.log("✅ Task created:", taskResult.task_id);
    console.log("📊 Task URL:", taskResult.task_url);

    // Poll for completion with proper awaiting
    console.log("🔄 Starting to poll for task completion...");
    const completedResult = await pollForTaskCompletion(
      taskResult.task_id,
      taskResult.task_url,
    );

    // Process the actual results
    return processManusResults(completedResult, filename, documentType);
  } catch (error: any) {
    console.error("❌ Manus AI analysis failed:", error);
    throw new Error(
      `Manus AI analysis failed: ${error.message || "Unknown error"}`,
    );
  }
}

async function pollForTaskCompletion(
  taskId: string,
  taskUrl: string,
  maxAttempts: number = 24,
): Promise<any> {
  console.log("🔄 Starting to poll task", taskId, "...");

  const endpoints = [
    `${MANUS_API_URL}/${taskId}/result`,
    `${MANUS_API_URL}/${taskId}/status`,
    taskUrl,
    `https://api.manus.ai/v1/tasks/${taskId}/result`,
  ];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);

      for (const endpoint of endpoints) {
        try {
          console.log(`🌐 Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.MANUS_API_KEY}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log("📡 Success with endpoint:", endpoint);
            console.log("📊 Task result:", JSON.stringify(result, null, 2));

            // Check if task is completed
            if (
              result.status === "completed" ||
              result.result ||
              result.output
            ) {
              console.log("🎉 === TASK COMPLETED ===");
              return result;
            } else if (result.status === "failed") {
              throw new Error(
                `Task failed: ${result.error || "Unknown error"}`,
              );
            } else {
              console.log("⏳ Task status:", result.status || "running");
              break; // Try next polling attempt
            }
          } else {
            console.log("❌ Endpoint", endpoint, "returned:", response.status);
          }
        } catch (endpointError: any) {
          console.log("❌ Endpoint", endpoint, "failed:", endpointError.message);
          continue; // Try next endpoint
        }
      }

      // Wait before next attempt
      const waitTime = Math.min(3000 + attempt * 1000, 10000); // 3-10 seconds
      console.log(`⏳ Waiting ${waitTime/1000} seconds before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } catch (error: any) {
      console.error("❌ Polling attempt", attempt, "failed:", error.message);
    }
  }

  throw new Error("❌ Task polling timed out after maximum attempts");
}

function processManusResults(completedResult: any, filename: string, documentType: string): ManusAnalysisResponse {
  console.log("🔄 Processing Manus results...");
  
  try {
    // Try to extract the actual result data
    let extractedData: any = {};
    
    // Try different possible result fields
    const resultData = completedResult.result || completedResult.output || completedResult.response || completedResult;
    
    if (typeof resultData === 'string') {
      try {
        extractedData = JSON.parse(resultData);
        console.log("✅ Parsed JSON result:", extractedData);
      } catch (e) {
        console.log("⚠️ Result is text, not JSON:", resultData.substring(0, 200));
        extractedData = { extractedText: resultData };
      }
    } else if (typeof resultData === 'object') {
      extractedData = resultData;
      console.log("✅ Got object result:", Object.keys(extractedData));
    }

    // Map the extracted data to our response format
    const response: ManusAnalysisResponse = {
      rawData: {
        tankId: extractedData.tankId || extractedData.tank_id || "Unknown",
        customer: extractedData.customer || extractedData.owner || "Not found",
        location: extractedData.location || extractedData.facility || "Not found",
        service: extractedData.service || extractedData.product || "Not found",
        inspector: extractedData.inspector || extractedData.inspector_name || "Not found",
        inspectionDate: extractedData.inspectionDate || extractedData.inspection_date || new Date().toISOString().split('T')[0],
        reportNumber: extractedData.reportNumber || extractedData.report_number || "Not found",
        api653Cert: extractedData.api653Cert || extractedData.certification || "Not found",
        employer: extractedData.employer || extractedData.company || "Not found",
        diameter: extractedData.diameter || "Not found",
        height: extractedData.height || "Not found",
        capacity: extractedData.capacity || "Not found",
        nextExternalDate: extractedData.nextExternalDate || "Not found",
        nextInternalDate: extractedData.nextInternalDate || "Not found",
        nextUTDate: extractedData.nextUTDate || "Not found"
      },
      thicknessMeasurements: extractedData.thicknessMeasurements || [],
      confidence: extractedData.extractedData ? 85 : 60,
      completionStatus: {
        status: "completed",
        timestamp: new Date().toISOString()
      },
      samplingInspections: {},
      detectedFields: Object.keys(extractedData).filter(key => extractedData[key] && extractedData[key] !== "Not found"),
      extractedText: extractedData.extractedText || JSON.stringify(extractedData),
      sections: {},
      extractionDetails: {
        tableFound: Array.isArray(extractedData.thicknessMeasurements) && extractedData.thicknessMeasurements.length > 0,
        patternsMatched: {},
        detectedFields: Object.keys(extractedData),
        warnings: [],
        successfulExtractions: Object.keys(extractedData).filter(key => extractedData[key] && extractedData[key] !== "Not found"),
        failedExtractions: Object.keys(extractedData).filter(key => !extractedData[key] || extractedData[key] === "Not found")
      }
    };

    console.log("✅ Processed results:");
    console.log("📊 Tank ID:", response.rawData.tankId);
    console.log("👤 Inspector:", response.rawData.inspector);
    console.log("🏢 Customer:", response.rawData.customer);
    console.log("📍 Location:", response.rawData.location);
    console.log("🔧 Service:", response.rawData.service);
    console.log("📏 Thickness measurements:", response.thicknessMeasurements.length);
    console.log("🎯 Confidence:", response.confidence + "%");

    return response;
  } catch (error: any) {
    console.error("❌ Error processing Manus results:", error);
    
    // Return a basic response with error info
    return {
      rawData: {
        tankId: "Processing Error",
        customer: "Processing Error",
        location: "Processing Error",
        service: "Processing Error",
        inspector: "Processing Error",
        inspectionDate: new Date().toISOString().split('T')[0],
        reportNumber: "Processing Error",
        api653Cert: "Processing Error",
        employer: "Processing Error",
        diameter: "Processing Error",
        height: "Processing Error",
        capacity: "Processing Error",
        nextExternalDate: "Processing Error",
        nextInternalDate: "Processing Error",
        nextUTDate: "Processing Error"
      },
      thicknessMeasurements: [],
      confidence: 0,
      completionStatus: { status: "error", error: error.message },
      samplingInspections: {},
      detectedFields: [],
      extractedText: `Error processing results: ${error.message}`,
      sections: {},
      extractionDetails: {
        tableFound: false,
        patternsMatched: {},
        detectedFields: [],
        warnings: [`Processing error: ${error.message}`],
        successfulExtractions: [],
        failedExtractions: ["all"]
      }
    };
  }
}

// Export functions for compatibility
export async function analyzePDFWithManus(pdfData: any, filename: string): Promise<ManusAnalysisResponse> {
  return analyzeDocumentWithManus(pdfData, filename, "pdf");
}

export async function analyzeExcelWithManus(excelData: any, filename: string): Promise<ManusAnalysisResponse> {
  return analyzeDocumentWithManus(excelData, filename, "excel");
}
