import { useEffect, useRef, useState } from 'react';
import { api, type Adjunto, type Gif } from '../api';
import { useSesion } from '../sesion';

export const MAX_ADJUNTOS = 4;

/** GIFs e imágenes de una reseña. Las imágenes se abren en tamaño completo en otra pestaña. */
export function AdjuntosResena({ adjuntos }: { adjuntos: Adjunto[] }) {
  if (!adjuntos.length) return null;
  return (
    <div className="adjuntos">
      {adjuntos.map((a) =>
        a.tipo === 'imagen' ? (
          <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="adjunto">
            <img src={a.url} alt="Imagen adjunta" loading="lazy" />
          </a>
        ) : (
          <span key={a.url} className="adjunto">
            <img src={a.url} alt="GIF" loading="lazy" />
          </span>
        ),
      )}
    </div>
  );
}

/** Adjuntos del formulario de reseña: vista previa, quitar, subir imagen y buscar GIF. */
export function EditorAdjuntos({ adjuntos, onChange }: { adjuntos: Adjunto[]; onChange: (a: Adjunto[]) => void }) {
  const { estado } = useSesion();
  const [buscando, setBuscando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const lleno = adjuntos.length >= MAX_ADJUNTOS;
  const maxMb = estado?.maxMbImagen ?? 3;

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    if (archivo.size > maxMb * 1024 * 1024) return setError(`La imagen supera los ${maxMb} MB`);
    setSubiendo(true);
    try {
      const { url } = await api.subirImagen(archivo);
      onChange([...adjuntos, { tipo: 'imagen', url }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = '';
    }
  }

  return (
    <div className="editor-adjuntos">
      {adjuntos.length > 0 && (
        <div className="adjuntos">
          {adjuntos.map((a, i) => (
            <span key={a.url} className="adjunto">
              <img src={a.url} alt={a.tipo === 'gif' ? 'GIF' : 'Imagen adjunta'} />
              <button
                type="button"
                className="adjunto-quitar"
                aria-label="Quitar adjunto"
                onClick={() => onChange(adjuntos.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="fila-botones fila-izq">
        <label className={`btn btn-chico btn-archivo ${lleno || subiendo ? 'deshabilitado' : ''}`}>
          {subiendo ? 'Subiendo…' : '+ Imagen'}
          <input
            ref={inputArchivo}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={lleno || subiendo}
            onChange={(e) => void subir(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          className="btn btn-chico"
          disabled={lleno || !estado?.gifsHabilitados}
          title={estado?.gifsHabilitados ? undefined : 'La búsqueda de GIFs no está configurada en el servidor'}
          onClick={() => setBuscando((b) => !b)}
          aria-expanded={buscando}
        >
          + GIF
        </button>
        <span className="texto-suave texto-chico">
          {adjuntos.length}/{MAX_ADJUNTOS}
        </span>
      </div>
      {estado && !estado.gifsHabilitados && (
        <p className="texto-suave texto-chico">Los GIFs no están disponibles: falta configurar GIPHY_API_KEY en el servidor.</p>
      )}
      {error && <p className="error-chico">{error}</p>}
      {buscando && !lleno && (
        <SelectorGif
          onElegir={(gif) => {
            onChange([...adjuntos, { tipo: 'gif', url: gif.url }]);
            setBuscando(false);
          }}
        />
      )}
    </div>
  );
}

function SelectorGif({ onElegir }: { onElegir: (g: Gif) => void }) {
  const [texto, setTexto] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [siguiente, setSiguiente] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca 400 ms después de la última tecla; sin texto muestra los del momento.
  useEffect(() => {
    let vigente = true;
    const t = setTimeout(() => {
      setCargando(true);
      setError(null);
      api
        .gifs(texto.trim())
        .then((r) => {
          if (!vigente) return;
          setGifs(r.gifs);
          setSiguiente(r.siguienteOffset < r.total ? r.siguienteOffset : null);
        })
        .catch((e) => vigente && setError(e.message))
        .finally(() => vigente && setCargando(false));
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [texto]);

  async function masGifs() {
    if (siguiente === null) return;
    setCargando(true);
    try {
      const r = await api.gifs(texto.trim(), siguiente);
      setGifs((g) => [...g, ...r.gifs.filter((n) => !g.some((x) => x.id === n.id))]);
      setSiguiente(r.siguienteOffset < r.total ? r.siguienteOffset : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="selector-gif">
      <input
        type="search"
        value={texto}
        placeholder="Buscar GIF…"
        aria-label="Buscar GIF"
        maxLength={50}
        autoFocus
        onChange={(e) => setTexto(e.target.value)}
      />
      {error && <p className="error-chico">{error}</p>}
      <div className="selector-gif-grilla">
        {gifs.map((g) => (
          <button key={g.id} type="button" title={g.titulo} onClick={() => onElegir(g)}>
            <img src={g.vistaPrevia} alt={g.titulo || 'GIF'} loading="lazy" />
          </button>
        ))}
      </div>
      {!cargando && !error && gifs.length === 0 && <p className="texto-suave">No se encontraron GIFs.</p>}
      <div className="selector-gif-pie">
        {siguiente !== null && (
          <button type="button" className="btn-link" disabled={cargando} onClick={() => void masGifs()}>
            {cargando ? 'Cargando…' : 'Más GIFs'}
          </button>
        )}
        <span className="texto-suave texto-chico">Powered by GIPHY</span>
      </div>
    </div>
  );
}
