// Adaptador del "Steam Games Dataset" (FronkonGames, licencia MIT):
// https://huggingface.co/datasets/FronkonGames/steam-games-dataset
// El archivo games.json es un objeto { "<appId>": { name, short_description, header_image, genres, tags, ... } }.
import { createReadStream } from 'node:fs';
import streamObject from 'stream-json/streamers/stream-object.js';
import type { ItemDataset } from './catalogo.service.js';

export const URL_DATASET_STEAM =
  'https://huggingface.co/datasets/FronkonGames/steam-games-dataset/resolve/main/games.json';

/** Cantidad máxima de etiquetas por juego (las más votadas por la comunidad de Steam). */
const MAX_ETIQUETAS = 20;

/** Los géneros de Steam se usan como Categorías y se traducen al español. */
const GENEROS_ES: Record<string, string> = {
  Action: 'Acción',
  Adventure: 'Aventura',
  Casual: 'Casual',
  Indie: 'Indie',
  RPG: 'RPG',
  Simulation: 'Simulación',
  Strategy: 'Estrategia',
  Sports: 'Deportes',
  Racing: 'Carreras',
  'Massively Multiplayer': 'Multijugador masivo',
  'Free to Play': 'Gratuito',
  'Free To Play': 'Gratuito',
  'Early Access': 'Acceso anticipado',
  Violent: 'Violento',
  Gore: 'Gore',
  'Sexual Content': 'Contenido sexual',
  Nudity: 'Desnudos',
  Education: 'Educación',
  Utilities: 'Utilidades',
  'Design & Illustration': 'Diseño e ilustración',
  'Animation & Modeling': 'Animación y modelado',
  'Audio Production': 'Producción de audio',
  'Video Production': 'Producción de video',
  'Photo Editing': 'Edición de fotos',
  'Game Development': 'Desarrollo de juegos',
  'Web Publishing': 'Publicación web',
  'Software Training': 'Formación en software',
  Accounting: 'Contabilidad',
  Movie: 'Película',
  Documentary: 'Documental',
  Episodic: 'Episódico',
  'Short': 'Corto',
  Tutorial: 'Tutorial',
  '360 Video': 'Video 360',
};

interface JuegoDatasetSteam {
  name?: string;
  short_description?: string;
  header_image?: string;
  genres?: string[];
  positive?: number;
  negative?: number;
  /** { "Open World": 5078, ... } o [] si no tiene etiquetas */
  tags?: Record<string, number> | string[];
}

/** Convierte una entrada del dataset al formato de importación. Devuelve null si no es utilizable. */
export function desdeDatasetSteam(clave: string, juego: JuegoDatasetSteam): ItemDataset | null {
  const appId = Number(clave);
  const nombre = juego.name?.trim();
  if (!Number.isInteger(appId) || appId <= 0 || !nombre) return null;

  const etiquetas = Array.isArray(juego.tags)
    ? juego.tags
    : Object.entries(juego.tags ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t);

  return {
    appId,
    nombre,
    descripcion: juego.short_description?.trim() ?? '',
    imagenUrl: juego.header_image || null,
    categorias: (juego.genres ?? []).map((g) => GENEROS_ES[g] ?? g),
    etiquetas: etiquetas.slice(0, MAX_ETIQUETAS),
    votosSteam: Math.max(0, Math.trunc((juego.positive ?? 0) + (juego.negative ?? 0))),
  };
}

/** Lee games.json en streaming (el archivo pesa ~1 GB y no entra en memoria como string). */
export async function* leerDatasetSteam(ruta: string): AsyncGenerator<ItemDataset> {
  const flujo = createReadStream(ruta).pipe(streamObject.withParserAsStream());
  for await (const { key, value } of flujo as AsyncIterable<{ key: string; value: JuegoDatasetSteam }>) {
    const item = desdeDatasetSteam(key, value);
    if (item) yield item;
  }
}
