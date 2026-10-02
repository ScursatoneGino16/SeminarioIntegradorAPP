export function Paginacion({ pagina, paginas, onCambiar }: { pagina: number; paginas: number; onCambiar: (p: number) => void }) {
  if (paginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button className="btn btn-fantasma btn-chico" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
        ← Anterior
      </button>
      <span>
        Página {pagina} de {paginas}
      </span>
      <button className="btn btn-fantasma btn-chico" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}
