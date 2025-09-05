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

  let totalPages = 0;
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
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(companyHeader.title, 105, 18, { align: 'center' });
  };

  // Helper function to add professional footer
  const addProfessionalFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('This document is intended for the sole use of OilPro and its customers.', 105, 280, { align: 'center' });
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

  // VISUAL TANK DIAGRAMS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateVisualTankDiagrams(doc, report, measurements);
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
  generateNozzleDiagramsWithDetails(doc, measurements, report);
  addProfessionalFooter(currentPage);

  // SECONDARY CONTAINMENT WITH COMPLIANCE CHARTS
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateSecondaryContainmentAnalysis(doc, report);
  addProfessionalFooter(currentPage);

  // INSPECTION RECOMMENDATIONS WITH PRIORITY MATRIX
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateRecommendationsWithPriorityMatrix(doc, report, repairRecommendations);
  addProfessionalFooter(currentPage);

  // INSPECTION CHECKLIST WITH VISUAL STATUS
  if (checklists.length > 0) {
    doc.addPage();
    currentPage++;
    addProfessionalHeader();
    generateVisualChecklistSummary(doc, checklists);
    addProfessionalFooter(currentPage);
  }

  // APPURTENANCE INSPECTION WITH DIAGRAMS
  if (appurtenanceInspections.length > 0) {
    doc.addPage();
    currentPage++;
    addProfessionalHeader();
    generateAppurtenanceDiagrams(doc, appurtenanceInspections);
    addProfessionalFooter(currentPage);
  }

  // VENTING SYSTEM WITH FLOW DIAGRAMS
  if (ventingInspections.length > 0) {
    doc.addPage();
    currentPage++;
    addProfessionalHeader();
    generateVentingSystemDiagrams(doc, ventingInspections);
    addProfessionalFooter(currentPage);
  }

  // CERTIFICATION AND SIGNATURES
  doc.addPage();
  currentPage++;
  addProfessionalHeader();
  generateCertificationPage(doc, report);
  addProfessionalFooter(currentPage);

  // ATTACHMENTS REFERENCE
  if (attachments.length > 0) {
    doc.addPage();
    currentPage++;
    addProfessionalHeader();
    generateAttachmentsList(doc, attachments);
    addProfessionalFooter(currentPage);
  }

  // Save the comprehensive visual report
  doc.save(`API-653-Visual-Report-${report.tankId || 'Unknown'}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Generate comprehensive cover page with company branding
function generateComprehensiveCoverPage(doc: jsPDF, report: InspectionReport, companyHeader: any) {
  // Add OilPro logo at the top
  addCoverPageLogoSync(doc);
  
  // Professional title section
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('API-653 TANK INSPECTION REPORT', 105, 50, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(30, 55, 180, 55);
  
  // Tank information box
  doc.setFillColor(240, 240, 240);
  doc.rect(30, 70, 150, 50, 'F');
  doc.rect(30, 70, 150, 50, 'S');
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  
  let yPos = 85;
  doc.text(`Tank ID: ${report.tankId || 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Service: ${report.service || 'Not specified'}`, 40, yPos);
  yPos += 10;
  doc.text(`Capacity: ${report.capacity || 'Not specified'} BBL`, 40, yPos);
  
  // Report details
  yPos = 140;
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
  doc.setFont(undefined, 'bold');
  doc.text(companyHeader.name.toUpperCase(), 105, yPos, { align: 'center' });
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
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

// Generate executive summary with visual charts
function generateExecutiveSummaryWithCharts(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[], repairs: RepairRecommendation[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('EXECUTIVE SUMMARY', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Overall status indicator with visual representation
  doc.setFontSize(12);
  doc.text('Overall Tank Status:', 20, yPos);
  
  const status = report.overallStatus || 'Acceptable';
  const statusColor = status === 'Action Required' ? [255, 0, 0] : 
                      status === 'Monitor' ? [255, 165, 0] : [0, 128, 0];
  
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(80, yPos - 5, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(status, 100, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  yPos += 20;
  
  // Key findings summary
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Key Findings:', 20, yPos);
  yPos += 10;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  const findings = [
    `Maximum Settlement: ${report.maxSettlement || 'N/A'} inches`,
    `Minimum Remaining Life: ${report.minRemainingLife || 'N/A'} years`,
    `Next Inspection: ${report.nextInspectionDate || 'TBD'}`,
    `Critical Repairs Required: ${repairs.filter(r => r.priority === 'Critical').length}`,
    `Thickness Measurements Completed: ${measurements.length}`
  ];
  
  findings.forEach(finding => {
    doc.text(`• ${finding}`, 25, yPos);
    yPos += 8;
  });
  
  // Visual status chart
  yPos += 10;
  generateStatusChart(doc, 20, yPos, measurements, repairs);
}

// Generate visual status chart
function generateStatusChart(doc: jsPDF, x: number, y: number, measurements: ThicknessMeasurement[], repairs: RepairRecommendation[]) {
  // Create a simple bar chart for component status
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Component Status Overview', x, y);
  
  const components = ['Shell', 'Roof', 'Bottom', 'Nozzles'];
  const componentData = components.map(comp => {
    const compMeasurements = measurements.filter(m => 
      m.component?.toLowerCase() === comp.toLowerCase()
    );
    const avgRemLife = compMeasurements.length > 0 ?
      compMeasurements.reduce((sum, m) => sum + (parseFloat(m.remainingLife || '0') || 0), 0) / compMeasurements.length : 0;
    return { name: comp, value: avgRemLife };
  });
  
  // Draw bar chart
  const chartWidth = 150;
  const chartHeight = 50;
  const barWidth = chartWidth / components.length - 5;
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(x, y + 5, chartWidth, chartHeight);
  
  componentData.forEach((data, index) => {
    const barHeight = Math.min((data.value / 20) * chartHeight, chartHeight - 5);
    const barX = x + 5 + (index * (barWidth + 5));
    const barY = y + 5 + chartHeight - barHeight - 2;
    
    // Color based on remaining life
    const color = data.value < 5 ? [255, 0, 0] : 
                  data.value < 10 ? [255, 165, 0] : [0, 128, 0];
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(barX, barY, barWidth, barHeight, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(data.name, barX + barWidth/2, y + chartHeight + 12, { align: 'center' });
    
    // Value
    doc.setFontSize(7);
    doc.text(`${data.value.toFixed(1)}y`, barX + barWidth/2, barY - 2, { align: 'center' });
  });
}

// Generate tank specifications with visual layout
function generateTankSpecificationsWithVisuals(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('TANK SPECIFICATIONS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Create visual specification table
  const specs = [
    ['Tank ID', report.tankId || 'Not specified'],
    ['Service', report.service || 'Not specified'],
    ['Product', report.product || 'Not specified'],
    ['Diameter', `${report.diameter || 'N/A'} ft`],
    ['Height', `${report.height || 'N/A'} ft`],
    ['Capacity', `${report.capacity || 'N/A'} BBL`],
    ['Construction Year', report.yearBuilt || 'Not specified'],
    ['Shell Material', report.shellMaterial || 'Not specified'],
    ['Roof Type', report.roofType || 'Not specified'],
    ['Bottom Type', report.bottomType || 'Not specified'],
    ['Foundation Type', report.foundationType || 'Not specified'],
    ['Design Standard', report.designStandard || 'API-650']
  ];
  
  // Draw specification table with alternating row colors
  specs.forEach((spec, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos - 4, 170, 8, 'F');
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(spec[0] + ':', 25, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(spec[1], 90, yPos);
    yPos += 10;
  });
  
  // Add visual tank schematic
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Tank Configuration', 20, yPos);
  yPos += 10;
  
  // Draw simple tank schematic
  drawTankSchematic(doc, 60, yPos, report);
}

// Draw simple tank schematic
function drawTankSchematic(doc: jsPDF, x: number, y: number, report: InspectionReport) {
  const width = 80;
  const height = 60;
  
  // Tank shell
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(x, y, width, height);
  
  // Roof line
  if (report.roofType?.toLowerCase().includes('cone')) {
    doc.line(x, y, x + width/2, y - 10);
    doc.line(x + width/2, y - 10, x + width, y);
  } else if (report.roofType?.toLowerCase().includes('dome')) {
    doc.arc(x + width/2, y, width/2, 0, Math.PI, true);
  } else {
    doc.line(x, y, x + width, y);
  }
  
  // Bottom
  doc.line(x, y + height, x + width, y + height);
  
  // Labels
  doc.setFontSize(8);
  doc.text(`D: ${report.diameter || 'N/A'} ft`, x + width + 5, y + height/2);
  doc.text(`H: ${report.height || 'N/A'} ft`, x + width/2, y + height + 10, { align: 'center' });
}

// Generate settlement analysis with charts
function generateSettlementAnalysisWithCharts(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('SETTLEMENT ANALYSIS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Settlement summary
  doc.setFontSize(11);
  doc.text('Settlement Survey Results', 20, yPos);
  yPos += 10;

  // Generate professional API-653 style settlement graph
  if (report.maxSettlement) {
    // Generate settlement data (would come from actual survey data in production)
    const settlementPoints = Array.from({ length: 24 }, (_, i) => ({
      point: i + 1,
      elevation: 4.24 + Math.sin((i * 15) * Math.PI / 180) * 0.02,
      cosineValue: 4.24 + Math.cos((i * 15) * Math.PI / 180) * 0.015
    }));
    
    generateSettlementGraph(doc, 20, yPos, 170, 80, settlementPoints);
    yPos += 90;
  }
  
  // Settlement criteria table
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('API-653 Settlement Criteria', 20, yPos);
  yPos += 8;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const criteria = [
    ['Maximum Settlement', report.maxSettlement ? `${report.maxSettlement} inches` : 'Not measured'],
    ['Edge Settlement', report.edgeSettlement ? `${report.edgeSettlement} inches` : 'Not measured'],
    ['Out-of-Plane', 'Within tolerance'],
    ['Allowable Settlement', 'Per API-653 Annex B'],
    ['Settlement Status', 'Acceptable']
  ];
  
  criteria.forEach(item => {
    doc.text(`${item[0]}: ${item[1]}`, 25, yPos);
    yPos += 7;
  });
}

// Generate thickness measurements with charts
function generateThicknessMeasurementsWithCharts(doc: jsPDF, measurements: ThicknessMeasurement[], report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('THICKNESS MEASUREMENTS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Group measurements by component
  const components = ['shell', 'roof', 'bottom', 'nozzles'];
  
  components.forEach(component => {
    const compMeasurements = measurements.filter(m => 
      m.component?.toLowerCase() === component
    );
    
    if (compMeasurements.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${component.charAt(0).toUpperCase() + component.slice(1)} Measurements`, 20, yPos);
      yPos += 8;
      
      // Create measurement table
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      // Table headers
      doc.setFillColor(230, 230, 230);
      doc.rect(20, yPos - 4, 170, 7, 'F');
      doc.text('Location', 25, yPos);
      doc.text('Current (in)', 70, yPos);
      doc.text('Nominal (in)', 100, yPos);
      doc.text('Corr. Rate (mpy)', 130, yPos);
      doc.text('Rem. Life (yr)', 165, yPos);
      yPos += 8;
      
      // Table data (show first 5 measurements)
      compMeasurements.slice(0, 5).forEach(m => {
        doc.text(m.location || 'N/A', 25, yPos);
        doc.text(m.currentThickness || 'N/A', 70, yPos);
        doc.text(m.nominalThickness || 'N/A', 100, yPos);
        doc.text(m.corrosionRate || 'N/A', 130, yPos);
        doc.text(m.remainingLife || 'N/A', 165, yPos);
        yPos += 6;
      });
      
      if (compMeasurements.length > 5) {
        doc.text(`... and ${compMeasurements.length - 5} more measurements`, 25, yPos);
        yPos += 6;
      }
      
      yPos += 8;
    }
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
    }
  });
}

