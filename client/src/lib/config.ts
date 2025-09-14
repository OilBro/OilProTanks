// Centralized client-side feature flag access
// Vite exposes variables starting with VITE_

const env = (import.meta as any).env || {};

export const showAIAnalysisIndicators: boolean = env.VITE_AI_ANALYSIS_UI === 'true';
export const showMaintenanceUtilities: boolean = env.VITE_MAINTENANCE_UTILS_UI === 'true';
