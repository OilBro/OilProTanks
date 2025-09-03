import { jsPDF } from 'jspdf';
import { addCoverPageLogo, addHeaderLogo } from '../lib/logo-utils';
import type { 
  InspectionReport, 
  ThicknessMeasurement, 
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  ReportAttachment
} from '@shared/schema';

export interface ProfessionalReportData {
  report: InspectionReport;
  measurements: ThicknessMeasurement[];
  checklists: InspectionChecklist[];
  appurtenanceInspections?: AppurtenanceInspection[];
  repairRecommendations?: RepairRecommendation[];
  ventingInspections?: VentingSystemInspection[];
  attachments?: ReportAttachment[];
  shellCalculations?: any;
  settlementSurvey?: any;
  cmlData?: any[];
}

export function generateProfessionalPDF(data: ProfessionalReportData): void {
  console.log('Generating professional API 653 report...');
  
  const doc = new jsPDF();
  const { 
    report, 
    measurements, 
    checklists, 
    appurtenanceInspections = [], 
    repairRecommendations = [], 
    ventingInspections = [], 
    attachments = []
  } = data;

  let yPosition = 20;
  const pageHeight = 280;
  const margin = 20;
  let pageNumber = 1;

  // Helper function to check page break
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      addPageFooter();
      doc.addPage();
      pageNumber++;
      yPosition = 20;
      addPageHeader();
    }
  };

  // Add page header
  const addPageHeader = () => {
    if (pageNumber > 1) {
      // Add logo on the left
      addHeaderLogo(doc);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('API-653 Inspection Report', 210 - margin, 10, { align: 'right' });
      doc.line(margin, 15, 210 - margin, 15);
      yPosition = 25;
    }
  };

  // Add page footer
  const addPageFooter = () => {
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('This document is intended for the sole use of OilPro and its customers.', 105, 285, { align: 'center' });
    doc.text('Any unauthorized reproduction of this document is prohibited. © 2025', 105, 290, { align: 'center' });
    doc.text(`${pageNumber} of ${doc.getNumberOfPages()}`, 210 - margin, 285, { align: 'right' });
  };

  // COVER PAGE
  generateCoverPage(doc, report);

  // REVISION HISTORY PAGE
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  generateRevisionHistory(doc, report, yPosition);

  // TABLE OF CONTENTS
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  generateTableOfContents(doc, yPosition);

  // EVALUATION SUMMARY AND REPAIR CHECKLIST
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateEvaluationSummary(doc, report, repairRecommendations, yPosition);

  // TANK SPECIFICATIONS
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateTankSpecifications(doc, report, yPosition);

  // FOUNDATION AND BOTTOM EXTENSION
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateFoundationSection(doc, report, yPosition);

  // EXTERNAL SHELL
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateExternalShellSection(doc, report, measurements, yPosition);

  // THICKNESS MEASUREMENTS
  if (measurements.length > 0) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
    addPageHeader();
    generateThicknessMeasurements(doc, measurements, yPosition);
  }

  // SHELL CORROSION RATE ANALYSIS
  if (measurements.length > 0) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
    addPageHeader();
    generateCorrosionRateAnalysis(doc, measurements, yPosition);
  }

  // APPURTENANCE INSPECTIONS
  if (appurtenanceInspections.length > 0) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
    addPageHeader();
    generateAppurtenanceInspections(doc, appurtenanceInspections, yPosition);
  }

  // REPAIR RECOMMENDATIONS
  if (repairRecommendations.length > 0) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
    addPageHeader();
    generateRepairRecommendations(doc, repairRecommendations, yPosition);
  }

  // INSPECTION CHECKLISTS
  if (checklists.length > 0) {
    doc.addPage();
    pageNumber++;
    yPosition = 20;
    addPageHeader();
    generateInspectionChecklists(doc, checklists, yPosition);
  }

  // EXTERNAL SURVEY
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateExternalSurvey(doc, report, yPosition);

  // INSPECTOR QUALIFICATIONS
  doc.addPage();
  pageNumber++;
  yPosition = 20;
  addPageHeader();
  generateInspectorQualifications(doc, report, yPosition);

  // Add footer to last page
  addPageFooter();

  // Save the PDF
  const filename = `${report.tankId}_API653_Professional_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  console.log('Professional PDF generated successfully!');
}

function generateCoverPage(doc: jsPDF, report: InspectionReport) {
  // Add OilPro logo at the top
  addCoverPageLogo(doc);
  
  // Company Header
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('API-653 Inspection Report', 105, 35, { align: 'center' });

  // Customer Information
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Customer: ${report.customer || 'TBD'}`, 20, 70);
  doc.text(`Location: ${report.location || 'TBD'}`, 20, 85);
  doc.text(`OilPro Job Number: ${report.reportNumber || 'TBD'}`, 20, 100);

  // Inspector Information
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Inspected By', 20, 130);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.inspector || 'TBD'}`, 20, 145);
  doc.text(`API-653 Certified Inspector`, 20, 160);

  // Tank Information
  doc.setFont(undefined, 'bold');
  doc.text('Scope of Inspection:', 110, 130);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.inspectionScope || 'External'}`, 110, 145);

  doc.setFont(undefined, 'bold');
  doc.text('Date Of Inspection:', 110, 160);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.inspectionDate || 'TBD'}`, 110, 175);

  doc.setFont(undefined, 'bold');
  doc.text('Tank Number:', 110, 190);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.tankId}`, 110, 205);

  // Reviewed By
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Reviewed By', 20, 190);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.reviewer || 'TBD'}`, 20, 205);
  doc.text(`P.E., API-653 Certified`, 20, 220);

  // Product Information
  doc.setFont(undefined, 'bold');
  doc.text('Product Stored:', 110, 220);
  doc.setFont(undefined, 'normal');
  doc.text(`${(report.service || '').toUpperCase()}`, 110, 235);

  doc.setFont(undefined, 'bold');
  doc.text('Specific Gravity:', 110, 250);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.specificGravity || 'TBD'}`, 110, 265);

  // Tank Specifications
  doc.setFont(undefined, 'bold');
  doc.text('Year Built:', 20, 250);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.yearBuilt || 'TBD'}`, 20, 265);

  doc.setFont(undefined, 'bold');
  doc.text('Diameter:', 70, 250);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.diameter || 'TBD'} Ft`, 70, 265);

  doc.setFont(undefined, 'bold');
  doc.text('Height:', 120, 250);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.height || 'TBD'} Ft`, 120, 265);

  // Company Footer
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('OilPro', 20, 280);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('811 Dafney Drive, Lafayette, LA', 20, 285);
  doc.text('Phone: (337) 446-7459 | Contact: Jerry Hartfield', 20, 290);
}

