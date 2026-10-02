import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Categoria, type Etiqueta, type Pagina, type Videojuego } from '../api';
import { Portada } from '../components/Portada';
import { Paginacion } from '../components/Paginacion';
import { Aviso } from '../components/Aviso';
import { horas } from '../formato';

const ids = (s: string | null) => (s ? s.split(',').map(Number).filter(Boolean) : []);

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cats = useMemo(() => ids(params.get('categorias')), [params]);
  const etqs = useMemo(() => ids(params.get('etiquetas')), [params]);
  const orden = params.get('orden') ?? 'relevancia';
  const pagina = Number(params.get('pagina') ?? 1);

  const [busqueda, setBusqueda] = useState(q);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [verEtiquetas, setVerEtiquetas] = useState(false);
  const [buscarEtiqueta, setBuscarEtiqueta] = useState('');
  const [datos, setDatos] = useState<Pagina<Videojuego> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function actualizar(cambios: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!('pagina' in cambios)) p.delete('pagina');
    setParams(p);
  }

  useEffect(() => {
    void Promise.all([api.categorias(), api.etiquetas()]).then(([c, e]) => {
      setCategorias(c);
      setEtiquetas(e);
    });
  }, []);

  // Búsqueda con pequeña espera mientras se escribe
  useEffect(() => {
    if (busqueda === q) return;
    const t = setTimeout(() => actualizar({ q: busqueda || null }), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true;
    setError(null);
    api
      .catalogo({ q, categorias: cats, etiquetas: etqs, orden, pagina, tamanio: 24 })
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [q, cats, etqs, orden, pagina]);

  const alternar = (lista: number[], id: number) =>
    (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]).join(',') || null;

  const hayFiltros = q || cats.length || etqs.length;

  // Hay cientos de etiquetas: se muestran las elegidas y, al desplegar, las más usadas o las que coinciden con la búsqueda.
  const MAX_ETIQUETAS_VISIBLES = 40;
  const textoEtiqueta = buscarEtiqueta.trim().toLowerCase();
  const etiquetasVisibles = [
    ...etiquetas.filter((e) => etqs.includes(e.etiquetaId)),
    ...(verEtiquetas
      ? etiquetas
          .filter((e) => !etqs.includes(e.etiquetaId) && e.nombre.toLowerCase().includes(textoEtiqueta))
          .sort((a, b) => (b._count?.videojuegos ?? 0) - (a._count?.videojuegos ?? 0))
          .slice(0, MAX_ETIQUETAS_VISIBLES)
      : []),
  ];

  return (
    <div className="catalogo">
      <section className="catalogo-cabecera">
        <div>
          <h1>Catálogo</h1>
          {orden === 'relevancia' && (
            <p className="texto-suave texto-chico sin-margen">
              Primero tus juegos de Steam, después los más reseñados y los más votados.
            </p>
          )}
        </div>
        <div className="barra-busqueda">
          <input
            type="search"
            placeholder="Buscar por nombre o AppID…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar videojuego"
          />
          <select value={orden} onChange={(e) => actualizar({ orden: e.target.value })} aria-label="Ordenar por">
            <option value="relevancia">Recomendado</option>
            <option value="votos">Más votados en Steam</option>
            <option value="resenas">Más reseñados</option>
            <option value="nombre">Nombre (A-Z)</option>
            <option value="appId">AppID</option>
          </select>
        </div>
      </section>

      <section className="filtros" aria-label="Filtros">
        <div className="grupo-filtro">
          <span className="filtro-titulo">Categorías</span>
          <div className="chips">
            {categorias.map((c) => (
              <button
                key={c.categoriaId}
                className={`chip ${cats.includes(c.categoriaId) ? 'chip-activo' : ''}`}
                aria-pressed={cats.includes(c.categoriaId)}
                onClick={() => actualizar({ categorias: alternar(cats, c.categoriaId) })}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="grupo-filtro">
          <span className="filtro-titulo">
            Etiquetas
            <button className="btn-link" onClick={() => setVerEtiquetas((v) => !v)}>
              {verEtiquetas ? 'ocultar' : `ver (${etiquetas.length})`}
            </button>
          </span>
          <div className="chips-con-busqueda">
            {verEtiquetas && (
              <input
                type="search"
                className="input-chico"
                placeholder="Buscar etiqueta…"
                value={buscarEtiqueta}
                onChange={(e) => setBuscarEtiqueta(e.target.value)}
                aria-label="Buscar etiqueta"
              />
            )}
            <div className="chips">
              {etiquetasVisibles.map((e) => (
                <button
                  key={e.etiquetaId}
                  className={`chip chip-etiqueta ${etqs.includes(e.etiquetaId) ? 'chip-activo' : ''}`}
                  aria-pressed={etqs.includes(e.etiquetaId)}
                  onClick={() => actualizar({ etiquetas: alternar(etqs, e.etiquetaId) })}
                >
                  #{e.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
        {hayFiltros ? (
          <button
            className="btn-link"
            onClick={() => {
              setBusqueda('');
              setParams(new URLSearchParams(orden !== 'relevancia' ? { orden } : {}));
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </section>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {datos && (
        <>
          <p className="texto-suave texto-chico">
            {datos.total} videojuego{datos.total === 1 ? '' : 's'}
          </p>
          {datos.items.length === 0 ? (
            <div className="vacio">No hay videojuegos que coincidan con la búsqueda.</div>
          ) : (
            <div className="grilla-juegos">
              {datos.items.map((v) => (
                <Link key={v.appId} to={`/videojuegos/${v.appId}`} className="tarjeta-juego">
                  <div className="tarjeta-portada">
                    <Portada url={v.imagenUrl} nombre={v.nombre} />
                    {v.enBiblioteca && (
                      <span className="insignia-biblioteca" title="Está en tu biblioteca de Steam">
                        En tu biblioteca{v.horasJugadas ? ` · ${horas(v.horasJugadas)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="tarjeta-cuerpo">
                    <h3>{v.nombre}</h3>
                    <p className="texto-chico texto-suave">{v.categorias.map((c) => c.nombre).join(' · ')}</p>
                    <span className="texto-chico">
                      {v.cantidadResenas} reseña{v.cantidadResenas === 1 ? '' : 's'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Paginacion pagina={datos.pagina} paginas={datos.paginas} onCambiar={(p) => actualizar({ pagina: String(p) })} />
        </>
      )}
    </div>
  );
}
