// ImportadorPerfilSteam: datos públicos del perfil de Steam para la pantalla de perfil
// (interfaz "DatosCuentaSteamID"): nivel y experiencia, antigüedad, juegos y horas totales,
// y los ítems equipados (avatar animado, marco de avatar y fondo de perfil).
import { config } from '../config.js';
import { fetchSteam } from './steamHttp.js';
import { hash } from './importadorBiblioteca.js';

const CDN_ITEMS = 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/';

export interface ExperienciaSteam {
  /** Experiencia total acumulada. */
  actual: number;
  /** Experiencia total en la que empieza el nivel actual. */
  inicioNivel: number;
  /** Experiencia que falta para el próximo nivel. */
  faltante: number;
}

export interface PerfilSteam {
  nivel: number | null;
  experiencia: ExperienciaSteam | null;
  /** Fecha de creación de la cuenta de Steam. */
  cuentaCreada: Date | null;
  juegos: number | null;
  horasTotales: number | null;
  /** Avatar animado equipado: GIF animado y su versión fija (JPG). */
  avatarAnimado: { animado: string; fijo: string | null } | null;
  /** URL del marco de avatar equipado (APNG animado si el marco se mueve). */
  marcoAvatar: string | null;
  /** Fondo de perfil equipado: imagen y, si es animado, video. */
  fondoPerfil: { imagen: string; video: string | null } | null;
}

const url = (base: string, params: Record<string, string>) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
};

async function json<T>(direccion: string): Promise<T> {
  return (await (await fetchSteam(direccion)).json()) as T;
}

/** Nivel y experiencia (IPlayerService/GetBadges, requiere clave). */
async function experiencia(steamId: string): Promise<Pick<PerfilSteam, 'nivel' | 'experiencia'>> {
  const { response: r } = await json<{
    response?: {
      player_level?: number;
      player_xp?: number;
      player_xp_needed_current_level?: number;
      player_xp_needed_to_level_up?: number;
    };
  }>(url('https://api.steampowered.com/IPlayerService/GetBadges/v1/', { key: config.steamApiKey, steamid: steamId }));
  // Con perfil privado Steam responde {"response":{}}.
  if (r?.player_level === undefined || r.player_xp === undefined) return { nivel: null, experiencia: null };
  return {
    nivel: r.player_level,
    experiencia: {
      actual: r.player_xp,
      inicioNivel: r.player_xp_needed_current_level ?? r.player_xp,
      faltante: r.player_xp_needed_to_level_up ?? 0,
    },
  };
}

/** Fecha de creación de la cuenta (GetPlayerSummaries; solo si el perfil es público). */
async function antiguedad(steamId: string): Promise<Date | null> {
  const { response } = await json<{ response?: { players?: Array<{ timecreated?: number }> } }>(
    url('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', { key: config.steamApiKey, steamids: steamId }),
  );
  const t = response?.players?.[0]?.timecreated;
  return t ? new Date(t * 1000) : null;
}

/** Cantidad de juegos y horas totales de toda la biblioteca (no solo los del catálogo). */
async function juegosYHoras(steamId: string): Promise<Pick<PerfilSteam, 'juegos' | 'horasTotales'>> {
  const { response } = await json<{ response?: { game_count?: number; games?: Array<{ playtime_forever: number }> } }>(
    url('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
      key: config.steamApiKey,
      steamid: steamId,
      include_played_free_games: '1',
    }),
  );
  if (response?.game_count === undefined) return { juegos: null, horasTotales: null };
  const minutos = (response.games ?? []).reduce((total, g) => total + g.playtime_forever, 0);
  return { juegos: response.game_count, horasTotales: Math.round(minutos / 60) };
}

/**
 * Marco de avatar y fondo de perfil equipados (IPlayerService/GetProfileItemsEquipped).
 * Es un endpoint de Steam no documentado oficialmente y no requiere clave: si deja de
 * funcionar, simplemente no se muestran estos ítems.
 */
async function itemsEquipados(steamId: string): Promise<Pick<PerfilSteam, 'avatarAnimado' | 'marcoAvatar' | 'fondoPerfil'>> {
  const { response } = await json<{
    response?: {
      animated_avatar?: { image_large?: string; image_small?: string };
      avatar_frame?: { image_large?: string; image_small?: string };
      profile_background?: { image_large?: string; movie_webm?: string; movie_mp4?: string };
    };
  }>(url('https://api.steampowered.com/IPlayerService/GetProfileItemsEquipped/v1/', { steamid: steamId }));
  // image_small es la versión animada (APNG); image_large es solo un cuadro fijo.
  const marco = response?.avatar_frame?.image_small || response?.avatar_frame?.image_large;
  const fondo = response?.profile_background;
  // Igual que el marco: image_small es el GIF animado e image_large una imagen fija.
  const avatar = response?.animated_avatar;
  return {
    avatarAnimado: avatar?.image_small
      ? { animado: CDN_ITEMS + avatar.image_small, fijo: avatar.image_large ? CDN_ITEMS + avatar.image_large : null }
      : null,
    marcoAvatar: marco ? CDN_ITEMS + marco : null,
    fondoPerfil: fondo?.image_large
      ? { imagen: CDN_ITEMS + fondo.image_large, video: fondo.movie_webm ? CDN_ITEMS + fondo.movie_webm : null }
      : null,
  };
}

/** Datos simulados y estables para los usuarios de prueba (modo sin clave de Steam). */
export function perfilSimulado(steamId: string): Omit<PerfilSteam, 'avatarAnimado' | 'marcoAvatar' | 'fondoPerfil'> {
  if (steamId.endsWith('000')) {
    return { nivel: null, experiencia: null, cuentaCreada: null, juegos: null, horasTotales: null };
  }
  const h = hash(`perfil:${steamId}`);
  const nivel = (h % 60) + 1;
  // En Steam cada nivel pide 100 EXP más cada 10 niveles; acá alcanza con una aproximación estable.
  const inicioNivel = nivel * 100 + Math.floor(nivel / 10) * 500;
  const porNivel = 100 * (Math.floor(nivel / 10) + 1);
  const avance = h % porNivel;
  return {
    nivel,
    experiencia: { actual: inicioNivel + avance, inicioNivel, faltante: porNivel - avance },
    cuentaCreada: new Date(Date.UTC(2008 + (h % 15), h % 12, (h % 27) + 1, 12)),
    juegos: 20 + (h % 300),
    horasTotales: 150 + (h % 6000),
  };
}

/** Cada dato se pide por separado: si uno falla (Steam lento o caído), el resto se muestra igual (RNF 6). */
async function oNulo<T>(promesa: Promise<T>, vacio: T): Promise<T> {
  try {
    return await promesa;
  } catch {
    return vacio;
  }
}

export async function obtenerPerfilSteam(steamId: string): Promise<PerfilSteam> {
  const items = oNulo(itemsEquipados(steamId), { avatarAnimado: null, marcoAvatar: null, fondoPerfil: null });
  if (config.steamMock) return { ...perfilSimulado(steamId), ...(await items) };

  const [xp, creada, biblioteca, equipados] = await Promise.all([
    oNulo(experiencia(steamId), { nivel: null, experiencia: null }),
    oNulo(antiguedad(steamId), null),
    oNulo(juegosYHoras(steamId), { juegos: null, horasTotales: null }),
    items,
  ]);
  return { ...xp, cuentaCreada: creada, ...biblioteca, ...equipados };
}
