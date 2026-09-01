import { useEffect } from 'react';
import { useUIStore, type ThemeMode } from '../store/ui-store';

const LIGHT_BG = '#ffffff';
const DARK_BG = '#121212';

/**
 * Reads the current theme from the UI store and:
 *  - applies `.dark` on `<html>` accordingly
 *  - when the user has NOT explicitly picked a canvas background swatch,
 *    writes a theme-appropriate default to `--canvas-bg` on `<html>` so the
 *    canvas switches with the theme.
 *
 * Persists via the UI store (localStorage).
 */
export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const canvasBackground = useUIStore((s) => s.canvasBackground);
  const hasUserCanvasBackground = useUIStore(
    (s) => s.hasUserCanvasBackground
  );

  useEffect(() => {
    const root = document.documentElement;
    const mql =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const apply = (mode: ThemeMode) => {
      const isDark =
        mode === 'dark' || (mode === 'system' && mql?.matches === true);
      root.classList.toggle('dark', isDark);

      if (hasUserCanvasBackground && canvasBackground && canvasBackground !== LIGHT_BG) {
        root.style.setProperty('--canvas-bg', canvasBackground);
      } else {
        root.style.setProperty('--canvas-bg', isDark ? DARK_BG : LIGHT_BG);
      }
    };

    apply(theme);

    if (theme !== 'system' || !mql) return;
    const onChange = () => apply('system');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [theme, canvasBackground, hasUserCanvasBackground]);
}