// Subida de imágenes y búsqueda de GIFs para las reseñas.
import express, { Router } from 'express';
import { config } from '../../config.js';
import { requiereAutenticacion } from '../usuario/sesion.js';
import { buscarGifs, busquedaGifsSchema, guardarImagen } from './adjuntos.service.js';

export const imagenRouter = Router();
imagenRouter.use(requiereAutenticacion);

// El cuerpo es la imagen tal cual (Content-Type image/*); el tipo real se verifica por sus bytes.
imagenRouter.post('/', express.raw({ type: 'image/*', limit: `${config.maxMbImagen}mb` }), async (req, res) => {
  res.status(201).json(await guardarImagen(req.body));
});

export const gifRouter = Router();
gifRouter.use(requiereAutenticacion);

gifRouter.get('/', async (req, res) => {
  res.json(await buscarGifs(busquedaGifsSchema.parse(req.query)));
});
