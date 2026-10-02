import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, type Categoria, type DatosVideojuego, type Etiqueta, type Pagina, type TipoClasificacion, type Videojuego } from '../api';
import { Aviso } from '../components/Aviso';
import { Paginacion } from '../components/Paginacion';
import { Portada } from '../components/Portada';

type Pestania = 'videojuegos' | 'categorias' | 'etiquetas' | 'importar';

export default function Admin() {
  const [pestania, setPestania] = useState<Pestania>('videojuegos');
  return (
    <div className="pagina-admin">
      <h1>Administración</h1>
      <div className="pestanias" role="tablist">
        {(
          [
            ['videojuegos', 'Videojuegos'],
            ['categorias', 'Categorías'],
            ['etiquetas', 'Etiquetas'],
            ['importar', 'Importar catálogo'],
          ] as const
        ).map(([id, txt]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pestania === id}
            className={pestania === id ? 'activa' : ''}
            onClick={() => setPestania(id)}
          >
            {txt}
          </button>
        ))}
      </div>
      {pestania === 'videojuegos' && <AdminVideojuegos />}
      {pestania === 'categorias' && <AdminClasificacion tipo="categorias" />}
      {pestania === 'etiquetas' && <AdminClasificacion tipo="etiquetas" />}
      {pestania === 'importar' && <AdminImportar />}
    </div>
  );
}

// ---------- Videojuegos (CU 13, 14, 15) ----------

