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
  biblioteca: () => pedir<Biblioteca>('GET', '/usuarios/me/biblioteca'),

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

  resenasDeJuego: (appId: number, pagina = 1) => pedir<Pagina<Resena>>('GET', `/resenas?${qs({ appId, pagina })}`),
  resenasDeUsuario: (steamId: string, pagina = 1) => pedir<Pagina<Resena>>('GET', `/resenas?${qs({ steamId, pagina })}`),
  miResena: (appId: number) => pedir<Resena | null>('GET', `/resenas/mia?appId=${appId}`),
  crearResena: (appId: number, calificacion: number, comentario: string) =>
    pedir<Resena>('POST', '/resenas', { appId, calificacion, comentario }),
  modificarResena: (id: number, calificacion: number, comentario: string) =>
    pedir<Resena>('PUT', `/resenas/${id}`, { calificacion, comentario }),
  eliminarResena: (id: number) => pedir<void>('DELETE', `/resenas/${id}`),
  valorar: (id: number, esLike: boolean | null) =>
    pedir<{ cantLike: number; cantDislike: number; miValoracion: boolean | null }>('PUT', `/resenas/${id}/valoracion`, {
      esLike,
    }),
};

export type TipoClasificacion = 'categorias' | 'etiquetas';

export interface DatosVideojuego {
  appId: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  categoriaIds: number[];
  etiquetaIds: number[];
}
