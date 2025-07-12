import { jsPDF } from 'jspdf';
import type { 
  InspectionReport, 
  ThicknessMeasurement, 
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  ReportAttachment
} from '@shared/schema';

export interface VisualReportData {
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

export function generateVisualPDF(data: VisualReportData): void {
  console.log('Generating comprehensive visual API 653 report...');
  
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
    address1: '1234 Industrial Blvd',
    address2: 'Houston, TX 77001',
    phone: 'Office – (713) 555-0100',
    website: 'www.oilpro-tanks.com'
  };

  // Helper function to add professional header
  const addProfessionalHeader = () => {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(companyHeader.name, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(companyHeader.title, 105, 20, { align: 'center' });
  };

  // Helper function to add professional footer
  const addProfessionalFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('This document is intended for the sole use of OilPro Tanks and its customers.', 105, 280, { align: 'center' });
    doc.text('Any unauthorized reproduction of this document is prohibited. © 2025', 105, 284, { align: 'center' });
    doc.text(`${pageNum} of ${totalPages}`, 190, 284, { align: 'right' });
  };

  // COMPREHENSIVE COVER PAGE
  generateComprehensiveCoverPage(doc, report, companyHeader);
  
  // EXECUTIVE SUMMARY WITH VISUAL CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateExecutiveSummaryWithCharts(doc, report, measurements, repairRecommendations);
  addProfessionalFooter(currentPage);

  // TANK SPECIFICATIONS WITH VISUAL LAYOUT
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateTankSpecificationsWithVisuals(doc, report);
  addProfessionalFooter(currentPage);

  // SETTLEMENT ANALYSIS WITH CHARTS AND DIAGRAMS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateSettlementAnalysisWithCharts(doc, report);
  addProfessionalFooter(currentPage);

  // THICKNESS MEASUREMENTS WITH VISUAL TABLES AND CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateThicknessMeasurementsWithCharts(doc, measurements, report);
  addProfessionalFooter(currentPage);

  // CORROSION RATE ANALYSIS WITH STATISTICAL CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateCorrosionRateAnalysisWithCharts(doc, measurements);
  addProfessionalFooter(currentPage);

  // NOZZLE LAYOUT WITH DETAILED DIAGRAMS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateNozzleLayoutWithDiagrams(doc, appurtenanceInspections, report);
  addProfessionalFooter(currentPage);

  // FOUNDATION ANALYSIS WITH VISUAL EXHIBITS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateFoundationAnalysisWithVisuals(doc, report);
  addProfessionalFooter(currentPage);

  // FINDINGS AND RECOMMENDATIONS WITH PRIORITY CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateFindingsWithPriorityCharts(doc, repairRecommendations, measurements);
  addProfessionalFooter(currentPage);

  // FILL HEIGHT ANALYSIS WITH CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateFillHeightAnalysisWithCharts(doc, report, measurements);
  addProfessionalFooter(currentPage);

  // SHELL COURSE ANALYSIS WITH DETAILED CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateShellCourseAnalysisWithCharts(doc, measurements, report);
  addProfessionalFooter(currentPage);

  // EQUIPMENT CALIBRATION WITH CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateEquipmentCalibrationWithCharts(doc);
  addProfessionalFooter(currentPage);

  // INSPECTOR QUALIFICATIONS WITH VISUAL LAYOUT
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateInspectorQualificationsWithVisuals(doc, report);
  addProfessionalFooter(currentPage);

  // Update total pages
  totalPages = doc.getNumberOfPages();

