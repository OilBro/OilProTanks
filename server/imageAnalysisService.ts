import { db } from './db';
import { imageAnalyses, imageLabels, imageRegions, insertImageAnalysisSchema } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Simple in-memory queue for now
interface AnalysisJob {
  attachmentId: number;
  reportId: number | null;
}

const queue: AnalysisJob[] = [];
let processing = false;

// Deterministic pseudo-random generator for reproducible mock outputs
function hashSeed(n: number) {
  let x = Math.sin(n) * 10000; return x - Math.floor(x);
}

const MOCK_LABELS = [
  { label: 'corrosion', category: 'defect' },
  { label: 'pitting', category: 'defect' },
  { label: 'weld', category: 'component' },
  { label: 'nozzle', category: 'component' },
  { label: 'coating_peel', category: 'defect' },
];

export async function enqueueImageAnalysis(attachmentId: number, reportId: number | null) {
  // Create initial queued row
  const insert = insertImageAnalysisSchema.parse({
    attachmentId,
    reportId: reportId ?? null,
    status: 'queued',
    modelVersion: 'mock-yolo-v0'
  });
  const [row] = await db.insert(imageAnalyses).values(insert).returning();
  queue.push({ attachmentId, reportId });
  processQueue();
  return row;
}

export async function getLatestAnalysisForAttachment(attachmentId: number) {
  const rows = await db.select().from(imageAnalyses).where(eq(imageAnalyses.attachmentId, attachmentId)).orderBy(imageAnalyses.id); // naive, TODO: add desc + limit 1
  return rows.at(-1) || null;
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      const analysisRows = await db.select().from(imageAnalyses).where(eq(imageAnalyses.attachmentId, job.attachmentId));
      const analysis = analysisRows.at(-1);
      if (!analysis) continue;

      // Mark processing
      await db.update(imageAnalyses).set({ status: 'processing', startedAt: new Date() }).where(eq(imageAnalyses.id, analysis.id));

      // Simulate work
      await new Promise(r => setTimeout(r, 250));

      // Generate deterministic mock detections
      const seed = job.attachmentId;
      const labelCount = 1 + Math.floor(hashSeed(seed) * 3); // 1-3 labels
      const used = MOCK_LABELS.slice(0, labelCount);

      const labelInserts = used.map((u, idx) => ({
        analysisId: analysis.id,
        label: u.label,
        category: u.category,
        confidence: (0.6 + hashSeed(seed + idx) * 0.4).toFixed(4) as unknown as number,
      }));

      await db.insert(imageLabels).values(labelInserts);

      // Regions (bbox) per label
      const regionInserts = labelInserts.map((l, idx) => ({
        analysisId: analysis.id,
        label: l.label,
        confidence: l.confidence,
        x: (hashSeed(seed + 10 + idx) * 0.6).toFixed(4) as unknown as number,
        y: (hashSeed(seed + 20 + idx) * 0.6).toFixed(4) as unknown as number,
        width: (0.2 + hashSeed(seed + 30 + idx) * 0.3).toFixed(4) as unknown as number,
        height: (0.2 + hashSeed(seed + 40 + idx) * 0.3).toFixed(4) as unknown as number,
        polygon: null,
        defectSeverity: l.category === 'defect' ? 'minor' : null,
      }));

      await db.insert(imageRegions).values(regionInserts);

      // Update summary
      await db.update(imageAnalyses).set({
        status: 'completed',
        completedAt: new Date(),
        summary: {
          labels: labelInserts.map(li => ({ label: li.label, count: 1 })),
          defects: labelInserts.filter(li => used.find(u => u.label === li.label && u.category === 'defect')).map(li => ({ label: li.label, count: 1 })),
          processingMs: 250
        }
      }).where(eq(imageAnalyses.id, analysis.id));
    }
  } catch (err: any) {
    console.error('Image analysis worker error', err);
  } finally {
    processing = false;
  }
}

export function startImageAnalysisWorker() {
  // No interval loop needed yet; processing triggered on enqueue.
  console.log('[image-analysis] Worker initialized');
}
