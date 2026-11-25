import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Pagina, type Resena, type UsuarioPublico } from '../api';
import { avisarCambioNotificaciones } from '../notificaciones';
import { Avatar } from '../components/Avatar';
import { Aviso } from '../components/Aviso';
import { Icono } from '../components/PixelArte';
import { ResenaCard } from '../components/ResenaCard';
import { Paginacion } from '../components/Paginacion';
import { fecha } from '../formato';

const PESTANIAS = [
  ['amigos', 'Amigos'],
  ['solicitudes', 'Solicitudes'],
  ['sugerencias', 'Sugerencias'],
  ['actividad', 'Actividad'],
] as const;
type Pestania = (typeof PESTANIAS)[number][0];

function FilaUsuario({ u, detalle, children }: { u: UsuarioPublico; detalle?: ReactNode; children?: ReactNode }) {
  return (
    <li className="fila-usuario">
      <Link to={`/usuarios/${u.steamId}`} className="resena-autor">
        <Avatar url={u.avatarUrl} nombre={u.nombreUsuario} tam={40} />
        <span>
          <strong>{u.nombreUsuario}</strong>
          {detalle && <span className="texto-suave texto-chico fila-usuario-detalle">{detalle}</span>}
        </span>
      </Link>
      <div className="fila-usuario-acciones">{children}</div>
    </li>
  );
}

export default function Amigos() {
  const [params, setParams] = useSearchParams();
  const pestania: Pestania = PESTANIAS.some(([id]) => id === params.get('pestania'))
    ? (params.get('pestania') as Pestania)
    : 'amigos';
  const [recibidas, setRecibidas] = useState(0);

  const contarRecibidas = useCallback(() => {
    api
      .solicitudes()
      .then((s) => setRecibidas(s.recibidas.length))
      .catch(() => undefined);
  }, []);
  useEffect(contarRecibidas, [contarRecibidas]);

  return (
    <div className="pagina-amigos">
      <h1>
        <Icono nombre="amigos" alto={22} /> Amigos
      </h1>
      <div className="pestanias" role="tablist">
        {PESTANIAS.map(([id, texto]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pestania === id}
            className={pestania === id ? 'activa' : ''}
            onClick={() => setParams(id === 'amigos' ? {} : { pestania: id })}
          >
            {texto}
            {id === 'solicitudes' && recibidas > 0 && <span className="campanita-contador en-linea">{recibidas}</span>}
          </button>
        ))}
      </div>
      {pestania === 'amigos' && <ListaAmigos />}
      {pestania === 'solicitudes' && <Solicitudes onCambio={contarRecibidas} />}
      {pestania === 'sugerencias' && <Sugerencias />}
      {pestania === 'actividad' && <Actividad />}
    </div>
  );
}

/** Ejecuta una acción sobre un usuario y recarga la lista; los errores se muestran arriba. */
function useAcciones(recargar: () => Promise<unknown>) {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  async function hacer(steamId: string, accion: () => Promise<unknown>) {
    setError(null);
    setOcupado(steamId);
    try {
      await accion();
      await recargar();
      avisarCambioNotificaciones();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }
  return { error, setError, ocupado, hacer };
}

function ListaAmigos() {
  const [amigos, setAmigos] = useState<Array<UsuarioPublico & { amigosDesde: string }> | null>(null);
  const cargar = useCallback(() => api.amigos().then(setAmigos), []);
  const { error, setError, ocupado, hacer } = useAcciones(cargar);
  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar, setError]);

  if (!amigos) return error ? <Aviso tipo="error">{error}</Aviso> : <div className="cargando">Cargando…</div>;
  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {amigos.length === 0 ? (
        <div className="vacio">
          Todavía no tenés amigos. Mirá las <Link to="/amigos?pestania=sugerencias">sugerencias</Link> o agregá a alguien desde su perfil.
        </div>
      ) : (
        <ul className="panel lista-usuarios">
          {amigos.map((u) => (
            <FilaUsuario key={u.steamId} u={u} detalle={`Amigos desde el ${fecha(u.amigosDesde)}`}>
              <button
                className="btn-link btn-link-peligro"
                disabled={ocupado === u.steamId}
                onClick={() => confirm(`¿Eliminar a ${u.nombreUsuario} de tus amigos?`) && void hacer(u.steamId, () => api.quitarAmigo(u.steamId))}
              >
                Eliminar
              </button>
            </FilaUsuario>
          ))}
        </ul>
      )}
    </>
  );
}

