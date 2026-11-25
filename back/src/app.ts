import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { documentoOpenApi } from './docs/openapi.js';
import { manejadorErrores } from './shared/errores.js';
import { crearMiddlewareSesion } from './modulos/usuario/sesion.js';
import { authRouter, usuarioRouter } from './modulos/usuario/usuario.routes.js';
import { categoriaRouter, etiquetaRouter, videojuegoRouter } from './modulos/videojuego/videojuego.routes.js';
import { catalogoRouter } from './modulos/catalogo/catalogo.routes.js';
import { resenaRouter } from './modulos/resenas/resena.routes.js';
import { gifRouter, imagenRouter } from './modulos/adjuntos/adjuntos.routes.js';
import { RUTA_UPLOADS } from './modulos/adjuntos/adjuntos.service.js';
import { lanzamientoRouter } from './modulos/lanzamientos/lanzamientos.routes.js';
import { amigoRouter } from './modulos/amigos/amigos.routes.js';
import { notificacionRouter } from './modulos/notificaciones/notificaciones.routes.js';
import { config } from './config.js';

export function crearApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));
  app.use(crearMiddlewareSesion());

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true });
  });
  // Documentación Swagger / OpenAPI
  app.get('/api/docs.json', (_req, res) => {
    res.json(documentoOpenApi);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(documentoOpenApi, {
      customSiteTitle: 'API · SteamVault',
      swaggerOptions: { withCredentials: true, persistAuthorization: true },
    }),
  );
  app.use('/api/auth', authRouter);
  app.use('/api/usuarios', usuarioRouter);
  app.use('/api/catalogo', catalogoRouter);
  app.use('/api/videojuegos', videojuegoRouter);
  app.use('/api/categorias', categoriaRouter);
  app.use('/api/etiquetas', etiquetaRouter);
  app.use('/api/resenas', resenaRouter);
  app.use('/api/lanzamientos', lanzamientoRouter);
  app.use('/api/amigos', amigoRouter);
  app.use('/api/notificaciones', notificacionRouter);
  app.use('/api/imagenes', imagenRouter);
  app.use('/api/gifs', gifRouter);
  // Imágenes subidas: nombres aleatorios e inmutables; nosniff evita que se interpreten como otro tipo.
  app.use(
    RUTA_UPLOADS,
    express.static(config.carpetaUploads, {
      immutable: true,
      maxAge: '30d',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', codigo: 'NO_ENCONTRADO' });
  });
  app.use(manejadorErrores);
  return app;
}
