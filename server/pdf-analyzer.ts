// Enhanced PDF analyzer for API 653 tank inspection reports

interface PDFAnalysis {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  mappingSuggestions: Record<string, string>;
  detectedFields: string[];
  extractedText: string;
  sections?: Record<string, string>;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// API 653 specific patterns and keywords
const API653_PATTERNS = {
  tankId: [
    /tank[\s_-]*(?:id|number|no|num|#)[\s:]*([A-Z0-9\-_]+)/gi,
    /equipment[\s_-]*(?:id|number|tag)[\s:]*([A-Z0-9\-_]+)/gi,
    /vessel[\s_-]*(?:id|number)[\s:]*([A-Z0-9\-_]+)/gi,
    /asset[\s_-]*(?:id|number|tag)[\s:]*([A-Z0-9\-_]+)/gi,
    /unit[\s_-]*(?:id|number)[\s:]*([A-Z0-9\-_]+)/gi
  ],
  thickness: [
    /(\d+\.?\d*)\s*(?:in|inch|inches|")/gi,
    /(\d+\.?\d*)\s*(?:mil|mils)/gi,
    /(\d+\.?\d*)\s*mm/gi,
    /thickness[\s:]*(\d+\.?\d*)/gi,
    /tml[\s:]*(\d+\.?\d*)/gi
  ],
  date: [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi
  ],
  inspector: [
    /inspector[\s:]*([A-Za-z\s\.]+?)(?:\n|$|,)/gi,
    /examiner[\s:]*([A-Za-z\s\.]+?)(?:\n|$|,)/gi,
    /certified[\s]*by[\s:]*([A-Za-z\s\.]+?)(?:\n|$|,)/gi,
    /api[\s]*653[\s]*inspector[\s:]*([A-Za-z\s\.]+?)(?:\n|$|,)/gi
  ],
  service: [
    /service[\s:]*([A-Za-z\s]+?)(?:\n|$|,)/gi,
    /product[\s:]*([A-Za-z\s]+?)(?:\n|$|,)/gi,
    /contents[\s:]*([A-Za-z\s]+?)(?:\n|$|,)/gi,
    /stored[\s]*material[\s:]*([A-Za-z\s]+?)(?:\n|$|,)/gi
  ]
};

// Standard API 653 report sections
const REPORT_SECTIONS = [
  'Executive Summary',
  'Tank Information',
  'Tank Details',
  'Inspection Summary',
  'Thickness Measurements',
  'Shell Thickness',
  'Bottom Thickness',
  'Roof Thickness',
  'Nozzle Inspection',
  'Settlement Survey',
  'Inspection Findings',
  'Recommendations',
  'Repair Requirements',
  'Appendix',
  'Attachments',
  'Test Results',
  'NDE Results',
  'Visual Inspection',
  'Corrosion Assessment',
  'Remaining Life Calculations'
];

export async function analyzePDFWithOpenRouter(
  buffer: Buffer,
  fileName: string
): Promise<PDFAnalysis> {
  console.log('=== ENHANCED PDF ANALYSIS STARTING ===');
  console.log('Analyzing PDF file:', fileName);
  console.log('File size:', buffer.length, 'bytes');
  
  try {
    // Extract text from PDF with multiple enhanced methods
    const extractedText = await extractPDFTextEnhanced(buffer);
    
    if (!extractedText || extractedText.length < 50) {
      console.warn('PDF text extraction failed or too short');
      return createEmptyAnalysis();
    }
    
    // Identify report sections
    const sections = identifyReportSections(extractedText);
    console.log('Identified sections:', Object.keys(sections));
    
    // Extract structured data using patterns
    const structuredData = extractStructuredData(extractedText);
    console.log('Extracted structured data:', structuredData);
    
    // Use OpenRouter AI for comprehensive analysis
    const aiAnalysis = await callOpenRouterForPDF(extractedText, fileName, structuredData, sections);
    
    // Enhance AI results with pattern-based extraction
    const enhancedAnalysis = enhanceWithPatternExtraction(aiAnalysis, extractedText, structuredData);
    
    return {
      ...enhancedAnalysis,
      extractedText,
      sections
    };
    
  } catch (error) {
    console.error('=== PDF Analysis Failed ===');
    console.error('Error:', error);
    return createEmptyAnalysis();
  }
}

async function extractPDFTextEnhanced(buffer: Buffer): Promise<string> {
  console.log('Starting enhanced PDF text extraction...');
  let extractedText = '';
  
  try {
    // Primary method: pdf-parse
    const pdfParse = await import('pdf-parse');
    const parseFunction = pdfParse.default || pdfParse;
    const pdfData = await parseFunction(buffer, {
      max: 0, // process all pages
      version: 'v2.0.550'
    });
    
    extractedText = pdfData.text;
    console.log('Primary extraction successful, length:', extractedText.length);
    
  } catch (primaryError) {
    console.error('Primary PDF parsing failed:', primaryError);
  }
  
  // If primary extraction failed or gave poor results, try advanced methods
  if (extractedText.length < 500) {
    console.log('Primary extraction insufficient, trying advanced methods...');
    const advancedText = await extractPDFTextAdvanced(buffer);
    if (advancedText.length > extractedText.length) {
      extractedText = advancedText;
    }
  }
  
  // Clean and normalize the text
  extractedText = cleanPDFText(extractedText);
  
  // Extract tables separately
  const tableText = extractTablesFromPDF(extractedText);
  if (tableText) {
    extractedText += '\n\n=== EXTRACTED TABLES ===\n' + tableText;
  }
  
  console.log('Final extracted text length:', extractedText.length);
  console.log('First 500 chars:', extractedText.substring(0, 500));
  
  return extractedText;
}

async function extractPDFTextAdvanced(buffer: Buffer): Promise<string> {
  console.log('Attempting advanced PDF text extraction...');
  const textParts: string[] = [];
  
  try {
    const bufferStr = buffer.toString('utf8', 0, Math.min(buffer.length, 500000));
    
    // Method 1: Extract text from BT...ET blocks
    const btEtMatches = bufferStr.match(/BT[\s\S]*?ET/g) || [];
    for (const match of btEtMatches) {
      const cleaned = cleanTextBlock(match);
      if (cleaned.length > 5) {
        textParts.push(cleaned);
      }
    }
    
    // Method 2: Extract strings from PDF objects
    const stringMatches = bufferStr.match(/\(([^)]{2,500})\)/g) || [];
    for (const match of stringMatches) {
      const cleaned = match.slice(1, -1).trim();
      if (cleaned.length > 5 && /[a-zA-Z]/.test(cleaned)) {
        textParts.push(cleaned);
      }
    }
    
    // Method 3: Extract hex strings
    const hexMatches = bufferStr.match(/<([0-9A-Fa-f\s]+)>/g) || [];
    for (const match of hexMatches) {
      try {
        const hex = match.slice(1, -1).replace(/\s/g, '');
        const text = Buffer.from(hex, 'hex').toString('utf8');
        const cleaned = cleanTextBlock(text);
        if (cleaned.length > 5) {
          textParts.push(cleaned);
        }
      } catch (e) {
        // Skip invalid hex strings
      }
    }
    
    // Method 4: Look for inspection-specific data patterns
    const patterns = [
      /\d+\.\d{3,4}/g, // Thickness values
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, // Dates
      /API[\s]*653/gi, // API standard references
      /Tank[\s]*[#\d\w\-]+/gi, // Tank identifiers
      /Course[\s]*\d+/gi, // Shell courses
      /\d+[\s]*(?:in|inch|inches|mil|mils|mm)/gi, // Measurements
      /(?:North|South|East|West|N|S|E|W|NE|NW|SE|SW)/gi, // Directions
      /(?:Shell|Bottom|Roof|Nozzle|Manway)/gi, // Components
      /(?:UT|MT|PT|VT|RT)/g, // NDE methods
      /\d+\.\d+[\s]*(?:years|yrs)/gi // Time periods
    ];
    
    for (const pattern of patterns) {
      const matches = bufferStr.match(pattern);
      if (matches) {
        textParts.push(...matches);
      }
    }
    
  } catch (error) {
    console.error('Advanced extraction error:', error);
  }
  
  // Combine and deduplicate
  const uniqueText = [...new Set(textParts)].join(' ');
  console.log('Advanced extraction found:', uniqueText.length, 'characters');
  
  return uniqueText;
}

function cleanTextBlock(text: string): string {
  return text
    .replace(/BT\s*|ET\s*/g, '')
    .replace(/\d+\s+\d+\s+Td/g, ' ')
    .replace(/\[\s*\([^)]*\)\s*\]\s*TJ/g, ' ')
    .replace(/Tf\s*/g, '')
    .replace(/Tc\s*/g, '')
    .replace(/Tw\s*/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPDFText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ') // Convert tabs to spaces
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .replace(/\s{3,}/g, '  ') // Limit consecutive spaces
    .trim();
}

function extractTablesFromPDF(text: string): string {
  const tables: string[] = [];
  
  // Look for table-like structures
  const lines = text.split('\n');
  let inTable = false;
  let currentTable: string[] = [];
  
  for (const line of lines) {
    // Check if line looks like table data (has multiple columns)
    const hasMultipleColumns = 
      (line.split(/\s{2,}/).length >= 3) ||
      (line.split('\t').length >= 3) ||
      (line.split('|').length >= 3);
    
    // Check if line contains numeric data (common in thickness tables)
    const hasNumericData = /\d+\.\d+/.test(line);
    
    if (hasMultipleColumns || (inTable && hasNumericData)) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(line);
    } else if (inTable && currentTable.length > 2) {
      // End of table
      tables.push(currentTable.join('\n'));
      inTable = false;
      currentTable = [];
    }
  }
  
  // Don't forget the last table if still in one
  if (inTable && currentTable.length > 2) {
    tables.push(currentTable.join('\n'));
  }
  
  console.log(`Found ${tables.length} potential tables`);
  return tables.join('\n\n--- TABLE ---\n\n');
}

function identifyReportSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line matches a section header
    for (const section of REPORT_SECTIONS) {
      const pattern = new RegExp(`^\\s*(?:\\d+\\.?\\s*)?${section}`, 'i');
      if (pattern.test(line)) {
        // Extract content until next section
        let content = '';
        for (let j = i + 1; j < lines.length && j < i + 100; j++) {
          const nextLine = lines[j].trim();
          
          // Check if we've hit another section
          let isNextSection = false;
          for (const nextSection of REPORT_SECTIONS) {
            if (new RegExp(`^\\s*(?:\\d+\\.?\\s*)?${nextSection}`, 'i').test(nextLine)) {
              isNextSection = true;
              break;
            }
          }
          
          if (isNextSection) {
            break;
          }
          
          content += nextLine + '\n';
        }
        
        sections[section] = content.trim();
        console.log(`Found section: ${section} (${content.length} chars)`);
      }
    }
  }
  
