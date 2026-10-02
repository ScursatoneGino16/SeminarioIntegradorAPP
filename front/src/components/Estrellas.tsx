import { useState } from 'react';

export function Estrellas({ valor, tam = 16 }: { valor: number; tam?: number }) {
  const redondeado = Math.round(valor);
  return (
    <span className="estrellas" style={{ fontSize: tam }} aria-label={`${valor.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= redondeado ? 'llena' : 'vacia'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function SelectorEstrellas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const mostrado = hover || valor;
  return (
    <div className="selector-estrellas" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valor === i}
          aria-label={`${i} estrella${i > 1 ? 's' : ''}`}
          className={i <= mostrado ? 'llena' : 'vacia'}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          ★
        </button>
      ))}
      <span className="selector-texto">{valor ? `${valor}/5` : 'Elegí una calificación'}</span>
    </div>
  );
}
