import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LinkBatalla } from '../animaciones';
import { api, type Categoria, type Etiqueta, type Pagina, type Videojuego } from '../api';
import { Portada } from '../components/Portada';
import { Icono, Mano } from '../components/PixelArte';
import { Aviso } from '../components/Aviso';
import { horas } from '../formato';
import { Chip8bit } from '@/components/Chip8bit';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select';

const ids = (s: string | null) => (s ? s.split(',').map(Number).filter(Boolean) : []);

const ORDENES = [
  ['relevancia', 'Recomendado'],
  ['votos', 'Más votados'],
  ['resenas', 'Más reseñados'],
  ['nombre', 'Nombre A-Z'],
  ['appId', 'AppID'],
] as const;

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
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="m-0">
            <Icono nombre="espada" alto={24} /> Catálogo
          </h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-5 px-1.5 sm:w-auto">
          <Input
            type="search"
            placeholder="Nombre o AppID…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar videojuego"
            className="h-10 min-w-40 flex-1 text-base sm:w-72 sm:flex-none"
          />
          <Select value={orden} onValueChange={(v) => actualizar({ orden: v })}>
            <SelectTrigger aria-label="Ordenar por" className="h-10 w-full text-base sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDENES.map(([valor, texto]) => (
                <SelectItem key={valor} value={valor} className="retro text-base">
                  {texto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section aria-label="Filtros" className="ventana flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-3">
          <span className="retro text-base text-accent">Categorías</span>
          <div className="flex flex-wrap gap-3">
            {categorias.map((c) => (
              <Chip8bit
                key={c.categoriaId}
                activo={cats.includes(c.categoriaId)}
                onClick={() => actualizar({ categorias: alternar(cats, c.categoriaId) })}
              >
                {c.nombre}
              </Chip8bit>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="retro flex items-center gap-2 text-base text-accent">
            Etiquetas
            <button
              type="button"
              className="retro cursor-pointer text-base text-primary hover:text-foreground"
              onClick={() => setVerEtiquetas((v) => !v)}
            >
              {verEtiquetas ? '[ocultar]' : `[ver ${etiquetas.length}]`}
            </button>
          </span>
          {verEtiquetas && (
            <input
              type="search"
              className="max-w-64 py-1.5"
              placeholder="Buscar etiqueta…"
              value={buscarEtiqueta}
              onChange={(e) => setBuscarEtiqueta(e.target.value)}
              aria-label="Buscar etiqueta"
            />
          )}
          {etiquetasVisibles.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {etiquetasVisibles.map((e) => (
                <Chip8bit
                  key={e.etiquetaId}
                  activo={etqs.includes(e.etiquetaId)}
                  onClick={() => actualizar({ etiquetas: alternar(etqs, e.etiquetaId) })}
                >
                  #{e.nombre}
                </Chip8bit>
              ))}
            </div>
          )}
        </div>
        {hayFiltros ? (
          <button
            type="button"
            className="retro w-fit cursor-pointer text-base text-destructive hover:underline"
            onClick={() => {
              setBusqueda('');
              setParams(new URLSearchParams(orden !== 'relevancia' ? { orden } : {}));
            }}
          >
            ✕ Limpiar filtros
          </button>
        ) : null}
      </section>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {datos && (
        <>
          <p className="retro m-0 text-base text-muted-foreground">
            {datos.total.toLocaleString('es-AR')} videojuego{datos.total === 1 ? '' : 's'}
          </p>
          {datos.items.length === 0 ? (
            <div className="vacio">
              <span className="font-titulo text-4xl text-destructive">Game Over</span>
              <br />
              No hay videojuegos que coincidan.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-x-6 gap-y-8 px-1.5">
              {datos.items.map((v) => (
                <LinkBatalla
                  key={v.appId}
                  to={`/videojuegos/${v.appId}`}
                  className="tarjeta-juego group flex transition-transform flex-col overflow-hidden text-foreground no-underline hover:-translate-y-1 hover:border-primary hover:text-foreground"
                >
                  <div className="relative border-b-4 border-ring">
                    <Portada url={v.imagenUrl} nombre={v.nombre} />
                    {v.enBiblioteca && (
                      <span className="absolute top-2 left-2 border-2 border-[#04040f] bg-primary px-1.5 py-1 font-pixel text-xs leading-none text-primary-foreground [text-shadow:none]">
                        En tu biblioteca
                      </span>
                    )}
                  </div>
                  <h3 className="m-0 flex flex-1 items-center gap-2 px-3 pt-3 pb-2 font-sans text-base leading-snug">
                    <Mano className="invisible group-hover:visible" />
                    {v.nombre}
                  </h3>
                  {v.enBiblioteca && (
                    <p className="m-0 px-3 pb-3 pl-10 font-pixel text-sm text-primary">
                      {horas(v.horasJugadas ?? 0)} jugadas
                    </p>
                  )}
                </LinkBatalla>
              ))}
            </div>
          )}
          {datos.paginas > 1 && (
            <nav className="flex items-center justify-center gap-6" aria-label="Paginación">
              <Button
                size="sm"
                variant="outline"
                className="text-sm"
                disabled={datos.pagina <= 1}
                onClick={() => actualizar({ pagina: String(datos.pagina - 1) })}
              >
                ◀ Ant
              </Button>
              <span className="retro text-base">
                {datos.pagina}/{datos.paginas}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-sm"
                disabled={datos.pagina >= datos.paginas}
                onClick={() => actualizar({ pagina: String(datos.pagina + 1) })}
              >
                Sig ▶
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
