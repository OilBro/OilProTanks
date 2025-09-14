import { db } from './db.ts';
import { eq } from 'drizzle-orm';
import { 
  inspectionReports,
  thicknessMeasurements,
  inspectionChecklists,
  insertInspectionReportSchema,
  insertThicknessMeasurementSchema,
  insertInspectionChecklistSchema,
  type InsertInspectionReport
} from '../shared/schema.ts';

/**
 * Contract:
 *  Input: importedData object (possibly unvalidated), arrays of thicknessMeasurements & checklistItems from analyzers
 *  Behavior: Validates & persists report + related rows transactionally. Rolls back on any failure.
 *  Output: { report, measurementsCreated, checklistCreated, skipped: { measurements, checklist }, warnings[] }
 *  Error: throws with message and optional details if validation fails (no partial writes).
 */
export async function persistImportedReport(params: {
  importedData: any;
  thicknessMeasurements: any[];
  checklistItems: any[];
  findings?: string | null;
  reportWriteUp?: string | null;
  recommendations?: string | null;
  notes?: string | null;
}) {
  const {
    importedData,
    thicknessMeasurements: rawMeasurements = [],
    checklistItems: rawChecklist = [],
    findings,
    reportWriteUp,
    recommendations,
    notes
  } = params;

  // Basic required fields guard before transaction (fast fail)
  if (!importedData) throw new Error('persistImportedReport: importedData missing');
  if (!importedData.tankId) {
    throw new Error('Imported data missing tankId after parsing');
  }
  // Generate reportNumber if absent
  if (!importedData.reportNumber) {
    importedData.reportNumber = `IMP-${Date.now()}`;
  }

  // Normalize numeric-ish fields expected as strings in schema (diameter/height/originalThickness)
  const normalizeNumberField = (v: any) => v == null || v === '' ? null : String(v);

  const reportInsert: InsertInspectionReport = insertInspectionReportSchema.parse({
    ...importedData,
    diameter: normalizeNumberField(importedData.diameter),
    height: normalizeNumberField(importedData.height),
    originalThickness: normalizeNumberField(importedData.originalThickness),
    yearsSinceLastInspection: importedData.yearsSinceLastInspection != null ? importedData.yearsSinceLastInspection : null,
    status: importedData.status || 'draft'
  });

  const result = await db.transaction(async (tx: any) => {
    const now = new Date().toISOString();
    const [report] = await tx.insert(inspectionReports).values({
      ...reportInsert,
      createdAt: now,
      updatedAt: now,
      origin: 'import'
    }).returning();

    // Apply post-create update for professional narrative fields if provided
    const narrativeUpdate: any = {};
    if (findings) narrativeUpdate.findings = findings;
    if (reportWriteUp) narrativeUpdate.recommendations = reportWriteUp; // legacy mismatch safety
    if (recommendations) narrativeUpdate.recommendations = recommendations;
    if (Object.keys(narrativeUpdate).length) {
      await tx.update(inspectionReports)
        .set({ ...narrativeUpdate, updatedAt: new Date().toISOString() })
        .where(eq(inspectionReports.id, report.id));
    }

    // Prepare measurements (dedupe + validate)
    const measurementWarnings: string[] = [];
    const checklistWarnings: string[] = [];
    const uniqueMeasurementKey = (m: any) => `${m.component || m.measurementType || 'unknown'}::${m.location || m.elevation || 'loc'}::${m.currentThickness || 'na'}`;
    const seen = new Set<string>();

    const preparedMeasurements = rawMeasurements
      .filter(m => {
        if (!m) return false;
        if (!m.currentThickness && !m.originalThickness) {
          measurementWarnings.push('Skipped measurement with no thickness values');
          return false;
        }
        const key = uniqueMeasurementKey(m);
        if (seen.has(key)) {
          measurementWarnings.push(`Duplicate measurement skipped: ${key}`);
          return false;
        }
        seen.add(key);
        return true;
      })
      .map(m => {
        // Ensure strings for decimals
        const toStr = (v: any) => v == null || v === '' ? null : String(v);
        const measurementType = m.measurementType || inferMeasurementType(m.component || m.location || '');
        const base = {
          reportId: report.id,
          component: m.component || m.measurementType || 'Component',
          measurementType,
          location: m.location || m.elevation || m.gridReference || m.plateNumber || 'Location',
          elevation: toStr(m.elevation),
          gridReference: m.gridReference || null,
          plateNumber: m.plateNumber || null,
          annularRingPosition: m.annularRingPosition || null,
          criticalZoneType: m.criticalZoneType || null,
          repadNumber: m.repadNumber || null,
            repadType: m.repadType || null,
          repadThickness: toStr(m.repadThickness),
          nozzleId: m.nozzleId || null,
          nozzleSize: m.nozzleSize || null,
          flangeClass: m.flangeClass || null,
          flangeType: m.flangeType || null,
          originalThickness: toStr(m.originalThickness ?? m.nominalThickness ?? importedData.originalThickness ?? '0.375'),
          currentThickness: toStr(m.currentThickness),
          corrosionRate: toStr(m.corrosionRate),
          remainingLife: toStr(m.remainingLife),
          status: m.status || inferStatusFromRemainingLife(m.remainingLife),
        };
        return insertThicknessMeasurementSchema.parse(base);
      });

    if (preparedMeasurements.length) {
      // Batch insert in chunks (avoid very large single statement)
      const chunkSize = 500;
      for (let i = 0; i < preparedMeasurements.length; i += chunkSize) {
        const chunk = preparedMeasurements.slice(i, i + chunkSize);
        await tx.insert(thicknessMeasurements).values(chunk as any);
      }
    }

    // Prepare checklist
    const preparedChecklist = rawChecklist
      .filter(c => c && (c.item || c.description))
      .map(c => {
        const base = {
          reportId: report.id,
          category: c.category || 'general',
          item: c.item || c.description,
          checked: c.checked === true || c.status === 'satisfactory' || c.status === 'acceptable',
          notes: c.notes || null
        };
        return insertInspectionChecklistSchema.parse(base);
      });

    if (preparedChecklist.length) {
      await tx.insert(inspectionChecklists).values(preparedChecklist as any);
    }

    return {
      report,
      measurementsCreated: preparedMeasurements.length,
      checklistCreated: preparedChecklist.length,
      warnings: [...measurementWarnings, ...checklistWarnings]
    };
  });

  return result;
}

