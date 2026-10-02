// GestionCatalogo: consulta, búsqueda y filtrado del catálogo, e importación del dataset.
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { aplanar, incluirClasificacion } from '../videojuego/videojuego.service.js';

const listaIds = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
  );

export const filtrosCatalogoSchema = z.object({
  q: z.string().trim().max(200).optional(),
  categorias: listaIds,
  etiquetas: listaIds,
  orden: z.enum(['relevancia', 'votos', 'resenas', 'nombre', 'appId']).default('relevancia'),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanio: z.coerce.number().int().min(1).max(60).default(24),
});
export type FiltrosCatalogo = z.infer<typeof filtrosCatalogoSchema>;

/** Construye el WHERE: búsqueda por nombre o AppID; las categorías/etiquetas elegidas deben cumplirse todas. */
export function construirFiltro(f: Pick<FiltrosCatalogo, 'q' | 'categorias' | 'etiquetas'>): Prisma.VideojuegoWhereInput {
  const and: Prisma.VideojuegoWhereInput[] = [];
  if (f.q) {
    const porNombre: Prisma.VideojuegoWhereInput = { nombre: { contains: f.q, mode: 'insensitive' } };
    and.push(/^\d+$/.test(f.q) ? { OR: [porNombre, { appId: Number(f.q) }] } : porNombre);
  }
  for (const categoriaId of f.categorias) and.push({ categorias: { some: { categoriaId } } });
  for (const etiquetaId of f.etiquetas) and.push({ etiquetas: { some: { etiquetaId } } });
  return and.length ? { AND: and } : {};
}

/** Mismo filtro que construirFiltro, en SQL, para la consulta ordenada por relevancia. */
function filtroSql(f: Pick<FiltrosCatalogo, 'q' | 'categorias' | 'etiquetas'>): Prisma.Sql {
  const condiciones: Prisma.Sql[] = [];
  if (f.q) {
    const patron = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const porNombre = Prisma.sql`v.nombre_videojuego ILIKE ${patron}`;
    condiciones.push(/^\d+$/.test(f.q) ? Prisma.sql`(${porNombre} OR v.app_id = ${Number(f.q)})` : porNombre);
  }
  for (const id of f.categorias)
    condiciones.push(Prisma.sql`EXISTS (SELECT 1 FROM videojuego_x_categoria c WHERE c.app_id = v.app_id AND c.categoria_id = ${id})`);
  for (const id of f.etiquetas)
    condiciones.push(Prisma.sql`EXISTS (SELECT 1 FROM videojuego_x_etiqueta e WHERE e.app_id = v.app_id AND e.etiqueta_id = ${id})`);
  return condiciones.length ? Prisma.sql`WHERE ${Prisma.join(condiciones, ' AND ')}` : Prisma.empty;
}

/**
 * Orden "recomendado": primero los juegos de la biblioteca del usuario (por horas jugadas),
 * luego los más reseñados en la plataforma, luego los más votados en Steam y por último el resto.
 */
async function idsPorRelevancia(f: FiltrosCatalogo, visor: string): Promise<number[]> {
  const filas = await prisma.$queryRaw<Array<{ app_id: number }>>`
    SELECT v.app_id
    FROM videojuego v
    LEFT JOIN usuario_x_videojuego b ON b.app_id = v.app_id AND b.steam_id = ${visor}
    LEFT JOIN (SELECT app_id, COUNT(*) AS cant FROM resena GROUP BY app_id) r ON r.app_id = v.app_id
    ${filtroSql(f)}
    ORDER BY (b.app_id IS NOT NULL) DESC, b.horas_jugadas DESC NULLS LAST,
             COALESCE(r.cant, 0) DESC, v.votos_steam DESC, v.nombre_videojuego ASC, v.app_id ASC
    LIMIT ${f.tamanio} OFFSET ${(f.pagina - 1) * f.tamanio}`;
  return filas.map((x) => x.app_id);
}

const ordenesPrisma: Record<Exclude<FiltrosCatalogo['orden'], 'relevancia'>, Prisma.VideojuegoOrderByWithRelationInput> = {
  votos: { votosSteam: 'desc' },
  resenas: { resenas: { _count: 'desc' } },
  nombre: { nombre: 'asc' },
  appId: { appId: 'asc' },
};

