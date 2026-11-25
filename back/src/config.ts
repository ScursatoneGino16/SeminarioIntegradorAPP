import 'dotenv/config';
import path from 'node:path';

function entero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

const steamApiKey = process.env.STEAM_API_KEY?.trim() ?? '';

export const config = {
  puerto: entero(process.env.PORT, 3000),
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET ?? 'cambiar-este-secreto',
  sessionMinutosInactividad: entero(process.env.SESSION_MINUTOS_INACTIVIDAD, 30),
  steamApiKey,
  steamTimeoutMs: entero(process.env.STEAM_TIMEOUT_MS, 5000),
  // Sin API key no se puede consultar la biblioteca real, así que se fuerza el modo simulado.
  steamMock: process.env.STEAM_MOCK === 'true' || steamApiKey === '',
  adminSteamIds: new Set(
    (process.env.ADMIN_STEAM_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  produccion: process.env.NODE_ENV === 'production',
  // Búsqueda de GIFs: la clave queda en el servidor (el front consulta /api/gifs)
  giphyApiKey: process.env.GIPHY_API_KEY?.trim() ?? '',
  // Imágenes subidas a las reseñas
  carpetaUploads: path.resolve(process.env.UPLOADS_DIR ?? 'uploads'),
  maxMbImagen: entero(process.env.MAX_MB_IMAGEN, 3),
  // Avisos de lanzamiento por mail. Sin SMTP_HOST los mails se muestran en la consola.
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? '',
    puerto: entero(process.env.SMTP_PORT, 587),
    usuario: process.env.SMTP_USER ?? '',
    clave: process.env.SMTP_PASS ?? '',
  },
  mailRemitente: process.env.MAIL_FROM ?? 'SteamVault <no-responder@steamvault.local>',
  // Cada cuánto se actualizan los próximos lanzamientos desde la tienda de Steam (0 = nunca)
  horasActualizacionLanzamientos: Number(process.env.LANZAMIENTOS_HORAS ?? 6),
};
