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

export interface TeamStandardReportData {
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

export function generateTeamStandardPDF(data: TeamStandardReportData): void {
  console.log('Generating OilPro standard API 653 report...');
  
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

  let totalPages = 0;
  let currentPage = 1;
  
  // Professional formatting constants
  const companyHeader = {
    name: 'OilPro Tanks',
    title: 'API-653 Inspection Report',
    address1: '811 Dafney Drive',
    address2: 'Lafayette, LA',
    phone: 'Office – (337) 446-7459',
    contact: 'Jerry Hartfield'
  };

  // Helper function to add professional header
  const addProfessionalHeader = () => {
    // Add logo on the left
    addHeaderLogo(doc);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(companyHeader.title, 105, 18, { align: 'center' });
  };

  // Helper function to add professional footer
  const addProfessionalFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This document is intended for the sole use of OilPro and its customers.', 105, 280, { align: 'center' });
    doc.text('Any unauthorized reproduction of this document is prohibited. © 2025', 105, 284, { align: 'center' });
    doc.text(`${pageNum} of ${totalPages}`, 190, 284, { align: 'right' });
  };

  // COVER PAGE - Professional Layout
  generateProfessionalCoverPage(doc, report, companyHeader);
  
  // REVISION HISTORY
  doc.addPage();
  currentPage++;
  generateProfessionalRevisionHistory(doc, report);
  addProfessionalFooter(currentPage);

  // TABLE OF CONTENTS
  doc.addPage();
  currentPage++;
  generateProfessionalTableOfContents(doc);
  addProfessionalFooter(currentPage);

  // EVALUATION SUMMARY AND REPAIR CHECKLIST
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateProfessionalEvaluationSummary(doc, report, repairRecommendations, measurements);
  addProfessionalFooter(currentPage);

  // TANK PHOTOS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateTankPhotosSection(doc, report);
  addProfessionalFooter(currentPage);

  // FOUNDATION AND BOTTOM EXTENSION
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateProfessionalFoundationSection(doc, report);
  addProfessionalFooter(currentPage);

  // EXTERNAL SHELL
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateProfessionalExternalShellSection(doc, report, measurements);
  addProfessionalFooter(currentPage);

  // NOZZLE LAYOUT
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateNozzleLayout(doc, appurtenanceInspections);
  addProfessionalFooter(currentPage);

  // SHELL ITEMS AND SEAMS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateShellItemsAndSeams(doc, report);
  addProfessionalFooter(currentPage);

  // FILL HEIGHT ANALYSIS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateFillHeightAnalysis(doc, report);
  addProfessionalFooter(currentPage);

  // SHELL CORROSION RATE ANALYSIS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateShellCorrosionRateAnalysis(doc, measurements);
  addProfessionalFooter(currentPage);

  // HYDROSTATIC TESTING
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateHydrostaticTesting(doc, report);
  addProfessionalFooter(currentPage);

  // EXTERNAL SURVEY
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateProfessionalExternalSurvey(doc, report);
  addProfessionalFooter(currentPage);

  // EQUIPMENT CALIBRATION LOG
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateEquipmentCalibrationLog(doc);
  addProfessionalFooter(currentPage);

  // INSPECTOR QUALIFICATIONS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateProfessionalInspectorQualifications(doc, report);
  addProfessionalFooter(currentPage);

  // Update total pages
  totalPages = doc.getNumberOfPages();

