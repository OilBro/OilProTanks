#!/usr/bin/env node

// Test script for UPDATE and DELETE endpoints

const baseUrl = 'http://localhost:5000';
const testReportId = 1;

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
    
    console.log(`${statusOk ? '✅' : '❌'} ${method} ${path} - Status: ${response.status}`);
    
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
  console.log('Testing UPDATE and DELETE Endpoints for Tank Inspection Application\n');
  console.log('='*60);
  
  const results = [];
  
  // Test UPDATE endpoints
  console.log('\n📝 Testing UPDATE Endpoints:');
  
  // We need to create items first to get IDs for update/delete
  console.log('\nCreating test items...');
  const checklistCreate = await testEndpoint('POST', `/api/reports/${testReportId}/checklist`, {
    item: 'Test item for update',
    status: 'ok',
    notes: 'Initial notes'
  });
  
  if (checklistCreate.success && checklistCreate.data) {
    const checklistId = checklistCreate.data.id;
    console.log(`Created checklist item with ID: ${checklistId}`);
    
    // Test PUT and PATCH
    results.push(await testEndpoint('PUT', `/api/reports/${testReportId}/checklist/${checklistId}`, {
      status: 'deficient',
      notes: 'Updated notes'
    }));
    
    results.push(await testEndpoint('PATCH', `/api/reports/${testReportId}/checklist/${checklistId}`, {
      notes: 'Patched notes'
    }));
    
    // Test DELETE
    console.log('\n🗑️ Testing DELETE Endpoint:');
    results.push(await testEndpoint('DELETE', `/api/reports/${testReportId}/checklist/${checklistId}`));
  }
  
  // Test other endpoint UPDATE/DELETE operations
  console.log('\n\n🔧 Testing Appurtenances UPDATE/DELETE:');
  const appCreate = await testEndpoint('POST', `/api/reports/${testReportId}/appurtenances`, {
    appurtenanceType: 'valve',
    appurtenanceId: 'V-202',
    condition: 'fair'
  });
  
  if (appCreate.success && appCreate.data) {
    const appId = appCreate.data.id;
    results.push(await testEndpoint('PUT', `/api/reports/${testReportId}/appurtenances/${appId}`, {
      condition: 'good'
    }));
    results.push(await testEndpoint('DELETE', `/api/reports/${testReportId}/appurtenances/${appId}`));
  }
  
  console.log('\n🔨 Testing Recommendations UPDATE/DELETE:');
  const recCreate = await testEndpoint('POST', `/api/reports/${testReportId}/recommendations`, {
    type: 'coating',
    description: 'Test recommendation',
    priority: 'medium'
  });
  
  if (recCreate.success && recCreate.data) {
    const recId = recCreate.data.id;
    results.push(await testEndpoint('PATCH', `/api/reports/${testReportId}/recommendations/${recId}`, {
      priority: 'high'
    }));
    results.push(await testEndpoint('DELETE', `/api/reports/${testReportId}/recommendations/${recId}`));
  }
  
  console.log('\n💨 Testing Venting UPDATE/DELETE:');
  const ventCreate = await testEndpoint('POST', `/api/reports/${testReportId}/venting`, {
    ventType: 'emergency_vent',
    ventId: 'EV-102',
    condition: 'fair'
  });
  
  if (ventCreate.success && ventCreate.data) {
    const ventId = ventCreate.data.id;
    results.push(await testEndpoint('PUT', `/api/reports/${testReportId}/venting/${ventId}`, {
      condition: 'good'
    }));
    results.push(await testEndpoint('DELETE', `/api/reports/${testReportId}/venting/${ventId}`));
  }
  
  console.log('\n📐 Testing Settlement UPDATE:');
  const settlementCreate = await testEndpoint('POST', `/api/reports/${testReportId}/settlement`, {
    surveyDate: new Date().toISOString(),
    surveyMethod: 'laser',
    maxSettlement: 1.5
  });
  
  if (settlementCreate.success && settlementCreate.data) {
    const settlementId = settlementCreate.data.id;
    results.push(await testEndpoint('PATCH', `/api/reports/${testReportId}/settlement/${settlementId}`, {
      maxSettlement: 2.0
    }));
  }
  
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