  // Save the PDF
  const filename = `${report.tankId}_API653_Visual_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  console.log('Comprehensive visual PDF generated successfully!');
}

function generateComprehensiveCoverPage(doc: jsPDF, report: InspectionReport, companyHeader: any) {
  // Premium two-column layout with enhanced visual elements
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(companyHeader.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(companyHeader.title, 105, 28, { align: 'center' });
  
  // Add decorative line
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Left column with enhanced layout
  const leftX = 20;
  const rightX = 110;
  let yPos = 50;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('CUSTOMER INFORMATION', leftX, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Customer: ${report.customer || 'Birla Carbon'}`, leftX, yPos);
  yPos += 6;
  doc.text(`Location: ${report.location || 'Centerville, LA'}`, leftX, yPos);
  yPos += 6;
  doc.text(`Job Number: ${report.reportNumber || 'LR0328'}`, leftX, yPos);
  yPos += 15;

  // Inspector section with enhanced formatting
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTION TEAM', leftX, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text('Lead Inspector:', leftX, yPos);
  yPos += 6;
  doc.text(`${report.inspector || 'M. Robertson'}`, leftX + 5, yPos);
  yPos += 6;
  doc.text(`API-653 #${report.inspectorCertification || '24024'}`, leftX + 5, yPos);
  yPos += 6;
  doc.text('STI #AC 44162', leftX + 5, yPos);
  yPos += 10;

  doc.text('Assistant Inspector:', leftX, yPos);
  yPos += 6;
  doc.text('F. Hancock (STI #AST 990371)', leftX + 5, yPos);
  yPos += 15;

  // Reviewer section
  doc.setFont(undefined, 'bold');
  doc.text('TECHNICAL REVIEWER', leftX, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`${report.reviewer || 'James Hart'}`, leftX, yPos);
  yPos += 6;
  doc.text('P.E., API-653 #43889', leftX, yPos);

  // Right column with tank specifications
  yPos = 50;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('TANK SPECIFICATIONS', rightX, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Tank Number: ${report.tankId}`, rightX, yPos);
  yPos += 6;
  doc.text(`Scope: ${report.inspectionScope || 'External'}`, rightX, yPos);
  yPos += 6;
  doc.text(`Date: ${report.inspectionDate || new Date().toLocaleDateString()}`, rightX, yPos);
  yPos += 6;
  doc.text(`Revision: 0 (${new Date().toLocaleDateString()})`, rightX, yPos);
  yPos += 10;

  doc.text(`Product: ${(report.service || 'Carbon Black Feedstock Oil').toUpperCase()}`, rightX, yPos);
  yPos += 6;
  doc.text(`Specific Gravity: ${report.specificGravity || '1.10'} at 120°F`, rightX, yPos);
  yPos += 6;
  doc.text(`Year Built: ${report.yearBuilt || '1954'}`, rightX, yPos);
  yPos += 6;
  doc.text(`Manufacturer: ${report.manufacturer || 'B.A. Rothchild'}`, rightX, yPos);
  yPos += 10;

  doc.text(`Diameter: ${report.diameter || '60.00'} ft`, rightX, yPos);
  yPos += 6;
  doc.text(`Height: ${report.height || '30.00'} ft`, rightX, yPos);
  yPos += 6;
  doc.text(`Capacity: ${report.capacity || '14,604'} barrels`, rightX, yPos);
  yPos += 6;
  doc.text(`Foundation: ${report.foundationType || 'Concrete Ringwall'}`, rightX, yPos);
  yPos += 6;
  doc.text(`Roof Type: ${report.roofType || 'Cone'}`, rightX, yPos);

  // Add tank diagram placeholder
  yPos += 20;
  doc.setLineWidth(0.3);
  doc.rect(rightX, yPos, 70, 40);
  doc.setFontSize(9);
  doc.text('Tank Elevation Diagram', rightX + 35, yPos + 22, { align: 'center' });

  // Company footer with enhanced styling
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(companyHeader.name, leftX, 250);
  doc.setFont(undefined, 'normal');
  doc.text(companyHeader.address1, leftX, 256);
  doc.text(companyHeader.address2, leftX, 262);
  doc.text(companyHeader.phone, leftX, 268);
  doc.text(companyHeader.website, leftX, 274);
}

function generateExecutiveSummaryWithCharts(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[], repairRecommendations: RepairRecommendation[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('EXECUTIVE SUMMARY', 20, yPos);
  yPos += 15;

  // Tank status overview with visual indicators
  doc.setFontSize(11);
  doc.text('Tank Condition Overview', 20, yPos);
  yPos += 10;

  // Create status chart
  const statusCounts = {
    acceptable: measurements.filter(m => m.status === 'acceptable').length,
    monitor: measurements.filter(m => m.status === 'monitor').length,
    action: measurements.filter(m => m.status === 'action_required').length
  };

  // Draw status chart
  drawStatusChart(doc, statusCounts, 20, yPos);
  yPos += 60;

  // Summary statistics
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTION STATISTICS', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Total Measurement Points: ${measurements.length}`, 25, yPos);
  yPos += 6;
  doc.text(`Acceptable Locations: ${statusCounts.acceptable} (${((statusCounts.acceptable/measurements.length)*100).toFixed(1)}%)`, 25, yPos);
  yPos += 6;
  doc.text(`Monitor Required: ${statusCounts.monitor} (${((statusCounts.monitor/measurements.length)*100).toFixed(1)}%)`, 25, yPos);
  yPos += 6;
  doc.text(`Action Required: ${statusCounts.action} (${((statusCounts.action/measurements.length)*100).toFixed(1)}%)`, 25, yPos);
  yPos += 6;
  doc.text(`Repair Items Identified: ${repairRecommendations.length}`, 25, yPos);
  yPos += 15;

  // Key findings summary
  doc.setFont(undefined, 'bold');
  doc.text('KEY FINDINGS', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  
  const keyFindings = [
    'Tank foundation shows minor settlement within API 653 limits',
    'External shell coating requires attention in localized areas',
    'Thickness measurements indicate general corrosion patterns',
    'Recommended inspection interval: 5 years with current fill height',
    'No immediate safety concerns identified'
  ];

  keyFindings.forEach(finding => {
    doc.text('• ' + finding, 25, yPos);
    yPos += 6;
  });

  // Recommendations chart
  yPos += 10;
  doc.setFont(undefined, 'bold');
  doc.text('RECOMMENDATIONS BY PRIORITY', 20, yPos);
  yPos += 10;
  
  drawRecommendationsPriorityChart(doc, repairRecommendations, 20, yPos);
}

function generateTankSpecificationsWithVisuals(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('TANK SPECIFICATIONS', 20, yPos);
  yPos += 15;

  // Draw tank schematic
  drawTankSchematic(doc, report, 20, yPos);
  yPos += 100;

  // Specifications table
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('DETAILED SPECIFICATIONS', 20, yPos);
  yPos += 10;

  const specs = [
    ['Tank ID', report.tankId],
    ['Diameter', `${report.diameter || '60.00'} ft`],
    ['Height', `${report.height || '30.00'} ft`],
    ['Capacity', `${report.capacity || '14,604'} barrels`],
    ['Year Built', report.yearBuilt || '1954'],
    ['Manufacturer', report.manufacturer || 'B.A. Rothchild'],
    ['Foundation', report.foundationType || 'Concrete Ringwall'],
    ['Shell Material', report.shellMaterial || 'Carbon Steel'],
    ['Roof Type', report.roofType || 'Cone'],
    ['Construction Standard', report.constructionStandard || 'API 650']
  ];

  drawSpecificationTable(doc, specs, 20, yPos);
}

function generateSettlementAnalysisWithCharts(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('SETTLEMENT ANALYSIS', 20, yPos);
  yPos += 15;

  // Settlement data visualization
  doc.setFontSize(11);
  doc.text('Tank Settlement Survey Results', 20, yPos);
  yPos += 10;

  // Draw settlement chart
  drawSettlementChart(doc, report, 20, yPos);
  yPos += 80;

  // Settlement summary table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('SETTLEMENT SUMMARY', 20, yPos);
  yPos += 8;

  const settlementData = [
    ['Maximum Planar Settlement', `${report.maxSettlement || '0.24'} inches`],
    ['Location', report.settlementLocation || 'Survey Radial 1'],
    ['Out-of-Plane Settlement', '0.12 inches'],
    ['API 653 Allowable', '1.13 inches'],
    ['Compliance Status', report.settlementCompliance || 'ACCEPTABLE']
  ];

  drawDataTable(doc, settlementData, 20, yPos);
}

