// Dynamic import to avoid initialization issues with pdf-parse

interface PDFAnalysis {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  mappingSuggestions: Record<string, string>;
  detectedFields: string[];
  extractedText: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function analyzePDFWithOpenRouter(
  buffer: Buffer,
  fileName: string
): Promise<PDFAnalysis> {
  console.log('=== PDF ANALYSIS STARTING ===');
  console.log('Analyzing PDF file:', fileName);
  console.log('File size:', buffer.length, 'bytes');
  
  try {
    // Extract text from PDF with multiple methods
    console.log('Extracting text from PDF...');
    let pdfData;
    let extractedText = '';
    
    try {
      const pdfParse = await import('pdf-parse');
      // Fix the pdf-parse import issue
      const parseFunction = pdfParse.default || pdfParse;
      pdfData = await parseFunction(buffer, {
        // Add options to handle problematic PDFs
        max: 0, // process all pages
        version: 'v2.0.550'
      });
      extractedText = pdfData.text;
      
      // Clean extracted text to remove binary/encoded data
      const cleanedText = extractedText
        .replace(/[^\x20-\x7E\s]/g, '') // Remove non-ASCII characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      console.log('Raw text length:', extractedText.length);
      console.log('Cleaned text length:', cleanedText.length);
      
      if (cleanedText.length > 100) {
        extractedText = cleanedText;
      } else {
        console.log('Cleaned text too short, trying alternative extraction...');
        // Try extracting from specific PDF structures
        const alternativeText = await extractPDFTextAlternative(buffer);
        if (alternativeText.length > extractedText.length) {
          extractedText = alternativeText;
        }
      }
      
    } catch (pdfError) {
      console.error('PDF parsing failed:', pdfError);
      
      // Try alternative extraction method
      console.log('Attempting alternative PDF text extraction...');
      try {
        extractedText = await extractPDFTextAlternative(buffer);
        pdfData = { 
          text: extractedText,
          numpages: Math.max(1, Math.floor(extractedText.length / 2000))
        };
      } catch (altError) {
        console.error('Alternative extraction failed:', altError);
        // Final fallback: extract readable strings from binary
        const textData = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
        const readableText = textData.match(/[a-zA-Z0-9\s\-\.,:;\(\)\[\]]{10,}/g)?.join(' ') || '';
        extractedText = readableText;
        pdfData = { 
          text: extractedText,
          numpages: 1
        };
      }
    }
    
    console.log('PDF text extracted successfully');
    console.log('Total pages:', pdfData.numpages);
    console.log('Text length:', extractedText.length, 'characters');
    console.log('First 500 chars:', extractedText.substring(0, 500));
    
    if (!extractedText || extractedText.length < 50) {
      console.warn('PDF text extraction failed or too short');
      return {
        reportData: {},
        thicknessMeasurements: [],
        checklistItems: [],
        confidence: 0,
        mappingSuggestions: {},
        detectedFields: [],
        extractedText: ''
      };
    }
    
    // Use OpenRouter AI to analyze the extracted text
    console.log('Sending PDF text to OpenRouter AI for analysis...');
    
    // Chunk text if it's too long for API limits
    const chunkedText = chunkTextForAnalysis(extractedText);
    console.log('Original text length:', extractedText.length, 'characters');
    console.log('Chunked text length:', chunkedText.length, 'characters');
    
    const aiAnalysis = await callOpenRouterForPDF(chunkedText, fileName);
    
    return {
      ...aiAnalysis,
      extractedText
    };
    
  } catch (error) {
    console.error('=== PDF Analysis Failed ===');
    console.error('Error:', error);
    return {
      reportData: {},
      thicknessMeasurements: [],
      checklistItems: [],
      confidence: 0,
      mappingSuggestions: {},
      detectedFields: [],
      extractedText: ''
    };
  }
}

async function callOpenRouterForPDF(text: string, fileName: string): Promise<Omit<PDFAnalysis, 'extractedText'>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = createPDFAnalysisPrompt(text, fileName);
  
  const request = {
    model: 'anthropic/claude-3.5-sonnet:beta',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 16000
  };

