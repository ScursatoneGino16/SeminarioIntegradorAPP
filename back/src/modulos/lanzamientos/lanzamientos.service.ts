// GestionLanzamientos: calendario de próximos lanzamientos y avisos por mail 24 h antes.
import { z } from 'zod';
import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { conflicto, noEncontrado } from '../../shared/errores.js';
import { enviarMail } from '../../shared/mailer.js';
import { detalleLanzamiento, listarProximos, type DetalleLanzamiento } from '../../importadores/importadorLanzamientos.js';
import { SteamNoDisponibleError } from '../../importadores/steamHttp.js';
import { importarCatalogo } from '../catalogo/catalogo.service.js';
import { GENEROS_ES } from '../catalogo/datasetSteam.js';
import { estaPorSalir } from './proximamente.js';
import { notificar } from '../notificaciones/notificaciones.service.js';
import { juegoVisible } from '../catalogo/contenidoNoApto.js';

const DIA_MS = 24 * 3600_000;

// --- Calendario ---

export const calendarioSchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato AAAA-MM')
    .default(() => new Date().toISOString().slice(0, 7)),
});

const camposJuego = { appId: true, nombre: true, imagenUrl: true, fechaLanzamiento: true, fechaLanzamientoTexto: true } as const;

export async function calendario({ mes }: z.infer<typeof calendarioSchema>, visor: string) {
  const [anio, m] = mes.split('-').map(Number);
  const desde = new Date(Date.UTC(anio, m - 1, 1));
  const hasta = new Date(Date.UTC(anio, m, 1));
  const [juegos, sinFechaExacta, suscripciones] = await Promise.all([
    prisma.videojuego.findMany({
      where: { proximamente: true, ...juegoVisible, fechaLanzamiento: { gte: desde, lt: hasta } },
      select: camposJuego,
      orderBy: [{ fechaLanzamiento: 'asc' }, { nombre: 'asc' }],
    }),
    prisma.videojuego.findMany({
      where: { proximamente: true, ...juegoVisible, fechaLanzamiento: null },
      select: camposJuego,
      orderBy: { nombre: 'asc' },
    }),
    prisma.suscripcionLanzamiento.findMany({ where: { steamId: visor, avisadoEn: null }, select: { appId: true } }),
  ]);
  const conAviso = new Set(suscripciones.map((s) => s.appId));
  const marcar = <T extends { appId: number }>(j: T) => ({ ...j, conAviso: conAviso.has(j.appId) });
  return { mes, juegos: juegos.map(marcar), sinFechaExacta: sinFechaExacta.map(marcar) };
}

// --- Suscripciones ---

export const suscripcionSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Ingresá un mail válido').max(254)),
});

export async function miSuscripcion(appId: number, steamId: string) {
  return prisma.suscripcionLanzamiento.findFirst({
    where: { appId, steamId },
    select: { email: true, fechaAlta: true, avisadoEn: true },
    orderBy: { fechaAlta: 'desc' },
  });
}

export async function suscribir(appId: number, steamId: string, { email }: z.infer<typeof suscripcionSchema>) {
  const juego = await prisma.videojuego.findUnique({
    where: { appId },
    select: { proximamente: true, fechaLanzamiento: true },
  });
  if (!juego) throw noEncontrado(`No existe un videojuego con AppID ${appId}`);
  if (!estaPorSalir(juego)) throw conflicto('Este juego ya salió: no hace falta el aviso');
  // Un aviso por usuario y juego: si cambia el mail, se reemplaza el anterior.
  await prisma.$transaction([
    prisma.suscripcionLanzamiento.deleteMany({ where: { appId, steamId } }),
    prisma.suscripcionLanzamiento.upsert({
      where: { appId_email: { appId, email } },
      create: { appId, steamId, email },
      update: { steamId, avisadoEn: null },
    }),
  ]);
  // Si el juego sale en menos de 24 h, el aviso se manda ya, sin esperar la próxima pasada.
  if (juego.fechaLanzamiento && juego.fechaLanzamiento.getTime() <= Date.now() + DIA_MS) {
    void enviarAvisosPendientes().catch((e) => console.error('Error en avisos de lanzamiento:', (e as Error).message));
  }
  return miSuscripcion(appId, steamId);
}

export async function desuscribir(appId: number, steamId: string) {
  await prisma.suscripcionLanzamiento.deleteMany({ where: { appId, steamId } });
}

/** Baja desde el enlace del mail (no requiere sesión: el token es el secreto). */
export async function bajaPorToken(token: string) {
  const { count } = await prisma.suscripcionLanzamiento.deleteMany({ where: { token } });
  return count > 0;
}

// --- Avisos ---

const fmtFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: 'UTC' });
const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Envía los avisos de los juegos que salen en las próximas 24 h (o que se anotaron tarde
 * y todavía no salieron). Cada suscripción se marca como avisada para no repetir el mail.
 */
