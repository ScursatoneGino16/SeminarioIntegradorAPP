// GestionUsuario: Usuario, Perfil y PersistenciaUsuario.
import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { noEncontrado } from '../../shared/errores.js';
import { obtenerDatosCuenta, type DatosCuentaSteam } from '../../importadores/importadorSteamOpenID.js';
import { obtenerBiblioteca } from '../../importadores/importadorBiblioteca.js';
import { SteamNoDisponibleError } from '../../importadores/steamHttp.js';

/** Alta o actualización del usuario al iniciar sesión. */
export async function registrarIngreso(datos: DatosCuentaSteam) {
  const esAdmin = config.adminSteamIds.has(datos.steamId);
  return prisma.usuario.upsert({
    where: { steamId: datos.steamId },
    create: {
      steamId: datos.steamId,
      nombreUsuario: datos.nombreUsuario,
      avatarUrl: datos.avatarUrl,
      bibliotecaPublica: datos.perfilPublico,
      esAdmin,
      perfilActualizadoEn: new Date(),
    },
    update: {
      nombreUsuario: datos.nombreUsuario,
      avatarUrl: datos.avatarUrl,
      ultimoAcceso: new Date(),
      perfilActualizadoEn: new Date(),
      // Se respeta un admin asignado manualmente en la BD, y se suma el configurado por entorno.
      ...(esAdmin ? { esAdmin: true } : {}),
    },
  });
}

const HORAS_VIGENCIA_PERFIL = 6;

/**
 * Vuelve a leer nombre y avatar desde Steam si nunca se leyeron o pasaron más de 6 horas.
 * Así un cambio de nombre o avatar en Steam se refleja sin tener que volver a iniciar sesión.
 * Si Steam no responde se conservan los datos guardados (RNF 6).
 */
export async function refrescarPerfilSiCorresponde<T extends { steamId: string; perfilActualizadoEn: Date | null }>(
  usuario: T,
): Promise<T> {
  // En modo simulado los usuarios de prueba tienen SteamIDs ficticios.
  if (config.steamMock) return usuario;
  const vigente =
    usuario.perfilActualizadoEn && Date.now() - usuario.perfilActualizadoEn.getTime() < HORAS_VIGENCIA_PERFIL * 3600_000;
  if (vigente) return usuario;
  try {
    const datos = await obtenerDatosCuenta(usuario.steamId);
    return (await prisma.usuario.update({
      where: { steamId: usuario.steamId },
      data: { nombreUsuario: datos.nombreUsuario, avatarUrl: datos.avatarUrl, perfilActualizadoEn: new Date() },
    })) as unknown as T;
  } catch (e) {
    if (e instanceof SteamNoDisponibleError) return usuario;
    throw e;
  }
}

export async function obtenerUsuario(steamId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { steamId } });
  if (!usuario) throw noEncontrado('Usuario no encontrado');
  return usuario;
}

/** Perfil público: datos del usuario + historial de reseñas (CU 12). */
export async function obtenerPerfil(steamId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { steamId },
    select: {
      steamId: true,
      nombreUsuario: true,
      avatarUrl: true,
      bibliotecaPublica: true,
      fechaAlta: true,
      _count: { select: { resenas: true } },
    },
  });
  if (!usuario) throw noEncontrado('Usuario no encontrado');
  return usuario;
}

export interface ResultadoBiblioteca {
  publica: boolean;
  /** true si Steam no respondió y se devolvió la última copia guardada (RNF 6). */
  desdeCache: boolean;
  actualizadoEn: Date | null;
  juegos: Array<{ appId: number; horasJugadas: number; nombre: string; imagenUrl: string | null }>;
}

/**
 * Sincroniza la biblioteca desde Steam y la guarda en UsuarioXVideojuego.
 * Solo se guardan juegos presentes en el catálogo (se relacionan por AppID).
 * Si Steam falla, se devuelve la última biblioteca guardada.
 */
export async function sincronizarBiblioteca(steamId: string): Promise<ResultadoBiblioteca> {
  try {
    const appIdsCatalogo = config.steamMock
      ? // Se toman los juegos más reseñados para que la simulación tenga datos interesantes.
        (
          await prisma.videojuego.findMany({
            select: { appId: true },
            orderBy: [{ resenas: { _count: 'desc' } }, { appId: 'asc' }],
            take: 200,
          })
        ).map((v) => v.appId)
      : [];
    const biblioteca = await obtenerBiblioteca(steamId, appIdsCatalogo);

    const enCatalogo = new Set(
      (
        await prisma.videojuego.findMany({
          where: { appId: { in: biblioteca.juegos.map((j) => j.appId) } },
          select: { appId: true },
        })
      ).map((v) => v.appId),
    );
    const juegos = biblioteca.juegos.filter((j) => enCatalogo.has(j.appId));

    await prisma.$transaction([
      prisma.usuario.update({ where: { steamId }, data: { bibliotecaPublica: biblioteca.publica } }),
      prisma.usuarioXVideojuego.deleteMany({ where: { steamId } }),
      prisma.usuarioXVideojuego.createMany({
        data: juegos.map((j) => ({ steamId, appId: j.appId, horasJugadas: j.horasJugadas })),
      }),
    ]);
    return leerBibliotecaGuardada(steamId, false);
  } catch (e) {
    if (e instanceof SteamNoDisponibleError) return leerBibliotecaGuardada(steamId, true);
    throw e;
  }
}

async function leerBibliotecaGuardada(steamId: string, desdeCache: boolean): Promise<ResultadoBiblioteca> {
  const usuario = await obtenerUsuario(steamId);
  const filas = await prisma.usuarioXVideojuego.findMany({
    where: { steamId },
    include: { videojuego: { select: { nombre: true, imagenUrl: true } } },
    orderBy: { horasJugadas: 'desc' },
  });
  return {
    publica: usuario.bibliotecaPublica,
    desdeCache,
    actualizadoEn: filas[0]?.actualizadoEn ?? null,
    juegos: filas.map((f) => ({
      appId: f.appId,
      horasJugadas: f.horasJugadas,
      nombre: f.videojuego.nombre,
      imagenUrl: f.videojuego.imagenUrl,
    })),
  };
}

/**
 * Horas jugadas de un videojuego al momento de reseñar (RNF 10).
 * Consulta a Steam; si no responde usa el último valor guardado.
 * Devuelve null si el juego no está en la biblioteca o la biblioteca es privada.
 */
export async function horasDeJuegoActuales(
  steamId: string,
  appId: number,
): Promise<{ publica: boolean; horas: number | null; desdeCache: boolean }> {
  const bib = await sincronizarBiblioteca(steamId);
  const juego = bib.juegos.find((j) => j.appId === appId);
  return { publica: bib.publica, horas: juego?.horasJugadas ?? null, desdeCache: bib.desdeCache };
}