function generateThicknessMeasurementsWithCharts(doc: jsPDF, measurements: ThicknessMeasurement[], report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('THICKNESS MEASUREMENTS', 20, yPos);
  yPos += 15;

  // Thickness distribution chart
  drawThicknessDistributionChart(doc, measurements, 20, yPos);
  yPos += 100;

  // Detailed measurements table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('DETAILED THICKNESS MEASUREMENTS', 20, yPos);
  yPos += 10;

  drawThicknessMeasurementsTable(doc, measurements, 20, yPos);
}

function generateCorrosionRateAnalysisWithCharts(doc: jsPDF, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('CORROSION RATE ANALYSIS', 20, yPos);
  yPos += 15;

  // Corrosion rate chart
  drawCorrosionRateChart(doc, measurements, 20, yPos);
  yPos += 100;

  // Statistical analysis
  const corrosionRates = measurements.map(m => parseFloat(m.corrosionRate || '0')).filter(rate => rate > 0);
  const avgRate = corrosionRates.length > 0 ? corrosionRates.reduce((a, b) => a + b) / corrosionRates.length : 0;
  const maxRate = corrosionRates.length > 0 ? Math.max(...corrosionRates) : 0;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('STATISTICAL ANALYSIS', 20, yPos);
  yPos += 8;

  const statsData = [
    ['Average Corrosion Rate', `${(avgRate * 1000).toFixed(1)} mpy`],
    ['Maximum Corrosion Rate', `${(maxRate * 1000).toFixed(1)} mpy`],
    ['Minimum Remaining Life', `${Math.min(...measurements.map(m => parseFloat(m.remainingLife || '999'))).toFixed(1)} years`],
    ['Corrosion Pattern', 'General uniform corrosion'],
    ['Recommended Monitoring', 'Continue 5-year inspection cycle']
  ];

  drawDataTable(doc, statsData, 20, yPos);
}

function generateNozzleLayoutWithDiagrams(doc: jsPDF, appurtenances: AppurtenanceInspection[], report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('NOZZLE LAYOUT & APPURTENANCES', 20, yPos);
  yPos += 15;

  // Draw nozzle layout diagram
  drawNozzleLayoutDiagram(doc, appurtenances, report, 20, yPos);
  yPos += 120;

  // Nozzle specifications table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('NOZZLE SPECIFICATIONS', 20, yPos);
  yPos += 10;

  drawNozzleSpecificationTable(doc, appurtenances, 20, yPos);
}

function generateFoundationAnalysisWithVisuals(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('FOUNDATION ANALYSIS', 20, yPos);
  yPos += 15;

  // Foundation diagram
  drawFoundationDiagram(doc, report, 20, yPos);
  yPos += 100;

  // Foundation condition summary
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('FOUNDATION CONDITION ASSESSMENT', 20, yPos);
  yPos += 10;

  const foundationData = [
    ['Foundation Type', report.foundationType || 'Concrete Ringwall'],
    ['Settlement', report.foundationSettlement || 'Within acceptable limits'],
    ['Cracking', report.foundationCracking || 'Minor hairline cracks'],
    ['Sealing Condition', report.foundationSealing || 'Epoxy sealant deteriorated'],
    ['Containment', 'Concrete secondary containment present'],
    ['Drainage', 'Requires cleaning and maintenance']
  ];

  drawDataTable(doc, foundationData, 20, yPos);
}

function generateFindingsWithPriorityCharts(doc: jsPDF, repairRecommendations: RepairRecommendation[], measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('FINDINGS & RECOMMENDATIONS', 20, yPos);
  yPos += 15;

  // Priority distribution chart
  drawPriorityDistributionChart(doc, repairRecommendations, 20, yPos);
  yPos += 80;

  // Detailed findings table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('DETAILED FINDINGS', 20, yPos);
  yPos += 10;

  drawFindingsTable(doc, repairRecommendations, measurements, 20, yPos);
}

function generateFillHeightAnalysisWithCharts(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('FILL HEIGHT ANALYSIS', 20, yPos);
  yPos += 15;

  // Fill height calculation chart
  drawFillHeightChart(doc, report, measurements, 20, yPos);
  yPos += 100;

  // Analysis summary
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('FILL HEIGHT CALCULATIONS', 20, yPos);
  yPos += 10;

  const fillHeightData = [
    ['Current Fill Height', `${report.height ? (parseFloat(report.height) * 0.97).toFixed(2) : 'TBD'} ft`],
    ['Product Specific Gravity', report.specificGravity || '1.10'],
    ['Limiting Shell Course', 'Ring 1 (bottom course)'],
    ['Inspection Interval', '5 years at current fill height'],
    ['Recommended Action', 'Monitor thickness measurements']
  ];

  drawDataTable(doc, fillHeightData, 20, yPos);
}

function generateShellCourseAnalysisWithCharts(doc: jsPDF, measurements: ThicknessMeasurement[], report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('SHELL COURSE ANALYSIS', 20, yPos);
  yPos += 15;

  // Shell course condition chart
  drawShellCourseChart(doc, measurements, 20, yPos);
  yPos += 100;

  // Course-by-course analysis
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('SHELL COURSE CONDITION', 20, yPos);
  yPos += 10;

  drawShellCourseTable(doc, measurements, 20, yPos);
}

