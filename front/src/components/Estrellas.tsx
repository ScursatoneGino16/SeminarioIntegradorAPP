import { useState } from 'react';

// Estrella de 9x9 píxeles. Cada "#" es un píxel lleno.
const MAPA_ESTRELLA = [
  '....#....',
  '...###...',
  '...###...',
  '#########',
  '.#######.',
  '..#####..',
  '..#####..',
  '.###.###.',
  '.##...##.',
];
const PIXELES = MAPA_ESTRELLA.flatMap((fila, y) => [...fila].flatMap((c, x) => (c === '#' ? [{ x, y }] : [])));

function EstrellaPixel({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      {PIXELES.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}

/** Una estrella con relleno parcial: 0 = vacía, 0.5 = media, 1 = llena. */
function Estrella({ relleno, tam }: { relleno: number; tam: number }) {
  return (
    <span className="estrella" style={{ width: tam, height: tam }}>
      <EstrellaPixel color="var(--estrella-vacia)" />
      {relleno > 0 && (
        <span className="estrella-relleno" style={{ width: `${relleno * 100}%` }}>
          <span style={{ display: 'block', width: tam, height: tam }}>
            <EstrellaPixel color="var(--oro)" />
          </span>
        </span>
      )}
    </span>
  );
}

/** Redondea al medio punto más cercano: 4,3 → 4,5 · 4,2 → 4. */
export const aMedios = (valor: number) => Math.round(valor * 2) / 2;

export function Estrellas({ valor, tam = 16 }: { valor: number; tam?: number }) {
  const redondeado = aMedios(valor);
  return (
    <span className="estrellas" role="img" aria-label={`${valor.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Estrella key={i} tam={tam} relleno={Math.min(1, Math.max(0, redondeado - (i - 1)))} />
      ))}
    </span>
  );
}

export function SelectorEstrellas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const mostrado = hover || valor;
  return (
    <div className="selector-estrellas" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valor === i}
          aria-label={`${i} estrella${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          <Estrella tam={30} relleno={i <= mostrado ? 1 : 0} />
        </button>
      ))}
      <span className="selector-texto">{valor ? `${valor}/5` : 'Elegí una calificación'}</span>
    </div>
  );
}
