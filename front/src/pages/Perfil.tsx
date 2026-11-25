import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Insignias, type Pagina, type Perfil, type PerfilSteam, type Resena } from '../api';
import { useSesion } from '../sesion';
import { usePreferencias } from '../preferencias';
import { FondoPerfilSteam, Retrato } from '../components/PixelArte';
import { ResenaCard } from '../components/ResenaCard';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';
import { BotonAmistad } from '../components/BotonAmistad';
import { Medalla } from '../components/Medalla';
import { horas as formatoHoras, romano } from '../formato';

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Insignias que se ven sin desplegar (los juegos con más horas). */
const INSIGNIAS_VISIBLES = 6;

/** Rango de cuenta (horas totales de Steam) con la barra hacia el siguiente. */
function RangoCuenta({ rango }: { rango: NonNullable<Insignias['rangoCuenta']> }) {
  const siguiente = rango.siguiente;
  const porcentaje = siguiente ? Math.min(100, ((rango.horas - rango.desde) / (siguiente.desde - rango.desde)) * 100) : 100;
  return (
    <div className={`rango-cuenta cuenta-${rango.id}`}>
      <span className="rango-titulo">
        <span className="rango-numero">{romano(rango.nivel)}</span> {rango.titulo}
      </span>
      <div
        className="exp-barra"
        role="progressbar"
        aria-label={siguiente ? `Horas hacia el rango ${siguiente.titulo}` : 'Rango máximo'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(porcentaje)}
      >
        <div className="exp-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="texto-suave texto-chico">
        {siguiente ? `${numero.format(Math.ceil(siguiente.desde - rango.horas))} h para ${siguiente.titulo}` : 'Rango máximo'}
      </span>
    </div>
  );
}

