// Centralized lightweight API helpers for import + maintenance endpoints
// Keeps fetch logic consistent and easier to evolve (headers, auth, error handling)

export interface ImportUploadResponse {
  success: boolean;
  reportId?: number;
  reportNumber?: string;
  measurementsCreated?: number;
  checklistCreated?: number;
  warnings?: string[];
  importedData: any;
  // Add fields expected by ImportResult for compatibility
  message?: string;
  thicknessMeasurements?: any[] | number;
  checklistItems?: any[] | number;
  totalRows?: number;
  preview?: any[];
}

async function handleResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      message = data.message || data.error || message;
    } catch {
      /* ignore json parse error */
    }
    throw new Error(message);
  }
  return resp.json();
}

export async function uploadImportFile(file: File): Promise<ImportUploadResponse> {
  const formData = new FormData();
  formData.append('excelFile', file);
  const resp = await fetch('/api/reports/import', { method: 'POST', body: formData });
  return handleResponse<ImportUploadResponse>(resp);
}

export interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  removedMeasurements?: number;
  removedChecklistItems?: number;
  orphanMeasurements?: number;
  orphanChecklistItems?: number;
  details?: any;
}

export async function runOrphanCleanup(dryRun: boolean): Promise<CleanupResult> {
  const resp = await fetch(`/api/reports/maintenance/cleanup-orphans?dryRun=${dryRun ? 'true' : 'false'}`, { method: 'POST' });
  return handleResponse<CleanupResult>(resp);
}