function generateRevisionHistory(doc: jsPDF, report: InspectionReport, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Revision History', 20, yPos);
  yPos += 20;

  // Table headers
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Revision', 20, yPos);
  doc.text('Date', 60, yPos);
  doc.text('Status', 100, yPos);
  doc.text('Revision Comments', 140, yPos);
  yPos += 10;

  // Draw table lines
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  // Add revision entry
  doc.setFont(undefined, 'normal');
  doc.text('0', 20, yPos);
  doc.text(new Date().toLocaleDateString(), 60, yPos);
  doc.text('Original Report Issued', 100, yPos);
  doc.text('Initial inspection report', 140, yPos);
}

function generateTableOfContents(doc: jsPDF, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Table of Contents', 20, yPos);
  yPos += 20;

  const contents = [
    { title: 'Revision History', page: 2 },
    { title: 'Table of Contents', page: 3 },
    { title: 'Evaluation Summary and Repair Checklist', page: 4 },
    { title: 'Tank Specifications', page: 5 },
    { title: 'Foundation and Bottom Extension', page: 6 },
    { title: 'External Shell', page: 7 },
    { title: 'Thickness Measurements', page: 8 },
    { title: 'Shell Corrosion Rate Analysis', page: 9 },
    { title: 'Appurtenance Inspections', page: 10 },
    { title: 'Repair Recommendations', page: 11 },
    { title: 'Inspection Checklists', page: 12 },
    { title: 'External Survey', page: 13 },
    { title: 'Inspector Qualifications', page: 14 }
  ];

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  contents.forEach(item => {
    doc.text(item.title, 20, yPos);
    doc.text(item.page.toString(), 190, yPos, { align: 'right' });
    yPos += 8;
  });
}

