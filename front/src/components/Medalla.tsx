import type { Rango } from '../api';
import { horas, romano } from '../formato';
import { Sprite } from './PixelArte';

// Medalla con cinta: a = contorno, b = metal, c = brillo, d = sombra, r/s = cinta.
const MEDALLA = [
  '.rr...ss.',
  '.rrr.sss.',
  '..rrsss..',
  '...rss...',
  '..aaaaa..',
  '.abcbbda.',
  'abcbbbbda',
  'abbbbbbda',
  'abbbbbdda',
  '.abbddda.',
  '..aaaaa..',
];

// Un metal por escalón, de la madera al cristal trascendente.
const PALETAS: Record<Rango, Record<string, string>> = {
  'recien-llegado': { a: '#2a1a0a', b: '#8a5a2a', c: '#c08a50', d: '#5a3a1a', r: '#7d82ab', s: '#4a4f78' },
  explorador: { a: '#3b1d08', b: '#d07a4a', c: '#f5b08a', d: '#8a4a2a', r: '#48e078', s: '#167a2e' },
  combatiente: { a: '#3b1d08', b: '#c47a3a', c: '#f2b27a', d: '#8a4a1c', r: '#b8303a', s: '#7a1820' },
  veterano: { a: '#1a1d2e', b: '#9aa0b8', c: '#e0e4f0', d: '#5a6078', r: '#2f6fd8', s: '#1a3f8a' },
  experto: { a: '#2a2d4a', b: '#c9cde8', c: '#ffffff', d: '#7d82ab', r: '#b8303a', s: '#7a1820' },
  maestro: { a: '#4a3000', b: '#ffd447', c: '#fff3a0', d: '#b07a10', r: '#2fbf4f', s: '#167a2e' },
  campeon: { a: '#0b3d17', b: '#2fbf6f', c: '#a0ffc8', d: '#167a3e', r: '#ffd447', s: '#b07a10' },
  leyenda: { a: '#3a0a10', b: '#e04a5a', c: '#ffb0b8', d: '#8a1a2a', r: '#ffd447', s: '#b07a10' },
  'heroe-de-leyenda': { a: '#08304a', b: '#7fd8ff', c: '#e0f8ff', d: '#2f8fc0', r: '#a040d0', s: '#5a1880' },
  trascendente: { a: '#3a0a2a', b: '#ff6bd0', c: '#ffe0f6', d: '#b02a8a', r: '#7fd8ff', s: '#2f8fc0' },
};

/** Medalla de un rango. Sin `titulo` es decorativa (el texto lo pone quien la usa). */
export function Medalla({ rango, titulo, alto = 22 }: { rango: Rango; titulo?: string; alto?: number }) {
  return (
    <span className="medalla" {...(titulo ? { role: 'img', 'aria-label': titulo, title: titulo } : {})}>
      <Sprite mapa={MEDALLA} paleta={PALETAS[rango]} alto={alto} />
    </span>
  );
}

/** Medalla + título del rango, para la cabecera de una reseña. */
export function InsigniaResena({ insignia }: { insignia: { rango: Rango; titulo: string; nivel: number; horas: number } }) {
  return (
    <span
      className={`insignia-rango rango-${insignia.rango}`}
      title={`${romano(insignia.nivel)}. ${insignia.titulo} · ${horas(insignia.horas)} en este juego`}
    >
      <Medalla rango={insignia.rango} alto={18} />
      {insignia.titulo}
    </span>
  );
}
