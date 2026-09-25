import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

interface LayoutContextValue {
  sidebarCompacta: boolean;
  sidebarMovilAbierta: boolean;
  alternarSidebarCompacta: () => void;
  abrirSidebarMovil: () => void;
  cerrarSidebarMovil: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: PropsWithChildren) {
  const [sidebarCompacta, setSidebarCompacta] = useState(false);
  const [sidebarMovilAbierta, setSidebarMovilAbierta] = useState(false);

  const alternarSidebarCompacta = useCallback(
    () => setSidebarCompacta((estado) => !estado),
    [],
  );
  const abrirSidebarMovil = useCallback(() => setSidebarMovilAbierta(true), []);
  const cerrarSidebarMovil = useCallback(() => setSidebarMovilAbierta(false), []);

  const value = useMemo(
    () => ({
      sidebarCompacta,
      sidebarMovilAbierta,
      alternarSidebarCompacta,
      abrirSidebarMovil,
      cerrarSidebarMovil,
    }),
    [sidebarCompacta, sidebarMovilAbierta, alternarSidebarCompacta, abrirSidebarMovil, cerrarSidebarMovil],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) throw new Error("useLayout debe usarse dentro de LayoutProvider");
  return context;
}
