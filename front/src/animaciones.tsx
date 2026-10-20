// Animaciones al estilo de los RPG de 16 bits. Todas son cortas y se desactivan
// si el sistema tiene activado "reducir movimiento".
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';

export const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Transición de batalla ----------

const DURACION_ENTRADA = 520;
const DURACION_SALIDA = 320;

const CtxBatalla = createContext<(destino: string) => void>(() => {});

/** Destello y remolino a negro antes de navegar, como al empezar un combate en Final Fantasy. */
export function ProveedorBatalla({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [fase, setFase] = useState<'entrando' | 'saliendo' | null>(null);
  const temporizadores = useRef<number[]>([]);

  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  const iniciar = useCallback(
    (destino: string) => {
      if (reducirMovimiento()) {
        navigate(destino);
        return;
      }
      setFase('entrando');
      temporizadores.current.push(
        window.setTimeout(() => {
          navigate(destino);
          window.scrollTo(0, 0);
          setFase('saliendo');
          temporizadores.current.push(window.setTimeout(() => setFase(null), DURACION_SALIDA));
        }, DURACION_ENTRADA),
      );
    },
    [navigate],
  );

  return (
    <CtxBatalla.Provider value={iniciar}>
      {children}
      {fase && <div className={`batalla batalla-${fase}`} aria-hidden />}
    </CtxBatalla.Provider>
  );
}

/**
 * onClick para un Link que entra "en batalla". Respeta ctrl/cmd/shift-click y el clic del medio
 * (abrir en otra pestaña), que siguen funcionando como un link normal.
 */
export function useClickBatalla(destino: string) {
  const iniciar = useContext(CtxBatalla);
  return (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    iniciar(destino);
  };
}

/** Link que entra a la pantalla de destino con la transición de batalla. */
export function LinkBatalla({ to, ...props }: LinkProps & { to: string }) {
  const onClick = useClickBatalla(to);
  return <Link to={to} onClick={onClick} {...props} />;
}

// ---------- Texto de diálogo letra por letra ----------

/** Devuelve el texto plano si los hijos son solo texto (si hay elementos, no se anima). */
export function textoPlano(children: ReactNode): string | null {
  const partes = Children.toArray(children);
  return partes.every((p) => typeof p === 'string' || typeof p === 'number') ? partes.join('') : null;
}

/** Cantidad de letras visibles del texto; `completar` muestra todo de una (al hacer clic). */
export function useEscritura(texto: string | null, msPorLetra = 22) {
  const largo = texto?.length ?? 0;
  const [visibles, setVisibles] = useState(() => (reducirMovimiento() ? largo : 0));

  useEffect(() => {
    if (!texto || reducirMovimiento()) {
      setVisibles(largo);
      return;
    }
    setVisibles(0);
    const id = window.setInterval(() => {
      setVisibles((v) => {
        if (v + 1 >= largo) window.clearInterval(id);
        return Math.min(largo, v + 1);
      });
    }, msPorLetra);
    return () => window.clearInterval(id);
  }, [texto, largo, msPorLetra]);

  return { visibles, completo: visibles >= largo, completar: () => setVisibles(largo) };
}

// ---------- Destellos y números flotantes ----------

/** Fuegos artificiales pixelados que se reproducen una vez (sprite de myriad, CC0). */
export function Destello({ onFin }: { onFin?: () => void }) {
  if (reducirMovimiento()) return null;
  return <span className="destello" aria-hidden onAnimationEnd={onFin} />;
}

export interface Flotante {
  id: number;
  texto: string;
  tipo: 'bueno' | 'malo';
}

/** Lista de efectos de un solo uso (destellos o números) que se quitan solos al terminar. */
export function useEfectos<T>() {
  const [efectos, setEfectos] = useState<Array<T & { id: number }>>([]);
  const siguiente = useRef(0);
  const agregar = useCallback((efecto: T) => {
    if (reducirMovimiento()) return;
    siguiente.current += 1;
    const id = siguiente.current;
    setEfectos((e) => [...e, { ...efecto, id }]);
  }, []);
  const quitar = useCallback((id: number) => setEfectos((e) => e.filter((x) => x.id !== id)), []);
  return { efectos, agregar, quitar };
}

/** Número que sube y se desvanece, como el daño en una batalla ("+1", "-1"). */
export function NumeroFlotante({ texto, tipo, onFin }: { texto: string; tipo: Flotante['tipo']; onFin: () => void }) {
  return (
    <span className={`numero-flotante numero-${tipo}`} aria-hidden onAnimationEnd={onFin}>
      {texto}
    </span>
  );
}