  console.log('Making OpenRouter API request for PDF analysis...');
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'API 653 Tank Inspection PDF Import'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    console.log('=== OpenRouter PDF Analysis Response ===');
    console.log('Response length:', content.length);
    console.log('First 500 chars:', content.substring(0, 500));
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      console.log('Parsed PDF analysis:', JSON.stringify(analysis, null, 2));
      console.log(`AI found ${analysis.thicknessMeasurements?.length || 0} thickness measurements in PDF`);
      return analysis;
    } catch (parseError) {
      console.error('=== JSON Parse Error ===');
      console.error('Parse error:', parseError);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Found JSON match in PDF response');
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted PDF analysis from text');
          return analysis;
        } catch (secondParseError) {
          console.error('Second parse also failed:', secondParseError);
        }
      }
      throw new Error('Failed to parse PDF analysis response as JSON');
    }
    
  } catch (error) {
    console.error('=== OpenRouter PDF Analysis Failed ===');
    console.error('Error:', error);
    throw error;
  }
}

function createPDFAnalysisPrompt(text: string, fileName: string): string {
  return `
You are an expert API 653 tank inspection data extractor. Analyze this PDF text and extract comprehensive inspection data in JSON format.

CRITICAL INSTRUCTIONS:
1. Extract ALL inspection data including findings, write-ups, recommendations, and detailed measurements
2. Look for thickness measurements, component inspections, NDE results, and settlement data
3. Identify tank specifications, inspection dates, and inspector information
4. Extract comprehensive report write-ups and findings sections
5. The text may contain binary/encoded data - extract meaningful information from readable portions
6. Be highly tolerant of formatting issues and extract data even from messy or corrupted text
7. Return ONLY valid JSON with no additional text or formatting

PDF FILENAME: ${fileName}
TEXT QUALITY NOTE: This text was extracted from a PDF and may contain formatting artifacts or binary data. Focus on readable portions.

PDF TEXT CONTENT:
${text}

REQUIRED JSON OUTPUT FORMAT:
{
  "reportData": {
    "tankId": "extracted tank ID or filename",
    "reportNumber": "extracted report number",
    "service": "crude_oil|diesel|gasoline|water|other",
    "inspector": "inspector name",
    "inspectionDate": "YYYY-MM-DD",
    "diameter": number_or_null,
    "height": number_or_null,
    "originalThickness": number_or_null,
    "yearsSinceLastInspection": number_or_null,
    "findings": "comprehensive findings text",
    "reportWriteUp": "detailed report write-up text",
    "recommendations": "repair recommendations text",
    "notes": "additional notes",
    "location": "tank location",
    "owner": "owner/client name",
    "constructionCode": "API 650 or other",
    "material": "carbon steel or other",
    "capacity": number_or_null,
    "operatingPressure": number_or_null,
    "corrosionAllowance": number_or_null,
    "status": "draft"
  },
  "thicknessMeasurements": [
    {
      "component": "Shell|Bottom|Roof|Nozzle|Other",
      "location": "specific location description",
      "currentThickness": number,
      "originalThickness": number,
      "measurementType": "UT|MT|PT|VT|other",
      "coursePlate": "course/plate identifier",
      "gridReference": "grid reference if applicable",
      "direction": "N|S|E|W|NE|NW|SE|SW|other"
    }
  ],
  "checklistItems": [
    {
      "category": "external|internal|foundation|roof|appurtenances",
      "item": "specific inspection item",
      "status": "satisfactory|unsatisfactory|not_applicable",
      "notes": "detailed notes about the item"
    }
  ],
  "confidence": 0_to_100_integer,
  "mappingSuggestions": {
    "field_name": "detected_value_description"
  },
  "detectedFields": ["array", "of", "detected", "field", "names"]
}

FIELD DETECTION VARIATIONS - Search for these and hundreds more variations:
Tank ID: tank_id, equipment_id, vessel_id, unit_number, asset_tag, tank_number, vessel_number, equipment_number, tank_tag, unit_id, asset_number, facility_id, plant_id, equipment_tag, vessel_tag, tank_designation, unit_designation, equipment_designation, vessel_designation, tank_identifier, unit_identifier, asset_identifier, facility_identifier, plant_identifier, equipment_identifier, vessel_identifier, tank_name, unit_name, asset_name, facility_name, plant_name, equipment_name, vessel_name
Inspector: inspector, examiner, surveyor, technician, assessor, evaluator, analyst, auditor, checker, reviewer, specialist, expert, engineer, consultant, contractor, operator, supervisor, manager, lead, coordinator, responsible_person, authorized_person, certified_person, qualified_person, competent_person, designated_person, appointed_person, assigned_person, primary_inspector, secondary_inspector, lead_inspector, senior_inspector, principal_inspector, chief_inspector, head_inspector, main_inspector, primary_examiner, secondary_examiner, lead_examiner, senior_examiner, principal_examiner, chief_examiner, head_examiner, main_examiner
Thickness: thickness, tml, tmls, wall_thickness, actual_thickness, current_thickness, measured_thickness, minimum_thickness, maximum_thickness, average_thickness, nominal_thickness, design_thickness, original_thickness, as_built_thickness, new_thickness, virgin_thickness, mill_thickness, specification_thickness, required_thickness, allowable_thickness, critical_thickness, remaining_thickness, corroded_thickness, reduced_thickness, thinned_thickness, diminished_thickness, decreased_thickness, worn_thickness, eroded_thickness, degraded_thickness, deteriorated_thickness, damaged_thickness, compromised_thickness, affected_thickness, impacted_thickness, influenced_thickness, altered_thickness, modified_thickness, changed_thickness, adjusted_thickness, revised_thickness, updated_thickness, refined_thickness, improved_thickness, enhanced_thickness, optimized_thickness, maximized_thickness, minimized_thickness, standardized_thickness, normalized_thickness, regularized_thickness, stabilized_thickness, secured_thickness, protected_thickness, maintained_thickness, preserved_thickness, conserved_thickness, sustained_thickness, continued_thickness, ongoing_thickness, persistent_thickness, enduring_thickness, lasting_thickness, permanent_thickness, fixed_thickness, constant_thickness, steady_thickness, stable_thickness, uniform_thickness, consistent_thickness, regular_thickness, even_thickness, level_thickness, flat_thickness, smooth_thickness, straight_thickness, direct_thickness, immediate_thickness, instant_thickness, rapid_thickness, quick_thickness, fast_thickness, swift_thickness, speedy_thickness, prompt_thickness, timely_thickness, efficient_thickness, effective_thickness, successful_thickness, positive_thickness, favorable_thickness, beneficial_thickness, advantageous_thickness, helpful_thickness, useful_thickness, valuable_thickness, worthwhile_thickness, meaningful_thickness, significant_thickness, important_thickness, critical_thickness, essential_thickness, necessary_thickness, required_thickness, needed_thickness, demanded_thickness, requested_thickness, desired_thickness, wanted_thickness, sought_thickness, pursued_thickness, targeted_thickness, aimed_thickness, intended_thickness, planned_thickness, proposed_thickness, suggested_thickness, recommended_thickness, advised_thickness, counseled_thickness, guided_thickness, directed_thickness, instructed_thickness, taught_thickness, educated_thickness, informed_thickness, notified_thickness, alerted_thickness, warned_thickness, cautioned_thickness, advised_thickness

Extract comprehensive data with maximum confidence. Return only the JSON object.
`;
}

