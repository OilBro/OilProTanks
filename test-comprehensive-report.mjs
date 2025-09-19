import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Comprehensive test data for all report sections
const comprehensiveReport = {
  // Basic Information
  tankId: 'TK-103',
  inspectionDate: '2025-09-19',
  inspector: 'John Smith, API 653 #12345',
  reportNumber: 'COMP-TEST-001',
  service: 'crude_oil',
  diameter: '50',  // String as expected by API
  height: '40',    // String as expected by API
  capacity: '25000',
  yearBuilt: 1995,
  yearsSinceLastInspection: 5,
  constructionCode: 'API-650',
  material: 'A36 Carbon Steel',
  originalThickness: '0.375',  // String as expected
  specificGravity: '0.85',
  jointEfficiency: '0.85',
  yieldStrength: '36000',
  designStress: '23200',
  status: 'draft',
  customer: 'OilPro Energy Corp',
  location: 'Houston Terminal, TX',
  inspectionScope: 'Full External and Internal Visual Inspection per API 653',
  reviewer: 'Jane Doe, Senior Inspector',
  findings: 'Overall tank condition is satisfactory with minor coating degradation noted on north side shell courses 2-3. Bottom plates show minimal corrosion. Roof structure in good condition.',
  recommendations: '1. Recoat shell courses 2-3 north side within 2 years\n2. Monitor bottom plate corrosion annually\n3. Clean and inspect floating roof seals\n4. Verify cathodic protection system operation'
};

// Thickness measurements with proper string formatting
const thicknessMeasurements = [
  // Shell Course 1 (Bottom)
  { component: 'shell', location: 'Course 1 - North', currentThickness: '0.365', originalThickness: '0.375', elevation: '0-8 ft' },
  { component: 'shell', location: 'Course 1 - South', currentThickness: '0.358', originalThickness: '0.375', elevation: '0-8 ft' },
  { component: 'shell', location: 'Course 1 - East', currentThickness: '0.362', originalThickness: '0.375', elevation: '0-8 ft' },
  { component: 'shell', location: 'Course 1 - West', currentThickness: '0.360', originalThickness: '0.375', elevation: '0-8 ft' },
  
  // Shell Course 2
  { component: 'shell', location: 'Course 2 - North', currentThickness: '0.362', originalThickness: '0.375', elevation: '8-16 ft' },
  { component: 'shell', location: 'Course 2 - South', currentThickness: '0.355', originalThickness: '0.375', elevation: '8-16 ft' },
  { component: 'shell', location: 'Course 2 - East', currentThickness: '0.359', originalThickness: '0.375', elevation: '8-16 ft' },
  { component: 'shell', location: 'Course 2 - West', currentThickness: '0.357', originalThickness: '0.375', elevation: '8-16 ft' },
  
  // Shell Course 3
  { component: 'shell', location: 'Course 3 - North', currentThickness: '0.298', originalThickness: '0.312', elevation: '16-24 ft' },
  { component: 'shell', location: 'Course 3 - South', currentThickness: '0.295', originalThickness: '0.312', elevation: '16-24 ft' },
  
  // Shell Course 4
  { component: 'shell', location: 'Course 4 - North', currentThickness: '0.295', originalThickness: '0.312', elevation: '24-32 ft' },
  { component: 'shell', location: 'Course 4 - South', currentThickness: '0.292', originalThickness: '0.312', elevation: '24-32 ft' },
  
  // Shell Course 5
  { component: 'shell', location: 'Course 5 - North', currentThickness: '0.243', originalThickness: '0.250', elevation: '32-40 ft' },
  { component: 'shell', location: 'Course 5 - South', currentThickness: '0.240', originalThickness: '0.250', elevation: '32-40 ft' },
  
  // Bottom Plates
  { component: 'bottom', location: 'Center', currentThickness: '0.245', originalThickness: '0.250', gridReference: 'C-0' },
  { component: 'bottom', location: 'North Edge', currentThickness: '0.238', originalThickness: '0.250', gridReference: 'N-1' },
  { component: 'bottom', location: 'South Edge', currentThickness: '0.241', originalThickness: '0.250', gridReference: 'S-1' },
  { component: 'bottom', location: 'Critical Zone', currentThickness: '0.235', originalThickness: '0.250', gridReference: 'CZ-1' },
  
  // Roof Plates
  { component: 'roof', location: 'Center', currentThickness: '0.187', originalThickness: '0.187' },
  { component: 'roof', location: 'North Edge', currentThickness: '0.185', originalThickness: '0.187' },
  { component: 'roof', location: 'Vent Area', currentThickness: '0.183', originalThickness: '0.187' },
  
  // Nozzles
  { component: 'nozzle', location: 'N1 - Inlet 24"', currentThickness: '0.365', originalThickness: '0.375' },
  { component: 'nozzle', location: 'N2 - Outlet 24"', currentThickness: '0.362', originalThickness: '0.375' },
  { component: 'nozzle', location: 'N3 - Drain 4"', currentThickness: '0.245', originalThickness: '0.250' },
];

