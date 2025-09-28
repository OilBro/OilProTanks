import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { storage } from './storage';
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
} from './api653-calculations';
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
} from './api653-calculator';
import type { 
  InspectionReport,
  ThicknessMeasurement,
  InspectionChecklist,
  AppurtenanceInspection,
  RepairRecommendation,
  VentingSystemInspection,
  AdvancedSettlementSurvey,
  AdvancedSettlementMeasurement
} from '../shared/schema';

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
  }
}

// Extended types to handle calculated fields
interface ExtendedThicknessMeasurement extends ThicknessMeasurement {
  minRequiredThickness?: number;
  computedCorrosionRate?: number;
  computedRemainingLife?: number;
  computedStatus?: 'acceptable' | 'monitor' | 'action_required' | 'critical';
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
  measurements: ThicknessMeasurement[];
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
  
  // Extended checklists - use actual data without generating severity
  const extendedChecklists: ExtendedInspectionChecklist[] = checklists.map(c => ({
    ...c,
    // Don't generate severity - use only what's in the data
    severity: undefined
  }));
  
  // Map appurtenances - use actual data without defaults
  const extendedAppurtenances: ExtendedAppurtenanceInspection[] = appurtenances.map(a => ({
    ...a,
    component: a.appurtenanceType || undefined,
    action: a.recommendations || undefined,
    severity: undefined, // Don't derive from priority
    notes: a.findings || undefined
  }));

  // Map venting inspections - use actual data without defaults
  const extendedVentingInspections: ExtendedVentingSystemInspection[] = ventingInspections.map(v => ({
    ...v,
    component: v.ventId || undefined,
    type: v.ventType || undefined,
    size: v.setpoint || undefined,
    operationalStatus: v.testResults || undefined,
    notes: v.findings || undefined
  }));
  
  // Use actual settlement survey data - no local calculations
  let extendedSettlementSurvey: ExtendedAdvancedSettlementSurvey | null = null;
  
  // Find the most recent survey by surveyDate
  const latestSurvey = settlementSurveys && settlementSurveys.length > 0 
    ? settlementSurveys.reduce((latest, current) => {
        // If either survey doesn't have a date, prefer the one that does
        if (!latest.surveyDate) return current;
        if (!current.surveyDate) return latest;
        
        // Compare dates - use the most recent
        const latestDate = new Date(latest.surveyDate);
        const currentDate = new Date(current.surveyDate);
        return currentDate > latestDate ? current : latest;
      }, settlementSurveys[0])
    : null;
  
  if (latestSurvey) {
    const surveyMeasurements = latestSurvey.id ? settlementMeasurementsMap.get(latestSurvey.id) || [] : [];

    extendedSettlementSurvey = {
      ...latestSurvey,
      // Use actual survey data - don't provide defaults
      surveyMethod: latestSurvey.calculationMethod || undefined,
      measurementType: latestSurvey.surveyType || undefined,
      settlementRecommendations: latestSurvey.annexReference || undefined,
      measurements: surveyMeasurements,
      // Use server-calculated values if they exist
      calculatedTilt: latestSurvey.cosineAmplitude !== null && latestSurvey.cosineAmplitude !== undefined
        ? Number(latestSurvey.cosineAmplitude)
        : undefined,
      uniformSettlement: undefined
    };
  }

  // Extended recommendations - use actual data only
  const extendedRecommendations: ExtendedRepairRecommendation[] = recommendations.map(r => {
    // DO NOT generate cost estimates or timing
    // Only use what's actually in the recommendation data
    return {
      ...r,
      // Only use timing if it's in the actual data (e.g., from dueDate or estimatedCompletion)
      timing: r.dueDate || r.estimatedCompletion || undefined,
      // Don't estimate costs - leave undefined if not provided
      estimatedCost: undefined
    };
  });
  
  // These don't exist yet, so we'll use empty arrays for now
  const secondaryContainments: SecondaryContainment[] = [];
  const ndeTestLocations: NdeTestLocation[] = [];
  const visualDocumentations: VisualDocumentation[] = [];

  const reportData: ReportData = {
    report,
    measurements,
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
  private sectionNumber: number = 0;
  private subsectionNumber: number = 0;
  private tableOfContents: Array<{ title: string; page: number; level: number }> = [];
  private tableOfContentsPage: number | null = null;
  private defaultTopMargin: number = 40;
  private bottomMargin: number = 30;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(num) ? num : undefined;
  }

  private getInspectionAge(report: InspectionReport): number | null {
    if (report.yearsSinceLastInspection !== undefined && report.yearsSinceLastInspection !== null) {
      return report.yearsSinceLastInspection;
    }

    if (report.inspectionDate && report.lastInternalInspection) {
      const current = new Date(report.inspectionDate);
      const previous = new Date(report.lastInternalInspection);
      if (!isNaN(current.getTime()) && !isNaN(previous.getTime())) {
        const diffMs = current.getTime() - previous.getTime();
        if (diffMs > 0) {
          return diffMs / (1000 * 60 * 60 * 24 * 365.25);
        }
      }
    }

    return null;
  }

  private isShellMeasurement(measurement: ThicknessMeasurement): boolean {
    const componentText = measurement.component?.toLowerCase() || '';
    const locationText = measurement.location?.toLowerCase() || '';
    return measurement.measurementType === 'shell' ||
      componentText.includes('shell') ||
      componentText.includes('course') ||
      locationText.includes('course');
  }

  private extractCourseNumber(measurement: ThicknessMeasurement): number | null {
    const fields = [measurement.component, measurement.location, measurement.measurementType]
      .map(text => text ? String(text) : '')
      .join(' ');
    const match = fields.match(/course\s*(\d+)/i) || fields.match(/crs\s*(\d+)/i);
    if (match) {
      const course = parseInt(match[1], 10);
      return Number.isFinite(course) ? course : null;
    }
    return null;
  }

  private normalizeStatus(status?: string | null): 'acceptable' | 'monitor' | 'action_required' | 'critical' | null {
    if (!status) {
      return null;
    }
    const normalized = status.toString().trim().toLowerCase().replace(/\s+/g, '_');
    switch (normalized) {
      case 'acceptable':
      case 'ok':
      case 'within_limits':
        return 'acceptable';
      case 'monitor':
      case 'observe':
        return 'monitor';
      case 'action_required':
      case 'action-required':
      case 'actionrequired':
      case 'major':
        return 'action_required';
      case 'critical':
      case 'no_go':
      case 'no-go':
        return 'critical';
      default:
        return null;
    }
  }

  private formatStatusLabel(status: 'acceptable' | 'monitor' | 'action_required' | 'critical' | null): string {
    if (!status) {
      return 'N/A';
    }
    return status.replace('_', ' ').toUpperCase();
  }

  private getMeasurementStatus(measurement: ExtendedThicknessMeasurement): 'acceptable' | 'monitor' | 'action_required' | 'critical' | null {
    return this.normalizeStatus(measurement.computedStatus || (measurement.status as string | undefined));
  }

  private getMeasurementCorrosionRate(measurement: ExtendedThicknessMeasurement): number | undefined {
    if (measurement.computedCorrosionRate !== undefined && Number.isFinite(measurement.computedCorrosionRate)) {
      return measurement.computedCorrosionRate;
    }
    const parsed = this.parseNumber(measurement.corrosionRate);
    return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  }

  private getMeasurementRemainingLife(measurement: ExtendedThicknessMeasurement): number | undefined {
    if (measurement.computedRemainingLife !== undefined && Number.isFinite(measurement.computedRemainingLife)) {
      return measurement.computedRemainingLife;
    }
    const parsed = this.parseNumber(measurement.remainingLife);
    return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  }

  // Helper method to render numbers safely without NaN
  private renderNumber(value: any, decimals: number = 1, fallbackLabel: string = 'Not calculated'): string {
    const numValue = parseFloat(String(value));
    if (isNaN(numValue) || !isFinite(numValue)) {
      return fallbackLabel;
    }
    return numValue.toFixed(decimals);
  }

  // Layout engine helper methods
  private ensurePageBreak(requiredHeight: number = 50): void {
    if (this.currentY + requiredHeight > this.pageHeight - this.bottomMargin) {
      this.pdf.addPage();
      this.currentPage = this.pdf.getNumberOfPages();
      this.pdf.setPage(this.currentPage);
      this.currentY = this.defaultTopMargin;
    }
  }

