// ImportadorAmigosSteam: lista de amigos de Steam, usada solo para sugerir amistades en SteamVault.
import { config } from '../config.js';
import { fetchSteam } from './steamHttp.js';
import { hash } from './importadorBiblioteca.js';

export interface AmigosSteam {
  /** false si la lista de amigos es privada */
  publica: boolean;
  steamIds: string[];
}

/**
 * ISteamUser/GetFriendList (requiere clave). Con la lista privada Steam responde 401.
 * @param candidatos solo en modo simulado: usuarios registrados entre los que se eligen "amigos".
 */
export async function obtenerAmigosSteam(steamId: string, candidatos: string[] = []): Promise<AmigosSteam> {
  if (config.steamMock) return amigosSimulados(steamId, candidatos);

  const url = new URL('https://api.steampowered.com/ISteamUser/GetFriendList/v1/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('relationship', 'friend');
  const res = await fetchSteam(url.toString(), {}, [401, 403]);
  if (!res.ok) return { publica: false, steamIds: [] };
  const data = (await res.json()) as { friendslist?: { friends?: Array<{ steamid: string }> } };
  return { publica: true, steamIds: (data.friendslist?.friends ?? []).map((f) => f.steamid) };
}

/**
 * Amistades simuladas y simétricas: dos usuarios son "amigos en Steam" según un hash del par,
 * así A ve a B como sugerencia si y solo si B ve a A. Los SteamID terminados en "000" son privados.
 */
export function amigosSimulados(steamId: string, candidatos: string[]): AmigosSteam {
  if (steamId.endsWith('000')) return { publica: false, steamIds: [] };
  const par = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  return {
    publica: true,
    steamIds: candidatos.filter((c) => c !== steamId && !c.endsWith('000') && hash(par(steamId, c)) % 2 === 0),
  };
}
