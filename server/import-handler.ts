import * as XLSX from "xlsx";
import { analyzeExcelWithManus, analyzePDFWithManus } from "./manus-analyzer.ts";
import { analyzeSpreadsheetWithOpenRouter, processSpreadsheetWithAI } from "./openrouter-analyzer.ts";
import { analyzePDFWithOpenRouter, processPDFWithAI } from "./pdf-analyzer.ts";
import { parseLegacyExcelData, convertToSystemFormat } from "./legacy-import-mapper.ts";

export async function handleExcelImport(buffer: Buffer, fileName: string) {
  // Check if this is a PDF file
  if (fileName.toLowerCase().endsWith('.pdf')) {
    return handlePDFImport(buffer, fileName);
  }
  
  // Continue with Excel processing
  // Parse the Excel file
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { 
      type: 'buffer', 
      cellDates: true,
      sheetStubs: true,
      password: ''
    });
  } catch (error) {
    // Try with different settings
    try {
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        raw: true,
        sheetStubs: true
      });
    } catch (secondError) {
      throw new Error("Unable to read Excel file. The file may be corrupted or in an unsupported format.");
    }
  }
  
  // Check if this is a legacy vertical format export
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  if (firstSheetData.length > 0 && firstSheetData[0][0] === 'Report No') {
    console.log('Detected legacy vertical format Excel export');
    
    // Parse using legacy format handler
    const legacyData = parseLegacyExcelData(firstSheetData);
    const { reportData, thicknessMeasurements, repairRecommendations } = convertToSystemFormat(legacyData);
    
    return {
      importedData: reportData,
      thicknessMeasurements,
      checklistItems: [], // Legacy format doesn't have checklist items
      aiAnalysis: {
        reportData,
        thicknessMeasurements,
        checklistItems: [],
        confidence: 1.0,
        mappingSuggestions: {},
        detectedColumns: ['Legacy vertical format detected']
      },
      totalRows: firstSheetData.length,
      preview: firstSheetData.slice(0, 10)
    };
  }

  // Find a sheet with data
  let worksheet = null;
  let sheetName = '';
  
  console.log(`Processing Excel file: ${fileName}`);
  console.log(`Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
  
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rowCount = range.e.r - range.s.r + 1;
    
    console.log(`Sheet "${name}" has ${rowCount} rows`);
    
    if (rowCount > 1) {
      worksheet = sheet;
      sheetName = name;
      break;
    }
  }
  
  if (!worksheet) {
    throw new Error("No data found in any sheet of the Excel file");
  }

  // Parse sheet data
  let data: any[] = [];
  try {
    data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  } catch (e) {
    data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }

  // Handle array format data
  if (data.length > 0 && Array.isArray(data[0])) {
    const headers = data[0] as string[];
    const objectData = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      const obj: any = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          obj[header] = row[index];
        }
      });
      objectData.push(obj);
    }
    
    data = objectData;
  }

  // Use AI to analyze the ENTIRE workbook
  console.log('=== ATTEMPTING AI ANALYSIS ===');
  console.log('Using Manus AI for document analysis');
  console.log('Workbook sheets:', workbook.SheetNames);
  console.log('Filename:', fileName);
  
  let aiAnalysis;
  let usedManus = false;
  
  // Try Manus AI first if available
  if (process.env.MANUS_API_KEY) {
    console.log('Manus API key configured, using Manus AI...');
    try {
      console.log('Calling Manus AI analyzer...');
      aiAnalysis = await analyzeExcelWithManus(workbook, fileName);
      console.log('Manus AI analysis completed');
      console.log('AI Confidence:', aiAnalysis.confidence);
      console.log('AI found measurements:', aiAnalysis.thicknessMeasurements?.length || 0);
      console.log('AI found checklist items:', aiAnalysis.checklistItems?.length || 0);
      usedManus = true;
    } catch (error: any) {
      console.error('=== MANUS AI CALL FAILED ===');
      console.error('Error:', error.message);
      console.log('Falling back to OpenRouter...');
    }
  }
  
  // Fall back to OpenRouter if Manus fails or is not configured
  if (!usedManus && process.env.OPENROUTER_API_KEY) {
    console.log('API Key configured:', !!process.env.OPENROUTER_API_KEY);
    try {
      console.log('Calling OpenRouter AI analyzer...');
      aiAnalysis = await analyzeSpreadsheetWithOpenRouter(workbook, fileName);
      console.log('OpenRouter AI analysis completed');
      console.log('AI Confidence:', aiAnalysis.confidence);
      console.log('AI found measurements:', aiAnalysis.thicknessMeasurements?.length || 0);
    } catch (error: any) {
      console.error('=== OPENROUTER CALL FAILED ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('Stack trace:', error.stack);
      
      // Provide more helpful error message
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.error('AUTHENTICATION ERROR: OpenRouter API key may be invalid or expired');
      } else if (error.message?.includes('429')) {
        console.error('RATE LIMIT ERROR: Too many requests to OpenRouter API');
      } else if (error.message?.includes('timeout')) {
        console.error('TIMEOUT ERROR: OpenRouter API took too long to respond');
      }
    }
  }
  
  // If no AI analysis succeeded, provide empty structure
  if (!aiAnalysis) {
    console.log('No AI analysis available, using standard parsing only...');
    aiAnalysis = {
      reportData: {},
      thicknessMeasurements: [],
      checklistItems: [],
      confidence: 0,
      mappingSuggestions: {},
      detectedColumns: []
    };
  }
  
  // Process with AI insights
  let importedData, thicknessMeasurements, checklistItems;
  
  if (usedManus && aiAnalysis.confidence > 0.3) {
    // Use Manus AI results directly if confidence is reasonable
    importedData = aiAnalysis.reportData || {};
    thicknessMeasurements = aiAnalysis.thicknessMeasurements || [];
    checklistItems = aiAnalysis.checklistItems || [];
  } else {
    // Use OpenRouter processing or standard parsing
    ({ importedData, thicknessMeasurements, checklistItems } = await processSpreadsheetWithAI(workbook, aiAnalysis));
  }
  
  // Enhanced checklist extraction if AI didn't find many
  if (checklistItems.length < 5) {
    console.log('AI found few checklist items, doing enhanced extraction...');
    checklistItems = [...checklistItems, ...extractChecklistFromWorkbook(workbook)];
  }

  // If AI analysis has low confidence, enhance with standard parsing from ALL sheets
  if (aiAnalysis.confidence < 0.5) {
    console.log('=== AI ANALYSIS FAILED OR LOW CONFIDENCE ===');
    console.log('AI confidence:', aiAnalysis.confidence);
    console.log('This means your OpenRouter AI is not working properly!');
    console.log('Falling back to standard parsing from all sheets...');
    
    // Process ALL sheets for additional data and multi-tank detection
    const allSheetData: { [sheetName: string]: any[] } = {};
    const potentialTanks: { [tankId: string]: any } = {};
    
    for (const sheetName of workbook.SheetNames) {
      const sheetWorksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheetWorksheet, { defval: '', raw: false });
      
      if (sheetData.length === 0) continue;
      console.log(`Standard parsing sheet "${sheetName}" with ${sheetData.length} rows`);
      
      allSheetData[sheetName] = sheetData;
      
      // Check if this sheet represents a different tank
      let sheetTankId = null;
      for (const row of sheetData) {
        const rowObj = row as any;
        
        // Look for Tank ID in this sheet
        const tankIdPatterns = [
          'Tank ID', 'Tank Id', 'TankID', 'Tank Number', 'Tank No', 'Tank #', 'Tank No.', 
          'Vessel ID', 'Equipment ID', 'Equip ID', 'EQUIP ID', 'Unit ID', 'Asset ID'
        ];
        
        for (const pattern of tankIdPatterns) {
          const value = rowObj[pattern];
          if (value && String(value).trim()) {
            sheetTankId = String(value).trim();
            break;
          }
        }
        
        if (sheetTankId) {
          if (!potentialTanks[sheetTankId]) {
            potentialTanks[sheetTankId] = { sheetName, data: [] };
          }
          potentialTanks[sheetTankId].data.push(rowObj);
          break;
        }
      }
      
      // If no specific tank ID found, check if sheet name suggests a tank
      if (!sheetTankId) {
        const tankNamePatterns = [
          /tank[_\s-]*([a-zA-Z0-9]+)/i,
          /([a-zA-Z0-9]+)[_\s-]*tank/i,
          /^([a-zA-Z0-9]+)$/
        ];
        
        for (const pattern of tankNamePatterns) {
          const match = sheetName.match(pattern);
          if (match && match[1]) {
            sheetTankId = match[1].toUpperCase();
            console.log(`Detected tank ID from sheet name: "${sheetTankId}"`);
            break;
          }
        }
      }
      
      // Process thickness measurements from this sheet
      for (const row of sheetData) {
        const rowObj = row as any;
        
        // Look for thickness values in any column
        for (const [key, value] of Object.entries(rowObj)) {
          if (typeof value === 'number' && value > 0.05 && value < 3) {
            const location = rowObj['Location'] || rowObj['Course'] || rowObj['Point'] || 
                           rowObj['Elevation'] || key;
            
            const exists = thicknessMeasurements.some(m => 
              m.location === location && 
              Math.abs(m.currentThickness - value) < 0.001
            );
            
            if (!exists) {
              const measurement = {
                location: location,
                elevation: rowObj['Elevation'] || rowObj['Height'] || null,
                currentThickness: String(value),
                component: 'Shell',
                measurementType: 'shell',
                originalThickness: rowObj['Original'] || rowObj['Nominal'] ? String(rowObj['Original'] || rowObj['Nominal']) : null,
                createdAt: new Date().toISOString(),
                sourceSheet: sheetName,
                sourceTankId: sheetTankId
              };
              
              thicknessMeasurements.push(measurement);
              console.log(`Found thickness in "${sheetName}": ${measurement.location} = ${measurement.currentThickness}`);
            }
          }
        }
      }
    }
    
    // Log multi-tank detection results
    const tankCount = Object.keys(potentialTanks).length;
    if (tankCount > 1) {
      console.log(`=== MULTI-TANK WORKBOOK DETECTED ===`);
      console.log(`Found ${tankCount} potential tanks:`, Object.keys(potentialTanks));
      // Process each tank separately
      const multiTankImports = [];
      for (const [tankId, tankInfo] of Object.entries(potentialTanks)) {
        const tankData = tankInfo.data;
        let tankImportedData = { ...importedData, tankId };
        // Map findings and other fields for each tank
        for (const row of tankData) {
          if (row['Findings'] && !tankImportedData.findings) {
            tankImportedData.findings = row['Findings'];
          }
          if (row['Report Write Up'] && !tankImportedData.findings) {
            tankImportedData.findings = row['Report Write Up'];
          }
        }
        multiTankImports.push({ importedData: tankImportedData, thicknessMeasurements, checklistItems });
      }
      // Return multi-tank import result
      return {
        multiTankImports,
        aiAnalysis,
        totalRows: data.length,
        preview: data.slice(0, 5)
      };
    }
    
    // Process first sheet for main report data
    if (data.length > 0) {
    const fieldPatterns = {
      tankId: ['Tank ID', 'Tank Id', 'TankID', 'Tank Number', 'Tank No', 'Vessel ID', 'Equipment ID', 'Equip ID', 'EQUIP ID'],
      reportNumber: ['Report Number', 'Report No', 'ReportNumber', 'Inspection Report No', 'IR No'],
      service: ['Service', 'Product', 'Contents', 'Stored Product', 'Tank Service'],
      inspector: ['Inspector', 'Inspector Name', 'Inspected By', 'API Inspector', 'Certified Inspector'],
      inspectionDate: ['Date', 'Inspection Date', 'Date of Inspection', 'Inspection Performed'],
      diameter: ['Diameter', 'Tank Diameter', 'Shell Diameter', 'Nominal Diameter'],
      height: ['Height', 'Tank Height', 'Shell Height', 'Overall Height'],
      originalThickness: ['Original Thickness', 'Nominal Thickness', 'Design Thickness', 'Min Thickness'],
      location: ['Location', 'Site', 'Facility', 'Plant Location'],
      owner: ['Owner', 'Client', 'Company', 'Facility Owner'],
      lastInspection: ['Last Inspection', 'Previous Inspection', 'Last Internal Inspection'],
      findings: ['Findings', 'Report Write Up', 'Write Up', 'Report Summary', 'Inspection Findings'],
      reportWriteUp: ['Report Write Up', 'REPORT WRITE UP', 'Report Writeup', 'Write Up'],
      executiveSummary: ['Executive Summary', 'EXECUTIVE SUMMARY', 'Summary'],
      repairRecommendations: ['Repair Recommendations', 'REPAIR RECOMMENDATIONS', 'Recommendations'],
      nextInspectionDate: ['Next Inspection Date', 'NEXT INSPECTION DATE', 'Next Inspection']
    };

    const findFieldValue = (rowObj: any, patterns: string[]) => {
      for (const pattern of patterns) {
        if (rowObj[pattern] !== undefined && rowObj[pattern] !== null && rowObj[pattern] !== '') {
          return rowObj[pattern];
        }
      }
      return null;
    };

    // Enhance data with standard parsing
    for (const row of data) {
      const rowObj = row as any;
      
      // Extract main report fields
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        const value = findFieldValue(rowObj, patterns);
        if (value && !importedData[field]) {
          if (field === 'inspectionDate' || field === 'lastInspection') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              importedData[field] = date.toISOString().split('T')[0];
            }
          } else if (field === 'service') {
            importedData[field] = String(value).toLowerCase();
          } else if (field === 'findings') {
            // Store findings but don't overwrite if already found
            if (!importedData.findings) {
              importedData.findings = String(value);
            }
          } else if (field === 'reportWriteUp') {
            // Store the comprehensive report write up
            importedData.reportWriteUp = String(value);
            // Also use it as findings if findings not already set
            if (!importedData.findings) {
              importedData.findings = String(value);
            }
          } else {
            importedData[field] = String(value);
          }
        }
      }

      // Look for additional thickness measurements - expanded patterns
      const thicknessFields = [
        'Thickness', 'Current Thickness', 'Measured Thickness', 'Reading',
        'Shell Thickness', 'Actual Thickness', 'UT Reading', 'Minimum Thickness',
        'Course 1', 'Course 2', 'Course 3', 'Course 4', 'Course 5', 
        'Course 6', 'Course 7', 'Course 8', 'Course 9', 'Course 10'
      ];
      const locationFields = ['Location', 'Position', 'Point', 'Measurement Point', 'Course', 'Elevation'];
      
      // Check each potential thickness field
      for (const key of Object.keys(rowObj)) {
        const value = rowObj[key];
        const keyLower = key.toLowerCase();

        // Check if this is a thickness value
        if (value && !isNaN(parseFloat(value))) {
          const numValue = parseFloat(value);

          // Typical thickness range for steel tanks (0.1 to 2 inches)
          if (numValue > 0.05 && numValue < 3) {
            let isThickness = false;
            let component = 'Shell';
            let measurementType = 'shell';

            // Check if column name indicates thickness
            for (const field of thicknessFields) {
              if (keyLower.includes(field.toLowerCase())) {
                isThickness = true;
                break;
              }
            }

            // Detect component type from column name
            if (keyLower.includes('bottom')) {
              component = 'Bottom Plate';
              measurementType = 'bottom_plate';
              isThickness = true;
            } else if (keyLower.includes('critical')) {
              component = 'Critical Zone';
              measurementType = 'critical_zone';
              isThickness = true;
            } else if (keyLower.includes('appurtenance')) {
              component = 'Appurtenance';
              measurementType = 'appurtenance';
              isThickness = true;
            } else if (keyLower.includes('roof')) {
              component = 'Roof';
              measurementType = 'roof';
              isThickness = true;
            }

            // Also check for patterns like "Course 1: 0.375" or numeric columns
            if (!isThickness && (keyLower.includes('course') || keyLower.match(/^\d+$/))) {
              isThickness = true;
            }

            if (isThickness) {
              const measurement = {
                location: findFieldValue(rowObj, locationFields) || key || `Point ${thicknessMeasurements.length + 1}`,
                elevation: rowObj['Elevation'] || rowObj['Course'] || '0',
                currentThickness: String(numValue),
                component,
                measurementType,
                originalThickness: String(rowObj['Original Thickness'] || rowObj['Nominal Thickness'] || '0.375'),
                createdAt: new Date().toISOString()
              };

              // Check if this measurement already exists
              const exists = thicknessMeasurements.some(m =>
                m.location === measurement.location &&
                Math.abs(parseFloat(m.currentThickness) - parseFloat(measurement.currentThickness)) < 0.001 &&
                m.component === measurement.component
              );

              if (!exists) {
                // Calculate corrosion rate, remaining life, and status
                const originalThicknessNum = typeof measurement.originalThickness === 'number' ? measurement.originalThickness : parseFloat(measurement.originalThickness) || 0;
                const currentThicknessNum = typeof measurement.currentThickness === 'number' ? measurement.currentThickness : parseFloat(measurement.currentThickness) || 0;
                // Estimate age from inspection date if available
                let ageInYears = 1;
                if (importedData.inspectionDate && importedData.lastInspection) {
                  const last = new Date(importedData.lastInspection);
                  const current = new Date(importedData.inspectionDate);
                  if (!isNaN(last.getTime()) && !isNaN(current.getTime())) {
                    ageInYears = Math.max(1, (current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 365));
                  }
                }
                // Minimum required thickness (default to 0.1 if not available)
                let minimumRequired = 0.1;
                if (measurement.component === 'Shell' && importedData.diameter) {
                  try {
                    const { calculateMinimumRequiredThickness } = require('./api653-calculations');
                    minimumRequired = calculateMinimumRequiredThickness(
                      1,
                      parseFloat(importedData.diameter) || 10,
                      1,
                      parseFloat(importedData.height) || 10
                    );
                  } catch {}
                }
                // Calculate corrosion rate
                let corrosionRate = 0, corrosionRateMPY = 0;
                try {
                  const { calculateCorrosionRate } = require('./api653-calculations');
                  const rates = calculateCorrosionRate(originalThicknessNum, currentThicknessNum, ageInYears);
                  corrosionRate = rates.rateInchesPerYear;
                  corrosionRateMPY = rates.rateMPY;
                } catch {}
                // Calculate remaining life
                let remainingLife = 999;
                try {
                  const { calculateRemainingLife } = require('./api653-calculations');
                  remainingLife = calculateRemainingLife(currentThicknessNum, minimumRequired, corrosionRate);
                } catch {}
                // Determine status
                let status = 'acceptable';
                try {
                  const { determineInspectionStatus } = require('./api653-calculations');
                  status = determineInspectionStatus(remainingLife, currentThicknessNum, minimumRequired);
                } catch {}
                const measurementWithCalc = {
                  ...measurement,
                  thicknessLoss: String(originalThicknessNum - currentThicknessNum),
                  corrosionRate: String(corrosionRate),
                  corrosionRateMPY: String(corrosionRateMPY),
                  remainingLife: String(remainingLife),
                  status
                };
                thicknessMeasurements.push(measurementWithCalc);
                console.log(`Found thickness measurement: [${measurement.component}] ${measurement.location} = ${measurement.currentThickness} | corrosionRate=${corrosionRate}, remainingLife=${remainingLife}, status=${status}`);
              }
            }
          }
        }
      }
    }
    }
  }

  // Calculate years since last inspection
  if (importedData.inspectionDate && importedData.lastInspection) {
    const currentDate = new Date(importedData.inspectionDate);
    const lastDate = new Date(importedData.lastInspection);
    const yearsDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    importedData.yearsSinceLastInspection = Math.round(yearsDiff);
  }

  // Set defaults
  if (!importedData.reportNumber) {
    importedData.reportNumber = `IMP-${Date.now()}`;
  }
  if (!importedData.status) {
    importedData.status = 'draft';
  }
  if (!importedData.yearsSinceLastInspection) {
    importedData.yearsSinceLastInspection = 10;
  }
  
  // Ensure all required fields are present
  const now = new Date().toISOString();
  if (!importedData.createdAt) {
    importedData.createdAt = now;
  }
  if (!importedData.updatedAt) {
    importedData.updatedAt = now;
  }
  
  // Ensure essential fields have default values if missing
  if (!importedData.tankId) {
    // Try to extract Tank ID from the data first, then fall back to filename
    let extractedTankId = null;
    
    // Look for Tank ID in the data with enhanced patterns
    const tankIdPatterns = [
      'Tank ID', 'Tank Id', 'TankID', 'Tank Number', 'Tank No', 'Tank #', 'Tank No.', 
      'Vessel ID', 'Equipment ID', 'Equip ID', 'EQUIP ID', 'Unit ID', 'Asset ID', 
      'Equipment No.', 'Unit Number', 'Asset Number', 'Tank', 'Unit', 'Equipment'
    ];
    
    // Search through all data rows for Tank ID
    for (const row of data) {
      const rowObj = row as any;
      for (const pattern of tankIdPatterns) {
        const value = rowObj[pattern];
        if (value && String(value).trim() && String(value).trim() !== '') {
          extractedTankId = String(value).trim();
          console.log(`Found Tank ID in data: "${extractedTankId}" from field "${pattern}"`);
          break;
        }
      }
      if (extractedTankId) break;
    }
    
    // If no Tank ID found in data, try to extract from filename intelligently
    if (!extractedTankId) {
      const cleanFileName = fileName.replace(/\.(xlsx|xls|xlsm)$/i, '');
      
      // Try to extract tank-like patterns from filename
      const tankPatterns = [
        /tank[_\s-]*([a-zA-Z0-9]+)/i,
        /([a-zA-Z0-9]+)[_\s-]*tank/i,
        /^([a-zA-Z0-9]+)[_\s-]/,
        /[_\s-]([a-zA-Z0-9]+)$/,
        /^([a-zA-Z0-9]+)$/
      ];
      
      for (const pattern of tankPatterns) {
        const match = cleanFileName.match(pattern);
        if (match && match[1] && match[1].length > 0) {
          extractedTankId = match[1].toUpperCase();
          console.log(`Extracted Tank ID from filename: "${extractedTankId}"`);
          break;
        }
      }
    }
    
    importedData.tankId = extractedTankId || fileName.replace(/\.(xlsx|xls|xlsm)$/i, '') || 'IMPORTED-TANK';
    console.log(`Final Tank ID: "${importedData.tankId}"`);
  }
  if (!importedData.inspector) {
    importedData.inspector = 'Imported';
  }
  if (!importedData.service) {
    // Standardize service type mapping
    const serviceMapping: { [key: string]: string } = {
      'crude': 'crude_oil',
      'crude oil': 'crude_oil',
      'crude_oil': 'crude_oil',
      'diesel': 'diesel',
      'gasoline': 'gasoline',
      'gas': 'gasoline',
      'petrol': 'gasoline',
      'fuel': 'diesel',
      'heating oil': 'heating_oil',
      'jet fuel': 'jet_fuel',
      'kerosene': 'kerosene',
      'water': 'water',
      'chemical': 'chemical',
      'other': 'other'
    };
    
    // Try to detect service from other fields
    let detectedService = 'crude_oil'; // Default
    
    // Check product field or other related fields
    const productFields = ['product', 'contents', 'service', 'stored product', 'material'];
    for (const row of data) {
      const rowObj = row as any;
      for (const field of productFields) {
        const value = rowObj[field];
        if (value && String(value).trim()) {
          const normalizedValue = String(value).toLowerCase().trim();
          for (const [key, standardValue] of Object.entries(serviceMapping)) {
            if (normalizedValue.includes(key)) {
              detectedService = standardValue;
              console.log(`Detected service type: "${detectedService}" from "${value}"`);
              break;
            }
          }
          if (detectedService !== 'crude_oil') break;
        }
      }
      if (detectedService !== 'crude_oil') break;
    }
    
    importedData.service = detectedService;
  } else {
    // Standardize existing service value
    const normalizedService = String(importedData.service).toLowerCase().trim();
    const serviceMapping: { [key: string]: string } = {
      'crude': 'crude_oil',
      'crude oil': 'crude_oil',
      'crude_oil': 'crude_oil',
      'diesel': 'diesel',
      'gasoline': 'gasoline',
      'gas': 'gasoline',
      'petrol': 'gasoline',
      'fuel': 'diesel',
      'heating oil': 'heating_oil',
      'jet fuel': 'jet_fuel',
      'kerosene': 'kerosene',
      'water': 'water',
      'chemical': 'chemical',
      'other': 'other'
    };
    
    importedData.service = serviceMapping[normalizedService] || normalizedService;
  }
  if (!importedData.inspectionDate) {
    importedData.inspectionDate = new Date().toISOString().split('T')[0];
  }
  
  // Convert numeric fields from strings if necessary - handle units in values
  const parseNumericWithUnits = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    
    // Convert to string and remove common units
    const cleaned = String(value)
      .replace(/\s*(ft|feet|ft\.|in|inches|in\.|gal|gallons|bbl|barrels|years|yrs|yr)\.?\s*$/i, '')
      .replace(/[^\d.-]/g, '') // Remove any non-numeric characters except dots and minus
      .trim();
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };
  
  // Process all numeric fields
  if (importedData.diameter !== undefined) {
    importedData.diameter = parseNumericWithUnits(importedData.diameter);
    console.log(`Parsed diameter: ${importedData.diameter}`);
  }
  if (importedData.height !== undefined) {
    importedData.height = parseNumericWithUnits(importedData.height);
    console.log(`Parsed height: ${importedData.height}`);
  }
  if (importedData.originalThickness !== undefined) {
    importedData.originalThickness = parseNumericWithUnits(importedData.originalThickness);
    console.log(`Parsed originalThickness: ${importedData.originalThickness}`);
  }
  if (importedData.yearsSinceLastInspection !== undefined) {
    const parsed = parseNumericWithUnits(importedData.yearsSinceLastInspection);
    importedData.yearsSinceLastInspection = parsed ? Math.round(parsed) : 1;
    console.log(`Parsed yearsSinceLastInspection: ${importedData.yearsSinceLastInspection}`);
  }
  
  // Also parse capacity and other numeric fields if they exist
  if (importedData.capacity !== undefined) {
    importedData.capacity = parseNumericWithUnits(importedData.capacity);
  }
  if (importedData.specificGravity !== undefined) {
    importedData.specificGravity = parseNumericWithUnits(importedData.specificGravity);
  }
  if (importedData.yearBuilt !== undefined) {
    importedData.yearBuilt = parseNumericWithUnits(importedData.yearBuilt);
  }
  
  // Final processing of thickness measurements to ensure proper data types
  const processedMeasurements = thicknessMeasurements.map((measurement, index) => {
    const processed = { ...measurement };
    
    // Convert all numeric fields
    if (processed.currentThickness !== undefined) {
      const value = parseNumericWithUnits(processed.currentThickness);
      processed.currentThickness = value || 0;
    }
    if (processed.originalThickness !== undefined) {
      processed.originalThickness = parseNumericWithUnits(processed.originalThickness);
    }
    if (processed.corrosionRate !== undefined) {
      processed.corrosionRate = parseNumericWithUnits(processed.corrosionRate);
    }
    if (processed.remainingLife !== undefined) {
      processed.remainingLife = parseNumericWithUnits(processed.remainingLife);
    }
    
    // Ensure required fields
    if (!processed.component) processed.component = 'Shell';
    if (!processed.location) processed.location = `Location ${index + 1}`;
    if (!processed.measurementType) processed.measurementType = 'shell';
    if (!processed.createdAt) processed.createdAt = now;
    
    return processed;
  });
  
  console.log('Final importedData before return:', JSON.stringify(importedData, null, 2));
  console.log(`Processed ${processedMeasurements.length} thickness measurements`);

  // Ensure all expected sections are present in importedData
  const expectedSections = [
    'nde', 'settlement', 'checklistItems', 'appurtenances', 'vents', 'recommendations',
    'sketches', 'dates', 'findings', 'reportWriteUp', 'executiveSummary', 'repairRecommendations',
    'thicknessMeasurements', 'owner', 'service', 'inspector', 'inspectionDate', 'diameter', 'height',
    'originalThickness', 'location', 'lastInspection', 'nextInspectionDate', 'capacity', 'specificGravity', 'yearBuilt'
  ];
  for (const section of expectedSections) {
    if (importedData[section] === undefined) {
      // Use empty array for plural/collection sections, empty string for text, empty object for others
      if ([
        'nde', 'settlement', 'checklistItems', 'appurtenances', 'vents', 'recommendations',
        'sketches', 'dates', 'thicknessMeasurements'
      ].includes(section)) {
        importedData[section] = [];
      } else if ([
        'findings', 'reportWriteUp', 'executiveSummary', 'repairRecommendations',
        'owner', 'service', 'inspector', 'inspectionDate', 'diameter', 'height',
        'originalThickness', 'location', 'lastInspection', 'nextInspectionDate', 'capacity', 'specificGravity', 'yearBuilt'
      ].includes(section)) {
        importedData[section] = '';
      } else {
        importedData[section] = {};
      }
    }
  }
  // Also ensure checklistItems and thicknessMeasurements are always arrays
  return {
    importedData,
    thicknessMeasurements: Array.isArray(processedMeasurements) ? processedMeasurements : [],
    checklistItems: Array.isArray(checklistItems) ? checklistItems : [],
    aiAnalysis,
    totalRows: data.length,
    preview: data.slice(0, 5)
  };
}

// Enhanced checklist extraction function
function extractChecklistFromWorkbook(workbook: XLSX.WorkBook): any[] {
  const checklistItems: any[] = [];
  const checklistPatterns = [
    // Common inspection checklist items
    /external.*(?:coating|shell|foundation|nozzle|stairway|platform|ladder|handrail)/i,
    /internal.*(?:shell|floor|bottom|roof|support|column|floating roof)/i,
    /foundation.*(?:settlement|cracking|sealing|drainage|ringwall|concrete)/i,
    /shell.*(?:corrosion|coating|weld|seam|course|plate|thickness|bulge|dent)/i,
    /roof.*(?:deck|seal|drain|vent|rafter|column|pontoon|rim)/i,
    /nozzle.*(?:flange|gasket|bolt|repad|reinforcement|pipe)/i,
    /safety.*(?:equipment|valve|gauge|alarm|relief|pressure|vacuum)/i,
    /containment.*(?:wall|floor|drain|sump|dike|secondary)/i,
    /appurtenance|manway|mixer|gauge|level|temperature|sample/i,
    /grounding|bonding|cathodic|anode|insulation|fireproofing/i
  ];
  
  // Status indicators
  const statusPatterns = {
    satisfactory: /✓|✔|☑|S\b|SAT|satisfactory|good|acceptable|ok|pass/i,
    unsatisfactory: /✗|✘|☒|X|U\b|UNSAT|unsatisfactory|poor|unacceptable|fail/i,
    not_applicable: /N\/A|NA|not applicable|n\.a\.|not required/i,
    monitor: /M\b|MON|monitor|watch|observe|track/i
  };
  
  for (const sheetName of workbook.SheetNames) {
    // Skip sheets that are unlikely to contain checklists
    if (sheetName.toLowerCase().includes('thickness') || 
        sheetName.toLowerCase().includes('measurement') ||
        sheetName.toLowerCase().includes('tml')) {
      continue;
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    let currentCategory = 'General';
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Check if this row is a category header
      const firstCell = String(row[0] || '').trim();
      if (firstCell) {
        if (firstCell.toLowerCase().includes('external')) currentCategory = 'External Inspection';
        else if (firstCell.toLowerCase().includes('internal')) currentCategory = 'Internal Inspection';
        else if (firstCell.toLowerCase().includes('foundation')) currentCategory = 'Foundation';
        else if (firstCell.toLowerCase().includes('shell')) currentCategory = 'Shell';
        else if (firstCell.toLowerCase().includes('roof')) currentCategory = 'Roof';
        else if (firstCell.toLowerCase().includes('bottom') || firstCell.toLowerCase().includes('floor')) currentCategory = 'Bottom/Floor';
        else if (firstCell.toLowerCase().includes('nozzle')) currentCategory = 'Nozzles';
        else if (firstCell.toLowerCase().includes('appurtenance')) currentCategory = 'Appurtenances';
        else if (firstCell.toLowerCase().includes('containment')) currentCategory = 'Containment';
        else if (firstCell.toLowerCase().includes('safety')) currentCategory = 'Safety Equipment';
      }
      
      // Check if this row contains a checklist item
      const rowText = row.join(' ').toLowerCase();
      for (const pattern of checklistPatterns) {
        if (pattern.test(rowText)) {
          // Extract the item description
          let itemText = '';
          let status = 'not_applicable';
          let notes = '';
          
          // Try to find the main description (usually first non-empty cell)
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').trim();
            if (cell && !itemText && cell.length > 3) {
              itemText = cell;
            }
            
            // Check for status indicators
            for (const [statusKey, statusPattern] of Object.entries(statusPatterns)) {
              if (statusPattern.test(cell)) {
                status = statusKey;
                break;
              }
            }
            
            // Collect any notes (cells after status)
            if (j > 1 && cell && cell.length > 10) {
              notes = cell;
            }
          }
          
          if (itemText && itemText.length > 5) {
            // Check if we already have this item
            const exists = checklistItems.some(item => 
              item.item.toLowerCase() === itemText.toLowerCase()
            );
            
            if (!exists) {
              checklistItems.push({
                category: currentCategory,
                item: itemText,
                status: status,
                notes: notes
              });
              console.log(`Found checklist item: ${currentCategory} - ${itemText} [${status}]`);
            }
          }
          break; // Only match once per row
        }
      }
    }
  }
  
  // If we still don't have many items, add standard inspection items
  if (checklistItems.length < 10) {
    const standardItems = [
      { category: 'External Inspection', item: 'Shell external coating condition', status: 'satisfactory' },
      { category: 'External Inspection', item: 'Foundation settlement and level', status: 'satisfactory' },
      { category: 'External Inspection', item: 'Nozzles and appurtenances', status: 'satisfactory' },
      { category: 'External Inspection', item: 'Grounding and cathodic protection', status: 'satisfactory' },
      { category: 'Shell', item: 'Shell plate condition and corrosion', status: 'satisfactory' },
      { category: 'Shell', item: 'Weld seams and heat affected zones', status: 'satisfactory' },
      { category: 'Foundation', item: 'Concrete ringwall condition', status: 'satisfactory' },
      { category: 'Foundation', item: 'Chime area sealing', status: 'satisfactory' },
      { category: 'Containment', item: 'Secondary containment integrity', status: 'satisfactory' },
      { category: 'Safety Equipment', item: 'Pressure/vacuum relief valves', status: 'satisfactory' }
    ];
    
    for (const item of standardItems) {
      const exists = checklistItems.some(existing => 
        existing.item.toLowerCase() === item.item.toLowerCase()
      );
      if (!exists) {
        checklistItems.push(item);
      }
    }
  }
  
  return checklistItems;
}

export async function handlePDFImport(buffer: Buffer, fileName: string) {
  console.log('=== PDF Import Request ===');
  console.log('Processing PDF file:', fileName);
  console.log('File size:', buffer.length, 'bytes');
  
  try {
    // Use AI to analyze the PDF
    console.log('=== ATTEMPTING AI PDF ANALYSIS ===');
    console.log('Filename:', fileName);
    
    let pdfAnalysis;
    let usedManus = false;
    
    // Try Manus AI first if available
    if (process.env.MANUS_API_KEY) {
      console.log('Manus API key configured, using Manus AI for PDF analysis...');
      try {
        console.log('Calling Manus PDF analyzer...');
        
        // First extract text from PDF for Manus
        const pdfjs = await import('pdf-parse');
        const pdfData = await pdfjs.default(buffer);
        const extractedText = pdfData.text || '';
        
        // Use Manus AI to analyze the PDF content
        pdfAnalysis = await analyzePDFWithManus(extractedText, fileName, {
          pages: pdfData.numpages,
          info: pdfData.info,
          metadata: pdfData.metadata
        });
        
        console.log('Manus PDF analysis completed');
        console.log('AI Confidence:', pdfAnalysis.confidence);
        console.log('AI found measurements:', pdfAnalysis.thicknessMeasurements?.length || 0);
        console.log('AI found checklist items:', pdfAnalysis.checklistItems?.length || 0);
        usedManus = true;
      } catch (error: any) {
        console.error('=== MANUS PDF ANALYSIS FAILED ===');
        console.error('Error:', error.message);
        console.log('Falling back to OpenRouter...');
      }
    }
    
    // Fall back to OpenRouter if Manus fails or is not configured
    if (!usedManus && process.env.OPENROUTER_API_KEY) {
      try {
        console.log('Calling OpenRouter PDF analyzer...');
        pdfAnalysis = await analyzePDFWithOpenRouter(buffer, fileName);
        console.log('OpenRouter PDF analysis completed');
      } catch (error) {
        console.error('=== OPENROUTER PDF ANALYSIS FAILED ===');
        console.error('Error calling analyzePDFWithOpenRouter:', error);
      }
    }
    
    // If no AI analysis succeeded, provide empty structure
    if (!pdfAnalysis) {
      console.log('No AI analysis available, using basic PDF parsing...');
      pdfAnalysis = {
        reportData: {},
        thicknessMeasurements: [],
        checklistItems: [],
        confidence: 0,
        mappingSuggestions: {},
        detectedFields: [],
        extractedText: ''
      };
    }
    
    // Process PDF with AI insights
    let importedData, thicknessMeasurements, checklistItems, totalPages, preview, aiAnalysis;
    
    if (usedManus && pdfAnalysis.confidence > 0.3) {
      // Use Manus AI results directly if confidence is reasonable
      importedData = pdfAnalysis.reportData || {};
      thicknessMeasurements = pdfAnalysis.thicknessMeasurements || [];
      checklistItems = pdfAnalysis.checklistItems || [];
      totalPages = pdfAnalysis.extractionDetails?.tablesFound || 1;
      preview = pdfAnalysis.extractedText?.substring(0, 1000) || '';
      aiAnalysis = pdfAnalysis;
    } else {
      // Use OpenRouter processing or standard parsing
      ({ importedData, thicknessMeasurements, checklistItems, totalPages, preview, aiAnalysis } = await processPDFWithAI(pdfAnalysis));
    }
    
    console.log('=== FINAL PDF IMPORT DATA VALIDATION ===');
    console.log('Tank ID:', importedData.tankId, 'Type:', typeof importedData.tankId);
    console.log('Service:', importedData.service, 'Type:', typeof importedData.service);
    console.log('Inspector:', importedData.inspector, 'Type:', typeof importedData.inspector);
    console.log('Total Measurements:', thicknessMeasurements.length);
    console.log('Total Checklist Items:', checklistItems.length);
    console.log('Total Pages:', totalPages);
    
    if (aiAnalysis.confidence >= 0.3) {
      console.log('=== AI ANALYSIS SUCCESSFUL ===');
      console.log('AI confidence:', aiAnalysis.confidence);
      console.log(usedManus ? 'Manus AI successfully analyzed the PDF!' : 'OpenRouter AI successfully analyzed the PDF!');
    } else {
      console.log('=== AI ANALYSIS FAILED OR LOW CONFIDENCE ===');
      console.log('AI confidence:', aiAnalysis.confidence);
      console.log('AI could not analyze the PDF properly, using basic parsing...');
    }
    
    // Ensure all expected sections are present in importedData
    const expectedSections = [
      'nde', 'settlement', 'checklistItems', 'appurtenances', 'vents', 'recommendations',
      'sketches', 'dates', 'findings', 'reportWriteUp', 'executiveSummary', 'repairRecommendations',
      'thicknessMeasurements', 'owner', 'service', 'inspector', 'inspectionDate', 'diameter', 'height',
      'originalThickness', 'location', 'lastInspection', 'nextInspectionDate', 'capacity', 'specificGravity', 'yearBuilt'
    ];
    for (const section of expectedSections) {
      if (importedData[section] === undefined) {
        if ([
          'nde', 'settlement', 'checklistItems', 'appurtenances', 'vents', 'recommendations',
          'sketches', 'dates', 'thicknessMeasurements'
        ].includes(section)) {
          importedData[section] = [];
        } else if ([
          'findings', 'reportWriteUp', 'executiveSummary', 'repairRecommendations',
          'owner', 'service', 'inspector', 'inspectionDate', 'diameter', 'height',
          'originalThickness', 'location', 'lastInspection', 'nextInspectionDate', 'capacity', 'specificGravity', 'yearBuilt'
        ].includes(section)) {
          importedData[section] = '';
        } else {
          importedData[section] = {};
        }
      }
    }
    return {
      importedData,
      thicknessMeasurements: Array.isArray(thicknessMeasurements) ? thicknessMeasurements : [],
      checklistItems: Array.isArray(checklistItems) ? checklistItems : [],
      totalRows: totalPages,
      preview,
      aiAnalysis
    };
    
  } catch (error) {
    console.error('PDF import error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  throw error;
}
}
