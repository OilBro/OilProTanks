import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface ReportData {
  // Basic Information
  reportNumber: string;
  tankId: string;
  facilityName: string;
  location: string;
  inspectionDate: string;
  inspector: string;
  reviewedBy?: string;
  
  // Tank Details
  tankDetails: {
    diameter: number;
    height: number;
    capacity: number;
    product: string;
    yearBuilt: number;
    lastInspection?: string;
    designCode: string;
    material: string;
  };
  
  // Shell Calculations
  shellData: {
    courses: Array<{
      courseNumber: number;
      height: number;
      nominalThickness: number;
      measuredThickness: number;
      requiredThickness: number;
      corrosionRate: number;
      remainingLife: number;
      status: string;
    }>;
    governingCourse: number;
    overallStatus: string;
  };
  
  // Bottom Data
  bottomData: {
    nominalThickness: number;
    minMeasured: number;
    requiredThickness: number;
    corrosionRate: number;
    remainingLife: number;
    mriDate?: string;
  };
  
  // Settlement Data
  settlementData?: {
    measurements: Array<{
      point: number;
      angle: number;
      elevation: number;
      cosineFit?: number;
    }>;
    amplitude: number;
    phase: number;
    rSquared: number;
    maxSettlement: number;
    allowableSettlement: number;
    acceptance: string;
  };
  
  // CML Data
  cmlData?: Array<{
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
  }>;
  
  // Findings
  findings?: {
    executive: string;
    critical: string[];
    major: string[];
    minor: string[];
    recommendations: string[];
    nextInspectionDate: string;
  };
}

export class ProfessionalReportGenerator {
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
  
  generateReport(data: ReportData): Blob {
    // Cover Page
    this.createCoverPage(data);
    
    // Table of Contents
    this.createTableOfContents();
    
    // Executive Summary
    this.createExecutiveSummary(data);
    
    // Tank Information
    this.createTankInformation(data);
    
    // Shell Calculations Section
    this.createShellCalculationsSection(data);
    
    // Bottom Assessment Section
    this.createBottomAssessmentSection(data);
    
    // Settlement Analysis Section
    if (data.settlementData) {
      this.createSettlementSection(data.settlementData);
    }
    
    // CML Analysis Section
    if (data.cmlData && data.cmlData.length > 0) {
      this.createCMLSection(data.cmlData);
    }
    
    // Findings and Recommendations
    if (data.findings) {
      this.createFindingsSection(data.findings);
    }
    
    // Appendices
    this.createAppendices(data);
    
    // Add page numbers
    this.addPageNumbers();
    
    return this.pdf.output('blob');
  }
  
  private createCoverPage(data: ReportData) {
    // Background gradient effect (simulated with rectangles)
    this.pdf.setFillColor(...this.primaryColor);
    this.pdf.rect(0, 0, this.pageWidth, 100, 'F');
    
    // Company Logo area (placeholder)
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('OILPRO TANKS', this.pageWidth / 2, 30, { align: 'center' });
    
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Professional Tank Inspection Services', this.pageWidth / 2, 40, { align: 'center' });
    
    // Report Title
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(28);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('API 653 INSPECTION REPORT', this.pageWidth / 2, 130, { align: 'center' });
    
    // Tank ID Box
    this.pdf.setDrawColor(...this.primaryColor);
    this.pdf.setLineWidth(2);
    this.pdf.rect(40, 150, 130, 40);
    
    this.pdf.setFontSize(16);
    this.pdf.text('Tank ID: ' + data.tankId, this.pageWidth / 2, 165, { align: 'center' });
    this.pdf.setFontSize(14);
    this.pdf.text('Report No: ' + data.reportNumber, this.pageWidth / 2, 175, { align: 'center' });
    this.pdf.text('Date: ' + data.inspectionDate, this.pageWidth / 2, 185, { align: 'center' });
    
    // Inspector Information
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Inspected By:', 40, 220);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(data.inspector, 70, 220);
    
    if (data.reviewedBy) {
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Reviewed By:', 40, 230);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(data.reviewedBy, 70, 230);
    }
    
    // Footer
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text('This report complies with API 653 standards', this.pageWidth / 2, 270, { align: 'center' });
    
    this.pdf.addPage();
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
    
    this.pdf.autoTable({
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
    
    this.pdf.autoTable({
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
    
    this.pdf.autoTable({
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
    
    // Settlement Summary
    const summaryData = [
      ['Parameter', 'Value', 'Limit', 'Status'],
      ['Peak-to-Peak Settlement', `${(settlementData.amplitude * 2).toFixed(3)} ft`, `${settlementData.allowableSettlement.toFixed(3)} ft`, settlementData.acceptance],
      ['Cosine Amplitude', `${settlementData.amplitude.toFixed(4)} ft`, '-', '-'],
      ['Phase Angle', `${settlementData.phase.toFixed(1)}°`, '-', '-'],
      ['R² Value', settlementData.rSquared.toFixed(4), '≥ 0.90', settlementData.rSquared >= 0.9 ? 'OK' : 'WARNING'],
      ['Max Out-of-Plane', `${settlementData.maxSettlement.toFixed(4)} ft`, '-', '-']
    ];
    
    this.pdf.autoTable({
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      }
    });
    
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
      
      this.pdf.autoTable({
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
    
    this.pdf.autoTable({
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
  
  private addPageNumbers() {
    const pageCount = this.pdf.getNumberOfPages();
    
    for (let i = 2; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text(`Page ${i - 1} of ${pageCount - 1}`, this.pageWidth - 30, this.pageHeight - 10);
      
      // Add footer line
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
    }
  }
}

// Helper function to generate and download the report
export async function generateProfessionalReport(reportData: ReportData): Promise<void> {
  const generator = new ProfessionalReportGenerator();
  const pdfBlob = generator.generateReport(reportData);
  
  // Create download link
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportData.reportNumber}_${reportData.tankId}_API653_Report.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}