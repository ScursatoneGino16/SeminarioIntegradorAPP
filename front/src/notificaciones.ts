import type { Notificacion } from './api';

/** Se dispara al marcar notificaciones como leídas, para que la campanita actualice el contador. */
export const EVENTO_NOTIFICACIONES = 'notificaciones-cambiaron';
export const avisarCambioNotificaciones = () => window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));

/** Texto y destino de cada notificación. */
export function describir(n: Notificacion): { texto: string; enlace: string } {
  const [actor, ...otros] = n.actores;
  const nombre = actor?.nombreUsuario ?? 'Alguien';
  const juego = n.datos.juego ?? 'un juego';
  switch (n.tipo) {
    case 'solicitud_amistad':
      return { texto: `${nombre} te mandó una solicitud de amistad`, enlace: '/amigos?pestania=solicitudes' };
    case 'amistad_aceptada':
      return { texto: `${nombre} aceptó tu solicitud: ahora son amigos`, enlace: `/usuarios/${n.datos.actorId}` };
    case 'like_resena':
      return {
        texto: otros.length
          ? `A ${nombre} y ${otros.length} más les gustó tu reseña de ${juego}`
          : `A ${nombre} le gustó tu reseña de ${juego}`,
        enlace: `/videojuegos/${n.datos.appId}`,
      };
    case 'resena_de_amigo':
      return { texto: `${nombre} publicó una reseña de ${juego}`, enlace: `/videojuegos/${n.datos.appId}` };
    case 'lanzamiento':
      return { texto: `¡${juego} sale mañana en Steam!`, enlace: `/videojuegos/${n.datos.appId}` };
  }
}

const fmtRelativo = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

/** "hace 5 minutos", "ayer"... */
export function hace(iso: string) {
  const segundos = (new Date(iso).getTime() - Date.now()) / 1000;
  const pasos: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unidad, s] of pasos) if (Math.abs(segundos) >= s) return fmtRelativo.format(Math.round(segundos / s), unidad);
  return 'recién';
}
