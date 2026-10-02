import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Pagina, type Resena, type Videojuego } from '../api';
import { Portada } from '../components/Portada';
import { Estrellas } from '../components/Estrellas';
import { ResenaCard } from '../components/ResenaCard';
import { ResenaForm } from '../components/ResenaForm';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';

export default function VideojuegoPagina() {
  const appId = Number(useParams().appId);
  const [juego, setJuego] = useState<Videojuego | null>(null);
  const [mia, setMia] = useState<Resena | null>(null);
  const [resenas, setResenas] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarJuego = useCallback(() => api.videojuego(appId).then(setJuego), [appId]);
  const cargarResenas = useCallback(() => api.resenasDeJuego(appId, pagina).then(setResenas), [appId, pagina]);

  useEffect(() => {
    setError(null);
    setPagina(1);
    Promise.all([cargarJuego(), api.miResena(appId).then(setMia)]).catch((e) => setError(e.message));
  }, [appId, cargarJuego]);

  useEffect(() => {
    cargarResenas().catch((e) => setError(e.message));
  }, [cargarResenas]);

  async function refrescarTodo() {
    await Promise.all([cargarJuego(), cargarResenas(), api.miResena(appId).then(setMia)]);
  }

  async function publicar(calificacion: number, comentario: string) {
    await api.crearResena(appId, calificacion, comentario);
    setMensaje('¡Reseña publicada! Guardamos tus horas de juego de este momento.');
    await refrescarTodo();
  }

  async function guardarEdicion(calificacion: number, comentario: string) {
    if (!mia) return;
    await api.modificarResena(mia.resenaId, calificacion, comentario);
    setEditando(false);
    setMensaje('Reseña actualizada.');
    await refrescarTodo();
  }

  async function eliminar() {
    if (!mia || !confirm('¿Eliminar tu reseña? Esta acción no se puede deshacer.')) return;
    try {
      await api.eliminarResena(mia.resenaId);
      setMensaje('Reseña eliminada.');
      await refrescarTodo();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error && !juego) return <Aviso tipo="error">{error}</Aviso>;
  if (!juego) return <div className="cargando">Cargando…</div>;

  return (
    <div className="pagina-juego">
      <Link to="/" className="volver">
        ← Catálogo
      </Link>
      <section className="juego-cabecera">
        <Portada url={juego.imagenUrl} nombre={juego.nombre} className="portada-grande" />
        <div className="juego-info">
          <h1>{juego.nombre}</h1>
          <p className="texto-suave texto-chico">AppID {juego.appId}</p>
          <div className="juego-puntaje">
            {juego.promedioCalificacion != null ? (
              <>
                <Estrellas valor={juego.promedioCalificacion} tam={22} />
                <strong>{juego.promedioCalificacion.toFixed(1)}</strong>
                <span className="texto-suave">
                  · {juego.cantidadResenas} reseña{juego.cantidadResenas === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="texto-suave">Todavía no tiene reseñas</span>
            )}
          </div>
          <p className="juego-descripcion">{juego.descripcion}</p>
          <div className="chips">
            {juego.categorias.map((c) => (
              <Link key={c.categoriaId} className="chip" to={`/?categorias=${c.categoriaId}`}>
                {c.nombre}
              </Link>
            ))}
            {juego.etiquetas.map((e) => (
              <Link key={e.etiquetaId} className="chip chip-etiqueta" to={`/?etiquetas=${e.etiquetaId}`}>
                #{e.nombre}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}

      <section className="panel">
        <h2>Tu reseña</h2>
        {mia && !editando && (
          <p className="texto-suave texto-chico">
            Ya reseñaste este juego. Podés editarla o eliminarla; las horas registradas se mantienen.
          </p>
        )}
        {mia && editando && (
          <ResenaForm
            inicial={mia}
            textoBoton="Guardar cambios"
            onEnviar={guardarEdicion}
            onCancelar={() => setEditando(false)}
          />
        )}
        {mia && !editando && (
          <div className="fila-botones fila-izq">
            <button className="btn btn-secundario" onClick={() => setEditando(true)}>
              Editar
            </button>
            <button className="btn btn-peligro" onClick={() => void eliminar()}>
              Eliminar
            </button>
          </div>
        )}
        {!mia && (
          <>
            <p className="texto-suave texto-chico">
              Solo podés reseñar juegos de tu biblioteca de Steam (debe ser pública). Al publicar guardamos tus horas de
              juego actuales.
            </p>
            <ResenaForm textoBoton="Publicar reseña" onEnviar={publicar} />
          </>
        )}
      </section>

      <section>
        <h2>Reseñas de la comunidad</h2>
        <p className="texto-suave texto-chico">Ordenadas por cantidad de “Me gusta”.</p>
        {resenas && resenas.items.length === 0 && <div className="vacio">Nadie reseñó este juego todavía. ¡Sé el primero!</div>}
        <div className="lista-resenas">
          {resenas?.items.map((r) => (
            <ResenaCard
              key={`${r.resenaId}-${r.fechaModificacion ?? ''}-${r.cantLike}`}
              resena={r}
              mostrar="usuario"
              onEditar={() => {
                setEditando(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onEliminar={() => void eliminar()}
            />
          ))}
        </div>
        {resenas && <Paginacion pagina={resenas.pagina} paginas={resenas.paginas} onCambiar={setPagina} />}
      </section>
    </div>
  );
}
