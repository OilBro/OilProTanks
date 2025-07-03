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

  // Helper function to check page break
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
  doc.setFont(undefined, 'bold');
  doc.text('API 653 TANK INSPECTION REPORT', 105, 60, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text(report.tankId, 105, 80, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text(`Service: ${report.service.toUpperCase()}`, 105, 100, { align: 'center' });
  doc.text(`Report No: ${report.reportNumber}`, 105, 115, { align: 'center' });
  doc.text(`Inspection Date: ${report.inspectionDate}`, 105, 130, { align: 'center' });
  doc.text(`Inspector: ${report.inspector}`, 105, 145, { align: 'center' });
  
  // Add certification statement
  doc.setFontSize(12);
  yPosition = 180;
  doc.text('CERTIFICATION', 105, yPosition, { align: 'center' });
  yPosition += 15;
  
  const certText = `I certify that this inspection was performed in accordance with API 653 requirements and that the information contained in this report accurately reflects the condition of the tank at the time of inspection.`;
  const certLines = doc.splitTextToSize(certText, 150);
  doc.text(certLines, 105, yPosition, { align: 'center' });
  
  yPosition += certLines.length * 5 + 20;
  doc.text('Inspector Signature: _________________________', 105, yPosition, { align: 'center' });
  yPosition += 10;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: 'center' });

  // Page 2 - Executive Summary
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('EXECUTIVE SUMMARY', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  
  // Tank Information Summary
  doc.setFont(undefined, 'bold');
  doc.text('TANK SPECIFICATIONS', margin, yPosition);
  yPosition += 10;
  doc.setFont(undefined, 'normal');
  
  const specs = [
    `Tank ID: ${report.tankId}`,
    `Service: ${report.service}`,
    `Diameter: ${report.diameter || 'N/A'} ft`,
    `Height: ${report.height || 'N/A'} ft`,
    `Original Thickness: ${report.originalThickness || 'N/A'} in`,
    `Years Since Last Inspection: ${report.yearsSinceLastInspection || 'N/A'}`
  ];
  
  specs.forEach(spec => {
    doc.text(spec, margin, yPosition);
    yPosition += 6;
  });
  
  yPosition += 10;
  
  // Critical Findings Summary
  const urgentRepairs = repairRecommendations.filter(r => r.priority === 'urgent');
  const failedVenting = ventingInspections.filter(v => v.condition === 'failed');
  const criticalMeasurements = measurements.filter(m => m.status === 'action_required');
  
  if (urgentRepairs.length > 0 || failedVenting.length > 0 || criticalMeasurements.length > 0) {
    doc.setFillColor(255, 240, 240);
    doc.rect(margin, yPosition, 170, 40, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text('CRITICAL FINDINGS - IMMEDIATE ATTENTION REQUIRED', margin + 5, yPosition + 8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    yPosition += 15;
    
    if (urgentRepairs.length > 0) {
      doc.text(`• ${urgentRepairs.length} urgent repair recommendation(s)`, margin + 5, yPosition);
      yPosition += 6;
    }
    if (failedVenting.length > 0) {
      doc.text(`• ${failedVenting.length} failed venting system component(s)`, margin + 5, yPosition);
      yPosition += 6;
    }
    if (criticalMeasurements.length > 0) {
      doc.text(`• ${criticalMeasurements.length} thickness measurement(s) require action`, margin + 5, yPosition);
      yPosition += 6;
    }
    yPosition += 10;
  }
  
  // Inspection Overview
  doc.setFont(undefined, 'bold');
  doc.text('INSPECTION OVERVIEW', margin, yPosition);
  yPosition += 10;
  doc.setFont(undefined, 'normal');
  
  const overview = [
    `Total Thickness Measurements: ${measurements.length}`,
    `Appurtenance Inspections: ${appurtenanceInspections.length}`,
    `Venting System Components: ${ventingInspections.length}`,
    `Repair Recommendations: ${repairRecommendations.length}`,
    `Supporting Documents: ${attachments.length}`
  ];
  
  overview.forEach(item => {
    doc.text(item, margin, yPosition);
    yPosition += 6;
  });

  // Page 3+ - Detailed Sections
  
  // Thickness Measurements Section
  if (measurements.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('THICKNESS MEASUREMENT RESULTS', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Table header
    doc.setFont(undefined, 'bold');
    doc.text('Component', margin, yPosition);
    doc.text('Location', margin + 40, yPosition);
    doc.text('Type', margin + 80, yPosition);
    doc.text('Original', margin + 110, yPosition);
    doc.text('Current', margin + 135, yPosition);
    doc.text('Loss', margin + 160, yPosition);
    doc.text('Status', margin + 180, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    measurements.forEach((measurement) => {
      checkPageBreak(8);
      
      const loss = parseFloat(measurement.originalThickness) - parseFloat(measurement.currentThickness.toString());
      
      doc.text(measurement.component.substring(0, 15), margin, yPosition);
      doc.text(measurement.location.substring(0, 15), margin + 40, yPosition);
      doc.text(measurement.measurementType.substring(0, 8), margin + 80, yPosition);
      doc.text(measurement.originalThickness + '"', margin + 110, yPosition);
      doc.text(measurement.currentThickness.toString() + '"', margin + 135, yPosition);
      doc.text(loss.toFixed(3) + '"', margin + 160, yPosition);
      doc.text(measurement.status, margin + 180, yPosition);
      yPosition += 6;
    });
  }
  
  // Appurtenance Inspections
  if (appurtenanceInspections.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('APPURTENANCE INSPECTION RESULTS', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    appurtenanceInspections.forEach((inspection) => {
      checkPageBreak(25);
      
      doc.setFont(undefined, 'bold');
      doc.text(`${inspection.appurtenanceType.toUpperCase()}: ${inspection.appurtenanceId}`, margin, yPosition);
      yPosition += 6;
      
      doc.setFont(undefined, 'normal');
      doc.text(`Location: ${inspection.location}`, margin + 5, yPosition);
      doc.text(`Condition: ${inspection.condition.toUpperCase()}`, margin + 100, yPosition);
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
  }
  
  // Repair Recommendations
  if (repairRecommendations.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('REPAIR RECOMMENDATIONS', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Sort by priority
    const sortedRecommendations = [...repairRecommendations].sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, routine: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
    
    sortedRecommendations.forEach((rec, index) => {
      checkPageBreak(35);
      
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${rec.component} - ${rec.priority.toUpperCase()} PRIORITY`, margin, yPosition);
      yPosition += 6;
      
      doc.setFont(undefined, 'normal');
      doc.text('Defect:', margin + 5, yPosition);
      yPosition += 4;
      const defectLines = doc.splitTextToSize(rec.defectDescription, 160);
      doc.text(defectLines, margin + 10, yPosition);
      yPosition += defectLines.length * 4 + 2;
      
      doc.text('Recommendation:', margin + 5, yPosition);
      yPosition += 4;
      const recLines = doc.splitTextToSize(rec.recommendation, 160);
      doc.text(recLines, margin + 10, yPosition);
      yPosition += recLines.length * 4 + 2;
      
      if (rec.apiReference) {
        doc.text(`API 653 Reference: ${rec.apiReference}`, margin + 5, yPosition);
        yPosition += 6;
      }
      
      yPosition += 8;
    });
  }
  
  // Inspection Checklists
  if (checklists.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('INSPECTION CHECKLIST', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const externalItems = checklists.filter(item => item.category === 'external');
    const internalItems = checklists.filter(item => item.category === 'internal');
    
    if (externalItems.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('EXTERNAL INSPECTION:', margin, yPosition);
      yPosition += 8;
      doc.setFont(undefined, 'normal');
      
      externalItems.forEach((item) => {
        checkPageBreak(6);
        doc.text(`${item.checked ? '☑' : '☐'} ${item.item}`, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }
    
    if (internalItems.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('INTERNAL INSPECTION:', margin, yPosition);
      yPosition += 8;
      doc.setFont(undefined, 'normal');
      
      internalItems.forEach((item) => {
        checkPageBreak(6);
        doc.text(`${item.checked ? '☑' : '☐'} ${item.item}`, margin + 5, yPosition);
        yPosition += 6;
      });
    }
  }
  
  // Supporting Documentation
  if (attachments.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('SUPPORTING DOCUMENTATION', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    doc.text(`Total Attachments: ${attachments.length}`, margin, yPosition);
    yPosition += 10;
    
    const groupedAttachments = attachments.reduce((acc, att) => {
      if (!acc[att.category]) acc[att.category] = [];
      acc[att.category].push(att);
      return acc;
    }, {} as Record<string, typeof attachments>);
    
    Object.entries(groupedAttachments).forEach(([category, catAttachments]) => {
      checkPageBreak(15);
      
      doc.setFont(undefined, 'bold');
      doc.text(`${category.replace('_', ' ').toUpperCase()} (${catAttachments.length}):`, margin, yPosition);
      yPosition += 6;
      doc.setFont(undefined, 'normal');
      
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
  }
  
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
}