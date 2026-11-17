import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type LangCode = 'en' | 'vi';

interface PreferencesState {
  theme: ThemeMode;
  setTheme(t: ThemeMode): void;
  toggleTheme(): void;
  lang: LangCode;
  setLang(l: LangCode): void;
  toggleLang(): void;
  t(en: string, vi: string): string;
  paletteOpen: boolean;
  setPaletteOpen(open: boolean | ((v: boolean) => boolean)): void;
  copilotOpen: boolean;
  setCopilotOpen(open: boolean | ((v: boolean) => boolean)): void;
  quickCreateProjectId: number | null;
  openQuickCreate(projectId?: number): void;
  closeQuickCreate(): void;
}

const THEME_KEY = 'layers.theme';
const LANG_KEY = 'layers.lang';

const PreferencesContext = createContext<PreferencesState | null>(null);

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    if (v && allowed.includes(v)) return v;
  } catch { /* ignore storage restrictions */ }
  return fallback;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStored(THEME_KEY, ['light', 'dark'] as const, 'light'));
  const [lang, setLangState] = useState<LangCode>(() => readStored(LANG_KEY, ['en', 'vi'] as const, 'en'));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [quickCreateProjectId, setQuickCreateProjectId] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((p) => (p === 'light' ? 'dark' : 'light')), []);
  const setLang = useCallback((next: LangCode) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === 'en' ? 'vi' : 'en')), []);
  const t = useCallback((en: string, vi: string) => (lang === 'vi' ? vi : en), [lang]);
  const openQuickCreate = useCallback((pid?: number) => setQuickCreateProjectId(pid ?? 1), []);
  const closeQuickCreate = useCallback(() => setQuickCreateProjectId(null), []);

  const value = useMemo<PreferencesState>(() => ({
    theme, setTheme, toggleTheme,
    lang, setLang, toggleLang, t,
    paletteOpen, setPaletteOpen,
    copilotOpen, setCopilotOpen,
    quickCreateProjectId, openQuickCreate, closeQuickCreate,
  }), [theme, setTheme, toggleTheme, lang, setLang, toggleLang, t, paletteOpen, copilotOpen, quickCreateProjectId, openQuickCreate, closeQuickCreate]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

const DEFAULT_PREFS: PreferencesState = {
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (en) => en,
  paletteOpen: false,
  setPaletteOpen: () => {},
  copilotOpen: false,
  setCopilotOpen: () => {},
  quickCreateProjectId: null,
  openQuickCreate: () => {},
  closeQuickCreate: () => {},
};

export function usePreferences(): PreferencesState {
  return useContext(PreferencesContext) ?? DEFAULT_PREFS;
}
