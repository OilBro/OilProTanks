import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { storage } from './storage.ts';
import {
  analyzeShellCourse,
  calculateTankInspectionIntervals,
  calculateMinimumRequiredThickness,
  calculateCorrosionRate,
  calculateRemainingLife,
  determineInspectionStatus,
  calculateNextInspectionInterval,
  type ShellCourseData,
  type ThicknessCalculation
} from './api653-calculations.ts';
import {
  calculateTMin,
  calculateCorrosionRates,
  calculateRemainingLife as calculateRemainingLifeEnhanced,
  determineStatus,
  performAPI653Evaluation,
  type KPIMetrics,
  type TankParameters,
  type ComponentThickness,
  type CalculationResults
} from './api653-calculator.ts';
import type { 
  InspectionReport,
  ThicknessMeasurement,
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  AdvancedSettlementSurvey,
  AdvancedSettlementMeasurement
} from '../shared/schema.ts';

// Extend jsPDF with autoTable types and missing methods
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable?: any;
    setLineDash?: (segments: number[], phase?: number) => void;
    getNumberOfPages(): number;
    setPage(page: number): void;
    internal?: {
      pageSize?: {
        getWidth?(): number;
        getHeight?(): number;
        width?: number;
        height?: number;
      };
      scaleFactor?: number;
      events?: any;
      pages?: number[];
      getEncryptor?(objectId: number): (data: string) => string;
    };
  }
}

// Extended types to handle calculated fields
interface ExtendedThicknessMeasurement extends ThicknessMeasurement {
  minRequiredThickness?: number;
}

interface ExtendedInspectionChecklist extends InspectionChecklist {
  severity?: string;
}

interface ExtendedAppurtenanceInspection extends AppurtenanceInspection {
  component?: string;
  action?: string;
  severity?: string;
  notes?: string;
}

interface ExtendedVentingSystemInspection extends VentingSystemInspection {
  component?: string;
  type?: string;
  size?: string;
  operationalStatus?: string;
  notes?: string;
}

interface ExtendedAdvancedSettlementSurvey extends AdvancedSettlementSurvey {
  surveyMethod?: string;
  measurementType?: string;
  referenceDatum?: string;
  settlementRecommendations?: string;
  measurements?: AdvancedSettlementMeasurement[];
  calculatedTilt?: number;
  uniformSettlement?: number;
}

interface ExtendedRepairRecommendation extends RepairRecommendation {
  timing?: string;
  estimatedCost?: number;
}

// Placeholder types for features not yet in schema
interface SecondaryContainment {
  dikeType?: string;
  dikeHeight?: number;
  dikeCapacity?: number;
  dikeCondition?: string;
  linerType?: string;
  linerCondition?: string;
  drainageSystem?: string;
  drainValvesSealed?: boolean;
}

interface NdeTestLocation {
  location?: string;
  testType?: string;
  extent?: string;
  findings?: string;
  followUp?: string;
}

interface VisualDocumentation {
  imageUrl?: string;
  description?: string;
  location?: string;
}

interface ReportData {
  report: InspectionReport;
  measurements: ExtendedThicknessMeasurement[];
  checklists: ExtendedInspectionChecklist[];
  appurtenances: ExtendedAppurtenanceInspection[];
  recommendations: ExtendedRepairRecommendation[];
  ventingInspections: ExtendedVentingSystemInspection[];
  settlementSurvey?: ExtendedAdvancedSettlementSurvey | null;
  secondaryContainments?: SecondaryContainment[];
  ndeTestLocations?: NdeTestLocation[];
  visualDocumentations?: VisualDocumentation[];
}

interface AnalysisData {
  shellCourses: ShellCourseData[];
  tankInspectionIntervals: { 
    externalInterval: number; 
    internalInterval: number; 
    criticalCourse?: number;
  };
  kpiMetrics: KPIMetrics;
  calculationResults: CalculationResults[];
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
  
  // Fetch settlement measurements for each survey
  const settlementMeasurementsMap = new Map<number, AdvancedSettlementMeasurement[]>();
  if (settlementSurveys && settlementSurveys.length > 0) {
    for (const survey of settlementSurveys) {
      if (survey.id) {
        const measurements = await storage.getAdvancedSettlementMeasurements(survey.id);
        settlementMeasurementsMap.set(survey.id, measurements);
      }
    }
  }
  
  // Calculate minimum required thickness for measurements
  const extendedMeasurements: ExtendedThicknessMeasurement[] = measurements.map(m => {
    const diameter = parseFloat(String(report.diameter || 100));
    const specificGravity = parseFloat(String(report.specificGravity || '0.85'));
    const courseMatch = m.component?.match(/course\s*(\d+)/i);
    const courseNumber = courseMatch ? parseInt(courseMatch[1]) : 1;
    
    const minRequired = calculateMinimumRequiredThickness(
      courseNumber,
      diameter,
      specificGravity,
      parseFloat(String(report.height || 40)) * 0.9, // 90% fill height
      0.85 // joint efficiency
    );
    
    return {
      ...m,
      minRequiredThickness: minRequired
    };
  });
  
  // Add severity to checklists (based on the checked status)
  const extendedChecklists: ExtendedInspectionChecklist[] = checklists.map(c => ({
    ...c,
    severity: !c.checked && c.notes ? 'major' : 'normal'
  }));
  
  // Map appurtenances with additional fields
  const extendedAppurtenances: ExtendedAppurtenanceInspection[] = appurtenances.map(a => ({
    ...a,
    component: a.appurtenanceType || 'Unknown',
    action: a.recommendations || 'Monitor',
    severity: a.priority === 'high' ? 'major' : 'normal',
    notes: a.findings || ''
  }));
  
  // Map venting inspections with additional fields
  const extendedVentingInspections: ExtendedVentingSystemInspection[] = ventingInspections.map(v => ({
    ...v,
    component: v.ventId || 'Vent',
    type: v.ventType || 'Unknown',
    size: v.setpoint || 'N/A',
    operationalStatus: v.testResults || 'Unknown',
    notes: v.findings || ''
  }));
  
  // Extend settlement survey with actual data
  let extendedSettlementSurvey: ExtendedAdvancedSettlementSurvey | null = null;
  if (settlementSurveys?.[0]) {
    const survey = settlementSurveys[0];
    const surveyMeasurements = survey.id ? settlementMeasurementsMap.get(survey.id) || [] : [];
    
    // Calculate tilt from measurements if not stored
    let calculatedTilt = 0;
    let uniformSettlement = 0;
    
    if (surveyMeasurements.length > 0) {
      const elevations = surveyMeasurements.map(m => parseFloat(String(m.measuredElevation || 0)));
      const minElev = Math.min(...elevations);
      const maxElev = Math.max(...elevations);
      
      // Calculate uniform settlement (average settlement)
      uniformSettlement = elevations.reduce((sum, e) => sum + e, 0) / elevations.length;
      
      // Calculate tilt as max difference divided by tank diameter
      const tankDiameter = parseFloat(String(survey.tankDiameter || 100));
      if (tankDiameter > 0) {
        calculatedTilt = (maxElev - minElev) / tankDiameter;
      }
    }
    
    extendedSettlementSurvey = {
      ...survey,
      surveyMethod: survey.calculationMethod || 'Optical level',
      measurementType: survey.surveyType || 'Elevation',
      referenceDatum: 'Tank bottom',
      settlementRecommendations: survey.annexReference || 'Continue monitoring',
      measurements: surveyMeasurements,
      calculatedTilt: calculatedTilt,
      uniformSettlement: uniformSettlement
    };
  }
  
  // Extend recommendations
  const extendedRecommendations: ExtendedRepairRecommendation[] = recommendations.map(r => ({
    ...r,
    timing: r.priority === 'critical' ? 'Immediate' : 
            r.priority === 'high' ? 'Within 3 months' : 
            r.priority === 'medium' ? 'Within 1 year' : 'Next turnaround',
    estimatedCost: 5000 // Placeholder value
  }));
  
  // These don't exist yet, so we'll use empty arrays for now
  const secondaryContainments: SecondaryContainment[] = [];
  const ndeTestLocations: NdeTestLocation[] = [];
  const visualDocumentations: VisualDocumentation[] = [];

  const reportData: ReportData = {
    report,
    measurements: extendedMeasurements,
    checklists: extendedChecklists,
    appurtenances: extendedAppurtenances,
    recommendations: extendedRecommendations,
    ventingInspections: extendedVentingInspections,
    settlementSurvey: extendedSettlementSurvey,
    secondaryContainments: secondaryContainments || [],
    ndeTestLocations: ndeTestLocations || [],
    visualDocumentations: visualDocumentations || []
  };

