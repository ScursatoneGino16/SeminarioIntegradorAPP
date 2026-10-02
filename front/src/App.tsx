import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './sesion';
import { Avatar } from './components/Avatar';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import VideojuegoPagina from './pages/Videojuego';
import PerfilPagina from './pages/Perfil';
import BibliotecaPagina from './pages/Biblioteca';
import Admin from './pages/Admin';

function Encabezado() {
  const { estado, salir } = useSesion();
  const u = estado?.usuario;
  if (!u) return null;
  return (
    <header className="encabezado">
      <div className="encabezado-interno">
        <NavLink to="/" className="marca">
          <span className="marca-icono">★</span> Reseñas<span className="marca-sub">Steam</span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>
            Catálogo
          </NavLink>
          <NavLink to="/biblioteca">Mi biblioteca</NavLink>
          <NavLink to={`/usuarios/${u.steamId}`}>Mi perfil</NavLink>
          {u.esAdmin && <NavLink to="/admin">Administración</NavLink>}
        </nav>
        <div className="usuario-actual">
          <Avatar url={u.avatarUrl} nombre={u.nombreUsuario} tam={32} />
          <span className="usuario-nombre">{u.nombreUsuario}</span>
          <button className="btn btn-fantasma btn-chico" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

function Protegida({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { estado, expirada } = useSesion();
  const loc = useLocation();
  if (!estado) return <div className="cargando">Cargando…</div>;
  if (!estado.autenticado) {
    return <Navigate to={`/login${expirada ? '?expirada=1' : ''}`} replace state={{ desde: loc.pathname }} />;
  }
  if (admin && !estado.usuario?.esAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { estado } = useSesion();
  return (
    <>
      <Encabezado />
      <main className="contenido">
        <Routes>
          <Route path="/login" element={estado?.autenticado ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protegida><Catalogo /></Protegida>} />
          <Route path="/videojuegos/:appId" element={<Protegida><VideojuegoPagina /></Protegida>} />
          <Route path="/usuarios/:steamId" element={<Protegida><PerfilPagina /></Protegida>} />
          <Route path="/biblioteca" element={<Protegida><BibliotecaPagina /></Protegida>} />
          <Route path="/admin" element={<Protegida admin><Admin /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