  private addTextFlow(text: string, options?: {
    fontSize?: number;
    fontStyle?: string;
    color?: [number, number, number];
    indent?: number;
    lineHeight?: number;
  }): void {
    const opts = {
      fontSize: 10,
      fontStyle: 'normal',
      color: [0, 0, 0] as [number, number, number],
      indent: 0,
      lineHeight: 6,
      ...options
    };

    this.pdf.setFont('helvetica', opts.fontStyle);
    this.pdf.setFontSize(opts.fontSize);
    this.pdf.setTextColor(...opts.color);

    // Check for page break before adding text
    this.ensurePageBreak(opts.lineHeight + 5);

    this.pdf.text(text, this.margin + opts.indent, this.currentY);
    this.currentY += opts.lineHeight;
  }

  private addTableFlow(config: any, spacing: number = 10): void {
    // Ensure we have space for at least the header
    this.ensurePageBreak(30);

    const tableConfig = {
      ...config,
      startY: this.currentY,
      margin: {
        top: this.defaultTopMargin,
        bottom: this.bottomMargin,
        left: this.margin,
        right: this.margin,
        ...(config.margin || {})
      }
    };

    (this.pdf as any).autoTable(tableConfig);

    const lastTable = (this.pdf as any).lastAutoTable;
    if (lastTable && typeof lastTable.finalY === 'number') {
      this.currentY = lastTable.finalY + spacing;
    } else {
      this.currentY += spacing;
    }

    this.currentPage = this.pdf.getNumberOfPages();
    this.pdf.setPage(this.currentPage);
  }

  private addImageFlow(imageData: any, width: number, height: number, spacing: number = 10): void {
    // Check if image fits on current page
    this.ensurePageBreak(height + spacing);
    
    // Add the image at current position
    this.pdf.addImage(imageData, 'PNG', this.margin, this.currentY, width, height);
    
    // Advance currentY
    this.currentY += height + spacing;
  }

  private startNewSection(addNewPage: boolean = true): void {
    if (addNewPage) {
      this.pdf.addPage();
      this.currentPage = this.pdf.getNumberOfPages();
      this.pdf.setPage(this.currentPage);
    }
    this.currentY = this.defaultTopMargin;
  }

  private extendThicknessMeasurements(
    report: InspectionReport,
    measurements: ThicknessMeasurement[]
  ): ExtendedThicknessMeasurement[] {
    const diameter = this.parseNumber(report.diameter);
    const height = this.parseNumber(report.height);
    const specificGravity = this.parseNumber(report.specificGravity) ?? 1;
    const jointEfficiency = this.parseNumber((report as any).jointEfficiency) ?? 0.85;
    const allowableStress = this.parseNumber((report as any).designStress) ?? 23200;
    const inspectionAge = this.getInspectionAge(report);

    const shellCourseNumbers = new Set<number>();
    measurements.forEach(m => {
      const course = this.extractCourseNumber(m);
      if (course) {
        shellCourseNumbers.add(course);
      }
    });

    const totalCourses = shellCourseNumbers.size > 0
      ? Math.max(...Array.from(shellCourseNumbers.values()))
      : null;
    const averageCourseHeight = height !== undefined && totalCourses
      ? height / totalCourses
      : undefined;

    return measurements.map(measurement => {
      const courseNumber = this.extractCourseNumber(measurement);
      const originalThickness = this.parseNumber(measurement.originalThickness);
      const currentThickness = this.parseNumber(measurement.currentThickness);
      const existingCorrosionRate = this.parseNumber(measurement.corrosionRate);
      const existingRemainingLife = this.parseNumber(measurement.remainingLife);
      const existingStatus = this.normalizeStatus(measurement.status as string | undefined);

      let computedCorrosionRate = existingCorrosionRate !== undefined && Number.isFinite(existingCorrosionRate)
        ? existingCorrosionRate
        : undefined;
      let corrosionRateInches = computedCorrosionRate !== undefined
        ? computedCorrosionRate / 1000
        : undefined;

      if ((computedCorrosionRate === undefined || corrosionRateInches === undefined) &&
          inspectionAge !== null && inspectionAge > 0 &&
          originalThickness !== undefined &&
          currentThickness !== undefined) {
        const { rateInchesPerYear, rateMPY } = calculateCorrosionRate(
          originalThickness,
          currentThickness,
          inspectionAge
        );

        if (Number.isFinite(rateInchesPerYear) && rateInchesPerYear > 0) {
          corrosionRateInches = rateInchesPerYear;
          computedCorrosionRate = rateMPY;
        }
      }

      if (corrosionRateInches !== undefined) {
        if (!Number.isFinite(corrosionRateInches)) {
          corrosionRateInches = undefined;
        } else if (corrosionRateInches < 0) {
          corrosionRateInches = 0;
        }
      }
      if (computedCorrosionRate !== undefined) {
        if (!Number.isFinite(computedCorrosionRate)) {
          computedCorrosionRate = undefined;
        } else if (computedCorrosionRate < 0) {
          computedCorrosionRate = 0;
        }
      }

      let minRequiredThickness: number | undefined;
      if (this.isShellMeasurement(measurement) &&
          diameter !== undefined &&
          height !== undefined &&
          totalCourses &&
          courseNumber) {
        const courseHeight = averageCourseHeight ?? (height / totalCourses);
        const fillHeight = Math.max(height - courseHeight * (courseNumber - 1), courseHeight);
        const candidate = calculateMinimumRequiredThickness(
          courseNumber,
          diameter,
          specificGravity,
          fillHeight,
          jointEfficiency,
          allowableStress
        );

        if (Number.isFinite(candidate)) {
          minRequiredThickness = candidate;
        }
      }

      let computedRemainingLife = existingRemainingLife !== undefined &&
        Number.isFinite(existingRemainingLife) &&
        existingRemainingLife >= 0
          ? existingRemainingLife
          : undefined;

      if (computedRemainingLife === undefined &&
          minRequiredThickness !== undefined &&
          currentThickness !== undefined &&
          corrosionRateInches !== undefined) {
        if (corrosionRateInches > 0) {
          const candidate = calculateRemainingLife(
            currentThickness,
            minRequiredThickness,
            corrosionRateInches
          );

          if (Number.isFinite(candidate) && candidate >= 0) {
            computedRemainingLife = candidate;
          }
        } else if (corrosionRateInches === 0) {
          if (currentThickness > minRequiredThickness) {
            computedRemainingLife = 999;
          } else {
            computedRemainingLife = 0;
          }
        }
      }

      let computedStatus = existingStatus ?? undefined;
      if (minRequiredThickness !== undefined &&
          currentThickness !== undefined &&
          computedRemainingLife !== undefined) {
        computedStatus = determineInspectionStatus(
          computedRemainingLife,
          currentThickness,
          minRequiredThickness
        );
      }

      return {
        ...measurement,
        minRequiredThickness,
        computedCorrosionRate,
        computedRemainingLife,
        computedStatus
      } as ExtendedThicknessMeasurement;
    });
  }

