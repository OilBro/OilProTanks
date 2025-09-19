import XLSX from 'xlsx';
import fs from 'fs';

// Read the template
console.log('Reading template file...');
const workbook = XLSX.readFile('template_test.xlsx');

// Display sheet information
console.log('\n=== Template Structure ===');
console.log('Sheet names:', workbook.SheetNames);

// Examine each sheet
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Show first 10 rows of each sheet
  console.log(`Rows: ${data.length}`);
  data.slice(0, 10).forEach((row, idx) => {
    if (row.some(cell => cell !== undefined && cell !== '')) {
      console.log(`Row ${idx + 1}:`, row.slice(0, 5).map(cell => 
        cell === undefined ? '(empty)' : String(cell).substring(0, 30)
      ));
    }
  });
});

// Now fill in the template with realistic tank inspection data
console.log('\n\n=== Filling Template with Test Data ===');

// Fill Basic Information sheet
const basicSheet = workbook.Sheets['Basic Information'];
if (basicSheet) {
  // Tank ID
  basicSheet['B5'] = { t: 's', v: 'TK-101' };
  // Service/Product
  basicSheet['B6'] = { t: 's', v: 'Crude Oil' };
  // Location/Facility
  basicSheet['B7'] = { t: 's', v: 'Houston Terminal' };
  // Owner/Client
  basicSheet['B8'] = { t: 's', v: 'OilPro Energy Corp' };
  
  // Tank Specifications
  basicSheet['B11'] = { t: 'n', v: 50 }; // Diameter
  basicSheet['B12'] = { t: 'n', v: 40 }; // Height
  basicSheet['B13'] = { t: 'n', v: 25000 }; // Capacity
  basicSheet['B14'] = { t: 'n', v: 1995 }; // Year Built
  basicSheet['B15'] = { t: 's', v: 'API-650' }; // Construction Code
  
  // Inspection Details
  basicSheet['B18'] = { t: 's', v: 'John Smith' }; // Inspector
  basicSheet['B19'] = { t: 's', v: '2025-09-19' }; // Date
  basicSheet['B20'] = { t: 's', v: 'INSP-2025-001' }; // Report Number
  basicSheet['B21'] = { t: 's', v: '12345' }; // API Cert
  basicSheet['B22'] = { t: 'n', v: 5 }; // Years Since Last
  
  // Material Information
  basicSheet['B25'] = { t: 's', v: 'A36' }; // Shell Material
  basicSheet['B26'] = { t: 'n', v: 0.375 }; // Original Shell Thickness
  basicSheet['B27'] = { t: 's', v: 'Cone' }; // Roof Type
  basicSheet['B28'] = { t: 's', v: 'Concrete Ring' }; // Foundation
  
  console.log('✓ Filled Basic Information sheet');
}

// Fill Shell Thickness sheet
const shellSheet = workbook.Sheets['Shell Thickness'];
if (shellSheet) {
  // Course 1 measurements (thickest at bottom)
  shellSheet['B5'] = { t: 'n', v: 0.365 }; // North
  shellSheet['C5'] = { t: 'n', v: 0.358 }; // South
  shellSheet['D5'] = { t: 'n', v: 0.362 }; // East
  shellSheet['E5'] = { t: 'n', v: 0.360 }; // West
  shellSheet['F5'] = { t: 'n', v: 0.364 }; // NE
  shellSheet['G5'] = { t: 'n', v: 0.359 }; // NW
  shellSheet['H5'] = { t: 'n', v: 0.361 }; // SE
  shellSheet['I5'] = { t: 'n', v: 0.363 }; // SW
  
  // Course 2 measurements
  shellSheet['B6'] = { t: 'n', v: 0.362 };
  shellSheet['C6'] = { t: 'n', v: 0.355 };
  shellSheet['D6'] = { t: 'n', v: 0.358 };
  shellSheet['E6'] = { t: 'n', v: 0.357 };
  shellSheet['F6'] = { t: 'n', v: 0.360 };
  shellSheet['G6'] = { t: 'n', v: 0.356 };
  shellSheet['H6'] = { t: 'n', v: 0.359 };
  shellSheet['I6'] = { t: 'n', v: 0.361 };
  
  // Course 3 measurements
  shellSheet['B7'] = { t: 'n', v: 0.298 };
  shellSheet['C7'] = { t: 'n', v: 0.295 };
  shellSheet['D7'] = { t: 'n', v: 0.301 };
  shellSheet['E7'] = { t: 'n', v: 0.299 };
  shellSheet['F7'] = { t: 'n', v: 0.302 };
  shellSheet['G7'] = { t: 'n', v: 0.296 };
  shellSheet['H7'] = { t: 'n', v: 0.300 };
  shellSheet['I7'] = { t: 'n', v: 0.297 };
  
  // Course 4 measurements
  shellSheet['B8'] = { t: 'n', v: 0.295 };
  shellSheet['C8'] = { t: 'n', v: 0.292 };
  shellSheet['D8'] = { t: 'n', v: 0.298 };
  shellSheet['E8'] = { t: 'n', v: 0.296 };
  shellSheet['F8'] = { t: 'n', v: 0.299 };
  shellSheet['G8'] = { t: 'n', v: 0.293 };
  shellSheet['H8'] = { t: 'n', v: 0.297 };
  shellSheet['I8'] = { t: 'n', v: 0.294 };
  
  // Course 5 measurements
  shellSheet['B9'] = { t: 'n', v: 0.243 };
  shellSheet['C9'] = { t: 'n', v: 0.240 };
  shellSheet['D9'] = { t: 'n', v: 0.245 };
  shellSheet['E9'] = { t: 'n', v: 0.244 };
  shellSheet['F9'] = { t: 'n', v: 0.246 };
  shellSheet['G9'] = { t: 'n', v: 0.241 };
  shellSheet['H9'] = { t: 'n', v: 0.244 };
  shellSheet['I9'] = { t: 'n', v: 0.242 };
  
  console.log('✓ Filled Shell Thickness sheet with realistic measurements');
}