/** Insignias por juego: una fila con las de más horas y el resto al desplegar. */
function InsigniasJuegos({ insignias }: { insignias: Insignias['insignias'] }) {
  const [todas, setTodas] = useState(false);
  if (!insignias.length) return null;
  const visibles = todas ? insignias : insignias.slice(0, INSIGNIAS_VISIBLES);
  return (
    <div className="perfil-insignias">
      <ul>
        {visibles.map((i) => (
          <li key={i.appId}>
            <Link
              to={`/videojuegos/${i.appId}`}
              className={`insignia-juego rango-${i.rango}`}
              title={`${i.nombre} · ${romano(i.nivel)}. ${i.titulo} · ${formatoHoras(i.horas)}`}
            >
              <Medalla rango={i.rango} alto={22} />
              <span>
                <strong>{i.nombre}</strong>
                <span className="texto-chico">{i.titulo}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {insignias.length > INSIGNIAS_VISIBLES && (
        <button className="btn-link" onClick={() => setTodas((t) => !t)}>
          {todas ? 'Ver menos' : `Ver las ${insignias.length} insignias`}
        </button>
      )}
    </div>
  );
}

export default function PerfilPagina() {
  const steamId = useParams().steamId!;
  const { estado, salir } = useSesion();
  const { preferencias } = usePreferencias();
  const esPropio = estado?.usuario?.steamId === steamId;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  // undefined = cargando; null = Steam no respondió
  const [steam, setSteam] = useState<PerfilSteam | null | undefined>(undefined);
  const [clasificacion, setClasificacion] = useState<Insignias | null>(null);
  const [resenas, setResenas] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPagina(1);
    setSteam(undefined);
    setClasificacion(null);
    api.perfil(steamId).then(setPerfil).catch((e) => setError(e.message));
    // Los datos de Steam y las clasificaciones se piden aparte: no deben demorar el resto del perfil.
    api
      .perfilSteam(steamId)
      .then(setSteam)
      .catch(() => setSteam(null));
    api
      .insignias(steamId)
      .then(setClasificacion)
      .catch(() => setClasificacion(null));
  }, [steamId]);

  useEffect(() => {
    api.resenasDeUsuario(steamId, pagina).then(setResenas).catch((e) => setError(e.message));
  }, [steamId, pagina]);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!perfil) return <div className="cargando">Cargando…</div>;

  const sinDato = steam === undefined ? '…' : '—';
  // Avatar animado de Steam (GIF); con "reducir movimiento" se usa su versión fija.
  const animado = preferencias.avatarSteam ? steam?.avatarAnimado : null;
  const avatar = animado
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? (animado.fijo ?? perfil.avatarUrl)
      : animado.animado
    : perfil.avatarUrl;
  const horasTotales = steam?.horasTotales ?? clasificacion?.rangoCuenta?.horas ?? null;

  const datos: Array<[string, React.ReactNode]> = [
    ['Juegos', steam?.juegos != null ? numero.format(steam.juegos) : sinDato],
    ['Horas', horasTotales != null ? numero.format(horasTotales) : sinDato],
    ['Reseñas', perfil._count.resenas],
    ['Amigos', esPropio ? <Link to="/amigos">{perfil.cantidadAmigos}</Link> : perfil.cantidadAmigos],
  ];

  return (
    <div className="pagina-perfil">
      {preferencias.fondoSteam && steam?.fondoPerfil && (
        <FondoPerfilSteam imagen={steam.fondoPerfil.imagen} video={steam.fondoPerfil.video} />
      )}

      <section className="perfil-cabecera">
        <div className="perfil-principal">
          <Retrato
            url={avatar}
            nombre={perfil.nombreUsuario}
            marcoSteam={preferencias.marcoSteam ? steam?.marcoAvatar : null}
          />
          <div className="perfil-estado">
            <div className="perfil-nombre">
              <h1>{perfil.nombreUsuario}</h1>
              <span className="nivel-steam" title="Nivel de Steam">
                Nv.<strong>{steam?.nivel ?? sinDato}</strong>
              </span>
            </div>
            {clasificacion?.rangoCuenta && <RangoCuenta rango={clasificacion.rangoCuenta} />}
            <dl className="perfil-numeros">
              {datos.map(([nombre, valor]) => (
                <div key={nombre}>
                  <dt>{nombre}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            <BotonAmistad
              steamId={perfil.steamId}
              relacion={perfil.relacion}
              onCambio={(relacion) =>
                setPerfil({
                  ...perfil,
                  relacion,
                  cantidadAmigos: perfil.cantidadAmigos + (relacion === 'amigos' ? 1 : perfil.relacion === 'amigos' ? -1 : 0),
                })
              }
            />
            <div className="perfil-datos texto-suave texto-chico">
              {steam?.cuentaCreada && <span>En Steam desde {new Date(steam.cuentaCreada).getFullYear()}</span>}
              <a
                className="btn-link"
                href={`https://steamcommunity.com/profiles/${perfil.steamId}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver en Steam ↗
              </a>
            </div>
          </div>
        </div>

        {clasificacion && !clasificacion.bibliotecaPublica && (
          <p className="texto-suave texto-chico perfil-privado">
            {esPropio
              ? 'Tu biblioteca de Steam es privada: hacela pública para tener rango e insignias.'
              : 'Biblioteca privada: no hay rango ni insignias para mostrar.'}
          </p>
        )}
        {clasificacion && <InsigniasJuegos insignias={clasificacion.insignias} />}
      </section>

      <h2>{esPropio ? 'Mis reseñas' : 'Historial de reseñas'}</h2>
      {resenas && resenas.items.length === 0 && <div className="vacio">Este usuario todavía no publicó reseñas.</div>}
      <div className="lista-resenas">
        {resenas?.items.map((r) => (
          <ResenaCard key={r.resenaId} resena={r} mostrar="videojuego" />
        ))}
      </div>
      {resenas && <Paginacion pagina={resenas.pagina} paginas={resenas.paginas} onCambiar={setPagina} />}

      {esPropio && (
        <div className="salir-perfil">
          <Link className="btn btn-secundario" to="/configuracion">
            Configuración
          </Link>
          <button className="btn btn-peligro" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
