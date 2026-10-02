import { useState } from 'react';

/** Portada del videojuego con un reemplazo si la imagen no carga. */
export function Portada({ url, nombre, className = '' }: { url: string | null; nombre: string; className?: string }) {
  const [fallo, setFallo] = useState(false);
  if (!url || fallo) {
    return (
      <div className={`portada portada-vacia ${className}`} aria-label={nombre}>
        <span>{nombre}</span>
      </div>
    );
  }
  return <img className={`portada ${className}`} src={url} alt={nombre} loading="lazy" onError={() => setFallo(true)} />;
}
