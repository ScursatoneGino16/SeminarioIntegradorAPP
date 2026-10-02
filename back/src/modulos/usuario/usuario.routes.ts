// UsuariosPresentacionWeb ↔ GestionUsuario (interfaz LogicaUsuarios)
import { Router, type Request } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import {
  construirUrlLogin,
  datosCuentaSimulados,
  obtenerDatosCuenta,
  verificarRespuesta,
  type DatosCuentaSteam,
} from '../../importadores/importadorSteamOpenID.js';
import { SteamNoDisponibleError } from '../../importadores/steamHttp.js';
import { ErrorApp } from '../../shared/errores.js';
import { requiereAutenticacion, usuarioActual } from './sesion.js';
import {
  obtenerPerfil,
  obtenerUsuario,
  refrescarPerfilSiCorresponde,
  registrarIngreso,
  sincronizarBiblioteca,
} from './usuario.service.js';

const RETORNO_OPENID = '/api/auth/steam/retorno';

async function iniciarSesion(req: Request, datos: DatosCuentaSteam) {
  const usuario = await registrarIngreso(datos);
  // Se regenera el id de sesión al autenticar para evitar fijación de sesión.
  await new Promise<void>((ok, mal) => req.session.regenerate((e) => (e ? mal(e) : ok())));
  req.session.steamId = usuario.steamId;
  req.session.esAdmin = usuario.esAdmin;
  // La biblioteca se sincroniza en segundo plano para que el catálogo muestre primero tus juegos.
  void sincronizarBiblioteca(usuario.steamId).catch((e) => console.error('Error al sincronizar la biblioteca:', e));
  return usuario;
}

export const authRouter = Router();

authRouter.get('/estado', async (req, res) => {
  const steamId = req.session.steamId;
  const guardado = steamId ? await obtenerUsuario(steamId).catch(() => null) : null;
  const usuario = guardado ? await refrescarPerfilSiCorresponde(guardado) : null;
  res.json({
    autenticado: !!usuario,
    usuario,
    modoSimulado: config.steamMock,
    minutosInactividad: config.sessionMinutosInactividad,
  });
});

authRouter.get('/steam', (_req, res) => {
  res.redirect(construirUrlLogin(config.appUrl + RETORNO_OPENID, config.appUrl));
});

authRouter.get('/steam/retorno', async (req, res) => {
  let steamId: string | null = null;
  try {
    steamId = await verificarRespuesta(req.query as Record<string, unknown>, config.appUrl + RETORNO_OPENID);
  } catch (e) {
    if (!(e instanceof SteamNoDisponibleError)) throw e;
    res.redirect(`${config.appUrl}/login?error=steam_no_disponible`);
    return;
  }
  if (!steamId) {
    res.redirect(`${config.appUrl}/login?error=autenticacion_invalida`);
    return;
  }

  let datos: DatosCuentaSteam;
  try {
    datos = await obtenerDatosCuenta(steamId);
  } catch (e) {
    if (!(e instanceof SteamNoDisponibleError)) throw e;
    // Steam autenticó pero la Web API no responde: se usan los datos guardados (RNF 6).
    const existente = await obtenerUsuario(steamId).catch(() => null);
    datos = existente
      ? {
          steamId,
          nombreUsuario: existente.nombreUsuario,
          avatarUrl: existente.avatarUrl,
          perfilPublico: existente.bibliotecaPublica,
        }
      : { steamId, nombreUsuario: `Steam ${steamId.slice(-4)}`, avatarUrl: null, perfilPublico: false };
  }
  await iniciarSesion(req, datos);
  res.redirect(`${config.appUrl}/`);
});

export const devLoginSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/, 'El SteamID debe tener 17 dígitos'),
  nombre: z.string().max(100).optional(),
});

/** Login de desarrollo: solo existe en modo simulado (sin Steam real). */
authRouter.post('/dev-login', async (req, res) => {
  if (!config.steamMock) throw new ErrorApp(404, 'No disponible', 'NO_ENCONTRADO');
  const { steamId, nombre } = devLoginSchema.parse(req.body);
  const usuario = await iniciarSesion(req, datosCuentaSimulados(steamId, nombre));
  res.json(usuario);
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((e) => {
    if (e) return next(e);
    res.clearCookie('resenas.sid');
    res.status(204).end();
  });
});

export const usuarioRouter = Router();
usuarioRouter.use(requiereAutenticacion);

usuarioRouter.get('/me/biblioteca', async (req, res) => {
  res.json(await sincronizarBiblioteca(usuarioActual(req)));
});

usuarioRouter.get('/:steamId', async (req, res) => {
  res.json(await obtenerPerfil(req.params.steamId));
});
