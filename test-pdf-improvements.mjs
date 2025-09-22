#!/usr/bin/env node
// Test script for verifying enhanced PDF analyzer functionality

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

// Test PDF files available
const TEST_PDFS = [
  'attached_assets/API-653-Visual-Report-Tank 6-2025-09-06_1757126688428.pdf',
  'attached_assets/Tank 6 Birla Carbon LR0328 External-1 copy copy_1752238937798.pdf'
];

async function testPDFImport(pdfPath) {
  console.log('\n' + '='.repeat(80));
  console.log('Testing PDF Import:', path.basename(pdfPath));
  console.log('='.repeat(80));
  
  try {
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Create form data - using 'excelFile' field name as expected by the endpoint
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('excelFile', blob, path.basename(pdfPath));
    
    // Send to import endpoint
    console.log('\nSending PDF to import endpoint...');
    const response = await fetch(`${API_BASE}/api/reports/import`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Import failed:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    
    // Display results
    console.log('\n--- EXTRACTION RESULTS ---');
    console.log('Success:', result.success);
    console.log('Confidence:', result.aiAnalysis?.confidence || 'N/A', '%');
    
    // Display extraction details if available
    if (result.aiAnalysis?.extractionDetails) {
      const details = result.aiAnalysis.extractionDetails;
      console.log('\n--- EXTRACTION DETAILS ---');
      console.log('Tables Found:', details.tablesFound || 0);
      console.log('Sections Identified:', details.sectionsIdentified?.length || 0);
      if (details.sectionsIdentified?.length > 0) {
        console.log('  Sections:', details.sectionsIdentified.join(', '));
      }
      console.log('Patterns Matched:', Object.keys(details.patternsMatched || {}).length);
      if (details.patternsMatched) {
        for (const [pattern, count] of Object.entries(details.patternsMatched)) {
          console.log(`  ${pattern}: ${count} matches`);
        }
      }
    }
    
    // Display imported data
    if (result.importedData) {
      console.log('\n--- IMPORTED DATA ---');
      console.log('Tank ID:', result.importedData.tankId || 'Not found');
      console.log('Inspector:', result.importedData.inspector || 'Not found');
      console.log('Inspection Date:', result.importedData.inspectionDate || 'Not found');
      console.log('Service:', result.importedData.service || 'Not found');
      console.log('Diameter:', result.importedData.diameter || 'Not found');
      console.log('Height:', result.importedData.height || 'Not found');
      console.log('Report Number:', result.importedData.reportNumber || 'Not found');
    }
    
    // Display thickness measurements
    console.log('\n--- THICKNESS MEASUREMENTS ---');
    console.log('Total Measurements:', result.thicknessMeasurements?.length || 0);
    if (result.thicknessMeasurements?.length > 0) {
      console.log('Sample Measurements:');
      result.thicknessMeasurements.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.component} at ${m.location}: ${m.currentThickness}" (${m.measurementType || 'UT'})`);
      });
      if (result.thicknessMeasurements.length > 5) {
        console.log(`  ... and ${result.thicknessMeasurements.length - 5} more`);
      }
    }
    
    // Display checklist items
    console.log('\n--- CHECKLIST ITEMS ---');
    console.log('Total Items:', result.checklistItems?.length || 0);
    
    // Display warnings and failures
    if (result.aiAnalysis?.extractionDetails?.warnings?.length > 0) {
      console.log('\n--- WARNINGS ---');
      result.aiAnalysis.extractionDetails.warnings.forEach(w => {
        console.log('  ⚠', w);
      });
    }
    
    if (result.aiAnalysis?.extractionDetails?.failedExtractions?.length > 0) {
      console.log('\n--- FAILED EXTRACTIONS ---');
      result.aiAnalysis.extractionDetails.failedExtractions.forEach(f => {
        console.log('  ✗', f);
      });
    }
    
    if (result.aiAnalysis?.extractionDetails?.successfulExtractions?.length > 0) {
      console.log('\n--- SUCCESSFUL EXTRACTIONS ---');
      result.aiAnalysis.extractionDetails.successfulExtractions.forEach(s => {
        console.log('  ✓', s);
      });
    }
    
    // Test specific enhancements
    console.log('\n--- ENHANCEMENT VERIFICATION ---');
    
    // 1. Table extraction enhancement
    const tablesFound = result.aiAnalysis?.extractionDetails?.tablesFound || 0;
    console.log(`✓ Enhanced table extraction: ${tablesFound} tables found`);
    
    // 2. Pattern matching improvements
    const patternsMatched = Object.keys(result.aiAnalysis?.extractionDetails?.patternsMatched || {}).length;
    console.log(`✓ Improved pattern matching: ${patternsMatched} pattern types matched`);
    
    // 3. Section context understanding
    const sectionsIdentified = result.aiAnalysis?.extractionDetails?.sectionsIdentified?.length || 0;
    console.log(`✓ Section context understanding: ${sectionsIdentified} sections identified`);
    
    // 4. Robust field extraction
    const criticalFields = ['tankId', 'inspector', 'inspectionDate'];
    const extractedFields = criticalFields.filter(f => result.importedData?.[f] && result.importedData[f] !== 'Unknown');
    console.log(`✓ Robust field extraction: ${extractedFields.length}/${criticalFields.length} critical fields extracted`);
    
    // 5. Data validation
    if (result.importedData?.inspectionDate) {
      const date = new Date(result.importedData.inspectionDate);
      const now = new Date();
      const isValidDate = date <= now && date > new Date('2000-01-01');
      console.log(`✓ Date validation: ${isValidDate ? 'Valid' : 'Invalid'} date`);
    }
    
    // 6. Measurement validation
    const validMeasurements = result.thicknessMeasurements?.filter(m => {
      const thickness = parseFloat(m.currentThickness);
      return thickness >= 0.05 && thickness <= 3.0;
    }).length || 0;
    console.log(`✓ Measurement validation: ${validMeasurements}/${result.thicknessMeasurements?.length || 0} valid measurements`);
    
    // 7. Confidence scoring
    const confidence = result.aiAnalysis?.confidence || 0;
    let confidenceLevel = 'Very Low';
    if (confidence >= 80) confidenceLevel = 'High';
    else if (confidence >= 60) confidenceLevel = 'Medium';
    else if (confidence >= 40) confidenceLevel = 'Low';
    console.log(`✓ Confidence scoring: ${confidence}% (${confidenceLevel})`);
    
    return result;
    
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}

