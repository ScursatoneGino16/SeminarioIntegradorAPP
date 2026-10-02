import 'dotenv/config';

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
};
