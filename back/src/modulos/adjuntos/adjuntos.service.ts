// Adjuntos de las reseñas: GIFs de Giphy e imágenes subidas por los usuarios.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../../config.js';
import { ErrorApp, solicitudInvalida } from '../../shared/errores.js';

export const MAX_ADJUNTOS = 4;
export const RUTA_UPLOADS = '/api/uploads';

const FIRMAS: Array<{ ext: string; coincide: (b: Buffer) => boolean }> = [
  { ext: 'png', coincide: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', coincide: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')) },
  { ext: 'webp', coincide: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

/** Tipo real de la imagen según sus primeros bytes (no se confía en el Content-Type). */
export function extensionImagen(datos: Buffer): string | null {
  return FIRMAS.find((f) => f.coincide(datos))?.ext ?? null;
}

export async function guardarImagen(datos: unknown) {
  if (!Buffer.isBuffer(datos) || datos.length === 0) {
    throw solicitudInvalida('Enviá la imagen como cuerpo de la petición (PNG, JPG, GIF o WEBP)');
  }
  const ext = extensionImagen(datos);
  if (!ext) throw solicitudInvalida('Formato no soportado: solo PNG, JPG, GIF o WEBP');
  const archivo = `${randomUUID()}.${ext}`;
  await mkdir(config.carpetaUploads, { recursive: true });
  await writeFile(path.join(config.carpetaUploads, archivo), datos);
  return { url: `${RUTA_UPLOADS}/${archivo}` };
}

const imagenSubida = new RegExp(`^${RUTA_UPLOADS}/[0-9a-f-]{36}\\.(png|jpg|gif|webp)$`);

function esGifDeGiphy(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /^(media\d*|i)\.giphy\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

export const adjuntoSchema = z
  .object({ tipo: z.enum(['gif', 'imagen']), url: z.string().max(500) })
  .refine((a) => (a.tipo === 'gif' ? esGifDeGiphy(a.url) : imagenSubida.test(a.url)), {
    message: 'Adjunto inválido: los GIF deben ser de Giphy y las imágenes, subidas a la app',
  })
  .refine((a) => a.tipo === 'gif' || existsSync(path.join(config.carpetaUploads, path.basename(a.url))), {
    message: 'La imagen adjunta no existe; volvé a subirla',
  });
export const adjuntosSchema = z.array(adjuntoSchema).max(MAX_ADJUNTOS, `Máximo ${MAX_ADJUNTOS} GIFs o imágenes`);

// --- Giphy ---

export const busquedaGifsSchema = z.object({
  q: z.string().trim().max(50).optional(),
  offset: z.coerce.number().int().min(0).max(4999).default(0),
});

interface GifGiphy {
  id: string;
  title: string;
  images: Record<string, { url: string; width: string; height: string } | undefined>;
}

/** Busca GIFs en Giphy (o trae los del momento si no hay texto). */
export async function buscarGifs({ q, offset }: z.infer<typeof busquedaGifsSchema>) {
  if (!config.giphyApiKey) throw new ErrorApp(503, 'La búsqueda de GIFs no está configurada', 'GIFS_NO_CONFIGURADOS');
  const url = new URL(`https://api.giphy.com/v1/gifs/${q ? 'search' : 'trending'}`);
  url.searchParams.set('api_key', config.giphyApiKey);
  if (q) url.searchParams.set('q', q);
  url.searchParams.set('limit', '24');
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('rating', 'pg-13');
  url.searchParams.set('lang', 'es');

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new ErrorApp(503, 'Giphy no responde en este momento', 'GIPHY_NO_DISPONIBLE');
  }
  if (!res.ok) throw new ErrorApp(503, `Giphy respondió con error (HTTP ${res.status})`, 'GIPHY_NO_DISPONIBLE');
  const datos = (await res.json()) as { data: GifGiphy[]; pagination: { total_count: number; offset: number; count: number } };
  return {
    total: datos.pagination.total_count,
    siguienteOffset: datos.pagination.offset + datos.pagination.count,
    gifs: datos.data.flatMap((g) => {
      const grande = g.images.fixed_height;
      const chico = g.images.fixed_height_small ?? grande;
      return grande && chico ? [{ id: g.id, titulo: g.title, url: grande.url, vistaPrevia: chico.url }] : [];
    }),
  };
}
