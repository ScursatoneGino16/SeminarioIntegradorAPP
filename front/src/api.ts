// Cliente HTTP de la API. Todas las rutas van por el proxy /api de Vite.

export interface Usuario {
  steamId: string;
  nombreUsuario: string;
  avatarUrl: string | null;
  bibliotecaPublica: boolean;
  esAdmin: boolean;
}

export interface Perfil {
  steamId: string;
  nombreUsuario: string;
  avatarUrl: string | null;
  bibliotecaPublica: boolean;
  fechaAlta: string;
  _count: { resenas: number };
  /** Relación de quien mira con este usuario */
  relacion: Relacion;
  cantidadAmigos: number;
}

export type Relacion = 'propio' | 'ninguna' | 'enviada' | 'recibida' | 'amigos';

export interface UsuarioPublico {
  steamId: string;
  nombreUsuario: string;
  avatarUrl: string | null;
}

export interface Notificacion {
  notificacionId: number;
  tipo: 'solicitud_amistad' | 'amistad_aceptada' | 'like_resena' | 'resena_de_amigo' | 'lanzamiento';
  datos: { actorId?: string; actorIds?: string[]; resenaId?: number; appId?: number; juego?: string; fecha?: string };
  leida: boolean;
  fechaCreacion: string;
  /** Usuarios que generaron la notificación (nombre y avatar actuales) */
  actores: UsuarioPublico[];
}

export interface PerfilSteam {
  nivel: number | null;
  /** EXP total, EXP donde empieza el nivel actual y EXP que falta para el próximo. */
  experiencia: { actual: number; inicioNivel: number; faltante: number } | null;
  cuentaCreada: string | null;
  juegos: number | null;
  horasTotales: number | null;
  avatarAnimado: { animado: string; fijo: string | null } | null;
  marcoAvatar: string | null;
  fondoPerfil: { imagen: string; video: string | null } | null;
}

export interface Categoria {
  categoriaId: number;
  nombre: string;
  _count?: { videojuegos: number };
}
export interface Etiqueta {
  etiquetaId: number;
  nombre: string;
  _count?: { videojuegos: number };
}

export interface Videojuego {
  appId: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  categorias: Categoria[];
  etiquetas: Etiqueta[];
  cantidadResenas?: number;
  promedioCalificacion?: number | null;
  /** Solo en el catálogo: si está en la biblioteca de Steam del usuario y cuántas horas tiene. */
  enBiblioteca?: boolean;
  horasJugadas?: number | null;
  /** true mientras el juego no salió (reseñas bloqueadas) */
  proximamente: boolean;
  /** Día de salida (AAAA-MM-DD en UTC) o null si Steam no da un día exacto */
  fechaLanzamiento: string | null;
  fechaLanzamientoTexto: string | null;
}

export interface Pagina<T> {
  total: number;
  pagina: number;
  paginas: number;
  items: T[];
}

export interface Resena {
  resenaId: number;
  steamId: string;
  appId: number;
  calificacion: number;
  comentario: string;
  horasAlComentar: number;
  fechaCreacion: string;
  fechaModificacion: string | null;
  cantLike: number;
  cantDislike: number;
  usuario: { steamId: string; nombreUsuario: string; avatarUrl: string | null };
  videojuego: { appId: number; nombre: string; imagenUrl: string | null };
  esPropia: boolean;
  miValoracion: boolean | null;
  adjuntos: Adjunto[];
  /** Insignia del autor en este juego según sus horas (null por debajo de 5 h) */
  insignia: { rango: Rango; titulo: string; nivel: number; horas: number } | null;
}

export interface Adjunto {
  tipo: 'gif' | 'imagen';
  url: string;
}

/** Escalón de la clasificación por horas en un juego */
export type Rango =
  | 'recien-llegado'
  | 'explorador'
  | 'combatiente'
  | 'veterano'
  | 'experto'
  | 'maestro'
  | 'campeon'
  | 'leyenda'
  | 'heroe-de-leyenda'
  | 'trascendente';

export interface Escalon {
  id: string;
  titulo: string;
  desde: number;
}

export interface Insignias {
  bibliotecaPublica: boolean;
  /** Clasificación por horas totales de Steam; null si la biblioteca es privada o no se leyó */
  rangoCuenta: (Escalon & { nivel: number; horas: number; siguiente: Escalon | null }) | null;
  insignias: Array<{
    appId: number;
    nombre: string;
    imagenUrl: string | null;
    horas: number;
    rango: Rango;
    titulo: string;
    nivel: number;
    desde: number;
  }>;
}

