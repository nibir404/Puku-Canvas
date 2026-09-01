import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja';

const THEME_KEY = 'puku:theme';
const LANG_KEY = 'puku:language';
const BG_KEY = 'puku:canvasBackground';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy errors */
  }
}

interface UIState {
  theme: ThemeMode;
  language: Language;
  canvasBackground: string;
  /** True once the user has explicitly picked a swatch. When false, the
   *  canvas background auto-switches with the theme. */
  hasUserCanvasBackground: boolean;

  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setCanvasBackground: (color: string) => void;
  resetCanvasBackground: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: readStored<ThemeMode>(THEME_KEY, 'light'),
  language: readStored<Language>(LANG_KEY, 'en'),
  canvasBackground: readStored<string>(BG_KEY, '#ffffff'),
  hasUserCanvasBackground: readStored<boolean>(`${BG_KEY}:user`, false),

  setTheme: (theme) => {
    writeStored(THEME_KEY, theme);
    set({ theme });
  },
  setLanguage: (language) => {
    writeStored(LANG_KEY, language);
    set({ language });
  },
  setCanvasBackground: (canvasBackground) => {
    writeStored(BG_KEY, canvasBackground);
    writeStored(`${BG_KEY}:user`, true);
    set({ canvasBackground, hasUserCanvasBackground: true });
  },
  resetCanvasBackground: () => {
    writeStored(`${BG_KEY}:user`, false);
    writeStored(BG_KEY, '#ffffff');
    set({ hasUserCanvasBackground: false, canvasBackground: '#ffffff' });
  },
}));
