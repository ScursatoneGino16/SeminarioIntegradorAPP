import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Pagina, type Perfil, type Resena } from '../api';
import { Avatar } from '../components/Avatar';
import { ResenaCard } from '../components/ResenaCard';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';
import { fecha } from '../formato';

export default function PerfilPagina() {
  const steamId = useParams().steamId!;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [resenas, setResenas] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPagina(1);
    api.perfil(steamId).then(setPerfil).catch((e) => setError(e.message));
  }, [steamId]);

  useEffect(() => {
    api.resenasDeUsuario(steamId, pagina).then(setResenas).catch((e) => setError(e.message));
  }, [steamId, pagina]);

  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!perfil) return <div className="cargando">Cargando…</div>;

  return (
    <div className="pagina-perfil">
      <section className="perfil-cabecera">
        <Avatar url={perfil.avatarUrl} nombre={perfil.nombreUsuario} tam={88} />
        <div>
          <h1>{perfil.nombreUsuario}</h1>
          <p className="texto-suave texto-chico">
            SteamID {perfil.steamId} · Miembro desde {fecha(perfil.fechaAlta)}
          </p>
          <div className="perfil-datos">
            <span>
              <strong>{perfil._count.resenas}</strong> reseña{perfil._count.resenas === 1 ? '' : 's'}
            </span>
            <span className={`insignia ${perfil.bibliotecaPublica ? '' : 'insignia-gris'}`}>
              Biblioteca {perfil.bibliotecaPublica ? 'pública' : 'privada'}
            </span>
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

      <h2>Historial de reseñas</h2>
      {resenas && resenas.items.length === 0 && <div className="vacio">Este usuario todavía no publicó reseñas.</div>}
      <div className="lista-resenas">
        {resenas?.items.map((r) => (
          <ResenaCard key={r.resenaId} resena={r} mostrar="videojuego" />
        ))}
      </div>
      {resenas && <Paginacion pagina={resenas.pagina} paginas={resenas.paginas} onCambiar={setPagina} />}
    </div>
  );
}
