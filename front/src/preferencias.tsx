// Preferencias de estilo (fondo, marco del retrato e ítems del perfil de Steam).
// Se guardan en el navegador: son una comodidad por usuario, no datos de la app.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const FONDOS = {
  noche: 'Noche estrellada',
  nubes: 'Cielo nublado',
} as const;

export const MARCOS = {
  ventana: 'Ventana de menú',
  'ornamentado-azul': 'Ornamentado',
  'doble-blanco': 'Doble blanco',
  'esquinas-blanco': 'Esquinas blancas',
  piedra: 'Piedra antigua',
  pergamino: 'Pergamino',
} as const;

export interface Preferencias {
  fondo: keyof typeof FONDOS;
  marco: keyof typeof MARCOS;
  /** Mostrar el avatar animado de Steam en lugar del avatar fijo. */
  avatarSteam: boolean;
  /** Mostrar el marco de avatar equipado en Steam (reemplaza al marco elegido). */
  marcoSteam: boolean;
  /** Mostrar el fondo de perfil de Steam en las páginas de perfil. */
  fondoSteam: boolean;
}

const POR_DEFECTO: Preferencias = { fondo: 'noche', marco: 'ventana', avatarSteam: true, marcoSteam: true, fondoSteam: true };
const CLAVE = 'steamvault.preferencias';
// Clave anterior al cambio de nombre: se lee una vez para no perder lo elegido.
const CLAVE_ANTERIOR = 'resenas.preferencias';

function leer(): Preferencias {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? localStorage.getItem(CLAVE_ANTERIOR) ?? '{}') as Partial<Preferencias>;
    return {
      fondo: guardado.fondo && guardado.fondo in FONDOS ? guardado.fondo : POR_DEFECTO.fondo,
      marco: guardado.marco && guardado.marco in MARCOS ? guardado.marco : POR_DEFECTO.marco,
      avatarSteam: typeof guardado.avatarSteam === 'boolean' ? guardado.avatarSteam : POR_DEFECTO.avatarSteam,
      marcoSteam: typeof guardado.marcoSteam === 'boolean' ? guardado.marcoSteam : POR_DEFECTO.marcoSteam,
      fondoSteam: typeof guardado.fondoSteam === 'boolean' ? guardado.fondoSteam : POR_DEFECTO.fondoSteam,
    };
  } catch {
    return POR_DEFECTO;
  }
}

interface ContextoPreferencias {
  preferencias: Preferencias;
  cambiar: (cambios: Partial<Preferencias>) => void;
}

const Ctx = createContext<ContextoPreferencias | null>(null);

export function ProveedorPreferencias({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leer);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch {
      // Sin almacenamiento (modo privado): las preferencias duran hasta recargar.
    }
  }, [preferencias]);

  const cambiar = useCallback((cambios: Partial<Preferencias>) => setPreferencias((p) => ({ ...p, ...cambios })), []);

  return <Ctx.Provider value={{ preferencias, cambiar }}>{children}</Ctx.Provider>;
}

export function usePreferencias() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePreferencias fuera de ProveedorPreferencias');
  return c;
}