  return sections;
}

function extractStructuredData(text: string): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Extract using API653 patterns
  for (const [field, patterns] of Object.entries(API653_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        if (field === 'thickness') {
          // Collect all thickness values
          if (!data.thicknessValues) data.thicknessValues = [];
          data.thicknessValues.push(...matches.map(m => {
            const value = parseFloat(m.match(/\d+\.?\d*/)?.[0] || '0');
            const unit = m.match(/(in|inch|inches|mil|mils|mm|")/i)?.[0] || 'in';
            return { value, unit, raw: m };
          }));
        } else {
          // Store first match for other fields
          data[field] = matches[1] || matches[0];
          break;
        }
      }
    }
  }
  
  // Extract dimensions
  const diameterMatch = text.match(/diameter[\s:]*(\d+\.?\d*)\s*(?:ft|feet|m|meters)?/i);
  if (diameterMatch) {
    data.diameter = parseFloat(diameterMatch[1]);
  }
  
  const heightMatch = text.match(/height[\s:]*(\d+\.?\d*)\s*(?:ft|feet|m|meters)?/i);
  if (heightMatch) {
    data.height = parseFloat(heightMatch[1]);
  }
  
  // Extract corrosion rate
  const corrosionMatch = text.match(/corrosion[\s]*rate[\s:]*(\d+\.?\d*)\s*(?:mpy|mil\/year|mm\/year)?/i);
  if (corrosionMatch) {
    data.corrosionRate = parseFloat(corrosionMatch[1]);
  }
  
  // Extract remaining life
  const remainingLifeMatch = text.match(/remaining[\s]*life[\s:]*(\d+\.?\d*)\s*(?:years|yrs|year|yr)?/i);
  if (remainingLifeMatch) {
    data.remainingLife = parseFloat(remainingLifeMatch[1]);
  }
  
  return data;
}

