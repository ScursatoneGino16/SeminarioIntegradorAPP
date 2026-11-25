import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Lanzamiento } from '../api';
import { useSesion } from '../sesion';
import { Portada } from '../components/Portada';
import { Aviso } from '../components/Aviso';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const fmtMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtDiaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' });

const nombreMes = (mes: string) => {
  const texto = fmtMes.format(new Date(`${mes}-01T00:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const mesActual = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

function sumarMes(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Celdas del mes empezando en lunes; null = relleno antes del día 1. */
function celdasDelMes(mes: string) {
  const [a, m] = mes.split('-').map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1));
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const relleno = (primero.getUTCDay() + 6) % 7;
  return [...Array<null>(relleno).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
}

function JuegoDelDia({ j }: { j: Lanzamiento }) {
  return (
    <Link to={`/videojuegos/${j.appId}`} className="lanzamiento" title={j.nombre}>
      <Portada url={j.imagenUrl} nombre={j.nombre} className="portada-mini" />
      <span>
        {j.nombre}
        {j.conAviso && (
          <span className="lanzamiento-aviso" title="Pediste el aviso por mail">
            {' '}
            ✉
          </span>
        )}
      </span>
    </Link>
  );
}

export default function Lanzamientos() {
  const { estado } = useSesion();
  const [params, setParams] = useSearchParams();
  const mes = /^\d{4}-\d{2}$/.test(params.get('mes') ?? '') ? params.get('mes')! : mesActual();
  const [datos, setDatos] = useState<{ juegos: Lanzamiento[]; sinFechaExacta: Lanzamiento[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    setDatos(null);
    setError(null);
    api.lanzamientos(mes).then(setDatos).catch((e) => setError(e.message));
  }, [mes]);

  async function actualizar() {
    setActualizando(true);
    setMensaje(null);
    try {
      const r = await api.actualizarLanzamientos();
      setMensaje(`Listo: ${r.proximos} próximos lanzamientos (${r.agregadosAlCatalogo} nuevos en el catálogo).`);
      setDatos(await api.lanzamientos(mes));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActualizando(false);
    }
  }

  const porDia = new Map<number, Lanzamiento[]>();
  for (const j of datos?.juegos ?? []) {
    const dia = new Date(j.fechaLanzamiento!).getUTCDate();
    porDia.set(dia, [...(porDia.get(dia) ?? []), j]);
  }
  const hoy = new Date();
  const esMesActual = mes === mesActual();
  const irA = (m: string) => setParams(m === mesActual() ? {} : { mes: m });

  return (
    <div className="pagina-lanzamientos">
      <div className="calendario-cabecera">
        <h1>Próximos lanzamientos</h1>
        {estado?.usuario?.esAdmin && (
          <button className="btn btn-secundario btn-chico" disabled={actualizando} onClick={() => void actualizar()}>
            {actualizando ? 'Consultando Steam…' : 'Actualizar desde Steam'}
          </button>
        )}
      </div>
      <p className="texto-suave">
        Entrá a un juego para ver su ficha y pedir un aviso por mail 24 h antes de que salga.
      </p>
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}

      <nav className="calendario-nav" aria-label="Cambiar de mes">
        <button className="btn btn-chico" onClick={() => irA(sumarMes(mes, -1))} aria-label="Mes anterior">
          ◀
        </button>
        <h2>{nombreMes(mes)}</h2>
        <button className="btn btn-chico" onClick={() => irA(sumarMes(mes, 1))} aria-label="Mes siguiente">
          ▶
        </button>
        {!esMesActual && (
          <button className="btn-link" onClick={() => irA(mesActual())}>
            Hoy
          </button>
        )}
      </nav>

      {!datos && !error && <div className="cargando">Cargando…</div>}
      {datos && (
        <>
          <div className="calendario" role="table" aria-label="Lanzamientos del mes">
            {DIAS.map((d) => (
              <div key={d} className="calendario-dia-semana" role="columnheader">
                {d}
              </div>
            ))}
            {celdasDelMes(mes).map((dia, i) => {
              if (dia === null) return <div key={`r${i}`} className="calendario-celda calendario-relleno" aria-hidden />;
              const juegos = porDia.get(dia) ?? [];
              const esHoy = esMesActual && dia === hoy.getDate();
              const fecha = new Date(`${mes}-${String(dia).padStart(2, '0')}T00:00:00Z`);
              return (
                <div
                  key={dia}
                  role="cell"
                  className={`calendario-celda ${esHoy ? 'calendario-hoy' : ''} ${juegos.length ? '' : 'calendario-vacia'}`}
                >
                  <span className="calendario-numero">
                    <span className="sr-only">{fmtDiaCorto.format(fecha)}</span>
                    <span className="calendario-dia" aria-hidden>
                      {dia}
                    </span>
                    <span className="calendario-nombre-dia" aria-hidden>
                      {fmtDiaCorto.format(fecha)}
                    </span>
                  </span>
                  {juegos.map((j) => (
                    <JuegoDelDia key={j.appId} j={j} />
                  ))}
                </div>
              );
            })}
          </div>
          {datos.juegos.length === 0 && <div className="vacio">No hay lanzamientos cargados para este mes.</div>}

          {datos.sinFechaExacta.length > 0 && (
            <section className="panel">
              <h2>Sin fecha exacta</h2>
              <ul className="lista-sin-fecha">
                {datos.sinFechaExacta.map((j) => (
                  <li key={j.appId}>
                    <JuegoDelDia j={j} />
                    <span className="texto-suave texto-chico">{j.fechaLanzamientoTexto ?? 'A confirmar'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