export interface Lanzamiento {
  appId: number;
  nombre: string;
  imagenUrl: string | null;
  fechaLanzamiento: string | null;
  fechaLanzamientoTexto: string | null;
  /** El usuario pidió el aviso por mail */
  conAviso: boolean;
}

export interface AvisoLanzamiento {
  email: string;
  fechaAlta: string;
  avisadoEn: string | null;
}

export interface Gif {
  id: string;
  titulo: string;
  url: string;
  vistaPrevia: string;
}

export interface Biblioteca {
  publica: boolean;
  desdeCache: boolean;
  actualizadoEn: string | null;
  juegos: Array<{ appId: number; horasJugadas: number; nombre: string; imagenUrl: string | null }>;
}

export interface EstadoSesion {
  autenticado: boolean;
  usuario: Usuario | null;
  modoSimulado: boolean;
  minutosInactividad: number;
  /** Hay clave de Giphy en el servidor */
  gifsHabilitados?: boolean;
  maxMbImagen?: number;
}

export class ErrorApi extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo?: string,
    public detalles?: Array<{ campo: string; mensaje: string }>,
  ) {
    super(message);
  }
}

/** Se dispara cuando el servidor responde 401 (sesión expirada por inactividad). */
export const EVENTO_SESION_EXPIRADA = 'sesion-expirada';

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  return leerRespuesta<T>(res, ruta);
}