  // Generate PDF
  const pdf = new ProfessionalPDFGenerator();
  return pdf.generate(reportData);
}

class ProfessionalPDFGenerator {
  private pdf: jsPDF;
  private currentY: number = 20;
  private margin: number = 20;
  private pageHeight: number = 297; // A4 height in mm
  private pageWidth: number = 210;  // A4 width in mm
  private primaryColor: [number, number, number] = [34, 41, 108];
  private secondaryColor: [number, number, number] = [220, 53, 69];
  private accentColor: [number, number, number] = [40, 167, 69];
  private warningColor: [number, number, number] = [255, 193, 7];
  private currentPage: number = 1;
  private totalPages: number = 0;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  generate(data: ReportData): Buffer {
    const { report, measurements, checklists, appurtenances, recommendations, 
            ventingInspections, settlementSurvey, secondaryContainments,
            ndeTestLocations, visualDocumentations } = data;

    // Perform API 653 analysis
    const analysisData = this.performAnalysis(report, measurements);

    // Cover Page
    this.addCoverPage(report);
    
    // Table of Contents
    this.pdf.addPage();
    this.currentPage++;
    this.addTableOfContents();
    
    // Executive Summary with KPIs
    this.pdf.addPage();
    this.currentPage++;
    this.addEnhancedExecutiveSummary(report, measurements, analysisData);
    
    // Tank Information
    this.pdf.addPage();
    this.currentPage++;
    this.addComprehensiveTankInformation(report);
    
    // API 653 Calculation Analysis
    this.pdf.addPage();
    this.currentPage++;
    this.addAPI653CalculationAnalysis(analysisData, measurements);
    
    // Corrosion Rate Analysis
    this.pdf.addPage();
    this.currentPage++;
    this.addCorrosionRateAnalysis(measurements, analysisData);
    
    // Thickness Measurements with Analysis
    if (measurements.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addEnhancedThicknessMeasurements(measurements, analysisData);
    }
    
    // Minimum Thickness Compliance Table
    this.pdf.addPage();
    this.currentPage++;
    this.addMinimumThicknessCompliance(measurements, analysisData);
    
    // Remaining Life Analysis with Criticality Matrix
    this.pdf.addPage();
    this.currentPage++;
    this.addRemainingLifeAnalysis(measurements, analysisData);
    
    // NDE Test Locations
    if (ndeTestLocations && ndeTestLocations.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addNDETestLocations(ndeTestLocations);
    }
    
    // Inspection Checklist with Findings
    if (checklists.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addEnhancedInspectionChecklist(checklists);
    }
    
    // Appurtenances
    if (appurtenances.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addEnhancedAppurtenances(appurtenances);
    }
    
    // Venting System
    if (ventingInspections.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addEnhancedVentingSystem(ventingInspections);
    }
    
    // Settlement Analysis
    if (settlementSurvey) {
      this.pdf.addPage();
      this.currentPage++;
      this.addEnhancedSettlementAnalysis(settlementSurvey);
    }
    
    // Secondary Containment Calculations
    if (secondaryContainments && secondaryContainments.length > 0) {
      this.pdf.addPage();
      this.currentPage++;
      this.addSecondaryContainmentAnalysis(secondaryContainments, report);
    }
    
    // Detailed Findings Section
    this.pdf.addPage();
    this.currentPage++;
    this.addDetailedFindings(measurements, checklists, appurtenances, analysisData);
    
    // Comprehensive Recommendations
    this.pdf.addPage();
    this.currentPage++;
    this.addComprehensiveRecommendations(recommendations, analysisData);
    
    // Next Inspection Intervals
    this.pdf.addPage();
    this.currentPage++;
    this.addNextInspectionIntervals(analysisData, report);
    
    // Conclusion
    this.pdf.addPage();
    this.currentPage++;
    this.addConclusion(report, analysisData);
    
    // Add headers and footers to all pages
    this.addHeadersAndFooters(report);

    // Convert PDF to buffer
    const pdfOutput = this.pdf.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  private performAnalysis(report: InspectionReport, measurements: ExtendedThicknessMeasurement[]): AnalysisData {
    // Group measurements by shell course - filter by measurementType='shell' OR component includes 'shell'
    const shellMeasurements = measurements.filter(m => 
      m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')
    );
    const courseGroups = new Map<number, ExtendedThicknessMeasurement[]>();
    
    shellMeasurements.forEach(m => {
      const courseMatch = m.component?.match(/course\s*(\d+)/i);
      if (courseMatch) {
        const courseNumber = parseInt(courseMatch[1]);
        if (!courseGroups.has(courseNumber)) {
          courseGroups.set(courseNumber, []);
        }
        courseGroups.get(courseNumber)!.push(m);
      }
    });

    // Analyze each shell course
    const shellCourses: ShellCourseData[] = [];
    const diameter = parseFloat(String(report.diameter || 100));
    const height = parseFloat(String(report.height || 40));
    const specificGravity = parseFloat(String(report.specificGravity || '0.85'));
    const ageInYears = report.yearsSinceLastInspection || 5;
    
    courseGroups.forEach((courseMeasurements, courseNumber) => {
      const courseData = analyzeShellCourse(
        {
          courseNumber,
          height: 8, // Assume 8 feet per course as default
          originalThickness: parseFloat(String(courseMeasurements[0]?.originalThickness || 0.25)),
          measurements: courseMeasurements.map(m => ({
            location: m.location || '',
            currentThickness: parseFloat(String(m.currentThickness || 0))
          }))
        },
        {
          diameter,
          totalHeight: height,
          specificGravity,
          maxFillHeight: height * 0.9, // 90% fill
          jointEfficiency: 0.85,
          ageInYears
        }
      );
      shellCourses.push(courseData);
    });

    // Calculate tank inspection intervals
    const tankInspectionIntervals = shellCourses.length > 0 
      ? calculateTankInspectionIntervals(shellCourses)
      : { externalInterval: 5, internalInterval: 10 };

    // Calculate KPI metrics
    const totalMeasurements = measurements.length;
    const completedMeasurements = measurements.filter(m => m.currentThickness).length;
    const criticalFindings = measurements.filter(m => m.status === 'critical').length;
    const majorFindings = measurements.filter(m => m.status === 'action_required').length;
    const minorFindings = measurements.filter(m => m.status === 'monitor').length;
    
    let minRemainingLife = 999;
    measurements.forEach(m => {
      const remainingLife = parseFloat(String(m.remainingLife || 999));
      if (remainingLife < minRemainingLife) {
        minRemainingLife = remainingLife;
      }
    });

    const kpiMetrics: KPIMetrics = {
      percentTMLsComplete: totalMeasurements > 0 ? (completedMeasurements / totalMeasurements) * 100 : 0,
      minRemainingLife,
      criticalFindings,
      majorFindings,
      minorFindings,
      overallStatus: criticalFindings > 0 ? 'NO-GO' : majorFindings > 0 ? 'CONDITIONAL' : 'GO',
      nextInspectionDue: new Date(new Date().setFullYear(new Date().getFullYear() + tankInspectionIntervals.internalInterval))
    };

    // Perform enhanced API 653 evaluation
    const components: ComponentThickness[] = measurements.map(m => ({
      component: m.component || 'Unknown',
      nominalThickness: parseFloat(String(m.originalThickness || 0.25)),
      currentThickness: parseFloat(String(m.currentThickness || 0.25)),
      corrosionAllowance: 0.0625,
      dateCurrent: new Date(),
      datePrevious: new Date(new Date().setFullYear(new Date().getFullYear() - ageInYears))
    }));

    const tankParams: TankParameters = {
      diameter,
      height,
      specificGravity,
      jointEfficiency: 0.85,
      yieldStrength: 35000,
      designStress: 23200,
      yearsInService: ageInYears
    };

    const calculationResults = performAPI653Evaluation(components, tankParams);

    return {
      shellCourses,
      tankInspectionIntervals,
      kpiMetrics,
      calculationResults
    };
  }

  private addCoverPage(report: InspectionReport) {
    this.currentY = 40;  // Start higher on the page
    
    // Add company logo area (placeholder)
    this.pdf.setFillColor(245, 245, 245);
    this.pdf.rect(this.margin, 15, 50, 20, 'F');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text('LOGO', this.margin + 25, 28, { align: 'center' });
    
    this.currentY = 55;  // Adjusted for better spacing
    
    // Main title
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(24);  // Smaller to prevent overlap
    this.pdf.setTextColor(...this.primaryColor);
    this.pdf.text('API 653 INSPECTION REPORT', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 18;  // More space
    this.pdf.setFontSize(14);  // Smaller subtitle
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text('ABOVEGROUND STORAGE TANK INSPECTION', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 25;  // Adjusted spacing
    
    // Report details box
    this.pdf.setDrawColor(...this.primaryColor);
    this.pdf.setLineWidth(0.5);
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 60, 'FD');
    
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(`Tank Identification: ${report.tankId || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(12);
    this.pdf.text(`Report Number: ${report.reportNumber || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 8;
    this.pdf.text(`Inspection Date: ${report.inspectionDate || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 8;
    this.pdf.text(`Customer: ${report.customer || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 8;
    this.pdf.text(`Location: ${report.location || 'N/A'}`, this.margin + 10, this.currentY);
    
    // Inspector information
    this.currentY += 30;  // More space before team info
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(13);
    this.pdf.text('INSPECTION TEAM', this.margin, this.currentY);
    
    this.currentY += 12;  // More space
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    this.pdf.text(`Lead Inspector: ${report.inspector || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 7;
    this.pdf.text(`API 653 Certification: ${report.inspectorCertification || 'N/A'}`, this.margin + 10, this.currentY);
    
    this.currentY += 7;
    this.pdf.text(`Reviewer: ${report.reviewer || 'N/A'}`, this.margin + 10, this.currentY);
    
    // Company info footer
    this.currentY = 240;
    this.pdf.setFillColor(...this.primaryColor);
    this.pdf.rect(0, this.currentY, this.pageWidth, 40, 'F');
    
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(14);
    this.pdf.text('OILPRO CONSULTING', this.pageWidth / 2, this.currentY + 10, { align: 'center' });
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.text('API-653 Certified Tank Inspection Services', this.pageWidth / 2, this.currentY + 18, { align: 'center' });
    this.pdf.text('811 Dafney Drive, Lafayette, LA 70506', this.pageWidth / 2, this.currentY + 25, { align: 'center' });
    this.pdf.text('Office: (337) 446-7459 | www.oilproconsulting.com', this.pageWidth / 2, this.currentY + 32, { align: 'center' });
  }

  private addTableOfContents() {
    this.currentY = 40;
    this.addSectionHeader('TABLE OF CONTENTS', false);
    
    const sections = [
      { title: 'Executive Summary', page: 3 },
      { title: 'Tank Information', page: 4 },
      { title: 'API 653 Calculation Analysis', page: 5 },
      { title: 'Corrosion Rate Analysis', page: 6 },
      { title: 'Thickness Measurements', page: 7 },
      { title: 'Minimum Thickness Compliance', page: 8 },
      { title: 'Remaining Life Analysis', page: 9 },
      { title: 'Inspection Checklist', page: 10 },
      { title: 'Detailed Findings', page: 11 },
      { title: 'Recommendations', page: 12 },
      { title: 'Next Inspection Intervals', page: 13 },
      { title: 'Conclusion', page: 14 },
      { title: 'Appendices', page: 15 }
    ];
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    sections.forEach((section, index) => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      
      // Draw dotted line
      if (this.pdf.setLineDash) {
        this.pdf.setLineDash([1, 1], 0);
      }
      this.pdf.setDrawColor(200, 200, 200);
      this.pdf.line(this.margin + 10, this.currentY - 2, this.pageWidth - this.margin - 20, this.currentY - 2);
      if (this.pdf.setLineDash) {
        this.pdf.setLineDash([]);
      }
      
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.text(`${index + 1}. ${section.title}`, this.margin + 10, this.currentY);
      
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text(section.page.toString(), this.pageWidth - this.margin - 10, this.currentY, { align: 'right' });
      
      this.currentY += 12;
    });
  }

  private addEnhancedExecutiveSummary(report: InspectionReport, measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('EXECUTIVE SUMMARY');
    
    const { kpiMetrics } = analysisData;
    
    // KPI Dashboard
    this.addKPIDashboard(kpiMetrics);
    
    // Summary text
    this.currentY += 15;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    const summaryText = [
      `Tank ${report.tankId} at ${report.location || 'the facility'} was inspected on ${report.inspectionDate} in accordance with API 653 standards.`,
      `The inspection scope included ${report.inspectionScope || 'external visual inspection, thickness measurements, and foundation assessment'}.`,
      ``,
      `KEY FINDINGS:`,
      `• Overall Status: ${kpiMetrics.overallStatus}`,
      `• Inspection Completion: ${kpiMetrics.percentTMLsComplete.toFixed(1)}%`,
      `• Critical Findings: ${kpiMetrics.criticalFindings}`,
      `• Major Findings: ${kpiMetrics.majorFindings}`,
      `• Minor Findings: ${kpiMetrics.minorFindings}`,
      `• Minimum Remaining Life: ${kpiMetrics.minRemainingLife.toFixed(1)} years`,
      ``,
      `IMMEDIATE ACTIONS REQUIRED: ${kpiMetrics.criticalFindings > 0 ? 'YES - See recommendations section' : 'None'}`,
      ``,
      `The tank is currently ${report.status === 'In Service' ? 'IN SERVICE' : report.status?.toUpperCase() || 'UNDER EVALUATION'}.`
    ];
    
    summaryText.forEach(line => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentY = 30;
      }
      
      if (line.startsWith('KEY FINDINGS:') || line.startsWith('IMMEDIATE ACTIONS')) {
        this.pdf.setFont('helvetica', 'bold');
      } else {
        this.pdf.setFont('helvetica', 'normal');
      }
      
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 7;
    });
  }

  private addKPIDashboard(kpiMetrics: KPIMetrics) {
    const boxWidth = 40;
    const boxHeight = 25;
    const spacing = 5;
    const startX = this.margin;
    
    // Overall Status Box
    let currentX = startX;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'OVERALL STATUS',
      kpiMetrics.overallStatus,
      this.getStatusColor(kpiMetrics.overallStatus)
    );
    
    // Completion Percentage
    currentX += boxWidth + spacing;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'COMPLETION',
      `${kpiMetrics.percentTMLsComplete.toFixed(0)}%`,
      kpiMetrics.percentTMLsComplete >= 95 ? this.accentColor : this.warningColor
    );
    
    // Critical Findings
    currentX += boxWidth + spacing;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'CRITICAL',
      kpiMetrics.criticalFindings.toString(),
      kpiMetrics.criticalFindings > 0 ? this.secondaryColor : this.accentColor
    );
    
    // Min Remaining Life
    currentX += boxWidth + spacing;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'MIN. LIFE',
      `${kpiMetrics.minRemainingLife.toFixed(1)} yrs`,
      kpiMetrics.minRemainingLife < 5 ? this.secondaryColor : 
        kpiMetrics.minRemainingLife < 10 ? this.warningColor : this.accentColor
    );
    
    this.currentY += boxHeight + 10;
  }

  private drawKPIBox(x: number, y: number, width: number, height: number, 
                     label: string, value: string, color: [number, number, number]) {
    // Background
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.setDrawColor(...color);
    this.pdf.setLineWidth(1.5);
    this.pdf.rect(x, y, width, height, 'FD');
    
    // Label
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text(label, x + width / 2, y + 6, { align: 'center' });
    
    // Value
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(...color);
    this.pdf.text(value, x + width / 2, y + height - 8, { align: 'center' });
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case 'GO':
        return this.accentColor;
      case 'NO-GO':
        return this.secondaryColor;
      case 'CONDITIONAL':
        return this.warningColor;
      default:
        return [100, 100, 100];
    }
  }

  private addComprehensiveTankInformation(report: InspectionReport) {
    this.currentY = 40;
    this.addSectionHeader('TANK INFORMATION');
    
    // Basic Information
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('IDENTIFICATION & SERVICE', this.margin, this.currentY);
    this.currentY += 8;
    
    const basicInfo = [
      ['Tank ID', report.tankId || 'N/A'],
      ['Customer', report.customer || 'N/A'],
      ['Location', report.location || 'N/A'],
      ['Service/Product', report.service || 'N/A'],
      ['Current Status', report.status || 'In Service']
    ];
    
    this.addInfoTable(basicInfo);
    
    // Design & Construction
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('DESIGN & CONSTRUCTION', this.margin, this.currentY);
    this.currentY += 8;
    
    const designInfo = [
      ['Diameter', `${report.diameter || 'N/A'} ${report.diameterUnit || 'ft'}`],
      ['Height', `${report.height || 'N/A'} ${report.heightUnit || 'ft'}`],
      ['Capacity', `${report.capacity || 'N/A'} ${report.capacityUnit || 'bbls'}`],
      ['Year Built', report.yearBuilt || 'N/A'],
      ['Construction Standard', report.constructionStandard || 'API 650'],
      ['Design Code', report.designCode || 'N/A'],
      ['Shell Material', report.shellMaterial || 'A36 Carbon Steel'],
      ['Original Shell Thickness', `${report.originalThickness || 'N/A'} in`],
      ['Specific Gravity', report.specificGravity || '0.85'],
      ['Foundation Type', report.foundationType || 'Concrete Ringwall'],
      ['Roof Type', report.roofType || 'Cone Roof']
    ];
    
    this.addInfoTable(designInfo);
    
    // Inspection History
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('INSPECTION HISTORY', this.margin, this.currentY);
    this.currentY += 8;
    
    const historyInfo = [
      ['Current Inspection Date', report.inspectionDate || 'N/A'],
      ['Last Internal Inspection', report.lastInternalInspection || 'N/A'],
      ['Years Since Last Inspection', String(report.yearsSinceLastInspection || 'N/A')],
      ['Tank Age', `${report.tankAge || 'N/A'} years`],
      ['Inspector', report.inspector || 'N/A'],
      ['API 653 Certification', report.inspectorCertification || 'N/A'],
      ['Reviewer', report.reviewer || 'N/A']
    ];
    
    this.addInfoTable(historyInfo);
  }

  private addInfoTable(data: string[][]) {
    (this.pdf as any).autoTable({
      body: data,
      startY: this.currentY,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      columnStyles: {
        0: { 
          cellWidth: 60, 
          fontStyle: 'bold',
          textColor: [60, 60, 60] 
        },
        1: { 
          cellWidth: 'auto',
          textColor: [0, 0, 0]
        }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 5;
  }

  private addAPI653CalculationAnalysis(analysisData: AnalysisData, measurements: ExtendedThicknessMeasurement[]) {
    this.currentY = 40;
    this.addSectionHeader('API 653 CALCULATION ANALYSIS');
    
    // Summary of calculations
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.text('This section presents the API 653 thickness calculations and compliance assessment.', this.margin, this.currentY);
    this.currentY += 10;
    
    // Get shell measurements directly for better display
    const shellMeasurements = measurements.filter(m => 
      m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')
    );
    
    // Shell Course Analysis Table
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('SHELL COURSE ANALYSIS', this.margin, this.currentY);
    this.currentY += 8;
    
    const shellData = analysisData.shellCourses.length > 0 ? analysisData.shellCourses.map(course => {
      const worstMeasurement = course.measurements.reduce((worst, current) => 
        current.remainingLife < worst.remainingLife ? current : worst,
        course.measurements[0] || { remainingLife: 999 }
      );
      
      return [
        `Course ${course.courseNumber}`,
        course.originalThickness.toFixed(3),
        course.minimumRequired.toFixed(3),
        worstMeasurement?.currentThickness?.toFixed(3) || 'N/A',
        worstMeasurement?.corrosionRateMPY?.toFixed(1) || 'N/A',
        worstMeasurement?.remainingLife?.toFixed(1) || 'N/A',
        worstMeasurement?.status?.toUpperCase() || 'N/A'
      ];
    }) : shellMeasurements.map(m => [
      m.component || 'Shell',
      (m.originalThickness ? parseFloat(String(m.originalThickness)) : 0.25).toFixed(3),
      (m.minRequiredThickness || 0.187).toFixed(3),
      (m.currentThickness ? parseFloat(String(m.currentThickness)) : 0.25).toFixed(3),
      (m.corrosionRate ? parseFloat(String(m.corrosionRate)) : 0).toFixed(1),
      (m.remainingLife ? parseFloat(String(m.remainingLife)) : 20).toFixed(1),
      m.status?.toUpperCase() || 'ACCEPTABLE'
    ]);
    
    if (shellData.length > 0 || shellMeasurements.length > 0) {
      (this.pdf as any).autoTable({
        head: [['Course', 'Original\n(in)', 't-min\n(in)', 'Current\n(in)', 'CR\n(mpy)', 'RL\n(years)', 'Status']],
        body: shellData,
        startY: this.currentY,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'center'
        },
        columnStyles: {
          6: { 
            cellWidth: 25,
            fontStyle: 'bold'
          }
        },
        didDrawCell: (data: any) => {
          // Color code status column
          if (data.column.index === 6 && data.row.section === 'body') {
            const status = data.cell.raw;
            if (status === 'CRITICAL') {
              data.cell.styles.textColor = this.secondaryColor;
            } else if (status === 'ACTION REQUIRED') {
              data.cell.styles.textColor = this.warningColor;
            } else if (status === 'ACCEPTABLE') {
              data.cell.styles.textColor = this.accentColor;
            }
          }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // API 653 Compliance Summary
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('API 653 COMPLIANCE SUMMARY', this.margin, this.currentY);
    this.currentY += 8;
    
    const complianceText = [
      `• Calculation Method: API 653 Section 4.3.3.1 (One-foot method)`,
      `• Joint Efficiency Used: 0.85 (welded construction)`,
      `• Allowable Stress: 23,200 psi (A36 steel at design temperature)`,
      `• Corrosion Allowance: 0.0625 inches`,
      `• Inspection Intervals Calculated per API 653 Table 6.1`
    ];
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    complianceText.forEach(line => {
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addCorrosionRateAnalysis(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('CORROSION RATE ANALYSIS');
    
    // Corrosion rate trends by component
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CORROSION RATE TRENDS', this.margin, this.currentY);
    this.currentY += 8;
    
    // Group by component type - use measurementType or component
    const shellRates = measurements
      .filter(m => (m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')) && m.corrosionRate)
      .map(m => parseFloat(String(m.corrosionRate)));
    
    const bottomRates = measurements
      .filter(m => (m.measurementType === 'bottom_plate' || m.component?.toLowerCase().includes('bottom')) && m.corrosionRate)
      .map(m => parseFloat(String(m.corrosionRate)));
    
    const avgShellRate = shellRates.length > 0 ? 
      shellRates.reduce((a, b) => a + b, 0) / shellRates.length : 0;
    const maxShellRate = shellRates.length > 0 ? Math.max(...shellRates) : 0;
    
    const avgBottomRate = bottomRates.length > 0 ?
      bottomRates.reduce((a, b) => a + b, 0) / bottomRates.length : 0;
    const maxBottomRate = bottomRates.length > 0 ? Math.max(...bottomRates) : 0;
    
    const rateData = [
      ['Shell - Average', avgShellRate.toFixed(2), this.getCorrosionCategory(avgShellRate)],
      ['Shell - Maximum', maxShellRate.toFixed(2), this.getCorrosionCategory(maxShellRate)],
      ['Bottom - Average', avgBottomRate.toFixed(2), this.getCorrosionCategory(avgBottomRate)],
      ['Bottom - Maximum', maxBottomRate.toFixed(2), this.getCorrosionCategory(maxBottomRate)]
    ];
    
    (this.pdf as any).autoTable({
      head: [['Component', 'Corrosion Rate (mpy)', 'Category']],
      body: rateData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Corrosion predictions
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CORROSION PREDICTIONS', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    const predictions = [
      `Based on current corrosion rates:`,
      `• Shell will reach minimum thickness in ${analysisData.kpiMetrics.minRemainingLife.toFixed(1)} years`,
      `• Projected thickness loss over next 5 years: ${(maxShellRate * 5 / 1000).toFixed(3)} inches`,
      `• Recommended corrosion mitigation if rate exceeds 5 mpy`,
      ``,
      `Corrosion Environment Assessment:`,
      `• Product corrosivity: ${this.assessCorrosivity(avgShellRate)}`,
      `• External environment: ${this.assessEnvironment(avgShellRate)}`,
      `• Coating effectiveness: ${this.assessCoating(avgShellRate)}`
    ];
    
    predictions.forEach(line => {
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private getCorrosionCategory(rate: number): string {
    if (rate <= 1) return 'Low';
    if (rate <= 3) return 'Moderate';
    if (rate <= 5) return 'High';
    return 'Severe';
  }

  private assessCorrosivity(rate: number): string {
    if (rate <= 1) return 'Non-corrosive product';
    if (rate <= 3) return 'Mildly corrosive product';
    return 'Corrosive product - consider inhibitors';
  }

  private assessEnvironment(rate: number): string {
    if (rate <= 1) return 'Benign environment';
    if (rate <= 3) return 'Moderate exposure';
    return 'Aggressive environment';
  }

  private assessCoating(rate: number): string {
    if (rate <= 1) return 'Coating performing well';
    if (rate <= 3) return 'Some coating degradation';
    return 'Coating system needs evaluation';
  }

  private addEnhancedThicknessMeasurements(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('THICKNESS MEASUREMENTS');
    
    // Group measurements by component - use measurementType for better filtering
    const shellMeasurements = measurements.filter(m => 
      m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')
    );
    const bottomMeasurements = measurements.filter(m => 
      m.measurementType === 'bottom_plate' || m.component?.toLowerCase().includes('bottom')
    );
    const roofMeasurements = measurements.filter(m => 
      m.measurementType === 'roof' || m.component?.toLowerCase().includes('roof')
    );
    
    // Shell Measurements with full data
    if (shellMeasurements.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('SHELL MEASUREMENTS', this.margin, this.currentY);
      this.currentY += 8;
      
      const shellData = shellMeasurements.map(m => [
        m.location || 'N/A',
        m.component || 'N/A',
        m.originalThickness ? parseFloat(String(m.originalThickness)).toFixed(3) : 'N/A',
        m.currentThickness ? parseFloat(String(m.currentThickness)).toFixed(3) : 'N/A',
        m.minRequiredThickness ? m.minRequiredThickness.toFixed(3) : 'N/A',
        m.corrosionRate ? parseFloat(String(m.corrosionRate)).toFixed(1) : 'N/A',
        m.remainingLife ? parseFloat(String(m.remainingLife)).toFixed(1) : 'N/A',
        m.status?.toUpperCase() || 'N/A'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Location', 'Component', 'Original\n(in)', 'Current\n(in)', 't-min\n(in)', 'CR\n(mpy)', 'RL\n(yrs)', 'Status']],
        body: shellData,
        startY: this.currentY,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 8,
          halign: 'center',
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          7: { fontStyle: 'bold' }
        },
        didDrawCell: (data: any) => {
          if (data.column.index === 7 && data.row.section === 'body') {
            const status = data.cell.raw;
            if (status === 'CRITICAL') {
              data.cell.styles.textColor = this.secondaryColor;
            } else if (status === 'ACTION_REQUIRED' || status === 'ACTION REQUIRED') {
              data.cell.styles.textColor = this.warningColor;
            }
          }
        },
        margin: { left: this.margin },
        didParseCell: (data: any) => {
          // Prevent text overflow
          if (data.cell.text && data.cell.text.length > 0) {
            const text = data.cell.text[0];
            if (text.length > 15) {
              data.cell.text[0] = text.substring(0, 12) + '...';
            }
          }
        }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // Bottom Measurements - skip section entirely if no data exists (as requested)
    if (bottomMeasurements.length > 0) {
      // Always start on new page for bottom measurements
      this.pdf.addPage();
      this.currentPage++;
      this.currentY = 40;
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('BOTTOM PLATE MEASUREMENTS', this.margin, this.currentY);
      this.currentY += 8;
      
      const bottomData = bottomMeasurements.map(m => [
        m.location || 'N/A',
        m.currentThickness ? parseFloat(String(m.currentThickness)).toFixed(3) : 'N/A',
        m.originalThickness ? parseFloat(String(m.originalThickness)).toFixed(3) : 'N/A',
        '0.100', // API 653 minimum for bottom
        m.corrosionRate ? parseFloat(String(m.corrosionRate)).toFixed(1) : 'N/A',
        m.remainingLife ? parseFloat(String(m.remainingLife)).toFixed(1) : 'N/A',
        m.status?.toUpperCase() || 'N/A'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Location', 'Current (in)', 'Original (in)', 't-min (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
        body: bottomData,
        startY: this.currentY,
        theme: 'striped',
        headStyles: {
          fillColor: this.primaryColor,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          halign: 'center'
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
  }

  private addMinimumThicknessCompliance(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('MINIMUM THICKNESS COMPLIANCE');
    
    // Compliance summary
    const compliantCount = measurements.filter(m => {
      const current = parseFloat(String(m.currentThickness || 0));
      const min = m.minRequiredThickness || 0.1;
      return current >= min;
    }).length;
    
    const nonCompliantCount = measurements.length - compliantCount;
    const complianceRate = measurements.length > 0 ? (compliantCount / measurements.length) * 100 : 0;
    
    // Compliance overview box
    this.pdf.setFillColor(complianceRate === 100 ? 240, 255, 240 : 255, 245, 245);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 30, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.setTextColor(complianceRate === 100 ? ...this.accentColor : ...this.secondaryColor);
    this.pdf.text(`COMPLIANCE RATE: ${complianceRate.toFixed(1)}%`, this.margin + 10, this.currentY + 10);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(`Compliant Locations: ${compliantCount} | Non-Compliant: ${nonCompliantCount}`, this.margin + 10, this.currentY + 20);
    
    this.currentY += 40;
    
    // Non-compliant locations table
    if (nonCompliantCount > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('NON-COMPLIANT LOCATIONS REQUIRING ATTENTION', this.margin, this.currentY);
      this.currentY += 8;
      
      const nonCompliant = measurements.filter(m => {
        const current = parseFloat(String(m.currentThickness || 0));
        const min = m.minRequiredThickness || 0.1;
        return current < min;
      });
      
      const nonCompliantData = nonCompliant.map(m => [
        m.location || 'N/A',
        m.component || 'N/A',
        parseFloat(String(m.currentThickness || 0)).toFixed(3),
        (m.minRequiredThickness || 0.1).toFixed(3),
        (((m.minRequiredThickness || 0.1) - parseFloat(String(m.currentThickness || 0))) * 1000).toFixed(0),
        'IMMEDIATE ACTION'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Location', 'Component', 'Current (in)', 't-min (in)', 'Deficit (mils)', 'Action']],
        body: nonCompliantData,
        startY: this.currentY,
        theme: 'grid',
        headStyles: {
          fillColor: this.secondaryColor,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          5: { fontStyle: 'bold', textColor: this.secondaryColor }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // API 653 reference
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text('* Minimum thickness calculated per API 653 Section 4.3.3.1 using one-foot method', this.margin, this.currentY);
  }

  private addRemainingLifeAnalysis(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('REMAINING LIFE ANALYSIS');
    
    // Criticality Matrix
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CRITICALITY MATRIX', this.margin, this.currentY);
    this.currentY += 8;
    
    // Define criticality categories
    const critical = measurements.filter(m => parseFloat(String(m.remainingLife || 999)) < 2);
    const high = measurements.filter(m => {
      const rl = parseFloat(String(m.remainingLife || 999));
      return rl >= 2 && rl < 5;
    });
    const medium = measurements.filter(m => {
      const rl = parseFloat(String(m.remainingLife || 999));
      return rl >= 5 && rl < 10;
    });
    const low = measurements.filter(m => parseFloat(String(m.remainingLife || 999)) >= 10);
    
    const matrixData = [
      ['CRITICAL (<2 years)', critical.length.toString(), critical.map(m => m.location).join(', ') || 'None'],
      ['HIGH (2-5 years)', high.length.toString(), high.slice(0, 3).map(m => m.location).join(', ') + (high.length > 3 ? '...' : '') || 'None'],
      ['MEDIUM (5-10 years)', medium.length.toString(), medium.slice(0, 3).map(m => m.location).join(', ') + (medium.length > 3 ? '...' : '') || 'None'],
      ['LOW (>10 years)', low.length.toString(), low.length > 0 ? 'Multiple locations' : 'None']
    ];
    
    (this.pdf as any).autoTable({
      head: [['Risk Category', 'Count', 'Locations']],
      body: matrixData,
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
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center', cellWidth: 20 },
        2: { cellWidth: 'auto' }
      },
      didDrawCell: (data: any) => {
        if (data.column.index === 0 && data.row.section === 'body') {
          const category = data.cell.raw;
          if (category.includes('CRITICAL')) {
            data.cell.styles.textColor = this.secondaryColor;
          } else if (category.includes('HIGH')) {
            data.cell.styles.textColor = [255, 140, 0];
          } else if (category.includes('MEDIUM')) {
            data.cell.styles.textColor = this.warningColor;
          } else {
            data.cell.styles.textColor = this.accentColor;
          }
        }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Life extension options
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('LIFE EXTENSION RECOMMENDATIONS', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    const recommendations = [];
    if (critical.length > 0) {
      recommendations.push('• IMMEDIATE: Repair or replace critical areas before next operating cycle');
    }
    if (high.length > 0) {
      recommendations.push('• SHORT TERM: Plan repairs for high-risk areas within 12 months');
    }
    if (analysisData.kpiMetrics.minRemainingLife < 10) {
      recommendations.push('• Consider corrosion mitigation strategies (coating, cathodic protection)');
      recommendations.push('• Increase inspection frequency for areas with high corrosion rates');
    }
    recommendations.push('• Implement Fitness-For-Service evaluation per API 579 for critical areas');
    recommendations.push('• Consider thickness monitoring program with permanent UT sensors');
    
    recommendations.forEach(rec => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      this.pdf.text(rec, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addNDETestLocations(ndeTestLocations: NdeTestLocation[]) {
    this.currentY = 40;
    this.addSectionHeader('NDE TEST LOCATIONS');
    
    const ndeData = ndeTestLocations.map(location => [
      location.location || 'N/A',
      location.testType || 'N/A',
      location.extent || 'N/A',
      location.findings || 'No indications',
      location.followUp || 'None required'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Location', 'Test Type', 'Extent', 'Findings', 'Follow-up']],
      body: ndeData,
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
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
  }

  private addEnhancedInspectionChecklist(checklists: ExtendedInspectionChecklist[]) {
    this.currentY = 40;
    this.addSectionHeader('INSPECTION CHECKLIST');
    
    // Group by category
    const categories = ['external', 'internal', 'foundation', 'appurtenances', 'safety'];
    
    categories.forEach(category => {
      const items = checklists.filter(item => item.category === category);
      
      if (items.length > 0) {
        if (this.currentY > this.pageHeight - 50) {
          this.pdf.addPage();
          this.currentPage++;
          this.currentY = 40;
        }
        
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(11);
        this.pdf.text(category.toUpperCase() + ' INSPECTION', this.margin, this.currentY);
        this.currentY += 8;
        
        const checklistData = items.map(item => [
          item.item || 'N/A',
          item.checked ? '✓' : '✗',
          item.severity || 'Normal',
          item.notes || 'No issues noted'
        ]);
        
        (this.pdf as any).autoTable({
          head: [['Item', 'Status', 'Severity', 'Notes']],
          body: checklistData,
          startY: this.currentY,
          theme: 'grid',
          headStyles: {
            fillColor: this.primaryColor,
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 'auto' }
          },
          didDrawCell: (data: any) => {
            // Color code status
            if (data.column.index === 1 && data.row.section === 'body') {
              if (data.cell.raw === '✗') {
                data.cell.styles.textColor = this.secondaryColor;
              } else {
                data.cell.styles.textColor = this.accentColor;
              }
            }
            // Color code severity
            if (data.column.index === 2 && data.row.section === 'body') {
              const severity = data.cell.raw;
              if (severity === 'critical' || severity === 'Critical') {
                data.cell.styles.textColor = this.secondaryColor;
              } else if (severity === 'major' || severity === 'Major') {
                data.cell.styles.textColor = this.warningColor;
              }
            }
          },
          margin: { left: this.margin }
        });
        
        this.currentY = this.pdf.lastAutoTable.finalY + 10;
      }
    });
  }

  private addEnhancedAppurtenances(appurtenances: ExtendedAppurtenanceInspection[]) {
    this.currentY = 40;
    this.addSectionHeader('APPURTENANCE INSPECTIONS');
    
    const appurtenanceData = appurtenances.map(item => [
      item.component || 'N/A',
      item.location || 'N/A',
      item.condition || 'N/A',
      item.severity || 'Normal',
      item.action || 'Monitor',
      item.notes || 'No issues'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Component', 'Location', 'Condition', 'Severity', 'Action', 'Notes']],
      body: appurtenanceData,
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
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
  }

  private addEnhancedVentingSystem(ventingInspections: ExtendedVentingSystemInspection[]) {
    this.currentY = 40;
    this.addSectionHeader('VENTING SYSTEM INSPECTION');
    
    const ventingData = ventingInspections.map(item => [
      item.component || 'N/A',
      item.type || 'N/A',
      item.size || 'N/A',
      item.condition || 'N/A',
      item.operationalStatus || 'N/A',
      item.testResults || 'Not tested',
      item.notes || 'No issues'
    ]);
    
    (this.pdf as any).autoTable({
      head: [['Component', 'Type', 'Size', 'Condition', 'Status', 'Test Results', 'Notes']],
      body: ventingData,
      startY: this.currentY,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
  }

  private addEnhancedSettlementAnalysis(survey: ExtendedAdvancedSettlementSurvey) {
    this.currentY = 40;
    this.addSectionHeader('SETTLEMENT ANALYSIS');
    
    // Settlement Summary
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('SETTLEMENT SURVEY RESULTS', this.margin, this.currentY);
    this.currentY += 8;
    
    // Use actual values from the database
    const maxOutOfPlane = parseFloat(String(survey.maxOutOfPlane || 0));
    const cosineAmplitude = parseFloat(String(survey.cosineAmplitude || 0));
    const cosinePhase = parseFloat(String(survey.cosinePhase || 0));
    const rSquared = parseFloat(String(survey.rSquared || 0));
    const allowableSettlement = parseFloat(String(survey.allowableSettlement || 0));
    const actualTilt = survey.calculatedTilt || 0;
    const uniformSettlement = survey.uniformSettlement || 0;
    
    const summaryData = [
      ['Survey Date', survey.surveyDate || 'N/A'],
      ['Survey Method', survey.surveyMethod || 'Optical level'],
      ['Measurement Type', survey.measurementType || 'N/A'],
      ['Number of Points', survey.numberOfPoints?.toString() || survey.measurements?.length.toString() || 'N/A'],
      ['Reference Datum', survey.referenceDatum || 'Tank bottom'],
      ['Uniform Settlement', `${uniformSettlement.toFixed(3)} inches`],
      ['Maximum Tilt', `${actualTilt.toFixed(4)} in/ft`],
      ['Max Out of Plane', `${maxOutOfPlane.toFixed(3)} inches`],
      ['Settlement Acceptance', survey.settlementAcceptance || 'PENDING']
    ];
    
    (this.pdf as any).autoTable({
      body: summaryData,
      startY: this.currentY,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', textColor: [60, 60, 60] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Individual Measurement Points Table
    if (survey.measurements && survey.measurements.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('ELEVATION MEASUREMENT POINTS', this.margin, this.currentY);
      this.currentY += 8;
      
      const measurementData = survey.measurements.map(m => [
        m.pointNumber?.toString() || 'N/A',
        parseFloat(String(m.angle || 0)).toFixed(1),
        parseFloat(String(m.measuredElevation || 0)).toFixed(3),
        parseFloat(String(m.cosineFitElevation || 0)).toFixed(3),
        parseFloat(String(m.outOfPlane || 0)).toFixed(3)
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Point #', 'Angle (°)', 'Measured (in)', 'Cosine Fit (in)', 'Out of Plane (in)']],
        body: measurementData,
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
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'right', cellWidth: 25 },
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 35 },
          4: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // Cosine Fit Analysis
    if (rSquared > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('COSINE FIT ANALYSIS', this.margin, this.currentY);
      this.currentY += 8;
      
      // Cosine fit equation
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      const equation = `U(θ) = ${cosineAmplitude.toFixed(3)} × cos(θ - ${(cosinePhase * 180 / Math.PI).toFixed(1)}°)`;
      this.pdf.text(`Equation: ${equation}`, this.margin + 5, this.currentY);
      this.currentY += 6;
      
      const cosineFitData = [
        ['Cosine Amplitude (A)', `${cosineAmplitude.toFixed(4)} inches`],
        ['Phase Angle (B)', `${(cosinePhase * 180 / Math.PI).toFixed(2)} degrees`],
        ['R² Value', `${rSquared.toFixed(4)}`],
        ['R² Requirement', '≥ 0.90 (API 653 Appendix B)'],
        ['Cosine Fit Status', rSquared >= 0.90 ? '✓ ACCEPTABLE' : '✗ REVIEW REQUIRED']
      ];
      
      (this.pdf as any).autoTable({
        body: cosineFitData,
        startY: this.currentY,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', textColor: [60, 60, 60] },
          1: { cellWidth: 'auto' }
        },
        didDrawCell: (data: any) => {
          if (data.row.index === 4 && data.column.index === 1) {
            if (data.cell.raw.includes('✓')) {
              data.cell.styles.textColor = this.accentColor;
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw.includes('✗')) {
              data.cell.styles.textColor = this.secondaryColor;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // API 653 Compliance
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('API 653 APPENDIX B COMPLIANCE', this.margin, this.currentY);
    this.currentY += 8;
    
    const complianceData = [
      ['Criteria', 'Measured', 'Allowable', 'Status'],
      ['Uniform Settlement', `${uniformSettlement.toFixed(3)}"`, 'No limit', '✓ ACCEPTABLE'],
      ['Tilt', `${actualTilt.toFixed(4)} in/ft`, '0.015 in/ft', actualTilt <= 0.015 ? '✓ ACCEPTABLE' : '✗ EXCEEDS'],
      ['Out-of-Plane', `${maxOutOfPlane.toFixed(3)}"`, `${allowableSettlement > 0 ? allowableSettlement.toFixed(3) + '"' : 'L²/130H'}`, maxOutOfPlane <= (allowableSettlement || 2.0) ? '✓ ACCEPTABLE' : '✗ REVIEW']
    ];
    
    (this.pdf as any).autoTable({
      body: complianceData.slice(1),
      head: [complianceData[0]],
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        3: { 
          halign: 'center',
          fontStyle: 'bold'
        }
      },
      didDrawCell: (data: any) => {
        if (data.column.index === 3 && data.row.section === 'body') {
          if (data.cell.raw.includes('✓')) {
            data.cell.styles.textColor = this.accentColor;
          } else if (data.cell.raw.includes('✗')) {
            data.cell.styles.textColor = this.secondaryColor;
          }
        }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Recommendations
    if (survey.settlementRecommendations) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('RECOMMENDATIONS', this.margin, this.currentY);
      this.currentY += 8;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      const text = this.pdf.splitTextToSize(survey.settlementRecommendations, this.pageWidth - 2 * this.margin);
      text.forEach((line: string) => {
        if (this.currentY > this.pageHeight - 30) {
          this.pdf.addPage();
          this.currentPage++;
          this.currentY = 40;
        }
        this.pdf.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    }
  }

  private addSecondaryContainmentAnalysis(containments: SecondaryContainment[], report: InspectionReport) {
    this.currentY = 40;
    this.addSectionHeader('SECONDARY CONTAINMENT ANALYSIS');
    
    const containment = containments[0]; // Use first containment if multiple
    
    if (containment) {
      // Volume calculations
      const tankVolume = parseFloat(String(report.capacity || 0));
      const dikeCapacity = parseFloat(String(containment.dikeCapacity || 0));
      const adequacyRatio = dikeCapacity > 0 ? (dikeCapacity / tankVolume) * 100 : 0;
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('CONTAINMENT CAPACITY ANALYSIS', this.margin, this.currentY);
      this.currentY += 8;
      
      const capacityData = [
        ['Tank Capacity', `${tankVolume.toFixed(0)} ${report.capacityUnit || 'bbls'}`],
        ['Dike Type', containment.dikeType || 'Earthen'],
        ['Dike Height', `${containment.dikeHeight || 'N/A'} ft`],
        ['Dike Capacity', `${dikeCapacity.toFixed(0)} bbls`],
        ['Adequacy Ratio', `${adequacyRatio.toFixed(1)}%`],
        ['EPA Requirement', '110% of tank capacity'],
        ['Compliance', adequacyRatio >= 110 ? '✓ COMPLIANT' : '✗ NON-COMPLIANT']
      ];
      
      (this.pdf as any).autoTable({
        body: capacityData,
        startY: this.currentY,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', textColor: [60, 60, 60] },
          1: { cellWidth: 'auto' }
        },
        didDrawCell: (data: any) => {
          if (data.row.index === 6 && data.column.index === 1) {
            if (data.cell.raw.includes('COMPLIANT')) {
              data.cell.styles.textColor = this.accentColor;
            } else if (data.cell.raw.includes('NON-COMPLIANT')) {
              data.cell.styles.textColor = this.secondaryColor;
            }
          }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
      
      // Condition assessment
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('CONTAINMENT CONDITION', this.margin, this.currentY);
      this.currentY += 8;
      
      const conditionData = [
        ['Dike Condition', containment.dikeCondition || 'N/A'],
        ['Liner Type', containment.linerType || 'None'],
        ['Liner Condition', containment.linerCondition || 'N/A'],
        ['Drainage System', containment.drainageSystem || 'Gravity'],
        ['Drainage Valves', containment.drainValvesSealed ? 'Sealed' : 'Not sealed']
      ];
      
      (this.pdf as any).autoTable({
        body: conditionData,
        startY: this.currentY,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', textColor: [60, 60, 60] },
          1: { cellWidth: 'auto' }
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
  }

  private addDetailedFindings(measurements: ExtendedThicknessMeasurement[], checklists: ExtendedInspectionChecklist[], 
                             appurtenances: ExtendedAppurtenanceInspection[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('DETAILED FINDINGS');
    
    // Critical Findings
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...this.secondaryColor);
    this.pdf.text('CRITICAL FINDINGS', this.margin, this.currentY);
    this.pdf.setTextColor(0, 0, 0);
    this.currentY += 8;
    
    const criticalFindings = [];
    
    // Check thickness measurements
    measurements.forEach(m => {
      if (m.status === 'critical') {
        criticalFindings.push(`• ${m.location}: Thickness below minimum required (${m.currentThickness}" < ${m.minRequiredThickness || 0.1}")`);
      }
    });
    
    // Check checklists
    checklists.forEach(item => {
      if (!item.checked && item.severity === 'critical') {
        criticalFindings.push(`• ${item.item}: Failed inspection - ${item.notes || 'requires immediate attention'}`);
      }
    });
    
    if (criticalFindings.length === 0) {
      criticalFindings.push('• No critical findings identified');
    }
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    criticalFindings.forEach(finding => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      this.pdf.text(finding, this.margin, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 10;
    
    // Major Findings
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...this.warningColor);
    this.pdf.text('MAJOR FINDINGS', this.margin, this.currentY);
    this.pdf.setTextColor(0, 0, 0);
    this.currentY += 8;
    
    const majorFindings = [];
    
    measurements.forEach(m => {
      if (m.status === 'action_required') {
        majorFindings.push(`• ${m.location}: Approaching minimum thickness (RL: ${m.remainingLife} years)`);
      }
    });
    
    appurtenances.forEach(item => {
      if (item.condition === 'poor' || item.severity === 'major') {
        majorFindings.push(`• ${item.component}: ${item.condition} condition - ${item.action || 'repair needed'}`);
      }
    });
    
    if (majorFindings.length === 0) {
      majorFindings.push('• No major findings identified');
    }
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    majorFindings.forEach(finding => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      this.pdf.text(finding, this.margin, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 10;
    
    // Minor Findings
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('MINOR FINDINGS', this.margin, this.currentY);
    this.currentY += 8;
    
    const minorFindings = [];
    
    measurements.forEach(m => {
      if (m.status === 'monitor') {
        minorFindings.push(`• ${m.location}: Monitor corrosion rate (${m.corrosionRate} mpy)`);
      }
    });
    
    if (minorFindings.length === 0) {
      minorFindings.push('• Routine monitoring items only');
    }
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    minorFindings.slice(0, 5).forEach(finding => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      this.pdf.text(finding, this.margin, this.currentY);
      this.currentY += 6;
    });
    
    if (minorFindings.length > 5) {
      this.pdf.text(`• ... and ${minorFindings.length - 5} additional minor items`, this.margin, this.currentY);
    }
  }

  private addComprehensiveRecommendations(recommendations: ExtendedRepairRecommendation[], analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('RECOMMENDATIONS');
    
    // Priority matrix
    const critical = recommendations.filter(r => r.priority === 'critical');
    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');
    const low = recommendations.filter(r => r.priority === 'low' || !r.priority);
    
    // Critical Recommendations
    if (critical.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...this.secondaryColor);
      this.pdf.text('CRITICAL - IMMEDIATE ACTION REQUIRED', this.margin, this.currentY);
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 8;
      
      const criticalData = critical.map(r => [
        r.component || 'N/A',
        r.description || 'N/A',
        r.timing || 'Immediate',
        r.estimatedCost ? `$${r.estimatedCost.toLocaleString()}` : 'TBD'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Component', 'Description', 'Timeline', 'Est. Cost']],
        body: criticalData,
        startY: this.currentY,
        theme: 'grid',
        headStyles: {
          fillColor: this.secondaryColor,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // High Priority
    if (high.length > 0) {
      if (this.currentY > this.pageHeight - 50) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...this.warningColor);
      this.pdf.text('HIGH PRIORITY - WITHIN 6 MONTHS', this.margin, this.currentY);
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 8;
      
      const highData = high.map(r => [
        r.component || 'N/A',
        r.description || 'N/A',
        r.timing || '6 months',
        r.estimatedCost ? `$${r.estimatedCost.toLocaleString()}` : 'TBD'
      ]);
      
      (this.pdf as any).autoTable({
        head: [['Component', 'Description', 'Timeline', 'Est. Cost']],
        body: highData,
        startY: this.currentY,
        theme: 'grid',
        headStyles: {
          fillColor: this.warningColor,
          fontSize: 9,
          fontStyle: 'bold',
          textColor: [0, 0, 0]
        },
        bodyStyles: {
          fontSize: 8
        },
        margin: { left: this.margin }
      });
      
      this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }
    
    // Medium and Low Priority Summary
    if (medium.length > 0 || low.length > 0) {
      if (this.currentY > this.pageHeight - 40) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('PLANNED MAINTENANCE', this.margin, this.currentY);
      this.currentY += 8;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      this.pdf.text(`• Medium Priority Items: ${medium.length} (within 1 year)`, this.margin, this.currentY);
      this.currentY += 6;
      this.pdf.text(`• Low Priority Items: ${low.length} (next turnaround)`, this.margin, this.currentY);
      this.currentY += 6;
      
      const totalCost = [...medium, ...low].reduce((sum, r) => 
        sum + (r.estimatedCost || 0), 0);
      
      if (totalCost > 0) {
        this.pdf.text(`• Total Estimated Cost: $${totalCost.toLocaleString()}`, this.margin, this.currentY);
      }
    }
  }

  private addNextInspectionIntervals(analysisData: AnalysisData, report: InspectionReport) {
    this.currentY = 40;
    this.addSectionHeader('NEXT INSPECTION INTERVALS');
    
    const { externalInterval, internalInterval, criticalCourse } = analysisData.tankInspectionIntervals;
    
    // Calculate dates
    const currentDate = new Date();
    const externalDate = new Date();
    externalDate.setFullYear(currentDate.getFullYear() + externalInterval);
    const internalDate = new Date();
    internalDate.setFullYear(currentDate.getFullYear() + internalInterval);
    
    // Interval summary box
    this.pdf.setFillColor(245, 245, 250);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 40, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('API 653 CALCULATED INTERVALS', this.margin + 10, this.currentY + 10);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    this.pdf.text(`External Inspection Due: ${externalDate.toLocaleDateString()} (${externalInterval} years)`, 
                  this.margin + 10, this.currentY + 20);
    this.pdf.text(`Internal Inspection Due: ${internalDate.toLocaleDateString()} (${internalInterval} years)`,
                  this.margin + 10, this.currentY + 30);
    
    this.currentY += 50;
    
    // Basis for intervals
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('BASIS FOR INTERVAL DETERMINATION', this.margin, this.currentY);
    this.currentY += 8;
    
    const basisData = [
      ['Tank Classification', 'Class II (standard service)'],
      ['Corrosion Rate Basis', `${analysisData.kpiMetrics.minRemainingLife < 10 ? 'Short-term' : 'Long-term'} rate governs`],
      ['Limiting Component', criticalCourse ? `Shell Course ${criticalCourse}` : 'Bottom plates'],
      ['API 653 Reference', 'Table 6.1 and Section 6.4.2'],
      ['RBI Applied', 'No'],
      ['Special Considerations', report.coatingCondition === 'poor' ? 'Coating degradation noted' : 'None']
    ];
    
    (this.pdf as any).autoTable({
      body: basisData,
      startY: this.currentY,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold', textColor: [60, 60, 60] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: this.margin }
    });
    
    this.currentY = this.pdf.lastAutoTable.finalY + 10;
    
    // Additional inspections
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('ADDITIONAL INSPECTION REQUIREMENTS', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    const additionalReqs = [
      '• Cathodic Protection Survey: Annual',
      '• Settlement Survey: Every 5 years',
      '• Coating Inspection: With external inspection',
      '• Foundation Inspection: With external inspection',
      '• Roof Inspection: Every 5 years or with internal',
      '• Emergency Venting: Annual operational test'
    ];
    
    additionalReqs.forEach(req => {
      this.pdf.text(req, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addConclusion(report: InspectionReport, analysisData: AnalysisData) {
    this.currentY = 40;
    this.addSectionHeader('CONCLUSION');
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    
    const { kpiMetrics } = analysisData;
    const status = kpiMetrics.overallStatus;
    
    let conclusionText = [];
    
    if (status === 'GO') {
      conclusionText = [
        `The API 653 inspection of Tank ${report.tankId} has been completed successfully with no critical findings.`,
        `The tank is considered fit for continued service under current operating conditions.`,
        ``,
        `All thickness measurements meet or exceed API 653 minimum requirements, and the calculated remaining`,
        `life of ${kpiMetrics.minRemainingLife.toFixed(1)} years provides adequate time for planned maintenance activities.`,
        ``,
        `Recommended actions include routine monitoring and the scheduled maintenance items identified in this`,
        `report. The next internal inspection should be performed within ${analysisData.tankInspectionIntervals.internalInterval} years.`
      ];
    } else if (status === 'CONDITIONAL') {
      conclusionText = [
        `The API 653 inspection of Tank ${report.tankId} has identified conditions requiring attention.`,
        `The tank may continue in service with the implementation of recommended repairs and increased monitoring.`,
        ``,
        `${kpiMetrics.majorFindings} major findings require action within the next operating cycle to ensure`,
        `continued safe operation. The minimum remaining life of ${kpiMetrics.minRemainingLife.toFixed(1)} years indicates`,
        `accelerated corrosion in certain areas.`,
        ``,
        `All high priority recommendations should be implemented within 6 months, with follow-up inspection`,
        `to verify repair effectiveness.`
      ];
    } else {
      conclusionText = [
        `The API 653 inspection of Tank ${report.tankId} has identified ${kpiMetrics.criticalFindings} critical findings`,
        `requiring immediate attention before the tank can continue in service.`,
        ``,
        `Areas with thickness below API 653 minimum requirements must be repaired or replaced immediately.`,
        `A Fitness-For-Service evaluation per API 579 is recommended to determine interim operating limits.`,
        ``,
        `The tank should not return to full service until all critical repairs are completed and verified`,
        `through follow-up inspection.`
      ];
    }
    
    conclusionText.forEach(line => {
      if (this.currentY > this.pageHeight - 30) {
        this.pdf.addPage();
        this.currentPage++;
        this.currentY = 40;
      }
      const lines = this.pdf.splitTextToSize(line, this.pageWidth - 2 * this.margin);
      lines.forEach((splitLine: string) => {
        this.pdf.text(splitLine, this.margin, this.currentY);
        this.currentY += 7;
      });
    });
    
    // Certification statement
    this.currentY += 20;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CERTIFICATION', this.margin, this.currentY);
    this.currentY += 10;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.text('This inspection was performed in accordance with API 653 standards by qualified personnel.', this.margin, this.currentY);
    this.currentY += 6;
    this.pdf.text('All findings and recommendations are based on conditions observed at the time of inspection.', this.margin, this.currentY);
    
    // Signature lines
    this.currentY += 30;
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY, this.margin + 60, this.currentY);
    this.pdf.line(this.pageWidth - this.margin - 60, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 5;
    this.pdf.setFontSize(9);
    this.pdf.text(`${report.inspector || 'Inspector'}`, this.margin, this.currentY);
    this.pdf.text(`${report.reviewer || 'Reviewer'}`, this.pageWidth - this.margin - 60, this.currentY);
    
    this.currentY += 5;
    this.pdf.text(`API 653 Certified Inspector`, this.margin, this.currentY);
    this.pdf.text(`QA/QC Manager`, this.pageWidth - this.margin - 60, this.currentY);
    
    this.currentY += 5;
    this.pdf.text(`Cert #: ${report.inspectorCertification || 'N/A'}`, this.margin, this.currentY);
    this.pdf.text(`Date: ${new Date().toLocaleDateString()}`, this.pageWidth - this.margin - 60, this.currentY);
  }

  private addHeadersAndFooters(report: InspectionReport) {
    const pageCount = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      
      // Header
      if (i > 1) { // Skip header on cover page
        this.pdf.setFillColor(250, 250, 250);
        this.pdf.rect(0, 0, this.pageWidth, 15, 'F');
        
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(100, 100, 100);
        this.pdf.text(`Tank ${report.tankId} - ${report.reportNumber || 'API 653 Inspection'}`, 
                      this.margin, 10);
        this.pdf.text(report.inspectionDate || '', 
                      this.pageWidth - this.margin, 10, { align: 'right' });
      }
      
      // Footer
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(100, 100, 100);
      
      if (i === 1) {
        // Special footer for cover page
        this.pdf.text('Confidential - Property of Client', 
                      this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
      } else {
        // Standard footer
        this.pdf.text('OilPro Consulting', this.margin, this.pageHeight - 10);
        this.pdf.text(`Page ${i - 1} of ${pageCount - 1}`, 
                      this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
        this.pdf.text('API 653 Inspection Report', 
                      this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
      }
    }
  }

  private addSectionHeader(title: string, withBackground: boolean = true) {
    if (withBackground) {
      this.pdf.setFillColor(...this.primaryColor);
      this.pdf.rect(0, this.currentY - 10, this.pageWidth, 20, 'F');
      
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(title, this.margin, this.currentY);
      
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 25;
    } else {
      this.pdf.setTextColor(...this.primaryColor);
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(title, this.margin, this.currentY);
      
      // Add underline
      this.pdf.setDrawColor(...this.primaryColor);
      this.pdf.setLineWidth(1);
      this.pdf.line(this.margin, this.currentY + 2, this.pageWidth - this.margin, this.currentY + 2);
      
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 15;
    }
  }
}