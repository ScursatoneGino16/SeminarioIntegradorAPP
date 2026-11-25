// AmigosPresentacionWeb ↔ GestionAmigos
import { Router } from 'express';
import { z } from 'zod';
import { requiereAutenticacion, usuarioActual } from '../usuario/sesion.js';
import {
  aceptarSolicitud,
  eliminarRelacion,
  enviarSolicitud,
  listarAmigos,
  listarSolicitudes,
  sugerencias,
} from './amigos.service.js';

const steamIdParam = z.string().regex(/^\d{17}$/, 'El SteamID debe tener 17 dígitos');

export const amigoRouter = Router();
amigoRouter.use(requiereAutenticacion);

amigoRouter.get('/', async (req, res) => {
  res.json(await listarAmigos(usuarioActual(req)));
});
amigoRouter.get('/solicitudes', async (req, res) => {
  res.json(await listarSolicitudes(usuarioActual(req)));
});
amigoRouter.get('/sugerencias', async (req, res) => {
  res.json(await sugerencias(usuarioActual(req)));
});
amigoRouter.post('/:steamId', async (req, res) => {
  res.status(201).json(await enviarSolicitud(usuarioActual(req), steamIdParam.parse(req.params.steamId)));
});
amigoRouter.put('/:steamId/aceptar', async (req, res) => {
  res.json(await aceptarSolicitud(usuarioActual(req), steamIdParam.parse(req.params.steamId)));
});
amigoRouter.delete('/:steamId', async (req, res) => {
  res.json(await eliminarRelacion(usuarioActual(req), steamIdParam.parse(req.params.steamId)));
});
