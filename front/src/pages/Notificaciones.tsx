import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Notificacion, type Pagina } from '../api';
import { avisarCambioNotificaciones, describir } from '../notificaciones';
import { ListaNotificaciones } from '../components/Campanita';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';

export default function Notificaciones() {
  const [datos, setDatos] = useState<(Pagina<Notificacion> & { sinLeer: number }) | null>(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const navegar = useNavigate();

  const cargar = useCallback(() => api.notificaciones(pagina).then(setDatos), [pagina]);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function abrir(n: Notificacion) {
    if (!n.leida) {
      await api.marcarNotificacion(n.notificacionId).catch(() => undefined);
      avisarCambioNotificaciones();
    }
    navegar(describir(n).enlace);
  }

  async function marcarTodas() {
    try {
      await api.marcarTodasNotificaciones();
      avisarCambioNotificaciones();
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="pagina-notificaciones">
      <div className="calendario-cabecera">
        <h1>Notificaciones</h1>
        {!!datos?.sinLeer && (
          <button className="btn btn-secundario btn-chico" onClick={() => void marcarTodas()}>
            Marcar todas como leídas
          </button>
        )}
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {!datos && !error && <div className="cargando">Cargando…</div>}
      {datos?.items.length === 0 && <div className="vacio">No tenés notificaciones.</div>}
      {datos && datos.items.length > 0 && (
        <section className="panel">
          <ListaNotificaciones items={datos.items} onAbrir={(n) => void abrir(n)} />
        </section>
      )}
      {datos && <Paginacion pagina={datos.pagina} paginas={datos.paginas} onCambiar={setPagina} />}
    </div>
  );
}
