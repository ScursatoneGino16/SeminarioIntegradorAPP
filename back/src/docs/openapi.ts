// Documentación OpenAPI 3.1 de la API (servida con Swagger UI en /api/docs).
// Los cuerpos de las peticiones se generan desde los mismos esquemas Zod que validan la API,
// así la documentación no se desincroniza de las validaciones reales.
import { z } from 'zod';
import { devLoginSchema } from '../modulos/usuario/usuario.routes.js';
import { nombreSchema, videojuegoSchema, videojuegoUpdateSchema } from '../modulos/videojuego/videojuego.service.js';
import { datasetSchema } from '../modulos/catalogo/catalogo.service.js';
import { modificarResenaSchema, registrarResenaSchema, valoracionSchema } from '../modulos/resenas/resena.service.js';

const esquema = (s: z.ZodType) => {
  const { $schema: _omitido, ...resto } = z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  return resto;
};

const ref = (nombre: string) => ({ $ref: `#/components/schemas/${nombre}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const cuerpo = (nombre: string) => ({ required: true, content: json(ref(nombre)) });
const ok = (descripcion: string, schema?: object) => ({ description: descripcion, ...(schema ? { content: json(schema) } : {}) });
const error = (descripcion: string) => ({ description: descripcion, content: json(ref('Error')) });

const errores = {
  401: error('No hay sesión iniciada o expiró por inactividad'),
};
const erroresAdmin = { ...errores, 403: error('Operación reservada al Administrador') };
const pagina = (item: string) => ({
  type: 'object',
  properties: {
    total: { type: 'integer' },
    pagina: { type: 'integer' },
    paginas: { type: 'integer' },
    items: { type: 'array', items: ref(item) },
  },
});

const pathParam = (name: string, descripcion: string, type: 'integer' | 'string' = 'integer') => ({
  name,
  in: 'path',
  required: true,
  description: descripcion,
  schema: { type },
});
const query = (name: string, descripcion: string, schema: object = { type: 'string' }) => ({
  name,
  in: 'query',
  required: false,
  description: descripcion,
  schema,
});

export const documentoOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'Sistema de Reseñas de Videojuegos de Steam — API',
    version: '1.0.0',
    description: [
      'API del Seminario Integrador (Grupo 08).',
      '',
      '**Autenticación:** sesión por cookie (`resenas.sid`) obtenida con Steam OpenID (`GET /api/auth/steam`) o, en modo simulado, con `POST /api/auth/dev-login`.',
      'Como Swagger UI se sirve desde el mismo origen, después de iniciar sesión en la app (o ejecutar *dev-login* acá) los "Try it out" ya envían la cookie.',
      '',
      'La sesión expira luego de 30 minutos sin actividad (RNF 3).',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Mismo origen (a través del proxy del front o directo al back)' }],
  tags: [
    { name: 'Autenticación', description: 'GestionUsuario · Sesion — Steam OpenID' },
    { name: 'Usuarios', description: 'GestionUsuario · Perfil y biblioteca de Steam' },
    { name: 'Catálogo', description: 'GestionCatalogo · búsqueda, filtros e importación' },
    { name: 'Videojuegos', description: 'GestionVideojuego · consulta y ABM (admin)' },
    { name: 'Categorías', description: 'GestionVideojuego · Categoria' },
    { name: 'Etiquetas', description: 'GestionVideojuego · Etiqueta' },
    { name: 'Reseñas', description: 'GestionPublicacionYGestionReseñas' },
  ],
  security: [{ cookieSesion: [] }],
  components: {
    securitySchemes: {
      cookieSesion: { type: 'apiKey', in: 'cookie', name: 'resenas.sid' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Solo podés modificar o eliminar tus propias reseñas' },
          codigo: {
            type: 'string',
            enum: ['NO_AUTENTICADO', 'PROHIBIDO', 'NO_ENCONTRADO', 'CONFLICTO', 'VALIDACION', 'SOLICITUD_INVALIDA', 'STEAM_NO_DISPONIBLE', 'INTERNO'],
          },
          detalles: {
            type: 'array',
            items: { type: 'object', properties: { campo: { type: 'string' }, mensaje: { type: 'string' } } },
          },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          steamId: { type: 'string', example: '76561197960287930' },
          nombreUsuario: { type: 'string' },
          avatarUrl: { type: ['string', 'null'] },
          bibliotecaPublica: { type: 'boolean' },
          esAdmin: { type: 'boolean' },
          fechaAlta: { type: 'string', format: 'date-time' },
          ultimoAcceso: { type: 'string', format: 'date-time' },
        },
      },
      EstadoSesion: {
        type: 'object',
        properties: {
          autenticado: { type: 'boolean' },
          usuario: { oneOf: [ref('Usuario'), { type: 'null' }] },
          modoSimulado: { type: 'boolean', description: 'true si la biblioteca de Steam se simula (sin STEAM_API_KEY)' },
          minutosInactividad: { type: 'integer', example: 30 },
        },
      },
      Perfil: {
        type: 'object',
        properties: {
          steamId: { type: 'string' },
          nombreUsuario: { type: 'string' },
          avatarUrl: { type: ['string', 'null'] },
          bibliotecaPublica: { type: 'boolean' },
          fechaAlta: { type: 'string', format: 'date-time' },
          _count: { type: 'object', properties: { resenas: { type: 'integer' } } },
        },
      },
      Biblioteca: {
        type: 'object',
        properties: {
          publica: { type: 'boolean' },
          desdeCache: { type: 'boolean', description: 'true si Steam no respondió y se devolvió la última copia guardada (RNF 6)' },
          actualizadoEn: { type: ['string', 'null'], format: 'date-time' },
          juegos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                appId: { type: 'integer' },
                nombre: { type: 'string' },
                imagenUrl: { type: ['string', 'null'] },
                horasJugadas: { type: 'number' },
              },
            },
          },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          categoriaId: { type: 'integer' },
          nombre: { type: 'string', example: 'Acción' },
          _count: { type: 'object', properties: { videojuegos: { type: 'integer' } } },
        },
      },
      Etiqueta: {
        type: 'object',
        properties: {
          etiquetaId: { type: 'integer' },
          nombre: { type: 'string', example: 'Open World' },
          _count: { type: 'object', properties: { videojuegos: { type: 'integer' } } },
        },
      },
      Videojuego: {
        type: 'object',
        properties: {
          appId: { type: 'integer', example: 1245620 },
          nombre: { type: 'string', example: 'ELDEN RING' },
          descripcion: { type: 'string' },
          imagenUrl: { type: ['string', 'null'] },
          categorias: { type: 'array', items: ref('Categoria') },
          etiquetas: { type: 'array', items: ref('Etiqueta') },
          votosSteam: { type: 'integer', description: 'Reseñas positivas + negativas en Steam (popularidad, del dataset)' },
          cantidadResenas: { type: 'integer' },
          enBiblioteca: { type: 'boolean', description: 'Solo en el catálogo: está en tu biblioteca de Steam' },
          horasJugadas: { type: ['number', 'null'], description: 'Solo en el catálogo: tus horas en ese juego' },
          promedioCalificacion: { type: ['number', 'null'], description: 'Solo en GET /api/videojuegos/{appId}' },
        },
      },
      Resena: {
        type: 'object',
        properties: {
          resenaId: { type: 'integer' },
          steamId: { type: 'string' },
          appId: { type: 'integer' },
          calificacion: { type: 'integer', minimum: 1, maximum: 5 },
          comentario: { type: 'string', maxLength: 1200 },
          horasAlComentar: { type: 'number', description: 'Horas jugadas al publicar (valor histórico, RNF 10)' },
          fechaCreacion: { type: 'string', format: 'date-time' },
          fechaModificacion: { type: ['string', 'null'], format: 'date-time' },
          cantLike: { type: 'integer' },
          cantDislike: { type: 'integer' },
          usuario: {
            type: 'object',
            properties: { steamId: { type: 'string' }, nombreUsuario: { type: 'string' }, avatarUrl: { type: ['string', 'null'] } },
          },
          videojuego: {
            type: 'object',
            properties: { appId: { type: 'integer' }, nombre: { type: 'string' }, imagenUrl: { type: ['string', 'null'] } },
          },
          esPropia: { type: 'boolean' },
          miValoracion: { type: ['boolean', 'null'], description: 'true = Me gusta, false = No me gusta, null = sin valorar' },
        },
      },
      ResultadoImportacion: {
        type: 'object',
        properties: {
          procesados: { type: 'integer' },
          creados: { type: 'integer' },
          actualizados: { type: 'integer' },
          errores: { type: 'array', items: { type: 'object', properties: { appId: { type: 'integer' }, error: { type: 'string' } } } },
        },
      },
      // Generados desde Zod
      DevLogin: esquema(devLoginSchema),
      VideojuegoNuevo: esquema(videojuegoSchema),
      VideojuegoModificado: esquema(videojuegoUpdateSchema),
      Nombre: esquema(nombreSchema),
      Dataset: esquema(datasetSchema),
      ResenaNueva: esquema(registrarResenaSchema),
      ResenaModificada: esquema(modificarResenaSchema),
      Valoracion: esquema(valoracionSchema),
    },
  },
  paths: {
    // ---------------- Autenticación ----------------
    '/api/auth/estado': {
      get: {
        tags: ['Autenticación'],
        summary: 'Estado de la sesión actual',
        security: [],
        responses: { 200: ok('Estado de la sesión', ref('EstadoSesion')) },
      },
    },
    '/api/auth/steam': {
      get: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión con Steam (CU 1)',
        description: 'Redirige al login de Steam OpenID. Abrir en el navegador, no desde "Try it out".',
        security: [],
        responses: { 302: { description: 'Redirección a steamcommunity.com/openid/login' } },
      },
    },
    '/api/auth/steam/retorno': {
      get: {
        tags: ['Autenticación'],
        summary: 'Retorno de Steam OpenID (CU 22)',
        description: 'Steam redirige acá. Se verifica la firma con `check_authentication`, se obtiene nombre y avatar y se crea la sesión.',
        security: [],
        responses: { 302: { description: 'Redirección a la app (o a /login?error=...)' } },
      },
    },
    '/api/auth/dev-login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Login de prueba (solo modo simulado)',
        security: [],
        requestBody: cuerpo('DevLogin'),
        responses: { 200: ok('Sesión iniciada', ref('Usuario')), 400: error('SteamID inválido'), 404: error('No disponible con Steam real') },
      },
    },
    '/api/auth/logout': {
      post: { tags: ['Autenticación'], summary: 'Cerrar sesión', responses: { 204: ok('Sesión cerrada') } },
    },

    // ---------------- Usuarios ----------------
    '/api/usuarios/me/biblioteca': {
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar mi biblioteca (CU 6)',
        description: 'Sincroniza la biblioteca y las horas de juego desde Steam (máx. 5 s). Si Steam falla, devuelve la última copia guardada con `desdeCache: true`.',
        responses: { 200: ok('Biblioteca', ref('Biblioteca')), ...errores },
      },
    },
    '/api/usuarios/{steamId}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar perfil de usuario (CU 12)',
        parameters: [pathParam('steamId', 'SteamID de 64 bits', 'string')],
        responses: { 200: ok('Perfil', ref('Perfil')), ...errores, 404: error('Usuario no encontrado') },
      },
    },

    // ---------------- Catálogo ----------------
    '/api/catalogo': {
      get: {
        tags: ['Catálogo'],
        summary: 'Consultar, buscar y filtrar el catálogo (CU 2, 3, 4)',
        parameters: [
          query('q', 'Texto a buscar en el nombre, o AppID exacto'),
          query('categorias', 'IDs de categorías separados por coma (deben cumplirse todas)', { type: 'string', example: '1,3' }),
          query('etiquetas', 'IDs de etiquetas separados por coma (deben cumplirse todas)', { type: 'string' }),
          query(
            'orden',
            '`relevancia`: primero los juegos de tu biblioteca (por horas), luego los más reseñados en la plataforma, luego los más votados en Steam y el resto. `votos`: más votados en Steam.',
            { type: 'string', enum: ['relevancia', 'votos', 'resenas', 'nombre', 'appId'], default: 'relevancia' },
          ),
          query('pagina', 'Número de página', { type: 'integer', minimum: 1, default: 1 }),
          query('tamanio', 'Resultados por página', { type: 'integer', minimum: 1, maximum: 60, default: 24 }),
        ],
        responses: { 200: ok('Página de videojuegos', pagina('Videojuego')), ...errores },
      },
    },
    '/api/catalogo/importar': {
      post: {
        tags: ['Catálogo'],
        summary: 'Importar o actualizar videojuegos desde un dataset (admin, RNF 4)',
        description: 'Para el dataset completo de Steam (~1 GB) usar el script `npm run db:seed:steam`.',
        requestBody: cuerpo('Dataset'),
        responses: { 200: ok('Resultado', ref('ResultadoImportacion')), ...erroresAdmin },
      },
    },

    // ---------------- Videojuegos ----------------
    '/api/videojuegos': {
      post: {
        tags: ['Videojuegos'],
        summary: 'Registrar videojuego (CU 13, admin)',
        requestBody: cuerpo('VideojuegoNuevo'),
        responses: { 201: ok('Creado', ref('Videojuego')), ...erroresAdmin, 409: error('El AppID ya existe') },
      },
    },
    '/api/videojuegos/{appId}': {
      parameters: [pathParam('appId', 'AppID de Steam')],
      get: {
        tags: ['Videojuegos'],
        summary: 'Consultar videojuego por AppID (CU 5)',
        responses: { 200: ok('Videojuego', ref('Videojuego')), ...errores, 404: error('No existe') },
      },
      put: {
        tags: ['Videojuegos'],
        summary: 'Modificar videojuego (CU 14, admin)',
        requestBody: cuerpo('VideojuegoModificado'),
        responses: { 200: ok('Modificado', ref('Videojuego')), ...erroresAdmin, 404: error('No existe') },
      },
      delete: {
        tags: ['Videojuegos'],
        summary: 'Eliminar videojuego (CU 15, admin)',
        description: 'También elimina sus reseñas.',
        responses: { 204: ok('Eliminado'), ...erroresAdmin, 404: error('No existe') },
      },
    },

    // ---------------- Categorías / Etiquetas ----------------
    ...clasificacion('categorias', 'Categorías', 'Categoria', 'categoría', [23, 16, 17, 18]),
    ...clasificacion('etiquetas', 'Etiquetas', 'Etiqueta', 'etiqueta', [24, 19, 20, 21]),

    // ---------------- Reseñas ----------------
    '/api/resenas': {
      get: {
        tags: ['Reseñas'],
        summary: 'Listar reseñas de un videojuego o de un usuario (CU 8, 12)',
        description: 'Indicar `appId` **o** `steamId`. Por videojuego se ordenan por cantidad de "Me gusta" (descendente); por usuario, por fecha.',
        parameters: [
          query('appId', 'AppID del videojuego', { type: 'integer' }),
          query('steamId', 'SteamID del autor'),
          query('pagina', 'Número de página', { type: 'integer', default: 1 }),
          query('tamanio', 'Resultados por página', { type: 'integer', maximum: 50, default: 10 }),
        ],
        responses: { 200: ok('Página de reseñas', pagina('Resena')), 400: error('Falta appId o steamId'), ...errores },
      },
      post: {
        tags: ['Reseñas'],
        summary: 'Registrar reseña (CU 7)',
        description:
          'Consulta la biblioteca en Steam (CU 6) y guarda las horas jugadas en ese momento. Requiere que el juego esté en la biblioteca y que sea pública.',
        requestBody: cuerpo('ResenaNueva'),
        responses: {
          201: ok('Publicada', ref('Resena')),
          400: error('Datos inválidos (1 a 5 estrellas, hasta 1200 caracteres)'),
          ...errores,
          403: error('Biblioteca privada o juego fuera de la biblioteca'),
          404: error('El videojuego no existe'),
          409: error('Ya existe una reseña del usuario para ese juego'),
          503: error('Steam no respondió y no hay datos guardados'),
        },
      },
    },
    '/api/resenas/mia': {
      get: {
        tags: ['Reseñas'],
        summary: 'Mi reseña sobre un videojuego',
        parameters: [{ ...query('appId', 'AppID del videojuego', { type: 'integer' }), required: true }],
        responses: { 200: ok('La reseña o null', { oneOf: [ref('Resena'), { type: 'null' }] }), ...errores },
      },
    },
    '/api/resenas/{id}': {
      parameters: [pathParam('id', 'ID de la reseña')],
      get: {
        tags: ['Reseñas'],
        summary: 'Consultar reseña (CU 8)',
        responses: { 200: ok('Reseña', ref('Resena')), ...errores, 404: error('No existe') },
      },
      put: {
        tags: ['Reseñas'],
        summary: 'Modificar reseña propia (CU 9)',
        description: 'Las horas al comentar no cambian (conservan el valor histórico).',
        requestBody: cuerpo('ResenaModificada'),
        responses: { 200: ok('Modificada', ref('Resena')), ...errores, 403: error('La reseña es de otro usuario'), 404: error('No existe') },
      },
      delete: {
        tags: ['Reseñas'],
        summary: 'Eliminar reseña propia (CU 10)',
        responses: { 204: ok('Eliminada'), ...errores, 403: error('La reseña es de otro usuario'), 404: error('No existe') },
      },
    },
    '/api/resenas/{id}/valoracion': {
      put: {
        tags: ['Reseñas'],
        summary: 'Registrar valoración de reseña (CU 11)',
        description: '`esLike: true` = Me gusta, `false` = No me gusta, `null` = quitar la valoración. No se puede valorar una reseña propia.',
        parameters: [pathParam('id', 'ID de la reseña')],
        requestBody: cuerpo('Valoracion'),
        responses: {
          200: ok('Contadores actualizados', {
            type: 'object',
            properties: {
              cantLike: { type: 'integer' },
              cantDislike: { type: 'integer' },
              miValoracion: { type: ['boolean', 'null'] },
            },
          }),
          ...errores,
          403: error('Es una reseña propia'),
          404: error('No existe'),
        },
      },
    },
  },
};

function clasificacion(ruta: string, tag: string, schema: string, singular: string, cu: [number, number, number, number]) {
  return {
    [`/api/${ruta}`]: {
      get: {
        tags: [tag],
        summary: `Consultar ${ruta} (CU ${cu[0]})`,
        description: `Incluye la cantidad de videojuegos asociados a cada ${singular}.`,
        responses: { 200: ok('Listado', { type: 'array', items: ref(schema) }), ...errores },
      },
      post: {
        tags: [tag],
        summary: `Registrar ${singular} (CU ${cu[1]}, admin)`,
        requestBody: cuerpo('Nombre'),
        responses: { 201: ok('Creada', ref(schema)), ...erroresAdmin, 409: error('El nombre ya existe') },
      },
    },
    [`/api/${ruta}/{id}`]: {
      parameters: [pathParam('id', `ID de la ${singular}`)],
      put: {
        tags: [tag],
        summary: `Modificar ${singular} (CU ${cu[2]}, admin)`,
        requestBody: cuerpo('Nombre'),
        responses: { 200: ok('Modificada', ref(schema)), ...erroresAdmin, 404: error('No existe'), 409: error('El nombre ya existe') },
      },
      delete: {
        tags: [tag],
        summary: `Eliminar ${singular} (CU ${cu[3]}, admin)`,
        responses: { 204: ok('Eliminada'), ...erroresAdmin, 404: error('No existe') },
      },
    },
  };
}