function inferMeasurementType(component: string): string {
  const c = component.toLowerCase();
  if (c.includes('bottom') || c.includes('floor') || c.includes('plate')) return 'bottom_plate';
  if (c.includes('critical')) return 'critical_zone';
  if (c.includes('roof') || c.includes('top')) return 'roof';
  if (c.includes('nozzle')) return 'nozzle';
  if (c.includes('annular') || c.includes('ring')) return 'internal_annular';
  if (c.includes('repad') || c.includes('reinforcement')) return 'external_repad';
  if (c.includes('chime') || c.includes('angle')) return 'chime';
  if (c.includes('shell') || c.includes('course')) return 'shell';
  return 'shell';
}

function inferStatusFromRemainingLife(rl: any): string | null {
  const n = parseFloat(rl);
  if (isNaN(n)) return null;
  if (n < 1) return 'critical';
  if (n < 2) return 'action_required';
  if (n < 5) return 'monitor';
  return 'acceptable';
}

/**
 * Remove orphaned related rows (measurements, checklists, etc.) whose reportId no longer exists.
 */
export async function cleanupOrphanedReportChildren(dryRun = true) {
  const reportRows = await db.select({ id: inspectionReports.id }).from(inspectionReports);
  const reportIdSet = new Set<number>(reportRows.map((r: any) => r.id));

  // Fetch children
  const measurementRows = await db.select({ id: thicknessMeasurements.id, reportId: thicknessMeasurements.reportId }).from(thicknessMeasurements);
  const checklistRows = await db.select({ id: inspectionChecklists.id, reportId: inspectionChecklists.reportId }).from(inspectionChecklists);

  const orphanMeasurements = measurementRows.filter((r: any) => r.reportId != null && !reportIdSet.has(r.reportId));
  const orphanChecklists = checklistRows.filter((r: any) => r.reportId != null && !reportIdSet.has(r.reportId));

  if (!dryRun) {
    for (const m of orphanMeasurements) {
      await db.delete(thicknessMeasurements).where(eq(thicknessMeasurements.id, m.id));
    }
    for (const c of orphanChecklists) {
      await db.delete(inspectionChecklists).where(eq(inspectionChecklists.id, c.id));
    }
  }

  return {
    dryRun,
    orphanCounts: {
      thicknessMeasurements: orphanMeasurements.length,
      inspectionChecklists: orphanChecklists.length
    },
    deleted: dryRun ? 0 : (orphanMeasurements.length + orphanChecklists.length)
  };
}
