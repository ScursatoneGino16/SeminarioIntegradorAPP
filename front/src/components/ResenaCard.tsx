import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ErrorApi, type Resena } from '../api';
import { fecha, horas } from '../formato';
import { Avatar } from './Avatar';
import { Estrellas } from './Estrellas';
import { Portada } from './Portada';

interface Props {
  resena: Resena;
  /** Qué se muestra como "autor" de la tarjeta: el usuario (página del juego) o el juego (perfil). */
  mostrar: 'usuario' | 'videojuego';
  onEditar?: () => void;
  onEliminar?: () => void;
}

export function ResenaCard({ resena, mostrar, onEditar, onEliminar }: Props) {
  const [r, setR] = useState(resena);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function valorar(esLike: boolean) {
    setError(null);
    setOcupado(true);
    try {
      const nuevo = r.miValoracion === esLike ? null : esLike;
      const res = await api.valorar(r.resenaId, nuevo);
      setR({ ...r, ...res });
    } catch (e) {
      setError((e as ErrorApi).message);
    } finally {
      setOcupado(false);
    }
  }


  return (
    <article className={`resena ${r.esPropia ? 'resena-propia' : ''}`}>
      <header className="resena-cabecera">
        {mostrar === 'usuario' ? (
          <Link to={`/usuarios/${r.usuario.steamId}`} className="resena-autor">
            <Avatar url={r.usuario.avatarUrl} nombre={r.usuario.nombreUsuario} tam={40} />
            <span>
              <strong>{r.usuario.nombreUsuario}</strong>
              {r.esPropia && <span className="insignia">Tu reseña</span>}
            </span>
          </Link>
        ) : (
          <Link to={`/videojuegos/${r.videojuego.appId}`} className="resena-autor">
            <Portada url={r.videojuego.imagenUrl} nombre={r.videojuego.nombre} className="portada-mini" />
            <strong>{r.videojuego.nombre}</strong>
          </Link>
        )}
        <div className="resena-meta">
          <Estrellas valor={r.calificacion} />
          <span className="horas" title="Horas jugadas al momento de publicar">
            ⏱ {horas(r.horasAlComentar)} al reseñar
          </span>
        </div>
      </header>

      <p className="resena-texto">{r.comentario}</p>

      <footer className="resena-pie">
        <div className="resena-acciones">
          <button
            className={`btn-valorar ${r.miValoracion === true ? 'activo' : ''}`}
            disabled={r.esPropia || ocupado}
            title={r.esPropia ? 'No podés valorar tu propia reseña' : 'Me gusta'}
            aria-pressed={r.miValoracion === true}
            onClick={() => void valorar(true)}
          >
            👍 <span>{r.cantLike}</span>
          </button>
          <button
            className={`btn-valorar ${r.miValoracion === false ? 'activo activo-neg' : ''}`}
            disabled={r.esPropia || ocupado}
            title={r.esPropia ? 'No podés valorar tu propia reseña' : 'No me gusta'}
            aria-pressed={r.miValoracion === false}
            onClick={() => void valorar(false)}
          >
            👎 <span>{r.cantDislike}</span>
          </button>
        </div>

        <div className="resena-fecha">
          {fecha(r.fechaCreacion)}
          {r.fechaModificacion && <span title={`Editada el ${fecha(r.fechaModificacion)}`}> · editada</span>}
          {r.esPropia && onEditar && (
            <>
              <button className="btn-link" onClick={onEditar}>
                Editar
              </button>
              <button className="btn-link btn-link-peligro" onClick={onEliminar}>
                Eliminar
              </button>
            </>
          )}
        </div>
      </footer>
      {error && <p className="error-chico">{error}</p>}
    </article>
  );
}
