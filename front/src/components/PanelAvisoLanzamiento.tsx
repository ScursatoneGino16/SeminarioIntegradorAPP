import { useEffect, useState, type FormEvent } from 'react';
import { api, type AvisoLanzamiento, type Videojuego } from '../api';
import { diaLanzamiento, faltaPara } from '../formato';

/** Juego que todavía no salió: fecha de estreno y pedido de aviso por mail 24 h antes. */
export function PanelAvisoLanzamiento({ juego }: { juego: Videojuego }) {
  // undefined = cargando
  const [aviso, setAviso] = useState<AvisoLanzamiento | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .miAviso(juego.appId)
      .then(setAviso)
      .catch(() => setAviso(null));
  }, [juego.appId]);

  async function pedir(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      setAviso(await api.pedirAviso(juego.appId, email.trim()));
      setEditando(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar() {
    setError(null);
    try {
      await api.cancelarAviso(juego.appId);
      setAviso(null);
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const fecha = juego.fechaLanzamiento;
  return (
    <section className="panel panel-lanzamiento">
      <h2>Próximamente</h2>
      <p className="lanzamiento-fecha">
        {fecha ? (
          <>
            Sale en Steam el <strong>{diaLanzamiento(fecha)}</strong> <span className="texto-suave">({faltaPara(fecha)})</span>
          </>
        ) : (
          <>
            Fecha de salida: <strong>{juego.fechaLanzamientoTexto ?? 'a confirmar'}</strong>
          </>
        )}
      </p>
      <p className="texto-suave">🔒 Las reseñas se habilitan el día del lanzamiento.</p>

      {aviso === undefined ? null : aviso && !editando ? (
        <div className="aviso-pedido">
          <p>
            ✉ Te vamos a escribir a <strong>{aviso.email}</strong> 24 h antes del estreno
            {!fecha && ', cuando Steam confirme el día'}.
          </p>
          <div className="fila-botones fila-izq">
            <button
              className="btn btn-secundario btn-chico"
              onClick={() => {
                setEmail(aviso.email);
                setEditando(true);
              }}
            >
              Cambiar mail
            </button>
            <button className="btn btn-peligro btn-chico" onClick={() => void cancelar()}>
              Cancelar aviso
            </button>
          </div>
        </div>
      ) : (
        <form className="form-aviso" onSubmit={pedir}>
          <label className="campo">
            <span>Avisarme por mail 24 h antes del lanzamiento</span>
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="tu@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="fila-botones fila-izq">
            {editando && (
              <button type="button" className="btn btn-fantasma btn-chico" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
            <button className="btn btn-primario btn-chico" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Avisarme'}
            </button>
          </div>
        </form>
      )}
      {error && <p className="error-chico">{error}</p>}
    </section>
  );
}
