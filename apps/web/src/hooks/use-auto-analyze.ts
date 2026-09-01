import { useEffect, useRef } from 'react';
import type { Scene } from '@puku/types';

const IDLE_MS = 1500;

/**
 * Watches the scene for changes and, after `IDLE_MS` of inactivity, calls
 * `analyze(scene)` from the AI analysis hook.
 *
 * The `enabled` flag (tied to the Puku AI toggle) gates the side effect: when
 * disabled, no requests fire and any in-flight results are kept but no new
 * ones are scheduled.
 */
export function useAutoAnalyze(
  scene: Scene,
  enabled: boolean,
  analyze: (scene: Scene) => Promise<void>,
  reset: () => void
) {
  const lastScene = useRef<Scene>(scene);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // Turn off: cancel any pending analysis, keep current results.
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      lastScene.current = scene;
      return;
    }

    // Same scene as last time? Do nothing (no spurious re-fires).
    if (scene === lastScene.current) return;
    lastScene.current = scene;

    // Empty canvas short-circuit: nothing to analyze.
    if (scene.shapes.length === 0) {
      reset();
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (inFlight.current) return; // Coalesce overlapping requests.
      inFlight.current = true;
      void analyze(scene).finally(() => {
        inFlight.current = false;
      });
    }, IDLE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scene, enabled, analyze, reset]);
}