function AdminVideojuegos() {
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<Pagina<Videojuego> | null>(null);
  const [editando, setEditando] = useState<Videojuego | 'nuevo' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(
    () => api.catalogo({ q, pagina, tamanio: 15 }).then(setDatos).catch((e) => setAviso({ tipo: 'error', texto: e.message })),
    [q, pagina],
  );
  useEffect(() => {
    const t = setTimeout(() => void cargar(), 200);
    return () => clearTimeout(t);
  }, [cargar]);

  async function eliminar(v: Videojuego) {
    if (!confirm(`¿Eliminar "${v.nombre}"? También se eliminarán sus reseñas.`)) return;
    try {
      await api.eliminarVideojuego(v.appId);
      setAviso({ tipo: 'exito', texto: `"${v.nombre}" eliminado.` });
      await cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: (e as Error).message });
    }
  }

  if (editando) {
    return (
      <FormVideojuego
        juego={editando === 'nuevo' ? null : editando}
        onListo={(texto) => {
          setEditando(null);
          setAviso({ tipo: 'exito', texto });
          void cargar();
        }}
        onCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <section>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <div className="titulo-con-accion">
        <input
          type="search"
          className="input-filtro"
          placeholder="Buscar por nombre o AppID…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPagina(1);
          }}
        />
        <button className="btn btn-primario" onClick={() => setEditando('nuevo')}>
          + Nuevo videojuego
        </button>
      </div>
      <div className="tabla-envoltorio">
        <table className="tabla">
          <thead>
            <tr>
              <th></th>
              <th>AppID</th>
              <th>Nombre</th>
              <th className="ocultar-movil">Categorías</th>
              <th>Reseñas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((v) => (
              <tr key={v.appId}>
                <td>
                  <Portada url={v.imagenUrl} nombre={v.nombre} className="portada-mini" />
                </td>
                <td className="mono">{v.appId}</td>
                <td>{v.nombre}</td>
                <td className="ocultar-movil texto-suave">{v.categorias.map((c) => c.nombre).join(', ')}</td>
                <td>{v.cantidadResenas}</td>
                <td className="acciones-tabla">
                  <button className="btn-link" onClick={() => setEditando(v)}>
                    Editar
                  </button>
                  <button className="btn-link btn-link-peligro" onClick={() => void eliminar(v)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {datos && <Paginacion pagina={datos.pagina} paginas={datos.paginas} onCambiar={setPagina} />}
    </section>
  );
}

function FormVideojuego({
  juego,
  onListo,
  onCancelar,
}: {
  juego: Videojuego | null;
  onListo: (msg: string) => void;
  onCancelar: () => void;
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [form, setForm] = useState<DatosVideojuego>({
    appId: juego?.appId ?? 0,
    nombre: juego?.nombre ?? '',
    descripcion: juego?.descripcion ?? '',
    imagenUrl: juego?.imagenUrl ?? '',
    categoriaIds: juego?.categorias.map((c) => c.categoriaId) ?? [],
    etiquetaIds: juego?.etiquetas.map((e) => e.etiquetaId) ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void Promise.all([api.categorias(), api.etiquetas()]).then(([c, e]) => {
      setCategorias(c);
      setEtiquetas(e);
    });
  }, []);

  const alternar = (campo: 'categoriaIds' | 'etiquetaIds', id: number) =>
    setForm((f) => ({
      ...f,
      [campo]: f[campo].includes(id) ? f[campo].filter((x) => x !== id) : [...f[campo], id],
    }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const datos = { ...form, imagenUrl: form.imagenUrl?.trim() || null };
    try {
      if (juego) {
        const { appId: _omitido, ...resto } = datos;
        await api.modificarVideojuego(juego.appId, resto);
        onListo(`"${datos.nombre}" actualizado.`);
      } else {
        await api.crearVideojuego(datos);
        onListo(`"${datos.nombre}" registrado.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="panel form-admin" onSubmit={enviar}>
      <h2>{juego ? `Modificar: ${juego.nombre}` : 'Registrar videojuego'}</h2>
      <div className="grilla-form">
        <label className="campo">
          <span>AppID de Steam</span>
          <input
            type="number"
            min={1}
            required
            disabled={!!juego}
            value={form.appId || ''}
            onChange={(e) => setForm({ ...form, appId: Number(e.target.value) })}
          />
        </label>
        <label className="campo">
          <span>Nombre</span>
          <input required maxLength={200} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label className="campo campo-ancho">
          <span>URL de portada (vacío = portada de Steam)</span>
          <input
            type="url"
            value={form.imagenUrl ?? ''}
            placeholder={form.appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${form.appId}/header.jpg` : ''}
            onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
          />
        </label>
        <label className="campo campo-ancho">
          <span>Descripción</span>
          <textarea rows={4} maxLength={5000} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </label>
      </div>
      <fieldset className="campo">
        <legend>Categorías</legend>
        <div className="chips">
          {categorias.map((c) => (
            <button
              type="button"
              key={c.categoriaId}
              className={`chip ${form.categoriaIds.includes(c.categoriaId) ? 'chip-activo' : ''}`}
              aria-pressed={form.categoriaIds.includes(c.categoriaId)}
              onClick={() => alternar('categoriaIds', c.categoriaId)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="campo">
        <legend>Etiquetas</legend>
        <div className="chips">
          {etiquetas.map((t) => (
            <button
              type="button"
              key={t.etiquetaId}
              className={`chip chip-etiqueta ${form.etiquetaIds.includes(t.etiquetaId) ? 'chip-activo' : ''}`}
              aria-pressed={form.etiquetaIds.includes(t.etiquetaId)}
              onClick={() => alternar('etiquetaIds', t.etiquetaId)}
            >
              #{t.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="fila-botones">
        <button type="button" className="btn btn-fantasma" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="btn btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// ---------- Categorías / Etiquetas (CU 16 a 21) ----------

function AdminClasificacion({ tipo }: { tipo: TipoClasificacion }) {
  const singular = tipo === 'categorias' ? 'categoría' : 'etiqueta';
  const [items, setItems] = useState<Array<{ id: number; nombre: string; usos: number }>>([]);
  const [nuevo, setNuevo] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const lista =
      tipo === 'categorias'
        ? (await api.categorias()).map((c) => ({ id: c.categoriaId, nombre: c.nombre, usos: c._count?.videojuegos ?? 0 }))
        : (await api.etiquetas()).map((e) => ({ id: e.etiquetaId, nombre: e.nombre, usos: e._count?.videojuegos ?? 0 }));
    setItems(lista);
  }, [tipo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function ejecutar(accion: () => Promise<unknown>, ok: string) {
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: 'exito', texto: ok });
      await cargar();
    } catch (e) {
      setAviso({ tipo: 'error', texto: (e as Error).message });
    }
  }

  return (
    <section>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <form
        className="form-linea"
        onSubmit={(e) => {
          e.preventDefault();
          void ejecutar(() => api.crearClasificacion(tipo, nuevo), `Se registró la ${singular} "${nuevo}".`).then(() =>
            setNuevo(''),
          );
        }}
      >
        <input required maxLength={100} placeholder={`Nueva ${singular}…`} value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
        <button className="btn btn-primario">Agregar</button>
      </form>
      <ul className="lista-clasificacion">
        {items.map((it) => (
          <li key={it.id}>
            {editId === it.id ? (
              <form
                className="form-linea"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ejecutar(() => api.modificarClasificacion(tipo, it.id, editNombre), 'Cambios guardados.').then(() =>
                    setEditId(null),
                  );
                }}
              >
                <input autoFocus required maxLength={100} value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
                <button className="btn btn-primario btn-chico">Guardar</button>
                <button type="button" className="btn btn-fantasma btn-chico" onClick={() => setEditId(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <span className="item-nombre">{tipo === 'etiquetas' ? `#${it.nombre}` : it.nombre}</span>
                <span className="texto-suave texto-chico">
                  {it.usos} juego{it.usos === 1 ? '' : 's'}
                </span>
                <span className="acciones-tabla">
                  <button
                    className="btn-link"
                    onClick={() => {
                      setEditId(it.id);
                      setEditNombre(it.nombre);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-link btn-link-peligro"
                    onClick={() => {
                      if (confirm(`¿Eliminar la ${singular} "${it.nombre}"? Se quitará de ${it.usos} juego(s).`))
                        void ejecutar(() => api.eliminarClasificacion(tipo, it.id), `Se eliminó "${it.nombre}".`);
                    }}
                  >
                    Eliminar
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Importación del catálogo (RNF 4) ----------

const EJEMPLO = `[
  {
    "appId": 620,
    "nombre": "Portal 2",
    "descripcion": "Puzzles con portales...",
    "categorias": ["Aventura"],
    "etiquetas": ["Puzzle", "Cooperativo"]
  }
]`;

function AdminImportar() {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  async function importar() {
    setError(null);
    setResultado(null);
    let items: unknown;
    try {
      items = JSON.parse(texto);
    } catch {
      setError('El texto no es un JSON válido');
      return;
    }
    setImportando(true);
    try {
      const r = await api.importarCatalogo(items);
      setResultado(
        `${r.creados} creados, ${r.actualizados} actualizados` +
          (r.errores.length ? `, ${r.errores.length} con error (${r.errores.map((e) => e.appId).join(', ')})` : ''),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportando(false);
    }
  }

  return (
    <section className="panel">
      <p className="texto-suave texto-chico">
        Cargá o actualizá juegos desde un dataset JSON. Los juegos existentes (mismo AppID) se actualizan; las categorías y
        etiquetas nuevas se crean automáticamente. La importación procesa cada juego por separado, sin bloquear las
        consultas de los usuarios. También se puede ejecutar por consola: <code>npm run importar-catalogo -- archivo.json</code>
      </p>
      <label className="btn btn-secundario btn-archivo">
        Elegir archivo .json
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setTexto(await f.text());
          }}
        />
      </label>
      <textarea className="mono" rows={12} placeholder={EJEMPLO} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      {resultado && <Aviso tipo="exito">{resultado}</Aviso>}
      <div className="fila-botones">
        <button className="btn btn-primario" disabled={!texto.trim() || importando} onClick={() => void importar()}>
          {importando ? 'Importando…' : 'Importar'}
        </button>
      </div>
    </section>
  );
}