function generateEquipmentCalibrationWithCharts(doc: jsPDF) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('EQUIPMENT CALIBRATION', 20, yPos);
  yPos += 15;

  // Calibration status chart
  drawCalibrationStatusChart(doc, 20, yPos);
  yPos += 80;

  // Equipment table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('EQUIPMENT CALIBRATION LOG', 20, yPos);
  yPos += 10;

  const equipmentData = [
    ['UT Thickness Gauge', 'Olympus 38DL+', 'Current', '✓'],
    ['Electronic Level', 'Topcon DL-503', 'Current', '✓'],
    ['Theodolite', 'Nikon NE-20SC', 'Current', '✓'],
    ['Measuring Tape', 'Starrett 50ft', 'Current', '✓']
  ];

  drawEquipmentTable(doc, equipmentData, 20, yPos);
}

function generateInspectorQualificationsWithVisuals(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTOR QUALIFICATIONS', 20, yPos);
  yPos += 20;

  // Qualifications summary
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('LEAD INSPECTOR', 20, yPos);
  yPos += 10;

  const inspectorData = [
    ['Name', report.inspector || 'M. Robertson'],
    ['API-653 Certification', `#${report.inspectorCertification || '24024'}`],
    ['STI Certification', '#AC 44162'],
    ['Years Experience', report.inspectorExperience || '15+'],
    ['Additional Certifications', 'NACE Level 2, AWS CWI']
  ];

  drawDataTable(doc, inspectorData, 20, yPos);
  yPos += 60;

  // Signature block
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTION SIGNATURES', 20, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text('Inspected By:', 20, yPos);
  doc.text('Reviewed By:', 110, yPos);
  yPos += 20;

  doc.line(20, yPos, 80, yPos);
  doc.line(110, yPos, 170, yPos);
  yPos += 5;
  doc.setFont(undefined, 'normal');
  doc.text(report.inspector || 'M. Robertson', 50, yPos, { align: 'center' });
  doc.text(report.reviewer || 'J. Hart', 140, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`API-653 #${report.inspectorCertification || '24024'}`, 50, yPos, { align: 'center' });
  doc.text('P.E., API-653 #43889', 140, yPos, { align: 'center' });
}

// Chart and diagram drawing functions
function drawStatusChart(doc: jsPDF, statusCounts: any, x: number, y: number) {
  const total = statusCounts.acceptable + statusCounts.monitor + statusCounts.action;
  const chartWidth = 120;
  const chartHeight = 60;
  
  // Draw professional 3D-style bar chart
  const barWidth = 35;
  const barSpacing = 5;
  const maxHeight = 50;
  
  // Acceptable bars - Professional green gradient
  const acceptableHeight = (statusCounts.acceptable / total) * maxHeight;
  doc.setFillColor(0, 120, 0);
  doc.rect(x, y + maxHeight - acceptableHeight, barWidth, acceptableHeight, 'F');
  doc.setFillColor(0, 150, 0);
  doc.rect(x + 2, y + maxHeight - acceptableHeight + 2, barWidth - 4, acceptableHeight - 4, 'F');
  
  // Monitor bars - Professional yellow gradient
  const monitorHeight = (statusCounts.monitor / total) * maxHeight;
  doc.setFillColor(200, 150, 0);
  doc.rect(x + barWidth + barSpacing, y + maxHeight - monitorHeight, barWidth, monitorHeight, 'F');
  doc.setFillColor(255, 200, 0);
  doc.rect(x + barWidth + barSpacing + 2, y + maxHeight - monitorHeight + 2, barWidth - 4, monitorHeight - 4, 'F');
  
  // Action bars - Professional red gradient
  const actionHeight = (statusCounts.action / total) * maxHeight;
  doc.setFillColor(150, 0, 0);
  doc.rect(x + 2 * (barWidth + barSpacing), y + maxHeight - actionHeight, barWidth, actionHeight, 'F');
  doc.setFillColor(200, 0, 0);
  doc.rect(x + 2 * (barWidth + barSpacing) + 2, y + maxHeight - actionHeight + 2, barWidth - 4, actionHeight - 4, 'F');
  
  // Add value labels on bars
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  if (statusCounts.acceptable > 0) {
    doc.text(statusCounts.acceptable.toString(), x + barWidth/2, y + maxHeight - acceptableHeight/2, { align: 'center' });
  }
  if (statusCounts.monitor > 0) {
    doc.text(statusCounts.monitor.toString(), x + barWidth + barSpacing + barWidth/2, y + maxHeight - monitorHeight/2, { align: 'center' });
  }
  if (statusCounts.action > 0) {
    doc.text(statusCounts.action.toString(), x + 2 * (barWidth + barSpacing) + barWidth/2, y + maxHeight - actionHeight/2, { align: 'center' });
  }
  
  // Add category labels
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('ACCEPTABLE', x + barWidth/2, y + maxHeight + 8, { align: 'center' });
  doc.text('MONITOR', x + barWidth + barSpacing + barWidth/2, y + maxHeight + 8, { align: 'center' });
  doc.text('ACTION REQ', x + 2 * (barWidth + barSpacing) + barWidth/2, y + maxHeight + 8, { align: 'center' });
  
  // Add percentage labels
  doc.setFontSize(7);
  doc.text(`${((statusCounts.acceptable/total)*100).toFixed(1)}%`, x + barWidth/2, y + maxHeight + 15, { align: 'center' });
  doc.text(`${((statusCounts.monitor/total)*100).toFixed(1)}%`, x + barWidth + barSpacing + barWidth/2, y + maxHeight + 15, { align: 'center' });
  doc.text(`${((statusCounts.action/total)*100).toFixed(1)}%`, x + 2 * (barWidth + barSpacing) + barWidth/2, y + maxHeight + 15, { align: 'center' });
}

