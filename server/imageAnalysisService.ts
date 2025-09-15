import { db } from './db.ts';
import { imageAnalyses, imageLabels, imageRegions, insertImageAnalysisSchema } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

// Simple in-memory queue for now
interface AnalysisJob {
  attachmentId: number;
  reportId: number | null;
}

const queue: AnalysisJob[] = [];
let processing = false;

// Optional external inference integration (stub)
const ENABLE_EXTERNAL_MODEL = process.env.EXTERNAL_VISION_ENDPOINT ? true : false;
const MAX_RETRIES = 2;

async function runExternalInference(_attachmentId: number) {
  // Placeholder: In future, fetch binary/image and POST to model server
  // For now, simulate latency & sometimes throw to exercise retry logic
  await new Promise(r => setTimeout(r, 150));
  const failChance = Math.random();
  if (failChance < 0.2) throw new Error('Transient model service error');
  return { modelVersion: 'external-yolo-v1', detections: null }; // Real implementation would return detections
}

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
  const rows = await db
    .select()
    .from(imageAnalyses)
    .where(eq(imageAnalyses.attachmentId, attachmentId))
    // Drizzle descending order; falls back to id DESC
    .orderBy(imageAnalyses.id)
    .limit(1);
  return rows[0] || null;
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

      let used = MOCK_LABELS;
      let modelVersion = 'mock-yolo-v0';
      let seed = job.attachmentId;

      if (ENABLE_EXTERNAL_MODEL) {
        let attempt = 0;
        while (attempt <= MAX_RETRIES) {
          try {
            const external = await runExternalInference(job.attachmentId);
            modelVersion = external.modelVersion;
            break;
          } catch (err) {
            attempt++;
            if (attempt > MAX_RETRIES) {
              console.warn('External model failed after retries, falling back to mock:', err);
              break;
            }
            await new Promise(r => setTimeout(r, 200 * attempt)); // backoff
          }
        }
      }

      // Generate deterministic mock detections (always; external path not yet producing detections)
      const labelCount = 1 + Math.floor(hashSeed(seed) * 3); // 1-3 labels
      used = MOCK_LABELS.slice(0, labelCount);

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
        },
        modelVersion
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