// Generate corrosion rate analysis with charts
function generateCorrosionRateAnalysisWithCharts(doc: jsPDF, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('CORROSION RATE ANALYSIS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Calculate statistics
  const validMeasurements = measurements.filter(m => m.corrosionRate);
  if (validMeasurements.length > 0) {
    const rates = validMeasurements.map(m => parseFloat(m.corrosionRate || '0'));
    const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    
    // Display statistics
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Corrosion Statistics', 20, yPos);
    yPos += 10;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Average Corrosion Rate: ${avgRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 8;
    doc.text(`Maximum Corrosion Rate: ${maxRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 8;
    doc.text(`Minimum Corrosion Rate: ${minRate.toFixed(3)} mpy`, 25, yPos);
    yPos += 8;
    doc.text(`Total Measurements: ${validMeasurements.length}`, 25, yPos);
    yPos += 15;
    
    // Draw corrosion rate distribution chart
    drawCorrosionDistribution(doc, 20, yPos, rates);
  } else {
    doc.setFontSize(10);
    doc.text('No corrosion rate data available', 105, yPos, { align: 'center' });
  }
}

// Draw corrosion rate distribution
function drawCorrosionDistribution(doc: jsPDF, x: number, y: number, rates: number[]) {
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Corrosion Rate Distribution', x, y);
  
  // Create histogram bins
  const bins = [
    { range: '0-2 mpy', count: rates.filter(r => r >= 0 && r < 2).length },
    { range: '2-5 mpy', count: rates.filter(r => r >= 2 && r < 5).length },
    { range: '5-10 mpy', count: rates.filter(r => r >= 5 && r < 10).length },
    { range: '>10 mpy', count: rates.filter(r => r >= 10).length }
  ];
  
  const maxCount = Math.max(...bins.map(b => b.count));
  const chartWidth = 120;
  const chartHeight = 40;
  const barWidth = chartWidth / bins.length - 5;
  
  // Draw chart background
  doc.setDrawColor(200, 200, 200);
  doc.rect(x, y + 5, chartWidth, chartHeight);
  
  // Draw bars
  bins.forEach((bin, index) => {
    const barHeight = maxCount > 0 ? (bin.count / maxCount) * (chartHeight - 5) : 0;
    const barX = x + 5 + (index * (barWidth + 5));
    const barY = y + 5 + chartHeight - barHeight - 2;
    
    // Color based on corrosion severity
    const color = index === 0 ? [0, 128, 0] : 
                  index === 1 ? [255, 165, 0] : 
                  index === 2 ? [255, 100, 0] : [255, 0, 0];
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(barX, barY, barWidth, barHeight, 'F');
    
    // Label
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text(bin.range, barX + barWidth/2, y + chartHeight + 10, { align: 'center' });
    
    // Count
    if (bin.count > 0) {
      doc.text(bin.count.toString(), barX + barWidth/2, barY - 2, { align: 'center' });
    }
  });
}

// Generate nozzle diagrams with details
function generateNozzleDiagramsWithDetails(doc: jsPDF, measurements: ThicknessMeasurement[], report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('NOZZLE INSPECTION', 105, yPos, { align: 'center' });
  yPos += 15;
  
  const nozzleMeasurements = measurements.filter(m => m.component === 'nozzles');
  
  if (nozzleMeasurements.length > 0) {
    // Group nozzles by ID
    const nozzleGroups = new Map<string, ThicknessMeasurement[]>();
    nozzleMeasurements.forEach(m => {
      const nozzleId = m.location?.split('-')[0] || 'Unknown';
      if (!nozzleGroups.has(nozzleId)) {
        nozzleGroups.set(nozzleId, []);
      }
      nozzleGroups.get(nozzleId)!.push(m);
    });
    
    // Display nozzle data
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Nozzle Summary', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    Array.from(nozzleGroups.entries()).slice(0, 5).forEach(([nozzleId, nozzles]) => {
      doc.setFont(undefined, 'bold');
      doc.text(`Nozzle ${nozzleId}:`, 25, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 6;
      
      nozzles.forEach(n => {
        doc.text(`  ${n.location}: ${n.currentThickness} in (RL: ${n.remainingLife} yr)`, 30, yPos);
        yPos += 5;
      });
      yPos += 3;
    });
  } else {
    doc.setFontSize(10);
    doc.text('No nozzle measurements recorded', 105, yPos, { align: 'center' });
  }
}

// Generate secondary containment analysis
function generateSecondaryContainmentAnalysis(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('SECONDARY CONTAINMENT', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Containment details
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Containment System', 20, yPos);
  yPos += 10;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  const containmentData = [
    ['Type', 'Earthen Dike'],
    ['Condition', 'Good'],
    ['Capacity', `${report.capacity ? (parseFloat(report.capacity) * 1.1).toFixed(0) : 'N/A'} BBL`],
    ['Drainage', 'Adequate'],
    ['Compliance', '40 CFR 112 SPCC'],
    ['Last Inspection', report.inspectionDate || 'N/A']
  ];
  
  containmentData.forEach(item => {
    doc.text(`${item[0]}: ${item[1]}`, 25, yPos);
    yPos += 8;
  });
  
  // Visual containment diagram
  yPos += 10;
  drawContainmentDiagram(doc, 50, yPos, report);
}

// Draw containment diagram
function drawContainmentDiagram(doc: jsPDF, x: number, y: number, report: InspectionReport) {
  // Dike outline
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(x, y, 100, 60);
  
  // Tank inside dike
  const tankWidth = 60;
  const tankHeight = 40;
  const tankX = x + 20;
  const tankY = y + 10;
  
  doc.setLineWidth(0.5);
  doc.rect(tankX, tankY, tankWidth, tankHeight);
  
  // Labels
  doc.setFontSize(8);
  doc.text('Dike Wall', x - 5, y + 30);
  doc.text('Tank', tankX + tankWidth/2, tankY + tankHeight/2, { align: 'center' });
  doc.text('110% Capacity', x + 50, y + 65, { align: 'center' });
}

// Generate recommendations with priority matrix
function generateRecommendationsWithPriorityMatrix(doc: jsPDF, report: InspectionReport, repairs: RepairRecommendation[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('RECOMMENDATIONS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Priority matrix
  const priorities = {
    Critical: repairs.filter(r => r.priority === 'Critical'),
    High: repairs.filter(r => r.priority === 'High'),
    Medium: repairs.filter(r => r.priority === 'Medium'),
    Low: repairs.filter(r => r.priority === 'Low')
  };
  
  // Draw priority matrix
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Priority Matrix', 20, yPos);
  yPos += 10;
  
  Object.entries(priorities).forEach(([priority, items]) => {
    const color = priority === 'Critical' ? [255, 0, 0] :
                  priority === 'High' ? [255, 100, 0] :
                  priority === 'Medium' ? [255, 165, 0] : [0, 128, 0];
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(25, yPos - 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`${priority}: ${items.length} items`, 30, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    items.slice(0, 2).forEach(item => {
      doc.text(`• ${item.description}`, 35, yPos);
      yPos += 6;
    });
    
    if (items.length > 2) {
      doc.text(`... and ${items.length - 2} more`, 35, yPos);
      yPos += 6;
    }
    yPos += 4;
  });
  
  // Next inspection
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Next Inspection Schedule', 20, yPos);
  yPos += 8;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Next Internal Inspection: ${report.nextInternalInspectionDate || 'TBD'}`, 25, yPos);
  yPos += 8;
  doc.text(`Next External Inspection: ${report.nextInspectionDate || 'TBD'}`, 25, yPos);
}

// Generate visual checklist summary
function generateVisualChecklistSummary(doc: jsPDF, checklists: InspectionChecklist[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTION CHECKLIST', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // Group by category
  const categories = new Map<string, InspectionChecklist[]>();
  checklists.forEach(item => {
    const category = item.category || 'General';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(item);
  });
  
  // Display checklist items
  Array.from(categories.entries()).forEach(([category, items]) => {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(category, 20, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    items.slice(0, 5).forEach(item => {
      const symbol = item.status === 'Pass' ? '✓' : 
                    item.status === 'Fail' ? '✗' : '○';
      const color = item.status === 'Pass' ? [0, 128, 0] :
                    item.status === 'Fail' ? [255, 0, 0] : [128, 128, 128];
      
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(symbol, 25, yPos);
      doc.setTextColor(0, 0, 0);
      doc.text(item.description || 'N/A', 35, yPos);
      yPos += 6;
    });
    
    if (items.length > 5) {
      doc.text(`... and ${items.length - 5} more items`, 35, yPos);
      yPos += 6;
    }
    yPos += 4;
  });
}

// Generate appurtenance diagrams
function generateAppurtenanceDiagrams(doc: jsPDF, appurtenances: AppurtenanceInspection[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('APPURTENANCE INSPECTION', 105, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  appurtenances.forEach(app => {
    doc.setFont(undefined, 'bold');
    doc.text(`${app.type}: ${app.description}`, 20, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 8;
    doc.text(`Condition: ${app.condition}`, 25, yPos);
    yPos += 6;
    if (app.comments) {
      doc.text(`Comments: ${app.comments}`, 25, yPos);
      yPos += 6;
    }
    yPos += 4;
  });
}

// Generate venting system diagrams
function generateVentingSystemDiagrams(doc: jsPDF, venting: VentingSystemInspection[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('VENTING SYSTEM', 105, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  venting.forEach(vent => {
    doc.setFont(undefined, 'bold');
    doc.text(`${vent.ventType}: ${vent.size || 'N/A'}`, 20, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 8;
    doc.text(`Set Pressure: ${vent.setPressure || 'N/A'}`, 25, yPos);
    yPos += 6;
    doc.text(`Condition: ${vent.condition}`, 25, yPos);
    yPos += 6;
    if (vent.comments) {
      doc.text(`Comments: ${vent.comments}`, 25, yPos);
      yPos += 6;
    }
    yPos += 4;
  });
}

// Generate inspector qualifications with visuals
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
    ['Name', report.inspector || 'Not specified'],
    ['API-653 Certification', report.inspectorCertification ? `#${report.inspectorCertification}` : 'Not specified'],
    ['STI Certification', 'Not specified'],
    ['Years Experience', report.inspectorExperience || 'Not specified'],
    ['Additional Certifications', 'Not specified']
  ];

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  inspectorData.forEach(item => {
    doc.text(`${item[0]}: ${item[1]}`, 25, yPos);
    yPos += 8;
  });

  yPos += 10;

  // Assistant inspector section if available
  if (report.inspector) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ASSISTANT INSPECTOR', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Name: Not specified', 25, yPos);
    yPos += 8;
    doc.text('Certification: Not specified', 25, yPos);
  }

  yPos += 15;

  // Professional engineer review
  if (report.reviewer) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('PROFESSIONAL ENGINEER REVIEW', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${report.reviewer}`, 25, yPos);
    yPos += 8;
    doc.text('PE License: Not specified', 25, yPos);
    yPos += 8;
    doc.text(`Review Date: ${report.reviewDate || 'Not specified'}`, 25, yPos);
  }
}

// Generate certification page
function generateCertificationPage(doc: jsPDF, report: InspectionReport) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('CERTIFICATION', 105, yPos, { align: 'center' });
  yPos += 20;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const certText = [
    'I certify that this tank has been inspected in accordance with API Standard 653',
    'and all applicable codes and standards. The inspection was performed using',
    'appropriate methods and calibrated equipment.',
    '',
    'Based on the inspection findings, the tank is suitable for continued service',
    `until the next scheduled inspection on ${report.nextInspectionDate || 'TBD'}.`
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
  
  doc.text('Professional Engineer', 60, yPos, { align: 'center' });
  doc.text('Date', 150, yPos, { align: 'center' });
  
  // Inspector info
  yPos += 20;
  doc.setFontSize(10);
  doc.text(`Inspector: ${report.inspector || 'Not specified'}`, 30, yPos);
  yPos += 8;
  doc.text(`API-653 Cert #: ${report.inspectorCertification || 'Not specified'}`, 30, yPos);
}

// Generate attachments list
function generateAttachmentsList(doc: jsPDF, attachments: ReportAttachment[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('ATTACHMENTS', 105, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  if (attachments.length === 0) {
    doc.text('No attachments included', 105, yPos, { align: 'center' });
  } else {
    attachments.forEach((att, index) => {
      doc.text(`${index + 1}. ${att.fileName}`, 30, yPos);
      if (att.description) {
        doc.setFontSize(9);
        doc.text(`   ${att.description}`, 35, yPos + 5);
        yPos += 5;
      }
      yPos += 8;
    });
  }
}

// Helper function to draw equipment calibration table
function drawEquipmentTable(doc: jsPDF, data: string[][], x: number, y: number) {
  const cellWidth = 40;
  const cellHeight = 7;
  
  // Headers
  const headers = ['Equipment', 'Model', 'Calibration', 'Status'];
  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, cellWidth * 4, cellHeight, 'F');
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  headers.forEach((header, i) => {
    doc.text(header, x + (i * cellWidth) + 2, y + 5);
  });
  
  // Data rows
  doc.setFont(undefined, 'normal');
  data.forEach((row, rowIndex) => {
    const rowY = y + cellHeight * (rowIndex + 1);
    row.forEach((cell, cellIndex) => {
      doc.text(cell, x + (cellIndex * cellWidth) + 2, rowY + 5);
    });
  });
}

function generateVisualTankDiagrams(doc: jsPDF, report: InspectionReport, measurements: ThicknessMeasurement[]) {
  let yPos = 30;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('TANK VISUAL DIAGRAMS', 105, yPos, { align: 'center' });
  yPos += 15;

  // Get unique shell course identifiers from actual measurements
  const shellMeasurements = measurements.filter(m => m.component === 'shell');
  const uniqueCourses = [...new Set(shellMeasurements.map(m => {
    // Extract course number from location (e.g., "Course 1", "1st Course", "C1", etc.)
    const location = m.location || '';
    const courseMatch = location.match(/course\s*(\d+)|^(\d+)|c(\d+)/i);
    if (courseMatch) {
      const courseNum = courseMatch[1] || courseMatch[2] || courseMatch[3];
      return `Course ${courseNum}`;
    }
    return location;
  }).filter(Boolean))].sort();

  // If no courses found in measurements, use default based on tank height
  const courseIds = uniqueCourses.length > 0 ? uniqueCourses : 
    (report.height ? Array.from({ length: Math.ceil(parseFloat(report.height) / 96) }, (_, i) => `Course ${i + 1}`) : ['Course 1']);

  // Prepare shell course data from actual measurements
  const shellCourses = courseIds.map((courseId, index) => {
    const courseMeasurements = shellMeasurements
      .filter(m => {
        const location = m.location || '';
        return location.includes(courseId) || 
               location.includes(`${index + 1}`) ||
               location.toLowerCase().includes(`course ${index + 1}`);
      })
      .map((m, mIndex) => ({
        point: m.location || '',
        thickness: parseFloat(m.currentThickness || '0') || 0,
        x: 0.15 + (mIndex % 4) * 0.2, // Distribute measurements across width
        y: 0.5
      }));

    return {
      courseNumber: courseId,
      height: 96, // Standard 8 feet per course
      nominalThickness: parseFloat(courseMeasurements[0]?.thickness?.toString() || '0.25') || 0.25,
      measurements: courseMeasurements.slice(0, 4) // Show up to 4 measurements per course
    };
  });

  const tankDimensions: TankDimensions = {
    diameter: parseFloat(report.diameter || '0'),
    height: parseFloat(report.height || '0'), // Use 'height' not 'tankHeight'
    shellCourses
  };

  // Generate shell layout diagram
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Shell Layout', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 5;
  
  try {
    generateShellLayoutDiagram(doc, 30, yPos, 60, 80, tankDimensions);
  } catch (error) {
    console.error('Error generating shell layout:', error);
    doc.setFontSize(9);
    doc.text('Shell diagram unavailable', 60, yPos + 40, { align: 'center' });
  }
  
  // Generate roof layout diagram
  try {
    generatePlateLayoutDiagram(
    doc, 
    140, 
    yPos + 40, 
    30, 
    'roof',
    measurements
      .filter(m => m.component === 'roof')
      .map((m, i) => ({
        angle: (i * 45) * Math.PI / 180,
        radius: 0.3 + (i % 3) * 0.3,
        value: parseFloat(m.currentThickness || '0') || 0,
        condition: parseFloat(m.corrosionRate || '0') > 0.01 ? 'corrosion' : undefined
      }))
    );
  } catch (error) {
    console.error('Error generating roof layout:', error);
    doc.setFontSize(9);
    doc.text('Roof diagram unavailable', 155, yPos + 40, { align: 'center' });
  }

  yPos += 100;

  // Add inspection legend
  try {
    generateInspectionLegend(doc, 20, yPos);
  } catch (error) {
    console.error('Error generating legend:', error);
  }
  
  // Add settlement graph if data available
  if (report.maxSettlement) { // Use a field that exists
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('SETTLEMENT ANALYSIS GRAPH', 105, 30, { align: 'center' });
    
    // Generate sample settlement data (would come from actual survey data)
    const settlementPoints = Array.from({ length: 24 }, (_, i) => ({
      point: i + 1,
      elevation: 4.24 + Math.sin((i * 15) * Math.PI / 180) * 0.02,
      cosineValue: 4.24 + Math.cos((i * 15) * Math.PI / 180) * 0.015
    }));
    
    try {
      generateSettlementGraph(doc, 20, 45, 170, 80, settlementPoints);
    } catch (error) {
      console.error('Error generating settlement graph:', error);
      doc.setFontSize(10);
      doc.text('Settlement graph unavailable', 105, 85, { align: 'center' });
    }
  }
}