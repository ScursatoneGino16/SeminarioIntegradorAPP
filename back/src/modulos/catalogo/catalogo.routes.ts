// CatalogoPresentacionWeb ↔ GestionCatalogo (interfaz LogicaCatalogo)
import { Router } from 'express';
import { requiereAdmin, requiereAutenticacion, usuarioActual } from '../usuario/sesion.js';
import { consultarCatalogo, datasetSchema, filtrosCatalogoSchema, importarCatalogo } from './catalogo.service.js';

export const catalogoRouter = Router();
catalogoRouter.use(requiereAutenticacion);

catalogoRouter.get('/', async (req, res) => {
  res.json(await consultarCatalogo(filtrosCatalogoSchema.parse(req.query), usuarioActual(req)));
});

/** Importación/actualización del catálogo desde un dataset JSON (Administrador). */
catalogoRouter.post('/importar', requiereAdmin, async (req, res) => {
  res.json(await importarCatalogo(datasetSchema.parse(req.body)));
});
