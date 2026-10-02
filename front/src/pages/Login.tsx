import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../sesion';
import { Aviso } from '../components/Aviso';

const ERRORES: Record<string, string> = {
  steam_no_disponible: 'Steam no respondió a tiempo. Probá de nuevo en unos minutos.',
  autenticacion_invalida: 'No se pudo verificar tu identidad con Steam.',
};

const PERFILES_PRUEBA = [
  { steamId: '76561198000000001', nombre: 'Admin de prueba', desc: 'Administrador (ver ADMIN_STEAM_IDS)' },
  { steamId: '76561198000000002', nombre: 'Jugadora de prueba', desc: 'Usuario con biblioteca pública' },
  { steamId: '76561198000000000', nombre: 'Perfil privado', desc: 'Biblioteca privada: no puede reseñar' },
];

export default function Login() {
  const [params] = useSearchParams();
  const { estado, refrescar } = useSesion();
  const [steamId, setSteamId] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function entrarSimulado(id: string, n?: string) {
    setError(null);
    try {
      await api.devLogin(id, n);
      await refrescar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void entrarSimulado(steamId.trim(), nombre);
  }

  const codigoError = params.get('error');
  return (
    <div className="login">
      <section className="login-tarjeta">
        <div className="login-logo">★</div>
        <h1>Reseñas de juegos de Steam</h1>
        <p className="texto-suave">
          Consultá el catálogo, leé lo que opina la comunidad y publicá reseñas de los juegos de tu biblioteca, junto con
          tus horas de juego.
        </p>

        {params.get('expirada') && (
          <Aviso tipo="alerta">
            Tu sesión expiró por {estado?.minutosInactividad ?? 30} minutos de inactividad. Iniciá sesión de nuevo.
          </Aviso>
        )}
        {codigoError && <Aviso tipo="error">{ERRORES[codigoError] ?? 'No se pudo iniciar sesión.'}</Aviso>}

        <a className="btn btn-steam" href="/api/auth/steam">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <circle cx="12" cy="12" r="11" fill="currentColor" opacity=".15" />
            <circle cx="15.5" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="8.5" cy="15.5" r="2.2" fill="currentColor" />
            <path d="M8.5 15.5 13.5 11" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Iniciar sesión con Steam
        </a>
        <p className="texto-chico texto-suave">
          Usamos el inicio de sesión oficial de Steam. Nunca vemos ni guardamos tu contraseña.
        </p>

        {estado?.modoSimulado && (
          <div className="login-dev">
            <h2>Modo simulado</h2>
            <p className="texto-chico texto-suave">
              No hay <code>STEAM_API_KEY</code> configurada: la biblioteca y las horas se simulan. Podés entrar con un
              SteamID de prueba.
            </p>
            <div className="perfiles-prueba">
              {PERFILES_PRUEBA.map((p) => (
                <button key={p.steamId} className="perfil-prueba" onClick={() => void entrarSimulado(p.steamId, p.nombre)}>
                  <strong>{p.nombre}</strong>
                  <span>{p.desc}</span>
                </button>
              ))}
            </div>
            <form onSubmit={enviar} className="form-dev">
              <input
                placeholder="SteamID (17 dígitos)"
                value={steamId}
                inputMode="numeric"
                pattern="\d{17}"
                required
                onChange={(e) => setSteamId(e.target.value)}
              />
              <input placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              <button className="btn btn-secundario">Entrar</button>
            </form>
            {error && <p className="error-chico">{error}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
