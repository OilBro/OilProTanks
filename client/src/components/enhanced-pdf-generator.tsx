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

export interface EnhancedReportData {
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

export function generateEnhancedPDF(data: EnhancedReportData): void {
  // Use the new professional PDF generator
  const professionalData = {
    report: data.report,
    measurements: data.measurements || [],
    checklists: data.checklists || [],
    appurtenanceInspections: data.appurtenanceInspections || [],
    repairRecommendations: data.repairRecommendations || [],
    ventingInspections: data.ventingInspections || [],
    attachments: data.attachments || [],
    shellCalculations: data.shellCalculations || null,
    settlementSurvey: data.settlementSurvey || null,
  };
  // TODO: Implement new PDF logic here
}

export function generateEnhancedPDFLegacy(data: EnhancedReportData): void {
  try {
    const doc = new jsPDF();
    const { 
      report, 
      measurements, 
      checklists, 
      appurtenanceInspections = [], 
      repairRecommendations = [], 
      ventingInspections = [], 
      attachments = [],
      shellCalculations,
      settlementSurvey,
      cmlData = []
    } = data;
    let yPosition = 20;
    const pageHeight = 280;
    const margin = 20;
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight) {
        doc.addPage();
        yPosition = 20;
      }
    };
    // Cover Page
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('API 653 TANK INSPECTION REPORT', 105, 60, { align: 'center' });
    doc.setFontSize(18);
    doc.text(report.tankId || 'N/A', 105, 80, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Service: ${(report.service || '').toUpperCase()}`, 105, 100, { align: 'center' });
    doc.text(`Report No: ${report.reportNumber || 'N/A'}`, 105, 115, { align: 'center' });
    doc.text(`Inspection Date: ${report.inspectionDate || 'N/A'}`, 105, 130, { align: 'center' });
    doc.text(`Inspector: ${report.inspector || 'N/A'}`, 105, 145, { align: 'center' });

    // Thickness Measurements Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('THICKNESS MEASUREMENTS', margin, yPosition);
    yPosition += 15;
    if (measurements.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const validMeasurements = measurements.filter(m => {
        const original = parseFloat(m.originalThickness || '0');
        const current = parseFloat(m.currentThickness || '0');
        return original > 0 && current > 0;
      });
      if (validMeasurements.length > 0) {
        const avgOriginal = validMeasurements.reduce((sum, m) => sum + parseFloat(m.originalThickness || '0'), 0) / validMeasurements.length;
        const avgCurrent = validMeasurements.reduce((sum, m) => sum + parseFloat(m.currentThickness || '0'), 0) / validMeasurements.length;
        const avgLoss = avgOriginal - avgCurrent;
        doc.text(`Average Original Thickness: ${avgOriginal.toFixed(3)} inches`, margin, yPosition);
        yPosition += 6;
        doc.text(`Average Current Thickness: ${avgCurrent.toFixed(3)} inches`, margin, yPosition);
        yPosition += 6;
        doc.text(`Average Thickness Loss: ${avgLoss.toFixed(3)} inches`, margin, yPosition);
        yPosition += 6;
        doc.text(`Total Valid Measurements: ${validMeasurements.length}`, margin, yPosition);
        yPosition += 6;
        // Critical findings
        const criticalCount = validMeasurements.filter(m => {
          const original = parseFloat(m.originalThickness || '0');
          const current = parseFloat(m.currentThickness || '0');
          return ((original - current) / original) * 100 > 50;
        }).length;
        const monitorCount = validMeasurements.filter(m => {
          const original = parseFloat(m.originalThickness || '0');
          const current = parseFloat(m.currentThickness || '0');
          const lossPercentage = ((original - current) / original) * 100;
          return lossPercentage > 25 && lossPercentage <= 50;
        }).length;
        doc.text(`Critical Locations: ${criticalCount}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Monitor Locations: ${monitorCount}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Acceptable Locations: ${validMeasurements.length - criticalCount - monitorCount}`, margin, yPosition);
      } else {
        doc.text('No valid thickness measurements found.', margin, yPosition);
      }
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No thickness measurements available for this report.', margin, yPosition);
    }
    yPosition += 20;

    // Appurtenance Inspections Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('APPURTENANCE INSPECTION RESULTS', margin, yPosition);
    yPosition += 15;
    if (appurtenanceInspections.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      appurtenanceInspections.forEach((inspection) => {
        checkPageBreak(25);
        doc.setFont('helvetica', 'bold');
        doc.text(`${(inspection.appurtenanceType || '').toUpperCase()}: ${inspection.appurtenanceId}`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Location: ${inspection.location}`, margin + 5, yPosition);
        doc.text(`Condition: ${(inspection.condition || '').toUpperCase()}`, margin + 100, yPosition);
        yPosition += 6;
        if (inspection.findings) {
          doc.text('Findings:', margin + 5, yPosition);
          yPosition += 4;
          const findingsLines = doc.splitTextToSize(inspection.findings, 160);
          doc.text(findingsLines, margin + 10, yPosition);
          yPosition += findingsLines.length * 4;
        }
        if (inspection.recommendations) {
          doc.text('Recommendations:', margin + 5, yPosition);
          yPosition += 4;
          const recLines = doc.splitTextToSize(inspection.recommendations, 160);
          doc.text(recLines, margin + 10, yPosition);
          yPosition += recLines.length * 4;
        }
        yPosition += 5;
      });
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No appurtenance inspections available for this report.', margin, yPosition);
      yPosition += 10;
    }

    // Repair Recommendations Section
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPAIR RECOMMENDATIONS', margin, yPosition);
    yPosition += 15;
    if (repairRecommendations.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const sortedRecommendations = [...repairRecommendations].sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, routine: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
      sortedRecommendations.forEach((rec, index) => {
        checkPageBreak(35);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${rec.component} - ${(rec.priority || '').toUpperCase()} PRIORITY`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Defect:', margin + 5, yPosition);
        yPosition += 4;
        const defectLines = doc.splitTextToSize(rec.defectDescription || '', 160);
        doc.text(defectLines, margin + 10, yPosition);
        yPosition += defectLines.length * 4 + 2;
        doc.text('Recommendation:', margin + 5, yPosition);
        yPosition += 4;
        const recLines = doc.splitTextToSize(rec.recommendation || '', 160);
        doc.text(recLines, margin + 10, yPosition);
        yPosition += recLines.length * 4 + 2;
        if (rec.apiReference) {
          doc.text(`API 653 Reference: ${rec.apiReference}`, margin + 5, yPosition);
          yPosition += 6;
        }
        yPosition += 8;
      });
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No repair recommendations available for this report.', margin, yPosition);
      yPosition += 10;
    }

    // Inspection Checklists Section
    if (checklists.length > 0) {
      doc.addPage();
      yPosition = 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INSPECTION CHECKLIST', margin, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      checklists.forEach((checklist, idx) => {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${checklist.category || 'Category'}: ${checklist.item || 'No item'}`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Checked: ${checklist.checked ? 'Yes' : 'No'}${checklist.notes ? ' | Notes: ' + checklist.notes : ''}`, margin + 5, yPosition);
        yPosition += 6;
        yPosition += 5;
      });
    } else {
      doc.addPage();
      yPosition = 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INSPECTION CHECKLIST', margin, yPosition);
      yPosition += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No inspection checklists available for this report.', margin, yPosition);
      yPosition += 10;
    }

    // Supporting Documentation Section
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPORTING DOCUMENTATION', margin, yPosition);
    yPosition += 15;
    if (attachments.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Attachments: ${attachments.length}`, margin, yPosition);
      yPosition += 10;
      const groupedAttachments = attachments.reduce((acc, att) => {
        const category = att.category || 'uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(att);
        return acc;
      }, {} as Record<string, typeof attachments>);
      Object.entries(groupedAttachments).forEach(([category, catAttachments]) => {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`${(category || '').replace('_', ' ').toUpperCase()} (${catAttachments.length}):`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        catAttachments.forEach((att) => {
          checkPageBreak(8);
          doc.text(`• ${att.filename} (${att.fileType})`, margin + 5, yPosition);
          yPosition += 4;
          if (att.description) {
            const descLines = doc.splitTextToSize(att.description, 150);
            doc.text(descLines, margin + 10, yPosition);
            yPosition += descLines.length * 4;
          }
          yPosition += 2;
        });
        yPosition += 5;
      });
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('No supporting documentation available for this report.', margin, yPosition);
      yPosition += 10;
    }

    // Cosine Curve Visual Section
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COSINE CURVE VISUAL', margin, yPosition);
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Draw axes
    doc.line(margin, yPosition + 50, margin + 180, yPosition + 50); // X axis
    doc.line(margin, yPosition + 10, margin, yPosition + 90); // Y axis
    // Plot cosine curve
    let prevX = margin;
    let prevY = yPosition + 50 - 40 * Math.cos(0);
    for (let deg = 0; deg <= 360; deg += 5) {
      const rad = deg * Math.PI / 180;
      const x = margin + (deg / 2);
      const y = yPosition + 50 - 40 * Math.cos(rad);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    doc.text('Y', margin - 5, yPosition + 10);
    doc.text('X', margin + 180, yPosition + 55);
    doc.text('Cosine Curve: y = cos(x)', margin, yPosition + 100);

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 285);
      doc.text(`Report: ${report.reportNumber}`, 105, 285, { align: 'center' });
    }
    doc.save(`${report.reportNumber}_API653_Complete_Report.pdf`);
    console.log('PDF generation completed successfully!');
  } catch (error) {
    console.error('PDF generation failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error; // Re-throw to let the calling function handle the error
  }
}