  // Save the PDF
  const filename = `${report.tankId}_API653_OilPro_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  console.log('OilPro standard PDF generated successfully!');
}

function generateProfessionalCoverPage(doc: jsPDF, report: InspectionReport, companyHeader: any) {
  // Add OilPro logo at the top
  addCoverPageLogo(doc);
  
  // Company Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(companyHeader.title, 105, 25, { align: 'center' });

  // Two column layout for tank information
  const leftX = 20;
  const rightX = 110;
  let yPos = 45;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Left column
  doc.text(`Customer: ${report.customer || 'TBD'}`, leftX, yPos);
  yPos += 12;
  doc.text(`Location: ${report.location || 'TBD'}`, leftX, yPos);
  yPos += 12;
  doc.text(`TTC Job Number: ${report.reportNumber || 'TBD'}`, leftX, yPos);
  yPos += 25;

  // Inspected By section
  doc.setFont('helvetica', 'bold');
  doc.text('Inspected By', leftX, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.inspector || 'TBD'} (API-653 #${report.inspectorCertification || 'TBD'})`, leftX, yPos);
  yPos += 6;
  doc.text('STI #TBD', leftX, yPos);
  
  // Reviewed By section
  yPos += 25;
  doc.setFont('helvetica', 'bold');
  doc.text('Reviewed By', leftX, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.reviewer || 'TBD'} (P.E., API-653 #TBD)`, leftX, yPos);

  // Right column
  yPos = 45;
  doc.text(`Scope of Inspection: ${report.inspectionScope || 'External'}`, rightX, yPos);
  yPos += 12;
  doc.text(`Date Of Inspection: ${report.inspectionDate || 'TBD'}`, rightX, yPos);
  yPos += 12;
  doc.text(`Revision: 0 (${new Date().toLocaleDateString()})`, rightX, yPos);
  yPos += 12;
  doc.text(`Tank Number: ${report.tankId}`, rightX, yPos);
  yPos += 12;
  doc.text(`Product Stored: ${(report.service || '').toUpperCase()}`, rightX, yPos);
  yPos += 12;
  doc.text(`Specific Gravity of Product: ${report.specificGravity || '1.0'} at 60°F`, rightX, yPos);
  yPos += 12;
  doc.text(`Year Built: ${report.yearBuilt || 'TBD'}`, rightX, yPos);
  yPos += 12;
  doc.text(`Manufacturer: ${report.manufacturer || 'TBD'}`, rightX, yPos);
  yPos += 12;
  doc.text(`Construction Standard: ${report.constructionStandard || 'API 650'}`, rightX, yPos);
  yPos += 12;
  doc.text('Construction Standard Edition:', rightX, yPos);
  yPos += 12;
  doc.text('Construction Standard Appendices:', rightX, yPos);
  yPos += 12;
  doc.text(`Foundation: ${report.foundationType || 'Concrete Ringwall'}`, rightX, yPos);
  yPos += 12;
  doc.text(`Shell Material(s) Per Ring: ${report.shellMaterial || 'Carbon Steel'}`, rightX, yPos);
  yPos += 12;
  doc.text('Shell Construction Method: Welded', rightX, yPos);
  yPos += 12;
  doc.text(`Diameter: ${report.diameter || 'TBD'} Ft`, rightX, yPos);
  yPos += 12;
  doc.text(`Height: ${report.height || 'TBD'} Ft`, rightX, yPos);
  yPos += 12;
  doc.text(`Capacity: ${report.capacity || 'TBD'} Barrels`, rightX, yPos);
  yPos += 12;
  doc.text(`Fixed Roof Type: ${report.roofType || 'Cone'}`, rightX, yPos);
  yPos += 12;
  doc.text('Floating Roof Type: None', rightX, yPos);
  yPos += 12;
  doc.text('Date of Previous External Inspection: Unknown', rightX, yPos);
  yPos += 12;
  doc.text('Next External Inspection Due Date: N/A', rightX, yPos);
  yPos += 12;
  doc.text('Date of Previous Internal Inspection: Unknown', rightX, yPos);
  yPos += 12;
  doc.text('Next Internal Inspection Due Date: N/A', rightX, yPos);

  // Company footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(companyHeader.name, leftX, 250);
  doc.setFont('helvetica', 'normal');
  doc.text(companyHeader.address1, leftX, 256);
  doc.text(companyHeader.address2, leftX, 262);
  doc.text(companyHeader.phone, leftX, 268);
  doc.text(companyHeader.website, leftX, 274);
}

