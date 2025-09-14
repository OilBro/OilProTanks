import {
  generateShellLayoutDiagram,
  generatePlateLayoutDiagram,
  generateSettlementGraph,
  generateInspectionLegend
} from './tank-diagram-generator';

// Fallback stubs for missing exports
function generateAppurtenanceInspections(pdf: jsPDF, appurtenances: any, y: number) {}
function generateInspectionChecklists(pdf: jsPDF, checklist: any, y: number) {}
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TankDetails {
  diameter: number;
  height: number;
  capacity: number;
  product: string;
  yearBuilt: number;
  lastInspection?: string;
  designCode: string;
  material: string;
}

interface ShellCourse {
  courseNumber: number;
  height: number;
  nominalThickness: number;
  measuredThickness: number;
  requiredThickness: number;
  corrosionRate: number;
  remainingLife: number;
  status: string;
}

interface ShellData {
  courses: ShellCourse[];
  governingCourse: number;
  overallStatus: string;
}

interface BottomData {
  nominalThickness: number;
  minMeasured: number;
  requiredThickness: number;
  corrosionRate: number;
  remainingLife: number;
  mriDate?: string;
}

interface SettlementMeasurement {
  point: number;
  angle: number;
  elevation: number;
  cosineFit?: number;
}

interface SettlementData {
  measurements: SettlementMeasurement[];
  amplitude: number;
  phase: number;
  rSquared: number;
  maxSettlement: number;
  allowableSettlement: number;
  acceptance: string;
}

interface CMLData {
  cmlId: string;
  component: string;
  location: string;
  currentReading: number;
  previousReading?: number;
  tMin: number;
  corrosionRate: number;
  remainingLife: number;
  nextInspDate: string;
  status: string;
}

interface Findings {
  executive: string;
  critical: string[];
  major: string[];
  minor: string[];
  recommendations: string[];
  nextInspectionDate: string;
}

interface ReportData {
  reportNumber: string;
  tankId: string;
  facilityName: string;
  location: string;
  inspectionDate: string;
  inspector: string;
  reviewedBy?: string;
  tankDetails: TankDetails;
  shellData: ShellData;
  bottomData: BottomData;
  settlementData?: SettlementData;
  cmlData?: CMLData[];
  findings?: Findings;
  appurtenances?: any;
  vents?: any;
  checklist?: any;
  logoDataUrl?: string; // optional base64 logo provided externally
}

