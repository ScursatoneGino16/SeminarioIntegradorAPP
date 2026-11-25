// NotificacionesPresentacionWeb ↔ GestionNotificaciones
import { Router } from 'express';
import { z } from 'zod';
import { requiereAutenticacion, usuarioActual } from '../usuario/sesion.js';
import {
  cantidadSinLeer,
  listadoNotificacionesSchema,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from './notificaciones.service.js';

const idParam = z.coerce.number().int().positive();

export const notificacionRouter = Router();
notificacionRouter.use(requiereAutenticacion);

notificacionRouter.get('/', async (req, res) => {
  res.json(await listarNotificaciones(usuarioActual(req), listadoNotificacionesSchema.parse(req.query)));
});
notificacionRouter.get('/cantidad', async (req, res) => {
  res.json(await cantidadSinLeer(usuarioActual(req)));
});
notificacionRouter.put('/leidas', async (req, res) => {
  res.json(await marcarTodasLeidas(usuarioActual(req)));
});
notificacionRouter.put('/:id/leida', async (req, res) => {
  await marcarLeida(idParam.parse(req.params.id), usuarioActual(req));
  res.status(204).end();
});