  generate(data: ReportData): Buffer {
    const { report, measurements: rawMeasurements, checklists, appurtenances, recommendations,
            ventingInspections, settlementSurvey, secondaryContainments,
            ndeTestLocations, visualDocumentations } = data;

    const measurements = this.extendThicknessMeasurements(report, rawMeasurements);

    // Perform API 653 analysis
    const analysisData = this.performAnalysis(report, measurements);

    // Cover Page
    this.addCoverPage(report);

    // Reserve a page for the table of contents and move on to content
    this.tableOfContentsPage = this.createTableOfContentsPlaceholder();

    // Executive Summary with KPIs
    this.startNewSection(true);
    this.addEnhancedExecutiveSummary(report, measurements, analysisData);
    
    // Tank Information
    this.startNewSection(true);
    this.addComprehensiveTankInformation(report);
    
    // API 653 Calculation Analysis
    this.startNewSection(true);
    this.addAPI653CalculationAnalysis(analysisData, measurements);
    
    // Corrosion Rate Analysis
    this.startNewSection(true);
    this.addCorrosionRateAnalysis(measurements, analysisData);
    
    // Thickness Measurements with Analysis
    if (measurements.length > 0) {
      this.startNewSection(true);
      this.addEnhancedThicknessMeasurements(measurements, analysisData);
    }
    
    // Minimum Thickness Compliance Table
    this.startNewSection(true);
    this.addMinimumThicknessCompliance(measurements, analysisData);
    
    // Remaining Life Analysis with Criticality Matrix
    this.startNewSection(true);
    this.addRemainingLifeAnalysis(measurements, analysisData);
    
    // NDE Test Locations
    if (ndeTestLocations && ndeTestLocations.length > 0) {
      this.startNewSection(true);
      this.addNDETestLocations(ndeTestLocations);
    }
    
    // Inspection Checklist with Findings
    if (checklists.length > 0) {
      this.startNewSection(true);
      this.addEnhancedInspectionChecklist(checklists);
    }
    
    // Appurtenances
    if (appurtenances.length > 0) {
      this.startNewSection(true);
      this.addEnhancedAppurtenances(appurtenances);
    }
    
    // Venting System
    if (ventingInspections.length > 0) {
      this.startNewSection(true);
      this.addEnhancedVentingSystem(ventingInspections);
    }
    
    // Settlement Analysis
    if (settlementSurvey) {
      this.startNewSection(true);
      this.addEnhancedSettlementAnalysis(settlementSurvey);
    }
    
    // Secondary Containment Calculations
    if (secondaryContainments && secondaryContainments.length > 0) {
      this.startNewSection(true);
      this.addSecondaryContainmentAnalysis(secondaryContainments, report);
    }
    
    // Detailed Findings Section
    this.startNewSection(true);
    this.addDetailedFindings(measurements, checklists, appurtenances, analysisData);
    
    // Comprehensive Recommendations
    this.startNewSection(true);
    this.addComprehensiveRecommendations(recommendations, analysisData);
    
    // Next Inspection Intervals
    this.startNewSection(true);
    this.addNextInspectionIntervals(analysisData, report);
    
    // Conclusion
    this.startNewSection(true);
    this.addConclusion(report, analysisData);

    if (this.tableOfContentsPage !== null) {
      this.renderTableOfContents();
    }

    // Add headers and footers to all pages
    this.addHeadersAndFooters(report);

    // Convert PDF to buffer
    const pdfOutput = this.pdf.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  private performAnalysis(report: InspectionReport, measurements: ExtendedThicknessMeasurement[]): AnalysisData {
    const diameter = this.parseNumber(report.diameter);
    const height = this.parseNumber(report.height);
    const specificGravity = this.parseNumber(report.specificGravity) ?? 1;
    const jointEfficiency = this.parseNumber((report as any).jointEfficiency) ?? 0.85;
    const allowableStress = this.parseNumber((report as any).designStress) ?? 23200;
    const inspectionAge = this.getInspectionAge(report);

    const shellMeasurements = measurements.filter(m => this.isShellMeasurement(m));
    const courseGroups = new Map<number, ExtendedThicknessMeasurement[]>();
    shellMeasurements.forEach(measurement => {
      const courseNumber = this.extractCourseNumber(measurement);
      if (courseNumber) {
        if (!courseGroups.has(courseNumber)) {
          courseGroups.set(courseNumber, []);
        }
        courseGroups.get(courseNumber)!.push(measurement);
      }
    });

    const courseNumbers = Array.from(courseGroups.keys());
    const totalCourses = courseNumbers.length > 0
      ? Math.max(...courseNumbers)
      : null;
    const courseHeight = height !== undefined && totalCourses
      ? height / totalCourses
      : undefined;

    const shellCourses: ShellCourseData[] = [];
    courseGroups.forEach((courseMeasurements, courseNumber) => {
      const calculations: ThicknessCalculation[] = [];
      let originalAccumulator = 0;
      let originalCount = 0;
      let courseMinimumRequired: number | undefined;

      courseMeasurements.forEach(measurement => {
        const original = this.parseNumber(measurement.originalThickness);
        const current = this.parseNumber(measurement.currentThickness);
        if (original === undefined || current === undefined) {
          return;
        }

        originalAccumulator += original;
        originalCount++;

        let minimumRequired = measurement.minRequiredThickness;
        if (minimumRequired === undefined && diameter !== undefined && height !== undefined && totalCourses) {
          const effectiveCourseHeight = courseHeight ?? (height / totalCourses);
          const fillHeight = Math.max(height - effectiveCourseHeight * (courseNumber - 1), effectiveCourseHeight);
          minimumRequired = calculateMinimumRequiredThickness(
            courseNumber,
            diameter,
            specificGravity,
            fillHeight,
            jointEfficiency,
            allowableStress
          );
        }

        if (minimumRequired === undefined) {
          return;
        }

        courseMinimumRequired = courseMinimumRequired !== undefined
          ? Math.max(courseMinimumRequired, minimumRequired)
          : minimumRequired;

        let corrosionRateMPY = measurement.computedCorrosionRate ?? this.parseNumber(measurement.corrosionRate);
        let corrosionRateInches = corrosionRateMPY !== undefined ? corrosionRateMPY / 1000 : undefined;
        if ((corrosionRateInches === undefined || !Number.isFinite(corrosionRateInches)) &&
            inspectionAge !== null && inspectionAge > 0) {
          const { rateInchesPerYear, rateMPY } = calculateCorrosionRate(original, current, inspectionAge);
          corrosionRateInches = rateInchesPerYear;
          corrosionRateMPY = rateMPY;
        }

        if (corrosionRateInches === undefined || !Number.isFinite(corrosionRateInches)) {
          corrosionRateInches = 0;
          corrosionRateMPY = 0;
        }

        let remainingLife = measurement.computedRemainingLife ?? this.parseNumber(measurement.remainingLife);
        if ((remainingLife === undefined || !Number.isFinite(remainingLife)) && corrosionRateInches > 0) {
          remainingLife = calculateRemainingLife(current, minimumRequired, corrosionRateInches);
        } else if (remainingLife === undefined) {
          remainingLife = corrosionRateInches === 0 ? 999 : undefined;
        }

        if (remainingLife === undefined || !Number.isFinite(remainingLife)) {
          remainingLife = 999;
        }

        const status = this.normalizeStatus(measurement.computedStatus || (measurement.status as string | undefined)) ??
          determineInspectionStatus(remainingLife, current, minimumRequired);

        calculations.push({
          originalThickness: original,
          currentThickness: current,
          thicknessLoss: original - current,
          corrosionRate: corrosionRateInches,
          corrosionRateMPY: corrosionRateMPY ?? corrosionRateInches * 1000,
          remainingLife,
          status
        });
      });

      if (calculations.length > 0) {
        const averageOriginal = originalCount > 0
          ? originalAccumulator / originalCount
          : calculations[0].originalThickness;
        const minimumRequired = courseMinimumRequired ?? calculations[0].currentThickness;

        shellCourses.push({
          courseNumber,
          height: courseHeight ?? 0,
          originalThickness: averageOriginal,
          minimumRequired,
          measurements: calculations
        });
      }
    });

    const tankInspectionIntervals = shellCourses.length > 0
      ? calculateTankInspectionIntervals(shellCourses)
      : { externalInterval: NaN, internalInterval: NaN };

    const totalMeasurements = measurements.length;
    const completedMeasurements = measurements.filter(m => this.parseNumber(m.currentThickness) !== undefined).length;

    const statusCounts: Record<'critical' | 'action_required' | 'monitor' | 'acceptable', number> = {
      critical: 0,
      action_required: 0,
      monitor: 0,
      acceptable: 0
    };

    let minRemainingLife = Number.POSITIVE_INFINITY;
    measurements.forEach(measurement => {
      const status = this.normalizeStatus(measurement.computedStatus || (measurement.status as string | undefined));
      if (status) {
        statusCounts[status] += 1;
      }

      const remainingLife = measurement.computedRemainingLife ?? this.parseNumber(measurement.remainingLife);
      if (remainingLife !== undefined && Number.isFinite(remainingLife) && remainingLife < minRemainingLife) {
        minRemainingLife = remainingLife;
      }
    });

    const overallStatus: KPIMetrics['overallStatus'] = statusCounts.critical > 0
      ? 'NO-GO'
      : statusCounts.action_required > 0
        ? 'CONDITIONAL'
        : totalMeasurements > 0
          ? 'GO'
          : 'CONDITIONAL';

    const nextInspectionDue = !isNaN(tankInspectionIntervals.internalInterval)
      ? new Date(new Date().setFullYear(new Date().getFullYear() + tankInspectionIntervals.internalInterval))
      : new Date();

    const kpiMetrics: KPIMetrics = {
      percentTMLsComplete: totalMeasurements > 0 ? (completedMeasurements / totalMeasurements) * 100 : 0,
      minRemainingLife: minRemainingLife === Number.POSITIVE_INFINITY ? NaN : minRemainingLife,
      criticalFindings: statusCounts.critical,
      majorFindings: statusCounts.action_required,
      minorFindings: statusCounts.monitor,
      overallStatus,
      nextInspectionDue
    };

    let calculationResults: CalculationResults[] = [];
    const components: ComponentThickness[] = measurements
      .filter(m => this.parseNumber(m.originalThickness) !== undefined && this.parseNumber(m.currentThickness) !== undefined)
      .map(m => {
        const original = this.parseNumber(m.originalThickness)!;
        const current = this.parseNumber(m.currentThickness)!;
        const currentDate = report.inspectionDate ? new Date(report.inspectionDate) : new Date();
        const previousDate = report.lastInternalInspection
          ? new Date(report.lastInternalInspection)
          : (inspectionAge !== null
              ? new Date(currentDate.getTime() - inspectionAge * 365.25 * 24 * 60 * 60 * 1000)
              : currentDate);

        return {
          component: m.component || '',
          nominalThickness: original,
          currentThickness: current,
          corrosionAllowance: 0,
          dateCurrent: currentDate,
          datePrevious: previousDate
        };
      });

    if (components.length > 0 && diameter !== undefined && height !== undefined) {
      const tankParams: TankParameters = {
        diameter,
        height,
        specificGravity,
        jointEfficiency,
        yieldStrength: this.parseNumber((report as any).yieldStrength) ?? 30000,
        designStress: allowableStress,
        yearsInService: inspectionAge ?? 0
      };

      calculationResults = performAPI653Evaluation(components, tankParams);
    }

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

  private createTableOfContentsPlaceholder(): number {
    this.startNewSection(true);
    const pageIndex = this.pdf.getNumberOfPages();
    this.currentPage = pageIndex;
    this.currentY = this.defaultTopMargin;
    return pageIndex;
  }

  private renderTableOfContents(): void {
    if (this.tableOfContentsPage === null) {
      return;
    }

    const entries = [...this.tableOfContents].sort((a, b) => a.page - b.page);

    this.pdf.setPage(this.tableOfContentsPage);
    this.currentPage = this.tableOfContentsPage;
    this.currentY = this.defaultTopMargin;

    this.pdf.setTextColor(...this.primaryColor);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(16);
    this.pdf.text('TABLE OF CONTENTS', this.margin, this.currentY);
    this.currentY += 12;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(60, 60, 60);

    entries.forEach(entry => {
      if (this.currentY > this.pageHeight - this.bottomMargin) {
        this.pdf.addPage();
        this.currentPage = this.pdf.getNumberOfPages();
        this.pdf.setPage(this.currentPage);
        this.currentY = this.defaultTopMargin;

        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(...this.primaryColor);
        this.pdf.text('TABLE OF CONTENTS (cont.)', this.margin, this.currentY);
        this.currentY += 10;

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(60, 60, 60);
      }

      const indent = entry.level > 1 ? 8 : 0;
      const displayTitle = entry.title;
      const displayPage = entry.page > 1 ? entry.page - 1 : entry.page;

      if (this.pdf.setLineDash) {
        this.pdf.setLineDash([1, 1], 0);
      }
      this.pdf.setDrawColor(220, 220, 220);
      this.pdf.line(this.margin + indent, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1);
      if (this.pdf.setLineDash) {
        this.pdf.setLineDash([]);
      }

      this.pdf.setTextColor(40, 40, 40);
      this.pdf.text(displayTitle, this.margin + indent, this.currentY);

      this.pdf.setTextColor(120, 120, 120);
      this.pdf.text(displayPage.toString(), this.pageWidth - this.margin, this.currentY, { align: 'right' });

      this.currentY += 8;
    });

    const lastPage = this.pdf.getNumberOfPages();
    this.pdf.setPage(lastPage);
    this.currentPage = lastPage;
    this.currentY = this.defaultTopMargin;
    this.pdf.setTextColor(0, 0, 0);
  }

  private addEnhancedExecutiveSummary(report: InspectionReport, measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.addSectionHeader('1.0 EXECUTIVE SUMMARY', true, true);
    
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
      `• Inspection Completion: ${this.renderNumber(kpiMetrics.percentTMLsComplete, 1, 'Not calculated')}%`,
      `• Critical Findings: ${kpiMetrics.criticalFindings}`,
      `• Major Findings: ${kpiMetrics.majorFindings}`,
      `• Minor Findings: ${kpiMetrics.minorFindings}`,
      `• Minimum Remaining Life: ${this.renderNumber(kpiMetrics.minRemainingLife, 1, 'Not calculated')} years`,
      ``,
      `IMMEDIATE ACTIONS REQUIRED: ${kpiMetrics.criticalFindings > 0 ? 'YES - See recommendations section' : 'None'}`,
      ``,
      `The tank is currently ${report.status === 'In Service' ? 'IN SERVICE' : report.status?.toUpperCase() || 'UNDER EVALUATION'}.`
    ];
    
    summaryText.forEach(line => {
      this.ensurePageBreak(10);
      
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
    this.ensurePageBreak(40);

    const boxWidth = 38;
    const boxHeight = 25;
    const spacing = 5;
    const startX = this.margin;
    
    // Validate and format values with null checking
    const overallStatus = kpiMetrics.overallStatus || 'PENDING';
    const completionPercent = kpiMetrics.percentTMLsComplete !== null && kpiMetrics.percentTMLsComplete !== undefined 
      ? kpiMetrics.percentTMLsComplete : 0;
    const criticalFindings = kpiMetrics.criticalFindings || 0;
    const majorFindings = kpiMetrics.majorFindings || 0;
    const minRemainingLife = kpiMetrics.minRemainingLife !== null && kpiMetrics.minRemainingLife !== undefined 
      ? kpiMetrics.minRemainingLife : 999;
    
    // Overall Status Box
    let currentX = startX;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'OVERALL STATUS',
      overallStatus,
      this.getStatusColor(overallStatus)
    );
    
    // Completion Percentage
    currentX += boxWidth + spacing;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'COMPLETION',
      `${this.renderNumber(completionPercent, 0, 'N/A')}%`,
      completionPercent >= 95 ? this.accentColor : 
      completionPercent >= 80 ? this.warningColor : this.secondaryColor
    );
    
    // Critical Findings
    currentX += boxWidth + spacing;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'CRITICAL',
      criticalFindings.toString(),
      criticalFindings > 0 ? this.secondaryColor : this.accentColor
    );
    
    // Min Remaining Life
    currentX += boxWidth + spacing;
    const remainingLifeText = minRemainingLife === 999 || isNaN(minRemainingLife) || !isFinite(minRemainingLife) ? 'N/A' : 
                             minRemainingLife === 0 ? 'IMMEDIATE' :
                             `${this.renderNumber(minRemainingLife, 1, 'N/A')} yrs`;
    this.drawKPIBox(
      currentX,
      this.currentY,
      boxWidth,
      boxHeight,
      'MIN. LIFE',
      remainingLifeText,
      minRemainingLife < 2 ? this.secondaryColor : 
        minRemainingLife < 5 ? this.warningColor : this.accentColor
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
    this.addSectionHeader('2.0 TANK INFORMATION', true, true);
    
    // Basic Information
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('IDENTIFICATION & SERVICE', this.margin, this.currentY);
    this.currentY += 8;
    
    const basicInfo = [
      ['Tank ID', report.tankId || 'Not provided'],
      ['Customer', report.customer || 'Not provided'],
      ['Location', report.location || 'Not provided'],
      ['Service/Product', report.service || 'Not provided'],
      ['Current Status', report.status || 'Not provided']
    ];
    
    this.addInfoTable(basicInfo);
    
    // Design & Construction
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('DESIGN & CONSTRUCTION', this.margin, this.currentY);
    this.currentY += 8;
    
    const designInfo = [
      ['Diameter', report.diameter ? `${report.diameter}${report.diameterUnit ? ' ' + report.diameterUnit : ''}` : 'Not provided'],
      ['Height', report.height ? `${report.height}${report.heightUnit ? ' ' + report.heightUnit : ''}` : 'Not provided'],
      ['Capacity', report.capacity ? `${report.capacity}${report.capacityUnit ? ' ' + report.capacityUnit : ''}` : 'Not provided'],
      ['Year Built', report.yearBuilt || 'Not provided'],
      ['Construction Standard', report.constructionStandard || 'Not provided'],
      ['Design Code', report.designCode || 'Not provided'],
      ['Shell Material', report.shellMaterial || 'Not provided'],
      ['Original Shell Thickness', report.originalThickness ? `${report.originalThickness} in` : 'Not provided'],
      ['Specific Gravity', report.specificGravity || 'Not provided'],
      ['Foundation Type', report.foundationType || 'Not provided'],
      ['Roof Type', report.roofType || 'Not provided']
    ];
    
    this.addInfoTable(designInfo);
    
    // Inspection History
    this.currentY += 10;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    this.pdf.text('INSPECTION HISTORY', this.margin, this.currentY);
    this.currentY += 8;
    
    const historyInfo = [
      ['Current Inspection Date', report.inspectionDate || 'Not provided'],
      ['Last Internal Inspection', report.lastInternalInspection || 'Not provided'],
      ['Years Since Last Inspection', report.yearsSinceLastInspection !== null && report.yearsSinceLastInspection !== undefined ? String(report.yearsSinceLastInspection) : 'Not provided'],
      ['Tank Age', report.tankAge !== null && report.tankAge !== undefined ? `${report.tankAge} years` : 'Not provided'],
      ['Inspector', report.inspector || 'Not provided'],
      ['API 653 Certification', report.inspectorCertification || 'Not provided'],
      ['Reviewer', report.reviewer || 'Not provided']
    ];
    
    this.addInfoTable(historyInfo);
  }

  private addInfoTable(data: string[][]) {
    this.addTableFlow({
      body: data,
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
    }, 5);
  }

  private addAPI653CalculationAnalysis(analysisData: AnalysisData, measurements: ExtendedThicknessMeasurement[]) {
    this.addSectionHeader('3.0 API 653 CALCULATION ANALYSIS', true, true);
    
    // Summary of calculations
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    // Check if we have valid analysis data
    if (analysisData.shellCourses.length === 0) {
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text('API 653 thickness calculations could not be performed due to missing data.', this.margin, this.currentY);
      this.currentY += 8;
      this.pdf.text('Shell course analysis requires accurate course height data which is not available.', this.margin, this.currentY);
      this.currentY += 15;
      
      // Show what measurements we do have without calculations
      const shellMeasurements = measurements.filter(m => 
        m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')
      );
      
      if (shellMeasurements.length > 0) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text('SHELL THICKNESS MEASUREMENTS (WITHOUT ANALYSIS)', this.margin, this.currentY);
        this.currentY += 8;
        
        // Show raw measurements only
        const shellData = shellMeasurements.map(m => [
          m.component || 'Not specified',
          m.originalThickness ? this.renderNumber(m.originalThickness, 3, 'Not provided') : 'Not provided',
          m.currentThickness ? this.renderNumber(m.currentThickness, 3, 'Not measured') : 'Not measured',
          'Not calculated', // min required
          'Not calculated', // corrosion rate
          'Not calculated', // remaining life
          'Requires analysis' // status
        ]);
        
        this.addTableFlow({
          head: [['Component', 'Original (in)', 'Current (in)', 't-min (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
          body: shellData,
          theme: 'striped',
          headStyles: {
            fillColor: this.primaryColor,
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [100, 100, 100]
          },
          margin: { left: this.margin }
        }, 10);
      }
      return;
    }
    
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
    
    const shellData = analysisData.shellCourses && analysisData.shellCourses.length > 0
      ? analysisData.shellCourses.map(course => {
        const worstMeasurement = course.measurements.reduce((worst, current) => 
          current.remainingLife < worst.remainingLife ? current : worst,
          course.measurements[0] || { remainingLife: 999 }
        );
        
        return [
          `Course ${course.courseNumber}`,
          this.renderNumber(course.originalThickness, 3, 'N/A'),
          this.renderNumber(course.minimumRequired, 3, 'N/A'),
          worstMeasurement?.currentThickness ? this.renderNumber(worstMeasurement.currentThickness, 3, 'N/A') : 'N/A',
          worstMeasurement?.corrosionRateMPY ? this.renderNumber(worstMeasurement.corrosionRateMPY, 1, 'N/A') : 'N/A',
          worstMeasurement?.remainingLife ? this.renderNumber(worstMeasurement.remainingLife, 1, 'N/A') : 'N/A',
          this.formatStatusLabel(worstMeasurement?.status ?? null)
        ];
      })
      : shellMeasurements.map(m => {
        const corrosionRate = this.getMeasurementCorrosionRate(m);
        const remainingLife = this.getMeasurementRemainingLife(m);
        const statusLabel = this.formatStatusLabel(this.getMeasurementStatus(m));

        return [
          m.component || 'Not specified',
          m.originalThickness ? this.renderNumber(m.originalThickness, 3, 'Not provided') : 'Not provided',
          m.minRequiredThickness ? this.renderNumber(m.minRequiredThickness, 3, 'Not calculated') : 'Not calculated',
          m.currentThickness ? this.renderNumber(m.currentThickness, 3, 'Not measured') : 'Not measured',
          corrosionRate !== undefined ? this.renderNumber(corrosionRate, 1, 'Not calculated') : 'Not calculated',
          remainingLife !== undefined ? this.renderNumber(remainingLife, 1, 'Not calculated') : 'Not calculated',
          statusLabel
        ];
      });
    
    if (shellData.length > 0 || shellMeasurements.length > 0) {
      this.addTableFlow({
        head: [['Course', 'Original\n(in)', 't-min\n(in)', 'Current\n(in)', 'CR\n(mpy)', 'RL\n(years)', 'Status']],
        body: shellData,
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
      }, 10);
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
    this.addSectionHeader('4.0 CORROSION RATE ANALYSIS', true, true);
    
    // Corrosion rate trends by component
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CORROSION RATE TRENDS', this.margin, this.currentY);
    this.currentY += 8;
    
    // Group by component type - use measurementType or component
    const shellRates = measurements
      .filter(m => (m.measurementType === 'shell' || m.component?.toLowerCase().includes('shell')))
      .map(m => this.getMeasurementCorrosionRate(m))
      .filter((rate): rate is number => rate !== undefined);

    const bottomRates = measurements
      .filter(m => (m.measurementType === 'bottom_plate' || m.component?.toLowerCase().includes('bottom')))
      .map(m => this.getMeasurementCorrosionRate(m))
      .filter((rate): rate is number => rate !== undefined);
    
    const avgShellRate = shellRates.length > 0 ? 
      shellRates.reduce((a, b) => a + b, 0) / shellRates.length : 0;
    const maxShellRate = shellRates.length > 0 ? Math.max(...shellRates) : 0;
    
    const avgBottomRate = bottomRates.length > 0 ?
      bottomRates.reduce((a, b) => a + b, 0) / bottomRates.length : 0;
    const maxBottomRate = bottomRates.length > 0 ? Math.max(...bottomRates) : 0;
    
    const rateData = [
      ['Shell - Average', this.renderNumber(avgShellRate, 2, 'Not calculated'), this.getCorrosionCategory(avgShellRate)],
      ['Shell - Maximum', this.renderNumber(maxShellRate, 2, 'Not calculated'), this.getCorrosionCategory(maxShellRate)],
      ['Bottom - Average', this.renderNumber(avgBottomRate, 2, 'Not calculated'), this.getCorrosionCategory(avgBottomRate)],
      ['Bottom - Maximum', this.renderNumber(maxBottomRate, 2, 'Not calculated'), this.getCorrosionCategory(maxBottomRate)]
    ];
    
    this.addTableFlow({
      head: [['Component', 'Corrosion Rate (mpy)', 'Category']],
      body: rateData,
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
    }, 10);
    
    // Corrosion predictions
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CORROSION PREDICTIONS', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    const predictions = [
      `Based on current corrosion rates:`,
      `• Shell will reach minimum thickness in ${this.renderNumber(analysisData.kpiMetrics.minRemainingLife, 1, 'Not calculated')} years`,
      `• Projected thickness loss over next 5 years: ${this.renderNumber(maxShellRate * 5 / 1000, 3, 'Not calculated')} inches`,
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
    this.addSectionHeader('5.0 THICKNESS MEASUREMENTS', true, true);
    
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
      
      const shellData = shellMeasurements.map(m => {
        const corrosionRate = this.getMeasurementCorrosionRate(m);
        const remainingLife = this.getMeasurementRemainingLife(m);
        const statusLabel = this.formatStatusLabel(this.getMeasurementStatus(m));

        return [
          m.location || 'N/A',
          m.component || 'N/A',
          m.originalThickness ? this.renderNumber(m.originalThickness, 3, 'N/A') : 'N/A',
          m.currentThickness ? this.renderNumber(m.currentThickness, 3, 'N/A') : 'N/A',
          m.minRequiredThickness ? this.renderNumber(m.minRequiredThickness, 3, 'N/A') : 'N/A',
          corrosionRate !== undefined ? this.renderNumber(corrosionRate, 1, 'N/A') : 'N/A',
          remainingLife !== undefined ? this.renderNumber(remainingLife, 1, 'N/A') : 'N/A',
          statusLabel
        ];
      });
      
      this.addTableFlow({
        head: [['Location', 'Component', 'Original\n(in)', 'Current\n(in)', 't-min\n(in)', 'CR\n(mpy)', 'RL\n(yrs)', 'Status']],
        body: shellData,
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
      }, 10);
    }
    
    // Bottom Measurements - skip section entirely if no data exists (as requested)
    if (bottomMeasurements.length > 0) {
      // Ensure space for bottom measurements section
      this.ensurePageBreak(50);
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('BOTTOM PLATE MEASUREMENTS', this.margin, this.currentY);
      this.currentY += 8;
      
      const bottomData = bottomMeasurements.map(m => {
        const corrosionRate = this.getMeasurementCorrosionRate(m);
        const remainingLife = this.getMeasurementRemainingLife(m);
        const statusLabel = this.formatStatusLabel(this.getMeasurementStatus(m));

        return [
          m.location || 'N/A',
          m.currentThickness ? this.renderNumber(m.currentThickness, 3, 'N/A') : 'N/A',
          m.originalThickness ? this.renderNumber(m.originalThickness, 3, 'N/A') : 'N/A',
          m.minRequiredThickness ? this.renderNumber(m.minRequiredThickness, 3, 'Not calculated') : 'Not calculated',
          corrosionRate !== undefined ? this.renderNumber(corrosionRate, 1, 'N/A') : 'N/A',
          remainingLife !== undefined ? this.renderNumber(remainingLife, 1, 'N/A') : 'N/A',
          statusLabel
        ];
      });
      
      this.addTableFlow({
        head: [['Location', 'Current (in)', 'Original (in)', 't-min (in)', 'CR (mpy)', 'RL (yrs)', 'Status']],
        body: bottomData,
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
      }, 10);
    }
  }

  private addMinimumThicknessCompliance(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.addSectionHeader('6.0 MINIMUM THICKNESS COMPLIANCE', true, true);
    
    // Check if we have the data needed for compliance analysis
    const measurementsWithMinThickness = measurements.filter(m => 
      m.minRequiredThickness !== undefined && m.currentThickness !== undefined
    );
    
    if (measurementsWithMinThickness.length === 0) {
      // No valid compliance data available
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text('Insufficient data for minimum thickness compliance analysis.', this.margin, this.currentY);
      this.currentY += 8;
      this.pdf.text('Minimum required thickness calculations require complete measurement data.', this.margin, this.currentY);
      this.currentY += 15;
      return;
    }
    
    // Compliance summary - only for measurements with valid min thickness
    const compliantCount = measurementsWithMinThickness.filter(m => {
      const current = parseFloat(String(m.currentThickness));
      const min = m.minRequiredThickness!;
      return current >= min;
    }).length;
    
    const nonCompliantCount = measurementsWithMinThickness.length - compliantCount;
    const complianceRate = (compliantCount / measurementsWithMinThickness.length) * 100;
    
    // Compliance overview box
    const bgColor: [number, number, number] = complianceRate === 100 ? [240, 255, 240] : [255, 245, 245];
    this.pdf.setFillColor(...bgColor);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 30, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(12);
    const textColor: [number, number, number] = complianceRate === 100 ? this.accentColor : this.secondaryColor;
    this.pdf.setTextColor(...textColor);
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
      
      this.addTableFlow({
        head: [['Location', 'Component', 'Current (in)', 't-min (in)', 'Deficit (mils)', 'Action']],
        body: nonCompliantData,
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
      }, 10);
    }
    
    // API 653 reference
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text('* Minimum thickness calculated per API 653 Section 4.3.3.1 using one-foot method', this.margin, this.currentY);
  }

  private addRemainingLifeAnalysis(measurements: ExtendedThicknessMeasurement[], analysisData: AnalysisData) {
    this.addSectionHeader('7.0 REMAINING LIFE ANALYSIS', true, true);
    
    // Check if we have valid remaining life data
    const measurementsWithRemainingLife = measurements.filter(m =>
      this.getMeasurementRemainingLife(m) !== undefined
    );
    
    if (measurementsWithRemainingLife.length === 0) {
      // No valid remaining life data available
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text('Insufficient data for remaining life analysis.', this.margin, this.currentY);
      this.currentY += 8;
      this.pdf.text('Remaining life calculations require corrosion rate and thickness measurements.', this.margin, this.currentY);
      this.currentY += 15;
      return;
    }
    
    // Criticality Matrix
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('CRITICALITY MATRIX', this.margin, this.currentY);
    this.currentY += 8;
    
    // Define criticality categories - only for valid measurements
    const critical = measurementsWithRemainingLife.filter(m => {
      const rl = this.getMeasurementRemainingLife(m);
      return rl !== undefined && rl < 2;
    });
    const high = measurementsWithRemainingLife.filter(m => {
      const rl = this.getMeasurementRemainingLife(m);
      return rl !== undefined && rl >= 2 && rl < 5;
    });
    const medium = measurementsWithRemainingLife.filter(m => {
      const rl = this.getMeasurementRemainingLife(m);
      return rl !== undefined && rl >= 5 && rl < 10;
    });
    const low = measurementsWithRemainingLife.filter(m => {
      const rl = this.getMeasurementRemainingLife(m);
      return rl !== undefined && rl >= 10;
    });
    
    const matrixData = [
      ['CRITICAL (<2 years)', critical.length.toString(), critical.map(m => m.location).join(', ') || 'None'],
      ['HIGH (2-5 years)', high.length.toString(), high.slice(0, 3).map(m => m.location).join(', ') + (high.length > 3 ? '...' : '') || 'None'],
      ['MEDIUM (5-10 years)', medium.length.toString(), medium.slice(0, 3).map(m => m.location).join(', ') + (medium.length > 3 ? '...' : '') || 'None'],
      ['LOW (>10 years)', low.length.toString(), low.length > 0 ? 'Multiple locations' : 'None']
    ];
    
    this.addTableFlow({
      head: [['Risk Category', 'Count', 'Locations']],
      body: matrixData,
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
    }, 10);
    
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
      this.ensurePageBreak(10);
      this.pdf.text(rec, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addNDETestLocations(ndeTestLocations: NdeTestLocation[]) {
    this.addSectionHeader('8.0 NDE TEST LOCATIONS', true, true);
    
    const ndeData = ndeTestLocations.map(location => [
      location.location || 'N/A',
      location.testType || 'N/A',
      location.extent || 'N/A',
      location.findings || 'No indications',
      location.followUp || 'None required'
    ]);
    
    this.addTableFlow({
      head: [['Location', 'Test Type', 'Extent', 'Findings', 'Follow-up']],
      body: ndeData,
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
    }, 10);
  }

  private addEnhancedInspectionChecklist(checklists: ExtendedInspectionChecklist[]) {
    this.addSectionHeader('9.0 INSPECTION CHECKLIST', true, true);
    
    // Group by category
    const categories = ['external', 'internal', 'foundation', 'appurtenances', 'safety'];
    
    categories.forEach(category => {
      const items = checklists.filter(item => item.category === category);
      
      if (items.length > 0) {
        this.ensurePageBreak(50);
        
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
        
        this.addTableFlow({
          head: [['Item', 'Status', 'Severity', 'Notes']],
          body: checklistData,
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
        }, 10);
      }
    });
  }

  private addEnhancedAppurtenances(appurtenances: ExtendedAppurtenanceInspection[]) {
    this.addSectionHeader('10.0 APPURTENANCE INSPECTIONS', true, true);
    
    const appurtenanceData = appurtenances.map(item => [
      item.component || 'N/A',
      item.location || 'N/A',
      item.condition || 'N/A',
      item.severity || 'Normal',
      item.action || 'Monitor',
      item.notes || 'No issues'
    ]);
    
    this.addTableFlow({
      head: [['Component', 'Location', 'Condition', 'Severity', 'Action', 'Notes']],
      body: appurtenanceData,
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
    }, 10);
  }

  private addEnhancedVentingSystem(ventingInspections: ExtendedVentingSystemInspection[]) {
    this.addSectionHeader('11.0 VENTING SYSTEM INSPECTION', true, true);
    
    const ventingData = ventingInspections.map(item => [
      item.component || 'N/A',
      item.type || 'N/A',
      item.size || 'N/A',
      item.condition || 'N/A',
      item.operationalStatus || 'N/A',
      item.testResults || 'Not tested',
      item.notes || 'No issues'
    ]);
    
    this.addTableFlow({
      head: [['Component', 'Type', 'Size', 'Condition', 'Status', 'Test Results', 'Notes']],
      body: ventingData,
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
    }, 10);
  }

  private addEnhancedSettlementAnalysis(survey: ExtendedAdvancedSettlementSurvey) {
    this.addSectionHeader('12.0 SETTLEMENT ANALYSIS', true, true);
    
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
    
    this.addTableFlow({
      body: summaryData,
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
    }, 10);
    
    // Individual Measurement Points Table
    if (survey.measurements && survey.measurements.length > 0) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('ELEVATION MEASUREMENT POINTS', this.margin, this.currentY);
      this.currentY += 8;
      
      const measurementData = survey.measurements.map(m => [
        m.pointNumber?.toString() || '',
        m.angle !== null && m.angle !== undefined ? this.renderNumber(m.angle, 1, '') : '',
        m.measuredElevation !== null && m.measuredElevation !== undefined ? this.renderNumber(m.measuredElevation, 3, 'Not provided') : 'Not provided',
        m.cosineFitElevation !== null && m.cosineFitElevation !== undefined ? this.renderNumber(m.cosineFitElevation, 3, '') : '',
        m.outOfPlane !== null && m.outOfPlane !== undefined ? this.renderNumber(m.outOfPlane, 3, '') : ''
      ]);
      
      this.addTableFlow({
        head: [['Point #', 'Angle (°)', 'Measured (in)', 'Cosine Fit (in)', 'Out of Plane (in)']],
        body: measurementData,
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
      }, 10);
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
      const equation = `U(θ) = ${this.renderNumber(cosineAmplitude, 3, 'N/A')} × cos(θ - ${this.renderNumber(cosinePhase * 180 / Math.PI, 1, 'N/A')}°)`;
      this.pdf.text(`Equation: ${equation}`, this.margin + 5, this.currentY);
      this.currentY += 6;
      
      const cosineFitData = [
        ['Cosine Amplitude (A)', `${this.renderNumber(cosineAmplitude, 4, 'Not calculated')} inches`],
        ['Phase Angle (B)', `${this.renderNumber(cosinePhase * 180 / Math.PI, 2, 'Not calculated')} degrees`],
        ['R² Value', `${this.renderNumber(rSquared, 4, 'Not calculated')}`],
        ['R² Requirement', '≥ 0.90 (API 653 Appendix B)'],
        ['Cosine Fit Status', rSquared >= 0.90 ? '✓ ACCEPTABLE' : '✗ REVIEW REQUIRED']
      ];
      
      this.addTableFlow({
        body: cosineFitData,
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
      }, 10);
    }
    
    // API 653 Compliance
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('API 653 APPENDIX B COMPLIANCE', this.margin, this.currentY);
    this.currentY += 8;
    
    const complianceData = [
      ['Criteria', 'Measured', 'Allowable', 'Status'],
      ['Uniform Settlement', `${this.renderNumber(uniformSettlement, 3, 'N/A')}"`, 'No limit', !isNaN(uniformSettlement) ? '✓ ACCEPTABLE' : 'Not calculated'],
      ['Tilt', `${this.renderNumber(actualTilt, 4, 'N/A')} in/ft`, '0.015 in/ft', !isNaN(actualTilt) ? (actualTilt <= 0.015 ? '✓ ACCEPTABLE' : '✗ EXCEEDS') : 'Not calculated'],
      ['Out-of-Plane', `${this.renderNumber(maxOutOfPlane, 3, 'N/A')}"`, `${allowableSettlement > 0 ? this.renderNumber(allowableSettlement, 3, 'L²/130H') + '"' : 'L²/130H'}`, !isNaN(maxOutOfPlane) ? (maxOutOfPlane <= (allowableSettlement || 2.0) ? '✓ ACCEPTABLE' : '✗ REVIEW') : 'Not calculated']
    ];
    
    this.addTableFlow({
      body: complianceData.slice(1),
      head: [complianceData[0]],
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
    }, 10);
    
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
        this.ensurePageBreak(10);
        this.pdf.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    }
  }

  private addSecondaryContainmentAnalysis(containments: SecondaryContainment[], report: InspectionReport) {
    this.addSectionHeader('13.0 SECONDARY CONTAINMENT', true, true);
    
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
        ['Tank Capacity', tankVolume > 0 && isFinite(tankVolume) ? `${this.renderNumber(tankVolume, 0, 'Not provided')} ${report.capacityUnit || ''}` : 'Not provided'],
        ['Dike Type', containment.dikeType || 'Not provided'],
        ['Dike Height', containment.dikeHeight ? `${containment.dikeHeight} ft` : 'Not provided'],
        ['Dike Capacity', dikeCapacity > 0 && isFinite(dikeCapacity) ? `${this.renderNumber(dikeCapacity, 0, 'Not provided')} bbls` : 'Not provided'],
        ['Adequacy Ratio', dikeCapacity > 0 && tankVolume > 0 && isFinite(adequacyRatio) ? `${this.renderNumber(adequacyRatio, 1, 'Cannot calculate')}%` : 'Cannot calculate'],
        ['EPA Requirement', '110% of tank capacity'],
        ['Compliance', dikeCapacity > 0 && tankVolume > 0 ? (adequacyRatio >= 110 ? '✓ COMPLIANT' : '✗ NON-COMPLIANT') : 'Insufficient data']
      ];
      
      this.addTableFlow({
        body: capacityData,
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
      }, 10);
      
      // Condition assessment
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('CONTAINMENT CONDITION', this.margin, this.currentY);
      this.currentY += 8;
      
      const conditionData = [
        ['Dike Condition', containment.dikeCondition || 'Not provided'],
        ['Liner Type', containment.linerType || 'Not provided'],
        ['Liner Condition', containment.linerCondition || 'Not provided'],
        ['Drainage System', containment.drainageSystem || 'Not provided'],
        ['Drainage Valves', containment.drainValvesSealed !== undefined ? (containment.drainValvesSealed ? 'Sealed' : 'Not sealed') : 'Not provided']
      ];
      
      this.addTableFlow({
        body: conditionData,
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
      }, 10);
    }
  }

  private addDetailedFindings(measurements: ExtendedThicknessMeasurement[], checklists: ExtendedInspectionChecklist[], 
                             appurtenances: ExtendedAppurtenanceInspection[], analysisData: AnalysisData) {
    this.addSectionHeader('14.0 DETAILED FINDINGS', true, true);
    
    // Critical Findings
    this.ensurePageBreak(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...this.secondaryColor);
    this.pdf.text('CRITICAL FINDINGS', this.margin, this.currentY);
    this.pdf.setTextColor(0, 0, 0);
    this.currentY += 8;
    
    const criticalFindings = [];
    
    // Check thickness measurements
    measurements.forEach(m => {
      const status = this.getMeasurementStatus(m);
      if (status === 'critical') {
        const minReq = m.minRequiredThickness ? `${m.minRequiredThickness}"` : 'Not calculated';
        criticalFindings.push(`• ${m.location || 'Unknown location'}: Thickness below minimum required (${m.currentThickness || 'Not measured'}" < ${minReq})`);
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
      this.ensurePageBreak(10);
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
      const status = this.getMeasurementStatus(m);
      if (status === 'action_required') {
        const remainingLife = this.getMeasurementRemainingLife(m);
        majorFindings.push(`• ${m.location}: Approaching minimum thickness (RL: ${remainingLife !== undefined ? remainingLife.toFixed(1) : 'Not calculated'} years)`);
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
      this.ensurePageBreak(10);
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
      const status = this.getMeasurementStatus(m);
      if (status === 'monitor') {
        const corrosionRate = this.getMeasurementCorrosionRate(m);
        const corrosionInfo = corrosionRate !== undefined
          ? ` (${corrosionRate.toFixed(1)} mpy)`
          : '';
        minorFindings.push(`• ${m.location || 'Location not specified'}: Monitor corrosion rate${corrosionInfo}`);
      }
    });
    
    if (minorFindings.length === 0) {
      minorFindings.push('• Routine monitoring items only');
    }
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    minorFindings.slice(0, 5).forEach(finding => {
      this.ensurePageBreak(10);
      this.pdf.text(finding, this.margin, this.currentY);
      this.currentY += 6;
    });
    
    if (minorFindings.length > 5) {
      this.pdf.text(`• ... and ${minorFindings.length - 5} additional minor items`, this.margin, this.currentY);
    }
  }

  private addComprehensiveRecommendations(recommendations: ExtendedRepairRecommendation[], analysisData: AnalysisData) {
    this.addSectionHeader('15.0 RECOMMENDATIONS', true, true);
    
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
        r.component || 'Not specified',
        r.description || 'Not provided',
        r.timing || 'Not specified',
        r.estimatedCost ? `$${r.estimatedCost.toLocaleString()}` : 'Not provided'
      ]);
      
      this.addTableFlow({
        head: [['Component', 'Description', 'Timeline', 'Est. Cost']],
        body: criticalData,
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
      }, 10);
    }
    
    // High Priority
    if (high.length > 0) {
      this.ensurePageBreak(50);
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(...this.warningColor);
      this.pdf.text('HIGH PRIORITY', this.margin, this.currentY);
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 8;
      
      const highData = high.map(r => [
        r.component || 'Not specified',
        r.description || 'Not provided',
        r.timing || 'Not specified',
        r.estimatedCost ? `$${r.estimatedCost.toLocaleString()}` : 'Not provided'
      ]);
      
      this.addTableFlow({
        head: [['Component', 'Description', 'Timeline', 'Est. Cost']],
        body: highData,
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
      }, 10);
    }
    
    // Medium and Low Priority Summary
    if (medium.length > 0 || low.length > 0) {
      this.ensurePageBreak(40);
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('PLANNED MAINTENANCE', this.margin, this.currentY);
      this.currentY += 8;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      this.pdf.text(`• Medium Priority Items: ${medium.length}`, this.margin, this.currentY);
      this.currentY += 6;
      this.pdf.text(`• Low Priority Items: ${low.length}`, this.margin, this.currentY);
      this.currentY += 6;
      
      const totalCost = [...medium, ...low].reduce((sum, r) => 
        sum + (r.estimatedCost || 0), 0);
      
      if (totalCost > 0) {
        this.pdf.text(`• Total Estimated Cost: $${totalCost.toLocaleString()}`, this.margin, this.currentY);
      }
    }
  }

  private addNextInspectionIntervals(analysisData: AnalysisData, report: InspectionReport) {
    this.addSectionHeader('16.0 NEXT INSPECTION INTERVALS', true, true);
    
    const { externalInterval, internalInterval, criticalCourse } = analysisData.tankInspectionIntervals;
    
    // Check if we have valid interval data
    if (isNaN(externalInterval) || isNaN(internalInterval)) {
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text('Inspection intervals could not be calculated due to insufficient data.', this.margin, this.currentY);
      this.currentY += 8;
      this.pdf.text('API 653 interval calculations require complete shell course analysis.', this.margin, this.currentY);
      this.currentY += 15;
      
      // Show any explicitly provided intervals from the report
      if (report.nextExternalInspection || report.nextInternalInspection) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text('SCHEDULED INSPECTIONS (FROM REPORT)', this.margin, this.currentY);
        this.currentY += 8;
        
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        if (report.nextExternalInspection) {
          this.pdf.text(`• Next External Inspection: ${report.nextExternalInspection}`, this.margin, this.currentY);
          this.currentY += 6;
        }
        if (report.nextInternalInspection) {
          this.pdf.text(`• Next Internal Inspection: ${report.nextInternalInspection}`, this.margin, this.currentY);
          this.currentY += 6;
        }
      }
      return;
    }
    
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
      ['Tank Classification', 'Not specified'],
      ['Corrosion Rate Basis', analysisData.kpiMetrics.minRemainingLife !== null && analysisData.kpiMetrics.minRemainingLife !== undefined && analysisData.kpiMetrics.minRemainingLife < 10 ? 'Short-term rate' : 'Long-term rate'],
      ['Limiting Component', criticalCourse ? `Shell Course ${criticalCourse}` : 'Not determined'],
      ['API 653 Reference', 'Table 6.1 and Section 6.4.2'],
      ['RBI Applied', 'Not specified'],
      ['Special Considerations', report.coatingCondition ? report.coatingCondition : 'Not provided']
    ];
    
    this.addTableFlow({
      body: basisData,
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
    }, 10);
    
    // Additional inspections
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.text('ADDITIONAL INSPECTION REQUIREMENTS', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    
    // These should come from actual inspection requirements data
    const additionalReqs = [];
    
    // Only add if we have actual data about these requirements
    if (report.nextExternalInspection) {
      additionalReqs.push(`• Next External Inspection: ${report.nextExternalInspection}`);
    }
    if (report.nextInternalInspection) {
      additionalReqs.push(`• Next Internal Inspection: ${report.nextInternalInspection}`);
    }
    
    // If no specific requirements, indicate that
    if (additionalReqs.length === 0) {
      additionalReqs.push('• No additional requirements specified');
    }
    
    additionalReqs.forEach(req => {
      this.pdf.text(req, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addConclusion(report: InspectionReport, analysisData: AnalysisData) {
    this.addSectionHeader('17.0 CONCLUSION', true, true);
    
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
        `life of ${!isNaN(kpiMetrics.minRemainingLife) ? kpiMetrics.minRemainingLife.toFixed(1) + ' years' : 'sufficient duration'} provides adequate time for planned maintenance activities.`,
        ``,
        `Recommended actions include routine monitoring and the scheduled maintenance items identified in this`,
        `report. ${!isNaN(analysisData.tankInspectionIntervals.internalInterval) ? 'The next internal inspection should be performed within ' + analysisData.tankInspectionIntervals.internalInterval + ' years.' : 'Inspection intervals should be determined based on complete analysis.'}`
      ];
    } else if (status === 'CONDITIONAL') {
      conclusionText = [
        `The API 653 inspection of Tank ${report.tankId} has identified conditions requiring attention.`,
        `The tank may continue in service with the implementation of recommended repairs and increased monitoring.`,
        ``,
        `${kpiMetrics.majorFindings} major findings require action within the next operating cycle to ensure`,
        `continued safe operation. ${!isNaN(kpiMetrics.minRemainingLife) ? 'The minimum remaining life of ' + kpiMetrics.minRemainingLife.toFixed(1) + ' years indicates' : 'Certain areas show'}`,
        `accelerated corrosion.`,
        ``,
        `All high priority recommendations should be implemented within 6 months, with follow-up inspection`,
        `to verify repair effectiveness.`
      ];
    } else if (status === 'NO-GO') {
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
    } else {
      // INSUFFICIENT DATA status
      conclusionText = [
        `The API 653 inspection of Tank ${report.tankId} could not be fully evaluated due to insufficient data.`,
        `Complete thickness measurements and operating parameters are required for proper assessment.`,
        ``,
        `Additional data collection is necessary to determine tank condition and compliance with API 653 requirements.`,
        `The tank should be re-inspected with comprehensive measurements before determining fitness for service.`,
        ``,
        `Please ensure all required measurements are collected and documented for complete analysis.`
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

  private addSectionHeader(title: string, withBackground: boolean = true, addToTOC: boolean = false) {
    this.ensurePageBreak(withBackground ? 35 : 25);

    // Add to table of contents if requested
    if (addToTOC) {
      const level = /^\d+\.\d+/.test(title) ? 2 : 1;
      this.tableOfContents.push({
        title,
        page: this.currentPage,
        level
      });
    }
    
    if (withBackground) {
      // Add gradient-like background for better visual appeal
      this.pdf.setFillColor(...this.primaryColor);
      this.pdf.rect(0, this.currentY - 10, this.pageWidth, 25, 'F');
      
      // Add subtle accent line
      this.pdf.setDrawColor(...this.accentColor);
      this.pdf.setLineWidth(2);
      this.pdf.line(0, this.currentY + 14, 5, this.currentY + 14);
      
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(14);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(title, this.margin, this.currentY);
      
      this.pdf.setTextColor(0, 0, 0);
      this.currentY += 30; // More spacing
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
      this.currentY += 20; // More spacing
    }
  }
}