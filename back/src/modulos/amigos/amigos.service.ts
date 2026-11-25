// GestionAmigos: amistades dentro de SteamVault (solicitud → aceptación) y sugerencias desde Steam.
import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../../shared/errores.js';
import { obtenerAmigosSteam } from '../../importadores/importadorAmigosSteam.js';
import { SteamNoDisponibleError } from '../../importadores/steamHttp.js';
import { notificar, retirarNotificacion } from '../notificaciones/notificaciones.service.js';

export type Relacion = 'propio' | 'ninguna' | 'enviada' | 'recibida' | 'amigos';

const datosPublicos = { steamId: true, nombreUsuario: true, avatarUrl: true } as const;

/** Amistad entre dos usuarios en cualquiera de las dos direcciones. */
const entre = (a: string, b: string) => ({
  OR: [
    { solicitanteId: a, receptorId: b },
    { solicitanteId: b, receptorId: a },
  ],
});

export async function relacionCon(visor: string, otro: string): Promise<Relacion> {
  if (visor === otro) return 'propio';
  const a = await prisma.amistad.findFirst({ where: entre(visor, otro) });
  if (!a) return 'ninguna';
  if (a.estado === 'aceptada') return 'amigos';
  return a.solicitanteId === visor ? 'enviada' : 'recibida';
}

/** SteamIDs de los amigos (amistades aceptadas). */
export async function idsAmigos(steamId: string): Promise<string[]> {
  const filas = await prisma.amistad.findMany({
    where: { estado: 'aceptada', OR: [{ solicitanteId: steamId }, { receptorId: steamId }] },
    select: { solicitanteId: true, receptorId: true },
  });
  return filas.map((f) => (f.solicitanteId === steamId ? f.receptorId : f.solicitanteId));
}

export async function cantidadAmigos(steamId: string) {
  return prisma.amistad.count({ where: { estado: 'aceptada', OR: [{ solicitanteId: steamId }, { receptorId: steamId }] } });
}

export async function listarAmigos(steamId: string) {
  const filas = await prisma.amistad.findMany({
    where: { estado: 'aceptada', OR: [{ solicitanteId: steamId }, { receptorId: steamId }] },
    include: { solicitante: { select: datosPublicos }, receptor: { select: datosPublicos } },
  });
  return filas
    .map((f) => ({ ...(f.solicitanteId === steamId ? f.receptor : f.solicitante), amigosDesde: f.fechaRespuesta ?? f.fechaAlta }))
    .sort((a, b) => a.nombreUsuario.localeCompare(b.nombreUsuario, 'es'));
}

export async function listarSolicitudes(steamId: string) {
  const [recibidas, enviadas] = await Promise.all([
    prisma.amistad.findMany({
      where: { receptorId: steamId, estado: 'pendiente' },
      include: { solicitante: { select: datosPublicos } },
      orderBy: { fechaAlta: 'desc' },
    }),
    prisma.amistad.findMany({
      where: { solicitanteId: steamId, estado: 'pendiente' },
      include: { receptor: { select: datosPublicos } },
      orderBy: { fechaAlta: 'desc' },
    }),
  ]);
  return {
    recibidas: recibidas.map((s) => ({ ...s.solicitante, fecha: s.fechaAlta })),
    enviadas: enviadas.map((s) => ({ ...s.receptor, fecha: s.fechaAlta })),
  };
}

/**
 * Envía una solicitud. Si el otro ya me había mandado una, se acepta directamente
 * (los dos quieren ser amigos).
 */
export async function enviarSolicitud(de: string, para: string): Promise<{ relacion: Relacion }> {
  if (de === para) throw solicitudInvalida('No podés agregarte a vos mismo');
  if (!(await prisma.usuario.count({ where: { steamId: para } }))) throw noEncontrado('Usuario no encontrado');

  const existente = await prisma.amistad.findFirst({ where: entre(de, para) });
  if (existente?.estado === 'aceptada') throw conflicto('Ya son amigos');
  if (existente?.solicitanteId === de) throw conflicto('Ya le enviaste una solicitud');
  if (existente) return aceptarSolicitud(de, para);

  await prisma.$transaction([
    prisma.amistad.create({ data: { solicitanteId: de, receptorId: para, estado: 'pendiente' } }),
    notificar(prisma, para, 'solicitud_amistad', { actorId: de }),
  ]);
  return { relacion: 'enviada' };
}

