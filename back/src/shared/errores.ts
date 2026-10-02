import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class ErrorApp extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly codigo = 'ERROR',
  ) {
    super(message);
  }
}

export const noEncontrado = (msg: string) => new ErrorApp(404, msg, 'NO_ENCONTRADO');
export const prohibido = (msg: string) => new ErrorApp(403, msg, 'PROHIBIDO');
export const conflicto = (msg: string) => new ErrorApp(409, msg, 'CONFLICTO');
export const solicitudInvalida = (msg: string) => new ErrorApp(400, msg, 'SOLICITUD_INVALIDA');

export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorApp) {
    res.status(err.status).json({ error: err.message, codigo: err.codigo });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      codigo: 'VALIDACION',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'El registro ya existe', codigo: 'CONFLICTO' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro no encontrado', codigo: 'NO_ENCONTRADO' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'Referencia inválida entre registros', codigo: 'CONFLICTO' });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', codigo: 'INTERNO' });
};