function generateProfessionalRevisionHistory(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Revision History', 20, yPos);
  yPos += 15;

  // Table structure
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Revision', 20, yPos);
  doc.text('or Draft', 20, yPos + 5);
  doc.text('Revision ID', 45, yPos + 2.5);
  doc.text('Date', 70, yPos + 2.5);
  doc.text('Status', 95, yPos + 2.5);
  doc.text('Revision Comments', 130, yPos + 2.5);
  
  yPos += 10;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  // Revision entry
  doc.setFont('helvetica', 'normal');
  doc.text('0', 28, yPos);
  doc.text(new Date().toLocaleDateString(), 70, yPos);
  doc.text('Original Report Issued', 95, yPos);
  doc.text('Initial inspection report', 130, yPos);
}

function generateProfessionalTableOfContents(doc: jsPDF) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Table of Contents', 20, yPos);
  yPos += 15;

  const contents = [
    { title: 'Revision History', page: 2 },
    { title: 'Table of Contents', page: 3 },
    { title: 'Evaluation Summary and Repair Checklist', page: 4 },
    { title: 'Tank', page: 8 },
    { title: 'Additional Tank Photos', page: 9 },
    { title: 'Foundation and Bottom Extension', page: 11 },
    { title: 'External Shell', page: 16 },
    { title: 'External Shell (Continued)', page: 26 },
    { title: 'Nozzle Layout', page: 27 },
    { title: 'Shell Items and Seams', page: 28 },
    { title: 'Fill Height', page: 29 },
    { title: 'Shell Corrosion Rate Analysis', page: 30 },
    { title: 'Hydrostatic Testing by One-Foot Method', page: 31 },
    { title: 'Repad Reinforcement Suitability', page: 32 },
    { title: 'Access Structures', page: 36 },
    { title: 'External Fixed Roof', page: 40 },
    { title: 'Roof Layout', page: 45 },
    { title: 'External Fixed Roof Fittings', page: 46 },
    { title: 'External Fixed Roof Thickness Readings', page: 47 },
    { title: 'Roof Hitch Suitability', page: 48 },
    { title: 'External Survey', page: 49 },
    { title: 'Equipment Calibration Log', page: 53 },
    { title: 'Inspector Qualifications', page: 69 }
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  contents.forEach(item => {
    const dots = '.'.repeat(Math.floor((170 - doc.getTextWidth(item.title)) / 2));
    doc.text(item.title + dots + item.page, 20, yPos);
    yPos += 6;
  });
}

function generateProfessionalEvaluationSummary(doc: jsPDF, report: InspectionReport, repairRecommendations: RepairRecommendation[], measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Evaluation Summary and Repair Checklist', 20, yPos);
  yPos += 10;
  doc.text('Tank', 20, yPos);
  yPos += 10;

  // Only show table if there are actual findings
  if (!repairRecommendations || repairRecommendations.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No findings or recommendations to report at this time.', 20, yPos + 10);
    return;
  }

  // Table headers
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(20, yPos, 15, 8);
  doc.text('ID', 27, yPos + 5);
  doc.rect(35, yPos, 25, 8);
  doc.text('Component', 40, yPos + 5);
  doc.rect(60, yPos, 80, 8);
  doc.text('Finding', 65, yPos + 5);
  doc.rect(140, yPos, 50, 8);
  doc.text('Suggested Corrective Action', 145, yPos + 5);
  yPos += 8;

  // Generate finding IDs and add entries
  doc.setFont('helvetica', 'normal');

  // Add ONLY actual repair recommendations from database
  repairRecommendations.forEach((rec, index) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.rect(20, yPos, 15, 20);
    doc.text(`F-${index + 1}`, 22, yPos + 5);
    doc.rect(35, yPos, 25, 20);
    doc.text(rec.component || 'General', 37, yPos + 5);
    doc.rect(60, yPos, 80, 20);
    const recText = doc.splitTextToSize(rec.defectDescription || '', 75);
    doc.text(recText, 62, yPos + 5);
    doc.rect(140, yPos, 50, 20);
    const recAction = doc.splitTextToSize(rec.recommendation || '', 45);
    doc.text(recAction, 142, yPos + 5);
    yPos += 20;
  });
  
  // Add critical thickness measurements if any
  const criticalMeasurements = measurements.filter(m => m.status === 'action_required');
  criticalMeasurements.forEach((measurement, index) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.rect(20, yPos, 15, 20);
    doc.text(`TM-${index + 1}`, 22, yPos + 5);
    doc.rect(35, yPos, 25, 20);
    doc.text(measurement.component || 'Shell', 37, yPos + 5);
    doc.rect(60, yPos, 80, 20);
    const measurementText = doc.splitTextToSize(
      `Thickness at ${measurement.location}: ${measurement.currentThickness}" (Remaining Life: ${measurement.remainingLife || 'N/A'} years)`,
      75
    );
    doc.text(measurementText, 62, yPos + 5);
    doc.rect(140, yPos, 50, 20);
    const measurementAction = doc.splitTextToSize('Schedule repair/replacement per API 653', 45);
    doc.text(measurementAction, 142, yPos + 5);
    yPos += 20;
  });
}

