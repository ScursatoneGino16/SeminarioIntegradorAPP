import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../sesion';
import { Aviso } from '../components/Aviso';
import { Estrellas } from '../components/Estrellas';

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
        <div className="login-logo">
          <Estrellas valor={5} tam={30} />
        </div>
        <h1>SteamVault</h1>
        <p className="login-subtitulo">— Crónicas de Steam —</p>
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
          Iniciar sesión con Steam
        </a>
        <p className="texto-chico texto-suave">
          Usamos el inicio de sesión oficial de Steam. Nunca vemos ni guardamos tu contraseña.
        </p>

        {estado?.modoSimulado && (
          <div className="login-dev">
            <h2>Continuar partida</h2>
            <p className="texto-chico texto-suave">
              No hay <code>STEAM_API_KEY</code> configurada: la biblioteca y las horas se simulan. Podés entrar con un
              SteamID de prueba (modo simulado).
            </p>
            <div className="perfiles-prueba">
              {PERFILES_PRUEBA.map((p, i) => (
                <button key={p.steamId} className="perfil-prueba" onClick={() => void entrarSimulado(p.steamId, p.nombre)}>
                  <strong>
                    Ranura {i + 1} · {p.nombre}
                  </strong>
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
        <p className="copyright">© 2026 Grupo 08 · Seminario Integrador</p>
      </section>
    </div>
  );
}