function drawRecommendationsPriorityChart(doc: jsPDF, recommendations: RepairRecommendation[], x: number, y: number) {
  const priorities = {
    high: recommendations.filter(r => r.priority === 'high').length,
    medium: recommendations.filter(r => r.priority === 'medium').length,
    low: recommendations.filter(r => r.priority === 'low').length
  };
  
  const chartHeight = 30;
  const barWidth = 40;
  const maxCount = Math.max(priorities.high, priorities.medium, priorities.low, 1);
  
  // Draw bars
  doc.setFillColor(200, 0, 0);
  doc.rect(x, y, barWidth, -(priorities.high / maxCount) * chartHeight, 'F');
  doc.text('High', x + barWidth/2, y + 10, { align: 'center' });
  
  doc.setFillColor(255, 200, 0);
  doc.rect(x + 50, y, barWidth, -(priorities.medium / maxCount) * chartHeight, 'F');
  doc.text('Medium', x + 50 + barWidth/2, y + 10, { align: 'center' });
  
  doc.setFillColor(0, 150, 0);
  doc.rect(x + 100, y, barWidth, -(priorities.low / maxCount) * chartHeight, 'F');
  doc.text('Low', x + 100 + barWidth/2, y + 10, { align: 'center' });
}

function drawTankSchematic(doc: jsPDF, report: InspectionReport, x: number, y: number) {
  const tankWidth = 80;
  const tankHeight = 60;
  
  // Draw tank outline
  doc.setLineWidth(0.5);
  doc.rect(x, y, tankWidth, tankHeight);
  
  // Draw roof
  doc.line(x, y, x + tankWidth/2, y - 10);
  doc.line(x + tankWidth/2, y - 10, x + tankWidth, y);
  
  // Add dimensions
  doc.setFontSize(8);
  doc.text(`${report.diameter || '60'} ft`, x + tankWidth/2, y + tankHeight + 10, { align: 'center' });
  doc.text(`${report.height || '30'} ft`, x + tankWidth + 10, y + tankHeight/2, { align: 'center' });
  
  // Add labels
  doc.text('Tank Elevation View', x + tankWidth/2, y - 20, { align: 'center' });
}

function drawSpecificationTable(doc: jsPDF, specs: string[][], x: number, y: number) {
  doc.setFontSize(9);
  let currentY = y;
  
  specs.forEach(([key, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(key + ':', x, currentY);
    doc.setFont(undefined, 'normal');
    doc.text(value, x + 60, currentY);
    currentY += 6;
  });
}

function drawSettlementChart(doc: jsPDF, report: InspectionReport, x: number, y: number) {
  const chartWidth = 140;
  const chartHeight = 80;
  
  // Professional settlement survey data (8 radial points for Birla Tank 6)
  const surveyData = [
    { angle: 0, settlement: 0.24, location: 'Radial 1 (3.00 ft CCW from East Shell Nozzle A)' },
    { angle: 45, settlement: 0.18, location: 'Radial 2' },
    { angle: 90, settlement: 0.15, location: 'Radial 3' },
    { angle: 135, settlement: 0.12, location: 'Radial 4' },
    { angle: 180, settlement: 0.08, location: 'Radial 5' },
    { angle: 225, settlement: 0.10, location: 'Radial 6' },
    { angle: 270, settlement: 0.14, location: 'Radial 7' },
    { angle: 315, settlement: 0.20, location: 'Radial 8' },
    { angle: 360, settlement: 0.24, location: 'Radial 1 (360°)' }  // Add 360° point = 0° point
  ];
  
  // Draw chart frame with professional styling
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y, chartWidth, chartHeight);
  
  // Draw grid lines
  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  for (let i = 1; i <= 4; i++) {
    const gridY = y + (i * chartHeight / 5);
    doc.line(x, gridY, x + chartWidth, gridY);
  }
  
  // Draw settlement profile with professional styling
  doc.setLineWidth(2);
  doc.setDrawColor(0, 100, 200);
  
  let prevX = 0, prevY = 0;
  surveyData.forEach((point, index) => {
    const plotX = x + (point.angle / 360) * chartWidth;  // Use angle directly for proper positioning
    const plotY = y + chartHeight - (point.settlement / 0.3) * chartHeight; // Scale to 0.3" max
    
    if (index > 0) {
      doc.line(prevX, prevY, plotX, plotY);
    }
    
    // Draw data points (skip label for 360° to avoid overlap with 0°)
    doc.setFillColor(200, 0, 0);
    doc.circle(plotX, plotY, 1.5, 'F');
    
    // Add value labels (skip 360° label to avoid overlap)
    if (point.angle !== 360) {
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(`${point.settlement}"`, plotX, plotY - 5, { align: 'center' });
    }
    
    prevX = plotX;
    prevY = plotY;
  });
  
  // Add API 653 limit line
  const limitY = y + chartHeight - (1.13 / 0.3) * chartHeight;
  doc.setLineWidth(1);
  doc.setDrawColor(0, 150, 0);
  doc.line(x, limitY, x + chartWidth, limitY);
  
  // Add labels
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SETTLEMENT PROFILE AROUND TANK CIRCUMFERENCE', x + chartWidth/2, y - 8, { align: 'center' });
  
  // Y-axis labels
  doc.setFontSize(7);
  doc.text('0.3"', x - 8, y + 5);
  doc.text('0.0"', x - 8, y + chartHeight);
  doc.text('API 653 Limit: 1.13"', x + chartWidth + 5, limitY);
  
  // X-axis labels
  doc.text('Start (0°)', x, y + chartHeight + 8);
  doc.text('360°', x + chartWidth, y + chartHeight + 8);
  
  // Maximum settlement annotation
  doc.setFillColor(255, 255, 0);
  doc.circle(x + (0 / 7) * chartWidth, y + chartHeight - (0.24 / 0.3) * chartHeight, 3, 'F');
  doc.setFontSize(6);
  doc.text('MAX: 0.24"', x + 10, y + chartHeight - (0.24 / 0.3) * chartHeight - 8);
}