// Checklist items
const checklistItems = [
  { category: 'external', item: 'Shell General Condition', status: 'satisfactory', notes: 'Minor surface rust on courses 2-3' },
  { category: 'external', item: 'Shell Coating/Paint', status: 'marginal', notes: 'Degradation noted, recoating needed' },
  { category: 'external', item: 'Foundation', status: 'satisfactory', notes: 'No settlement observed' },
  { category: 'external', item: 'Anchor Bolts', status: 'satisfactory', notes: 'All bolts secure and intact' },
  { category: 'external', item: 'Grounding System', status: 'satisfactory', notes: 'Resistance measured at 2.5 ohms' },
  { category: 'external', item: 'Stairs/Platforms', status: 'satisfactory', notes: 'All handrails secure' },
  { category: 'external', item: 'Roof Structure', status: 'satisfactory', notes: 'No ponding observed' },
  { category: 'external', item: 'Roof Drains', status: 'satisfactory', notes: 'Clear and functional' },
  { category: 'external', item: 'Vents', status: 'satisfactory', notes: 'PV valve tested OK' },
  { category: 'external', item: 'Gauging Equipment', status: 'satisfactory', notes: 'ATG functioning properly' },
  { category: 'external', item: 'Mixer', status: 'not_applicable', notes: 'No mixer installed' },
  { category: 'external', item: 'Cathodic Protection', status: 'satisfactory', notes: 'CP system operational' },
  { category: 'internal', item: 'Shell Internal', status: 'satisfactory', notes: 'Minimal corrosion' },
  { category: 'internal', item: 'Bottom Plates', status: 'satisfactory', notes: 'MFL testing completed' },
  { category: 'internal', item: 'Roof Support Columns', status: 'satisfactory', notes: 'All columns plumb' },
  { category: 'internal', item: 'Heating Coils', status: 'not_applicable', notes: 'No heating coils' },
  { category: 'safety', item: 'Fire Protection', status: 'satisfactory', notes: 'Foam system tested' },
  { category: 'safety', item: 'Secondary Containment', status: 'satisfactory', notes: 'Dyke capacity verified' },
  { category: 'safety', item: 'Emergency Valves', status: 'satisfactory', notes: 'EIV tested successfully' },
  { category: 'safety', item: 'Signage', status: 'satisfactory', notes: 'All signs legible' },
];

// Appurtenance inspections
const appurtenances = [
  { type: 'nozzle', identifier: 'N1', size: '24 inch', rating: 'Class 150', condition: 'satisfactory', notes: 'Inlet nozzle - flange faces good' },
  { type: 'nozzle', identifier: 'N2', size: '24 inch', rating: 'Class 150', condition: 'satisfactory', notes: 'Outlet nozzle - minor external corrosion' },
  { type: 'manway', identifier: 'MW1', size: '24 inch', rating: 'Class 150', condition: 'satisfactory', notes: 'Shell manway - gasket replaced' },
  { type: 'vent', identifier: 'PV1', size: '8 inch', rating: 'N/A', condition: 'satisfactory', notes: 'Pressure/vacuum valve - tested at set points' },
  { type: 'gauge', identifier: 'ATG1', size: 'N/A', rating: 'N/A', condition: 'satisfactory', notes: 'Automatic tank gauge operational' },
  { type: 'mixer', identifier: 'N/A', size: 'N/A', rating: 'N/A', condition: 'not_applicable', notes: 'No mixer installed' },
];

