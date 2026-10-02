export function Avatar({ url, nombre, tam = 40 }: { url: string | null; nombre: string; tam?: number }) {
  if (url) return <img className="avatar" src={url} alt="" width={tam} height={tam} />;
  return (
    <span className="avatar avatar-inicial" style={{ width: tam, height: tam, fontSize: tam * 0.45 }} aria-hidden>
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