// Fill Bottom Thickness sheet
const bottomSheet = workbook.Sheets['Bottom Thickness'];
if (bottomSheet) {
  // Fill in bottom plate measurements
  for (let i = 5; i <= 12; i++) {
    bottomSheet[`B${i}`] = { t: 'n', v: 0.245 + Math.random() * 0.01 - 0.005 }; // North
    bottomSheet[`C${i}`] = { t: 'n', v: 0.244 + Math.random() * 0.01 - 0.005 }; // South
    bottomSheet[`D${i}`] = { t: 'n', v: 0.246 + Math.random() * 0.01 - 0.005 }; // East
    bottomSheet[`E${i}`] = { t: 'n', v: 0.243 + Math.random() * 0.01 - 0.005 }; // West
  }
  
  console.log('✓ Filled Bottom Thickness sheet');
}

// Fill Roof Thickness sheet
const roofSheet = workbook.Sheets['Roof Thickness'];
if (roofSheet) {
  // Fill roof measurements
  roofSheet['B5'] = { t: 'n', v: 0.187 }; // Center
  roofSheet['B6'] = { t: 'n', v: 0.185 }; // North Edge
  roofSheet['B7'] = { t: 'n', v: 0.186 }; // South Edge
  roofSheet['B8'] = { t: 'n', v: 0.184 }; // East Edge
  roofSheet['B9'] = { t: 'n', v: 0.185 }; // West Edge
  roofSheet['B10'] = { t: 'n', v: 0.183 }; // Min measured
  
  console.log('✓ Filled Roof Thickness sheet');
}

// Fill Inspection Checklist
const checklistSheet = workbook.Sheets['Inspection Checklist'];
if (checklistSheet) {
  // Fill checklist items
  checklistSheet['B5'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B6'] = { t: 's', v: 'Minor Coating Damage' };
  checklistSheet['B7'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B8'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B9'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B10'] = { t: 's', v: 'Monitor' };
  checklistSheet['B11'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B12'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B13'] = { t: 's', v: 'Minor Pitting' };
  checklistSheet['B14'] = { t: 's', v: 'Satisfactory' };
  checklistSheet['B15'] = { t: 's', v: 'Satisfactory' };
  
  console.log('✓ Filled Inspection Checklist sheet');
}

// Save the filled template
const outputFile = 'filled_template_test.xlsx';
XLSX.writeFile(workbook, outputFile);
console.log(`\n✓ Saved filled template as: ${outputFile}`);

// Summary
console.log('\n=== Summary ===');
console.log('✓ Successfully read template structure');
console.log('✓ Filled all sheets with realistic tank inspection data');
console.log('✓ Tank TK-101: 50ft diameter, 40ft height, Crude Oil service');
console.log('✓ Shell thickness measurements for 5 courses');
console.log('✓ Bottom, roof, and checklist data populated');
console.log('✓ Ready for import testing');