async function callOpenRouterForPDF(
  text: string, 
  fileName: string, 
  structuredData: Record<string, any>,
  sections: Record<string, string>
): Promise<Omit<PDFAnalysis, 'extractedText'>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OpenRouter API key not configured, using pattern-based extraction only');
    return createPatternBasedAnalysis(text, structuredData, sections);
  }

  const prompt = createEnhancedPDFAnalysisPrompt(text, fileName, structuredData, sections);
  
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
      // Fall back to pattern-based extraction
      return createPatternBasedAnalysis(text, structuredData, sections);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('No content in OpenRouter response, using pattern-based extraction');
      return createPatternBasedAnalysis(text, structuredData, sections);
    }

    console.log('=== OpenRouter PDF Analysis Response ===');
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      console.log(`AI found ${analysis.thicknessMeasurements?.length || 0} thickness measurements`);
      console.log(`AI confidence: ${analysis.confidence}%`);
      return analysis;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted PDF analysis from text');
          return analysis;
        } catch (secondParseError) {
          console.error('Second parse failed, using pattern-based extraction');
          return createPatternBasedAnalysis(text, structuredData, sections);
        }
      }
      
      return createPatternBasedAnalysis(text, structuredData, sections);
    }
    
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    return createPatternBasedAnalysis(text, structuredData, sections);
  }
}