export async function enviarAvisosPendientes(ahora = new Date()) {
  const pendientes = await prisma.suscripcionLanzamiento.findMany({
    where: {
      avisadoEn: null,
      videojuego: { proximamente: true, fechaLanzamiento: { not: null, lte: new Date(ahora.getTime() + DIA_MS) } },
    },
    include: { videojuego: { select: { appId: true, nombre: true, imagenUrl: true, fechaLanzamiento: true } } },
  });
  let enviados = 0;
  for (const s of pendientes) {
    const j = s.videojuego;
    const fecha = fmtFecha.format(j.fechaLanzamiento!);
    const enlaceJuego = `${config.appUrl}/videojuegos/${j.appId}`;
    const enlaceSteam = `https://store.steampowered.com/app/${j.appId}/`;
    const enlaceBaja = `${config.appUrl}/api/lanzamientos/baja/${s.token}`;
    try {
      await enviarMail({
        para: s.email,
        asunto: `¡${j.nombre} sale mañana en Steam!`,
        texto: [
          `${j.nombre} se lanza el ${fecha}.`,
          '',
          `Página en Steam: ${enlaceSteam}`,
          `Reseñas en la app: ${enlaceJuego}`,
          '',
          `Recibís este mail porque pediste el aviso. Para no recibirlo más: ${enlaceBaja}`,
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:520px">
            ${j.imagenUrl ? `<img src="${escapar(j.imagenUrl)}" alt="" style="width:100%;border-radius:4px">` : ''}
            <h2>¡${escapar(j.nombre)} sale mañana!</h2>
            <p>Se lanza en Steam el <strong>${escapar(fecha)}</strong>.</p>
            <p><a href="${enlaceSteam}">Ver en Steam</a> · <a href="${enlaceJuego}">Reseñas en la app</a></p>
            <p style="color:#888;font-size:12px">Recibís este mail porque pediste el aviso de lanzamiento.
              <a href="${enlaceBaja}">Darme de baja</a></p>
          </div>`,
      });
      await prisma.$transaction([
        prisma.suscripcionLanzamiento.update({ where: { suscripcionId: s.suscripcionId }, data: { avisadoEn: new Date() } }),
        // El mismo aviso aparece en la campanita
        notificar(prisma, s.steamId, 'lanzamiento', {
          appId: j.appId,
          juego: j.nombre,
          fecha: j.fechaLanzamiento!.toISOString().slice(0, 10),
        }),
      ]);
      enviados++;
    } catch (e) {
      // Se reintenta en la próxima pasada
      console.error(`No se pudo enviar el aviso a ${s.email}:`, (e as Error).message);
    }
  }
  return { pendientes: pendientes.length, enviados };
}

// --- Actualización desde Steam ---

const PAUSA_MS = 300; // la tienda limita ~200 consultas cada 5 minutos

/**
 * Trae los próximos lanzamientos populares de la tienda de Steam: agrega al catálogo los que
 * no estaban y actualiza la fecha de todos. También vuelve a consultar los que estaban marcados
 * como "próximamente" y ya no aparecen en la lista, para enterarse si salieron o se postergaron.
 */
export async function actualizarLanzamientos(opciones: { cantidad?: number; alProgresar?: (texto: string) => void } = {}) {
  const log = opciones.alProgresar ?? (() => undefined);
  const nuevos = await listarProximos(opciones.cantidad ?? 100);
  const anteriores = (await prisma.videojuego.findMany({ where: { proximamente: true }, select: { appId: true } })).map(
    (v) => v.appId,
  );
  const appIds = [...new Set([...nuevos, ...anteriores])];
  log(`Consultando ${appIds.length} juegos en la tienda de Steam…`);

  const detalles: DetalleLanzamiento[] = [];
  const descartados: number[] = [];
  for (const appId of appIds) {
    try {
      const d = await detalleLanzamiento(appId);
      if (d) detalles.push(d);
      else descartados.push(appId);
    } catch (e) {
      if (!(e instanceof SteamNoDisponibleError)) throw e;
      log(`AppID ${appId}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }

  // Los juegos que no estaban en el catálogo se dan de alta con el importador de siempre.
  const existentes = new Set(
    (await prisma.videojuego.findMany({ where: { appId: { in: detalles.map((d) => d.appId) } }, select: { appId: true } })).map(
      (v) => v.appId,
    ),
  );
  const altas = detalles.filter((d) => !existentes.has(d.appId) && d.proximamente);
  const importacion = await importarCatalogo(
    altas.map((d) => ({
      appId: d.appId,
      nombre: d.nombre,
      descripcion: d.descripcion,
      imagenUrl: d.imagenUrl,
      categorias: d.generos.map((g) => GENEROS_ES[g] ?? g),
      etiquetas: [],
    })),
  );

  await prisma.$transaction([
    ...detalles.map((d) =>
      prisma.videojuego.updateMany({
        where: { appId: d.appId },
        data: { proximamente: d.proximamente, fechaLanzamiento: d.fecha, fechaLanzamientoTexto: d.fechaTexto },
      }),
    ),
    // Lo que dejó de existir en la tienda (o no es un juego) ya no figura como próximo.
    prisma.videojuego.updateMany({ where: { appId: { in: descartados } }, data: { proximamente: false } }),
  ]);

  const resultado = {
    consultados: appIds.length,
    proximos: detalles.filter((d) => d.proximamente).length,
    agregadosAlCatalogo: importacion.creados,
    yaSalieron: detalles.filter((d) => !d.proximamente && anteriores.includes(d.appId)).length,
  };
  log(JSON.stringify(resultado));
  return resultado;
}

/** Tareas periódicas del servidor: actualizar lanzamientos y enviar avisos. */
export function iniciarTareasLanzamientos() {
  const correr = (nombre: string, tarea: () => Promise<unknown>) => () =>
    void tarea().catch((e) => console.error(`Error en ${nombre}:`, (e as Error).message));

  const avisos = correr('avisos de lanzamiento', enviarAvisosPendientes);
  setInterval(avisos, 10 * 60_000).unref();
  avisos();

  const horas = config.horasActualizacionLanzamientos;
  if (Number.isFinite(horas) && horas > 0) {
    const actualizar = correr('actualización de lanzamientos', () => actualizarLanzamientos());
    setInterval(actualizar, horas * 3600_000).unref();
    // Al arrancar, solo si nunca se cargaron (para no demorar cada reinicio en desarrollo)
    void prisma.videojuego
      .count({ where: { proximamente: true } })
      .then((n) => n === 0 && actualizar())
      .catch(() => undefined);
  }
}