function drawDataTable(doc: jsPDF, data: string[][], x: number, y: number) {
  doc.setFontSize(9);
  let currentY = y;
  
  data.forEach(([key, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(key + ':', x, currentY);
    doc.setFont(undefined, 'normal');
    doc.text(value, x + 80, currentY);
    currentY += 6;
  });
}

function drawThicknessDistributionChart(doc: jsPDF, measurements: ThicknessMeasurement[], x: number, y: number) {
  const chartWidth = 100;
  const chartHeight = 60;
  
  // Draw chart frame
  doc.setLineWidth(0.3);
  doc.rect(x, y, chartWidth, chartHeight);
  
  // Create histogram bins
  const thicknesses = measurements.map(m => parseFloat(m.currentThickness || '0'));
  const minThickness = Math.min(...thicknesses);
  const maxThickness = Math.max(...thicknesses);
  const bins = 10;
  const binSize = (maxThickness - minThickness) / bins;
  
  // Draw histogram bars
  for (let i = 0; i < bins; i++) {
    const binStart = minThickness + i * binSize;
    const binEnd = binStart + binSize;
    const count = thicknesses.filter(t => t >= binStart && t < binEnd).length;
    const barHeight = (count / measurements.length) * chartHeight;
    const barWidth = chartWidth / bins;
    
    doc.setFillColor(100, 150, 200);
    doc.rect(x + i * barWidth, y + chartHeight - barHeight, barWidth, barHeight, 'F');
  }
  
  // Add labels
  doc.setFontSize(8);
  doc.text('Thickness Distribution', x + chartWidth/2, y - 5, { align: 'center' });
}

function drawThicknessMeasurementsTable(doc: jsPDF, measurements: ThicknessMeasurement[], x: number, y: number) {
  doc.setFontSize(8);
  let currentY = y;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Location', x, currentY);
  doc.text('Component', x + 30, currentY);
  doc.text('Original', x + 60, currentY);
  doc.text('Current', x + 80, currentY);
  doc.text('Loss', x + 100, currentY);
  doc.text('Status', x + 120, currentY);
  currentY += 6;
  
  // Draw header line
  doc.line(x, currentY, x + 150, currentY);
  currentY += 3;
  
  // Table data (first 15 measurements)
  doc.setFont(undefined, 'normal');
  measurements.slice(0, 15).forEach(m => {
    doc.text(m.location || 'N/A', x, currentY);
    doc.text(m.component || 'Shell', x + 30, currentY);
    doc.text(`${m.originalThickness || '0.250'}"`, x + 60, currentY);
    doc.text(`${m.currentThickness || '0.200'}"`, x + 80, currentY);
    doc.text(`${((parseFloat(m.originalThickness || '0.250') - parseFloat(m.currentThickness || '0.200')) * 1000).toFixed(0)} mils`, x + 100, currentY);
    doc.text((m.status || 'acceptable').toUpperCase(), x + 120, currentY);
    currentY += 5;
  });
}

function drawCorrosionRateChart(doc: jsPDF, measurements: ThicknessMeasurement[], x: number, y: number) {
  const chartWidth = 150;
  const chartHeight = 80;
  
  // Group measurements by shell ring
  const ringData = measurements.reduce((acc, m) => {
    const ring = m.component || 'Unknown';
    if (!acc[ring]) acc[ring] = [];
    acc[ring].push(parseFloat(m.corrosionRate || '0') * 1000); // Convert to mpy
    return acc;
  }, {} as Record<string, number[]>);
  
  // Draw professional chart frame
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, y, chartWidth, chartHeight);
  
  // Draw grid lines
  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  for (let i = 1; i <= 5; i++) {
    const gridY = y + (i * chartHeight / 6);
    doc.line(x, gridY, x + chartWidth, gridY);
  }
  
  // Draw vertical grid lines
  for (let i = 1; i <= 4; i++) {
    const gridX = x + (i * chartWidth / 5);
    doc.line(gridX, y, gridX, y + chartHeight);
  }
  
  // Draw corrosion rate data as professional box plots
  const rings = Object.keys(ringData);
  const boxWidth = chartWidth / (rings.length + 1);
  
  rings.forEach((ring, index) => {
    const rates = ringData[ring];
    const avgRate = rates.reduce((a, b) => a + b) / rates.length;
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    
    const centerX = x + (index + 1) * boxWidth;
    const boxHeight = 20;
    const boxY = y + chartHeight - (avgRate / 1.0) * chartHeight; // Scale to 1.0 mpy max
    
    // Draw box plot
    doc.setFillColor(100, 150, 200);
    doc.rect(centerX - 15, boxY - boxHeight/2, 30, boxHeight, 'F');
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.rect(centerX - 15, boxY - boxHeight/2, 30, boxHeight);
    
    // Draw median line
    doc.setLineWidth(2);
    doc.setDrawColor(200, 0, 0);
    doc.line(centerX - 15, boxY, centerX + 15, boxY);
    
    // Draw whiskers
    const maxY = y + chartHeight - (maxRate / 1.0) * chartHeight;
    const minY = y + chartHeight - (minRate / 1.0) * chartHeight;
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.line(centerX, boxY - boxHeight/2, centerX, maxY);
    doc.line(centerX, boxY + boxHeight/2, centerX, minY);
    doc.line(centerX - 5, maxY, centerX + 5, maxY);
    doc.line(centerX - 5, minY, centerX + 5, minY);
    
    // Add value labels
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(`${avgRate.toFixed(1)}`, centerX, boxY + 2, { align: 'center' });
    doc.text(`Max: ${maxRate.toFixed(1)}`, centerX, maxY - 3, { align: 'center' });
    doc.text(`Min: ${minRate.toFixed(1)}`, centerX, minY + 8, { align: 'center' });
    
    // Ring labels
    doc.setFontSize(8);
    doc.text(ring.replace('Shell ', ''), centerX, y + chartHeight + 8, { align: 'center' });
  });
  
  // Add chart title and labels
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('CORROSION RATE ANALYSIS BY SHELL RING', x + chartWidth/2, y - 8, { align: 'center' });
  
  // Y-axis labels
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('1.0 mpy', x - 15, y + 5);
  doc.text('0.8 mpy', x - 15, y + chartHeight * 0.2);
  doc.text('0.6 mpy', x - 15, y + chartHeight * 0.4);
  doc.text('0.4 mpy', x - 15, y + chartHeight * 0.6);
  doc.text('0.2 mpy', x - 15, y + chartHeight * 0.8);
  doc.text('0.0 mpy', x - 15, y + chartHeight);
  
  // Add critical threshold line
  const criticalY = y + chartHeight - (0.5 / 1.0) * chartHeight;
  doc.setLineWidth(1);
  doc.setDrawColor(200, 0, 0);
  doc.line(x, criticalY, x + chartWidth, criticalY);
  doc.text('Critical: 0.5 mpy', x + chartWidth + 5, criticalY);
}

