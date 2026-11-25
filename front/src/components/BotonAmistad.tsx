import { useState } from 'react';
import { api, type Relacion } from '../api';

/** Botón del perfil según la relación: agregar, cancelar, aceptar/rechazar o eliminar amistad. */
export function BotonAmistad({
  steamId,
  relacion,
  onCambio,
}: {
  steamId: string;
  relacion: Relacion;
  onCambio: (r: Relacion) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hacer(accion: () => Promise<{ relacion: Relacion }>) {
    setOcupado(true);
    setError(null);
    try {
      onCambio((await accion()).relacion);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (relacion === 'propio') return null;
  return (
    <div className="boton-amistad">
      {relacion === 'ninguna' && (
        <button className="btn btn-primario btn-chico" disabled={ocupado} onClick={() => void hacer(() => api.agregarAmigo(steamId))}>
          + Agregar amigo
        </button>
      )}
      {relacion === 'enviada' && (
        <>
          <span className="texto-suave">Solicitud enviada</span>
          <button className="btn-link" disabled={ocupado} onClick={() => void hacer(() => api.quitarAmigo(steamId))}>
            Cancelar
          </button>
        </>
      )}
      {relacion === 'recibida' && (
        <>
          <span>Te mandó una solicitud</span>
          <button className="btn btn-primario btn-chico" disabled={ocupado} onClick={() => void hacer(() => api.aceptarAmigo(steamId))}>
            Aceptar
          </button>
          <button className="btn btn-fantasma btn-chico" disabled={ocupado} onClick={() => void hacer(() => api.quitarAmigo(steamId))}>
            Rechazar
          </button>
        </>
      )}
      {relacion === 'amigos' && (
        <>
          <span className="insignia">Amigos ✓</span>
          <button
            className="btn-link btn-link-peligro"
            disabled={ocupado}
            onClick={() => confirm('¿Eliminar esta amistad?') && void hacer(() => api.quitarAmigo(steamId))}
          >
            Eliminar amistad
          </button>
        </>
      )}
      {error && <p className="error-chico">{error}</p>}
    </div>
  );
}
