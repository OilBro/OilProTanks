import { db } from './db';
import { eq } from 'drizzle-orm';
import { 
  inspectionReports,
  thicknessMeasurements,
  inspectionChecklists,
  insertInspectionReportSchema,
  insertThicknessMeasurementSchema,
  insertInspectionChecklistSchema,
  type InsertInspectionReport
} from '../shared/schema';

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
  // Generate unique reportNumber if absent or check for duplicates
  if (!importedData.reportNumber) {
    importedData.reportNumber = `IMP-${Date.now()}`;
  } else {
    // Check if report number already exists and append timestamp if it does
    const existing = await db.select({ id: inspectionReports.id })
      .from(inspectionReports)
      .where(eq(inspectionReports.reportNumber, importedData.reportNumber))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`Report number ${importedData.reportNumber} already exists, generating unique version`);
      importedData.reportNumber = `${importedData.reportNumber}-${Date.now()}`;
    }
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
    if (notes) narrativeUpdate.notes = notes;

    if (Object.keys(narrativeUpdate).length > 0) {
      console.log('Applying narrative update to report:', report.id, narrativeUpdate);
      await tx.update(inspectionReports)
        .set(narrativeUpdate)
        .where(eq(inspectionReports.id, report.id));
    }

    // Process thickness measurements
    const measurementsToInsert: any[] = [];
    const skippedMeasurements: any[] = [];
    const warnings: string[] = [];

    rawMeasurements.forEach((m: any) => {
      try {
        const parsed = insertThicknessMeasurementSchema.parse({
          ...m,
          reportId: report.id,
          createdAt: now
        });
        measurementsToInsert.push(parsed);
      } catch (e: any) {
        skippedMeasurements.push({ measurement: m, error: e.message });
        warnings.push(`Skipped thickness measurement due to validation error: ${e.message}`);
      }
    });

    let measurementsCreated = 0;
    if (measurementsToInsert.length > 0) {
      const inserted = await tx.insert(thicknessMeasurements).values(measurementsToInsert).returning();
      measurementsCreated = inserted.length;
    }

    // Process checklist items
    const checklistToInsert: any[] = [];
    const skippedChecklist: any[] = [];
    rawChecklist.forEach((c: any) => {
      try {
        const parsed = insertInspectionChecklistSchema.parse({
          ...c,
          reportId: report.id,
          createdAt: now
        });
        checklistToInsert.push(parsed);
      } catch (e: any) {
        skippedChecklist.push({ item: c, error: e.message });
        warnings.push(`Skipped checklist item due to validation error: ${e.message}`);
      }
    });

    let checklistCreated = 0;
    if (checklistToInsert.length > 0) {
      const inserted = await tx.insert(inspectionChecklists).values(checklistToInsert).returning();
      checklistCreated = inserted.length;
    }

    return {
      report,
      measurementsCreated,
      checklistCreated,
      skipped: {
        measurements: skippedMeasurements,
        checklist: skippedChecklist
      },
      warnings
    };
  });

  return result;
}