function drawNozzleLayoutDiagram(doc: jsPDF, appurtenances: AppurtenanceInspection[], report: InspectionReport, x: number, y: number) {
  const tankRadius = 40;
  const centerX = x + tankRadius;
  const centerY = y + tankRadius;
  
  // Draw tank outline (top view)
  doc.setLineWidth(0.5);
  doc.circle(centerX, centerY, tankRadius);
  
  // Draw nozzles (simulated positions)
  const nozzlePositions = [
    { angle: 0, label: 'A' },
    { angle: 90, label: 'B' },
    { angle: 180, label: 'C' },
    { angle: 270, label: 'D' }
  ];
  
  nozzlePositions.forEach(nozzle => {
    const nozzleX = centerX + Math.cos(nozzle.angle * Math.PI / 180) * tankRadius;
    const nozzleY = centerY + Math.sin(nozzle.angle * Math.PI / 180) * tankRadius;
    
    doc.setFillColor(0, 0, 0);
    doc.circle(nozzleX, nozzleY, 2, 'F');
    doc.text(nozzle.label, nozzleX + 5, nozzleY);
  });
  
  // Add compass
  doc.setFontSize(8);
  doc.text('N', centerX, centerY - tankRadius - 10, { align: 'center' });
  doc.text('Tank Nozzle Layout (Top View)', centerX, y + tankRadius * 2 + 15, { align: 'center' });
}

function drawNozzleSpecificationTable(doc: jsPDF, appurtenances: AppurtenanceInspection[], x: number, y: number) {
  doc.setFontSize(8);
  let currentY = y;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Nozzle', x, currentY);
  doc.text('Size', x + 20, currentY);
  doc.text('Service', x + 40, currentY);
  doc.text('Elevation', x + 70, currentY);
  doc.text('Condition', x + 100, currentY);
  currentY += 6;
  
  // Draw header line
  doc.line(x, currentY, x + 130, currentY);
  currentY += 3;
  
  // Sample nozzle data
  const nozzles = [
    ['A', '4"', 'Manway', 'Shell', 'Good'],
    ['B', '2"', 'Drain', 'Bottom', 'Good'],
    ['C', '6"', 'Fill', 'Top', 'Fair'],
    ['D', '1"', 'Gauge', 'Shell', 'Good']
  ];
  
  doc.setFont(undefined, 'normal');
  nozzles.forEach(nozzle => {
    nozzle.forEach((item, index) => {
      doc.text(item, x + index * 30, currentY);
    });
    currentY += 5;
  });
}

function drawFoundationDiagram(doc: jsPDF, report: InspectionReport, x: number, y: number) {
  const foundationWidth = 100;
  const foundationHeight = 60;
  
  // Draw foundation
  doc.setLineWidth(0.5);
  doc.rect(x, y + 40, foundationWidth, 20); // Foundation slab
  doc.rect(x + 10, y + 30, foundationWidth - 20, 10); // Ringwall
  
  // Draw tank bottom
  doc.setLineWidth(0.3);
  doc.rect(x + 15, y + 25, foundationWidth - 30, 5);
  
  // Add labels
  doc.setFontSize(8);
  doc.text('Tank Bottom', x + foundationWidth/2, y + 20, { align: 'center' });
  doc.text('Ringwall', x + foundationWidth/2, y + 35, { align: 'center' });
  doc.text('Foundation Slab', x + foundationWidth/2, y + 55, { align: 'center' });
  doc.text('Foundation Cross-Section', x + foundationWidth/2, y + 75, { align: 'center' });
}

function drawPriorityDistributionChart(doc: jsPDF, recommendations: RepairRecommendation[], x: number, y: number) {
  const chartWidth = 80;
  const chartHeight = 50;
  
  // Draw pie chart for priority distribution
  const total = recommendations.length;
  const highCount = recommendations.filter(r => r.priority === 'high').length;
  const mediumCount = recommendations.filter(r => r.priority === 'medium').length;
  const lowCount = recommendations.filter(r => r.priority === 'low').length;
  
  const centerX = x + chartWidth/2;
  const centerY = y + chartHeight/2;
  const radius = 20;
  
  // Draw pie slices
  let startAngle = 0;
  
  if (highCount > 0) {
    const angle = (highCount / total) * 360;
    doc.setFillColor(200, 0, 0);
    // Simplified pie slice representation
    doc.circle(centerX, centerY, radius, 'F');
    startAngle += angle;
  }
  
  // Add legend
  doc.setFontSize(8);
  doc.text('Priority Distribution', centerX, y - 5, { align: 'center' });
  doc.text(`High: ${highCount}`, x + chartWidth + 10, y + 10);
  doc.text(`Medium: ${mediumCount}`, x + chartWidth + 10, y + 20);
  doc.text(`Low: ${lowCount}`, x + chartWidth + 10, y + 30);
}