function Solicitudes({ onCambio }: { onCambio: () => void }) {
  const [datos, setDatos] = useState<Awaited<ReturnType<typeof api.solicitudes>> | null>(null);
  const cargar = useCallback(
    () =>
      api.solicitudes().then((s) => {
        setDatos(s);
        onCambio();
      }),
    [onCambio],
  );
  const { error, setError, ocupado, hacer } = useAcciones(cargar);
  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar, setError]);

  if (!datos) return error ? <Aviso tipo="error">{error}</Aviso> : <div className="cargando">Cargando…</div>;
  return (
    <>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <h2>Recibidas</h2>
      {datos.recibidas.length === 0 ? (
        <div className="vacio">No tenés solicitudes pendientes.</div>
      ) : (
        <ul className="panel lista-usuarios">
          {datos.recibidas.map((u) => (
            <FilaUsuario key={u.steamId} u={u} detalle={`Te la mandó el ${fecha(u.fecha)}`}>
              <button
                className="btn btn-primario btn-chico"
                disabled={ocupado === u.steamId}
                onClick={() => void hacer(u.steamId, () => api.aceptarAmigo(u.steamId))}
              >
                Aceptar
              </button>
              <button
                className="btn btn-fantasma btn-chico"
                disabled={ocupado === u.steamId}
                onClick={() => void hacer(u.steamId, () => api.quitarAmigo(u.steamId))}
              >
                Rechazar
              </button>
            </FilaUsuario>
          ))}
        </ul>
      )}
      <h2>Enviadas</h2>
      {datos.enviadas.length === 0 ? (
        <div className="vacio">No enviaste solicitudes pendientes.</div>
      ) : (
        <ul className="panel lista-usuarios">
          {datos.enviadas.map((u) => (
            <FilaUsuario key={u.steamId} u={u} detalle={`Enviada el ${fecha(u.fecha)}`}>
              <button
                className="btn-link"
                disabled={ocupado === u.steamId}
                onClick={() => void hacer(u.steamId, () => api.quitarAmigo(u.steamId))}
              >
                Cancelar
              </button>
            </FilaUsuario>
          ))}
        </ul>
      )}
    </>
  );
}

function Sugerencias() {
  const [datos, setDatos] = useState<Awaited<ReturnType<typeof api.sugerencias>> | null>(null);
  const [enviadas, setEnviadas] = useState<Set<string>>(new Set());
  const cargar = useCallback(() => api.sugerencias().then(setDatos), []);
  const { error, setError, ocupado, hacer } = useAcciones(async () => undefined);
  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar, setError]);

  if (!datos) return error ? <Aviso tipo="error">{error}</Aviso> : <div className="cargando">Cargando…</div>;
  return (
    <>
      <p className="texto-suave">Tus amigos de Steam que ya usan SteamVault.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {!datos.steamDisponible && <Aviso tipo="alerta">Steam no respondió: no pudimos leer tu lista de amigos. Probá más tarde.</Aviso>}
      {datos.listaPublica === false && (
        <Aviso tipo="alerta">Tu lista de amigos de Steam es privada. Hacela pública en Steam para ver sugerencias.</Aviso>
      )}
      {datos.steamDisponible && datos.listaPublica && datos.usuarios.length === 0 && (
        <div className="vacio">Ninguno de tus amigos de Steam usa SteamVault todavía (o ya los agregaste a todos).</div>
      )}
      {datos.usuarios.length > 0 && (
        <ul className="panel lista-usuarios">
          {datos.usuarios.map((u) => (
            <FilaUsuario key={u.steamId} u={u} detalle="Amigo en Steam">
              {enviadas.has(u.steamId) ? (
                <span className="texto-suave">Solicitud enviada</span>
              ) : (
                <button
                  className="btn btn-primario btn-chico"
                  disabled={ocupado === u.steamId}
                  onClick={() =>
                    void hacer(u.steamId, async () => {
                      await api.agregarAmigo(u.steamId);
                      setEnviadas((s) => new Set(s).add(u.steamId));
                    })
                  }
                >
                  + Agregar
                </button>
              )}
            </FilaUsuario>
          ))}
        </ul>
      )}
    </>
  );
}

/** Últimas reseñas de los amigos. */
function Actividad() {
  const [datos, setDatos] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.actividadAmigos(pagina).then(setDatos).catch((e) => setError(e.message));
  }, [pagina]);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!datos) return <div className="cargando">Cargando…</div>;
  return (
    <>
      {datos.items.length === 0 && <div className="vacio">Tus amigos todavía no publicaron reseñas.</div>}
      <div className="lista-resenas">
        {datos.items.map((r) => (
          <ResenaCard key={r.resenaId} resena={r} mostrar="usuario" conJuego />
        ))}
      </div>
      <Paginacion pagina={datos.pagina} paginas={datos.paginas} onCambiar={setPagina} />
    </>
  );
}
