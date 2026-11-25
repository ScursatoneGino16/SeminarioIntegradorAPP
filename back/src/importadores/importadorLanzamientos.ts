// ImportadorLanzamientos: próximos lanzamientos desde la tienda de Steam (no requiere API key).
// - Lista: búsqueda de la tienda filtrada por "próximos populares".
// - Detalle: /api/appdetails (nombre, descripción, portada, géneros y fecha de salida).
import { fetchSteam } from './steamHttp.js';

export interface DetalleLanzamiento {
  appId: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  generos: string[];
  proximamente: boolean;
  /** null si Steam no informa un día exacto */
  fecha: Date | null;
  fechaTexto: string | null;
}

const MESES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Convierte la fecha de la tienda (en inglés) a un día UTC: "22 Oct, 2026" o "Oct 22, 2026".
 * Devuelve null para fechas aproximadas ("Q1 2027", "2027", "Coming soon", "To be announced").
 */
export function parsearFechaSteam(texto: string): Date | null {
  const t = texto.trim();
  const diaMes = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/i.exec(t);
  const mesDia = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(t);
  const [dia, mes, anio] = diaMes
    ? [Number(diaMes[1]), diaMes[2], Number(diaMes[3])]
    : mesDia
      ? [Number(mesDia[2]), mesDia[1], Number(mesDia[3])]
      : [NaN, '', NaN];
  const m = MESES[mes.toLowerCase()];
  if (m === undefined || !dia) return null;
  const fecha = new Date(Date.UTC(anio, m, dia));
  // Descarta días inexistentes (p. ej. 31 Feb)
  return fecha.getUTCDate() === dia ? fecha : null;
}

/** AppIDs de los próximos lanzamientos más populares de la tienda. */
export async function listarProximos(cantidad: number): Promise<number[]> {
  const ids = new Set<number>();
  for (let inicio = 0; ids.size < cantidad; inicio += 50) {
    const url = new URL('https://store.steampowered.com/search/results/');
    url.searchParams.set('filter', 'popularcomingsoon');
    url.searchParams.set('category1', '998'); // solo juegos (sin DLC, bandas sonoras ni software)
    url.searchParams.set('infinite', '1');
    url.searchParams.set('start', String(inicio));
    url.searchParams.set('count', '50');
    url.searchParams.set('cc', 'us');
    url.searchParams.set('l', 'english');
    const res = await fetchSteam(url.toString());
    const { results_html: html } = (await res.json()) as { results_html?: string };
    const encontrados = [...(html ?? '').matchAll(/data-ds-appid="(\d+)"/g)].map((m) => Number(m[1]));
    if (!encontrados.length) break;
    for (const id of encontrados) ids.add(id);
  }
  return [...ids].slice(0, cantidad);
}

interface AppDetails {
  success: boolean;
  data?: {
    type: string;
    name: string;
    short_description?: string;
    header_image?: string;
    genres?: Array<{ description: string }>;
    release_date?: { coming_soon: boolean; date: string };
  };
}

/** Detalle de un juego de la tienda. Devuelve null si no existe o no es un juego. */
export async function detalleLanzamiento(appId: number): Promise<DetalleLanzamiento | null> {
  const res = await fetchSteam(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`);
  const cuerpo = (await res.json()) as Record<string, AppDetails> | null;
  const d = cuerpo?.[appId];
  if (!d?.success || !d.data || d.data.type !== 'game') return null;
  const texto = d.data.release_date?.date?.trim() || null;
  return {
    appId,
    nombre: d.data.name.trim(),
    descripcion: d.data.short_description?.trim() ?? '',
    imagenUrl: d.data.header_image || null,
    generos: (d.data.genres ?? []).map((g) => g.description),
    proximamente: d.data.release_date?.coming_soon ?? false,
    fecha: texto ? parsearFechaSteam(texto) : null,
    fechaTexto: texto?.slice(0, 60) ?? null,
  };
}
