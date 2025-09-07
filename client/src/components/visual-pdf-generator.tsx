import { jsPDF } from 'jspdf';
import { addCoverPageLogoSync, addHeaderLogoSync } from '../lib/logo-utils';
import { 
  generateShellLayoutDiagram, 
  generatePlateLayoutDiagram, 
  generateSettlementGraph,
  generateInspectionLegend,
  type TankDimensions 
} from '../lib/tank-diagram-generator';
import type { 
  InspectionReport, 
  ThicknessMeasurement, 
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  ReportAttachment
} from '@shared/schema';

// Import calculation functions
import { 
  calculateMinimumRequiredThickness, 
  calculateCorrosionRate, 
  calculateRemainingLife 
} from '../lib/api653-calculations';

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

  let totalPages = 15; // Estimate total pages
  let currentPage = 1;
  
  // Professional formatting constants
  const companyHeader = {
    name: 'OilPro Consulting',
    title: 'API-653 Inspection Report',
    address1: '811 Dafney Drive',
    address2: 'Lafayette, LA',
    phone: 'Office – (337) 446-7459',
    contact: 'Jerry Hartfield',
    tagline: 'A LIMITED LIABILITY COMPANY'
  };

  // Helper function to add professional header
  const addProfessionalHeader = () => {
    // Add logo on the left
    addHeaderLogoSync(doc);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(companyHeader.title, 105, 18, { align: 'center' });
  };

  // Helper function to add professional footer
  const addProfessionalFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This document is intended for the sole use of OilPro Consulting and its customers.', 105, 280, { align: 'center' });
    doc.text('Any unauthorized reproduction of this document is prohibited. © 2025', 105, 284, { align: 'center' });
    doc.text(`${pageNum} of ${totalPages}`, 190, 284, { align: 'right' });
  };

  // COMPREHENSIVE COVER PAGE
  generateComprehensiveCoverPage(doc, report, companyHeader);
  
  // EXECUTIVE SUMMARY WITH CALCULATIONS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateExecutiveSummaryWithCalculations(doc, report, measurements, repairRecommendations);
  addProfessionalFooter(currentPage);

  // TANK SPECIFICATIONS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateTankSpecifications(doc, report);
  addProfessionalFooter(currentPage);

  // API-653 CALCULATIONS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateAPI653Calculations(doc, report, measurements);
  addProfessionalFooter(currentPage);

  // THICKNESS MEASUREMENTS - ALL DATA
  const measurementPages = generateComprehensiveThicknessMeasurements(doc, measurements, report, currentPage);
  currentPage += measurementPages;

  // CORROSION RATE ANALYSIS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateCorrosionRateAnalysis(doc, measurements);
  addProfessionalFooter(currentPage);

  // INSPECTION FINDINGS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateInspectionFindings(doc, report, checklists, repairRecommendations);
  addProfessionalFooter(currentPage);

  // RECOMMENDATIONS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateRecommendations(doc, report, repairRecommendations);
  addProfessionalFooter(currentPage);

  // CERTIFICATION
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateCertificationPage(doc, report);
  addProfessionalFooter(currentPage);

  // Save the comprehensive visual report
  doc.save(`API-653-Visual-Report-${report.tankId || 'Unknown'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate comprehensive cover page
function generateComprehensiveCoverPage(doc: jsPDF, report: InspectionReport, companyHeader: any) {
  // Add OilPro logo at the top
  addCoverPageLogoSync(doc);
  
  // Professional title section
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('API-653 TANK INSPECTION REPORT', 105, 50, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(30, 55, 180, 55);
  
  // Tank information box
  doc.setFillColor(240, 240, 240);
  doc.rect(30, 70, 150, 60, 'F');
  doc.rect(30, 70, 150, 60, 'S');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  let yPos = 85;
  doc.text(`Tank ID: ${report.tankId || 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Service: ${report.service || 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Product: ${report.product || 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Capacity: ${report.capacity ? `${report.capacity} ${report.capacityUnit || 'BBL'}` : 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Location: ${report.location || 'Not specified'}`, 40, yPos);
  
  // Report details
  yPos = 145;
  doc.setFontSize(11);
  doc.text(`Report Number: ${report.reportNumber || 'Not specified'}`, 30, yPos);
  yPos += 10;
  doc.text(`Inspection Date: ${report.inspectionDate || 'Not specified'}`, 30, yPos);
  yPos += 10;
  doc.text(`Inspector: ${report.inspector || 'Not specified'}`, 30, yPos);
  yPos += 10;
  doc.text(`API-653 Certification: ${report.inspectorCertification || 'Not specified'}`, 30, yPos);
  
  // Company information at bottom
  yPos = 220;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text((companyHeader.name || 'OILPRO CONSULTING').toUpperCase(), 105, yPos, { align: 'center' });
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companyHeader.tagline, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.setFontSize(10);
  doc.text(companyHeader.address1, 105, yPos, { align: 'center' });
  yPos += 6;
  doc.text(companyHeader.address2, 105, yPos, { align: 'center' });
  yPos += 6;
  doc.text(companyHeader.phone, 105, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Contact: ${companyHeader.contact}`, 105, yPos, { align: 'center' });
  
  // Professional footer
  doc.setFontSize(8);
  doc.text('Prepared in accordance with API Standard 653', 105, 270, { align: 'center' });
}

// Generate executive summary with actual calculations
function generateExecutiveSummaryWithCalculations(
  doc: jsPDF, 
  report: InspectionReport, 
  measurements: ThicknessMeasurement[],
  repairs: RepairRecommendation[]
) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE SUMMARY', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Calculate key metrics from actual data
  const shellMeasurements = measurements.filter(m => 
    m.component?.toLowerCase().includes('shell') || 
    m.component?.toLowerCase().includes('course')
  );
  const bottomMeasurements = measurements.filter(m => 
    m.component?.toLowerCase().includes('bottom') || 
    m.component?.toLowerCase().includes('floor') ||
    m.component?.toLowerCase().includes('annular')
  );
  const roofMeasurements = measurements.filter(m => 
    m.component?.toLowerCase().includes('roof') || 
    m.component?.toLowerCase().includes('deck')
  );
  
  // Calculate minimum remaining life
  let minRemainingLife = 999;
  measurements.forEach(m => {
    const rl = parseFloat(m.remainingLife || '999');
    if (!isNaN(rl) && rl < minRemainingLife) {
      minRemainingLife = rl;
    }
  });
  
  // Calculate average corrosion rate
  let totalCorrosionRate = 0;
  let corrosionCount = 0;
  measurements.forEach(m => {
    const rate = parseFloat(m.corrosionRate || '0');
    if (!isNaN(rate) && rate > 0) {
      totalCorrosionRate += rate;
      corrosionCount++;
    }
  });
  const avgCorrosionRate = corrosionCount > 0 ? totalCorrosionRate / corrosionCount : 0;
  
  // Tank Status Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Tank Status Summary', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const statusItems = [
    ['Overall Status', minRemainingLife > 10 ? 'ACCEPTABLE' : minRemainingLife > 5 ? 'MONITOR' : 'ACTION REQUIRED'],
    ['Total Measurements', measurements.length.toString()],
    ['Shell Measurements', shellMeasurements.length.toString()],
    ['Bottom Measurements', bottomMeasurements.length.toString()],
    ['Roof Measurements', roofMeasurements.length.toString()],
    ['Minimum Remaining Life', `${minRemainingLife.toFixed(1)} years`],
    ['Average Corrosion Rate', `${avgCorrosionRate.toFixed(3)} mpy`],
    ['Critical Repairs', repairs.filter(r => r.priority === 'Critical').length.toString()],
    ['High Priority Repairs', repairs.filter(r => r.priority === 'High').length.toString()]
  ];
  
  statusItems.forEach(item => {
    doc.text(`${item[0]}: ${item[1]}`, 25, yPos);
    yPos += 8;
  });
  
  // Key Findings
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Findings', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // List critical findings
  const criticalFindings = [];
  if (minRemainingLife < 5) {
    criticalFindings.push(`• Minimum remaining life is ${minRemainingLife.toFixed(1)} years - immediate action required`);
  }
  if (avgCorrosionRate > 10) {
    criticalFindings.push(`• High corrosion rate detected: ${avgCorrosionRate.toFixed(3)} mpy`);
  }
  if (repairs.filter(r => r.priority === 'Critical').length > 0) {
    criticalFindings.push(`• ${repairs.filter(r => r.priority === 'Critical').length} critical repairs identified`);
  }
  
  if (criticalFindings.length === 0) {
    criticalFindings.push('• Tank is in acceptable condition');
    criticalFindings.push('• No critical issues identified');
  }
  
  criticalFindings.forEach(finding => {
    doc.text(finding, 25, yPos);
    yPos += 8;
  });
  
  // Next Inspection
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Next Inspection Schedule', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Calculate next inspection based on remaining life
  const nextInternalYears = Math.min(Math.floor(minRemainingLife / 2), 10);
  const nextExternalYears = Math.min(Math.floor(minRemainingLife / 4), 5);
  
  const currentDate = new Date();
  const nextInternal = new Date(currentDate.setFullYear(currentDate.getFullYear() + nextInternalYears));
  const nextExternal = new Date(currentDate.setFullYear(currentDate.getFullYear() + nextExternalYears));
  
  doc.text(`Next Internal Inspection: ${nextInternal.toLocaleDateString()} (${nextInternalYears} years)`, 25, yPos);
  yPos += 8;
  doc.text(`Next External Inspection: ${nextExternal.toLocaleDateString()} (${nextExternalYears} years)`, 25, yPos);
}

// Generate tank specifications
function generateTankSpecifications(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TANK SPECIFICATIONS', 105, yPos, { align: 'center' });
  yPos += 20;
  
  // Create two-column layout
  const leftColumn = [
    ['Tank ID', report.tankId || 'Not specified'],
    ['Service', report.service || 'Not specified'],
    ['Product', report.product || 'Not specified'],
    ['Diameter', report.diameter ? `${report.diameter} ${report.diameterUnit || 'ft'}` : 'N/A'],
    ['Height', report.height ? `${report.height} ${report.heightUnit || 'ft'}` : 'N/A'],
    ['Capacity', report.capacity ? `${report.capacity} ${report.capacityUnit || 'BBL'}` : 'N/A'],
    ['Construction Year', report.yearBuilt || 'Not specified'],
    ['Shell Material', report.shellMaterial || 'Not specified']
  ];
  
  const rightColumn = [
    ['Roof Type', report.roofType || 'Not specified'],
    ['Bottom Type', 'Single Bottom'],
    ['Foundation Type', report.foundationType || 'Not specified'],
    ['Design Standard', report.constructionStandard || 'API-650'],
    ['Specific Gravity', report.specificGravity || 'Not specified'],
    ['Manufacturer', report.manufacturer || 'Not specified'],
    ['Last Internal', report.lastInternalInspection || 'Not specified'],
    ['Design Code', report.designCode || 'Not specified']
  ];
  
  doc.setFontSize(10);
  
  // Left column
  leftColumn.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], 70, yPos);
    yPos += 8;
  });
  
  // Right column
  yPos = 50;
  rightColumn.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item[0]}:`, 110, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(item[1], 160, yPos);
    yPos += 8;
  });
}

// Generate API-653 calculations page
function generateAPI653Calculations(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('API-653 CALCULATIONS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Get tank parameters
  const diameter = parseFloat(report.diameter || '0');
  const height = parseFloat(report.height || '0');
  const specificGravity = parseFloat(report.specificGravity || '1.0');
  
  // Shell course calculations
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Minimum Required Thickness Calculations (t-min)', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // API-653 Formula
  doc.text('Formula: t-min = 2.6 × D × (H - 1) × G / (S × E)', 25, yPos);
  yPos += 6;
  doc.text('Where:', 25, yPos);
  yPos += 6;
  doc.text('D = Tank diameter (ft)', 30, yPos);
  yPos += 5;
  doc.text('H = Height of liquid above point (ft)', 30, yPos);
  yPos += 5;
  doc.text('G = Specific gravity', 30, yPos);
  yPos += 5;
  doc.text('S = Allowable stress (psi)', 30, yPos);
  yPos += 5;
  doc.text('E = Joint efficiency', 30, yPos);
  yPos += 10;
  
  // Calculate for each shell course
  const shellMeasurements = measurements.filter(m => 
    m.component?.toLowerCase().includes('shell') || 
    m.component?.toLowerCase().includes('course')
  );
  const courses = new Map<string, ThicknessMeasurement[]>();
  
  shellMeasurements.forEach(m => {
    // Extract course number from component name like "Shell Course 1 (Bottom)"
    const courseMatch = m.component?.match(/Course\s+(\d+)/i);
    const course = courseMatch ? `Course ${courseMatch[1]}` : m.component || 'Unknown';
    if (!courses.has(course)) {
      courses.set(course, []);
    }
    courses.get(course)!.push(m);
  });
  
  // Table headers
  doc.setFillColor(230, 230, 230);
  doc.rect(20, yPos - 4, 170, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Course', 25, yPos);
  doc.text('H (ft)', 55, yPos);
  doc.text('t-min (in)', 80, yPos);
  doc.text('Current (in)', 110, yPos);
  doc.text('Margin (in)', 140, yPos);
  doc.text('Status', 165, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  
  // Calculate for each course
  Array.from(courses.entries()).slice(0, 8).forEach(([course, courseMeasurements]) => {
    // Extract course number from course name
    const courseNumMatch = course.match(/\d+/);
    const courseNum = courseNumMatch ? parseInt(courseNumMatch[0]) : 1;
    const fillHeight = height - (courseNum - 1) * 8; // Assume 8ft courses
    const tMin = calculateMinimumRequiredThickness(
      courseNum,
      diameter,
      specificGravity,
      fillHeight,
      0.85, // Joint efficiency
      23200 // Allowable stress for A285-C
    );
    
    // Get minimum current thickness for this course
    let minCurrent = 999;
    courseMeasurements.forEach(m => {
      const current = parseFloat(m.currentThickness || '999');
      if (!isNaN(current) && current < minCurrent) {
        minCurrent = current;
      }
    });
    
    const margin = minCurrent - tMin;
    const status = margin > 0.1 ? 'OK' : margin > 0 ? 'Monitor' : 'Critical';
    
    doc.text(course, 25, yPos);
    doc.text(fillHeight.toFixed(1), 55, yPos);
    doc.text(tMin.toFixed(3), 80, yPos);
    doc.text(minCurrent < 999 ? minCurrent.toFixed(3) : 'N/A', 110, yPos);
    doc.text(minCurrent < 999 ? margin.toFixed(3) : 'N/A', 140, yPos);
    doc.text(status, 165, yPos);
    yPos += 6;
  });
  
  // Corrosion rate calculations
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Corrosion Rate Summary', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Calculate statistics
  const rates = measurements
    .map(m => parseFloat(m.corrosionRate || '0'))
    .filter(r => !isNaN(r) && r > 0);
  
  if (rates.length > 0) {
    const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    
    doc.text(`Average Corrosion Rate: ${avgRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 6;
    doc.text(`Maximum Corrosion Rate: ${maxRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 6;
    doc.text(`Minimum Corrosion Rate: ${minRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 6;
    doc.text(`Total Measurements with Corrosion Data: ${rates.length}`, 25, yPos);
  } else {
    doc.text('No corrosion rate data available', 25, yPos);
  }
}

// Generate comprehensive thickness measurements (multiple pages if needed)
function generateComprehensiveThicknessMeasurements(
  doc: jsPDF, 
  measurements: ThicknessMeasurement[], 
  report: InspectionReport,
  startPage: number
): number {
  let pagesAdded = 0;
  
  // Group measurements by component
  const componentGroups = [
    { name: 'shell', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('shell') || 
      m.component?.toLowerCase().includes('course')
    },
    { name: 'bottom', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('bottom') || 
      m.component?.toLowerCase().includes('floor') ||
      m.component?.toLowerCase().includes('annular')
    },
    { name: 'roof', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('roof') || 
      m.component?.toLowerCase().includes('deck')
    },
    { name: 'nozzles', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('nozzle') || 
      m.component?.toLowerCase().includes('flange') ||
      m.component?.toLowerCase().includes('manway')
    }
  ];
  
  componentGroups.forEach(({ name: component, filter }) => {
    const compMeasurements = measurements.filter(filter);
    
    if (compMeasurements.length > 0) {
      doc.addPage();
      pagesAdded++;
      
      let yPos = 30;
      
      // Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${(component || 'COMPONENT').toUpperCase()} THICKNESS MEASUREMENTS`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.text(`Total ${component} measurements: ${compMeasurements.length}`, 20, yPos);
      yPos += 10;
      
      // Table headers
      doc.setFillColor(230, 230, 230);
      doc.rect(15, yPos - 4, 180, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Location', 20, yPos);
      doc.text('Current', 55, yPos);
      doc.text('Original', 75, yPos);
      doc.text('Loss', 95, yPos);
      doc.text('Corr Rate', 110, yPos);
      doc.text('t-min', 130, yPos);
      doc.text('Rem Life', 150, yPos);
      doc.text('Status', 170, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      // Add all measurements
      compMeasurements.forEach((m, index) => {
        // Check if we need a new page
        if (yPos > 260) {
          // Add footer
          doc.setFontSize(7);
          doc.text(`Page ${startPage + pagesAdded} - ${component} measurements continued...`, 105, 285, { align: 'center' });
          
          doc.addPage();
          pagesAdded++;
          yPos = 30;
          
          // Repeat headers
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(`${(component || 'COMPONENT').toUpperCase()} MEASUREMENTS (Continued)`, 105, yPos, { align: 'center' });
          yPos += 15;
          
          // Repeat table headers
          doc.setFillColor(230, 230, 230);
          doc.rect(15, yPos - 4, 180, 7, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Location', 20, yPos);
          doc.text('Current', 55, yPos);
          doc.text('Original', 75, yPos);
          doc.text('Loss', 95, yPos);
          doc.text('Corr Rate', 110, yPos);
          doc.text('t-min', 130, yPos);
          doc.text('Rem Life', 150, yPos);
          doc.text('Status', 170, yPos);
          yPos += 8;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }
        
        // Calculate values
        const current = parseFloat(m.currentThickness || '0');
        const original = parseFloat(m.originalThickness || '0');
        const loss = original - current;
        const corrRate = parseFloat(m.corrosionRate || '0');
        const tMin = 0.1; // Use API-653 minimum for now, could calculate per location
        const remLife = parseFloat(m.remainingLife || '999');
        
        const status = remLife > 10 ? 'OK' : remLife > 5 ? 'Monitor' : 'Critical';
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(15, yPos - 4, 180, 6, 'F');
        }
        
        doc.text(m.location || 'N/A', 20, yPos);
        doc.text(current.toFixed(3), 55, yPos);
        doc.text(original.toFixed(3), 75, yPos);
        doc.text(loss.toFixed(3), 95, yPos);
        doc.text(corrRate.toFixed(3), 110, yPos);
        doc.text(tMin.toFixed(3), 130, yPos);
        doc.text(remLife < 999 ? remLife.toFixed(1) : '>999', 150, yPos);
        doc.text(status, 170, yPos);
        yPos += 6;
      });
      
      // Summary statistics at bottom
      if (yPos < 240) {
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${component} Summary:`, 20, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const avgCurrent = compMeasurements.reduce((sum, m) => 
          sum + parseFloat(m.currentThickness || '0'), 0) / compMeasurements.length;
        const minCurrent = Math.min(...compMeasurements.map(m => 
          parseFloat(m.currentThickness || '999')));
        const avgCorr = compMeasurements.reduce((sum, m) => 
          sum + parseFloat(m.corrosionRate || '0'), 0) / compMeasurements.length;
        const minRemLife = Math.min(...compMeasurements.map(m => 
          parseFloat(m.remainingLife || '999')));
        
        doc.text(`Average thickness: ${avgCurrent.toFixed(3)} in`, 25, yPos);
        yPos += 5;
        doc.text(`Minimum thickness: ${minCurrent.toFixed(3)} in`, 25, yPos);
        yPos += 5;
        doc.text(`Average corrosion rate: ${avgCorr.toFixed(3)} mpy`, 25, yPos);
        yPos += 5;
        doc.text(`Minimum remaining life: ${minRemLife < 999 ? minRemLife.toFixed(1) : '>999'} years`, 25, yPos);
      }
    }
  });
  
  return pagesAdded;
}

// Generate corrosion rate analysis
function generateCorrosionRateAnalysis(doc: jsPDF, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CORROSION RATE ANALYSIS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Calculate statistics by component
  const componentFilters = [
    { name: 'Shell', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('shell') || 
      m.component?.toLowerCase().includes('course')
    },
    { name: 'Bottom', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('bottom') || 
      m.component?.toLowerCase().includes('floor') ||
      m.component?.toLowerCase().includes('annular')
    },
    { name: 'Roof', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('roof') || 
      m.component?.toLowerCase().includes('deck')
    },
    { name: 'Nozzles', filter: (m: ThicknessMeasurement) => 
      m.component?.toLowerCase().includes('nozzle') || 
      m.component?.toLowerCase().includes('flange') ||
      m.component?.toLowerCase().includes('manway')
    }
  ];
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Corrosion Rate by Component', 20, yPos);
  yPos += 10;
  
  // Table headers
  doc.setFillColor(230, 230, 230);
  doc.rect(20, yPos - 4, 170, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Component', 25, yPos);
  doc.text('Measurements', 65, yPos);
  doc.text('Avg Rate (mpy)', 95, yPos);
  doc.text('Max Rate (mpy)', 125, yPos);
  doc.text('Min Life (yr)', 155, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  
  componentFilters.forEach(({ name: component, filter }) => {
    const compMeasurements = measurements.filter(filter);
    
    if (compMeasurements.length > 0) {
      const rates = compMeasurements
        .map(m => parseFloat(m.corrosionRate || '0'))
        .filter(r => !isNaN(r) && r > 0);
      
      const avgRate = rates.length > 0 ? 
        rates.reduce((sum, r) => sum + r, 0) / rates.length : 0;
      const maxRate = rates.length > 0 ? Math.max(...rates) : 0;
      
      const remLives = compMeasurements
        .map(m => parseFloat(m.remainingLife || '999'))
        .filter(rl => !isNaN(rl) && rl < 999);
      const minLife = remLives.length > 0 ? Math.min(...remLives) : 999;
      
      doc.text(component, 25, yPos);
      doc.text(compMeasurements.length.toString(), 65, yPos);
      doc.text(avgRate.toFixed(3), 95, yPos);
      doc.text(maxRate.toFixed(3), 125, yPos);
      doc.text(minLife < 999 ? minLife.toFixed(1) : '>999', 155, yPos);
      yPos += 6;
    }
  });
  
  // Corrosion distribution
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Corrosion Rate Distribution', 20, yPos);
  yPos += 10;
  
  const allRates = measurements
    .map(m => parseFloat(m.corrosionRate || '0'))
    .filter(r => !isNaN(r) && r > 0);
  
  if (allRates.length > 0) {
    const bins = [
      { range: '0-2 mpy', count: allRates.filter(r => r >= 0 && r < 2).length },
      { range: '2-5 mpy', count: allRates.filter(r => r >= 2 && r < 5).length },
      { range: '5-10 mpy', count: allRates.filter(r => r >= 5 && r < 10).length },
      { range: '>10 mpy', count: allRates.filter(r => r >= 10).length }
    ];
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    bins.forEach(bin => {
      const percentage = ((bin.count / allRates.length) * 100).toFixed(1);
      doc.text(`${bin.range}: ${bin.count} measurements (${percentage}%)`, 25, yPos);
      yPos += 6;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('No corrosion rate data available', 25, yPos);
  }
}

// Generate inspection findings
function generateInspectionFindings(
  doc: jsPDF, 
  report: InspectionReport, 
  checklists: InspectionChecklist[],
  repairs: RepairRecommendation[]
) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTION FINDINGS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Checklist summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Checklist Summary', 20, yPos);
  yPos += 10;
  
  const categories = new Map<string, InspectionChecklist[]>();
  checklists.forEach(item => {
    const category = item.category || 'General';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(item);
  });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  Array.from(categories.entries()).slice(0, 5).forEach(([category, items]) => {
    const checkedCount = items.filter(i => i.checked).length;
    doc.text(`${category}: ${checkedCount}/${items.length} items checked`, 25, yPos);
    yPos += 6;
  });
  
  // Critical findings
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Critical Findings', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const criticalRepairs = repairs.filter(r => r.priority === 'Critical');
  if (criticalRepairs.length > 0) {
    criticalRepairs.slice(0, 5).forEach(repair => {
      doc.text(`• ${repair.description}`, 25, yPos);
      yPos += 6;
    });
  } else {
    doc.text('No critical findings identified', 25, yPos);
    yPos += 6;
  }
}

// Generate recommendations
function generateRecommendations(doc: jsPDF, report: InspectionReport, repairs: RepairRecommendation[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RECOMMENDATIONS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Group by priority
  const priorities = {
    Critical: repairs.filter(r => r.priority === 'Critical'),
    High: repairs.filter(r => r.priority === 'High'),
    Medium: repairs.filter(r => r.priority === 'Medium'),
    Low: repairs.filter(r => r.priority === 'Low')
  };
  
  Object.entries(priorities).forEach(([priority, items]) => {
    if (items.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${priority} Priority (${items.length} items)`, 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      items.slice(0, 3).forEach(item => {
        doc.text(`• ${item.description}`, 25, yPos);
        yPos += 6;
        if (item.component) {
          doc.text(`  Component: ${item.component}`, 30, yPos);
          yPos += 5;
        }
      });
      
      if (items.length > 3) {
        doc.text(`... and ${items.length - 3} more`, 25, yPos);
        yPos += 6;
      }
      
      yPos += 5;
    }
  });
}

// Generate certification page
function generateCertificationPage(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATION', 105, yPos, { align: 'center' });
  yPos += 20;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const certText = [
    'I certify that this tank has been inspected in accordance with API Standard 653',
    'and all applicable codes and standards. The inspection was performed using',
    'appropriate methods and calibrated equipment.',
    '',
    'Based on the inspection findings and calculations presented in this report,',
    'the tank condition and remaining life have been evaluated per API-653 requirements.'
  ];
  
  certText.forEach(line => {
    doc.text(line, 105, yPos, { align: 'center' });
    yPos += 8;
  });
  
  yPos += 30;
  
  // Signature lines
  doc.setLineWidth(0.5);
  doc.line(30, yPos, 90, yPos);
  doc.line(120, yPos, 180, yPos);
  yPos += 5;
  
  doc.setFontSize(9);
  doc.text('Lead Inspector', 60, yPos, { align: 'center' });
  doc.text('Date', 150, yPos, { align: 'center' });
  yPos += 20;
  
  doc.line(30, yPos, 90, yPos);
  doc.line(120, yPos, 180, yPos);
  yPos += 5;
  
  doc.text('API-653 Certification #', 60, yPos, { align: 'center' });
  doc.text('Review Date', 150, yPos, { align: 'center' });
  
  // Inspector info
  yPos += 20;
  doc.setFontSize(10);
  doc.text(`Inspector: ${report.inspector || 'Not specified'}`, 30, yPos);
  yPos += 8;
  doc.text(`Certification: ${report.inspectorCertification || 'Not specified'}`, 30, yPos);
}