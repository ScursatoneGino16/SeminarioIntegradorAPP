import type { ReactNode } from 'react';
import { Destello, textoPlano, useEscritura } from '../animaciones';

/**
 * Cuadro de diálogo. Si el contenido es solo texto, aparece letra por letra (clic para mostrarlo
 * entero) y al terminar titila la flecha ▼, como en Dragon Quest o EarthBound.
 */
export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'exito' | 'alerta'; children: ReactNode }) {
  const texto = textoPlano(children);
  const { visibles, completo, completar } = useEscritura(texto);

  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'} onClick={completar}>
      {tipo === 'exito' && <Destello />}
      {texto === null ? (
        children
      ) : (
        <>
          <span className="sr-only">{texto}</span>
          <span aria-hidden>{texto.slice(0, visibles)}</span>
          {completo && (
            <span className="aviso-flecha" aria-hidden>
              ▼
            </span>
          )}
        </>
      )}
    </div>
  );
}