export async function consultarCatalogo(f: FiltrosCatalogo, visor: string) {
  const where = construirFiltro(f);
  const incluir = { ...incluirClasificacion, _count: { select: { resenas: true } } } as const;

  const [total, items] = await Promise.all([
    prisma.videojuego.count({ where }),
    f.orden === 'relevancia'
      ? idsPorRelevancia(f, visor).then(async (ids) => {
          const juegos = await prisma.videojuego.findMany({ where: { appId: { in: ids } }, include: incluir });
          const porId = new Map(juegos.map((j) => [j.appId, j]));
          return ids.map((id) => porId.get(id)!).filter(Boolean);
        })
      : prisma.videojuego.findMany({
          where,
          orderBy: [ordenesPrisma[f.orden], { appId: 'asc' }],
          skip: (f.pagina - 1) * f.tamanio,
          take: f.tamanio,
          include: incluir,
        }),
  ]);

  const enBiblioteca = new Map(
    (
      await prisma.usuarioXVideojuego.findMany({
        where: { steamId: visor, appId: { in: items.map((v) => v.appId) } },
        select: { appId: true, horasJugadas: true },
      })
    ).map((b) => [b.appId, b.horasJugadas]),
  );

  return {
    total,
    pagina: f.pagina,
    tamanio: f.tamanio,
    paginas: Math.max(1, Math.ceil(total / f.tamanio)),
    items: items.map(({ _count, ...v }) => ({
      ...aplanar(v),
      cantidadResenas: _count.resenas,
      enBiblioteca: enBiblioteca.has(v.appId),
      horasJugadas: enBiblioteca.get(v.appId) ?? null,
    })),
  };
}

// --- Importación del catálogo (RNF 4) ---

export const itemDatasetSchema = z.object({
  appId: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().default(''),
  imagenUrl: z.string().nullable().optional(),
  categorias: z.array(z.string().trim().min(1).max(100)).default([]),
  etiquetas: z.array(z.string().trim().min(1).max(100)).default([]),
  /** Popularidad en Steam (opcional; si no viene se conserva el valor guardado). */
  votosSteam: z.number().int().min(0).optional(),
});
export const datasetSchema = z.array(itemDatasetSchema);
export type ItemDataset = z.infer<typeof itemDatasetSchema>;

