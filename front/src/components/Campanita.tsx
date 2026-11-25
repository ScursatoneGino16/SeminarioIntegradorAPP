import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Notificacion } from '../api';
import { avisarCambioNotificaciones, describir, EVENTO_NOTIFICACIONES, hace } from '../notificaciones';
import { Avatar } from './Avatar';
import { Campana } from './PixelArte';

const INTERVALO_MS = 30_000;
/**
 * RNF 3: la sesión se renueva con cada request, así que consultar sin parar haría que no venza
 * nunca. Solo se consulta si hubo actividad del usuario en el último minuto.
 */
const ACTIVIDAD_MS = 60_000;

/** Campanita del encabezado: contador de notificaciones sin leer y panel con las últimas. */
export function Campanita() {
  const [sinLeer, setSinLeer] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const ultimaActividad = useRef(Date.now());
  const contenedor = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();

  const actualizarContador = useCallback(() => {
    api
      .notificacionesSinLeer()
      .then((r) => setSinLeer(r.sinLeer))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    actualizarContador();
    let pausada = false;
    const alActuar = () => {
      ultimaActividad.current = Date.now();
      // Si el polling estaba pausado por inactividad, se pone al día enseguida
      if (pausada) {
        pausada = false;
        actualizarContador();
      }
    };
    const eventos = ['pointerdown', 'keydown', 'scroll', 'mousemove'] as const;
    for (const e of eventos) window.addEventListener(e, alActuar, { passive: true });
    const intervalo = setInterval(() => {
      const activo = document.visibilityState === 'visible' && Date.now() - ultimaActividad.current < ACTIVIDAD_MS;
      if (activo) actualizarContador();
      else pausada = true;
    }, INTERVALO_MS);
    window.addEventListener(EVENTO_NOTIFICACIONES, actualizarContador);
    return () => {
      for (const e of eventos) window.removeEventListener(e, alActuar);
      window.removeEventListener(EVENTO_NOTIFICACIONES, actualizarContador);
      clearInterval(intervalo);
    };
  }, [actualizarContador]);

  // Al abrir el panel se traen las últimas; se cierra con Escape o con un clic afuera.
  useEffect(() => {
    if (!abierta) return;
    api
      .notificaciones(1, 8)
      .then((r) => {
        setItems(r.items);
        setSinLeer(r.sinLeer);
      })
      .catch(() => setItems([]));
    const cerrarAfuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierta(false);
    };
    const cerrarEscape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('pointerdown', cerrarAfuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarAfuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [abierta]);

  async function abrir(n: Notificacion) {
    setAbierta(false);
    if (!n.leida) {
      await api.marcarNotificacion(n.notificacionId).catch(() => undefined);
      avisarCambioNotificaciones();
    }
    navegar(describir(n).enlace);
  }

  async function marcarTodas() {
    await api.marcarTodasNotificaciones().catch(() => undefined);
    setItems((lista) => lista?.map((n) => ({ ...n, leida: true })) ?? null);
    setSinLeer(0);
    avisarCambioNotificaciones();
  }

  return (
    <div className="campanita" ref={contenedor}>
      <button
        className={`campanita-boton ${sinLeer > 0 ? 'con-avisos' : ''}`}
        aria-label={sinLeer ? `Notificaciones: ${sinLeer} sin leer` : 'Notificaciones'}
        aria-expanded={abierta}
        aria-haspopup="true"
        onClick={() => setAbierta((a) => !a)}
      >
        <span className="campanita-icono">
          <Campana alto={24} />
        </span>
        {sinLeer > 0 && <span className="campanita-contador">{sinLeer > 99 ? '99+' : sinLeer}</span>}
      </button>
      {abierta && (
        <div className="campanita-panel ventana" role="dialog" aria-label="Notificaciones">
          <div className="campanita-cabecera">
            <strong>Notificaciones</strong>
            {sinLeer > 0 && (
              <button className="btn-link" onClick={() => void marcarTodas()}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          {items === null && <p className="texto-suave">Cargando…</p>}
          {items?.length === 0 && <p className="texto-suave">No tenés notificaciones.</p>}
          {items && items.length > 0 && <ListaNotificaciones items={items} onAbrir={(n) => void abrir(n)} />}
          <Link className="btn-link campanita-todas" to="/notificaciones" onClick={() => setAbierta(false)}>
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}

export function ListaNotificaciones({ items, onAbrir }: { items: Notificacion[]; onAbrir: (n: Notificacion) => void }) {
  return (
    <ul className="lista-notificaciones">
      {items.map((n) => (
        <li key={n.notificacionId}>
          <button className={`notificacion ${n.leida ? '' : 'notificacion-nueva'}`} onClick={() => onAbrir(n)}>
            {n.actores[0] ? (
              <Avatar url={n.actores[0].avatarUrl} nombre={n.actores[0].nombreUsuario} tam={32} />
            ) : (
              <span className="notificacion-icono" aria-hidden>
                <Campana alto={24} />
              </span>
            )}
            <span>
              {describir(n).texto}
              <span className="texto-suave texto-chico notificacion-fecha">{hace(n.fechaCreacion)}</span>
            </span>
            {!n.leida && <span className="sr-only">(sin leer)</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
