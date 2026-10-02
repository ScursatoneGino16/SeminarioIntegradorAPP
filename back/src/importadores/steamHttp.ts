import { config } from '../config.js';
import { ErrorApp } from '../shared/errores.js';

/** Steam no respondió o respondió con error (RNF 1 / RNF 6). */
export class SteamNoDisponibleError extends ErrorApp {
  constructor(detalle: string) {
    super(503, `Steam no está disponible en este momento (${detalle}). Intentá más tarde.`, 'STEAM_NO_DISPONIBLE');
  }
}

/**
 * fetch con tiempo máximo de espera configurable (5 s por defecto, RNF 1).
 * Cualquier timeout, error de red o status no exitoso se traduce en SteamNoDisponibleError.
 */
export async function fetchSteam(url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(config.steamTimeoutMs) });
  } catch (e) {
    const nombre = (e as Error).name;
    throw new SteamNoDisponibleError(
      nombre === 'TimeoutError' ? `superó ${config.steamTimeoutMs} ms` : 'error de red',
    );
  }
  if (!res.ok) throw new SteamNoDisponibleError(`HTTP ${res.status}`);
  return res;
}
