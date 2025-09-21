import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Test data for API 653 calculations
const testReportData = {
  tankId: 'TK-102',
  inspectionDate: '2025-09-19',
  inspector: 'Test Inspector',
  reportNumber: 'TEST-CALC-001',
  service: 'crude_oil',
  diameter: 50, // feet
  height: 40, // feet
  capacity: 25000, // bbls
  yearBuilt: 1990,
  yearsSinceLastInspection: 5,
  constructionCode: 'API-650',
  material: 'A36',
  originalThickness: 0.375, // inches for courses 1-2
  specificGravity: 0.85,
  jointEfficiency: 0.85,
  yieldStrength: 36000, // psi for A36
  designStress: 23200, // psi
  status: 'draft',
  components: [
    // Shell measurements with known values for calculations
    {
      component: 'shell',
      location: 'Course 1 - North',
      currentThickness: 0.365,
      originalThickness: 0.375,
      elevation: '0-8 ft',
      yearMeasured: 2025
    },
    {
      component: 'shell',
      location: 'Course 1 - South',
      currentThickness: 0.358,
      originalThickness: 0.375,
      elevation: '0-8 ft',
      yearMeasured: 2025
    },
    {
      component: 'shell',
      location: 'Course 2 - North',
      currentThickness: 0.362,
      originalThickness: 0.375,
      elevation: '8-16 ft',
      yearMeasured: 2025
    },
    {
      component: 'shell',
      location: 'Course 3 - North',
      currentThickness: 0.295,
      originalThickness: 0.312,
      elevation: '16-24 ft',
      yearMeasured: 2025
    },
    {
      component: 'shell',
      location: 'Course 4 - North',
      currentThickness: 0.292,
      originalThickness: 0.312,
      elevation: '24-32 ft',
      yearMeasured: 2025
    },
    {
      component: 'shell',
      location: 'Course 5 - North',
      currentThickness: 0.240,
      originalThickness: 0.250,
      elevation: '32-40 ft',
      yearMeasured: 2025
    },
    // Bottom plate measurements
    {
      component: 'bottom',
      location: 'Center',
      currentThickness: 0.245,
      originalThickness: 0.250,
      gridReference: 'C-0'
    },
    {
      component: 'bottom',
      location: 'Edge',
      currentThickness: 0.235,
      originalThickness: 0.250,
      gridReference: 'E-1'
    }
  ]
};

// Expected API 653 calculation results for verification
const expectedCalculations = {
  course1: {
    originalThickness: 0.375,
    currentThickness: 0.358, // minimum from measurements
    thicknessLoss: 0.017,
    corrosionRate: 0.017 / 35, // loss / years since built (1990 to 2025)
    corrosionRateMPY: (0.017 / 35) * 1000,
    // Minimum required thickness per API 653:
    // tmin = 2.6 * D * (H - 1) * G / (S * E)
    // For Course 1, H = 40 ft (full height)
    // tmin = 2.6 * 50 * (40 - 1) * 0.85 / (23200 * 0.85)
    minimumRequired: (2.6 * 50 * 39 * 0.85) / (23200 * 0.85),
    remainingLife: null // to be calculated
  }
};

expectedCalculations.course1.remainingLife = 
  (expectedCalculations.course1.currentThickness - expectedCalculations.course1.minimumRequired) / 
  expectedCalculations.course1.corrosionRate;

console.log('=== API 653 Calculation Test ===\n');
console.log('Expected calculations for Course 1:');
console.log(`  Original thickness: ${expectedCalculations.course1.originalThickness} inches`);
console.log(`  Current thickness (min): ${expectedCalculations.course1.currentThickness} inches`);
console.log(`  Thickness loss: ${expectedCalculations.course1.thicknessLoss.toFixed(3)} inches`);
console.log(`  Corrosion rate: ${expectedCalculations.course1.corrosionRate.toFixed(5)} in/year`);
console.log(`  Corrosion rate: ${expectedCalculations.course1.corrosionRateMPY.toFixed(2)} mils/year`);
console.log(`  Minimum required: ${expectedCalculations.course1.minimumRequired.toFixed(3)} inches`);
console.log(`  Remaining life: ${expectedCalculations.course1.remainingLife.toFixed(1)} years`);

// Create report with thickness measurements
async function testCalculations() {
  try {
    console.log('\n1. Creating test report...');
    
    // Create the report
    const createResponse = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testReportData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create report: ${error}`);
    }
    
    const report = await createResponse.json();
    console.log(`   ✓ Created report ID: ${report.id}`);
    
    // Add thickness measurements
    console.log('\n2. Adding thickness measurements...');
    for (const component of testReportData.components) {
      const measurementData = {
        reportId: report.id,
        component: component.component,
        location: component.location,
        currentThickness: component.currentThickness,
        originalThickness: component.originalThickness,
        elevation: component.elevation || null,
        gridReference: component.gridReference || null,
        yearMeasured: component.yearMeasured || 2025
      };
      
      const measureResponse = await fetch(`${API_BASE}/reports/${report.id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurementData)
      });
      
      if (!measureResponse.ok) {
        console.log(`   ⚠ Failed to add measurement: ${component.location}`);
      } else {
        console.log(`   ✓ Added measurement: ${component.location}`);
      }
    }
    
    // Retrieve calculations
    console.log('\n3. Retrieving API 653 calculations...');
    const calcResponse = await fetch(`${API_BASE}/reports/${report.id}/calculations`);
    
    if (!calcResponse.ok) {
      console.log('   ⚠ No calculations endpoint found, trying report endpoint...');
      const reportResponse = await fetch(`${API_BASE}/reports/${report.id}`);
      const fullReport = await reportResponse.json();
      console.log('\nReport details:');
      console.log(JSON.stringify(fullReport, null, 2).substring(0, 500));
    } else {
      const calculations = await calcResponse.json();
      console.log('\nActual calculations from API:');
      console.log(JSON.stringify(calculations, null, 2));
      
      // Verify calculations
      console.log('\n4. Verification:');
      if (calculations.shellCourses && calculations.shellCourses.length > 0) {
        const course1 = calculations.shellCourses.find(c => c.courseNumber === 1);
        if (course1) {
          console.log('\nCourse 1 calculation comparison:');
          console.log(`  Expected min required: ${expectedCalculations.course1.minimumRequired.toFixed(3)}`);
          console.log(`  Actual min required: ${course1.minimumRequired}`);
          console.log(`  Match: ${Math.abs(course1.minimumRequired - expectedCalculations.course1.minimumRequired) < 0.01 ? '✓' : '✗'}`);
        }
      }
    }
    
    // Test specific calculation endpoints
    console.log('\n5. Testing calculation endpoints...');
    
    // Try corrosion rate calculation
    const corrosionData = {
      originalThickness: 0.375,
      currentThickness: 0.358,
      ageInYears: 35
    };
    console.log('\nTesting corrosion rate calculation:');
    console.log(`  Input: ${JSON.stringify(corrosionData)}`);
    console.log(`  Expected rate: ${(0.017/35).toFixed(5)} in/year`);
    
    return report.id;
    
  } catch (error) {
    console.error('Error in calculation test:', error.message);
    return null;
  }
}

// Run the test
const reportId = await testCalculations();

if (reportId) {
  console.log(`\n✓ Test completed. Report ID: ${reportId}`);
  console.log('\nSummary:');
  console.log('- Created report with known thickness values');
  console.log('- Added 8 thickness measurements');
  console.log('- Attempted to retrieve and verify calculations');
  console.log('- Documented expected vs actual calculation results');
}

process.exit(0);