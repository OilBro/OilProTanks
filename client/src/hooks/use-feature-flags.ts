import { useEffect, useState } from 'react';

export interface FeatureFlagsResponse {
  success: boolean;
  flags: {
    aiAnalysisUI: boolean;
    maintenanceUtilsUI: boolean;
  };
}

interface UseFeatureFlagsResult {
  flags: FeatureFlagsResponse['flags'];
  loading: boolean;
  error: string | null;
}

const defaultFlags = { aiAnalysisUI: false, maintenanceUtilsUI: false };

export function useFeatureFlags(refreshMs = 0): UseFeatureFlagsResult {
  const [flags, setFlags] = useState(defaultFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: any;

    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch('/api/feature-flags');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: FeatureFlagsResponse = await resp.json();
        if (!cancelled && data.success) {
          setFlags(data.flags);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load feature flags');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    if (refreshMs > 0) {
      interval = setInterval(load, refreshMs);
    }

    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [refreshMs]);

  return { flags, loading, error };
}
