// ImportadorBiblioteca: obtiene desde Steam la biblioteca del usuario y sus horas de juego
// (interfaz "InformacionVideojuegosDeUsuario").
import { config } from '../config.js';
import { fetchSteam } from './steamHttp.js';

export interface JuegoBiblioteca {
  appId: number;
  horasJugadas: number;
}

export interface BibliotecaSteam {
  /** false si Steam no expone la biblioteca (perfil o detalles de juego privados). */
  publica: boolean;
  juegos: JuegoBiblioteca[];
}

const minutosAHoras = (min: number) => Math.round((min / 60) * 10) / 10;

/**
 * @param appIdsCatalogo solo se usa en modo simulado, para armar una biblioteca
 *                       ficticia con juegos que existan en el catálogo.
 */
export async function obtenerBiblioteca(steamId: string, appIdsCatalogo: number[] = []): Promise<BibliotecaSteam> {
  if (config.steamMock) return bibliotecaSimulada(steamId, appIdsCatalogo);

  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('include_played_free_games', '1');
  url.searchParams.set('format', 'json');
  const res = await fetchSteam(url.toString());
  const data = (await res.json()) as {
    response?: { game_count?: number; games?: Array<{ appid: number; playtime_forever: number }> };
  };

  // Con biblioteca privada Steam responde {"response":{}} (sin game_count).
  if (data.response?.game_count === undefined) return { publica: false, juegos: [] };

  return {
    publica: true,
    juegos: (data.response.games ?? []).map((g) => ({
      appId: g.appid,
      horasJugadas: minutosAHoras(g.playtime_forever),
    })),
  };
}

/** Hash simple y determinístico para que la biblioteca simulada sea estable entre llamadas. */
function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const MAX_JUEGOS_SIMULADOS = 40;

/**
 * Biblioteca simulada: hasta 40 juegos del catálogo con horas pseudoaleatorias.
 * Los SteamID terminados en "000" simulan una biblioteca privada.
 */
export function bibliotecaSimulada(steamId: string, appIdsCatalogo: number[]): BibliotecaSteam {
  if (steamId.endsWith('000')) return { publica: false, juegos: [] };
  const juegos = appIdsCatalogo
    .filter((appId) => hash(`${steamId}:${appId}`) % 10 < 6)
    .slice(0, MAX_JUEGOS_SIMULADOS)
    .map((appId) => ({ appId, horasJugadas: minutosAHoras(hash(`${appId}:${steamId}`) % 30000) }));
  return { publica: true, juegos };
}
