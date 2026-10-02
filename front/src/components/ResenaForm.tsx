import { useState, type FormEvent } from 'react';
import { SelectorEstrellas } from './Estrellas';

const MAX = 1200;

interface Props {
  inicial?: { calificacion: number; comentario: string };
  textoBoton: string;
  onEnviar: (calificacion: number, comentario: string) => Promise<void>;
  onCancelar?: () => void;
}

export function ResenaForm({ inicial, textoBoton, onEnviar, onCancelar }: Props) {
  const [calificacion, setCalificacion] = useState(inicial?.calificacion ?? 0);
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!calificacion) return setError('Elegí entre 1 y 5 estrellas');
    if (!comentario.trim()) return setError('Escribí un comentario');
    setError(null);
    setEnviando(true);
    try {
      await onEnviar(calificacion, comentario.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const restantes = MAX - comentario.length;
  return (
    <form className="form-resena" onSubmit={enviar}>
      <SelectorEstrellas valor={calificacion} onChange={setCalificacion} />
      <label className="campo">
        <span className="sr-only">Comentario</span>
        <textarea
          value={comentario}
          maxLength={MAX}
          rows={5}
          placeholder="¿Qué te pareció el juego?"
          onChange={(e) => setComentario(e.target.value)}
        />
        <span className={`contador ${restantes < 100 ? 'contador-alerta' : ''}`}>{restantes} caracteres restantes</span>
      </label>
      {error && <p className="error-chico">{error}</p>}
      <div className="fila-botones">
        {onCancelar && (
          <button type="button" className="btn btn-fantasma" onClick={onCancelar}>
            Cancelar
          </button>
        )}
        <button className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Guardando…' : textoBoton}
        </button>
      </div>
    </form>
  );
}
