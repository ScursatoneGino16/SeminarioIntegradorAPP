import { usePreferencias, type Preferencias } from '../preferencias';

/**
 * Dibuja un sprite a partir de un mapa de caracteres: cada carácter es un píxel
 * y su color sale de la paleta ("." = transparente).
 */
function Sprite({ mapa, paleta, alto }: { mapa: string[]; paleta: Record<string, string>; alto: number }) {
  const ancho = mapa[0].length;
  return (
    <svg
      viewBox={`0 0 ${ancho} ${mapa.length}`}
      height={alto}
      width={(alto * ancho) / mapa.length}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: 'block' }}
    >
      {mapa.flatMap((fila, y) =>
        [...fila].map((c, x) =>
          paleta[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={paleta[c]} /> : null,
        ),
      )}
    </svg>
  );
}

// Rupia verde: borde oscuro, brillo a la izquierda y sombra a la derecha.
const RUPIA = [
  '...a...',
  '..aca..',
  '.acbda.',
  'acbbbda',
  'acbbbda',
  'acbbbda',
  'acbbbda',
  'acbbbda',
  'acbbbda',
  '.acbda.',
  '..ada..',
  '...a...',
];
const PALETA_RUPIA = { a: '#0b3d17', b: '#2fbf4f', c: '#9dffb0', d: '#167a2e' };

// Tacho de basura metálico con tapa y ranuras.
const TACHO = [
  '...aaa...',
  '.aaaaaaa.',
  'abbbbbbba',
  'aaaaaaaaa',
  '.abcbcba.',
  '.abcbcba.',
  '.abcbcba.',
  '.abcbcba.',
  '.abcbcba.',
  '.abbbbba.',
  '..aaaaa..',
];
const PALETA_TACHO = { a: '#2a2d4a', b: '#c9cde8', c: '#7d82ab' };

export const Rupia = ({ alto = 18 }: { alto?: number }) => <Sprite mapa={RUPIA} paleta={PALETA_RUPIA} alto={alto} />;
export const Tacho = ({ alto = 18 }: { alto?: number }) => <Sprite mapa={TACHO} paleta={PALETA_TACHO} alto={alto} />;

/** Cursor de mano estilo Chrono Trigger (public/sprites/mano.png, ver CREDITOS.md). */
export const Mano = ({ className = '' }: { className?: string }) => <span className={`mano ${className}`} aria-hidden />;

export type NombreIcono = 'espada' | 'cofre' | 'armadura' | 'corona';

/** Íconos de ítem CC0 (public/sprites, ver CREDITOS.md). */
export const Icono = ({ nombre, alto = 18 }: { nombre: NombreIcono; alto?: number }) => (
  <img src={`/sprites/${nombre}.png`} alt="" height={alto} width={alto} style={{ imageRendering: 'pixelated' }} />
);

/** Fondo animado: cielo nocturno y nubes pixeladas que se desplazan despacio (ver CREDITOS.md). */
export function FondoAnimado() {
  const { preferencias } = usePreferencias();
  return <div className="fondo-animado" data-fondo={preferencias.fondo} aria-hidden />;
}

/**
 * Retrato del jugador dentro del marco elegido en Configuración. Si se pasa `marcoSteam`
 * (marco de avatar equipado en Steam), se dibuja ese marco encima del avatar, como en Steam.
 */
export function Retrato({
  url,
  nombre,
  marco,
  marcoSteam,
}: {
  url: string | null;
  nombre: string;
  marco?: Preferencias['marco'];
  marcoSteam?: string | null;
}) {
  const { preferencias } = usePreferencias();
  const imagen = (
    <div className="retrato-imagen">
      {url ? <img src={url} alt="" /> : <span>{nombre.trim().charAt(0).toUpperCase() || '?'}</span>}
    </div>
  );
  if (marcoSteam) {
    return (
      <div className="retrato retrato-steam">
        {imagen}
        <img className="retrato-marco-steam" src={marcoSteam} alt="" />
      </div>
    );
  }
  return (
    <div className="retrato" data-marco={marco ?? preferencias.marco}>
      {imagen}
    </div>
  );
}

/** Fondo de perfil de Steam (imagen o video animado) detrás de la página de perfil. */
export function FondoPerfilSteam({ imagen, video }: { imagen: string; video: string | null }) {
  const animado = video && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="fondo-perfil-steam" aria-hidden>
      {animado ? <video src={video} poster={imagen} autoPlay muted loop playsInline /> : <img src={imagen} alt="" />}
    </div>
  );
}