function createEnhancedPDFAnalysisPrompt(
  text: string, 
  fileName: string, 
  structuredData: Record<string, any>,
  sections: Record<string, string>
): string {
  // Intelligently chunk text to fit within token limits
  const chunkedText = chunkTextForAnalysis(text, sections);
  
  return `You are an expert API 653 tank inspection specialist analyzing a PDF inspection report. Extract ALL relevant data with high accuracy.

FILENAME: ${fileName}

ALREADY EXTRACTED DATA (use these as hints):
${JSON.stringify(structuredData, null, 2)}

IDENTIFIED SECTIONS:
${Object.keys(sections).join(', ')}

PDF TEXT CONTENT:
${chunkedText}

CRITICAL EXTRACTION REQUIREMENTS:

1. THICKNESS MEASUREMENTS (HIGHEST PRIORITY):
   - Extract ALL thickness readings (shell, bottom, roof, nozzles)
   - Look for patterns like: 0.375", 0.250 in, 375 mils, 9.5mm
   - Include location info: Course 1, Course 2, N, S, E, W, 0°, 90°, 180°, 270°
   - Grid references for bottom: A1, A2, B1, B2, etc.
   - Original/nominal thickness vs current/measured thickness
   - Convert mils to inches (divide by 1000), mm to inches (divide by 25.4)

2. TANK IDENTIFICATION:
   Search all variations: Tank #, Tank No., Tank ID, Equipment ID, Asset Tag, Unit Number, Vessel ID, Equipment Tag, Facility ID, Tank Designation, Tank Name
   
3. INSPECTION DETAILS:
   - Inspector name (API 653 certified inspector, examiner, surveyor)
   - Inspection date (any date format)
   - Report number/ID
   - Inspection type (internal, external, comprehensive, routine)
   
4. TANK SPECIFICATIONS:
   - Diameter (feet or meters)
   - Height (feet or meters)  
   - Capacity (gallons, barrels, liters)
   - Service/Product (crude oil, diesel, gasoline, water, chemical)
   - Material (carbon steel, stainless steel)
   - Construction code (API 650, API 620, ASME)
   - Original/design thickness

5. CORROSION DATA:
   - Corrosion rate (mpy, mm/year)
   - Remaining life (years)
   - Next inspection date
   - Minimum required thickness
   
6. FINDINGS & RECOMMENDATIONS:
   - Extract full text of findings section
   - Repair recommendations
   - Priority levels
   - Follow-up actions

7. SETTLEMENT DATA:
   - Settlement measurements around tank
   - Maximum settlement values
   - Differential settlement
   - Tilt/inclination

8. CHECKLIST ITEMS:
   - External inspection items
   - Internal inspection items
   - Foundation condition
   - Roof condition
   - Appurtenances status

OUTPUT FORMAT (JSON only, no other text):
{
  "reportData": {
    "tankId": "string",
    "reportNumber": "string", 
    "service": "crude_oil|diesel|gasoline|water|chemical|other",
    "inspector": "string",
    "inspectionDate": "YYYY-MM-DD",
    "diameter": number_in_feet,
    "height": number_in_feet,
    "capacity": number,
    "originalThickness": number_in_inches,
    "material": "string",
    "constructionCode": "string",
    "corrosionRate": number_mpy,
    "remainingLife": number_years,
    "nextInspectionDate": "YYYY-MM-DD",
    "findings": "comprehensive findings text",
    "recommendations": "repair recommendations text",
    "status": "draft"
  },
  "thicknessMeasurements": [
    {
      "component": "Shell|Bottom|Roof|Nozzle|Manway",
      "location": "specific location (Course 1 North, Bottom A1, etc)",
      "currentThickness": number_in_inches,
      "originalThickness": number_in_inches,
      "measurementType": "UT|MT|PT|VT|RT",
      "coursePlate": "identifier",
      "gridReference": "grid ref if applicable",
      "direction": "N|S|E|W|NE|NW|SE|SW|0|45|90|135|180|225|270|315",
      "elevation": number_if_available,
      "corrosionRate": number_if_calculated,
      "remainingLife": number_if_calculated
    }
  ],
  "checklistItems": [
    {
      "category": "external|internal|foundation|roof|appurtenances",
      "item": "specific inspection item",
      "status": "satisfactory|unsatisfactory|not_applicable|needs_repair",
      "notes": "detailed notes"
    }
  ],
  "confidence": 0_to_100,
  "mappingSuggestions": {
    "field_name": "how_it_was_identified"
  },
  "detectedFields": ["list", "of", "detected", "fields"]
}

IMPORTANT:
- Extract numerical values as numbers, not strings
- Convert all thickness to inches
- Use null for missing values, not empty strings
- Confidence score based on data completeness
- Include ALL thickness measurements found`;
}

