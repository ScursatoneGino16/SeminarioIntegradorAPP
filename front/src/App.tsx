import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './sesion';
import { Avatar } from './components/Avatar';
import { FondoAnimado, Icono, Mano, type NombreIcono } from './components/PixelArte';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import VideojuegoPagina from './pages/Videojuego';
import PerfilPagina from './pages/Perfil';
import BibliotecaPagina from './pages/Biblioteca';
import Admin from './pages/Admin';
import Configuracion from './pages/Configuracion';
import Lanzamientos from './pages/Lanzamientos';
import Amigos from './pages/Amigos';
import Notificaciones from './pages/Notificaciones';
import { Campanita } from './components/Campanita';

// Menú de comandos de RPG: el ítem activo lleva la manito de Final Fantasy.
const claseNav = ({ isActive }: { isActive: boolean }) =>
  `group retro flex items-center gap-1.5 px-2 py-1.5 text-base no-underline ${
    isActive ? 'text-primary' : 'text-foreground hover:text-primary'
  }`;

function ItemMenu({ to, end, icono, children }: { to: string; end?: boolean; icono: NombreIcono; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={end} className={claseNav}>
      {({ isActive }) => (
        <>
          <Mano className={isActive ? '' : 'invisible group-hover:visible max-sm:hidden'} />
          <Icono nombre={icono} />
          {children}
        </>
      )}
    </NavLink>
  );
}

function Encabezado() {
  const { estado } = useSesion();
  const u = estado?.usuario;
  if (!u) return null;
  return (
    <header className="ventana sticky top-0 z-20 !rounded-none !border-x-0 !border-t-0">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <NavLink to="/" className="flex items-baseline gap-2 font-titulo text-3xl leading-none text-primary no-underline hover:text-primary">
          Steam<span className="text-accent">Vault</span>
        </NavLink>
        <nav className="flex flex-wrap gap-1">
          <ItemMenu to="/" end icono="espada">
            Catálogo
          </ItemMenu>
          <ItemMenu to="/lanzamientos" icono="calendario">
            Lanzamientos
          </ItemMenu>
          <ItemMenu to="/amigos" icono="amigos">
            Amigos
          </ItemMenu>
          <ItemMenu to="/biblioteca" icono="cofre">
            Biblioteca
          </ItemMenu>
          <ItemMenu to={`/usuarios/${u.steamId}`} icono="armadura">
            Perfil
          </ItemMenu>
          {u.esAdmin && (
            <ItemMenu to="/admin" icono="corona">
              Admin
            </ItemMenu>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Campanita />
          <Avatar url={u.avatarUrl} nombre={u.nombreUsuario} tam={36} />
          <span className="hidden max-w-[16ch] truncate sm:inline">{u.nombreUsuario}</span>
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
      <FondoAnimado />
      <main className="contenido">
        <Routes>
          <Route path="/login" element={estado?.autenticado ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protegida><Catalogo /></Protegida>} />
          <Route path="/videojuegos/:appId" element={<Protegida><VideojuegoPagina /></Protegida>} />
          <Route path="/usuarios/:steamId" element={<Protegida><PerfilPagina /></Protegida>} />
          <Route path="/biblioteca" element={<Protegida><BibliotecaPagina /></Protegida>} />
          <Route path="/lanzamientos" element={<Protegida><Lanzamientos /></Protegida>} />
          <Route path="/amigos" element={<Protegida><Amigos /></Protegida>} />
          <Route path="/notificaciones" element={<Protegida><Notificaciones /></Protegida>} />
          <Route path="/admin" element={<Protegida admin><Admin /></Protegida>} />
          <Route path="/configuracion" element={<Protegida><Configuracion /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
