import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Direction, PaletteMode } from "@mui/material/styles";

export interface ThemeSettings {
  direction: Direction;
  theme: PaletteMode;
  activeLayout: "layout1" | "layout2";
  responsiveFontSizes: boolean;
}

const initialSettings: ThemeSettings = {
  direction: "ltr",
  theme: "light",
  activeLayout: "layout1",
  responsiveFontSizes: true,
};

interface ThemeSettingsContextValue {
  settings: ThemeSettings;
  saveSettings: (settings: Partial<ThemeSettings>) => void;
}

const STORAGE_KEY = "settings";
const ThemeSettingsContext = createContext<ThemeSettingsContextValue | null>(null);

function readSettings(): ThemeSettings {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialSettings;
    const parsed = JSON.parse(stored) as Partial<ThemeSettings>;
    return {
      ...initialSettings,
      ...parsed,
      theme: parsed.theme === "dark" ? "dark" : "light",
      direction: parsed.direction === "rtl" ? "rtl" : "ltr",
      activeLayout: parsed.activeLayout === "layout2" ? "layout2" : "layout1",
    };
  } catch {
    return initialSettings;
  }
}

export function ThemeSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<ThemeSettings>(readSettings);

  const saveSettings = useCallback((update: Partial<ThemeSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...update };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, saveSettings }), [settings, saveSettings]);
  return <ThemeSettingsContext.Provider value={value}>{children}</ThemeSettingsContext.Provider>;
}

export function useThemeSettings(): ThemeSettingsContextValue {
  const context = useContext(ThemeSettingsContext);
  if (!context) throw new Error("useThemeSettings debe usarse dentro de ThemeSettingsProvider");
  return context;
}