/** Solo el receptor puede aceptar (RNF 9): se busca la solicitud que le enviaron a él. */
export async function aceptarSolicitud(receptor: string, solicitante: string): Promise<{ relacion: Relacion }> {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.amistad.updateMany({
      where: { solicitanteId: solicitante, receptorId: receptor, estado: 'pendiente' },
      data: { estado: 'aceptada', fechaRespuesta: new Date() },
    });
    if (!count) throw noEncontrado('No tenés una solicitud pendiente de ese usuario');
    // La notificación de la solicitud ya no tiene sentido; se avisa al otro que fue aceptada.
    await tx.notificacion.updateMany({
      where: { steamId: receptor, tipo: 'solicitud_amistad', leidaEn: null, datos: { path: ['actorId'], equals: solicitante } },
      data: { leidaEn: new Date() },
    });
    await notificar(tx, solicitante, 'amistad_aceptada', { actorId: receptor });
  });
  return { relacion: 'amigos' };
}

/** Rechazar una solicitud recibida, cancelar una enviada o eliminar una amistad. */
export async function eliminarRelacion(visor: string, otro: string) {
  await prisma.$transaction(async (tx) => {
    const a = await tx.amistad.findFirst({ where: entre(visor, otro) });
    if (!a) throw noEncontrado('No hay una amistad ni una solicitud con ese usuario');
    await tx.amistad.delete({ where: { solicitanteId_receptorId: { solicitanteId: a.solicitanteId, receptorId: a.receptorId } } });
    // Si era una solicitud pendiente, se retira su notificación sin leer.
    if (a.estado === 'pendiente') await retirarNotificacion(tx, a.receptorId, 'solicitud_amistad', a.solicitanteId);
  });
  return { relacion: 'ninguna' as Relacion };
}

const MINUTOS_CACHE_AMIGOS = 30;
const cacheAmigosSteam = new Map<string, { datos: Awaited<ReturnType<typeof obtenerAmigosSteam>>; vence: number }>();

/**
 * Sugerencias: amigos de Steam que ya usan SteamVault y con los que todavía no hay
 * amistad ni solicitud. La lista de Steam se guarda en memoria 30 minutos (RNF 1).
 */
export async function sugerencias(steamId: string) {
  const enCache = cacheAmigosSteam.get(steamId);
  let steam = enCache && enCache.vence > Date.now() ? enCache.datos : null;
  if (!steam) {
    try {
      // En modo simulado los "amigos de Steam" salen de los usuarios registrados (sin caché,
      // así un usuario de prueba nuevo aparece enseguida).
      const candidatos = config.steamMock
        ? (await prisma.usuario.findMany({ select: { steamId: true } })).map((u) => u.steamId)
        : [];
      steam = await obtenerAmigosSteam(steamId, candidatos);
      if (!config.steamMock) cacheAmigosSteam.set(steamId, { datos: steam, vence: Date.now() + MINUTOS_CACHE_AMIGOS * 60_000 });
    } catch (e) {
      if (!(e instanceof SteamNoDisponibleError)) throw e;
      return { steamDisponible: false, listaPublica: null, usuarios: [] };
    }
  }

  const relacionados = await prisma.amistad.findMany({
    where: { OR: [{ solicitanteId: steamId }, { receptorId: steamId }] },
    select: { solicitanteId: true, receptorId: true },
  });
  const excluir = new Set([steamId, ...relacionados.flatMap((r) => [r.solicitanteId, r.receptorId])]);
  const usuarios = await prisma.usuario.findMany({
    where: { steamId: { in: steam.steamIds.filter((id) => !excluir.has(id)) } },
    select: datosPublicos,
    orderBy: { nombreUsuario: 'asc' },
  });
  return { steamDisponible: true, listaPublica: steam.publica, usuarios };
}