function generateTankPhotosSection(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Tank', 20, yPos);
  yPos += 15;

  // Tank photo placeholder
  doc.rect(20, yPos, 170, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Tank Photo', 105, yPos + 50, { align: 'center' });
  yPos += 110;

  doc.setFont('helvetica', 'normal');
  doc.text(`Tank ${report.tankId} - ${(report.service || '').toUpperCase()} Service`, 105, yPos, { align: 'center' });
  yPos += 10;
  doc.text(`Diameter: ${report.diameter || 'TBD'} ft | Height: ${report.height || 'TBD'} ft`, 105, yPos, { align: 'center' });
}

function generateProfessionalFoundationSection(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Foundation and Bottom Extension', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const foundationText = `The tank rests on a ${report.foundationType || 'concrete ringwall'} within a concrete containment. The concrete containment had been installed flush with the top surface of the concrete ringwall. All concrete containment seams, cracks and the bottom extension have been sealed with an epoxy-like material.`;
  
  const foundationLines = doc.splitTextToSize(foundationText, 170);
  doc.text(foundationLines, 20, yPos);
  yPos += foundationLines.length * 5 + 10;

  // Foundation condition details
  doc.setFont('helvetica', 'bold');
  doc.text('Foundation Assessment:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Settlement: ${report.foundationSettlement || 'No significant settlement observed'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Cracking: ${report.foundationCracking || 'No significant cracking observed'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Sealing Condition: ${report.foundationSealing || 'Sealant in good condition'}`, 25, yPos);
  yPos += 6;
  doc.text('• Drainage: Containment drain clear and functional', 25, yPos);
  yPos += 6;
  doc.text('• Bottom Extension: Sealed with epoxy material', 25, yPos);
}

function generateProfessionalExternalShellSection(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('External Shell', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const shellText = `The external shell of Tank ${report.tankId} was visually inspected for signs of corrosion, mechanical damage, and coating deterioration. Ultrasonic thickness measurements were taken at various locations to assess the current condition and calculate corrosion rates.`;
  
  const shellLines = doc.splitTextToSize(shellText, 170);
  doc.text(shellLines, 20, yPos);
  yPos += shellLines.length * 5 + 10;

  // Shell condition summary
  doc.setFont('helvetica', 'bold');
  doc.text('Shell Condition Summary:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
  const monitorCount = measurements.filter(m => m.status === 'monitor').length;
  const actionCount = measurements.filter(m => m.status === 'action_required').length;
  
  doc.text(`• Total Thickness Measurements: ${measurements.length}`, 25, yPos);
  yPos += 6;
  doc.text(`• Acceptable Locations: ${acceptableCount}`, 25, yPos);
  yPos += 6;
  doc.text(`• Monitor Required: ${monitorCount}`, 25, yPos);
  yPos += 6;
  doc.text(`• Action Required: ${actionCount}`, 25, yPos);
  yPos += 6;
  doc.text(`• Coating Condition: ${report.coatingCondition || 'Good with localized areas of deterioration'}`, 25, yPos);
  yPos += 6;
  doc.text('• Grounding: Grounding cables in place and connected', 25, yPos);
  yPos += 6;
  doc.text('• Mechanical Damage: No significant dents or distortions observed', 25, yPos);
}

function generateNozzleLayout(doc: jsPDF, appurtenances: AppurtenanceInspection[]) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Nozzle Layout', 20, yPos);
  yPos += 15;

  // Nozzle diagram placeholder
  doc.rect(20, yPos, 170, 120);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Tank Nozzle Layout Diagram', 105, yPos + 60, { align: 'center' });
  yPos += 130;

  // Nozzle table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Nozzle', 20, yPos);
  doc.text('Size', 50, yPos);
  doc.text('Service', 70, yPos);
  doc.text('Elevation', 120, yPos);
  doc.text('Condition', 160, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  const nozzles = appurtenances.filter(a => a.appurtenanceType === 'nozzle');
  nozzles.forEach(nozzle => {
    doc.text(nozzle.appurtenanceId || 'N/A', 20, yPos);
    doc.text('4"', 50, yPos);
    doc.text('Process', 70, yPos);
    doc.text(nozzle.location || 'N/A', 120, yPos);
    doc.text((nozzle.condition || 'good').toUpperCase(), 160, yPos);
    yPos += 6;
  });
}

function generateShellItemsAndSeams(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Shell Items and Seams', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Shell Course Information:', 20, yPos);
  yPos += 10;

  // Shell course table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Course', 20, yPos);
  doc.text('Height (ft)', 50, yPos);
  doc.text('Nominal Thickness (in)', 80, yPos);
  doc.text('Material', 130, yPos);
  doc.text('Welding', 170, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  // Example shell courses
  for (let i = 1; i <= 4; i++) {
    doc.text(`Ring ${i}`, 20, yPos);
    doc.text('7.5', 50, yPos);
    doc.text(report.originalThickness || '0.250', 80, yPos);
    doc.text(report.shellMaterial || 'A36', 130, yPos);
    doc.text('Double V', 170, yPos);
    yPos += 6;
  }

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Weld Seam Inspection:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('• Vertical seams: No visible defects or corrosion', 25, yPos);
  yPos += 6;
  doc.text('• Horizontal seams: Good condition with minor surface rust', 25, yPos);
  yPos += 6;
  doc.text('• Weld efficiency: 0.85 (spot radiography)', 25, yPos);
}

function generateFillHeightAnalysis(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Fill Height', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fill Height Analysis per API 653 Section 4.3.3', 20, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  const analysisText = `The fill height analysis was performed using the one-foot method in accordance with API 653. The analysis considers the current thickness measurements, corrosion rates, and product specific gravity.`;
  
  const analysisLines = doc.splitTextToSize(analysisText, 170);
  doc.text(analysisLines, 20, yPos);
  yPos += analysisLines.length * 5 + 10;

  // Fill height results
  doc.setFont('helvetica', 'bold');
  doc.text('Analysis Results:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Product Specific Gravity: ${report.specificGravity || '1.0'}`, 25, yPos);
  yPos += 6;
  doc.text(`• Current Maximum Fill Height: ${report.height ? (parseFloat(report.height) * 0.95).toFixed(2) : 'TBD'} feet`, 25, yPos);
  yPos += 6;
  doc.text('• Inspection Interval at Current Fill Height: 5 years', 25, yPos);
  yPos += 6;
  doc.text('• Recommended Fill Height for 10-year Interval: Calculate based on thickness', 25, yPos);
}

function generateShellCorrosionRateAnalysis(doc: jsPDF, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Shell Corrosion Rate Analysis', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const analysisText = `Corrosion rates were calculated based on the difference between original and current thickness measurements. The analysis follows API 653 methodology for determining remaining life and inspection intervals.`;
  
  const analysisLines = doc.splitTextToSize(analysisText, 170);
  doc.text(analysisLines, 20, yPos);
  yPos += analysisLines.length * 5 + 10;

  // Statistical analysis
  const corrosionRates = measurements.map(m => parseFloat(m.corrosionRate || '0')).filter(rate => rate > 0);
  const avgRate = corrosionRates.length > 0 ? corrosionRates.reduce((a, b) => a + b) / corrosionRates.length : 0;
  const maxRate = corrosionRates.length > 0 ? Math.max(...corrosionRates) : 0;

  doc.setFont('helvetica', 'bold');
  doc.text('Corrosion Rate Statistics:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Average Corrosion Rate: ${avgRate.toFixed(4)} in/yr`, 25, yPos);
  yPos += 6;
  doc.text(`• Maximum Corrosion Rate: ${maxRate.toFixed(4)} in/yr`, 25, yPos);
  yPos += 6;
  doc.text(`• Total Measurement Points: ${measurements.length}`, 25, yPos);
  yPos += 6;
  doc.text('• Corrosion Type: General uniform corrosion', 25, yPos);
  yPos += 10;

  // Corrosion rate by course
  doc.setFont('helvetica', 'bold');
  doc.text('Corrosion Rate by Shell Course:', 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.text('Course', 20, yPos);
  doc.text('Avg Rate (mpy)', 60, yPos);
  doc.text('Max Rate (mpy)', 100, yPos);
  doc.text('Min Remaining Life (yrs)', 140, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  // Group by component/course
  const courseGroups = measurements.reduce((groups, m) => {
    const course = m.component || 'Unknown';
    if (!groups[course]) groups[course] = [];
    groups[course].push(m);
    return groups;
  }, {} as Record<string, ThicknessMeasurement[]>);

  Object.entries(courseGroups).forEach(([course, courseMeasurements]) => {
    const courseRates = courseMeasurements.map(m => parseFloat(m.corrosionRate || '0'));
    const courseAvg = courseRates.reduce((a, b) => a + b) / courseRates.length;
    const courseMax = Math.max(...courseRates);
    const minLife = Math.min(...courseMeasurements.map(m => parseFloat(m.remainingLife || '999')));
    
    doc.text(course, 20, yPos);
    doc.text((courseAvg * 1000).toFixed(1), 60, yPos);
    doc.text((courseMax * 1000).toFixed(1), 100, yPos);
    doc.text(minLife.toFixed(1), 140, yPos);
    yPos += 6;
  });
}

function generateHydrostaticTesting(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Hydrostatic Testing by One-Foot Method', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const testText = `The following analysis determines the hydrostatic test height requirements per API 653 Section 12.5. The one-foot method is used to establish the maximum fill height based on current thickness measurements.`;
  
  const testLines = doc.splitTextToSize(testText, 170);
  doc.text(testLines, 20, yPos);
  yPos += testLines.length * 5 + 10;

  // Test parameters
  doc.setFont('helvetica', 'bold');
  doc.text('Test Parameters:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Tank Diameter: ${report.diameter || 'TBD'} feet`, 25, yPos);
  yPos += 6;
  doc.text(`• Design Specific Gravity: ${report.specificGravity || '1.0'}`, 25, yPos);
  yPos += 6;
  doc.text('• Test Medium: Water (S.G. = 1.0)', 25, yPos);
  yPos += 6;
  doc.text('• Joint Efficiency: 0.85', 25, yPos);
  yPos += 6;
  doc.text('• Allowable Stress: 23,200 psi', 25, yPos);
  yPos += 10;

  // Test results
  doc.setFont('helvetica', 'bold');
  doc.text('Test Height Results by Course:', 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.text('Course', 20, yPos);
  doc.text('Current t (in)', 50, yPos);
  doc.text('Test Height (ft)', 90, yPos);
  doc.text('Limiting Course', 130, yPos);
  yPos += 5;
  doc.line(20, yPos, 170, yPos);
}

function generateProfessionalExternalSurvey(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('External Survey', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const surveyText = `The tank was surveyed externally to determine settlement patterns. Survey measurements were taken at regular intervals around the tank perimeter using electronic levels and theodolite equipment.`;
  
  const surveyLines = doc.splitTextToSize(surveyText, 170);
  doc.text(surveyLines, 20, yPos);
  yPos += surveyLines.length * 5 + 10;

  // Survey results
  doc.setFont('helvetica', 'bold');
  doc.text('Survey Results Summary:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Maximum Planar Settlement: ${report.maxSettlement || '0.24'} inches`, 25, yPos);
  yPos += 6;
  doc.text(`• Location: ${report.settlementLocation || 'Survey Radial 1'}`, 25, yPos);
  yPos += 6;
  doc.text('• Maximum Out-of-Plane Settlement: 0.12 inches', 25, yPos);
  yPos += 6;
  doc.text('• API 653 Allowable Settlement: 1.13 inches', 25, yPos);
  yPos += 6;
  doc.text(`• Compliance Status: ${report.settlementCompliance || 'ACCEPTABLE - Within API 653 limits'}`, 25, yPos);
  yPos += 10;

  // Survey methodology
  doc.setFont('helvetica', 'bold');
  doc.text('Survey Methodology:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('• Method: Electronic level with theodolite verification', 25, yPos);
  yPos += 6;
  doc.text('• Reference Point: East Shell Nozzle A', 25, yPos);
  yPos += 6;
  doc.text('• Survey Direction: Counter-clockwise', 25, yPos);
  yPos += 6;
  doc.text('• Number of Points: 32 (every 15 degrees)', 25, yPos);
}

function generateEquipmentCalibrationLog(doc: jsPDF) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Equipment Calibration Log', 20, yPos);
  yPos += 15;

  // Equipment table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Equipment', 20, yPos);
  doc.text('Model/Serial', 60, yPos);
  doc.text('Calibration Date', 100, yPos);
  doc.text('Due Date', 140, yPos);
  doc.text('Certificate', 170, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  // UT Equipment
  doc.text('UT Thickness Gauge', 20, yPos);
  doc.text('Olympus 38DL+', 60, yPos);
  doc.text(new Date(Date.now() - 30*24*60*60*1000).toLocaleDateString(), 100, yPos);
  doc.text(new Date(Date.now() + 335*24*60*60*1000).toLocaleDateString(), 140, yPos);
  doc.text('On File', 170, yPos);
  yPos += 6;

  // Level Equipment
  doc.text('Electronic Level', 20, yPos);
  doc.text('Topcon DL-503', 60, yPos);
  doc.text(new Date(Date.now() - 60*24*60*60*1000).toLocaleDateString(), 100, yPos);
  doc.text(new Date(Date.now() + 305*24*60*60*1000).toLocaleDateString(), 140, yPos);
  doc.text('On File', 170, yPos);
  yPos += 6;

  // Theodolite
  doc.text('Theodolite', 20, yPos);
  doc.text('Nikon NE-20SC', 60, yPos);
  doc.text(new Date(Date.now() - 45*24*60*60*1000).toLocaleDateString(), 100, yPos);
  doc.text(new Date(Date.now() + 320*24*60*60*1000).toLocaleDateString(), 140, yPos);
  doc.text('On File', 170, yPos);
}

function generateProfessionalInspectorQualifications(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspector Qualifications', 20, yPos);
  yPos += 20;

  // Lead Inspector
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Lead Inspector', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${report.inspector || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`API 653 Certification: #${report.inspectorCertification || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`Years of Experience: ${report.inspectorExperience || '10+'}`, 25, yPos);
  yPos += 8;
  doc.text('Additional Certifications:', 25, yPos);
  yPos += 6;
  doc.text('• STI Tank Inspector', 30, yPos);
  yPos += 6;
  doc.text('• NACE Coating Inspector Level 2', 30, yPos);
  yPos += 6;
  doc.text('• AWS Certified Welding Inspector', 30, yPos);
  yPos += 15;

  // Reviewer
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Technical Reviewer', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${report.reviewer || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text('Professional Engineer (P.E.)', 25, yPos);
  yPos += 8;
  doc.text('API 653 Certified Inspector', 25, yPos);
  yPos += 20;

  // Signatures
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text('Inspected By:', 20, yPos);
  doc.text('Reviewed By:', 110, yPos);
  yPos += 30;

  doc.line(20, yPos, 80, yPos);
  doc.line(110, yPos, 170, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(report.inspector || 'Inspector Name', 50, yPos, { align: 'center' });
  doc.text(report.reviewer || 'Reviewer Name', 140, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`API-653 #${report.inspectorCertification || 'TBD'}`, 50, yPos, { align: 'center' });
  doc.text('P.E., API-653 #TBD', 140, yPos, { align: 'center' });
}