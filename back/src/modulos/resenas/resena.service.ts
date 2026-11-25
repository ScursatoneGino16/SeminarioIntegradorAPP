// GestionPublicacionYGestionReseñas: Reseña y PersistenciaPGR.
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { conflicto, noEncontrado, prohibido } from '../../shared/errores.js';
import { SteamNoDisponibleError } from '../../importadores/steamHttp.js';
import { horasDeJuegoActuales } from '../usuario/usuario.service.js';
import { deltaValoracion, ordenCronologico, ordenPorRelevancia } from './organizarResena.js';
import { adjuntosSchema } from '../adjuntos/adjuntos.service.js';
import { horasGuardadas } from '../insignias/insignias.service.js';
import { insigniaPorHoras } from '../insignias/clasificaciones.js';
import { estaPorSalir } from '../lanzamientos/proximamente.js';
import { idsAmigos } from '../amigos/amigos.service.js';
import { juegoVisible } from '../catalogo/contenidoNoApto.js';
import { notificarLike, notificarVarios } from '../notificaciones/notificaciones.service.js';

// RNF 11: 1 a 5 estrellas y hasta 1200 caracteres.
const contenidoSchema = {
  calificacion: z.number().int().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  comentario: z.string().trim().min(1, 'El comentario es obligatorio').max(1200, 'Máximo 1200 caracteres'),
  adjuntos: adjuntosSchema.default([]),
};
export const registrarResenaSchema = z.object({ appId: z.number().int().positive(), ...contenidoSchema });
export const modificarResenaSchema = z.object(contenidoSchema);
export const valoracionSchema = z.object({ esLike: z.boolean().nullable() });