function createPatternBasedAnalysis(
  text: string,
  structuredData: Record<string, any>,
  sections: Record<string, string>
): Omit<PDFAnalysis, 'extractedText'> {
  console.log('Creating pattern-based analysis from extracted data...');
  
  // Build report data from structured extraction
  const reportData: Record<string, any> = {
    tankId: structuredData.tankId || extractFromSections(sections, 'tank', 'Tank ID') || 'Unknown',
    inspector: structuredData.inspector || extractFromSections(sections, 'inspector', 'Inspector'),
    inspectionDate: structuredData.date || new Date().toISOString().split('T')[0],
    service: detectService(text, structuredData.service),
    diameter: structuredData.diameter,
    height: structuredData.height,
    originalThickness: 0.375, // Common default
    corrosionRate: structuredData.corrosionRate,
    remainingLife: structuredData.remainingLife,
    status: 'draft'
  };
  
  // Extract thickness measurements from structured data
  const thicknessMeasurements: any[] = [];
  if (structuredData.thicknessValues) {
    structuredData.thicknessValues.forEach((tv: any, index: number) => {
      let thickness = tv.value;
      
      // Convert units to inches
      if (tv.unit === 'mm') {
        thickness = thickness / 25.4;
      } else if (tv.unit === 'mil' || tv.unit === 'mils') {
        thickness = thickness / 1000;
      }
      
      // Try to determine component and location from surrounding text
      const component = detectComponent(tv.raw, text);
      const location = detectLocation(tv.raw, text);
      
      thicknessMeasurements.push({
        component,
        location: location || `Location ${index + 1}`,
        currentThickness: thickness,
        originalThickness: reportData.originalThickness,
        measurementType: 'UT'
      });
    });
  }
  
  // Extract findings and recommendations from sections
  reportData.findings = sections['Inspection Findings'] || sections['Findings'] || '';
  reportData.recommendations = sections['Recommendations'] || sections['Repair Requirements'] || '';
  
  return {
    reportData,
    thicknessMeasurements,
    checklistItems: [],
    confidence: thicknessMeasurements.length > 0 ? 60 : 30,
    mappingSuggestions: {
      extraction_method: 'pattern-based',
      sections_found: Object.keys(sections).join(', ')
    },
    detectedFields: Object.keys(structuredData)
  };
}