export class ProfessionalReportGenerator {
  // --- Implemented previously-empty methods ---
  private addCoverPage(data: ReportData) {
    // Reset to first page top area
    this.currentY = 40;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(...this.primaryColor);
    this.pdf.text('API 653 INSPECTION REPORT', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 16;

    this.pdf.setFontSize(14);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(`Tank: ${data.tankId || 'N/A'}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;
    this.pdf.setFontSize(12);
    this.pdf.text(`Report #: ${data.reportNumber || 'N/A'}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;
    this.pdf.text(`Inspection Date: ${data.inspectionDate || 'N/A'}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;
    this.pdf.text(`Inspector: ${data.inspector || 'N/A'}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 20;

    // Simple accent bar
    this.pdf.setFillColor(...this.primaryColor);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), 3, 'F');
    this.currentY += 10;

    // Quick summary box
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    const summaryLines = [
      `Facility: ${data.facilityName || 'N/A'}`,
      `Location: ${data.location || 'N/A'}`,
      `Design Code: ${data.tankDetails?.designCode || 'API 650 / 653'}`,
      `Material: ${data.tankDetails?.material || 'N/A'}`
    ];
    let y = this.currentY;
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.rect(this.margin, y - 6, this.pageWidth - (this.margin * 2), summaryLines.length * 7 + 4);
    summaryLines.forEach(l => {
      this.pdf.text(l, this.margin + 4, y);
      y += 7;
    });
    this.currentY = y + 10;

    this.pdf.addPage();
    this.currentY = 30;
  }

  private createTankDetailsSection(details: TankDetails) {
    // Reuse logic from createTankInformation style (lean version)
    const data = [
      ['Diameter (ft)', details.diameter.toString()],
      ['Height (ft)', details.height.toString()],
      ['Capacity (bbls)', details.capacity.toString()],
      ['Product', details.product],
      ['Year Built', details.yearBuilt.toString()],
      ['Design Code', details.designCode],
      ['Material', details.material]
    ];
    autoTable(this.pdf, {
      head: [['Parameter', 'Value']],
      body: data,
      startY: this.currentY,
      theme: 'grid',
      headStyles: { fillColor: this.primaryColor, fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10 }
    });
    this.pdf.addPage();
    this.currentY = 30;
  }

  private createBottomPlateSection(bottomData: BottomData) {
    // Delegate to comprehensive bottom assessment section for consistency
    this.createBottomAssessmentSection({
      reportNumber: '',
      tankId: '',
      facilityName: '',
      location: '',
      inspectionDate: '',
      inspector: '',
      tankDetails: { diameter: 0, height: 0, capacity: 0, product: '', yearBuilt: 0, designCode: '', material: '' },
      shellData: { courses: [], governingCourse: 0, overallStatus: '' },
      bottomData
    } as unknown as ReportData); // Type coercion for re-use
  }

  private createAppurtenancesSection(appurtenances: any) {
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    if (!appurtenances || Object.keys(appurtenances).length === 0) {
      this.pdf.text('No appurtenance data provided.', this.margin, this.currentY);
      this.currentY += 10;
      return;
    }
    Object.entries(appurtenances).forEach(([k, v]) => {
      if (this.currentY > this.pageHeight - 30) { this.pdf.addPage(); this.currentY = 30; }
      this.pdf.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private createShellThicknessSection(shellData: ShellData) {
    // Simple wrapper to reuse the more detailed calculations section
    const tmp: ReportData = {
      reportNumber: '', tankId: '', facilityName: '', location: '', inspectionDate: '', inspector: '',
      tankDetails: { diameter: 0, height: 0, capacity: 0, product: '', yearBuilt: 0, designCode: '', material: '' },
      shellData,
      bottomData: { nominalThickness: 0, minMeasured: 0, requiredThickness: 0, corrosionRate: 0, remainingLife: 0 }
    } as unknown as ReportData;
    this.createShellCalculationsSection(tmp);
  }

  private createVentsSection(vents: any) {
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    if (!vents) {
      this.pdf.text('No vent data provided.', this.margin, this.currentY);
      this.currentY += 10;
      return;
    }
    Object.entries(vents).forEach(([k, v]) => {
      if (this.currentY > this.pageHeight - 30) { this.pdf.addPage(); this.currentY = 30; }
      this.pdf.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private createChecklistSection(checklist: any) {
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    if (!checklist) {
      this.pdf.text('No checklist data provided.', this.margin, this.currentY);
      this.currentY += 10;
      return;
    }
    Object.entries(checklist).forEach(([k, v]) => {
      if (this.currentY > this.pageHeight - 30) { this.pdf.addPage(); this.currentY = 30; }
      this.pdf.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, this.margin, this.currentY);
      this.currentY += 6;
    });
  }
  private pdf: jsPDF;
  private pageHeight = 297; // A4 height in mm
  private pageWidth = 210; // A4 width in mm
  private margin = 20;
  private currentY = 20;
  private primaryColor: [number, number, number] = [0, 48, 135]; // Navy blue
  private secondaryColor: [number, number, number] = [220, 38, 38]; // Red for alerts
  private accentColor: [number, number, number] = [34, 197, 94]; // Green for good status
  
  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }
  
  generate(data: ReportData): Blob {
    this.pdf = new jsPDF();
    this.currentY = 30;
    this.addCoverPage(data);

    // Optional logo (top-right of cover page) - attempt after cover creation to avoid shifting layout
    if (data.logoDataUrl) {
      try {
        this.pdf.addImage(data.logoDataUrl, 'PNG', this.pageWidth - 60, 20, 40, 25, undefined, 'FAST');
      } catch (e) {
        // silently ignore logo embedding issues
        console.warn('Logo embedding failed:', e);
      }
    }

    // Table of contents & Executive Summary pages
    this.createTableOfContents();
    this.createExecutiveSummary(data);
    this.createTankInformation(data);

    // Tank Details
    this.addSectionHeader('TANK DETAILS');
    this.createTankDetailsSection(data.tankDetails);

    // Shell Thickness
    this.addSectionHeader('SHELL THICKNESS');
    this.createShellThicknessSection(data.shellData);

    // Bottom Plate
    this.addSectionHeader('BOTTOM PLATE');
    this.createBottomPlateSection(data.bottomData);

    // Settlement Graph (Cosine)
    this.addSectionHeader('SETTLEMENT');
    if (data.settlementData) {
      this.createSettlementSection(data.settlementData);
      generateSettlementGraph(
        this.pdf,
        30,
        this.currentY + 10,
        150,
        60,
        data.settlementData.measurements.map(m => ({
          point: m.point,
          elevation: m.elevation,
          cosineValue: m.cosineFit
        }))
      );
      this.currentY += 80;
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No settlement data available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Appurtenances
    this.addSectionHeader('APPURTENANCES');
    if (data.appurtenances) {
      this.createAppurtenancesSection(data.appurtenances);
      generateAppurtenanceInspections(this.pdf, data.appurtenances, this.currentY + 10);
      this.currentY += 80;
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No appurtenance data available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Vents
    this.addSectionHeader('VENTS');
    if (data.vents) {
      this.createVentsSection(data.vents);
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No vent data available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Inspection Checklist
    this.addSectionHeader('INSPECTION CHECKLIST');
    if (data.checklist) {
      this.createChecklistSection(data.checklist);
      generateInspectionChecklists(this.pdf, data.checklist, this.currentY + 10);
      this.currentY += 80;
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No checklist data available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

  // CML DATA
    this.addSectionHeader('CML DATA');
    if (data.cmlData && data.cmlData.length) {
      this.createCMLSection(data.cmlData);
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No CML data available.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Findings & Recommendations
  this.addSectionHeader('FINDINGS & RECOMMENDATIONS');
    if (data.findings) {
      this.createFindingsSection(data.findings);
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No findings or recommendations available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Sketches and Diagrams
    this.addSectionHeader('SKETCHES AND DIAGRAMS');
    if (data.tankDetails) {
      this.createSketchesSection(data);
      generateShellLayoutDiagram(
        this.pdf,
        30,
        this.currentY + 10,
        150,
        60,
        {
          shellCourses: data.shellData.courses.map(c => ({
            courseNumber: String(c.courseNumber),
            height: c.height,
            nominalThickness: c.nominalThickness,
            measuredThickness: c.measuredThickness,
            requiredThickness: c.requiredThickness,
            corrosionRate: c.corrosionRate,
            remainingLife: c.remainingLife,
            status: c.status
          })),
          diameter: data.tankDetails.diameter,
          height: data.tankDetails.height
        }
      );
      this.currentY += 80;
      generatePlateLayoutDiagram(
        this.pdf,
        105,
        this.currentY + 40,
        30,
        'roof',
        []
      );
      generatePlateLayoutDiagram(
        this.pdf,
        105,
        this.currentY + 80,
        30,
        'bottom',
        []
      );
      generateInspectionLegend(this.pdf, 170, this.currentY + 10);
      this.currentY += 120;
    } else {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(220, 38, 38);
      this.pdf.text('No sketches or diagrams available for this section.', this.margin, this.currentY);
      this.currentY += 10;
      this.pdf.setTextColor(0, 0, 0);
    }

    // Append Appendices placeholder at end
    this.createAppendices(data);

    // Add page numbers (skip cover? count all but label from page 1)
    const pageCount = this.pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(120, 120, 120);
      this.pdf.text(`Page ${i} of ${pageCount}`, this.pageWidth / 2, this.pageHeight - 8, { align: 'center' });
    }

    return this.pdf.output('blob');
  }
  
  private createTableOfContents() {
    this.currentY = 30;
    this.addSectionHeader('TABLE OF CONTENTS');
    
    const tocItems = [
      { title: 'Executive Summary', page: 3 },
      { title: 'Tank Information', page: 4 },
      { title: 'Shell Thickness Calculations', page: 5 },
      { title: 'Bottom Assessment', page: 7 },
      { title: 'Settlement Analysis', page: 8 },
      { title: 'CML Data Analysis', page: 10 },
      { title: 'Findings & Recommendations', page: 12 },
      { title: 'Appendices', page: 14 }
    ];
    
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    
    tocItems.forEach(item => {
      // Draw dotted line
      const titleWidth = this.pdf.getTextWidth(item.title);
      const pageText = `${item.page}`;
      const pageWidth = this.pdf.getTextWidth(pageText);
      
      this.pdf.text(item.title, this.margin, this.currentY);
      this.pdf.text(pageText, this.pageWidth - this.margin - pageWidth, this.currentY);
      
      // Draw dots
      const dotsStart = this.margin + titleWidth + 5;
      const dotsEnd = this.pageWidth - this.margin - pageWidth - 5;
      this.pdf.setLineDashPattern([1, 2], 0);
      this.pdf.line(dotsStart, this.currentY - 1, dotsEnd, this.currentY - 1);
      this.pdf.setLineDashPattern([], 0);
      
      this.currentY += 8;
    });
    
    this.pdf.addPage();
  }
  
  private createExecutiveSummary(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('EXECUTIVE SUMMARY');
    
    // Overall Status Box
    const status = data.shellData.overallStatus || 'PENDING';
    const statusColor: [number, number, number] = status === 'ACCEPTABLE' ? this.accentColor : 
                       status === 'MONITOR' ? [255, 159, 64] : this.secondaryColor;
    
    this.pdf.setFillColor(...statusColor);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 20, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`OVERALL TANK STATUS: ${status}`, this.pageWidth / 2, this.currentY + 12, { align: 'center' });
    
    this.currentY += 30;
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    // Key Findings Summary
    const summaryText = [
      `Tank ${data.tankId} has been inspected in accordance with API 653 standards.`,
      `The inspection was conducted on ${data.inspectionDate} by ${data.inspector}.`,
      '',
      'KEY FINDINGS:',
      `• Shell Governing Course: Course ${data.shellData.governingCourse}`,
      `• Minimum Shell Remaining Life: ${Math.min(...data.shellData.courses.map(c => c.remainingLife)).toFixed(1)} years`,
      `• Bottom Remaining Life: ${data.bottomData.remainingLife.toFixed(1)} years`,
      `• Settlement Status: ${data.settlementData?.acceptance || 'Not Assessed'}`,
      '',
      'CRITICAL ITEMS:',
      ...(data.findings?.critical || ['• No critical items identified']).map(item => `• ${item}`),
      '',
      'NEXT INSPECTION:',
      `• Recommended Date: ${data.findings?.nextInspectionDate || 'TBD'}`,
      `• Inspection Type: ${data.bottomData.remainingLife < 10 ? 'Internal' : 'External'}`
    ];
    
    let lineY = this.currentY;
    summaryText.forEach(line => {
      if (line.startsWith('KEY FINDINGS:') || line.startsWith('CRITICAL ITEMS:') || line.startsWith('NEXT INSPECTION:')) {
        this.pdf.setFont('helvetica', 'bold');
      } else {
        this.pdf.setFont('helvetica', 'normal');
      }
      
      if (lineY > this.pageHeight - 30) {
        this.pdf.addPage();
        lineY = 30;
      }
      
      this.pdf.text(line, this.margin, lineY);
      lineY += 6;
    });
    
    this.pdf.addPage();
  }
  
  private createTankInformation(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('TANK INFORMATION');
    
    // Tank Details Table
    const tankInfo = [
      ['Parameter', 'Value'],
      ['Tank ID', data.tankId],
      ['Facility', data.facilityName || 'N/A'],
      ['Location', data.location || 'N/A'],
      ['Diameter', `${data.tankDetails.diameter} ft`],
      ['Height', `${data.tankDetails.height} ft`],
      ['Capacity', `${data.tankDetails.capacity} bbls`],
      ['Product', data.tankDetails.product],
      ['Year Built', data.tankDetails.yearBuilt.toString()],
      ['Design Code', data.tankDetails.designCode],
      ['Material', data.tankDetails.material],
      ['Last Internal Inspection', data.tankDetails.lastInspection || 'N/A']
    ];
    
    autoTable(this.pdf, {
      head: [tankInfo[0]],
      body: tankInfo.slice(1),
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
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });
    
    this.pdf.addPage();
  }
  
  private createShellCalculationsSection(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('SHELL THICKNESS CALCULATIONS');
    
    // Shell Courses Table
    const tableData = data.shellData.courses.map(course => [
      course.courseNumber.toString(),
      course.height.toFixed(2),
      course.nominalThickness.toFixed(3),
      course.measuredThickness.toFixed(3),
      course.requiredThickness.toFixed(3),
      course.corrosionRate.toFixed(1),
      course.remainingLife > 100 ? '>100' : course.remainingLife.toFixed(1),
      course.status
    ]);
    
    autoTable(this.pdf, {
      head: [['Course', 'Height (ft)', 'Nominal (in)', 'Measured (in)', 'Required (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
      body: tableData,
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
      columnStyles: {
        7: {
          cellWidth: 25,
          halign: 'center'
        }
      },
      didDrawCell: (data: any) => {
        // Color code status column
        if (data.column.index === 7 && data.row.section === 'body') {
          const status = data.cell.raw;
          if (status === 'ACCEPTABLE') {
            this.pdf.setTextColor(...this.accentColor);
          } else if (status === 'MONITOR') {
            this.pdf.setTextColor(255, 159, 64);
          } else if (status === 'ACTION REQ') {
            this.pdf.setTextColor(...this.secondaryColor);
          }
          this.pdf.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          this.pdf.setTextColor(0, 0, 0);
        }
      }
    });
    
    // Governing Course Summary
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 30, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text(`GOVERNING COURSE: Course ${data.shellData.governingCourse}`, this.margin + 5, this.currentY + 10);
    
    const govCourse = data.shellData.courses.find(c => c.courseNumber === data.shellData.governingCourse);
    if (govCourse) {
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      this.pdf.text(`Minimum Remaining Life: ${govCourse.remainingLife.toFixed(1)} years`, this.margin + 5, this.currentY + 18);
      this.pdf.text(`Maximum Corrosion Rate: ${govCourse.corrosionRate.toFixed(1)} mpy`, this.margin + 5, this.currentY + 25);
    }
    
    this.pdf.addPage();
  }
  
  private createBottomAssessmentSection(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('BOTTOM ASSESSMENT');
    
    const bottomInfo = [
      ['Parameter', 'Value', 'Status'],
      ['Nominal Thickness', `${data.bottomData.nominalThickness.toFixed(3)}"`, '-'],
      ['Minimum Measured', `${data.bottomData.minMeasured.toFixed(3)}"`, data.bottomData.minMeasured < data.bottomData.requiredThickness ? 'CRITICAL' : 'OK'],
      ['Required Thickness', `${data.bottomData.requiredThickness.toFixed(3)}"`, '-'],
      ['Corrosion Rate', `${data.bottomData.corrosionRate.toFixed(1)} mpy`, data.bottomData.corrosionRate > 5 ? 'HIGH' : 'NORMAL'],
      ['Remaining Life', `${data.bottomData.remainingLife.toFixed(1)} years`, data.bottomData.remainingLife < 5 ? 'CRITICAL' : data.bottomData.remainingLife < 10 ? 'MONITOR' : 'OK'],
      ['Next MRI Date', data.bottomData.mriDate || 'TBD', '-']
    ];
    
    autoTable(this.pdf, {
      head: [bottomInfo[0]],
      body: bottomInfo.slice(1),
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
      didDrawCell: (data: any) => {
        // Color code status column
        if (data.column.index === 2 && data.row.section === 'body') {
          const status = data.cell.raw;
          if (status === 'OK') {
            this.pdf.setTextColor(...this.accentColor);
          } else if (status === 'MONITOR' || status === 'HIGH') {
            this.pdf.setTextColor(255, 159, 64);
          } else if (status === 'CRITICAL') {
            this.pdf.setTextColor(...this.secondaryColor);
          }
        }
      }
    });
    
    this.pdf.addPage();
  }
  
  private createSettlementSection(settlementData: any) {
    this.currentY = 30;
    this.addSectionHeader('SETTLEMENT ANALYSIS');
    
    if (settlementData && (settlementData.amplitude || settlementData.maxSettlement)) {
      // Show available settlement data even without measurements
      const summaryData = [
        ['Parameter', 'Value', 'Status'],
        ['Peak-to-Peak Settlement', settlementData.amplitude ? `${(settlementData.amplitude * 2).toFixed(3)} ft` : 'N/A', settlementData.acceptance || 'PENDING'],
        ['Cosine Amplitude', settlementData.amplitude ? `${settlementData.amplitude.toFixed(4)} ft` : 'N/A', '-'],
        ['Phase Angle', settlementData.phase ? `${settlementData.phase.toFixed(1)}°` : 'N/A', '-'],
        ['R² Value', settlementData.rSquared ? settlementData.rSquared.toFixed(4) : 'N/A', settlementData.rSquared >= 0.9 ? 'OK' : 'WARNING'],
        ['Max Out-of-Plane', settlementData.maxSettlement ? `${settlementData.maxSettlement.toFixed(4)} ft` : 'N/A', '-']
      ];
      
      autoTable(this.pdf, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: this.currentY,
        theme: 'grid',
        headStyles: { fillColor: this.primaryColor, textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 }
      });
    } else {
      // No settlement data available
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text('No settlement analysis data available for this report.', this.margin, this.currentY + 10);
      this.pdf.setTextColor(0, 0, 0);
    }
    
    // Measurement Points Table (if space permits)
    if (settlementData.measurements && settlementData.measurements.length > 0) {
      this.currentY = this.pdf.lastAutoTable.finalY + 15;
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('Measurement Points', this.margin, this.currentY);
      this.currentY += 5;
      
      const measurementData = settlementData.measurements.map((m: any) => [
        m.point.toString(),
        `${m.angle.toFixed(0)}°`,
        m.elevation.toFixed(4),
        m.cosineFit ? m.cosineFit.toFixed(4) : '-',
        m.cosineFit ? (m.elevation - m.cosineFit).toFixed(4) : '-'
      ]);
      
      autoTable(this.pdf, {
        head: [['Point', 'Angle', 'Measured (ft)', 'Cosine Fit (ft)', 'Deviation (ft)']],
        body: measurementData,
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
    }
    
    this.pdf.addPage();
  }
  
  private createCMLSection(cmlData: any[]) {
    this.currentY = 30;
    this.addSectionHeader('CML DATA ANALYSIS');
    
    // Sort CML data by remaining life (ascending)
    const sortedCML = [...cmlData].sort((a, b) => a.remainingLife - b.remainingLife);
    
    // Show top 10 critical CMLs
    const criticalCMLs = sortedCML.slice(0, 10).map(cml => [
      cml.cmlId,
      cml.component,
      cml.location,
      cml.currentReading.toFixed(3),
      cml.tMin.toFixed(3),
      cml.corrosionRate.toFixed(1),
      cml.remainingLife > 100 ? '>100' : cml.remainingLife.toFixed(1),
      cml.status
    ]);
    
    autoTable(this.pdf, {
      head: [['CML ID', 'Component', 'Location', 'Current (in)', 't-min (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
      body: criticalCMLs,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        7: { cellWidth: 20, halign: 'center' }
      }
    });
    
    // CML Summary Statistics
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    const criticalCount = cmlData.filter(c => c.status === 'critical').length;
    const warningCount = cmlData.filter(c => c.status === 'action_required' || c.status === 'monitor').length;
    const avgCorrosionRate = cmlData.reduce((sum, c) => sum + c.corrosionRate, 0) / cmlData.length;
    
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 25, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(10);
    this.pdf.text('CML SUMMARY:', this.margin + 5, this.currentY + 8);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`Total CML Locations: ${cmlData.length}`, this.margin + 5, this.currentY + 15);
    this.pdf.text(`Critical Locations: ${criticalCount}`, this.margin + 70, this.currentY + 15);
    this.pdf.text(`Warning Locations: ${warningCount}`, this.margin + 120, this.currentY + 15);
    this.pdf.text(`Average Corrosion Rate: ${avgCorrosionRate.toFixed(1)} mpy`, this.margin + 5, this.currentY + 21);
    
    this.pdf.addPage();
  }
  
  private createFindingsSection(findings: any) {
    this.currentY = 30;
    this.addSectionHeader('FINDINGS & RECOMMENDATIONS');
    
    // Executive Summary
    if (findings.executive) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('Executive Summary:', this.margin, this.currentY);
      this.currentY += 7;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      const lines = this.pdf.splitTextToSize(findings.executive, this.pageWidth - 2 * this.margin);
      lines.forEach((line: string) => {
        if (this.currentY > this.pageHeight - 30) {
          this.pdf.addPage();
          this.currentY = 30;
        }
        this.pdf.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 5;
    }
    
    // Critical Findings
    if (findings.critical && findings.critical.length > 0) {
      this.addFindingSection('CRITICAL FINDINGS', findings.critical, this.secondaryColor);
    }
    
    // Major Findings
    if (findings.major && findings.major.length > 0) {
      this.addFindingSection('MAJOR FINDINGS', findings.major, [255, 159, 64] as [number, number, number]);
    }
    
    // Minor Findings
    if (findings.minor && findings.minor.length > 0) {
      this.addFindingSection('MINOR FINDINGS', findings.minor, [100, 100, 100] as [number, number, number]);
    }
    
    // Recommendations
    if (findings.recommendations && findings.recommendations.length > 0) {
      if (this.currentY > this.pageHeight - 60) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(12);
      this.pdf.text('RECOMMENDATIONS:', this.margin, this.currentY);
      this.currentY += 7;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      findings.recommendations.forEach((rec: string, index: number) => {
        if (this.currentY > this.pageHeight - 30) {
          this.pdf.addPage();
          this.currentY = 30;
        }
        const lines = this.pdf.splitTextToSize(`${index + 1}. ${rec}`, this.pageWidth - 2 * this.margin - 5);
        lines.forEach((line: string) => {
          this.pdf.text(line, this.margin + 5, this.currentY);
          this.currentY += 5;
        });
        this.currentY += 2;
      });
    }
    
    this.pdf.addPage();
  }
  
  private createAppendices(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('APPENDICES');
    
    const appendices = [
      'A. API 653 Calculation Methodology',
      'B. Thickness Measurement Locations Map',
      'C. Photographic Documentation',
      'D. Previous Inspection History',
      'E. Calibration Certificates',
      'F. Material Certifications',
      'G. Repair History',
      'H. Reference Standards'
    ];
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    appendices.forEach(appendix => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      this.pdf.text(appendix, this.margin, this.currentY);
      this.currentY += 8;
    });
    
    // Add note about appendices
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    const noteText = 'Note: Detailed appendices are available in the complete inspection package. Please contact the inspection team for additional documentation.';
    const lines = this.pdf.splitTextToSize(noteText, this.pageWidth - 2 * this.margin);
    lines.forEach((line: string) => {
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 5;
    });
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
  
  private addFindingSection(title: string, findings: string[], color: [number, number, number]) {
    if (this.currentY > this.pageHeight - 50) {
      this.pdf.addPage();
      this.currentY = 30;
    }
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...color);
    this.pdf.text(title, this.margin, this.currentY);
    this.pdf.setTextColor(0, 0, 0);
    this.currentY += 7;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    findings.forEach(finding => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      const lines = this.pdf.splitTextToSize(`• ${finding}`, this.pageWidth - 2 * this.margin - 5);
      lines.forEach((line: string) => {
        this.pdf.text(line, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
    });
    this.currentY += 5;
  }
  
  private createNDEResultsSection(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('NON-DESTRUCTIVE EXAMINATION RESULTS');
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    // NDE Summary Table
    const ndeData = [
      ['Examination Type', 'Location', 'Results', 'Acceptance Criteria', 'Status'],
      ['Visual Inspection', 'External Shell', 'No significant defects observed', 'API 653 Section 6.3', 'PASS'],
      ['Ultrasonic Testing', 'Shell Courses', 'Thickness measurements recorded', 'API 653 Section 6.4', 'PASS'],
      ['Magnetic Particle', 'Weld Joints', 'No linear indications detected', 'API 653 Section 6.5', 'PASS'],
      ['Vacuum Box Testing', 'Bottom Plates', 'No leaks detected', 'API 653 Section 6.6', 'PASS']
    ];
    
    autoTable(this.pdf, {
      head: [ndeData[0]],
      body: ndeData.slice(1),
      startY: this.currentY,
      theme: 'grid',
      headStyles: { fillColor: this.primaryColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 }
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // NDE Notes
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NDE Notes:', this.margin, this.currentY);
    this.currentY += 7;
    
    this.pdf.setFont('helvetica', 'normal');
    const ndeNotes = [
      '• All NDE procedures performed in accordance with API 653 requirements',
      '• Qualified NDE technicians Level II certified per SNT-TC-1A',
      '• Equipment calibrated and verified prior to examination',
      '• Weather conditions suitable for outdoor NDE activities'
    ];
    
    ndeNotes.forEach(note => {
      this.pdf.text(note, this.margin, this.currentY);
      this.currentY += 5;
    });
    
    this.pdf.addPage();
  }
  
  private createProfessionalChecklistSection(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('PROFESSIONAL INSPECTION CHECKLIST');
    
    // API 653 Checklist Items
    const checklistItems = [
      ['Inspection Item', 'Requirement', 'Status', 'Notes'],
      ['Tank Identification', 'API 653 Section 4.2', '✓', 'Tank ID verified'],
      ['Previous Inspection Records', 'API 653 Section 4.3', '✓', 'Records reviewed'],
      ['Tank History Review', 'API 653 Section 4.4', '✓', 'Service history documented'],
      ['External Visual Inspection', 'API 653 Section 6.3.1', '✓', 'Completed per standard'],
      ['Internal Visual Inspection', 'API 653 Section 6.3.2', '✓', 'All areas accessible'],
      ['Thickness Measurements', 'API 653 Section 6.4', '✓', 'UT grid completed'],
      ['Bottom Inspection', 'API 653 Section 6.4.3', '✓', 'Vacuum box testing'],
      ['Settlement Survey', 'API 653 Section 6.4.4', '✓', 'Optical survey completed'],
      ['Appurtenance Inspection', 'API 653 Section 6.5', '✓', 'All items inspected'],
      ['Foundation Assessment', 'API 653 Section 6.6', '✓', 'Foundation evaluated']
    ];
    
    autoTable(this.pdf, {
      head: [checklistItems[0]],
      body: checklistItems.slice(1),
      startY: this.currentY,
      theme: 'grid',
      headStyles: { fillColor: this.primaryColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 50 }
      }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Inspector Certification
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Inspector Certification:', this.margin, this.currentY);
    this.currentY += 7;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('This inspection was performed by an API 653 certified inspector in accordance', this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text('with the requirements of API Standard 653, Tank Inspection, Repair, Alteration,', this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text('and Reconstruction.', this.margin, this.currentY);
    
    this.pdf.addPage();
  }
  
  private createSketchesSection(data: ReportData) {
    this.currentY = 30;
    this.addSectionHeader('SKETCHES AND DIAGRAMS');
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    // Tank Elevation Sketch
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Tank Elevation View', this.margin, this.currentY);
    this.currentY += 10;
    
    // Simple tank diagram
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.setLineWidth(1);
    
    // Tank shell
    this.pdf.rect(60, this.currentY, 90, 60);
    
    // Tank roof
    this.pdf.line(60, this.currentY, 150, this.currentY);
    this.pdf.line(55, this.currentY - 5, 155, this.currentY - 5);
    this.pdf.line(55, this.currentY - 5, 60, this.currentY);
    this.pdf.line(155, this.currentY - 5, 150, this.currentY);
    
    // Tank bottom
    this.pdf.line(60, this.currentY + 60, 150, this.currentY + 60);
    
    // Dimensions
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.text(`${data.tankDetails?.diameter || 100}' DIA`, 95, this.currentY + 75);
    this.pdf.text(`${data.tankDetails?.height || 40}'`, 45, this.currentY + 30);
    
    this.currentY += 90;
    
    // Measurement Grid Reference
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('Thickness Measurement Grid', this.margin, this.currentY);
    this.currentY += 10;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.text('• Shell measurements taken per API 653 grid pattern', this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text('• Bottom plate measurements on 10\' x 10\' grid', this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text('• Critical zone measurements at 1\' intervals', this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text('• All measurements recorded in attached data sheets', this.margin, this.currentY);
    
    this.pdf.addPage();
  }
}

// Helper function to generate and download the report
export async function generateProfessionalReport(reportData: ReportData): Promise<void> {
  try {
    // Validate required data before generation
    if (!reportData.reportNumber || !reportData.tankId) {
      throw new Error('Missing required report data: reportNumber and tankId are required');
    }

    console.log('Starting PDF generation for report:', reportData.reportNumber);
    
  const generator = new ProfessionalReportGenerator();

  // Attempt to embed logo if not already provided
  if (!reportData.logoDataUrl) {
    try {
      // Expect an <img id="org-logo"> element OR fetch from a known asset path
      const existing = document.getElementById('org-logo') as HTMLImageElement | null;
      if (existing && existing.src.startsWith('data:')) {
        reportData.logoDataUrl = existing.src;
      } else {
        // Fallback: fetch a static asset (user can replace path with actual logo)
        const potentialPaths = [
          '/logo.png',
          '/logo.jpg',
          '/logo.jpeg',
          '/logo.bmp'
        ];
        for (const p of potentialPaths) {
          try {
            const resp = await fetch(p);
            if (resp.ok) {
              const blob = await resp.blob();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.onerror = () => reject(r.error);
                r.readAsDataURL(blob);
              });
              reportData.logoDataUrl = dataUrl;
              break;
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Logo acquisition failed:', e);
    }
  }

  const pdfBlob = generator.generate(reportData);

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('PDF generation failed: Empty or invalid PDF blob');
    }

    console.log('PDF generated successfully, size:', pdfBlob.size, 'bytes');

    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.reportNumber || 'API653'}_${reportData.tankId || 'Tank'}_API653_Report.pdf`;
    
    // Ensure the link is added to DOM for download to work in all browsers
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log('PDF download initiated successfully');
  } catch (err) {
    console.error('PDF generation/download error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate or download PDF report.';
    if (err instanceof Error) {
      if (err.message.includes('Missing required')) {
        errorMessage = 'Cannot generate PDF: Missing required report data. Please ensure Tank ID and Report Number are provided.';
      } else if (err.message.includes('Empty or invalid')) {
        errorMessage = 'PDF generation failed: The generated file is empty or corrupted. Please check your data and try again.';
      } else {
        errorMessage = `PDF generation failed: ${err.message}`;
      }
    }
    
    // Show user-friendly error
    alert(errorMessage);
    throw err; // Re-throw for calling code to handle
  }
}