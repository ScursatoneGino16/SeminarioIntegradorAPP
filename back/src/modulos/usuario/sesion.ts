// Sesion: estado de sesión con expiración por inactividad (RNF 3) y autorización en servidor (RNF 9).
import type { Request, RequestHandler } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { config } from '../../config.js';
import { ErrorApp, prohibido } from '../../shared/errores.js';

declare module 'express-session' {
  interface SessionData {
    steamId?: string;
    esAdmin?: boolean;
  }
}

export function crearMiddlewareSesion(): RequestHandler {
  const PgStore = connectPgSimple(session);
  const maxAge = config.sessionMinutosInactividad * 60 * 1000;
  return session({
    name: 'resenas.sid',
    secret: config.sessionSecret,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: false, // la tabla la crea la migración de Prisma
    }),
    resave: false,
    saveUninitialized: false,
    // rolling: cada request renueva la expiración → expira tras N minutos SIN actividad.
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.produccion,
      maxAge,
    },
  });
}

export const requiereAutenticacion: RequestHandler = (req, _res, next) => {
  if (!req.session.steamId) {
    next(new ErrorApp(401, 'Tenés que iniciar sesión con Steam', 'NO_AUTENTICADO'));
    return;
  }
  next();
};

export const requiereAdmin: RequestHandler = (req, _res, next) => {
  if (!req.session.steamId) {
    next(new ErrorApp(401, 'Tenés que iniciar sesión con Steam', 'NO_AUTENTICADO'));
    return;
  }
  if (!req.session.esAdmin) {
    next(prohibido('Operación reservada al Administrador'));
    return;
  }
  next();
};

/** SteamID del usuario autenticado. Solo usar detrás de requiereAutenticacion. */
export function usuarioActual(req: Request): string {
  const id = req.session.steamId;
  if (!id) throw new ErrorApp(401, 'Tenés que iniciar sesión con Steam', 'NO_AUTENTICADO');
  return id;
}
