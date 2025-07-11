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
    measurements: data.measurements,
    checklists: data.checklists,
    appurtenanceInspections: data.appurtenanceInspections,
    repairRecommendations: data.repairRecommendations,
    ventingInspections: data.ventingInspections,
    attachments: data.attachments,
    shellCalculations: data.shellCalculations,
    settlementSurvey: data.settlementSurvey,
    cmlData: data.cmlData
  };
  
  // Import and use the professional generator
  import('./professional-pdf-generator').then(({ generateProfessionalPDF }) => {
    generateProfessionalPDF(professionalData);
  }).catch(error => {
    console.error('Error loading professional PDF generator:', error);
    // Fallback to legacy generator
    generateEnhancedPDFLegacy(data);
  });
  
  return;
}

export function generateEnhancedPDFLegacy(data: EnhancedReportData): void {
  console.log('Starting PDF generation...');
  console.log('Report data:', data.report);
  console.log('Measurements count:', data.measurements.length);
  console.log('Checklists count:', data.checklists.length);
  
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
  doc.text(`Service: ${(report.service || '').toUpperCase()}`, 105, 100, { align: 'center' });
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
    `Diameter: ${report.diameter || 'TBD'} ft`,
    `Height: ${report.height || 'TBD'} ft`,
    `Original Thickness: ${report.originalThickness || 'TBD'} in`,
    `Years Since Last Inspection: ${report.yearsSinceLastInspection || 'TBD'}`,
    `Inspector: ${report.inspector || 'TBD'}`,
    `Inspection Date: ${report.inspectionDate || 'TBD'}`,
    `Report Number: ${report.reportNumber || 'TBD'}`,
    `Total Measurements: ${measurements.length}`,
    `Total Checklist Items: ${checklists.length}`
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
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Measurements: ${measurements.length}`, margin, yPosition);
    yPosition += 10;
    
    // Group measurements by component
    const componentGroups = measurements.reduce((groups, measurement) => {
      const component = measurement.component || 'Unknown';
      if (!groups[component]) {
        groups[component] = [];
      }
      groups[component].push(measurement);
      return groups;
    }, {} as Record<string, any[]>);
    
    Object.keys(componentGroups).forEach(componentName => {
      const componentMeasurements = componentGroups[componentName];
      
      checkPageBreak(20);
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`${(componentName || '').toUpperCase()} MEASUREMENTS (${componentMeasurements.length})`, margin, yPosition);
      yPosition += 10;
      
      // Table header
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Location', margin, yPosition);
      doc.text('Original (in)', margin + 50, yPosition);
      doc.text('Current (in)', margin + 90, yPosition);
      doc.text('Loss (in)', margin + 130, yPosition);
      doc.text('Status', margin + 170, yPosition);
      yPosition += 8;
      
      // Draw header line
      doc.line(margin, yPosition - 2, margin + 200, yPosition - 2);
      yPosition += 3;
      
      doc.setFont(undefined, 'normal');
      componentMeasurements.forEach((measurement, index) => {
        checkPageBreak(8);
        
        const originalThickness = parseFloat(measurement.originalThickness || '0') || 0;
        const currentThickness = parseFloat(measurement.currentThickness || '0') || 0;
        const thicknessLoss = originalThickness > 0 ? (originalThickness - currentThickness) : 0;
        
        // Determine status based on thickness loss
        let status = 'Acceptable';
        if (originalThickness > 0 && currentThickness > 0) {
          const lossPercentage = (thicknessLoss / originalThickness) * 100;
          if (lossPercentage > 50) {
            status = 'Critical';
          } else if (lossPercentage > 25) {
            status = 'Monitor';
          }
        }
        
        // Format the data
        const locationText = (measurement.location || `Point ${index + 1}`).substring(0, 20);
        const originalText = originalThickness > 0 ? originalThickness.toFixed(3) : 'N/A';
        const currentText = currentThickness > 0 ? currentThickness.toFixed(3) : 'N/A';
        const lossText = thicknessLoss > 0 ? thicknessLoss.toFixed(3) : 'N/A';
        
        doc.text(locationText, margin, yPosition);
        doc.text(originalText, margin + 50, yPosition);
        doc.text(currentText, margin + 90, yPosition);
        doc.text(lossText, margin + 130, yPosition);
        doc.text(status, margin + 170, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10; // Space between components
    });
    
    // Add summary statistics
    checkPageBreak(30);
    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('MEASUREMENT SUMMARY', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
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
    // Add a note if no measurements
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('THICKNESS MEASUREMENTS', margin, yPosition);
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('No thickness measurements available for this report.', margin, yPosition);
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
      doc.text(`${(inspection.appurtenanceType || '').toUpperCase()}: ${inspection.appurtenanceId}`, margin, yPosition);
      yPosition += 6;
      
      doc.setFont(undefined, 'normal');
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
      doc.text(`${index + 1}. ${rec.component} - ${(rec.priority || '').toUpperCase()} PRIORITY`, margin, yPosition);
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
      doc.text(`${(category || '').replace('_', ' ').toUpperCase()} (${catAttachments.length}):`, margin, yPosition);
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
  console.log('PDF generation completed successfully!');
  
  } catch (error) {
    console.error('PDF generation failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error; // Re-throw to let the calling function handle the error
  }
}