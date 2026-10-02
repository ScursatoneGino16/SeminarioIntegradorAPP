// VideojuegoPresentacionWeb ↔ GestionVideojuego (interfaz LogicaVideojuego)
import { Router } from 'express';
import { z } from 'zod';
import { requiereAdmin, requiereAutenticacion } from '../usuario/sesion.js';
import {
  categorias,
  consultarVideojuego,
  eliminarVideojuego,
  etiquetas,
  modificarVideojuego,
  nombreSchema,
  registrarVideojuego,
  videojuegoSchema,
  videojuegoUpdateSchema,
} from './videojuego.service.js';

const idParam = z.coerce.number().int().positive();

export const videojuegoRouter = Router();
videojuegoRouter.use(requiereAutenticacion);

videojuegoRouter.get('/:appId', async (req, res) => {
  res.json(await consultarVideojuego(idParam.parse(req.params.appId)));
});
videojuegoRouter.post('/', requiereAdmin, async (req, res) => {
  res.status(201).json(await registrarVideojuego(videojuegoSchema.parse(req.body)));
});
videojuegoRouter.put('/:appId', requiereAdmin, async (req, res) => {
  res.json(await modificarVideojuego(idParam.parse(req.params.appId), videojuegoUpdateSchema.parse(req.body)));
});
videojuegoRouter.delete('/:appId', requiereAdmin, async (req, res) => {
  await eliminarVideojuego(idParam.parse(req.params.appId));
  res.status(204).end();
});

function crudNombre(servicio: typeof categorias | typeof etiquetas) {
  const r = Router();
  r.use(requiereAutenticacion);
  r.get('/', async (_req, res) => {
    res.json(await servicio.listar());
  });
  r.post('/', requiereAdmin, async (req, res) => {
    res.status(201).json(await servicio.crear(nombreSchema.parse(req.body).nombre));
  });
  r.put('/:id', requiereAdmin, async (req, res) => {
    res.json(await servicio.modificar(idParam.parse(req.params.id), nombreSchema.parse(req.body).nombre));
  });
  r.delete('/:id', requiereAdmin, async (req, res) => {
    await servicio.eliminar(idParam.parse(req.params.id));
    res.status(204).end();
  });
  return r;
}

export const categoriaRouter = crudNombre(categorias);
export const etiquetaRouter = crudNombre(etiquetas);
