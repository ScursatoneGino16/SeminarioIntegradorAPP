// Contenido que no se muestra en la app (para poder presentarla en un ámbito académico).
// Nada se borra: los juegos quedan marcados con `contenidoAdulto` y las categorías y etiquetas
// con `oculta`, así se puede revertir cambiando estas listas o el criterio.

/** Géneros de Steam (ya traducidos) que no se muestran */
export const CATEGORIAS_OCULTAS = new Set(['Violento', 'Gore', 'Desnudos', 'Contenido sexual']);

/** Etiquetas de la comunidad que no se muestran */
export const ETIQUETAS_OCULTAS = new Set(['Violent', 'Gore', 'Blood', 'Sexual Content', 'Nudity', 'Mature', 'Hentai', 'NSFW']);

const EXPLICITAS = ['Hentai', 'NSFW'];
const ADULTAS = [...EXPLICITAS, 'Sexual Content', 'Nudity'];

/**
 * Decide si un juego tiene contenido sexual explícito a partir de los votos de sus etiquetas.
 * No alcanza con que tenga la etiqueta (en Steam la comunidad las vota, a veces en broma:
 * Blender o LEGO Star Wars tienen "NSFW"), sino que tiene que pesar frente a su etiqueta más votada:
 *  - Hentai/NSFW con al menos el 30 % de los votos de la etiqueta principal, o
 *  - contenido adulto (también "Sexual Content"/"Nudity") como etiqueta casi principal (≥ 90 %)
 *    y algo de Hentai/NSFW (≥ 10 %).
 * Así RPG maduros como Cyberpunk 2077 o Baldur's Gate 3 (con "Nudity" pero sin "NSFW") siguen visibles.
 */
export function esContenidoAdulto(votosEtiquetas: Record<string, number>): boolean {
  const principal = Math.max(0, ...Object.values(votosEtiquetas));
  if (!principal) return false;
  const peso = (etiquetas: string[]) => Math.max(0, ...etiquetas.map((e) => votosEtiquetas[e] ?? 0)) / principal;
  const explicito = peso(EXPLICITAS);
  return explicito >= 0.3 || (peso(ADULTAS) >= 0.9 && explicito >= 0.1);
}

/** Filtro de Prisma para los juegos que se pueden mostrar */
export const juegoVisible = { contenidoAdulto: false } as const;
