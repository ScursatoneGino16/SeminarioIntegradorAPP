// Clasificaciones del perfil: rango de cuenta (horas totales de Steam) e insignias por juego.
// Se calculan con la última biblioteca guardada, sin consultar a Steam.
import { prisma } from '../../db.js';
import { obtenerUsuario } from '../usuario/usuario.service.js';
import { insigniaPorHoras, rangoCuenta } from './clasificaciones.js';
import { juegoVisible } from '../catalogo/contenidoNoApto.js';

export async function insigniasDeUsuario(steamId: string) {
  const usuario = await obtenerUsuario(steamId);
  // Con la biblioteca privada no se exponen las horas.
  const filas = usuario.bibliotecaPublica
    ? await prisma.usuarioXVideojuego.findMany({
        where: { steamId, videojuego: juegoVisible },
        include: { videojuego: { select: { nombre: true, imagenUrl: true } } },
        orderBy: { horasJugadas: 'desc' },
      })
    : [];
  const insignias = filas.flatMap((f) => {
    const insignia = insigniaPorHoras(f.horasJugadas);
    return insignia
      ? [
          {
            appId: f.appId,
            nombre: f.videojuego.nombre,
            imagenUrl: f.videojuego.imagenUrl,
            horas: f.horasJugadas,
            rango: insignia.id,
            titulo: insignia.titulo,
            nivel: insignia.nivel,
            desde: insignia.desde,
          },
        ]
      : [];
  });
  return {
    bibliotecaPublica: usuario.bibliotecaPublica,
    rangoCuenta: usuario.bibliotecaPublica ? rangoCuenta(usuario.horasTotalesSteam) : null,
    insignias,
  };
}

/**
 * Horas actuales (según la última biblioteca guardada) de cada par usuario-juego.
 * Se usa para mostrar la insignia vigente en las reseñas.
 */
export async function horasGuardadas(pares: Array<{ steamId: string; appId: number }>) {
  if (!pares.length) return new Map<string, number>();
  const filas = await prisma.usuarioXVideojuego.findMany({
    where: { OR: pares.map(({ steamId, appId }) => ({ steamId, appId })) },
    select: { steamId: true, appId: true, horasJugadas: true },
  });
  return new Map(filas.map((f) => [`${f.steamId}:${f.appId}`, f.horasJugadas]));
}
