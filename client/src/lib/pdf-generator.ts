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

export interface ReportData {
  report: InspectionReport;
  measurements: ThicknessMeasurement[];
  checklists: InspectionChecklist[];
  appurtenanceInspections?: AppurtenanceInspection[];
  repairRecommendations?: RepairRecommendation[];
  ventingInspections?: VentingSystemInspection[];
  attachments?: ReportAttachment[];
}

export function generatePDF(data: ReportData): void {
  const doc = new jsPDF();
  const { report, measurements, checklists, appurtenanceInspections = [], repairRecommendations = [], ventingInspections = [], attachments = [] } = data;
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.text('API 653 TANK INSPECTION REPORT', 105, yPosition, { align: 'center' });
  yPosition += 15;

  // Report Summary Box
  doc.setDrawColor(0, 0, 0);
  doc.rect(15, yPosition, 180, 30);
  doc.setFontSize(10);
  doc.text(`Report No: ${report.reportNumber}`, 20, yPosition + 8);
  doc.text(`Tank ID: ${report.tankId}`, 20, yPosition + 16);
  doc.text(`Service: ${report.service.toUpperCase()}`, 20, yPosition + 24);
  doc.text(`Date: ${report.inspectionDate}`, 120, yPosition + 8);
  doc.text(`Inspector: ${report.inspector}`, 120, yPosition + 16);
  doc.text(`Status: ${report.status.toUpperCase()}`, 120, yPosition + 24);
  yPosition += 40;

  // Tank Specifications
  doc.setFontSize(14);
  doc.text('TANK SPECIFICATIONS', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(10);
  doc.text(`Diameter: ${report.diameter || 'N/A'} ft`, 20, yPosition);
  doc.text(`Height: ${report.height || 'N/A'} ft`, 70, yPosition);
  doc.text(`Original Thickness: ${report.originalThickness || 'N/A'} in`, 120, yPosition);
  yPosition += 8;
  doc.text(`Years Since Last Inspection: ${report.yearsSinceLastInspection || 'N/A'}`, 20, yPosition);
  yPosition += 15;
  doc.text(`Height: ${report.height || 'N/A'} ft`, 20, 125);
  doc.text(`Original Thickness: ${report.originalThickness || 'N/A'} in`, 20, 135);

  // Inspection Summary
  const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
  const monitorCount = measurements.filter(m => m.status === 'monitor').length;
  const actionCount = measurements.filter(m => m.status === 'action_required').length;

  doc.setFontSize(12);
  doc.text('INSPECTION SUMMARY', 20, 155);
  doc.setFontSize(10);
  doc.text(`Acceptable: ${acceptableCount}`, 20, 170);
  doc.text(`Monitor: ${monitorCount}`, 70, 170);
  doc.text(`Action Required: ${actionCount}`, 120, 170);

  // Thickness Measurements Table
  if (measurements.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('THICKNESS MEASUREMENTS', 20, 20);

    let yPos = 40;
    doc.setFontSize(8);
    
    // Table headers
    doc.text('Component', 20, yPos);
    doc.text('Location', 60, yPos);
    doc.text('Current (in)', 100, yPos);
    doc.text('Corr Rate', 130, yPos);
    doc.text('Remaining Life', 160, yPos);
    doc.text('Status', 190, yPos);
    
    yPos += 10;
    doc.line(20, yPos, 200, yPos); // Header underline
    yPos += 5;

    measurements.forEach((measurement) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(measurement.component || '', 20, yPos);
      doc.text(measurement.location || '', 60, yPos);
      doc.text(String(measurement.currentThickness || ''), 100, yPos);
      doc.text(`${measurement.corrosionRate || ''} in/yr`, 130, yPos);
      doc.text(`${measurement.remainingLife || ''} yrs`, 160, yPos);
      doc.text(measurement.status || '', 190, yPos);
      yPos += 8;
    });
  }

  // Inspection Checklist
  if (checklists.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text('INSPECTION CHECKLIST', 20, 20);

    let yPos = 40;
    doc.setFontSize(10);

    const externalItems = checklists.filter(item => item.category === 'external');
    const internalItems = checklists.filter(item => item.category === 'internal');

    if (externalItems.length > 0) {
      doc.text('External Inspection:', 20, yPos);
      yPos += 10;

      externalItems.forEach((item) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const checkMark = item.checked ? '☑' : '☐';
        doc.text(`${checkMark} ${item.item}`, 25, yPos);
        yPos += 8;
      });
      yPos += 5;
    }

    if (internalItems.length > 0) {
      doc.text('Internal Inspection:', 20, yPos);
      yPos += 10;

      internalItems.forEach((item) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const checkMark = item.checked ? '☑' : '☐';
        doc.text(`${checkMark} ${item.item}`, 25, yPos);
        yPos += 8;
      });
    }
  }

  // Save the PDF
  doc.save(`${report.reportNumber}_inspection_report.pdf`);
}
