// LanzamientosPresentacionWeb ↔ GestionLanzamientos
import { Router } from 'express';
import { z } from 'zod';
import { requiereAdmin, requiereAutenticacion, usuarioActual } from '../usuario/sesion.js';
import {
  actualizarLanzamientos,
  bajaPorToken,
  calendario,
  calendarioSchema,
  desuscribir,
  miSuscripcion,
  suscribir,
  suscripcionSchema,
} from './lanzamientos.service.js';

const idParam = z.coerce.number().int().positive();

export const lanzamientoRouter = Router();

// Enlace del mail: funciona sin sesión, el token identifica la suscripción.
lanzamientoRouter.get('/baja/:token', async (req, res) => {
  const ok = z.uuid().safeParse(req.params.token).success && (await bajaPorToken(req.params.token));
  res
    .status(ok ? 200 : 404)
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Aviso de lanzamiento</title>
       <body style="font-family:sans-serif;background:#07071c;color:#f8f8f8;display:grid;place-items:center;min-height:90vh">
       <p>${ok ? 'Listo: ya no vas a recibir este aviso.' : 'El enlace no es válido o ya te diste de baja.'}</p></body>`,
    );
});

lanzamientoRouter.use(requiereAutenticacion);

lanzamientoRouter.get('/', async (req, res) => {
  res.json(await calendario(calendarioSchema.parse(req.query), usuarioActual(req)));
});
lanzamientoRouter.post('/actualizar', requiereAdmin, async (_req, res) => {
  res.json(await actualizarLanzamientos());
});
lanzamientoRouter.get('/:appId/aviso', async (req, res) => {
  res.json(await miSuscripcion(idParam.parse(req.params.appId), usuarioActual(req)));
});
lanzamientoRouter.put('/:appId/aviso', async (req, res) => {
  res.json(await suscribir(idParam.parse(req.params.appId), usuarioActual(req), suscripcionSchema.parse(req.body)));
});
lanzamientoRouter.delete('/:appId/aviso', async (req, res) => {
  await desuscribir(idParam.parse(req.params.appId), usuarioActual(req));
  res.status(204).end();
});