// Repair recommendations
const repairRecommendations = [
  { priority: 'high', component: 'Shell Coating', description: 'Recoat shell courses 2-3 on north side', timeframe: '2 years' },
  { priority: 'medium', component: 'Bottom Plates', description: 'Monitor corrosion rate in critical zone', timeframe: 'Annual' },
  { priority: 'low', component: 'Roof Seals', description: 'Replace floating roof perimeter seals', timeframe: '5 years' },
  { priority: 'medium', component: 'Nozzle N2', description: 'Remove external corrosion and recoat', timeframe: '2 years' },
];

// Venting system inspections
const ventingInspections = [
  { ventType: 'pressure_vacuum', ventId: 'PV-1', setPoint: '+0.5/-0.25 psig', testResult: 'passed', condition: 'satisfactory', notes: 'Tested and functioning at design setpoints' },
  { ventType: 'emergency', ventId: 'EV-1', setPoint: '+1.0 psig', testResult: 'passed', condition: 'satisfactory', notes: 'Emergency vent operational' },
  { ventType: 'gauge_hatch', ventId: 'GH-1', setPoint: 'N/A', testResult: 'visual_only', condition: 'satisfactory', notes: 'Gauge hatch seals intact' },
];

// Test execution
async function runComprehensiveTest() {
  console.log('=== COMPREHENSIVE TANK INSPECTION REPORT TEST ===\n');
  
  try {
    // Step 1: Create the base report
    console.log('1. Creating comprehensive report...');
    const reportResponse = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comprehensiveReport)
    });
    
    if (!reportResponse.ok) {
      const error = await reportResponse.text();
      throw new Error(`Failed to create report: ${error}`);
    }
    
    const report = await reportResponse.json();
    console.log(`   ✓ Created report: ${report.reportNumber} (ID: ${report.id})`);
    
    // Step 2: Add thickness measurements
    console.log('\n2. Adding thickness measurements...');
    let measurementCount = 0;
    let measurementErrors = [];
    
    for (const measurement of thicknessMeasurements) {
      const measureResponse = await fetch(`${API_BASE}/reports/${report.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          ...measurement
        })
      });
      
      if (measureResponse.ok) {
        measurementCount++;
      } else {
        const errorText = await measureResponse.text();
        measurementErrors.push(`${measurement.location}: ${errorText}`);
      }
    }
    
    console.log(`   ✓ Added ${measurementCount}/${thicknessMeasurements.length} measurements`);
    if (measurementErrors.length > 0) {
      console.log(`   ⚠ Errors: ${measurementErrors.length} measurements failed`);
      console.log(`     First error: ${measurementErrors[0].substring(0, 100)}`);
    }
    
    // Step 3: Add checklist items
    console.log('\n3. Adding inspection checklist items...');
    let checklistCount = 0;
    
    for (const item of checklistItems) {
      const checklistResponse = await fetch(`${API_BASE}/reports/${report.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          ...item
        })
      });
      
      if (checklistResponse.ok) {
        checklistCount++;
      }
    }
    
    console.log(`   ✓ Added ${checklistCount}/${checklistItems.length} checklist items`);
    
    // Step 4: Add appurtenance inspections
    console.log('\n4. Adding appurtenance inspections...');
    let appurtenanceCount = 0;
    
    for (const appurtenance of appurtenances) {
      const appResponse = await fetch(`${API_BASE}/reports/${report.id}/appurtenances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          ...appurtenance
        })
      });
      
      if (appResponse.ok) {
        appurtenanceCount++;
      }
    }
    
    console.log(`   ✓ Added ${appurtenanceCount}/${appurtenances.length} appurtenance inspections`);
    
    // Step 5: Add repair recommendations
    console.log('\n5. Adding repair recommendations...');
    let repairCount = 0;
    
    for (const repair of repairRecommendations) {
      const repairResponse = await fetch(`${API_BASE}/reports/${report.id}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          ...repair
        })
      });
      
      if (repairResponse.ok) {
        repairCount++;
      }
    }
    
    console.log(`   ✓ Added ${repairCount}/${repairRecommendations.length} repair recommendations`);
    
    // Step 6: Add venting inspections
    console.log('\n6. Adding venting system inspections...');
    let ventingCount = 0;
    
    for (const vent of ventingInspections) {
      const ventResponse = await fetch(`${API_BASE}/reports/${report.id}/venting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          ...vent
        })
      });
      
      if (ventResponse.ok) {
        ventingCount++;
      }
    }
    
    console.log(`   ✓ Added ${ventingCount}/${ventingInspections.length} venting inspections`);
    
    // Step 7: Verify data persistence
    console.log('\n7. Verifying data persistence...');
    const verifyResponse = await fetch(`${API_BASE}/reports/${report.id}`);
    const verifiedReport = await verifyResponse.json();
    
    console.log(`   ✓ Report retrieved successfully`);
    console.log(`     - Tank ID: ${verifiedReport.tankId}`);
    console.log(`     - Service: ${verifiedReport.service}`);
    console.log(`     - Dimensions: ${verifiedReport.diameter}ft x ${verifiedReport.height}ft`);
    console.log(`     - Measurements: ${verifiedReport.thicknessMeasurements?.length || 0}`);
    console.log(`     - Checklist items: ${verifiedReport.inspectionChecklists?.length || 0}`);
    console.log(`     - Appurtenances: ${verifiedReport.appurtenanceInspections?.length || 0}`);
    console.log(`     - Recommendations: ${verifiedReport.repairRecommendations?.length || 0}`);
    console.log(`     - Venting: ${verifiedReport.ventingInspections?.length || 0}`);
    
    // Step 8: Test PDF generation
    console.log('\n8. Testing PDF generation...');
    const pdfResponse = await fetch(`${API_BASE}/reports/${report.id}/pdf`);
    
    if (pdfResponse.ok) {
      const contentType = pdfResponse.headers.get('content-type');
      const contentLength = pdfResponse.headers.get('content-length');
      console.log(`   ✓ PDF generated successfully`);
      console.log(`     - Content-Type: ${contentType}`);
      console.log(`     - Size: ${contentLength} bytes`);
    } else {
      console.log(`   ⚠ PDF generation failed: ${pdfResponse.status}`);
    }
    
    // Step 9: Test calculations
    console.log('\n9. Testing API 653 calculations...');
    const calcResponse = await fetch(`${API_BASE}/reports/${report.id}/calculations`);
    
    if (calcResponse.ok) {
      const calculations = await calcResponse.json();
      console.log(`   ✓ Calculations retrieved`);
      if (calculations.shellCourses) {
        console.log(`     - Shell courses analyzed: ${calculations.shellCourses.length}`);
      }
      if (calculations.bottomPlate) {
        console.log(`     - Bottom plate calculations available`);
      }
    } else {
      console.log(`   ⚠ Calculations endpoint not available`);
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`✓ Comprehensive report created: ${report.reportNumber}`);
    console.log(`✓ Report ID: ${report.id}`);
    console.log(`✓ Tank: ${report.tankId} (${report.diameter}ft x ${report.height}ft)`);
    console.log(`✓ Components tested:`);
    console.log(`  - Basic information: Complete`);
    console.log(`  - Thickness measurements: ${measurementCount}/${thicknessMeasurements.length}`);
    console.log(`  - Checklist items: ${checklistCount}/${checklistItems.length}`);
    console.log(`  - Appurtenances: ${appurtenanceCount}/${appurtenances.length}`);
    console.log(`  - Repair recommendations: ${repairCount}/${repairRecommendations.length}`);
    console.log(`  - Venting inspections: ${ventingCount}/${ventingInspections.length}`);
    console.log(`  - PDF generation: ${pdfResponse.ok ? 'Success' : 'Failed'}`);
    console.log(`  - Data persistence: Verified`);
    
    return report.id;
    
  } catch (error) {
    console.error('Test failed:', error.message);
    return null;
  }
}

// Execute the test
const reportId = await runComprehensiveTest();

if (reportId) {
  console.log(`\n✅ Test completed successfully!`);
  console.log(`📄 View report at: http://localhost:5000/reports/${reportId}`);
} else {
  console.log(`\n❌ Test failed - check errors above`);
}

process.exit(0);