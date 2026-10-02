// ReseñaPresentacionWeb ↔ GestionPublicacionYGestionReseñas (interfaz LogicaReseñas)
import { Router } from 'express';
import { z } from 'zod';
import { requiereAutenticacion, usuarioActual } from '../usuario/sesion.js';
import {
  consultarResena,
  eliminarResena,
  listadoSchema,
  listarResenas,
  miResena,
  modificarResena,
  modificarResenaSchema,
  registrarResena,
  registrarResenaSchema,
  valoracionSchema,
  valorarResena,
} from './resena.service.js';

const idParam = z.coerce.number().int().positive();

export const resenaRouter = Router();
resenaRouter.use(requiereAutenticacion);

resenaRouter.get('/', async (req, res) => {
  res.json(await listarResenas(listadoSchema.parse(req.query), usuarioActual(req)));
});
resenaRouter.get('/mia', async (req, res) => {
  res.json(await miResena(idParam.parse(req.query.appId), usuarioActual(req)));
});
resenaRouter.get('/:id', async (req, res) => {
  res.json(await consultarResena(idParam.parse(req.params.id), usuarioActual(req)));
});
resenaRouter.post('/', async (req, res) => {
  res.status(201).json(await registrarResena(usuarioActual(req), registrarResenaSchema.parse(req.body)));
});
resenaRouter.put('/:id', async (req, res) => {
  res.json(await modificarResena(idParam.parse(req.params.id), usuarioActual(req), modificarResenaSchema.parse(req.body)));
});
resenaRouter.delete('/:id', async (req, res) => {
  await eliminarResena(idParam.parse(req.params.id), usuarioActual(req));
  res.status(204).end();
});
resenaRouter.put('/:id/valoracion', async (req, res) => {
  const { esLike } = valoracionSchema.parse(req.body);
  res.json(await valorarResena(idParam.parse(req.params.id), usuarioActual(req), esLike));
});