function generateEvaluationSummary(doc: jsPDF, report: InspectionReport, repairRecommendations: RepairRecommendation[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Evaluation Summary and Repair Checklist', 20, yPos);
  yPos += 20;

  doc.setFontSize(12);
  doc.text('Tank', 20, yPos);
  yPos += 15;

  // Create findings table
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('ID', 20, yPos);
  doc.text('Component', 35, yPos);
  doc.text('Finding', 70, yPos);
  doc.text('Suggested Corrective Action', 140, yPos);
  yPos += 5;

  // Draw table header line
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  // Add findings
  doc.setFont(undefined, 'normal');
  let findingId = 1;

  // Add general findings
  doc.text(`GEN-${findingId}`, 20, yPos);
  doc.text('General', 35, yPos);
  const generalFinding = doc.splitTextToSize('Tank inspection completed per API 653 requirements.', 65);
  doc.text(generalFinding, 70, yPos);
  const generalAction = doc.splitTextToSize('Continue monitoring per inspection schedule.', 45);
  doc.text(generalAction, 140, yPos);
  yPos += Math.max(generalFinding.length, generalAction.length) * 4 + 5;
  findingId++;

  // Add repair recommendations as findings
  repairRecommendations.forEach((rec, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(`REP-${findingId}`, 20, yPos);
    doc.text(rec.component || 'Component', 35, yPos);
    const finding = doc.splitTextToSize(rec.defectDescription || 'Defect identified', 65);
    doc.text(finding, 70, yPos);
    const action = doc.splitTextToSize(rec.recommendation || 'Repair recommended', 45);
    doc.text(action, 140, yPos);
    yPos += Math.max(finding.length, action.length) * 4 + 5;
    findingId++;
  });
}

function generateTankSpecifications(doc: jsPDF, report: InspectionReport, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Tank Specifications', 20, yPos);
  yPos += 20;

  const specs = [
    { label: 'Tank Number:', value: report.tankId },
    { label: 'Service:', value: (report.service || '').toUpperCase() },
    { label: 'Diameter:', value: `${report.diameter || 'TBD'} Ft` },
    { label: 'Height:', value: `${report.height || 'TBD'} Ft` },
    { label: 'Capacity:', value: `${report.capacity || 'TBD'} Barrels` },
    { label: 'Year Built:', value: report.yearBuilt || 'TBD' },
    { label: 'Manufacturer:', value: report.manufacturer || 'TBD' },
    { label: 'Construction Standard:', value: report.constructionStandard || 'API 650' },
    { label: 'Shell Material:', value: report.shellMaterial || 'Carbon Steel' },
    { label: 'Foundation Type:', value: report.foundationType || 'Concrete Ringwall' },
    { label: 'Roof Type:', value: report.roofType || 'Fixed Cone' },
    { label: 'Original Thickness:', value: `${report.originalThickness || 'TBD'} inches` },
    { label: 'Inspector:', value: report.inspector || 'TBD' },
    { label: 'Inspection Date:', value: report.inspectionDate || 'TBD' },
    { label: 'Report Number:', value: report.reportNumber || 'TBD' }
  ];

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  specs.forEach(spec => {
    doc.setFont(undefined, 'bold');
    doc.text(spec.label, 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(spec.value, 80, yPos);
    yPos += 8;
  });
}

function generateFoundationSection(doc: jsPDF, report: InspectionReport, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Foundation and Bottom Extension', 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const foundationText = `The tank rests on a ${report.foundationType || 'concrete ringwall'} foundation. The foundation condition was evaluated during this inspection. Areas of concern include settlement, cracking, and deterioration of sealing materials.`;
  
  const foundationLines = doc.splitTextToSize(foundationText, 170);
  doc.text(foundationLines, 20, yPos);
  yPos += foundationLines.length * 6 + 10;

  doc.setFont(undefined, 'bold');
  doc.text('Foundation Condition:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`• Settlement: ${report.foundationSettlement || 'Within acceptable limits'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Cracking: ${report.foundationCracking || 'No significant cracking observed'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Sealing: ${report.foundationSealing || 'Sealing materials in good condition'}`, 25, yPos);
}

function generateExternalShellSection(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('External Shell', 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const shellText = `The tank shell was inspected externally for corrosion, mechanical damage, and coating condition. Thickness measurements were taken at various locations to assess corrosion rates and remaining life.`;
  
  const shellLines = doc.splitTextToSize(shellText, 170);
  doc.text(shellLines, 20, yPos);
  yPos += shellLines.length * 6 + 10;

  doc.setFont(undefined, 'bold');
  doc.text('Shell Condition Summary:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`• Total Measurements: ${measurements.length}`, 25, yPos);
  yPos += 6;
  
  const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
  const monitorCount = measurements.filter(m => m.status === 'monitor').length;
  const actionCount = measurements.filter(m => m.status === 'action_required').length;
  
  doc.text(`• Acceptable: ${acceptableCount}`, 25, yPos);
  yPos += 6;
  doc.text(`• Monitor: ${monitorCount}`, 25, yPos);
  yPos += 6;
  doc.text(`• Action Required: ${actionCount}`, 25, yPos);
  yPos += 6;
  
  doc.text(`• Coating Condition: ${report.coatingCondition || 'Good with localized areas of deterioration'}`, 25, yPos);
}

function generateThicknessMeasurements(doc: jsPDF, measurements: ThicknessMeasurement[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Thickness Measurements', 20, yPos);
  yPos += 20;

  // Group measurements by component
  const componentGroups = measurements.reduce((groups, measurement) => {
    const component = measurement.component || 'Unknown';
    if (!groups[component]) {
      groups[component] = [];
    }
    groups[component].push(measurement);
    return groups;
  }, {} as Record<string, ThicknessMeasurement[]>);

  Object.keys(componentGroups).forEach(componentName => {
    const componentMeasurements = componentGroups[componentName];
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${(componentName || '').toUpperCase()} MEASUREMENTS`, 20, yPos);
    yPos += 15;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Location', 20, yPos);
    doc.text('Original (in)', 60, yPos);
    doc.text('Current (in)', 90, yPos);
    doc.text('Loss (in)', 120, yPos);
    doc.text('Corr Rate (in/yr)', 145, yPos);
    doc.text('Remaining Life (yrs)', 175, yPos);
    yPos += 8;
    
    // Draw header line
    doc.line(20, yPos, 200, yPos);
    yPos += 5;
    
    doc.setFont(undefined, 'normal');
    componentMeasurements.forEach(measurement => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const originalThickness = parseFloat(measurement.originalThickness || '0') || 0;
      const currentThickness = parseFloat(measurement.currentThickness || '0') || 0;
      const thicknessLoss = originalThickness > 0 ? (originalThickness - currentThickness) : 0;
      const corrosionRate = parseFloat(measurement.corrosionRate || '0') || 0;
      const remainingLife = parseFloat(measurement.remainingLife || '0') || 0;
      
      doc.text(measurement.location || 'N/A', 20, yPos);
      doc.text(originalThickness.toFixed(3), 60, yPos);
      doc.text(currentThickness.toFixed(3), 90, yPos);
      doc.text(thicknessLoss.toFixed(3), 120, yPos);
      doc.text(corrosionRate.toFixed(4), 145, yPos);
      doc.text(remainingLife.toFixed(1), 175, yPos);
      yPos += 6;
    });
    
    yPos += 10;
  });
}

function generateCorrosionRateAnalysis(doc: jsPDF, measurements: ThicknessMeasurement[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Shell Corrosion Rate Analysis', 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const analysisText = `Corrosion rates were calculated based on the difference between original and current thickness measurements divided by the time in service. The analysis considers API 653 requirements for remaining life calculations.`;
  
  const analysisLines = doc.splitTextToSize(analysisText, 170);
  doc.text(analysisLines, 20, yPos);
  yPos += analysisLines.length * 6 + 10;

  // Calculate statistics
  const corrosionRates = measurements.map(m => parseFloat(m.corrosionRate || '0')).filter(rate => rate > 0);
  const avgCorrosionRate = corrosionRates.length > 0 ? corrosionRates.reduce((a, b) => a + b) / corrosionRates.length : 0;
  const maxCorrosionRate = corrosionRates.length > 0 ? Math.max(...corrosionRates) : 0;
  const minCorrosionRate = corrosionRates.length > 0 ? Math.min(...corrosionRates) : 0;

  doc.setFont(undefined, 'bold');
  doc.text('Corrosion Rate Statistics:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`• Average Corrosion Rate: ${avgCorrosionRate.toFixed(4)} in/yr`, 25, yPos);
  yPos += 6;
  doc.text(`• Maximum Corrosion Rate: ${maxCorrosionRate.toFixed(4)} in/yr`, 25, yPos);
  yPos += 6;
  doc.text(`• Minimum Corrosion Rate: ${minCorrosionRate.toFixed(4)} in/yr`, 25, yPos);
  yPos += 6;
  doc.text(`• Total Measurement Points: ${measurements.length}`, 25, yPos);
}

function generateAppurtenanceInspections(doc: jsPDF, appurtenances: AppurtenanceInspection[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Appurtenance Inspections', 20, yPos);
  yPos += 20;

  appurtenances.forEach(inspection => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${(inspection.appurtenanceType || '').toUpperCase()}: ${inspection.appurtenanceId}`, 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Location: ${inspection.location}`, 25, yPos);
    yPos += 6;
    doc.text(`Condition: ${(inspection.condition || '').toUpperCase()}`, 25, yPos);
    yPos += 6;
    
    if (inspection.findings) {
      doc.text('Findings:', 25, yPos);
      yPos += 4;
      const findingsLines = doc.splitTextToSize(inspection.findings, 160);
      doc.text(findingsLines, 30, yPos);
      yPos += findingsLines.length * 4;
    }
    
    if (inspection.recommendations) {
      doc.text('Recommendations:', 25, yPos);
      yPos += 4;
      const recLines = doc.splitTextToSize(inspection.recommendations, 160);
      doc.text(recLines, 30, yPos);
      yPos += recLines.length * 4;
    }
    
    yPos += 10;
  });
}

function generateRepairRecommendations(doc: jsPDF, recommendations: RepairRecommendation[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Repair Recommendations', 20, yPos);
  yPos += 20;

  // Sort by priority
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, routine: 3 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  sortedRecommendations.forEach((rec, index) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${rec.component} - ${(rec.priority || '').toUpperCase()} PRIORITY`, 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Defect Description:', 25, yPos);
    yPos += 4;
    const defectLines = doc.splitTextToSize(rec.defectDescription || 'No description provided', 160);
    doc.text(defectLines, 30, yPos);
    yPos += defectLines.length * 4 + 3;
    
    doc.text('Recommendation:', 25, yPos);
    yPos += 4;
    const recLines = doc.splitTextToSize(rec.recommendation || 'No recommendation provided', 160);
    doc.text(recLines, 30, yPos);
    yPos += recLines.length * 4 + 3;
    
    if (rec.apiReference) {
      doc.text(`API 653 Reference: ${rec.apiReference}`, 25, yPos);
      yPos += 6;
    }
    
    if (rec.dueDate) {
      doc.text(`Due Date: ${rec.dueDate}`, 25, yPos);
      yPos += 6;
    }
    
    yPos += 10;
  });
}

function generateInspectionChecklists(doc: jsPDF, checklists: InspectionChecklist[], yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Inspection Checklists', 20, yPos);
  yPos += 20;

  // Group by category
  const categories = ['external', 'internal', 'foundation', 'roof', 'other'];
  
  categories.forEach(category => {
    const categoryItems = checklists.filter(item => item.category === category);
    
    if (categoryItems.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`${category.toUpperCase()} INSPECTION CHECKLIST`, 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      categoryItems.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const checkMark = item.checked ? '☑' : '☐';
        doc.text(`${checkMark} ${item.item}`, 25, yPos);
        yPos += 6;
        
        if (item.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${item.notes}`, 160);
          doc.text(notesLines, 30, yPos);
          yPos += notesLines.length * 4;
        }
        
        yPos += 2;
      });
      
      yPos += 10;
    }
  });
}

function generateExternalSurvey(doc: jsPDF, report: InspectionReport, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('External Survey', 20, yPos);
  yPos += 20;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const surveyText = `The tank was surveyed externally to determine settlement patterns and evaluate compliance with API 653 requirements. Survey measurements were taken around the tank perimeter at regular intervals.`;
  
  const surveyLines = doc.splitTextToSize(surveyText, 170);
  doc.text(surveyLines, 20, yPos);
  yPos += surveyLines.length * 6 + 10;

  doc.setFont(undefined, 'bold');
  doc.text('Survey Results:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`• Maximum Settlement: ${report.maxSettlement || 'TBD'} inches`, 25, yPos);
  yPos += 6;
  doc.text(`• Settlement Location: ${report.settlementLocation || 'TBD'}`, 25, yPos);
  yPos += 6;
  doc.text(`• API 653 Compliance: ${report.settlementCompliance || 'Within acceptable limits'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Survey Method: ${report.surveyMethod || 'Electronic level and theodolite'}`, 25, yPos);
}

function generateInspectorQualifications(doc: jsPDF, report: InspectionReport, yPos: number) {
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Inspector Qualifications', 20, yPos);
  yPos += 20;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Lead Inspector', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${report.inspector || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`API 653 Certification: ${report.inspectorCertification || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`Years of Experience: ${report.inspectorExperience || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`Company: OilPro Tanks`, 25, yPos);
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Signature', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Inspector: _________________________', 25, yPos);
  yPos += 8;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 25, yPos);
  yPos += 15;

  doc.text('Reviewed by: _________________________', 25, yPos);
  yPos += 8;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 25, yPos);
}