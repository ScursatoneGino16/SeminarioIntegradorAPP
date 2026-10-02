// ImportadorSteamOpenID: autenticación mediante Steam OpenID 2.0 y lectura de los datos
// públicos de la cuenta (interfaz "DatosCuentaSteamID"). Nunca se manejan contraseñas (RNF 2).
import { config } from '../config.js';
import { fetchSteam } from './steamHttp.js';

const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const CLAIMED_ID_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export interface DatosCuentaSteam {
  steamId: string;
  nombreUsuario: string;
  avatarUrl: string | null;
  /** communityvisibilitystate === 3 → perfil público */
  perfilPublico: boolean;
}

export function construirUrlLogin(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${OPENID_ENDPOINT}?${params.toString()}`;
}

export function extraerSteamId(claimedId: string | undefined): string | null {
  return claimedId?.match(CLAIMED_ID_REGEX)?.[1] ?? null;
}

/**
 * Verifica la respuesta de Steam OpenID consultando a Steam (check_authentication).
 * Devuelve el SteamID si la firma es válida, o null si no lo es.
 */
export async function verificarRespuesta(
  query: Record<string, unknown>,
  returnToEsperado: string,
): Promise<string | null> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith('openid.') && typeof v === 'string') params[k] = v;
  }
  if (params['openid.mode'] !== 'id_res') return null;
  if (!params['openid.return_to']?.startsWith(returnToEsperado)) return null;
  if (params['openid.op_endpoint'] !== OPENID_ENDPOINT) return null;

  const steamId = extraerSteamId(params['openid.claimed_id']);
  if (!steamId) return null;

  const body = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' });
  const res = await fetchSteam(OPENID_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const texto = await res.text();
  return /is_valid\s*:\s*true/.test(texto) ? steamId : null;
}

/**
 * Nombre de perfil, avatar y visibilidad de una cuenta real de Steam.
 * Con STEAM_API_KEY usa GetPlayerSummaries; sin clave, el XML público del perfil
 * (no requiere clave y alcanza para nombre y avatar).
 */
export async function obtenerDatosCuenta(steamId: string): Promise<DatosCuentaSteam> {
  return config.steamApiKey ? datosDesdeWebApi(steamId) : datosDesdePerfilXml(steamId);
}

async function datosDesdeWebApi(steamId: string): Promise<DatosCuentaSteam> {
  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('steamids', steamId);
  const res = await fetchSteam(url.toString());
  const data = (await res.json()) as {
    response?: { players?: Array<{ personaname: string; avatarfull?: string; communityvisibilitystate?: number }> };
  };
  const jugador = data.response?.players?.[0];
  return {
    steamId,
    nombreUsuario: jugador?.personaname ?? `Steam ${steamId.slice(-4)}`,
    avatarUrl: jugador?.avatarfull ?? null,
    perfilPublico: jugador?.communityvisibilitystate === 3,
  };
}

/** Lee un campo `<campo>valor</campo>` o `<campo><![CDATA[valor]]></campo>` del XML del perfil. */
export function campoXml(xml: string, campo: string): string | null {
  const m = xml.match(new RegExp(`<${campo}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${campo}>`));
  const valor = m ? (m[1] ?? m[2] ?? '').trim() : '';
  return valor || null;
}

async function datosDesdePerfilXml(steamId: string): Promise<DatosCuentaSteam> {
  const res = await fetchSteam(`https://steamcommunity.com/profiles/${steamId}/?xml=1`);
  const xml = await res.text();
  return {
    steamId,
    nombreUsuario: campoXml(xml, 'steamID') ?? `Steam ${steamId.slice(-4)}`,
    avatarUrl: campoXml(xml, 'avatarFull'),
    perfilPublico: campoXml(xml, 'visibilityState') === '3',
  };
}

/** Datos de cuenta para el login de prueba del modo simulado (STEAM_MOCK). */
export function datosCuentaSimulados(steamId: string, nombre?: string): DatosCuentaSteam {
  return {
    steamId,
    nombreUsuario: nombre?.trim() || `Jugador ${steamId.slice(-4)}`,
    avatarUrl: null,
    perfilPublico: !steamId.endsWith('000'),
  };
}
