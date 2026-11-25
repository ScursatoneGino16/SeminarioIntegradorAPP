// GestionNotificaciones: avisos dentro de la app (campanita del encabezado).
// Las notificaciones se crean en la misma transacción que la acción que las origina.
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { noEncontrado } from '../../shared/errores.js';

type Cliente = Prisma.TransactionClient;

/** Datos guardados según el tipo. Los actores se guardan por SteamID y se resuelven al listar. */
export interface DatosNotificacion {
  solicitud_amistad: { actorId: string };
  amistad_aceptada: { actorId: string };
  /** Agrupa los "Me gusta" que todavía no se leyeron: "A Juan y 3 más les gustó tu reseña" */
  like_resena: { resenaId: number; appId: number; juego: string; actorIds: string[] };
  resena_de_amigo: { actorId: string; resenaId: number; appId: number; juego: string };
  lanzamiento: { appId: number; juego: string; fecha: string };
}
export type TipoNotificacion = keyof DatosNotificacion;

export function notificar<T extends TipoNotificacion>(cliente: Cliente, steamId: string, tipo: T, datos: DatosNotificacion[T]) {
  return cliente.notificacion.create({ data: { steamId, tipo, datos: datos as unknown as Prisma.InputJsonValue } });
}

export function notificarVarios<T extends TipoNotificacion>(cliente: Cliente, steamIds: string[], tipo: T, datos: DatosNotificacion[T]) {
  return cliente.notificacion.createMany({
    data: steamIds.map((steamId) => ({ steamId, tipo, datos: datos as unknown as Prisma.InputJsonValue })),
  });
}

/**
 * "Me gusta" en una reseña: si el autor tiene una notificación sin leer de esa reseña se le suma
 * el nuevo actor (y vuelve arriba de la lista); si no, se crea una nueva. Un mismo usuario no se
 * repite aunque saque y vuelva a poner el "Me gusta".
 */
export async function notificarLike(
  cliente: Cliente,
  autorId: string,
  actorId: string,
  resena: { resenaId: number; appId: number; juego: string },
) {
  const previa = await cliente.notificacion.findFirst({
    where: { steamId: autorId, tipo: 'like_resena', leidaEn: null, datos: { path: ['resenaId'], equals: resena.resenaId } },
  });
  if (!previa) return notificar(cliente, autorId, 'like_resena', { ...resena, actorIds: [actorId] });
  const datos = previa.datos as unknown as DatosNotificacion['like_resena'];
  if (datos.actorIds.includes(actorId)) return previa;
  return cliente.notificacion.update({
    where: { notificacionId: previa.notificacionId },
    data: {
      datos: { ...datos, actorIds: [actorId, ...datos.actorIds] } as unknown as Prisma.InputJsonValue,
      fechaCreacion: new Date(),
    },
  });
}

/** Borra las notificaciones sin leer de un tipo que mencionan a un actor (p. ej. una solicitud cancelada). */
export function retirarNotificacion(cliente: Cliente, steamId: string, tipo: TipoNotificacion, actorId: string) {
  return cliente.notificacion.deleteMany({
    where: { steamId, tipo, leidaEn: null, datos: { path: ['actorId'], equals: actorId } },
  });
}

// --- Consulta ---

export const listadoNotificacionesSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanio: z.coerce.number().int().min(1).max(50).default(20),
});

const idsDeActores = (datos: Record<string, unknown>) =>
  [datos.actorId, ...((datos.actorIds as string[] | undefined) ?? [])].filter((x): x is string => typeof x === 'string');

export async function listarNotificaciones(steamId: string, f: z.infer<typeof listadoNotificacionesSchema>) {
  const [total, sinLeer, filas] = await prisma.$transaction([
    prisma.notificacion.count({ where: { steamId } }),
    prisma.notificacion.count({ where: { steamId, leidaEn: null } }),
    prisma.notificacion.findMany({
      where: { steamId },
      orderBy: [{ fechaCreacion: 'desc' }, { notificacionId: 'desc' }],
      skip: (f.pagina - 1) * f.tamanio,
      take: f.tamanio,
    }),
  ]);
  // Nombre y avatar actuales de quienes generaron cada notificación
  const ids = [...new Set(filas.flatMap((n) => idsDeActores(n.datos as Record<string, unknown>)))];
  const usuarios = new Map(
    (
      await prisma.usuario.findMany({
        where: { steamId: { in: ids } },
        select: { steamId: true, nombreUsuario: true, avatarUrl: true },
      })
    ).map((u) => [u.steamId, u]),
  );
  return {
    total,
    sinLeer,
    pagina: f.pagina,
    paginas: Math.max(1, Math.ceil(total / f.tamanio)),
    items: filas.map((n) => ({
      notificacionId: n.notificacionId,
      tipo: n.tipo as TipoNotificacion,
      datos: n.datos,
      leida: n.leidaEn !== null,
      fechaCreacion: n.fechaCreacion,
      actores: idsDeActores(n.datos as Record<string, unknown>).flatMap((id) => usuarios.get(id) ?? []),
    })),
  };
}

export async function cantidadSinLeer(steamId: string) {
  return { sinLeer: await prisma.notificacion.count({ where: { steamId, leidaEn: null } }) };
}

export async function marcarLeida(notificacionId: number, steamId: string) {
  // RNF 9: solo el destinatario puede marcarla
  const { count } = await prisma.notificacion.updateMany({
    where: { notificacionId, steamId, leidaEn: null },
    data: { leidaEn: new Date() },
  });
  if (!count && !(await prisma.notificacion.count({ where: { notificacionId, steamId } }))) {
    throw noEncontrado('Notificación no encontrada');
  }
}

export async function marcarTodasLeidas(steamId: string) {
  const { count } = await prisma.notificacion.updateMany({ where: { steamId, leidaEn: null }, data: { leidaEn: new Date() } });
  return { marcadas: count };
}

const DIAS_CONSERVAR_LEIDAS = 90;

/** Borra las notificaciones leídas hace más de 90 días (se ejecuta una vez por día). */
export function iniciarLimpiezaNotificaciones() {
  const limpiar = () =>
    void prisma.notificacion
      .deleteMany({ where: { leidaEn: { lt: new Date(Date.now() - DIAS_CONSERVAR_LEIDAS * 86_400_000) } } })
      .catch((e) => console.error('Error al limpiar notificaciones:', (e as Error).message));
  setInterval(limpiar, 86_400_000).unref();
  limpiar();
}
