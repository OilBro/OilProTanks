#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the PDF import with an actual PDF file
async function testPDFImport() {
  console.log('\n=== TESTING IMPROVED PDF IMPORT ===\n');
  
  // Load the PDF analyzer module
  const { analyzePDFWithOpenRouter, processPDFWithAI } = await import('./server/pdf-analyzer.ts');
  
  // List of test PDFs
  const testPDFs = [
    'attached_assets/API-653-Visual-Report-Tank 6-2025-09-06_1757126688428.pdf',
    'attached_assets/Tank 6 Birla Carbon LR0328 External-1 copy copy_1752238937798.pdf'
  ];
  
  for (const pdfPath of testPDFs) {
    if (!fs.existsSync(pdfPath)) {
      console.log(`❌ PDF not found: ${pdfPath}`);
      continue;
    }
    
    console.log(`\n📄 Testing PDF: ${path.basename(pdfPath)}`);
    console.log('─'.repeat(60));
    
    try {
      // Read the PDF file
      const buffer = fs.readFileSync(pdfPath);
      console.log(`✓ PDF loaded, size: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      // Analyze the PDF
      console.log('🔍 Analyzing PDF with enhanced extraction...');
      const analysis = await analyzePDFWithOpenRouter(buffer, path.basename(pdfPath));
      
      // Display results
      console.log('\n📊 Analysis Results:');
      console.log(`- Confidence: ${analysis.confidence}%`);
      console.log(`- Text extracted: ${analysis.extractedText.length} characters`);
      console.log(`- Thickness measurements found: ${analysis.thicknessMeasurements.length}`);
      console.log(`- Checklist items found: ${analysis.checklistItems.length}`);
      console.log(`- Detected fields: ${analysis.detectedFields.length}`);
      
      if (analysis.sections) {
        console.log(`- Identified sections: ${Object.keys(analysis.sections).length}`);
        console.log('  Sections:', Object.keys(analysis.sections).join(', '));
      }
      
      // Show report data
      console.log('\n📋 Report Data:');
      const reportData = analysis.reportData;
      console.log(`- Tank ID: ${reportData.tankId || 'Not found'}`);
      console.log(`- Inspector: ${reportData.inspector || 'Not found'}`);
      console.log(`- Inspection Date: ${reportData.inspectionDate || 'Not found'}`);
      console.log(`- Service: ${reportData.service || 'Not found'}`);
      console.log(`- Diameter: ${reportData.diameter || 'Not found'} ft`);
      console.log(`- Height: ${reportData.height || 'Not found'} ft`);
      console.log(`- Original Thickness: ${reportData.originalThickness || 'Not found'} inches`);
      
      // Show some thickness measurements
      if (analysis.thicknessMeasurements.length > 0) {
        console.log('\n🔧 Sample Thickness Measurements:');
        analysis.thicknessMeasurements.slice(0, 5).forEach((tm, i) => {
          console.log(`  ${i + 1}. ${tm.component} at ${tm.location}: ${tm.currentThickness}" (orig: ${tm.originalThickness}")`);
        });
        if (analysis.thicknessMeasurements.length > 5) {
          console.log(`  ... and ${analysis.thicknessMeasurements.length - 5} more measurements`);
        }
      }
      
      // Show mapping suggestions
      if (Object.keys(analysis.mappingSuggestions).length > 0) {
        console.log('\n💡 Mapping Suggestions:');
        for (const [field, suggestion] of Object.entries(analysis.mappingSuggestions)) {
          console.log(`  - ${field}: ${suggestion}`);
        }
      }
      
      // Process with AI
      console.log('\n🤖 Processing with AI for import...');
      const importResult = await processPDFWithAI(analysis);
      console.log(`✓ Import data prepared`);
      console.log(`  - Thickness measurements validated: ${importResult.thicknessMeasurements.length}`);
      console.log(`  - Preview length: ${importResult.preview.length} chars`);
      
      console.log('\n✅ PDF import test completed successfully!');
      
    } catch (error) {
      console.error(`\n❌ Error testing PDF: ${error.message}`);
      console.error('Stack:', error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('PDF IMPORT TESTING COMPLETE');
  console.log('='.repeat(60) + '\n');
}

// Run the test
testPDFImport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});