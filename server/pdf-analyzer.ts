// Enhanced PDF analyzer for API 653 tank inspection reports with improved extraction

interface PDFAnalysis {
  reportData: Record<string, any>;
  thicknessMeasurements: any[];
  checklistItems: any[];
  confidence: number;
  mappingSuggestions: Record<string, string>;
  detectedFields: string[];
  extractedText: string;
  sections?: Record<string, string>;
  extractionDetails?: {
    tablesFound: number;
    patternsMatched: Record<string, number>;
    sectionsIdentified: string[];
    warnings: string[];
    successfulExtractions: string[];
    failedExtractions: string[];
  };
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Enhanced API 653 specific patterns with more variations
const API653_PATTERNS = {
  tankId: [
    /tank[\s_-]*(?:id|identification|identifier|number|no\.?|num|#)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /equipment[\s_-]*(?:id|identification|number|tag|no\.?)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /vessel[\s_-]*(?:id|identification|number|no\.?)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /asset[\s_-]*(?:id|identification|number|tag|no\.?)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /unit[\s_-]*(?:id|identification|number|no\.?)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /tank[\s]*([A-Z0-9]{1,3}[\-_]?\d{1,4})/gi,
    /\bT[\-_]?\d{1,4}\b/g  // Common tank naming patterns like T-101, T101
  ],
  thickness: [
    // Standard formats with units
    /(\d+\.?\d*)\s*(?:in|inch|inches|")/gi,
    /(\d+\.?\d*)\s*(?:mil|mils)/gi,
    /(\d+\.?\d*)\s*mm/gi,
    // Context-based patterns
    /thickness[\s:]*(\d+\.?\d*)/gi,
    /tml[\s:]*(\d+\.?\d*)/gi,
    /reading[\s:]*(\d+\.?\d*)/gi,
    /measured[\s:]*(\d+\.?\d*)/gi,
    // Original vs Current patterns
    /original[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    /current[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    /nominal[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    /actual[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    /remaining[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    // Decimal patterns without explicit units
    /(?:^|\s)(\d\.\d{3,4})(?:\s|$)/gm,  // Common thickness format like 0.375
    // Shell course patterns
    /course\s*\d+[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi,
    // Component with thickness
    /(?:shell|bottom|roof|nozzle)[\s:]*(\d+\.?\d*)[\s]*(?:in|inch|inches|"|mil|mils|mm)?/gi
  ],
  date: [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g,
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi,
    /\d{1,2}\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[a-z]*,?\s+\d{2,4}/gi
  ],
  inspector: [
    /inspector[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\||API)/gi,
    /examiner[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi,
    /inspected[\s]*by[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi,
    /certified[\s]*by[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi,
    /api[\s]*653[\s]*inspector[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi,
    /signature[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi,
    /performed[\s]*by[\s:]*([A-Za-z\s\.\,]+?)(?:\n|$|;|,|\|)/gi
  ],
  service: [
    /service[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$|;|,|\|)/gi,
    /product[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$|;|,|\|)/gi,
    /contents[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$|;|,|\|)/gi,
    /stored[\s]*(?:material|product)[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$|;|,|\|)/gi,
    /commodity[\s:]*([A-Za-z0-9\s\-]+?)(?:\n|$|;|,|\|)/gi
  ],
  location: [
    // Direction patterns
    /\b(north|south|east|west|N|S|E|W|NE|NW|SE|SW)\b/gi,
    // Degree patterns
    /(\d{1,3})[\s]*(?:°|deg|degrees)/gi,
    // Course patterns
    /course[\s]*(\d+)/gi,
    /ring[\s]*(\d+)/gi,
    // Grid patterns
    /\b([A-Z]\d{1,2})\b/g,
    // Elevation patterns
    /elevation[\s:]*(\d+\.?\d*)[\s]*(?:ft|feet|m|meters)?/gi,
    /height[\s:]*(\d+\.?\d*)[\s]*(?:ft|feet|m|meters)?/gi
  ],
  reportNumber: [
    /report[\s]*(?:number|no\.?|#)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /inspection[\s]*(?:number|no\.?|#)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /reference[\s]*(?:number|no\.?|#)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /project[\s]*(?:number|no\.?|#)[\s:]*([A-Z0-9\-_\/]+)/gi,
    /work[\s]*order[\s:]*([A-Z0-9\-_\/]+)/gi,
    /w\.?o\.?[\s#:]*([A-Z0-9\-_\/]+)/gi
  ],
  measurementType: [
    /\b(UT|MT|PT|VT|RT|UTT|PAUT)\b/g,
    /ultrasonic/gi,
    /magnetic[\s]*particle/gi,
    /penetrant/gi,
    /visual/gi,
    /radiographic/gi
  ]
};

// Enhanced report sections with variations
const REPORT_SECTIONS = [
  'Executive Summary',
  'Tank Information',
  'Tank Details', 
  'Tank Data',
  'Equipment Data',
  'Inspection Summary',
  'Inspection Details',
  'Thickness Measurements',
  'Thickness Data',
  'Shell Thickness',
  'Shell Course Thickness',
  'Bottom Thickness',
  'Bottom Plate Thickness',
  'Roof Thickness',
  'Roof Plate Thickness',
  'Nozzle Inspection',
  'Nozzle Thickness',
  'Settlement Survey',
  'Settlement Data',
  'Inspection Findings',
  'Findings',
  'Observations',
  'Recommendations',
  'Repair Requirements',
  'Repair Recommendations',
  'Appendix',
  'Appendices',
  'Attachments',
  'Test Results',
  'NDE Results',
  'NDT Results',
  'Visual Inspection',
  'Corrosion Assessment',
  'Remaining Life Calculations',
  'Corrosion Rate',
  'Measurements',
  'Data Sheet',
  'Test Data'
];

// Common component name mappings
const COMPONENT_MAPPINGS: Record<string, string> = {
  'shl': 'Shell',
  'shell': 'Shell',
  'btm': 'Bottom',
  'bottom': 'Bottom',
  'floor': 'Bottom',
  'rf': 'Roof',
  'roof': 'Roof',
  'deck': 'Roof',
  'noz': 'Nozzle',
  'nozzle': 'Nozzle',
  'mw': 'Manway',
  'manway': 'Manway',
  'man way': 'Manway'
};

export async function analyzePDFWithOpenRouter(
  buffer: Buffer,
  fileName: string
): Promise<PDFAnalysis> {
  console.log('=== ENHANCED PDF ANALYSIS STARTING ===');
  console.log('Analyzing PDF file:', fileName);
  console.log('File size:', buffer.length, 'bytes');
  
  const extractionDetails = {
    tablesFound: 0,
    patternsMatched: {} as Record<string, number>,
    sectionsIdentified: [] as string[],
    warnings: [] as string[],
    successfulExtractions: [] as string[],
    failedExtractions: [] as string[]
  };
  
  try {
    // Extract text from PDF with multiple enhanced methods
    const extractedText = await extractPDFTextEnhanced(buffer, extractionDetails);
    
    if (!extractedText || extractedText.length < 50) {
      console.warn('PDF text extraction failed or too short');
      extractionDetails.warnings.push('PDF text extraction returned minimal content');
      return createEmptyAnalysis(extractionDetails);
    }
    
    extractionDetails.successfulExtractions.push('Text extraction completed');
    
    // Identify report sections
    const sections = identifyReportSections(extractedText, extractionDetails);
    console.log('Identified sections:', Object.keys(sections));
    
    // Extract structured data using patterns
    const structuredData = extractStructuredData(extractedText, extractionDetails);
    console.log('Extracted structured data:', structuredData);
    
    // Use OpenRouter AI for comprehensive analysis
    const aiAnalysis = await callOpenRouterForPDF(extractedText, fileName, structuredData, sections, extractionDetails);
    
    // Enhance AI results with pattern-based extraction
    const enhancedAnalysis = enhanceWithPatternExtraction(aiAnalysis, extractedText, structuredData, sections, extractionDetails);
    
    // Post-process and validate data
    const finalAnalysis = postProcessAnalysis(enhancedAnalysis, extractionDetails);
    
    // Log extraction summary
    logExtractionSummary(finalAnalysis, extractionDetails);
    
    return {
      ...finalAnalysis,
      extractedText,
      sections,
      extractionDetails
    };
    
  } catch (error) {
    console.error('=== PDF Analysis Failed ===');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    extractionDetails.failedExtractions.push('PDF analysis failed: ' + errorMessage);
    return createEmptyAnalysis(extractionDetails);
  }
}

async function extractPDFTextEnhanced(buffer: Buffer, extractionDetails: any): Promise<string> {
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
    extractionDetails.warnings.push('Primary PDF parsing failed');
  }
  
  // If primary extraction failed or gave poor results, try advanced methods
  if (extractedText.length < 500) {
    console.log('Primary extraction insufficient, trying advanced methods...');
    const advancedText = await extractPDFTextAdvanced(buffer);
    if (advancedText.length > extractedText.length) {
      extractedText = advancedText;
      extractionDetails.successfulExtractions.push('Advanced text extraction used');
    }
  }
  
  // Clean and normalize the text
  extractedText = cleanPDFText(extractedText);
  
  // Extract tables with enhanced algorithm
  const { tableText, tableCount } = extractTablesEnhanced(extractedText);
  if (tableText) {
    extractedText += '\n\n=== EXTRACTED TABLES ===\n' + tableText;
    extractionDetails.tablesFound = tableCount;
    extractionDetails.successfulExtractions.push(`${tableCount} tables extracted`);
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
      /\d+\.\d+[\s]*(?:years|yrs)/gi, // Time periods
      /SHL[\-\s]?\d+/gi, // Shell course abbreviations
      /BTM[\-\s]?\d+/gi, // Bottom plate abbreviations
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
  let cleaned = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ') // Convert tabs to spaces
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .replace(/\s{3,}/g, '  ') // Limit consecutive spaces
    .trim();
  
  // Fix common OCR errors
  cleaned = fixCommonOCRErrors(cleaned);
  
  return cleaned;
}

function fixCommonOCRErrors(text: string): string {
  // Common OCR replacements
  const replacements = [
    [/\bl\b/g, '1'], // lowercase l to 1
    [/\bO\b/g, '0'], // uppercase O to 0
    [/\brn\b/g, 'm'], // rn to m
    [/\bIl\b/g, 'II'], // Il to II
    [/APl[\s]?653/gi, 'API 653'], // Common API 653 OCR error
    [/\bthic kness\b/gi, 'thickness'],
    [/\bcorro sion\b/gi, 'corrosion'],
    [/\binspec tion\b/gi, 'inspection'],
  ];
  
  let fixed = text;
  for (const [pattern, replacement] of replacements) {
    fixed = fixed.replace(pattern, replacement as string);
  }
  
  return fixed;
}

function extractTablesEnhanced(text: string): { tableText: string, tableCount: number } {
  const tables: string[] = [];
  const lines = text.split('\n');
  
  // Method 1: Column-aligned data detection
  const columnAlignedTables = detectColumnAlignedTables(lines);
  tables.push(...columnAlignedTables);
  
  // Method 2: Delimiter-based table detection
  const delimiterTables = detectDelimiterTables(lines);
  tables.push(...delimiterTables);
  
  // Method 3: Context-based thickness table detection
  const thicknessTables = detectThicknessTables(lines);
  tables.push(...thicknessTables);
  
  console.log(`Found ${tables.length} potential tables`);
  
  const uniqueTables = [...new Set(tables)];
  return {
    tableText: uniqueTables.join('\n\n--- TABLE ---\n\n'),
    tableCount: uniqueTables.length
  };
}

function detectColumnAlignedTables(lines: string[]): string[] {
  const tables: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;
  let columnPositions: number[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line has consistent column positions
    const columns = detectColumnPositions(line);
    
    if (columns.length >= 2) {
      if (!inTable) {
        // Start new table
        inTable = true;
        currentTable = [];
        columnPositions = columns;
      } else if (areColumnsAligned(columns, columnPositions)) {
        // Continue table
      } else {
        // End current table and start new one
        if (currentTable.length > 2) {
          tables.push(formatTable(currentTable));
        }
        currentTable = [];
        columnPositions = columns;
      }
      currentTable.push(line);
    } else if (inTable) {
      // Check if this is a continuation line or end of table
      if (line.trim().length === 0 || !hasTableContent(line)) {
        if (currentTable.length > 2) {
          tables.push(formatTable(currentTable));
        }
        inTable = false;
        currentTable = [];
        columnPositions = [];
      } else if (hasNumericData(line)) {
        // Continue if line has numeric data
        currentTable.push(line);
      }
    }
  }
  
  // Don't forget the last table
  if (inTable && currentTable.length > 2) {
    tables.push(formatTable(currentTable));
  }
  
  return tables;
}

function detectColumnPositions(line: string): number[] {
  const positions: number[] = [];
  let inWord = false;
  let wordStart = 0;
  
  for (let i = 0; i < line.length; i++) {
    if (!inWord && line[i] !== ' ') {
      inWord = true;
      wordStart = i;
      positions.push(wordStart);
    } else if (inWord && (i === line.length - 1 || (line[i] === ' ' && line[i + 1] === ' '))) {
      inWord = false;
    }
  }
  
  return positions;
}

function areColumnsAligned(cols1: number[], cols2: number[], tolerance: number = 3): boolean {
  if (Math.abs(cols1.length - cols2.length) > 1) return false;
  
  let matches = 0;
  for (const pos1 of cols1) {
    for (const pos2 of cols2) {
      if (Math.abs(pos1 - pos2) <= tolerance) {
        matches++;
        break;
      }
    }
  }
  
  return matches >= Math.min(cols1.length, cols2.length) * 0.6;
}

function hasTableContent(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && 
         (hasNumericData(line) || 
          /\b(shell|bottom|roof|course|nozzle|north|south|east|west)\b/i.test(line) ||
          /\b[A-Z]\d+\b/.test(line)); // Grid references
}

function hasNumericData(line: string): boolean {
  return /\d+\.?\d*/.test(line);
}

function formatTable(lines: string[]): string {
  return '=== TABLE START ===\n' + lines.join('\n') + '\n=== TABLE END ===';
}

function detectDelimiterTables(lines: string[]): string[] {
  const tables: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;
  let delimiter: string | null = null;
  
  for (const line of lines) {
    // Check for common delimiters
    const hasTab = line.split('\t').length >= 3;
    const hasPipe = line.split('|').length >= 3;
    const hasComma = line.split(',').length >= 3 && !line.includes(', '); // Avoid sentences
    
    if (hasTab || hasPipe || hasComma) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
        delimiter = hasTab ? '\t' : hasPipe ? '|' : ',';
      }
      currentTable.push(line);
    } else if (inTable && currentTable.length > 2) {
      tables.push(formatTable(currentTable));
      inTable = false;
      currentTable = [];
      delimiter = null;
    }
  }
  
  if (inTable && currentTable.length > 2) {
    tables.push(formatTable(currentTable));
  }
  
  return tables;
}

function detectThicknessTables(lines: string[]): string[] {
  const tables: string[] = [];
  let currentTable: string[] = [];
  let inThicknessSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Check if entering thickness section
    if (lineLower.includes('thickness') && 
        (lineLower.includes('measurement') || lineLower.includes('data') || 
         lineLower.includes('table') || lineLower.includes('reading'))) {
      inThicknessSection = true;
      currentTable = [line];
      continue;
    }
    
    if (inThicknessSection) {
      // Check for thickness data patterns
      const hasThicknessValue = /\d+\.\d{3,4}/.test(line) || // 0.375 format
                               /\d{3,4}\s*mils?/.test(line) || // 375 mils
                               /\d+\.\d+\s*(?:in|inch|inches|mm|")/.test(line);
      
      const hasLocation = /\b(course|shell|bottom|roof|north|south|east|west|\d+°)\b/i.test(line);
      
      if (hasThicknessValue || hasLocation) {
        currentTable.push(line);
      } else if (currentTable.length > 3) {
        // End of thickness table
        tables.push(formatTable(currentTable));
        inThicknessSection = false;
        currentTable = [];
      }
    }
  }
  
  if (currentTable.length > 3) {
    tables.push(formatTable(currentTable));
  }
  
  return tables;
}

function identifyReportSections(text: string, extractionDetails: any): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line matches a section header
    for (const section of REPORT_SECTIONS) {
      // More flexible section matching
      const pattern = new RegExp(`^\\s*(?:\\d+[\\.\\)]?\\s*)?(?:section\\s*)?${section.replace(/\s+/g, '\\s*')}\\s*:?`, 'i');
      if (pattern.test(line)) {
        // Extract content until next section
        let content = '';
        let contentLines = 0;
        
        for (let j = i + 1; j < lines.length && contentLines < 200; j++) {
          const nextLine = lines[j].trim();
          
          // Check if we've hit another section
          let isNextSection = false;
          for (const nextSection of REPORT_SECTIONS) {
            const nextPattern = new RegExp(`^\\s*(?:\\d+[\\.\\)]?\\s*)?(?:section\\s*)?${nextSection.replace(/\s+/g, '\\s*')}\\s*:?`, 'i');
            if (nextPattern.test(nextLine)) {
              isNextSection = true;
              break;
            }
          }
          
          if (isNextSection) {
            break;
          }
          
          content += nextLine + '\n';
          contentLines++;
        }
        
        if (content.trim().length > 10) {
          sections[section] = content.trim();
          console.log(`Found section: ${section} (${content.length} chars)`);
          extractionDetails.sectionsIdentified.push(section);
        }
      }
    }
  }
  
  return sections;
}

function extractStructuredData(text: string, extractionDetails: any): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Extract using enhanced API653 patterns
  for (const [field, patterns] of Object.entries(API653_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        
        if (field === 'thickness') {
          // Collect all thickness values with context
          if (!data.thicknessValues) data.thicknessValues = [];
          
          for (const match of matches) {
            const fullMatch = match[0];
            const value = parseFloat(match[1] || match[0].match(/\d+\.?\d*/)?.[0] || '0');
            const unit = detectUnit(fullMatch);
            const context = getMatchContext(text, match.index || 0, 50);
            
            data.thicknessValues.push({
              value,
              unit,
              raw: fullMatch,
              context,
              component: detectComponentFromContext(context),
              location: detectLocationFromContext(context)
            });
          }
        } else if (field === 'location') {
          // Collect location information
          if (!data.locations) data.locations = [];
          for (const match of matches) {
            data.locations.push(match[1] || match[0]);
          }
        } else {
          // Store first valid match for other fields
          const validMatch = matches.find(m => m[1] && m[1].trim().length > 0);
          if (validMatch) {
            data[field] = validMatch[1].trim();
            break;
          }
        }
      }
    }
    
    if (matchCount > 0) {
      if (!extractionDetails.patternsMatched[field]) {
        extractionDetails.patternsMatched[field] = 0;
      }
      extractionDetails.patternsMatched[field] += matchCount;
    }
  }
  
  // Extract dimensions
  const diameterMatch = text.match(/diameter[\s:]*(\d+\.?\d*)\s*(?:ft|feet|'|m|meters)?/i);
  if (diameterMatch) {
    data.diameter = parseFloat(diameterMatch[1]);
    extractionDetails.successfulExtractions.push('Diameter extracted');
  }
  
  const heightMatch = text.match(/height[\s:]*(\d+\.?\d*)\s*(?:ft|feet|'|m|meters)?/i);
  if (heightMatch) {
    data.height = parseFloat(heightMatch[1]);
    extractionDetails.successfulExtractions.push('Height extracted');
  }
  
  // Extract corrosion rate with variations
  const corrosionPatterns = [
    /corrosion[\s]*rate[\s:]*(\d+\.?\d*)\s*(?:mpy|mil\/year|mm\/year|mils?\/year)?/i,
    /CR[\s:]*(\d+\.?\d*)\s*(?:mpy|mil\/year)?/i,
    /(\d+\.?\d*)\s*mpy/i
  ];
  
  for (const pattern of corrosionPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.corrosionRate = parseFloat(match[1]);
      extractionDetails.successfulExtractions.push('Corrosion rate extracted');
      break;
    }
  }
  
  // Extract remaining life
  const remainingLifeMatch = text.match(/remaining[\s]*life[\s:]*(\d+\.?\d*)\s*(?:years|yrs|year|yr)?/i);
  if (remainingLifeMatch) {
    data.remainingLife = parseFloat(remainingLifeMatch[1]);
    extractionDetails.successfulExtractions.push('Remaining life extracted');
  }
  
  // Extract capacity
  const capacityMatch = text.match(/capacity[\s:]*(\d+(?:,\d{3})*\.?\d*)\s*(?:gallons?|gal|barrels?|bbl|liters?|l)?/i);
  if (capacityMatch) {
    data.capacity = parseFloat(capacityMatch[1].replace(/,/g, ''));
    extractionDetails.successfulExtractions.push('Capacity extracted');
  }
  
  return data;
}

function detectUnit(text: string): string {
  if (/mm/.test(text)) return 'mm';
  if (/mil|mils/.test(text)) return 'mils';
  if (/in|inch|inches|"/.test(text)) return 'in';
  // Default to inches if just a decimal number
  if (/^\d*\.\d{3,4}$/.test(text.trim())) return 'in';
  return 'in';
}

function getMatchContext(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.substring(start, end);
}

function detectComponentFromContext(context: string): string {
  const contextLower = context.toLowerCase();
  
  for (const [key, value] of Object.entries(COMPONENT_MAPPINGS)) {
    if (contextLower.includes(key)) {
      return value;
    }
  }
  
  // Check for course patterns
  if (/course\s*\d+/i.test(context)) return 'Shell';
  if (/ring\s*\d+/i.test(context)) return 'Shell';
  if (/plate\s*[A-Z]\d+/i.test(context)) return 'Bottom';
  
  return 'Shell'; // Default
}

function detectLocationFromContext(context: string): string {
  // Extract course number
  const courseMatch = context.match(/course\s*(\d+)/i);
  const course = courseMatch ? courseMatch[1] : null;
  
  // Extract direction
  const directionMatch = context.match(/\b(north|south|east|west|N|S|E|W|NE|NW|SE|SW)\b/i);
  const direction = directionMatch ? directionMatch[1].toUpperCase() : null;
  
  // Extract degree
  const degreeMatch = context.match(/(\d{1,3})\s*(?:°|deg|degrees)/);
  const degree = degreeMatch ? `${degreeMatch[1]}°` : null;
  
  // Extract grid reference
  const gridMatch = context.match(/\b([A-Z]\d{1,2})\b/);
  const grid = gridMatch ? gridMatch[1] : null;
  
  // Build location string
  const parts = [];
  if (course) parts.push(`Course ${course}`);
  if (direction) parts.push(direction);
  if (degree) parts.push(degree);
  if (grid) parts.push(grid);
  
  return parts.join(' ') || 'Unknown';
}

async function callOpenRouterForPDF(
  text: string, 
  fileName: string, 
  structuredData: Record<string, any>,
  sections: Record<string, string>,
  extractionDetails: any
): Promise<Omit<PDFAnalysis, 'extractedText'>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OpenRouter API key not configured, using pattern-based extraction only');
    extractionDetails.warnings.push('OpenRouter API key not configured');
    return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
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
      extractionDetails.warnings.push(`OpenRouter API error: ${response.status}`);
      // Fall back to pattern-based extraction
      return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.warn('No content in OpenRouter response, using pattern-based extraction');
      extractionDetails.warnings.push('OpenRouter returned empty response');
      return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
    }

    console.log('=== OpenRouter PDF Analysis Response ===');
    
    // Parse the JSON response
    try {
      const analysis = JSON.parse(content);
      console.log(`AI found ${analysis.thicknessMeasurements?.length || 0} thickness measurements`);
      console.log(`AI confidence: ${analysis.confidence}%`);
      extractionDetails.successfulExtractions.push(`AI extracted ${analysis.thicknessMeasurements?.length || 0} thickness measurements`);
      return analysis;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      extractionDetails.warnings.push('Failed to parse AI response as JSON');
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted PDF analysis from text');
          return analysis;
        } catch (secondParseError) {
          console.error('Second parse failed, using pattern-based extraction');
          extractionDetails.failedExtractions.push('AI response parsing failed');
          return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
        }
      }
      
      return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
    }
    
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    extractionDetails.failedExtractions.push(`OpenRouter API call failed: ${errorMessage}`);
    return createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
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
  
  // Include extracted table data prominently
  const tableData = text.includes('=== EXTRACTED TABLES ===') 
    ? text.substring(text.indexOf('=== EXTRACTED TABLES ==='))
    : '';
  
  return `You are an expert API 653 tank inspection specialist analyzing a PDF inspection report. Extract ALL relevant data with high accuracy.

FILENAME: ${fileName}

ALREADY EXTRACTED DATA (use these as hints):
${JSON.stringify(structuredData, null, 2)}

IDENTIFIED SECTIONS:
${Object.keys(sections).join(', ')}

${tableData ? 'EXTRACTED TABLE DATA:\n' + tableData.substring(0, 10000) + '\n\n' : ''}

PDF TEXT CONTENT:
${chunkedText}

CRITICAL EXTRACTION REQUIREMENTS:

1. THICKNESS MEASUREMENTS (HIGHEST PRIORITY):
   Look for ALL thickness data in these formats:
   - Decimal numbers: 0.375, 0.250, 0.500 (commonly inches)
   - With units: 0.375", 375 mils, 9.5mm, 0.375 in
   - In tables with headers like: TML, Thickness, Reading, Measured, Current, Original
   - With location context: Course 1, Course 2, Shell 1, Bottom A1, North, South, 0°, 90°
   - Original vs Current: "Original: 0.500 Current: 0.485"
   - Remaining thickness: "Remaining: 0.015""
   
   CONVERSION RULES:
   - mils to inches: divide by 1000 (375 mils = 0.375 inches)
   - mm to inches: divide by 25.4 (9.5mm = 0.374 inches)
   - If no unit and number like 0.375, assume inches
   - If no unit and number like 375, assume mils

2. TABLE EXTRACTION:
   Many reports have thickness data in tables. Look for:
   - Column headers with thickness-related terms
   - Rows with location identifiers (Course 1, N, S, E, W, A1, B1, etc.)
   - Grid patterns for bottom plates
   - Multi-column layouts with aligned numeric data

3. CONTEXT-BASED EXTRACTION:
   Use section context to understand data:
   - Under "Shell Thickness" → Shell measurements
   - Under "Bottom Thickness" → Bottom measurements
   - Under "Roof Thickness" → Roof measurements
   - Component abbreviations: SHL = Shell, BTM = Bottom, RF = Roof

4. TANK IDENTIFICATION:
   Search all variations: 
   - Tank #, Tank No., Tank ID, T-101, T101
   - Equipment ID, Asset Tag, Unit Number
   - Vessel ID, Equipment Tag, Facility ID
   
5. INSPECTION DETAILS:
   - Inspector name (often in signature area or certification section)
   - Look near: "Inspected by", "API 653 Inspector", "Certified by", "Signature"
   - Inspection date (look for recent dates, format: MM/DD/YYYY or DD-MMM-YYYY)
   - Report number/ID
   
6. TANK SPECIFICATIONS:
   - Diameter (feet or meters) - typical range: 10-300 ft
   - Height (feet or meters) - typical range: 10-80 ft
   - Capacity (gallons, barrels, liters)
   - Service/Product (crude oil, diesel, gasoline, water, chemical)
   - Material (carbon steel, stainless steel, CS, SS)
   - Construction code (API 650, API 620, ASME)
   - Original/design thickness (typically 0.25" to 1.00")

7. CORROSION DATA:
   - Corrosion rate (mpy, mil/year, mm/year) - typical: 0-10 mpy
   - Remaining life (years) - typical: 0-50 years
   - Next inspection date
   - Minimum required thickness

8. QUALITY INDICATORS:
   Rate your confidence based on:
   - Number of thickness measurements found
   - Completeness of tank identification
   - Presence of inspector information
   - Date information available

OUTPUT FORMAT (JSON only, no other text):
{
  "reportData": {
    "tankId": "extracted tank identifier or 'Unknown'",
    "reportNumber": "report number if found",
    "service": "crude_oil|diesel|gasoline|water|chemical|other",
    "inspector": "inspector name if found",
    "inspectionDate": "YYYY-MM-DD or null",
    "diameter": number_in_feet_or_null,
    "height": number_in_feet_or_null,
    "capacity": number_or_null,
    "originalThickness": number_in_inches_or_null,
    "material": "material if found",
    "constructionCode": "code if found",
    "corrosionRate": number_mpy_or_null,
    "remainingLife": number_years_or_null,
    "nextInspectionDate": "YYYY-MM-DD or null",
    "findings": "extracted findings text",
    "recommendations": "extracted recommendations text",
    "status": "draft"
  },
  "thicknessMeasurements": [
    {
      "component": "Shell|Bottom|Roof|Nozzle|Manway",
      "location": "specific location (Course 1 North, Bottom A1, etc)",
      "currentThickness": number_in_inches,
      "originalThickness": number_in_inches_or_null,
      "measurementType": "UT|MT|PT|VT|RT",
      "coursePlate": "identifier if available",
      "gridReference": "grid ref if applicable",
      "direction": "N|S|E|W|NE|NW|SE|SW|degree_value",
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
      "notes": "any notes"
    }
  ],
  "confidence": 0_to_100,
  "mappingSuggestions": {
    "field_name": "how_it_was_identified"
  },
  "detectedFields": ["list", "of", "all", "detected", "field", "names"]
}

IMPORTANT:
- Extract ALL thickness measurements found, even if dozens
- Convert all thickness values to inches
- Use null for missing values, not empty strings
- Include location details for every measurement
- Confidence score: 80-100 if many measurements, 60-79 if some, 40-59 if few, <40 if minimal data`;
}

function createPatternBasedAnalysis(
  text: string,
  structuredData: Record<string, any>,
  sections: Record<string, string>,
  extractionDetails: any
): Omit<PDFAnalysis, 'extractedText'> {
  console.log('Creating enhanced pattern-based analysis...');
  
  // Build report data from structured extraction
  const reportData: Record<string, any> = {
    tankId: structuredData.tankId || extractFromSections(sections, 'tank', 'Tank ID') || 'Unknown',
    reportNumber: structuredData.reportNumber || extractFromSections(sections, 'report', 'Report Number'),
    inspector: structuredData.inspector || extractFromSections(sections, 'inspector', 'Inspector'),
    inspectionDate: formatDate(structuredData.date) || new Date().toISOString().split('T')[0],
    service: detectService(text, structuredData.service),
    diameter: structuredData.diameter,
    height: structuredData.height,
    capacity: structuredData.capacity,
    originalThickness: structuredData.originalThickness || 0.375,
    material: structuredData.material || 'Carbon Steel',
    constructionCode: structuredData.constructionCode || 'API 650',
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
      } else if (tv.unit === 'mils') {
        thickness = thickness / 1000;
      }
      
      // Validate thickness range
      if (thickness >= 0.05 && thickness <= 3.0) {
        thicknessMeasurements.push({
          component: tv.component || 'Shell',
          location: tv.location || `Location ${index + 1}`,
          currentThickness: parseFloat(thickness.toFixed(4)),
          originalThickness: reportData.originalThickness,
          measurementType: detectMeasurementType(tv.context || text),
          direction: extractDirection(tv.context || tv.location)
        });
      }
    });
  }
  
  // Extract checklist items from sections
  const checklistItems = extractChecklistItems(sections);
  
  // Extract findings and recommendations from sections
  reportData.findings = sections['Inspection Findings'] || 
                        sections['Findings'] || 
                        sections['Observations'] || '';
  reportData.recommendations = sections['Recommendations'] || 
                               sections['Repair Requirements'] || 
                               sections['Repair Recommendations'] || '';
  
  const confidence = calculateConfidence(reportData, thicknessMeasurements, extractionDetails);
  
  return {
    reportData,
    thicknessMeasurements,
    checklistItems,
    confidence,
    mappingSuggestions: {
      extraction_method: 'pattern-based',
      sections_found: Object.keys(sections).join(', '),
      patterns_matched: Object.keys(extractionDetails.patternsMatched).join(', ')
    },
    detectedFields: Object.keys(structuredData).filter(k => structuredData[k] != null)
  };
}

function formatDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Check if date is reasonable (within last 20 years and not in future)
      const now = new Date();
      const twentyYearsAgo = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
      
      if (date <= now && date >= twentyYearsAgo) {
        return date.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    console.warn('Invalid date:', dateStr);
  }
  
  return null;
}

function detectService(text: string, extracted?: string): string {
  if (extracted) {
    const lowerExtracted = extracted.toLowerCase().trim();
    if (lowerExtracted.includes('crude')) return 'crude_oil';
    if (lowerExtracted.includes('diesel')) return 'diesel';
    if (lowerExtracted.includes('gasoline') || lowerExtracted.includes('gas')) return 'gasoline';
    if (lowerExtracted.includes('water')) return 'water';
    if (lowerExtracted.includes('chemical')) return 'chemical';
  }
  
  const textLower = text.toLowerCase();
  if (textLower.includes('crude oil')) return 'crude_oil';
  if (textLower.includes('diesel')) return 'diesel';
  if (textLower.includes('gasoline')) return 'gasoline';
  if (textLower.includes('water tank')) return 'water';
  if (textLower.includes('chemical')) return 'chemical';
  
  return 'other';
}

function detectMeasurementType(context: string): string {
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes('ultrasonic') || contextLower.includes('ut')) return 'UT';
  if (contextLower.includes('magnetic') || contextLower.includes('mt')) return 'MT';
  if (contextLower.includes('penetrant') || contextLower.includes('pt')) return 'PT';
  if (contextLower.includes('visual') || contextLower.includes('vt')) return 'VT';
  if (contextLower.includes('radiographic') || contextLower.includes('rt')) return 'RT';
  
  return 'UT'; // Default to ultrasonic
}

function extractDirection(location: string): string | null {
  const directionMatch = location.match(/\b(north|south|east|west|N|S|E|W|NE|NW|SE|SW)\b/i);
  if (directionMatch) {
    return directionMatch[1].toUpperCase();
  }
  
  const degreeMatch = location.match(/(\d{1,3})\s*°/);
  if (degreeMatch) {
    return `${degreeMatch[1]}°`;
  }
  
  return null;
}

function extractChecklistItems(sections: Record<string, string>): any[] {
  const items: any[] = [];
  
  // Look for checklist sections
  for (const [sectionName, content] of Object.entries(sections)) {
    if (sectionName.toLowerCase().includes('checklist') || 
        sectionName.toLowerCase().includes('inspection items')) {
      
      const lines = content.split('\n');
      for (const line of lines) {
        // Parse checklist format: "Item: Status" or "[ ] Item" or "[X] Item"
        const checkMatch = line.match(/\[([X\s])\]\s*(.+)/);
        if (checkMatch) {
          items.push({
            category: determineCategoryFromSection(sectionName),
            item: checkMatch[2].trim(),
            status: checkMatch[1] === 'X' ? 'satisfactory' : 'unsatisfactory',
            notes: ''
          });
        }
        
        const statusMatch = line.match(/(.+?):\s*(satisfactory|unsatisfactory|n\/a|needs repair|ok|good|poor)/i);
        if (statusMatch) {
          items.push({
            category: determineCategoryFromSection(sectionName),
            item: statusMatch[1].trim(),
            status: normalizeStatus(statusMatch[2]),
            notes: ''
          });
        }
      }
    }
  }
  
  return items;
}

function determineCategoryFromSection(sectionName: string): string {
  const lower = sectionName.toLowerCase();
  if (lower.includes('external')) return 'external';
  if (lower.includes('internal')) return 'internal';
  if (lower.includes('foundation')) return 'foundation';
  if (lower.includes('roof')) return 'roof';
  if (lower.includes('appurtenance')) return 'appurtenances';
  return 'external';
}

function normalizeStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('satisfactory') || lower === 'ok' || lower === 'good') {
    return 'satisfactory';
  }
  if (lower.includes('unsatisfactory') || lower === 'poor') {
    return 'unsatisfactory';
  }
  if (lower === 'n/a' || lower.includes('not applicable')) {
    return 'not_applicable';
  }
  if (lower.includes('needs repair')) {
    return 'needs_repair';
  }
  return 'unsatisfactory';
}

function calculateConfidence(
  reportData: Record<string, any>,
  measurements: any[],
  extractionDetails: any
): number {
  let score = 0;
  let maxScore = 0;
  
  // Score based on critical fields
  const criticalFields = [
    { field: 'tankId', weight: 15, notValue: 'Unknown' },
    { field: 'inspector', weight: 10 },
    { field: 'inspectionDate', weight: 10 },
    { field: 'diameter', weight: 8 },
    { field: 'height', weight: 8 },
    { field: 'service', weight: 5, notValue: 'other' }
  ];
  
  for (const { field, weight, notValue } of criticalFields) {
    maxScore += weight;
    if (reportData[field]) {
      if (!notValue || reportData[field] !== notValue) {
        score += weight;
      }
    }
  }
  
  // Score based on measurements
  maxScore += 30;
  if (measurements.length > 20) {
    score += 30;
  } else if (measurements.length > 10) {
    score += 20;
  } else if (measurements.length > 5) {
    score += 15;
  } else if (measurements.length > 0) {
    score += 10;
  }
  
  // Score based on sections found
  maxScore += 10;
  const sectionCount = extractionDetails.sectionsIdentified.length;
  if (sectionCount > 5) {
    score += 10;
  } else if (sectionCount > 3) {
    score += 7;
  } else if (sectionCount > 0) {
    score += 5;
  }
  
  // Score based on tables found
  maxScore += 10;
  if (extractionDetails.tablesFound > 3) {
    score += 10;
  } else if (extractionDetails.tablesFound > 1) {
    score += 7;
  } else if (extractionDetails.tablesFound > 0) {
    score += 5;
  }
  
  const confidence = Math.round((score / maxScore) * 100);
  console.log(`Confidence calculation: ${score}/${maxScore} = ${confidence}%`);
  
  return confidence;
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
  structuredData: Record<string, any>,
  sections: Record<string, string>,
  extractionDetails: any
): Omit<PDFAnalysis, 'extractedText'> {
  // If AI didn't find thickness measurements or found very few, enhance with pattern extraction
  if (!aiAnalysis.thicknessMeasurements || aiAnalysis.thicknessMeasurements.length < 5) {
    console.log(`AI found only ${aiAnalysis.thicknessMeasurements?.length || 0} measurements, enhancing with patterns...`);
    const patternAnalysis = createPatternBasedAnalysis(text, structuredData, sections, extractionDetails);
    
    // Merge measurements, avoiding duplicates
    const existingMeasurements = new Set(
      (aiAnalysis.thicknessMeasurements || []).map(m => 
        `${m.component}-${m.location}-${m.currentThickness}`
      )
    );
    
    const newMeasurements = patternAnalysis.thicknessMeasurements.filter(m => 
      !existingMeasurements.has(`${m.component}-${m.location}-${m.currentThickness}`)
    );
    
    aiAnalysis.thicknessMeasurements = [
      ...(aiAnalysis.thicknessMeasurements || []),
      ...newMeasurements
    ];
    
    if (newMeasurements.length > 0) {
      console.log(`Added ${newMeasurements.length} measurements from pattern extraction`);
      extractionDetails.successfulExtractions.push(`Pattern extraction added ${newMeasurements.length} measurements`);
      aiAnalysis.confidence = Math.max(aiAnalysis.confidence, 50);
    }
  }
  
  // Enhance report data with structured extraction if missing
  if (!aiAnalysis.reportData.tankId || aiAnalysis.reportData.tankId === 'Unknown') {
    if (structuredData.tankId) {
      aiAnalysis.reportData.tankId = structuredData.tankId;
      extractionDetails.successfulExtractions.push('Tank ID recovered from patterns');
    }
  }
  
  if (!aiAnalysis.reportData.inspector && structuredData.inspector) {
    aiAnalysis.reportData.inspector = structuredData.inspector;
    extractionDetails.successfulExtractions.push('Inspector name recovered from patterns');
  }
  
  if (!aiAnalysis.reportData.reportNumber && structuredData.reportNumber) {
    aiAnalysis.reportData.reportNumber = structuredData.reportNumber;
    extractionDetails.successfulExtractions.push('Report number recovered from patterns');
  }
  
  // Add checklist items if missing
  if (!aiAnalysis.checklistItems || aiAnalysis.checklistItems.length === 0) {
    aiAnalysis.checklistItems = extractChecklistItems(sections);
    if (aiAnalysis.checklistItems.length > 0) {
      extractionDetails.successfulExtractions.push(`${aiAnalysis.checklistItems.length} checklist items extracted`);
    }
  }
  
  return aiAnalysis;
}

function postProcessAnalysis(
  analysis: Omit<PDFAnalysis, 'extractedText'>,
  extractionDetails: any
): Omit<PDFAnalysis, 'extractedText'> {
  // Clean and validate thickness measurements
  if (analysis.thicknessMeasurements) {
    analysis.thicknessMeasurements = analysis.thicknessMeasurements
      .map(m => ({
        ...m,
        currentThickness: validateThickness(m.currentThickness),
        originalThickness: m.originalThickness || analysis.reportData.originalThickness || 0.375,
        component: normalizeComponentName(m.component),
        location: cleanLocation(m.location),
        measurementType: m.measurementType || 'UT'
      }))
      .filter(m => m.currentThickness !== null);
  }
  
  // Validate and clean report data
  if (analysis.reportData) {
    // Clean tank ID
    if (analysis.reportData.tankId) {
      analysis.reportData.tankId = analysis.reportData.tankId
        .replace(/[^\w\-_\/]/g, '')
        .substring(0, 50);
    }
    
    // Validate date
    if (analysis.reportData.inspectionDate) {
      const validDate = formatDate(analysis.reportData.inspectionDate);
      if (validDate) {
        analysis.reportData.inspectionDate = validDate;
      } else {
        delete analysis.reportData.inspectionDate;
        extractionDetails.warnings.push('Invalid inspection date removed');
      }
    }
    
    // Validate dimensions
    if (analysis.reportData.diameter) {
      const diameter = parseFloat(analysis.reportData.diameter);
      if (isNaN(diameter) || diameter < 5 || diameter > 500) {
        delete analysis.reportData.diameter;
        extractionDetails.warnings.push('Invalid diameter removed');
      }
    }
    
    if (analysis.reportData.height) {
      const height = parseFloat(analysis.reportData.height);
      if (isNaN(height) || height < 5 || height > 200) {
        delete analysis.reportData.height;
        extractionDetails.warnings.push('Invalid height removed');
      }
    }
  }
  
  return analysis;
}

function validateThickness(value: any): number | null {
  const thickness = parseFloat(value);
  
  // Valid thickness range for tanks (in inches)
  if (!isNaN(thickness) && thickness >= 0.05 && thickness <= 3.0) {
    return parseFloat(thickness.toFixed(4));
  }
  
  return null;
}

function normalizeComponentName(component: string): string {
  if (!component) return 'Shell';
  
  const normalized = COMPONENT_MAPPINGS[component.toLowerCase()];
  if (normalized) return normalized;
  
  // Check if component contains known terms
  const componentLower = component.toLowerCase();
  for (const [key, value] of Object.entries(COMPONENT_MAPPINGS)) {
    if (componentLower.includes(key)) {
      return value;
    }
  }
  
  return component;
}

function cleanLocation(location: string): string {
  if (!location) return 'Unknown';
  
  // Clean up location string
  return location
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

function logExtractionSummary(analysis: any, extractionDetails: any): void {
  console.log('\n=== PDF EXTRACTION SUMMARY ===');
  console.log('Tank ID:', analysis.reportData?.tankId || 'Not found');
  console.log('Inspector:', analysis.reportData?.inspector || 'Not found');
  console.log('Inspection Date:', analysis.reportData?.inspectionDate || 'Not found');
  console.log('Thickness Measurements:', analysis.thicknessMeasurements?.length || 0);
  console.log('Checklist Items:', analysis.checklistItems?.length || 0);
  console.log('Confidence:', analysis.confidence || 0, '%');
  console.log('Tables Found:', extractionDetails.tablesFound);
  console.log('Sections Identified:', extractionDetails.sectionsIdentified.length);
  console.log('Patterns Matched:', Object.keys(extractionDetails.patternsMatched).length);
  
  if (extractionDetails.warnings.length > 0) {
    console.log('\nWarnings:');
    extractionDetails.warnings.forEach((w: string) => console.log('  -', w));
  }
  
  if (extractionDetails.failedExtractions.length > 0) {
    console.log('\nFailed Extractions:');
    extractionDetails.failedExtractions.forEach((f: string) => console.log('  -', f));
  }
  
  console.log('\nSuccessful Extractions:');
  extractionDetails.successfulExtractions.forEach((s: string) => console.log('  +', s));
  
  console.log('=== END EXTRACTION SUMMARY ===\n');
}

function chunkTextForAnalysis(text: string, sections: Record<string, string>): string {
  const maxLength = 180000; // Leave buffer for prompt
  
  if (text.length <= maxLength) {
    return text;
  }
  
  console.log('Text too long, intelligently chunking for API...');
  
  // Priority: tables > sections > general text
  let chunkedText = '';
  
  // Add table data first if present
  if (text.includes('=== EXTRACTED TABLES ===')) {
    const tableStart = text.indexOf('=== EXTRACTED TABLES ===');
    const tableData = text.substring(tableStart);
    chunkedText = tableData.substring(0, Math.min(tableData.length, maxLength / 3));
  }
  
  // Add all identified sections
  for (const [name, content] of Object.entries(sections)) {
    if (chunkedText.length + content.length < maxLength * 0.8) {
      chunkedText += `\n=== ${name} ===\n${content}\n`;
    }
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

function createEmptyAnalysis(extractionDetails?: any): PDFAnalysis {
  return {
    reportData: {},
    thicknessMeasurements: [],
    checklistItems: [],
    confidence: 0,
    mappingSuggestions: {},
    detectedFields: [],
    extractedText: '',
    extractionDetails: extractionDetails || {
      tablesFound: 0,
      patternsMatched: {},
      sectionsIdentified: [],
      warnings: ['Failed to extract data from PDF'],
      successfulExtractions: [],
      failedExtractions: ['PDF analysis failed']
    }
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
  console.log('=== Processing PDF with Enhanced AI Analysis ===');
  console.log('AI confidence:', analysis.confidence);
  console.log('Thickness measurements found:', analysis.thicknessMeasurements?.length || 0);
  console.log('Extraction details:', analysis.extractionDetails);
  
  // Validate and clean the data
  const validatedMeasurements = validateThicknessMeasurements(analysis.thicknessMeasurements || []);
  const validatedReportData = validateReportData(analysis.reportData || {});
  
  // Use AI data if confidence is reasonable (lowered threshold)
  if (analysis.confidence >= 25) {
    console.log('Using AI analysis for PDF import');
    
    const importedData = {
      ...validatedReportData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('PDF imported data:', importedData);
    console.log('Validated measurements:', validatedMeasurements.length);
    
    // Create user-friendly feedback
    const feedback = createImportFeedback(analysis, validatedMeasurements, validatedReportData);
    console.log(feedback);
    
    return {
      importedData,
      thicknessMeasurements: validatedMeasurements,
      checklistItems: analysis.checklistItems || [],
      totalPages: Math.max(1, Math.floor(analysis.extractedText.length / 2000)),
      preview: analysis.extractedText.substring(0, 500) + '...',
      aiAnalysis: analysis
    };
  } else {
    console.log('=== LOW CONFIDENCE IMPORT ===');
    console.log('Creating basic import with available data...');
    
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
    if (isNaN(currentThickness) || currentThickness < 0.05 || currentThickness > 3) {
      console.warn(`Invalid thickness value: ${m.currentThickness} at ${m.location}`);
      return null;
    }
    
    if (isNaN(originalThickness) || originalThickness < 0.05 || originalThickness > 3) {
      originalThickness = 0.375; // Use default
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
        // Check date is reasonable
        const now = new Date();
        const twentyYearsAgo = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
        
        if (date <= now && date >= twentyYearsAgo) {
          validated.inspectionDate = date.toISOString().split('T')[0];
        }
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
    if (!isNaN(thickness) && thickness > 0.05 && thickness < 3) {
      validated.originalThickness = thickness;
    }
  }
  
  if (data.corrosionRate) {
    const rate = parseFloat(data.corrosionRate);
    if (!isNaN(rate) && rate >= 0 && rate < 100) {
      validated.corrosionRate = rate;
    }
  }
  
  if (data.remainingLife) {
    const life = parseFloat(data.remainingLife);
    if (!isNaN(life) && life >= 0 && life < 100) {
      validated.remainingLife = life;
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

function createImportFeedback(
  analysis: PDFAnalysis,
  measurements: any[],
  reportData: Record<string, any>
): string {
  const feedback = [];
  
  feedback.push('=== PDF IMPORT RESULTS ===');
  feedback.push(`Confidence Level: ${analysis.confidence}%`);
  
  if (analysis.extractionDetails) {
    feedback.push(`Tables Found: ${analysis.extractionDetails.tablesFound}`);
    feedback.push(`Sections Identified: ${analysis.extractionDetails.sectionsIdentified.length}`);
  }
  
  feedback.push('\nSUCCESSFULLY EXTRACTED:');
  if (reportData.tankId && reportData.tankId !== 'Unknown') {
    feedback.push(`✓ Tank ID: ${reportData.tankId}`);
  }
  if (reportData.inspector && reportData.inspector !== 'Unknown') {
    feedback.push(`✓ Inspector: ${reportData.inspector}`);
  }
  if (reportData.inspectionDate) {
    feedback.push(`✓ Inspection Date: ${reportData.inspectionDate}`);
  }
  if (measurements.length > 0) {
    feedback.push(`✓ Thickness Measurements: ${measurements.length} readings`);
  }
  if (analysis.checklistItems && analysis.checklistItems.length > 0) {
    feedback.push(`✓ Checklist Items: ${analysis.checklistItems.length} items`);
  }
  
  if (analysis.extractionDetails?.warnings && analysis.extractionDetails.warnings.length > 0) {
    feedback.push('\nWARNINGS:');
    analysis.extractionDetails.warnings.forEach(w => feedback.push(`⚠ ${w}`));
  }
  
  if (analysis.extractionDetails?.failedExtractions && analysis.extractionDetails.failedExtractions.length > 0) {
    feedback.push('\nCOULD NOT EXTRACT:');
    analysis.extractionDetails.failedExtractions.forEach(f => feedback.push(`✗ ${f}`));
  }
  
  return feedback.join('\n');
}