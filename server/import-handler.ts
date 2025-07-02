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
  
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rowCount = range.e.r - range.s.r + 1;
    
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

  // Use AI to analyze the spreadsheet
  const aiAnalysis = await analyzeSpreadsheetWithOpenRouter(workbook, fileName);
  
  // Process with AI insights
  let { importedData, thicknessMeasurements, checklistItems } = await processSpreadsheetWithAI(workbook, aiAnalysis);

  // If AI analysis has low confidence, enhance with standard parsing
  if (aiAnalysis.confidence < 0.5 && data.length > 0) {
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

      // Look for additional thickness measurements
      const thicknessFields = ['Thickness', 'Current Thickness', 'Measured Thickness', 'Reading'];
      const locationFields = ['Location', 'Position', 'Point', 'Measurement Point'];
      
      for (const thicknessField of thicknessFields) {
        if (rowObj[thicknessField] && !isNaN(parseFloat(rowObj[thicknessField]))) {
          const measurement = {
            location: findFieldValue(rowObj, locationFields) || `Point ${thicknessMeasurements.length + 1}`,
            elevation: rowObj['Elevation'] || '0',
            currentThickness: parseFloat(rowObj[thicknessField]),
            component: 'Shell',
            measurementType: 'shell'
          };
          
          // Check if this measurement already exists
          const exists = thicknessMeasurements.some(m => 
            m.location === measurement.location && 
            m.currentThickness === measurement.currentThickness
          );
          
          if (!exists) {
            thicknessMeasurements.push(measurement);
          }
          break;
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

  return {
    importedData,
    thicknessMeasurements,
    checklistItems,
    aiAnalysis,
    totalRows: data.length,
    preview: data.slice(0, 5)
  };
}