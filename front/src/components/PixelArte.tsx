import { usePreferencias, type Preferencias } from '../preferencias';

/**
 * Dibuja un sprite a partir de un mapa de caracteres: cada carácter es un píxel
 * y su color sale de la paleta ("." = transparente).
 */
export function Sprite({ mapa, paleta, alto }: { mapa: string[]; paleta: Record<string, string>; alto: number }) {
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

// Manito con el pulgar arriba: puño de piel, dedos marcados y puño de la manga a la izquierda.
const MANITO = [
  '.....aa.....',
  '....abba....',
  '....abba....',
  '...abbba....',
  '..abbbbaaaa.',
  'aaabbbbbbbba',
  'acabbbbaaaaa',
  'acabbbbbbbba',
  'acabbbbaaaaa',
  'acabbbbbbbba',
  'acabbbbaaaa.',
  'aaabbbbbbba.',
  '..aaaaaaaa..',
];
const PALETA_LIKE = { a: '#2a2d4a', b: '#ffd2a1', c: '#2fbf4f' };
const PALETA_DISLIKE = { a: '#2a2d4a', b: '#ffd2a1', c: '#d83a4a' };

export const ManitoLike = ({ alto = 18 }: { alto?: number }) => (
  <Sprite mapa={MANITO} paleta={PALETA_LIKE} alto={alto} />
);
/** Pulgar abajo: el mismo sprite espejado verticalmente. */
export const ManitoDislike = ({ alto = 18 }: { alto?: number }) => (
  <Sprite mapa={[...MANITO].reverse()} paleta={PALETA_DISLIKE} alto={alto} />
);

/** Cursor de mano estilo Chrono Trigger (public/sprites/mano.png, ver CREDITOS.md). */
export const Mano = ({ className = '' }: { className?: string }) => <span className={`mano ${className}`} aria-hidden />;

// Calendario de pared: anillas, encabezado rojo y días.
const CALENDARIO = [
  '..a...a..',
  'aabaaabaa',
  'accccccca',
  'accccccca',
  'addddddda',
  'adedeeeda',
  'addddddda',
  'adeedeeda',
  'addddddda',
  'aaaaaaaaa',
];
const PALETA_CALENDARIO = { a: '#2a2d4a', b: '#c9cde8', c: '#d83a4a', d: '#f4f4fc', e: '#7d82ab' };

// Dos aventureros: un mago azul y una arquera verde.
const AMIGOS = [
  '.aaa...bbb..',
  '.aca...bdb..',
  '.aaa...bbb..',
  '............',
  'aaaaa.bbbbb.',
  'aacaa.bbdbb.',
  'aaaaa.bbbbb.',
];
const PALETA_AMIGOS = { a: '#7fd8ff', b: '#48e078', c: '#08304a', d: '#0b3d17' };

// Campana dorada con badajo
const CAMPANA = [
  '....a....',
  '...aaa...',
  '..abbca..',
  '.abbbbca.',
  '.abbbbca.',
  '.abbbbca.',
  'abbbbbbca',
  'aaaaaaaaa',
  '...ada...',
  '....a....',
];
const PALETA_CAMPANA = { a: '#4a3000', b: '#ffd447', c: '#b07a10', d: '#c9cde8' };

export const Campana = ({ alto = 20 }: { alto?: number }) => <Sprite mapa={CAMPANA} paleta={PALETA_CAMPANA} alto={alto} />;

export type NombreIcono = 'espada' | 'cofre' | 'armadura' | 'corona' | 'calendario' | 'amigos';

/** Íconos de ítem CC0 (public/sprites, ver CREDITOS.md); el calendario se dibuja acá. */
export const Icono = ({ nombre, alto = 18 }: { nombre: NombreIcono; alto?: number }) =>
  nombre === 'calendario' ? (
    <Sprite mapa={CALENDARIO} paleta={PALETA_CALENDARIO} alto={alto} />
  ) : nombre === 'amigos' ? (
    <Sprite mapa={AMIGOS} paleta={PALETA_AMIGOS} alto={alto * 0.8} />
  ) : (
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
