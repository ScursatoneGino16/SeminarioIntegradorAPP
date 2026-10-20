import { useEffect, useState } from 'react';
import { LinkBatalla } from '../animaciones';
import { api, type Biblioteca } from '../api';
import { Portada } from '../components/Portada';
import { Icono } from '../components/PixelArte';
import { Aviso } from '../components/Aviso';
import { fecha, horas } from '../formato';

export default function BibliotecaPagina() {
  const [bib, setBib] = useState<Biblioteca | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState('');

  function cargar() {
    setCargando(true);
    setError(null);
    api
      .biblioteca()
      .then(setBib)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }
  useEffect(cargar, []);

  const juegos = bib?.juegos.filter((j) => j.nombre.toLowerCase().includes(filtro.toLowerCase())) ?? [];

  return (
    <div className="pagina-biblioteca">
      <div className="titulo-con-accion">
        <h1>
          <Icono nombre="cofre" alto={24} /> Mi biblioteca
        </h1>
        <button className="btn btn-secundario" onClick={cargar} disabled={cargando}>
          {cargando ? 'Consultando Steam…' : 'Actualizar desde Steam'}
        </button>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {bib?.desdeCache && (
        <Aviso tipo="alerta">
          Steam no respondió a tiempo. Mostramos la última copia guardada
          {bib.actualizadoEn ? ` (${fecha(bib.actualizadoEn)})` : ''}.
        </Aviso>
      )}
      {bib && !bib.publica && (
        <Aviso tipo="alerta">
          Tu biblioteca de Steam es privada. Para ver tus juegos y publicar reseñas, configurá en Steam los{' '}
          <em>Detalles de juego</em> como públicos y volvé a actualizar.
        </Aviso>
      )}

      {bib && bib.publica && (
        <>
          <input
            type="search"
            className="input-filtro"
            placeholder="Filtrar mis juegos…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          {juegos.length === 0 ? (
            <div className="vacio">No hay juegos para mostrar.</div>
          ) : (
            <ul className="lista-biblioteca">
              {juegos.map((j) => (
                <li key={j.appId}>
                  <LinkBatalla to={`/videojuegos/${j.appId}`} className="item-biblioteca">
                    <Portada url={j.imagenUrl} nombre={j.nombre} className="portada-mini" />
                    <span className="item-nombre">{j.nombre}</span>
                    <span className="item-horas">{horas(j.horasJugadas)}</span>
                  </LinkBatalla>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