function detectService(text: string, extracted?: string): string {
  if (extracted) {
    const lowerExtracted = extracted.toLowerCase();
    if (lowerExtracted.includes('crude')) return 'crude_oil';
    if (lowerExtracted.includes('diesel')) return 'diesel';
    if (lowerExtracted.includes('gasoline') || lowerExtracted.includes('gas')) return 'gasoline';
    if (lowerExtracted.includes('water')) return 'water';
  }
  
  const textLower = text.toLowerCase();
  if (textLower.includes('crude oil')) return 'crude_oil';
  if (textLower.includes('diesel')) return 'diesel';
  if (textLower.includes('gasoline')) return 'gasoline';
  if (textLower.includes('water tank')) return 'water';
  
  return 'other';
}

function detectComponent(measurementText: string, fullText: string): string {
  const contextRadius = 100;
  const index = fullText.indexOf(measurementText);
  const context = fullText.substring(Math.max(0, index - contextRadius), index + contextRadius).toLowerCase();
  
  if (context.includes('shell') || context.includes('course')) return 'Shell';
  if (context.includes('bottom') || context.includes('floor')) return 'Bottom';
  if (context.includes('roof') || context.includes('deck')) return 'Roof';
  if (context.includes('nozzle')) return 'Nozzle';
  if (context.includes('manway') || context.includes('man way')) return 'Manway';
  
  return 'Shell'; // Default to shell
}

function detectLocation(measurementText: string, fullText: string): string | null {
  const contextRadius = 50;
  const index = fullText.indexOf(measurementText);
  const context = fullText.substring(Math.max(0, index - contextRadius), index + contextRadius);
  
  // Check for course numbers
  const courseMatch = context.match(/course\s*(\d+)/i);
  if (courseMatch) {
    // Check for direction
    const directionMatch = context.match(/\b(north|south|east|west|N|S|E|W|NE|NW|SE|SW)\b/i);
    if (directionMatch) {
      return `Course ${courseMatch[1]} ${directionMatch[0].toUpperCase()}`;
    }
    return `Course ${courseMatch[1]}`;
  }
  
  // Check for grid references
  const gridMatch = context.match(/\b([A-Z]\d+)\b/);
  if (gridMatch) {
    return gridMatch[0];
  }
  
  // Check for angles
  const angleMatch = context.match(/(\d+)\s*(?:°|deg|degrees)/);
  if (angleMatch) {
    return `${angleMatch[1]}°`;
  }
  
  return null;
}

