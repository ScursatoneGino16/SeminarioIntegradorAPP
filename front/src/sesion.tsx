import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, EVENTO_SESION_EXPIRADA, type EstadoSesion } from './api';

interface ContextoSesion {
  estado: EstadoSesion | null;
  refrescar: () => Promise<void>;
  salir: () => Promise<void>;
  expirada: boolean;
}

const Ctx = createContext<ContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion | null>(null);
  const [expirada, setExpirada] = useState(false);

  const refrescar = useCallback(async () => {
    try {
      const e = await api.estado();
      setEstado(e);
      if (e.autenticado) setExpirada(false);
    } catch {
      setEstado({ autenticado: false, usuario: null, modoSimulado: false, minutosInactividad: 30 });
    }
  }, []);

  const salir = useCallback(async () => {
    await api.logout().catch(() => undefined);
    await refrescar();
  }, [refrescar]);

  useEffect(() => {
    void refrescar();
    const alExpirar = () => {
      setExpirada(true);
      setEstado((e) => (e ? { ...e, autenticado: false, usuario: null } : e));
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, [refrescar]);

  return <Ctx.Provider value={{ estado, refrescar, salir, expirada }}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSesion fuera de ProveedorSesion');
  return c;
}
