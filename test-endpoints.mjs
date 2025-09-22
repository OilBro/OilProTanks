#!/usr/bin/env node

// Test script for verifying all the new API endpoints

const baseUrl = 'http://localhost:5000';
const testReportId = 1; // Assuming report ID 1 exists

async function testEndpoint(method, path, body = null, expectedStatus = [200, 201]) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const statusOk = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(response.status) 
      : response.status === expectedStatus;
    
    const result = {
      endpoint: `${method} ${path}`,
      status: response.status,
      success: statusOk,
      data: null
    };
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      result.data = await response.json();
    }
    
    if (!statusOk && result.data) {
      console.log(`${statusOk ? '✅' : '❌'} ${method} ${path} - Status: ${response.status} - Error: ${JSON.stringify(result.data)}`);
    } else {
      console.log(`${statusOk ? '✅' : '❌'} ${method} ${path} - Status: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.log(`❌ ${method} ${path} - Error: ${error.message}`);
    return {
      endpoint: `${method} ${path}`,
      error: error.message,
      success: false
    };
  }
}

async function runTests() {
  console.log('Testing API Endpoints for Tank Inspection Application\n');
  console.log('='*60);
  
  const results = [];
  
  // 1. Test Checklist endpoints
  console.log('\n📋 Testing Checklist Endpoints:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/checklist`));
  results.push(await testEndpoint('POST', `/api/reports/${testReportId}/checklist`, {
    item: 'Test checklist item',
    status: 'ok',
    notes: 'Test notes'
  }));
  // We need to get the ID from the created item for update/delete tests
  
  // 2. Test Appurtenances endpoints
  console.log('\n🔧 Testing Appurtenances Endpoints:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/appurtenances`));
  const appurtenanceResult = await testEndpoint('POST', `/api/reports/${testReportId}/appurtenances`, {
    appurtenanceType: 'nozzle',
    appurtenanceId: 'N-101',
    location: 'Shell Course 1',
    condition: 'good',
    findings: 'No issues found',
    priority: 'routine'
  });
  results.push(appurtenanceResult);
  
  // 3. Test Repair Recommendations endpoints
  console.log('\n🔨 Testing Repair Recommendations Endpoints:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/recommendations`));
  const recommendationResult = await testEndpoint('POST', `/api/reports/${testReportId}/recommendations`, {
    type: 'corrosion',
    description: 'Replace corroded section',
    priority: 'high',
    timeframe: '3 months'
  });
  results.push(recommendationResult);
  
  // 4. Test Venting System endpoints
  console.log('\n💨 Testing Venting System Endpoints:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/venting`));
  const ventingResult = await testEndpoint('POST', `/api/reports/${testReportId}/venting`, {
    ventType: 'pressure_vacuum_vent',
    ventId: 'V-101', // Changed from ventSize to ventId to match database schema
    ventSize: '4 inch',
    ventCount: 2,
    condition: 'good',
    obstructions: false,
    findings: 'Venting system operating normally',
    compliesWithAPI: true
  });
  results.push(ventingResult);
  
  // 5. Test Calculations endpoint
  console.log('\n📊 Testing Calculations Endpoint:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/calculations`));
  
  // 6. Test Settlement Survey endpoints
  console.log('\n📐 Testing Settlement Survey Endpoints:');
  results.push(await testEndpoint('GET', `/api/reports/${testReportId}/settlement`));
  const settlementResult = await testEndpoint('POST', `/api/reports/${testReportId}/settlement`, {
    surveyDate: new Date().toISOString(),
    surveyMethod: 'optical',
    maxSettlement: 2.5,
    settlementLocation: 'North side',
    uniform: false,
    differential: true,
    compliesWithAPI653: true,
    measurements: [
      { pointNumber: 1, angle: 0, elevation: 100.5 },
      { pointNumber: 2, angle: 90, elevation: 100.3 },
      { pointNumber: 3, angle: 180, elevation: 100.4 },
      { pointNumber: 4, angle: 270, elevation: 100.6 }
    ]
  });
  results.push(settlementResult);
  
  // Summary
  console.log('\n' + '='*60);
  console.log('📈 Test Summary:\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed Endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.error || `Status ${r.status}`}`);
    });
  }
  
  console.log('\n✨ Testing complete!');
  process.exit(failed > 0 ? 1 : 0);
}

// Wait a bit for the server to be ready
setTimeout(runTests, 2000);