import { useCallback, useState } from 'react';
import type { AnalysisResult, AnalyzeResponse } from '@puku/types';
import { analyzeWithoutLLM } from '@puku/ai';
import type { Scene } from '@puku/types';

interface State {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
}

/**
 * Calls POST /api/analyze with the given scene.
 * Falls back to client-side heuristics if the server is unreachable.
 *
 * When `enabled` is false, `analyze()` is a no-op so disabled toggles don't
 * burn API calls.
 */
export function useAIAnalysis(enabled = true) {
  const [state, setState] = useState<State>({
    result: null,
    loading: false,
    error: null,
    latencyMs: null,
  });

  const analyze = useCallback(
    async (scene: Scene) => {
      if (!enabled) return;
      setState({ result: null, loading: true, error: null, latencyMs: null });
      const started = performance.now();
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = (await res.json()) as AnalyzeResponse;
        setState({
          result: data.result,
          loading: false,
          error: null,
          latencyMs: data.latencyMs ?? Math.round(performance.now() - started),
        });
      } catch (err) {
        // Server unreachable — degrade gracefully to client-side heuristics.
        try {
          const fallback = analyzeWithoutLLM(scene);
          setState({
            result: fallback,
            loading: false,
            error: 'Could not reach the AI server — showing heuristic-only analysis.',
            latencyMs: Math.round(performance.now() - started),
          });
        } catch {
          setState({
            result: null,
            loading: false,
            error: (err as Error).message,
            latencyMs: Math.round(performance.now() - started),
          });
        }
      }
    },
    [enabled]
  );

  const reset = useCallback(() => {
    setState({ result: null, loading: false, error: null, latencyMs: null });
  }, []);

  return { ...state, analyze, reset };
}
