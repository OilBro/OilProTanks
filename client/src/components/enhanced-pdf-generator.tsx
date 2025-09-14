// CLEAN SHIM IMPLEMENTATION
// ----------------------------------------------------
// Any existing imports of generateEnhancedPDF now yield the professional
// report. This keeps backward compatibility without duplicating logic.

import { generateProfessionalReport } from '@/lib/pdf-report-generator';

export interface EnhancedReportData {
  report: any;
  measurements?: any[];
  checklists?: any[];
  repairRecommendations?: any[];
  cmlData?: any[];
  settlementSurvey?: any;
}

interface AdapterReportData {
  reportNumber: string;
  tankId: string;
  facilityName: string;
  location: string;
  inspectionDate: string;
  inspector: string;
  reviewedBy?: string;
  tankDetails: any;
  shellData: any;
  bottomData: any;
  settlementData?: any;
  cmlData?: any[];
  findings?: any;
}

export function generateEnhancedPDF(data: EnhancedReportData): void {
  const mapped = mapEnhancedToProfessional(data);
  void generateProfessionalReport(mapped);
}

function mapEnhancedToProfessional(data: EnhancedReportData): AdapterReportData {
  const report = data.report || {};
  const measurements = data.measurements || [];
  const shellMeas = measurements.filter((m: any) => (m.component || '').toLowerCase() === 'shell');
  const bottomMeas = measurements.filter((m: any) => (m.component || '').toLowerCase() === 'bottom');
  const cmlMeas = (data.cmlData && data.cmlData.length) ? data.cmlData : measurements.filter((m: any) => (m.measurementType || '').toLowerCase() === 'cml');

  const shellCourses: any[] = [];
  for (let i = 1; i <= 12; i++) {
    const courseMeasurements = shellMeas.filter((m: any) => {
      const loc = (m.location || '').toLowerCase();
      return loc.includes(`course ${i}`) || loc.includes(`crs ${i}`) || loc.includes(`c${i}`);
    });
    if (!courseMeasurements.length) continue;
    const minT = Math.min(...courseMeasurements.map((m: any) => parseFloat(m.measuredThickness || m.currentThickness || m.originalThickness || '0') || 0.001));
    const nominal = parseFloat(courseMeasurements[0]?.nominalThickness || courseMeasurements[0]?.originalThickness || '0.25') || 0.25;
    const age = (report as any).tankAge || 20;
    const cr = ((nominal - minT) / age) * 1000;
    const req = 0.1;
    const rl = cr > 0 ? ((minT - req) / cr) * 1000 : 999;
    shellCourses.push({
      courseNumber: i,
      height: 8,
      nominalThickness: nominal,
      measuredThickness: minT,
      requiredThickness: req,
      corrosionRate: isFinite(cr) ? cr : 0,
      remainingLife: !isFinite(rl) || rl > 999 ? 999 : rl,
      status: rl < 5 ? 'ACTION REQ' : rl < 10 ? 'MONITOR' : 'ACCEPTABLE'
    });
  }
  const governingCourse = shellCourses.length ? shellCourses.reduce((m, c) => c.remainingLife < m.remainingLife ? c : m).courseNumber : 1;

  const bottomMin = bottomMeas.length ? Math.min(...bottomMeas.map((m: any) => parseFloat(m.measuredThickness || m.currentThickness || '0') || 0.001)) : 0.25;
  const bottomNominal = parseFloat(bottomMeas[0]?.nominalThickness || bottomMeas[0]?.originalThickness || '0.25') || 0.25;
  const bottomCR = ((bottomNominal - bottomMin) / ((report as any).tankAge || 20)) * 1000;
  const bottomRL = bottomCR > 0 ? ((bottomMin - 0.1) / bottomCR) * 1000 : 999;

  let settlementData = undefined as any;
  if (data.settlementSurvey) {
    const s = data.settlementSurvey;
    settlementData = {
      measurements: (s.measurements || []).map((m: any) => ({
        point: m.point || m.pointNumber || 0,
        angle: m.angle || 0,
        elevation: m.elevation || m.measuredElevation || 0,
        cosineFit: m.cosineFit || m.cosineFitElevation
      })),
      amplitude: s.amplitude || s.cosineAmplitude || 0,
      phase: s.phase || s.cosinePhase || 0,
      rSquared: s.rSquared || 0,
      maxSettlement: s.maxSettlement || s.maxOutOfPlane || 0,
      allowableSettlement: s.allowableSettlement || 0.5,
      acceptance: s.acceptance || s.settlementAcceptance || 'PENDING'
    };
  }

  const mappedCML = cmlMeas.map((m: any) => {
    const current = parseFloat(m.measuredThickness || m.currentThickness || '0') || 0;
    const tMin = parseFloat(m.minRequiredThickness || m.tMin || '0.1') || 0.1;
    const original = parseFloat(m.nominalThickness || m.originalThickness || '0.25') || 0.25;
    const age = (report as any).tankAge || 20;
    const cr = ((original - current) / age) * 1000;
    const rl = cr > 0 ? ((current - tMin) / cr) * 1000 : 999;
    return {
      cmlId: `CML-${m.id || m.cmlId || Math.random().toString(36).slice(2,8)}`,
      component: m.component || 'Shell',
      location: m.location || 'Location',
      currentReading: current,
      previousReading: m.previousThickness || m.previousReading,
      tMin,
      corrosionRate: isFinite(cr) ? cr : 0,
      remainingLife: !isFinite(rl) || rl > 999 ? 999 : rl,
      nextInspDate: m.nextInspectionDate || new Date(Date.now() + 5*365*86400000).toISOString().split('T')[0],
      status: rl < 5 ? 'critical' : rl < 10 ? 'action_required' : 'acceptable'
    };
  });

  const findings = {
    executive: (report as any).findings || 'Tank inspection completed per API 653 standards.',
    critical: [],
    major: [],
    minor: [],
    recommendations: [
      shellCourses.some(c => c.remainingLife < 10) ? 'Schedule shell course repairs (remaining life < 10 yrs).' : undefined,
      bottomRL < 10 ? 'Plan bottom repair/replacement within next interval.' : undefined,
      'Continue routine monitoring per API 653 recommended intervals.'
    ].filter(Boolean),
    nextInspectionDate: (report as any).nextExternalInspection || new Date(Date.now() + 5*365*86400000).toISOString().split('T')[0]
  };

  return {
    reportNumber: report.reportNumber || 'UNSPECIFIED',
    tankId: report.tankId || 'UNKNOWN',
    facilityName: (report as any).facilityName || 'Facility',
    location: (report as any).location || 'Location',
    inspectionDate: report.inspectionDate || new Date().toISOString().split('T')[0],
    inspector: report.inspector || 'Inspector',
    reviewedBy: (report as any).reviewedBy,
    tankDetails: {
      diameter: parseFloat((report as any).diameter) || 100,
      height: parseFloat((report as any).height) || 40,
      capacity: parseFloat((report as any).capacity) || 50000,
      product: (report as any).product || (report as any).service || 'Product',
      yearBuilt: (report as any).yearBuilt || 2000,
      lastInspection: (report as any).lastInternalInspection,
      designCode: (report as any).designCode || 'API 650',
      material: (report as any).shellMaterial || 'A36'
    },
    shellData: {
      courses: shellCourses,
      governingCourse,
      overallStatus: shellCourses.some(c => c.status === 'ACTION REQ') ? 'ACTION REQUIRED' : shellCourses.some(c => c.status === 'MONITOR') ? 'MONITOR' : 'ACCEPTABLE'
    },
    bottomData: {
      nominalThickness: bottomNominal,
      minMeasured: bottomMin,
      requiredThickness: 0.1,
      corrosionRate: isFinite(bottomCR) ? bottomCR : 0,
      remainingLife: !isFinite(bottomRL) || bottomRL > 999 ? 999 : bottomRL,
      mriDate: (report as any).nextInternalInspection
    },
    settlementData,
    cmlData: mappedCML.length ? mappedCML : undefined,
    findings
  };
}

// Legacy generator fully removed.