import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ErrorApi, type Resena } from '../api';
import { fecha, horas } from '../formato';
import { Avatar } from './Avatar';
import { Estrellas } from './Estrellas';
import { Portada } from './Portada';
import { ManitoDislike, ManitoLike } from './PixelArte';
import { Destello, NumeroFlotante, useEfectos, type Flotante } from '../animaciones';
import { InsigniaResena } from './Medalla';
import { AdjuntosResena } from './Adjuntos';

interface Props {
  resena: Resena;
  /** Qué se muestra como "autor" de la tarjeta: el usuario (página del juego) o el juego (perfil). */
  mostrar: 'usuario' | 'videojuego';
  /** Con `mostrar="usuario"`, agrega el nombre del juego (actividad de amigos). */
  conJuego?: boolean;
  onEditar?: () => void;
  onEliminar?: () => void;
}

export function ResenaCard({ resena, mostrar, conJuego, onEditar, onEliminar }: Props) {
  const [r, setR] = useState(resena);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Efectos de un solo uso por botón: números flotantes y destello al dar like
  const numerosLike = useEfectos<Omit<Flotante, 'id'>>();
  const numerosDislike = useEfectos<Omit<Flotante, 'id'>>();
  const destellos = useEfectos<object>();

  const firmar = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  async function valorar(esLike: boolean) {
    setError(null);
    setOcupado(true);
    try {
      const nuevo = r.miValoracion === esLike ? null : esLike;
      const res = await api.valorar(r.resenaId, nuevo);
      const dLike = res.cantLike - r.cantLike;
      const dDislike = res.cantDislike - r.cantDislike;
      if (dLike) numerosLike.agregar({ texto: firmar(dLike), tipo: dLike > 0 ? 'bueno' : 'malo' });
      if (dDislike) numerosDislike.agregar({ texto: firmar(dDislike), tipo: 'malo' });
      if (dLike > 0) destellos.agregar({});
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
              {r.insignia && <InsigniaResena insignia={r.insignia} />}
            </span>
          </Link>
        ) : (
          <Link to={`/videojuegos/${r.videojuego.appId}`} className="resena-autor">
            <Portada url={r.videojuego.imagenUrl} nombre={r.videojuego.nombre} className="portada-mini" />
            <span>
              <strong>{r.videojuego.nombre}</strong>
              {r.insignia && <InsigniaResena insignia={r.insignia} />}
            </span>
          </Link>
        )}
        {conJuego && mostrar === 'usuario' && (
          <Link to={`/videojuegos/${r.videojuego.appId}`} className="resena-juego">
            <Portada url={r.videojuego.imagenUrl} nombre={r.videojuego.nombre} className="portada-mini" />
            <span>{r.videojuego.nombre}</span>
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
      <AdjuntosResena adjuntos={r.adjuntos} />

      <footer className="resena-pie">
        <div className="resena-acciones">
          <button
            className={`btn-valorar ${r.miValoracion === true ? 'activo' : ''}`}
            disabled={r.esPropia || ocupado}
            title={r.esPropia ? 'No podés valorar tu propia reseña' : 'Me gusta'}
            aria-pressed={r.miValoracion === true}
            onClick={() => void valorar(true)}
          >
            <ManitoLike /> <span>{r.cantLike}</span>
            {destellos.efectos.map((d) => (
              <Destello key={d.id} onFin={() => destellos.quitar(d.id)} />
            ))}
            {numerosLike.efectos.map((n) => (
              <NumeroFlotante key={n.id} texto={n.texto} tipo={n.tipo} onFin={() => numerosLike.quitar(n.id)} />
            ))}
          </button>
          <button
            className={`btn-valorar ${r.miValoracion === false ? 'activo activo-neg' : ''}`}
            disabled={r.esPropia || ocupado}
            title={r.esPropia ? 'No podés valorar tu propia reseña' : 'No me gusta'}
            aria-pressed={r.miValoracion === false}
            onClick={() => void valorar(false)}
          >
            <ManitoDislike /> <span>{r.cantDislike}</span>
            {numerosDislike.efectos.map((n) => (
              <NumeroFlotante key={n.id} texto={n.texto} tipo={n.tipo} onFin={() => numerosDislike.quitar(n.id)} />
            ))}
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
