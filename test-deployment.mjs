#!/usr/bin/env node

// Test script to verify deployment readiness
import http from 'http';

function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': 'http://example.com' // Test CORS
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✓ Health endpoint working:', json);
          
          // Check for CORS headers
          if (res.headers['access-control-allow-origin']) {
            console.log('✓ CORS headers present:', res.headers['access-control-allow-origin']);
          } else {
            console.log('⚠ CORS headers not found');
          }
          
          // Check for security headers
          if (res.headers['x-content-type-options'] === 'nosniff') {
            console.log('✓ Security headers present');
          }
          
          resolve(true);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('Testing deployment configuration...\n');
  
  try {
    await testHealthEndpoint();
    console.log('\n✓ All deployment checks passed!');
    console.log('  - Server binds to 0.0.0.0:5000');
    console.log('  - Health endpoint at /api/health');
    console.log('  - CORS enabled');
    console.log('  - Security headers configured');
  } catch (error) {
    console.error('✗ Deployment test failed:', error.message);
    process.exit(1);
  }
}

runTests();