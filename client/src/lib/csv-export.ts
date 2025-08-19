import type { InspectionReport } from '@shared/schema';

interface ExportData {
  report: InspectionReport;
  measurements?: any[];
  checklists?: any[];
  appurtenanceInspections?: any[];
  repairRecommendations?: any[];
  ventingInspections?: any[];
  attachments?: any[];
  settlementSurveys?: any[];
}

// Convert null/undefined to empty string for CSV
const val = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// Export single report as detailed CSV with all related data
export function exportDetailedCSV(data: ExportData): void {
  const { report, measurements = [], checklists = [], appurtenanceInspections = [], 
          repairRecommendations = [], ventingInspections = [], attachments = [], 
          settlementSurveys = [] } = data;

  // Create comprehensive CSV with all data
  let csv = '';

  // Report Header Section
  csv += 'API 653 TANK INSPECTION REPORT\n';
  csv += '================================\n\n';
  
  // Basic Report Information
  csv += 'REPORT INFORMATION\n';
  csv += 'Report Number,Tank ID,Service,Inspector,Inspection Date,Status\n';
  csv += `${val(report.reportNumber)},${val(report.tankId)},${val(report.service)},${val(report.inspector)},${val(report.inspectionDate)},${val(report.status)}\n\n`;
  
  // Tank Specifications
  csv += 'TANK SPECIFICATIONS\n';
  csv += 'Diameter (ft),Height (ft),Capacity (gal),Original Thickness (in),Years Since Last Inspection,Construction Standard,Shell Material,Roof Type,Foundation Type\n';
  csv += `${val(report.diameter)},${val(report.height)},${val(report.capacity)},${val(report.originalThickness)},${val(report.yearsSinceLastInspection)},${val(report.constructionStandard)},${val(report.shellMaterial)},${val(report.roofType)},${val(report.foundationType)}\n\n`;
  
  // Thickness Measurements
  if (measurements.length > 0) {
    csv += 'THICKNESS MEASUREMENTS\n';
    csv += 'Component,Location,Type,Current Thickness (in),Original Thickness (in),Corrosion Rate (in/yr),Remaining Life (years),Status,Elevation (ft),Inspection Date\n';
    measurements.forEach(m => {
      csv += `${val(m.component)},${val(m.location)},${val(m.measurementType)},${val(m.currentThickness)},${val(m.originalThickness)},${val(m.corrosionRate)},${val(m.remainingLife)},${val(m.status)},${val(m.elevation)},${val(m.inspectionDate)}\n`;
    });
    csv += '\n';
  }
  
  // Inspection Checklist
  if (checklists.length > 0) {
    csv += 'INSPECTION CHECKLIST\n';
    csv += 'Category,Item,Checked,Notes\n';
    checklists.forEach(c => {
      csv += `${val(c.category)},${val(c.item)},${c.checked ? 'Yes' : 'No'},${val(c.notes)}\n`;
    });
    csv += '\n';
  }
  
  // Appurtenance Inspections
  if (appurtenanceInspections.length > 0) {
    csv += 'APPURTENANCE INSPECTIONS\n';
    csv += 'Component,Type,Size,Material,Condition,Recommendations,Notes\n';
    appurtenanceInspections.forEach(a => {
      csv += `${val(a.component)},${val(a.type)},${val(a.size)},${val(a.material)},${val(a.condition)},${val(a.recommendations)},${val(a.notes)}\n`;
    });
    csv += '\n';
  }
  
  // Repair Recommendations
  if (repairRecommendations.length > 0) {
    csv += 'REPAIR RECOMMENDATIONS\n';
    csv += 'Priority,Component,Description,Timeline,Estimated Cost,Notes\n';
    repairRecommendations.forEach(r => {
      csv += `${val(r.priority)},${val(r.component)},${val(r.description)},${val(r.timeline)},${val(r.estimatedCost)},${val(r.notes)}\n`;
    });
    csv += '\n';
  }
  
  // Venting System Inspections
  if (ventingInspections.length > 0) {
    csv += 'VENTING SYSTEM INSPECTIONS\n';
    csv += 'Component,Type,Size,Condition,Test Result,Recommendations,Notes\n';
    ventingInspections.forEach(v => {
      csv += `${val(v.component)},${val(v.type)},${val(v.size)},${val(v.condition)},${val(v.testResult)},${val(v.recommendations)},${val(v.notes)}\n`;
    });
    csv += '\n';
  }
  
  // Settlement Survey Data
  if (settlementSurveys.length > 0) {
    csv += 'SETTLEMENT SURVEY DATA\n';
    csv += 'Survey Date,Reference Elevation,Max Differential Settlement,Analysis Method,Notes\n';
    settlementSurveys.forEach(s => {
      csv += `${val(s.surveyDate)},${val(s.referenceElevation)},${val(s.maxDifferentialSettlement)},${val(s.analysisMethod)},${val(s.notes)}\n`;
    });
    csv += '\n';
  }
  
  // Attachments List
  if (attachments.length > 0) {
    csv += 'ATTACHMENTS\n';
    csv += 'Filename,Type,Description,Upload Date\n';
    attachments.forEach(att => {
      csv += `${val(att.filename)},${val(att.type)},${val(att.description)},${val(att.uploadDate)}\n`;
    });
    csv += '\n';
  }
  
  // Summary Section
  csv += 'INSPECTION SUMMARY\n';
  const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
  const monitorCount = measurements.filter(m => m.status === 'monitor').length;
  const actionCount = measurements.filter(m => m.status === 'action_required').length;
  csv += 'Total Measurements,Acceptable,Monitor,Action Required\n';
  csv += `${measurements.length},${acceptableCount},${monitorCount},${actionCount}\n\n`;
  
  // Add metadata
  csv += 'EXPORT INFORMATION\n';
  csv += `Export Date,${new Date().toISOString()}\n`;
  csv += `Report Generated By,OilPro Tanks API 653 Inspector\n`;
  
  // Download the CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${report.reportNumber}_inspection_report.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export multiple reports as summary CSV (flat format)
export function exportSummaryCSV(reports: InspectionReport[]): void {
  if (reports.length === 0) return;
  
  // Create CSV header
  let csv = 'Report Number,Tank ID,Service,Inspector,Inspection Date,Status,Diameter (ft),Height (ft),Capacity (gal),Original Thickness (in),Years Since Last,Construction Standard,Shell Material,Roof Type,Foundation Type,Created Date,Updated Date\n';
  
  // Add each report as a row
  reports.forEach(report => {
    csv += `${val(report.reportNumber)},${val(report.tankId)},${val(report.service)},${val(report.inspector)},${val(report.inspectionDate)},${val(report.status)},${val(report.diameter)},${val(report.height)},${val(report.capacity)},${val(report.originalThickness)},${val(report.yearsSinceLastInspection)},${val(report.constructionStandard)},${val(report.shellMaterial)},${val(report.roofType)},${val(report.foundationType)},${val(report.createdAt)},${val(report.updatedAt)}\n`;
  });
  
  // Download the CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `inspection_reports_summary_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export thickness measurements only
export function exportMeasurementsCSV(measurements: any[], reportNumber?: string): void {
  if (measurements.length === 0) return;
  
  // Create CSV with headers
  let csv = 'Component,Location,Type,Current Thickness,Original Thickness,Corrosion Rate,Remaining Life,Status,Elevation,Inspection Date\n';
  
  measurements.forEach(m => {
    csv += `${val(m.component)},${val(m.location)},${val(m.measurementType)},${val(m.currentThickness)},${val(m.originalThickness)},${val(m.corrosionRate)},${val(m.remainingLife)},${val(m.status)},${val(m.elevation)},${val(m.inspectionDate)}\n`;
  });
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${reportNumber || 'thickness'}_measurements.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}