function extractFromSections(sections: Record<string, string>, key: string, label: string): string | null {
  for (const [sectionName, content] of Object.entries(sections)) {
    const pattern = new RegExp(`${label}[\\s:]*([^\\n\\r]+)`, 'i');
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function enhanceWithPatternExtraction(
  aiAnalysis: Omit<PDFAnalysis, 'extractedText'>,
  text: string,
  structuredData: Record<string, any>
): Omit<PDFAnalysis, 'extractedText'> {
  // If AI didn't find thickness measurements, use pattern extraction
  if (!aiAnalysis.thicknessMeasurements || aiAnalysis.thicknessMeasurements.length === 0) {
    console.log('AI found no thickness measurements, using pattern extraction...');
    const patternAnalysis = createPatternBasedAnalysis(text, structuredData, {});
    aiAnalysis.thicknessMeasurements = patternAnalysis.thicknessMeasurements;
    
    if (patternAnalysis.thicknessMeasurements.length > 0) {
      aiAnalysis.confidence = Math.max(aiAnalysis.confidence, 50);
    }
  }
  
  // Enhance report data with structured extraction if missing
  if (!aiAnalysis.reportData.tankId && structuredData.tankId) {
    aiAnalysis.reportData.tankId = structuredData.tankId;
  }
  
  if (!aiAnalysis.reportData.inspector && structuredData.inspector) {
    aiAnalysis.reportData.inspector = structuredData.inspector;
  }
  
  return aiAnalysis;
}

function chunkTextForAnalysis(text: string, sections: Record<string, string>): string {
  const maxLength = 180000; // Leave buffer for prompt
  
  if (text.length <= maxLength) {
    return text;
  }
  
  console.log('Text too long, intelligently chunking for API...');
  
  // Priority: section content > full text
  let chunkedText = '';
  
  // Add all identified sections first
  for (const [name, content] of Object.entries(sections)) {
    chunkedText += `\n=== ${name} ===\n${content}\n`;
    if (chunkedText.length > maxLength * 0.7) break;
  }
  
  // Add remaining space with general text
  const remainingSpace = maxLength - chunkedText.length - 1000; // Buffer
  if (remainingSpace > 0) {
    // Add beginning and end of document
    const docStart = text.substring(0, remainingSpace / 2);
    const docEnd = text.substring(text.length - remainingSpace / 2);
    chunkedText = docStart + '\n\n[... document middle ...]\n\n' + chunkedText + '\n\n' + docEnd;
  }
  
  return chunkedText.substring(0, maxLength);
}

function createEmptyAnalysis(): PDFAnalysis {
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

// Export the process function as well
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
  console.log('Thickness measurements found:', analysis.thicknessMeasurements?.length || 0);
  
  // Validate and clean the data
  const validatedMeasurements = validateThicknessMeasurements(analysis.thicknessMeasurements || []);
  const validatedReportData = validateReportData(analysis.reportData || {});
  
  // Use AI data if confidence is reasonable (lowered threshold)
  if (analysis.confidence >= 30) {
    console.log('Using AI analysis for PDF import');
    
    const importedData = {
      ...validatedReportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('PDF imported data:', importedData);
    console.log('Validated measurements:', validatedMeasurements.length);
    
    return {
      importedData,
      thicknessMeasurements: validatedMeasurements,
      checklistItems: analysis.checklistItems || [],
      totalPages: Math.max(1, Math.floor(analysis.extractedText.length / 2000)),
      preview: analysis.extractedText.substring(0, 500) + '...',
      aiAnalysis: analysis
    };
  } else {
    console.log('=== AI ANALYSIS CONFIDENCE TOO LOW ===');
    console.log('Creating basic import from available data...');
    
    // Use whatever data we have
    const importedData = {
      tankId: validatedReportData.tankId || 'PDF Import',
      inspector: validatedReportData.inspector || 'Unknown',
      service: validatedReportData.service || 'other',
      status: 'draft',
      inspectionDate: validatedReportData.inspectionDate || new Date().toISOString().split('T')[0],
      reportNumber: validatedReportData.reportNumber || `PDF-${Date.now()}`,
      findings: validatedReportData.findings || analysis.extractedText.substring(0, 1000),
      diameter: validatedReportData.diameter,
      height: validatedReportData.height,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      importedData,
      thicknessMeasurements: validatedMeasurements,
      checklistItems: analysis.checklistItems || [],
      totalPages: Math.max(1, Math.floor(analysis.extractedText.length / 2000)),
      preview: analysis.extractedText.substring(0, 500) + '...',
      aiAnalysis: analysis
    };
  }
}

function validateThicknessMeasurements(measurements: any[]): any[] {
  return measurements.map(m => {
    // Ensure thickness values are numbers and in valid range
    let currentThickness = parseFloat(m.currentThickness);
    let originalThickness = parseFloat(m.originalThickness) || 0.375;
    
    // Validate thickness ranges (typical for tanks)
    if (isNaN(currentThickness) || currentThickness < 0.05 || currentThickness > 5) {
      console.warn(`Invalid thickness value: ${m.currentThickness}`);
      return null;
    }
    
    return {
      ...m,
      currentThickness,
      originalThickness,
      component: m.component || 'Shell',
      location: m.location || 'Unknown',
      measurementType: m.measurementType || 'UT'
    };
  }).filter(Boolean); // Remove invalid measurements
}

function validateReportData(data: Record<string, any>): Record<string, any> {
  const validated: Record<string, any> = {};
  
  // Validate and format each field
  if (data.tankId) validated.tankId = String(data.tankId).substring(0, 100);
  if (data.reportNumber) validated.reportNumber = String(data.reportNumber).substring(0, 100);
  if (data.inspector) validated.inspector = String(data.inspector).substring(0, 200);
  
  // Validate service type
  const validServices = ['crude_oil', 'diesel', 'gasoline', 'water', 'chemical', 'other'];
  validated.service = validServices.includes(data.service) ? data.service : 'other';
  
  // Validate date
  if (data.inspectionDate) {
    try {
      const date = new Date(data.inspectionDate);
      if (!isNaN(date.getTime())) {
        validated.inspectionDate = date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Invalid date:', data.inspectionDate);
    }
  }
  
  // Validate numeric fields
  if (data.diameter) {
    const diameter = parseFloat(data.diameter);
    if (!isNaN(diameter) && diameter > 0 && diameter < 1000) {
      validated.diameter = diameter;
    }
  }
  
  if (data.height) {
    const height = parseFloat(data.height);
    if (!isNaN(height) && height > 0 && height < 500) {
      validated.height = height;
    }
  }
  
  if (data.originalThickness) {
    const thickness = parseFloat(data.originalThickness);
    if (!isNaN(thickness) && thickness > 0.05 && thickness < 5) {
      validated.originalThickness = thickness;
    }
  }
  
  // Copy text fields
  if (data.findings) validated.findings = String(data.findings);
  if (data.recommendations) validated.recommendations = String(data.recommendations);
  if (data.material) validated.material = String(data.material).substring(0, 100);
  if (data.constructionCode) validated.constructionCode = String(data.constructionCode).substring(0, 50);
  
  validated.status = 'draft';
  
  return validated;
}