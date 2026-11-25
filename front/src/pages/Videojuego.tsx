import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type ContenidoResena, type Pagina, type Resena, type Videojuego } from '../api';
import { Portada } from '../components/Portada';
import { Estrellas } from '../components/Estrellas';
import { ResenaCard } from '../components/ResenaCard';
import { ResenaForm } from '../components/ResenaForm';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';
import { PanelAvisoLanzamiento } from '../components/PanelAvisoLanzamiento';

export default function VideojuegoPagina() {
  const appId = Number(useParams().appId);
  const [juego, setJuego] = useState<Videojuego | null>(null);
  const [mia, setMia] = useState<Resena | null>(null);
  const [resenas, setResenas] = useState<Pagina<Resena> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [soloAmigos, setSoloAmigos] = useState(false);
  // Cuántos amigos reseñaron este juego (para el botón del filtro)
  const [deAmigos, setDeAmigos] = useState(0);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarJuego = useCallback(() => api.videojuego(appId).then(setJuego), [appId]);
  const cargarResenas = useCallback(
    () => api.resenasDeJuego(appId, pagina, soloAmigos).then(setResenas),
    [appId, pagina, soloAmigos],
  );

  useEffect(() => {
    setError(null);
    setPagina(1);
    setSoloAmigos(false);
    Promise.all([
      cargarJuego(),
      api.miResena(appId).then(setMia),
      api.resenasDeJuego(appId, 1, true).then((r) => setDeAmigos(r.total)),
    ]).catch((e) => setError(e.message));
  }, [appId, cargarJuego]);

  useEffect(() => {
    cargarResenas().catch((e) => setError(e.message));
  }, [cargarResenas]);

  async function refrescarTodo() {
    await Promise.all([cargarJuego(), cargarResenas(), api.miResena(appId).then(setMia)]);
  }

  async function publicar(contenido: ContenidoResena) {
    await api.crearResena(appId, contenido);
    setMensaje('¡Reseña publicada! Guardamos tus horas de juego de este momento.');
    await refrescarTodo();
  }

  async function guardarEdicion(contenido: ContenidoResena) {
    if (!mia) return;
    await api.modificarResena(mia.resenaId, contenido);
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
        ◀ Catálogo
      </Link>
      <section className="juego-cabecera">
        <Portada url={juego.imagenUrl} nombre={juego.nombre} className="portada-grande" />
        <div className="juego-info">
          <h1>{juego.nombre}</h1>
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
              !juego.proximamente && <span className="texto-suave">Todavía no tiene reseñas</span>
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

      {juego.proximamente ? (
        <PanelAvisoLanzamiento juego={juego} />
      ) : (
        <section className="panel">
          <h2>Tu reseña</h2>
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
          {!mia && <ResenaForm textoBoton="Publicar reseña" onEnviar={publicar} />}
        </section>
      )}

      {!juego.proximamente && (
        <section>
          <div className="calendario-cabecera">
            <h2>Reseñas de la comunidad</h2>
            {deAmigos > 0 && (
              <div className="pestanias pestanias-chicas" role="tablist" aria-label="Filtrar reseñas">
                {([false, true] as const).map((amigos) => (
                  <button
                    key={String(amigos)}
                    role="tab"
                    aria-selected={soloAmigos === amigos}
                    className={soloAmigos === amigos ? 'activa' : ''}
                    onClick={() => {
                      setSoloAmigos(amigos);
                      setPagina(1);
                    }}
                  >
                    {amigos ? `De mis amigos (${deAmigos})` : 'Todas'}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      )}
    </div>
  );
}
