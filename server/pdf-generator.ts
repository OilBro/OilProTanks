import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { storage } from './storage.ts';
import type { 
  InspectionReport,
  ThicknessMeasurement,
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  AdvancedSettlementSurvey
} from '../shared/schema.ts';

// Extend jsPDF with autoTable types
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable?: any;
  }
}

interface ReportData {
  report: InspectionReport;
  measurements: ThicknessMeasurement[];
  checklists: InspectionChecklist[];
  appurtenances: AppurtenanceInspection[];
  recommendations: RepairRecommendation[];
  ventingInspections: VentingSystemInspection[];
  settlementSurvey?: AdvancedSettlementSurvey | null;
}

export async function generateInspectionPDF(reportId: number): Promise<Buffer> {
  // Fetch all report data
  const report = await storage.getInspectionReport(reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  const [
    measurements,
    checklists,
    appurtenances,
    recommendations,
    ventingInspections,
    settlementSurveys
  ] = await Promise.all([
    storage.getThicknessMeasurements(reportId),
    storage.getInspectionChecklists(reportId),
    storage.getAppurtenanceInspections(reportId),
    storage.getRepairRecommendations(reportId),
    storage.getVentingSystemInspections(reportId),
    storage.getAdvancedSettlementSurveys(reportId)
  ]);

  const reportData: ReportData = {
    report,
    measurements,
    checklists,
    appurtenances,
    recommendations,
    ventingInspections,
    settlementSurvey: settlementSurveys?.[0] || null
  };

  // Generate PDF
  const pdf = new ServerPDFGenerator();
  return pdf.generate(reportData);
}

class ServerPDFGenerator {
  private pdf: jsPDF;
  private currentY: number = 20;
  private margin: number = 20;
  private pageHeight: number = 280;
  private pageWidth: number = 210;
  private primaryColor: [number, number, number] = [34, 41, 108];
  private secondaryColor: [number, number, number] = [220, 53, 69];
  private accentColor: [number, number, number] = [40, 167, 69];

  constructor() {
    this.pdf = new jsPDF();
  }

  generate(data: ReportData): Buffer {
    const { report, measurements, checklists, appurtenances, recommendations, ventingInspections, settlementSurvey } = data;

    // Cover Page
    this.addCoverPage(report);
    
    // Table of Contents
    this.pdf.addPage();
    this.addTableOfContents();
    
    // Executive Summary
    this.pdf.addPage();
    this.addExecutiveSummary(report, measurements);
    
    // Tank Information
    this.pdf.addPage();
    this.addTankInformation(report);
    
    // Thickness Measurements
    if (measurements.length > 0) {
      this.pdf.addPage();
      this.addThicknessMeasurements(measurements);
    }
    
    // Inspection Checklist
    if (checklists.length > 0) {
      this.pdf.addPage();
      this.addInspectionChecklist(checklists);
    }
    
    // Appurtenances
    if (appurtenances.length > 0) {
      this.pdf.addPage();
      this.addAppurtenances(appurtenances);
    }
    
    // Repair Recommendations
    if (recommendations.length > 0) {
      this.pdf.addPage();
      this.addRepairRecommendations(recommendations);
    }
    
    // Venting System
    if (ventingInspections.length > 0) {
      this.pdf.addPage();
      this.addVentingSystem(ventingInspections);
    }
    
    // Settlement Survey
    if (settlementSurvey) {
      this.pdf.addPage();
      this.addSettlementSurvey(settlementSurvey);
    }

    // Convert PDF to buffer
    const pdfOutput = this.pdf.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  private addCoverPage(report: InspectionReport) {
    this.currentY = 60;
    
    // Title
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.primaryColor);
    this.pdf.text('API 653 INSPECTION REPORT', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 30;
    
    // Report Details
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(`Tank ID: ${report.tankId}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 10;
    this.pdf.text(`Report Number: ${report.reportNumber}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 10;
    this.pdf.text(`Inspection Date: ${report.inspectionDate}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 20;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(12);
    this.pdf.text(`Inspector: ${report.inspector}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    // Company Info Box
    this.currentY += 40;
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setFillColor(245, 245, 245);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 60, 'FD');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('OILPRO CONSULTING', this.margin + 10, this.currentY + 15);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.text('API-653 Certified Inspection Services', this.margin + 10, this.currentY + 25);
    this.pdf.text('811 Dafney Drive, Lafayette, LA', this.margin + 10, this.currentY + 35);
    this.pdf.text('Office: (337) 446-7459', this.margin + 10, this.currentY + 45);
  }

  private addTableOfContents() {
    this.currentY = 40;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(18);
    this.pdf.text('TABLE OF CONTENTS', this.margin, this.currentY);
    
    this.currentY += 20;
    
    const sections = [
      'Executive Summary',
      'Tank Information',
      'Thickness Measurements',
      'Inspection Checklist',
      'Appurtenance Inspections',
      'Repair Recommendations',
      'Venting System Inspection',
      'Settlement Survey',
      'Appendices'
    ];
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(12);
    
    sections.forEach((section, index) => {
      this.pdf.text(`${index + 1}. ${section}`, this.margin + 10, this.currentY);
      this.currentY += 10;
    });
  }

  private addExecutiveSummary(report: InspectionReport, measurements: ThicknessMeasurement[]) {
    this.currentY = 40;
    this.addSectionHeader('EXECUTIVE SUMMARY');
    
    // Status Summary
    const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
    const monitorCount = measurements.filter(m => m.status === 'monitor').length;
    const actionCount = measurements.filter(m => m.status === 'action_required' || m.status === 'critical').length;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    const summaryText = [
      `Tank ${report.tankId} was inspected on ${report.inspectionDate} in accordance with API 653 standards.`,
      `The inspection included ${measurements.length} thickness measurement locations.`,
      ``,
      `Status Summary:`,
      `• Acceptable: ${acceptableCount} locations`,
      `• Monitor: ${monitorCount} locations`,
      `• Action Required: ${actionCount} locations`,
      ``,
      `Service: ${report.service || 'Not specified'}`,
      `Overall Status: ${report.status || 'In Service'}`
    ];
    
    summaryText.forEach(line => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 7;
    });
  }

  private addTankInformation(report: InspectionReport) {
    this.currentY = 40;
    this.addSectionHeader('TANK INFORMATION');
    
    const tankData = [
      ['Tank ID', report.tankId],
      ['Service/Product', report.service || 'N/A'],
      ['Diameter (ft)', report.diameter?.toString() || 'N/A'],
      ['Height (ft)', report.height?.toString() || 'N/A'],
      ['Original Shell Thickness (in)', report.originalThickness?.toString() || 'N/A'],
      ['Years Since Last Inspection', report.yearsSinceLastInspection?.toString() || 'N/A'],
      ['Inspector', report.inspector || 'N/A'],
      ['API Certification #', report.apiCertificationNumber || 'N/A'],
      ['Status', report.status || 'In Service']
    ];
    
    (this.pdf as any).autoTable({
      head: [['Parameter', 'Value']],
      body: tankData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 20;
  }

  private addThicknessMeasurements(measurements: ThicknessMeasurement[]) {
    this.currentY = 40;
    this.addSectionHeader('THICKNESS MEASUREMENTS');
    
    // Group measurements by component
    const shellMeasurements = measurements.filter(m => m.component?.toLowerCase().includes('shell'));
    const bottomMeasurements = measurements.filter(m => m.component?.toLowerCase().includes('bottom'));
    const otherMeasurements = measurements.filter(m => 
      !m.component?.toLowerCase().includes('shell') && 
      !m.component?.toLowerCase().includes('bottom')
    );
    
    // Shell Measurements
    if (shellMeasurements.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('Shell Measurements', this.margin, this.currentY);
      this.currentY += 10;
      
      const shellData = shellMeasurements.map(m => [
        m.location || 'N/A',
        m.currentThickness ? parseFloat(String(m.currentThickness)).toFixed(3) : 'N/A',
        m.originalThickness ? parseFloat(String(m.originalThickness)).toFixed(3) : 'N/A',
        m.minRequiredThickness ? parseFloat(String(m.minRequiredThickness)).toFixed(3) : 'N/A',
        m.corrosionRate ? parseFloat(String(m.corrosionRate)).toFixed(1) : 'N/A',
        m.remainingLife ? parseFloat(String(m.remainingLife)).toFixed(1) : 'N/A',
        m.status || 'N/A'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Location', 'Current (in)', 'Original (in)', 'Min Req (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
        body: shellData,
        startY: this.currentY,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8
        }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
    }
    
    // Bottom Measurements
    if (bottomMeasurements.length > 0) {
      if (this.currentY > this.pageHeight - 60) {
        this.pdf.addPage();
        this.currentY = 40;
      }
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('Bottom Plate Measurements', this.margin, this.currentY);
      this.currentY += 10;
      
      const bottomData = bottomMeasurements.map(m => [
        m.location || 'N/A',
        m.currentThickness ? parseFloat(String(m.currentThickness)).toFixed(3) : 'N/A',
        m.originalThickness ? parseFloat(String(m.originalThickness)).toFixed(3) : 'N/A',
        m.minRequiredThickness ? parseFloat(String(m.minRequiredThickness)).toFixed(3) : 'N/A',
        m.corrosionRate ? parseFloat(String(m.corrosionRate)).toFixed(1) : 'N/A',
        m.remainingLife ? parseFloat(String(m.remainingLife)).toFixed(1) : 'N/A',
        m.status || 'N/A'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Location', 'Current (in)', 'Original (in)', 'Min Req (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
        body: bottomData,
        startY: this.currentY,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8
        }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
    }
  }

  private addInspectionChecklist(checklists: InspectionChecklist[]) {
    this.currentY = 40;
    this.addSectionHeader('INSPECTION CHECKLIST');
    
    // Group by category
    const externalItems = checklists.filter(item => item.category === 'external');
    const internalItems = checklists.filter(item => item.category === 'internal');
    const foundationItems = checklists.filter(item => item.category === 'foundation');
    
    // External Inspection
    if (externalItems.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('External Inspection', this.margin, this.currentY);
      this.currentY += 10;
      
      const externalData = externalItems.map(item => [
        item.item || 'N/A',
        item.checked ? '✓' : '✗',
        item.notes || '-'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Item', 'Status', 'Notes']],
        body: externalData,
        startY: this.currentY,
        theme: 'grid',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 'auto' }
        }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
    }
    
    // Internal Inspection
    if (internalItems.length > 0) {
      if (this.currentY > this.pageHeight - 60) {
        this.pdf.addPage();
        this.currentY = 40;
      }
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('Internal Inspection', this.margin, this.currentY);
      this.currentY += 10;
      
      const internalData = internalItems.map(item => [
        item.item || 'N/A',
        item.checked ? '✓' : '✗',
        item.notes || '-'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Item', 'Status', 'Notes']],
        body: internalData,
        startY: this.currentY,
        theme: 'grid',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 'auto' }
        }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
    }
  }

  private addAppurtenances(appurtenances: AppurtenanceInspection[]) {
    this.currentY = 40;
    this.addSectionHeader('APPURTENANCE INSPECTIONS');
    
    const appurtenanceData = appurtenances.map(item => [
      item.component || 'N/A',
      item.location || 'N/A',
      item.condition || 'N/A',
      item.action || 'None',
      item.notes || '-'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Component', 'Location', 'Condition', 'Action', 'Notes']],
      body: appurtenanceData,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 20;
  }

  private addRepairRecommendations(recommendations: RepairRecommendation[]) {
    this.currentY = 40;
    this.addSectionHeader('REPAIR RECOMMENDATIONS');
    
    const recommendationData = recommendations.map(item => [
      item.priority || 'Normal',
      item.component || 'N/A',
      item.description || 'N/A',
      item.timing || 'As scheduled',
      item.estimatedCost?.toString() || 'TBD'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Priority', 'Component', 'Description', 'Timing', 'Est. Cost']],
      body: recommendationData,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      didDrawCell: (data: any) => {
        // Highlight critical priority items
        if (data.column.index === 0 && data.row.section === 'body') {
          const priority = data.cell.raw;
          if (priority === 'critical' || priority === 'high') {
            this.pdf.setTextColor(...this.secondaryColor);
          }
        }
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 20;
  }

  private addVentingSystem(ventingInspections: VentingSystemInspection[]) {
    this.currentY = 40;
    this.addSectionHeader('VENTING SYSTEM INSPECTION');
    
    const ventingData = ventingInspections.map(item => [
      item.component || 'N/A',
      item.type || 'N/A',
      item.size || 'N/A',
      item.condition || 'N/A',
      item.operationalStatus || 'N/A',
      item.notes || '-'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Component', 'Type', 'Size', 'Condition', 'Status', 'Notes']],
      body: ventingData,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 20;
  }

  private addSettlementSurvey(survey: AdvancedSettlementSurvey) {
    this.currentY = 40;
    this.addSectionHeader('SETTLEMENT SURVEY');
    
    // Survey Summary
    const summaryData = [
      ['Survey Date', survey.surveyDate || 'N/A'],
      ['Measurement Type', survey.measurementType || 'N/A'],
      ['Number of Points', survey.numberOfPoints?.toString() || 'N/A'],
      ['Maximum Settlement', survey.maxSettlement ? parseFloat(String(survey.maxSettlement)).toFixed(3) : 'N/A'],
      ['Maximum Tilt', survey.maxTilt ? parseFloat(String(survey.maxTilt)).toFixed(4) : 'N/A'],
      ['Out of Plane Settlement', survey.outOfPlaneSettlement ? parseFloat(String(survey.outOfPlaneSettlement)).toFixed(3) : 'N/A'],
      ['Settlement Acceptance', survey.settlementAcceptance || 'PENDING'],
      ['Recommendations', survey.settlementRecommendations || 'None']
    ];
    
    (this.pdf as any).autoTable({
      head: [['Parameter', 'Value']],
      body: summaryData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 20;
  }

  private addSectionHeader(title: string) {
    this.pdf.setFillColor(...this.primaryColor);
    this.pdf.rect(0, this.currentY - 10, this.pageWidth, 15, 'F');
    
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin, this.currentY);
    
    this.pdf.setTextColor(0, 0, 0);
    this.currentY += 20;
  }
}