import * as XLSX from "xlsx";
import { analyzeSpreadsheetWithOpenRouter, processSpreadsheetWithAI } from "./openrouter-analyzer";

export async function handleExcelImport(buffer: Buffer, fileName: string) {
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
  const aiAnalysis = await analyzeSpreadsheetWithOpenRouter(workbook, fileName);
  
  // Process with AI insights
  let { importedData, thicknessMeasurements, checklistItems } = await processSpreadsheetWithAI(workbook, aiAnalysis);

  // If AI analysis has low confidence, enhance with standard parsing from ALL sheets
  if (aiAnalysis.confidence < 0.5) {
    console.log('AI confidence low, enhancing with standard parsing from all sheets');
    
    // Process ALL sheets for additional data
    for (const sheetName of workbook.SheetNames) {
      const sheetWorksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheetWorksheet, { defval: '', raw: false });
      
      if (sheetData.length === 0) continue;
      console.log(`Standard parsing sheet "${sheetName}" with ${sheetData.length} rows`);
      
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
                elevation: rowObj['Elevation'] || rowObj['Height'] || '0',
                currentThickness: value,
                component: 'Shell',
                measurementType: 'shell',
                originalThickness: rowObj['Original'] || rowObj['Nominal'] || '0.375',
                createdAt: new Date().toISOString()
              };
              
              thicknessMeasurements.push(measurement);
              console.log(`Found thickness in "${sheetName}": ${measurement.location} = ${measurement.currentThickness}`);
            }
          }
        }
      }
    }
    
    // Process first sheet for main report data
    if (data.length > 0) {
    const fieldPatterns = {
      tankId: ['Tank ID', 'Tank Id', 'TankID', 'Tank Number', 'Tank No', 'Vessel ID'],
      reportNumber: ['Report Number', 'Report No', 'ReportNumber', 'Inspection Report No', 'IR No'],
      service: ['Service', 'Product', 'Contents', 'Stored Product', 'Tank Service'],
      inspector: ['Inspector', 'Inspector Name', 'Inspected By', 'API Inspector', 'Certified Inspector'],
      inspectionDate: ['Date', 'Inspection Date', 'Date of Inspection', 'Inspection Performed'],
      diameter: ['Diameter', 'Tank Diameter', 'Shell Diameter', 'Nominal Diameter'],
      height: ['Height', 'Tank Height', 'Shell Height', 'Overall Height'],
      originalThickness: ['Original Thickness', 'Nominal Thickness', 'Design Thickness', 'Min Thickness'],
      location: ['Location', 'Site', 'Facility', 'Plant Location'],
      owner: ['Owner', 'Client', 'Company', 'Facility Owner'],
      lastInspection: ['Last Inspection', 'Previous Inspection', 'Last Internal Inspection']
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
            
            // Check if column name indicates thickness
            for (const field of thicknessFields) {
              if (keyLower.includes(field.toLowerCase())) {
                isThickness = true;
                break;
              }
            }
            
            // Also check for patterns like "Course 1: 0.375" or numeric columns
            if (!isThickness && (keyLower.includes('course') || keyLower.match(/^\d+$/))) {
              isThickness = true;
            }
            
            if (isThickness) {
              const measurement = {
                location: findFieldValue(rowObj, locationFields) || key || `Point ${thicknessMeasurements.length + 1}`,
                elevation: rowObj['Elevation'] || rowObj['Course'] || '0',
                currentThickness: numValue,
                component: 'Shell',
                measurementType: 'shell',
                originalThickness: rowObj['Original Thickness'] || rowObj['Nominal Thickness'] || '0.375',
                createdAt: new Date().toISOString()
              };
              
              // Check if this measurement already exists
              const exists = thicknessMeasurements.some(m => 
                m.location === measurement.location && 
                Math.abs(m.currentThickness - measurement.currentThickness) < 0.001
              );
              
              if (!exists) {
                thicknessMeasurements.push(measurement);
                console.log(`Found thickness measurement: ${measurement.location} = ${measurement.currentThickness}`);
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
    importedData.tankId = fileName.replace(/\.(xlsx|xls|xlsm)$/i, '') || 'IMPORTED-TANK';
  }
  if (!importedData.inspector) {
    importedData.inspector = 'Imported';
  }
  if (!importedData.service) {
    importedData.service = 'crude oil';
  }
  if (!importedData.inspectionDate) {
    importedData.inspectionDate = new Date().toISOString().split('T')[0];
  }
  
  // Convert numeric fields from strings if necessary
  if (importedData.diameter && typeof importedData.diameter === 'string') {
    const parsed = parseFloat(importedData.diameter);
    importedData.diameter = isNaN(parsed) ? null : parsed;
  }
  if (importedData.height && typeof importedData.height === 'string') {
    const parsed = parseFloat(importedData.height);
    importedData.height = isNaN(parsed) ? null : parsed;
  }
  if (importedData.originalThickness && typeof importedData.originalThickness === 'string') {
    const parsed = parseFloat(importedData.originalThickness);
    importedData.originalThickness = isNaN(parsed) ? null : parsed;
  }
  if (importedData.yearsSinceLastInspection && typeof importedData.yearsSinceLastInspection === 'string') {
    const parsed = parseInt(importedData.yearsSinceLastInspection);
    importedData.yearsSinceLastInspection = isNaN(parsed) ? 10 : parsed;
  }
  
  console.log('Final importedData before return:', JSON.stringify(importedData, null, 2));

  return {
    importedData,
    thicknessMeasurements,
    checklistItems,
    aiAnalysis,
    totalRows: data.length,
    preview: data.slice(0, 5)
  };
}