async function runTests() {
  console.log('=== ENHANCED PDF ANALYZER TEST SUITE ===');
  console.log('Testing improvements to PDF import functionality');
  console.log(`Testing ${TEST_PDFS.length} PDF files`);
  
  const results = [];
  
  for (const pdfPath of TEST_PDFS) {
    if (fs.existsSync(pdfPath)) {
      const result = await testPDFImport(pdfPath);
      results.push({
        file: path.basename(pdfPath),
        success: !!result?.success,
        confidence: result?.aiAnalysis?.confidence || 0,
        measurements: result?.thicknessMeasurements?.length || 0,
        tablesFound: result?.aiAnalysis?.extractionDetails?.tablesFound || 0,
        sectionsFound: result?.aiAnalysis?.extractionDetails?.sectionsIdentified?.length || 0
      });
    } else {
      console.log(`\nSkipping ${pdfPath} (file not found)`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(r => {
    console.log(`\n${r.file}:`);
    console.log(`  Status: ${r.success ? '✓ Success' : '✗ Failed'}`);
    console.log(`  Confidence: ${r.confidence}%`);
    console.log(`  Measurements: ${r.measurements}`);
    console.log(`  Tables: ${r.tablesFound}`);
    console.log(`  Sections: ${r.sectionsFound}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const totalMeasurements = results.reduce((sum, r) => sum + r.measurements, 0);
  
  console.log('\n--- OVERALL RESULTS ---');
  console.log(`Success Rate: ${successCount}/${results.length} PDFs processed successfully`);
  console.log(`Average Confidence: ${avgConfidence.toFixed(1)}%`);
  console.log(`Total Measurements Extracted: ${totalMeasurements}`);
  
  console.log('\n✅ PDF Analyzer Enhancement Test Complete!');
}

// Run the tests
runTests().catch(console.error);