/** Sube un archivo tal cual (sin multipart): el servidor verifica el tipo por su contenido. */
async function pedirArchivo<T>(ruta: string, archivo: File): Promise<T> {
  const res = await fetch(`/api${ruta}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': archivo.type || 'application/octet-stream' },
    body: archivo,
  });
  return leerRespuesta<T>(res, ruta);
}

async function leerRespuesta<T>(res: Response, ruta: string): Promise<T> {
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !ruta.startsWith('/auth')) window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    const detalle = datos.detalles?.map((d: { mensaje: string }) => d.mensaje).join(' · ');
    throw new ErrorApi(res.status, detalle || datos.error || 'Error inesperado', datos.codigo, datos.detalles);
  }
  return datos as T;
}

const qs = (p: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') s.set(k, String(v));
  return s.toString();
};

export const api = {
  estado: () => pedir<EstadoSesion>('GET', '/auth/estado'),
  devLogin: (steamId: string, nombre?: string) => pedir<Usuario>('POST', '/auth/dev-login', { steamId, nombre }),
  logout: () => pedir<void>('POST', '/auth/logout'),

  perfil: (steamId: string) => pedir<Perfil>('GET', `/usuarios/${steamId}`),
  perfilSteam: (steamId: string) => pedir<PerfilSteam>('GET', `/usuarios/${steamId}/steam`),
  biblioteca: () => pedir<Biblioteca>('GET', '/usuarios/me/biblioteca'),
  insignias: (steamId: string) => pedir<Insignias>('GET', `/usuarios/${steamId}/insignias`),

  amigos: () => pedir<Array<UsuarioPublico & { amigosDesde: string }>>('GET', '/amigos'),
  solicitudes: () =>
    pedir<{ recibidas: Array<UsuarioPublico & { fecha: string }>; enviadas: Array<UsuarioPublico & { fecha: string }> }>(
      'GET',
      '/amigos/solicitudes',
    ),
  sugerencias: () =>
    pedir<{ steamDisponible: boolean; listaPublica: boolean | null; usuarios: UsuarioPublico[] }>('GET', '/amigos/sugerencias'),
  agregarAmigo: (steamId: string) => pedir<{ relacion: Relacion }>('POST', `/amigos/${steamId}`),
  aceptarAmigo: (steamId: string) => pedir<{ relacion: Relacion }>('PUT', `/amigos/${steamId}/aceptar`),
  quitarAmigo: (steamId: string) => pedir<{ relacion: Relacion }>('DELETE', `/amigos/${steamId}`),
  actividadAmigos: (pagina = 1) => pedir<Pagina<Resena>>('GET', `/resenas?${qs({ deAmigos: 'true', pagina })}`),

  notificaciones: (pagina = 1, tamanio = 20) =>
    pedir<Pagina<Notificacion> & { sinLeer: number }>('GET', `/notificaciones?${qs({ pagina, tamanio })}`),
  notificacionesSinLeer: () => pedir<{ sinLeer: number }>('GET', '/notificaciones/cantidad'),
  marcarNotificacion: (id: number) => pedir<void>('PUT', `/notificaciones/${id}/leida`),
  marcarTodasNotificaciones: () => pedir<{ marcadas: number }>('PUT', '/notificaciones/leidas'),

  lanzamientos: (mes: string) =>
    pedir<{ mes: string; juegos: Lanzamiento[]; sinFechaExacta: Lanzamiento[] }>('GET', `/lanzamientos?${qs({ mes })}`),
  actualizarLanzamientos: () =>
    pedir<{ consultados: number; proximos: number; agregadosAlCatalogo: number; yaSalieron: number }>(
      'POST',
      '/lanzamientos/actualizar',
    ),
  miAviso: (appId: number) => pedir<AvisoLanzamiento | null>('GET', `/lanzamientos/${appId}/aviso`),
  pedirAviso: (appId: number, email: string) => pedir<AvisoLanzamiento>('PUT', `/lanzamientos/${appId}/aviso`, { email }),
  cancelarAviso: (appId: number) => pedir<void>('DELETE', `/lanzamientos/${appId}/aviso`),

  gifs: (q: string, offset = 0) =>
    pedir<{ total: number; siguienteOffset: number; gifs: Gif[] }>('GET', `/gifs?${qs({ q, offset })}`),
  subirImagen: (archivo: File) => pedirArchivo<{ url: string }>('/imagenes', archivo),

  catalogo: (f: { q?: string; categorias?: number[]; etiquetas?: number[]; orden?: string; pagina?: number; tamanio?: number }) =>
    pedir<Pagina<Videojuego> & { tamanio: number }>(
      'GET',
      `/catalogo?${qs({
        q: f.q,
        categorias: f.categorias?.join(','),
        etiquetas: f.etiquetas?.join(','),
        orden: f.orden,
        pagina: f.pagina,
        tamanio: f.tamanio,
      })}`,
    ),
  importarCatalogo: (items: unknown) =>
    pedir<{ procesados: number; creados: number; actualizados: number; errores: Array<{ appId: number; error: string }> }>(
      'POST',
      '/catalogo/importar',
      items,
    ),

  videojuego: (appId: number) => pedir<Videojuego>('GET', `/videojuegos/${appId}`),
  crearVideojuego: (v: DatosVideojuego) => pedir<Videojuego>('POST', '/videojuegos', v),
  modificarVideojuego: (appId: number, v: Omit<DatosVideojuego, 'appId'>) =>
    pedir<Videojuego>('PUT', `/videojuegos/${appId}`, v),
  eliminarVideojuego: (appId: number) => pedir<void>('DELETE', `/videojuegos/${appId}`),

  categorias: () => pedir<Categoria[]>('GET', '/categorias'),
  etiquetas: () => pedir<Etiqueta[]>('GET', '/etiquetas'),
  crearClasificacion: (tipo: TipoClasificacion, nombre: string) => pedir<unknown>('POST', `/${tipo}`, { nombre }),
  modificarClasificacion: (tipo: TipoClasificacion, id: number, nombre: string) =>
    pedir<unknown>('PUT', `/${tipo}/${id}`, { nombre }),
  eliminarClasificacion: (tipo: TipoClasificacion, id: number) => pedir<void>('DELETE', `/${tipo}/${id}`),

  resenasDeJuego: (appId: number, pagina = 1, deAmigos = false) =>
    pedir<Pagina<Resena>>('GET', `/resenas?${qs({ appId, pagina, deAmigos: deAmigos ? 'true' : undefined })}`),
  resenasDeUsuario: (steamId: string, pagina = 1) => pedir<Pagina<Resena>>('GET', `/resenas?${qs({ steamId, pagina })}`),
  miResena: (appId: number) => pedir<Resena | null>('GET', `/resenas/mia?appId=${appId}`),
  crearResena: (appId: number, contenido: ContenidoResena) => pedir<Resena>('POST', '/resenas', { appId, ...contenido }),
  modificarResena: (id: number, contenido: ContenidoResena) => pedir<Resena>('PUT', `/resenas/${id}`, contenido),
  eliminarResena: (id: number) => pedir<void>('DELETE', `/resenas/${id}`),
  valorar: (id: number, esLike: boolean | null) =>
    pedir<{ cantLike: number; cantDislike: number; miValoracion: boolean | null }>('PUT', `/resenas/${id}/valoracion`, {
      esLike,
    }),
};

export interface ContenidoResena {
  calificacion: number;
  comentario: string;
  adjuntos: Adjunto[];
}

export type TipoClasificacion = 'categorias' | 'etiquetas';

export interface DatosVideojuego {
  appId: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  categoriaIds: number[];
  etiquetaIds: number[];
}