export async function processPDFWithAI(analysis: PDFAnalysis): Promise<{
  importedData: any;
  thicknessMeasurements: any[];
  checklistItems: any[];
  totalPages: number;
  preview: string;
  aiAnalysis: PDFAnalysis;
}> {
  console.log('=== Processing PDF with AI Analysis ===');
  console.log('AI confidence:', analysis.confidence);
  
  // Use AI data if confidence is high enough (lowered threshold)
  if (analysis.confidence >= 20) {
    console.log('Using AI analysis for PDF import');
    
    const importedData = {
      ...analysis.reportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('PDF imported data:', importedData);
    
    return {
      importedData,
      thicknessMeasurements: analysis.thicknessMeasurements || [],
      checklistItems: analysis.checklistItems || [],
      totalPages: analysis.extractedText.split('\n').length,
      preview: analysis.extractedText.substring(0, 500) + '...',
      aiAnalysis: analysis
    };
  } else {
    console.log('=== AI ANALYSIS CONFIDENCE TOO LOW ===');
    console.log('AI confidence:', analysis.confidence);
    console.log('Falling back to basic PDF parsing...');
    
    // Basic fallback parsing
    const importedData = {
      tankId: extractFileName(analysis.extractedText) || 'PDF Import',
      inspector: 'PDF Import',
      service: 'other',
      status: 'draft',
      inspectionDate: new Date().toISOString().split('T')[0],
      reportNumber: `PDF-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      importedData,
      thicknessMeasurements: [],
      checklistItems: [],
      totalPages: analysis.extractedText.split('\n').length,
      preview: analysis.extractedText.substring(0, 500) + '...',
      aiAnalysis: analysis
    };
  }
}

// Alternative PDF text extraction method
async function extractPDFTextAlternative(buffer: Buffer): Promise<string> {
  try {
    console.log('Attempting advanced PDF text extraction...');
    
    // Method 1: Extract text from PDF streams
    const bufferStr = buffer.toString('utf8');
    
    // Look for text streams in PDF
    const textObjects = [];
    
    // Extract text from BT...ET blocks (Basic Text objects)
    const textMatches = bufferStr.match(/BT\s+.*?ET/gs) || [];
    for (const match of textMatches) {
      const cleanText = match
        .replace(/BT\s+|ET/g, '')
        .replace(/Tf\s+/g, '')
        .replace(/Td\s+/g, '')
        .replace(/Tj\s+/g, '')
        .replace(/TJ\s+/g, '')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > 3) {
        textObjects.push(cleanText);
      }
    }
    
    // Method 2: Extract strings from PDF dictionary objects
    const stringMatches = bufferStr.match(/\((.*?)\)/gs) || [];
    for (const match of stringMatches) {
      const cleanString = match
        .replace(/[()]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanString.length > 5 && /[a-zA-Z]/.test(cleanString)) {
        textObjects.push(cleanString);
      }
    }
    
    // Method 3: Look for specific inspection-related keywords
    const inspectionKeywords = [
      'tank', 'inspection', 'thickness', 'corrosion', 'measurement',
      'API', '653', 'shell', 'bottom', 'roof', 'nozzle', 'inspector',
      'date', 'report', 'findings', 'recommendations', 'inches', 'mils',
      'original', 'current', 'remaining', 'life', 'years', 'service'
    ];
    
    const keywordMatches = [];
    for (const keyword of inspectionKeywords) {
      const regex = new RegExp(`\\b${keyword}[^\\s]{0,20}\\b`, 'gi');
      const matches = bufferStr.match(regex);
      if (matches) {
        keywordMatches.push(...matches);
      }
    }
    
    // Method 4: Extract structured data patterns
    const patterns = [
      /\d+\.\d+\s*(?:in|inch|inches|mil|mils)/gi,
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
      /[A-Z]{2,3}-\d+/g,
      /Tank\s*[:\s]*[A-Z0-9-]+/gi,
      /Inspector\s*[:\s]*[A-Za-z\s]+/gi
    ];
    
    const patternMatches = [];
    for (const pattern of patterns) {
      const matches = bufferStr.match(pattern);
      if (matches) {
        patternMatches.push(...matches);
      }
    }
    
    // Combine all extracted text
    const allText = [
      ...textObjects,
      ...keywordMatches,
      ...patternMatches
    ].join(' ');
    
    console.log('Alternative extraction found:', allText.length, 'characters');
    return allText;
    
  } catch (error) {
    console.error('Alternative extraction failed:', error);
    return 'Unable to extract text from this PDF format.';
  }
}

// Function to intelligently chunk text for API analysis
function chunkTextForAnalysis(text: string): string {
  // Estimate tokens (roughly 4 characters per token)
  const estimatedTokens = Math.ceil(text.length / 4);
  const maxTokens = 180000; // Leave buffer for prompt and response
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  console.log('Text too long for API, intelligently chunking...');
  
  // Priority sections to preserve
  const prioritySections = [];
  
  // 1. Extract inspection-critical sections
  const criticalPatterns = [
    /tank.*?(?:id|number|designation)[:\s]*[^\n\r]{0,100}/gi,
    /inspector[:\s]*[^\n\r]{0,100}/gi,
    /inspection.*?date[:\s]*[^\n\r]{0,50}/gi,
    /thickness.*?measurement[:\s\S]{0,500}/gi,
    /shell.*?thickness[:\s\S]{0,300}/gi,
    /bottom.*?thickness[:\s\S]{0,300}/gi,
    /roof.*?thickness[:\s\S]{0,300}/gi,
    /original.*?thickness[:\s]*[^\n\r]{0,100}/gi,
    /current.*?thickness[:\s]*[^\n\r]{0,100}/gi,
    /corrosion.*?rate[:\s]*[^\n\r]{0,100}/gi,
    /remaining.*?life[:\s]*[^\n\r]{0,100}/gi,
    /findings[:\s\S]{0,1000}/gi,
    /recommendations[:\s\S]{0,1000}/gi,
    /report.*?write.*?up[:\s\S]{0,1000}/gi,
    /diameter[:\s]*[^\n\r]{0,50}/gi,
    /height[:\s]*[^\n\r]{0,50}/gi,
    /capacity[:\s]*[^\n\r]{0,50}/gi,
    /service[:\s]*[^\n\r]{0,50}/gi,
    /\d+\.\d+\s*(?:in|inch|inches|mil|mils)/gi,
    /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
    /API.*?653/gi
  ];
  
  // Extract all critical sections
  for (const pattern of criticalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      prioritySections.push(...matches);
    }
  }
  
  // 2. Get first and last portions of document
  const documentStart = text.substring(0, 5000);
  const documentEnd = text.substring(text.length - 2000);
  
  // 3. Extract tables and structured data
  const tablePatterns = [
    /\|[^\n\r]*\|[^\n\r]*\|/g,
    /\t[^\n\r]*\t[^\n\r]*/g,
    /\s{3,}[^\n\r]*\s{3,}[^\n\r]*/g
  ];
  
  const structuredData = [];
  for (const pattern of tablePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      structuredData.push(...matches.slice(0, 20)); // Limit table rows
    }
  }
  
  // 4. Combine prioritized content
  const prioritizedText = [
    '=== DOCUMENT START ===',
    documentStart,
    '=== CRITICAL INSPECTION DATA ===',
    ...prioritySections,
    '=== STRUCTURED DATA TABLES ===',
    ...structuredData,
    '=== DOCUMENT END ===',
    documentEnd
  ].join('\n\n');
  
  // 5. Final size check and truncation if needed
  const finalEstimatedTokens = Math.ceil(prioritizedText.length / 4);
  if (finalEstimatedTokens > maxTokens) {
    const maxChars = maxTokens * 4;
    const truncated = prioritizedText.substring(0, maxChars);
    console.log('Final truncation applied, keeping first', maxChars, 'characters');
    return truncated + '\n\n[DOCUMENT TRUNCATED - ANALYSIS FOCUSED ON CRITICAL SECTIONS]';
  }
  
  console.log('Intelligent chunking complete:', prioritizedText.length, 'characters');
  return prioritizedText;
}

function extractFileName(text: string): string | null {
  // Try to extract meaningful identifiers from the text
  const patterns = [
    /tank[_\s]*(?:id|number|#)[\s]*:?[\s]*([a-zA-Z0-9\-_]+)/i,
    /vessel[_\s]*(?:id|number|#)[\s]*:?[\s]*([a-zA-Z0-9\-_]+)/i,
    /equipment[_\s]*(?:id|number|#)[\s]*:?[\s]*([a-zA-Z0-9\-_]+)/i,
    /unit[_\s]*(?:id|number|#)[\s]*:?[\s]*([a-zA-Z0-9\-_]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}