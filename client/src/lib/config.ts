// Centralized client-side feature flag access
// Vite exposes variables starting with VITE_

export const showAIAnalysisIndicators: boolean =
  (import.meta as any).env?.VITE_AI_ANALYSIS_UI === 'true';