const urlPortadaSteam = (appId: number) => `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

export interface ResultadoImportacion {
  procesados: number;
  creados: number;
  actualizados: number;
  errores: Array<{ appId: number; error: string }>;
}

const limpiarNombres = (nombres: string[]) => [
  ...new Set(nombres.map((n) => n.trim().slice(0, 100)).filter(Boolean)),
];

/**
 * Importa o actualiza videojuegos del dataset por lotes. Cada lote es una transacción
 * corta e independiente, así la carga no bloquea las consultas de los usuarios (RNF 4)
 * y un lote con error no invalida el resto. Acepta un arreglo o un iterable asíncrono
 * (para datasets grandes leídos en streaming).
 */
export async function importarCatalogo(
  items: Iterable<ItemDataset> | AsyncIterable<ItemDataset>,
  opciones: { tamanioLote?: number; alProgresar?: (r: ResultadoImportacion) => void } = {},
): Promise<ResultadoImportacion> {
  const tamanioLote = opciones.tamanioLote ?? 500;
  const resultado: ResultadoImportacion = { procesados: 0, creados: 0, actualizados: 0, errores: [] };
  const idCategoria = new Map<string, number>();
  const idEtiqueta = new Map<string, number>();

  async function asegurarCategorias(nombres: string[]) {
    const faltan = nombres.filter((n) => !idCategoria.has(n));
    if (!faltan.length) return;
    await prisma.categoria.createMany({ data: faltan.map((nombre) => ({ nombre })), skipDuplicates: true });
    for (const c of await prisma.categoria.findMany({ where: { nombre: { in: faltan } } })) idCategoria.set(c.nombre, c.categoriaId);
  }
  async function asegurarEtiquetas(nombres: string[]) {
    const faltan = nombres.filter((n) => !idEtiqueta.has(n));
    if (!faltan.length) return;
    await prisma.etiqueta.createMany({ data: faltan.map((nombre) => ({ nombre })), skipDuplicates: true });
    for (const e of await prisma.etiqueta.findMany({ where: { nombre: { in: faltan } } })) idEtiqueta.set(e.nombre, e.etiquetaId);
  }

  async function procesarLote(crudo: ItemDataset[]) {
    // Si un AppID se repite dentro del lote, gana la última aparición.
    const lote = [...new Map(crudo.map((i) => [i.appId, i])).values()].map((i) => ({
      ...i,
      nombre: i.nombre.trim().slice(0, 200),
      categorias: limpiarNombres(i.categorias),
      etiquetas: limpiarNombres(i.etiquetas),
    }));
    try {
      await asegurarCategorias([...new Set(lote.flatMap((i) => i.categorias))]);
      await asegurarEtiquetas([...new Set(lote.flatMap((i) => i.etiquetas))]);
      const appIds = lote.map((i) => i.appId);

      const [filas] = await prisma.$transaction([
        prisma.$queryRaw<Array<{ creado: boolean }>>`
          INSERT INTO videojuego (app_id, nombre_videojuego, descripcion, imagen_url)
          SELECT * FROM unnest(
            ${appIds}::int[],
            ${lote.map((i) => i.nombre)}::text[],
            ${lote.map((i) => i.descripcion)}::text[],
            ${lote.map((i) => i.imagenUrl ?? urlPortadaSteam(i.appId))}::text[]
          )
          ON CONFLICT (app_id) DO UPDATE SET
            nombre_videojuego = EXCLUDED.nombre_videojuego,
            descripcion = EXCLUDED.descripcion,
            imagen_url = EXCLUDED.imagen_url
          RETURNING (xmax = 0) AS creado`,
        // Los votos solo se pisan si el dataset los trae (el formato propio puede omitirlos).
        prisma.$executeRaw`
          UPDATE videojuego v SET votos_steam = t.votos
          FROM unnest(${appIds}::int[], ${lote.map((i) => i.votosSteam ?? null)}::int[]) AS t(app_id, votos)
          WHERE v.app_id = t.app_id AND t.votos IS NOT NULL`,
        prisma.videojuegoXCategoria.deleteMany({ where: { appId: { in: appIds } } }),
        prisma.videojuegoXCategoria.createMany({
          data: lote.flatMap((i) => i.categorias.map((n) => ({ appId: i.appId, categoriaId: idCategoria.get(n)! }))),
        }),
        prisma.videojuegoXEtiqueta.deleteMany({ where: { appId: { in: appIds } } }),
        prisma.videojuegoXEtiqueta.createMany({
          data: lote.flatMap((i) => i.etiquetas.map((n) => ({ appId: i.appId, etiquetaId: idEtiqueta.get(n)! }))),
        }),
      ]);
      const creados = filas.filter((f) => f.creado).length;
      resultado.creados += creados;
      resultado.actualizados += filas.length - creados;
      resultado.procesados += filas.length;
    } catch (e) {
      const mensaje = (e as Error).message.split('\n').pop() ?? 'Error desconocido';
      for (const i of lote) resultado.errores.push({ appId: i.appId, error: mensaje });
    }
    opciones.alProgresar?.(resultado);
  }

  let lote: ItemDataset[] = [];
  for await (const item of items) {
    lote.push(item);
    if (lote.length >= tamanioLote) {
      await procesarLote(lote);
      lote = [];
    }
  }
  if (lote.length) await procesarLote(lote);
  return resultado;
}

/** Elimina categorías y etiquetas que quedaron sin videojuegos (p. ej. tras reemplazar el catálogo). */
export async function eliminarClasificacionesHuerfanas() {
  const [categorias, etiquetas] = await prisma.$transaction([
    prisma.categoria.deleteMany({ where: { videojuegos: { none: {} } } }),
    prisma.etiqueta.deleteMany({ where: { videojuegos: { none: {} } } }),
  ]);
  return { categorias: categorias.count, etiquetas: etiquetas.count };
}