export const listadoSchema = z
  .object({
    appId: z.coerce.number().int().positive().optional(),
    steamId: z.string().regex(/^\d{17}$/).optional(),
    // Solo reseñas de mis amigos: de un juego (con appId) o todas, como actividad reciente
    deAmigos: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    pagina: z.coerce.number().int().min(1).default(1),
    tamanio: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((f) => !(f.appId && f.steamId), 'Indicá appId o steamId, no los dos')
  .refine((f) => f.deAmigos ? !f.steamId : !!f.appId !== !!f.steamId, 'Indicá appId o steamId (uno de los dos)');

const incluirBase = {
  usuario: { select: { steamId: true, nombreUsuario: true, avatarUrl: true } },
  videojuego: { select: { appId: true, nombre: true, imagenUrl: true } },
  adjuntos: { select: { tipo: true, url: true }, orderBy: { orden: 'asc' } },
} as const;

type ResenaBase = Prisma.ResenaGetPayload<{ include: typeof incluirBase }>;

/**
 * Agrega a cada reseña la valoración ("Me gusta"/"No me gusta") del usuario que consulta
 * y la insignia del autor en ese juego, según sus horas actuales (o las del momento de reseñar).
 */
async function enriquecer(resenas: ResenaBase[], visor: string) {
  const ids = resenas.map((r) => r.resenaId);
  if (!ids.length) return [];
  const [valoraciones, horas] = await Promise.all([
    prisma.valoracionXResena.findMany({ where: { resenaId: { in: ids }, steamId: visor } }),
    horasGuardadas(resenas.map((r) => ({ steamId: r.steamId, appId: r.appId }))),
  ]);
  const miValoracion = new Map(valoraciones.map((v) => [v.resenaId, v.esLike]));
  return resenas.map((r) => {
    const horasActuales = Math.max(r.horasAlComentar, horas.get(`${r.steamId}:${r.appId}`) ?? 0);
    const insignia = insigniaPorHoras(horasActuales);
    return {
      ...r,
      esPropia: r.steamId === visor,
      miValoracion: miValoracion.get(r.resenaId) ?? null,
      insignia: insignia && { rango: insignia.id, titulo: insignia.titulo, nivel: insignia.nivel, horas: horasActuales },
    };
  });
}

const nuevosAdjuntos = (adjuntos: z.infer<typeof adjuntosSchema>) => adjuntos.map((a, orden) => ({ ...a, orden }));

export async function listarResenas(f: z.infer<typeof listadoSchema>, visor: string) {
  const where: Prisma.ResenaWhereInput = {
    videojuego: juegoVisible,
    ...(f.deAmigos
      ? { steamId: { in: await idsAmigos(visor) }, ...(f.appId ? { appId: f.appId } : {}) }
      : f.appId
        ? { appId: f.appId }
        : { steamId: f.steamId }),
  };
  const [total, resenas] = await prisma.$transaction([
    prisma.resena.count({ where }),
    prisma.resena.findMany({
      where,
      include: incluirBase,
      orderBy: f.appId && !f.deAmigos ? ordenPorRelevancia : ordenCronologico,
      skip: (f.pagina - 1) * f.tamanio,
      take: f.tamanio,
    }),
  ]);
  return {
    total,
    pagina: f.pagina,
    paginas: Math.max(1, Math.ceil(total / f.tamanio)),
    items: await enriquecer(resenas, visor),
  };
}

export async function consultarResena(resenaId: number, visor: string) {
  const r = await prisma.resena.findFirst({ where: { resenaId, videojuego: juegoVisible }, include: incluirBase });
  if (!r) throw noEncontrado('Reseña no encontrada');
  return (await enriquecer([r], visor))[0];
}

export async function miResena(appId: number, visor: string) {
  const r = await prisma.resena.findUnique({ where: { steamId_appId: { steamId: visor, appId } }, include: incluirBase });
  return r ? (await enriquecer([r], visor))[0] : null;
}

/** CU 7: incluye CU 6 (consultar biblioteca) para obtener las horas jugadas. */
export async function registrarResena(steamId: string, datos: z.infer<typeof registrarResenaSchema>) {
  const juego = await prisma.videojuego.findUnique({
    where: { appId: datos.appId },
    select: { proximamente: true, fechaLanzamiento: true, contenidoAdulto: true },
  });
  if (!juego || juego.contenidoAdulto) throw noEncontrado(`No existe un videojuego con AppID ${datos.appId}`);
  if (estaPorSalir(juego)) throw prohibido('Este juego todavía no salió: las reseñas se habilitan el día del lanzamiento');

  const existente = await prisma.resena.findUnique({
    where: { steamId_appId: { steamId, appId: datos.appId } },
    select: { resenaId: true },
  });
  if (existente) throw conflicto('Ya publicaste una reseña para este videojuego; podés modificarla');

  const { publica, horas, desdeCache } = await horasDeJuegoActuales(steamId, datos.appId);
  if (horas === null) {
    if (desdeCache) throw new SteamNoDisponibleError('no se pudieron obtener tus horas de juego');
    if (!publica) throw prohibido('Tu biblioteca de Steam es privada. Hacela pública para poder reseñar.');
    throw prohibido('Solo podés reseñar videojuegos que estén en tu biblioteca de Steam');
  }

  const amigos = await idsAmigos(steamId);
  const creada = await prisma.resena.create({
    data: {
      steamId,
      appId: datos.appId,
      calificacion: datos.calificacion,
      comentario: datos.comentario,
      horasAlComentar: horas, // RNF 10: se guarda el valor de este momento
      adjuntos: { create: nuevosAdjuntos(datos.adjuntos) },
    },
    include: incluirBase,
  });
  if (amigos.length) {
    await notificarVarios(prisma, amigos, 'resena_de_amigo', {
      actorId: steamId,
      resenaId: creada.resenaId,
      appId: creada.appId,
      juego: creada.videojuego.nombre,
    });
  }
  return (await enriquecer([creada], steamId))[0];
}

/** RNF 9: verifica en servidor que la reseña pertenezca al usuario autenticado. */
async function resenaPropia(resenaId: number, steamId: string) {
  const r = await prisma.resena.findUnique({ where: { resenaId }, select: { steamId: true } });
  if (!r) throw noEncontrado('Reseña no encontrada');
  if (r.steamId !== steamId) throw prohibido('Solo podés modificar o eliminar tus propias reseñas');
}

export async function modificarResena(resenaId: number, steamId: string, datos: z.infer<typeof modificarResenaSchema>) {
  await resenaPropia(resenaId, steamId);
  // Las horas al comentar NO se actualizan: conservan el valor histórico de la publicación.
  const r = await prisma.resena.update({
    where: { resenaId },
    data: {
      calificacion: datos.calificacion,
      comentario: datos.comentario,
      fechaModificacion: new Date(),
      adjuntos: { deleteMany: {}, create: nuevosAdjuntos(datos.adjuntos) },
    },
    include: incluirBase,
  });
  return (await enriquecer([r], steamId))[0];
}

export async function eliminarResena(resenaId: number, steamId: string) {
  await resenaPropia(resenaId, steamId);
  await prisma.resena.delete({ where: { resenaId } });
}

/** CU 11: "Me gusta" / "No me gusta" (null quita la valoración). */
export async function valorarResena(resenaId: number, steamId: string, esLike: boolean | null) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.resena.findUnique({
      where: { resenaId },
      select: { steamId: true, appId: true, videojuego: { select: { nombre: true } } },
    });
    if (!r) throw noEncontrado('Reseña no encontrada');
    if (r.steamId === steamId) throw prohibido('No podés valorar tu propia reseña');

    const clave = { steamId_resenaId: { steamId, resenaId } };
    const previa = (await tx.valoracionXResena.findUnique({ where: clave }))?.esLike ?? null;
    if (esLike === null) {
      if (previa !== null) await tx.valoracionXResena.delete({ where: clave });
    } else {
      await tx.valoracionXResena.upsert({ where: clave, create: { steamId, resenaId, esLike }, update: { esLike } });
    }
    const delta = deltaValoracion(previa, esLike);
    // Solo los "Me gusta" nuevos avisan al autor (los "No me gusta" no se notifican).
    if (delta.like > 0) {
      await notificarLike(tx, r.steamId, steamId, { resenaId, appId: r.appId, juego: r.videojuego.nombre });
    }
    const act = await tx.resena.update({
      where: { resenaId },
      data: { cantLike: { increment: delta.like }, cantDislike: { increment: delta.dislike } },
      select: { cantLike: true, cantDislike: true },
    });
    return { ...act, miValoracion: esLike };
  });
}