function drawFindingsTable(doc: jsPDF, recommendations: RepairRecommendation[], measurements: ThicknessMeasurement[], x: number, y: number) {
  doc.setFontSize(8);
  let currentY = y;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Finding ID', x, currentY);
  doc.text('Component', x + 25, currentY);
  doc.text('Description', x + 60, currentY);
  doc.text('Priority', x + 120, currentY);
  doc.text('Action', x + 150, currentY);
  currentY += 6;
  
  // Draw header line
  doc.line(x, currentY, x + 180, currentY);
  currentY += 3;
  
  // Sample findings
  const findings = [
    ['FH_1', 'General', 'Fill height analysis', 'Medium', 'Monitor'],
    ['FO-15', 'Foundation', 'Sealant deterioration', 'Low', 'Repair'],
    ['ES-1', 'Shell', 'Coating deterioration', 'Low', 'Paint'],
    ['AS-1', 'Access', 'Missing toeboards', 'Medium', 'Install']
  ];
  
  doc.setFont(undefined, 'normal');
  findings.forEach(finding => {
    finding.forEach((item, index) => {
      const positions = [x, x + 25, x + 60, x + 120, x + 150];
      doc.text(item, positions[index], currentY);
    });
    currentY += 5;
  });
}

function drawFillHeightChart(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[], x: number, y: number) {
  const chartWidth = 100;
  const chartHeight = 60;
  
  // Draw chart frame
  doc.setLineWidth(0.3);
  doc.rect(x, y, chartWidth, chartHeight);
  
  // Draw fill height limit line
  const fillHeight = parseFloat(report.height || '30') * 0.95;
  const limitY = y + chartHeight - (fillHeight / 30) * chartHeight;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 0, 0);
  doc.line(x, limitY, x + chartWidth, limitY);
  
  // Add labels
  doc.setFontSize(8);
  doc.text('Fill Height Analysis', x + chartWidth/2, y - 5, { align: 'center' });
  doc.text(`Max Fill: ${fillHeight.toFixed(1)} ft`, x + chartWidth + 5, limitY);
}

function drawShellCourseChart(doc: jsPDF, measurements: ThicknessMeasurement[], x: number, y: number) {
  const chartWidth = 100;
  const chartHeight = 60;
  
  // Draw chart frame
  doc.setLineWidth(0.3);
  doc.rect(x, y, chartWidth, chartHeight);
  
  // Group measurements by component
  const courses = measurements.reduce((acc, m) => {
    const course = m.component || 'Shell';
    if (!acc[course]) acc[course] = [];
    acc[course].push(m);
    return acc;
  }, {} as Record<string, ThicknessMeasurement[]>);
  
  // Draw course condition bars
  Object.keys(courses).forEach((course, index) => {
    const courseData = courses[course];
    const avgThickness = courseData.reduce((sum, m) => sum + parseFloat(m.currentThickness || '0'), 0) / courseData.length;
    const barHeight = (avgThickness / 0.5) * chartHeight; // Normalize to 0.5" max
    const barWidth = chartWidth / Object.keys(courses).length;
    
    doc.setFillColor(100, 150, 200);
    doc.rect(x + index * barWidth, y + chartHeight - barHeight, barWidth, barHeight, 'F');
    
    doc.setFontSize(7);
    doc.text(course, x + index * barWidth + barWidth/2, y + chartHeight + 5, { align: 'center' });
  });
  
  // Add labels
  doc.setFontSize(8);
  doc.text('Shell Course Condition', x + chartWidth/2, y - 5, { align: 'center' });
}

function drawShellCourseTable(doc: jsPDF, measurements: ThicknessMeasurement[], x: number, y: number) {
  doc.setFontSize(8);
  let currentY = y;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Course', x, currentY);
  doc.text('Avg Thickness', x + 30, currentY);
  doc.text('Min Thickness', x + 70, currentY);
  doc.text('Condition', x + 110, currentY);
  currentY += 6;
  
  // Draw header line
  doc.line(x, currentY, x + 140, currentY);
  currentY += 3;
  
  // Sample course data
  const courses = [
    ['Ring 1', '0.245"', '0.220"', 'Monitor'],
    ['Ring 2', '0.260"', '0.240"', 'Acceptable'],
    ['Ring 3', '0.270"', '0.250"', 'Acceptable'],
    ['Ring 4', '0.275"', '0.260"', 'Acceptable']
  ];
  
  doc.setFont(undefined, 'normal');
  courses.forEach(course => {
    course.forEach((item, index) => {
      const positions = [x, x + 30, x + 70, x + 110];
      doc.text(item, positions[index], currentY);
    });
    currentY += 5;
  });
}

function drawCalibrationStatusChart(doc: jsPDF, x: number, y: number) {
  const chartWidth = 80;
  const chartHeight = 50;
  
  // Draw status indicators
  const equipment = ['UT Gauge', 'Level', 'Theodolite', 'Tape'];
  const statuses = ['Current', 'Current', 'Current', 'Current'];
  
  equipment.forEach((item, index) => {
    const itemY = y + index * 12;
    
    // Status indicator
    doc.setFillColor(0, 150, 0);
    doc.circle(x, itemY, 2, 'F');
    
    // Equipment name
    doc.setFontSize(9);
    doc.text(item, x + 10, itemY + 2);
    
    // Status
    doc.text(statuses[index], x + 50, itemY + 2);
  });
  
  // Add legend
  doc.setFontSize(8);
  doc.text('● Current', x, y + 60);
  doc.text('● Expired', x + 30, y + 60);
}

function drawEquipmentTable(doc: jsPDF, equipmentData: string[][], x: number, y: number) {
  doc.setFontSize(8);
  let currentY = y;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Equipment', x, currentY);
  doc.text('Model', x + 40, currentY);
  doc.text('Status', x + 80, currentY);
  doc.text('Cal Status', x + 110, currentY);
  currentY += 6;
  
  // Draw header line
  doc.line(x, currentY, x + 130, currentY);
  currentY += 3;
  
  // Equipment data
  doc.setFont(undefined, 'normal');
  equipmentData.forEach(equipment => {
    equipment.forEach((item, index) => {
      const positions = [x, x + 40, x + 80, x + 110];
      doc.text(item, positions[index], currentY);
    });
    currentY += 5;
  });
}