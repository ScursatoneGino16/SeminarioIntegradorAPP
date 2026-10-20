import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Pagina, type Perfil, type PerfilSteam, type Resena } from '../api';
import { useSesion } from '../sesion';
import { usePreferencias } from '../preferencias';
import { FondoPerfilSteam, Retrato } from '../components/PixelArte';
import { ResenaCard } from '../components/ResenaCard';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';
import { fecha } from '../formato';

const numero = new Intl.NumberFormat('es-AR');

/** "8 años", "1 año", "5 meses": tiempo transcurrido desde una fecha. */
function antiguedad(iso: string) {
  const desde = new Date(iso);
  const hoy = new Date();
  let meses = (hoy.getFullYear() - desde.getFullYear()) * 12 + hoy.getMonth() - desde.getMonth();
  if (hoy.getDate() < desde.getDate()) meses -= 1;
  if (meses >= 12) {
    const anios = Math.floor(meses / 12);
    return `${anios} año${anios === 1 ? '' : 's'}`;
  }
  return `${Math.max(meses, 0)} mes${meses === 1 ? '' : 'es'}`;
}

/** Barra de experiencia hacia el próximo nivel de Steam, como en las pantallas de estado de un RPG. */
function BarraExp({ nivel, exp }: { nivel: number; exp: NonNullable<PerfilSteam['experiencia']> }) {
  const ganada = exp.actual - exp.inicioNivel;
  const total = ganada + exp.faltante;
  const porcentaje = total > 0 ? Math.min(100, (ganada / total) * 100) : 100;
  return (
    <div className="exp">
      <div className="exp-encabezado">
        <span>EXP</span>
        <span>{numero.format(exp.actual)}</span>
      </div>
      <div
        className="exp-barra"
        role="progressbar"
        aria-label={`Experiencia hacia el nivel ${nivel + 1}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ganada}
      >
        <div className="exp-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <div className="exp-pie">
        <span>
          {numero.format(ganada)} / {numero.format(total)}
        </span>
        <span>
          Faltan {numero.format(exp.faltante)} para Nv. {nivel + 1}
        </span>
      </div>
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
  const [resenas, setResenas] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPagina(1);
    setSteam(undefined);
    api.perfil(steamId).then(setPerfil).catch((e) => setError(e.message));
    // Los datos de Steam se piden aparte: no deben demorar el resto del perfil.
    api
      .perfilSteam(steamId)
      .then(setSteam)
      .catch(() => setSteam(null));
  }, [steamId]);

  useEffect(() => {
    api.resenasDeUsuario(steamId, pagina).then(setResenas).catch((e) => setError(e.message));
  }, [steamId, pagina]);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!perfil) return <div className="cargando">Cargando…</div>;

  const sinDato = steam === undefined ? '…' : '??';
  // Avatar animado de Steam (GIF); con "reducir movimiento" se usa su versión fija.
  const animado = preferencias.avatarSteam ? steam?.avatarAnimado : null;
  const avatar = animado
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? (animado.fijo ?? perfil.avatarUrl)
      : animado.animado
    : perfil.avatarUrl;

  return (
    <div className="pagina-perfil">
      {preferencias.fondoSteam && steam?.fondoPerfil && (
        <FondoPerfilSteam imagen={steam.fondoPerfil.imagen} video={steam.fondoPerfil.video} />
      )}

      <section className="perfil-cabecera">
        <Retrato
          url={avatar}
          nombre={perfil.nombreUsuario}
          marcoSteam={preferencias.marcoSteam ? steam?.marcoAvatar : null}
        />
        <div className="perfil-estado">
          <h1>{perfil.nombreUsuario}</h1>
          <span className="nivel-steam" title="Nivel de Steam">
            Nv.<strong>{steam?.nivel ?? sinDato}</strong>
          </span>
          {steam?.nivel != null && steam.experiencia && <BarraExp nivel={steam.nivel} exp={steam.experiencia} />}
          <dl className="estado-personaje">
            <dt>Aventurero desde</dt>
            <dd>
              {steam?.cuentaCreada ? (
                <>
                  {fecha(steam.cuentaCreada)} <span className="texto-suave">({antiguedad(steam.cuentaCreada)})</span>
                </>
              ) : (
                sinDato
              )}
            </dd>
            <dt>Juegos</dt>
            <dd>{steam?.juegos != null ? numero.format(steam.juegos) : sinDato}</dd>
            <dt>Horas totales</dt>
            <dd>{steam?.horasTotales != null ? `${numero.format(steam.horasTotales)} h` : sinDato}</dd>
            <dt>Reseñas</dt>
            <dd>{perfil._count.resenas}</dd>
            {!esPropio && (
              <>
                <dt>SteamID</dt>
                <dd>{perfil.steamId}</dd>
                <dt>En la página desde</dt>
                <dd>{fecha(perfil.fechaAlta)}</dd>
              </>
            )}
          </dl>
          <div className="perfil-datos">
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
