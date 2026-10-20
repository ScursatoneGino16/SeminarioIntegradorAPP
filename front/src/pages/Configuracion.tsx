import { useSesion } from '../sesion';
import { FONDOS, MARCOS, usePreferencias } from '../preferencias';
import { Mano, Retrato } from '../components/PixelArte';

/** Menú de configuración al estilo de las opciones de EarthBound: cada cambio se ve al instante. */
export default function Configuracion() {
  const { estado } = useSesion();
  const { preferencias, cambiar } = usePreferencias();
  const u = estado?.usuario;

  return (
    <div className="pagina-configuracion">
      <h1>Configuración</h1>
      <section className="panel">
        <h2>Fondo</h2>
        <div className="opciones">
          {Object.entries(FONDOS).map(([id, nombre]) => (
            <button
              key={id}
              className="opcion"
              aria-pressed={preferencias.fondo === id}
              onClick={() => cambiar({ fondo: id as keyof typeof FONDOS })}
            >
              <span className="muestra-fondo fondo-animado" data-fondo={id} />
              <span className="opcion-nombre">
                {preferencias.fondo === id && <Mano />}
                {nombre}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Marco del retrato</h2>
        <div className="opciones">
          {Object.entries(MARCOS).map(([id, nombre]) => (
            <button
              key={id}
              className="opcion"
              aria-pressed={preferencias.marco === id}
              onClick={() => cambiar({ marco: id as keyof typeof MARCOS })}
            >
              <Retrato url={u?.avatarUrl ?? null} nombre={u?.nombreUsuario ?? '?'} marco={id as keyof typeof MARCOS} />
              <span className="opcion-nombre">
                {preferencias.marco === id && <Mano />}
                {nombre}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Perfil de Steam</h2>
        <div className="interruptores">
          <label className="interruptor">
            <input
              type="checkbox"
              checked={preferencias.avatarSteam}
              onChange={(e) => cambiar({ avatarSteam: e.target.checked })}
            />
            <span className="interruptor-caja" aria-hidden />
            Mostrar el avatar animado de Steam
          </label>
          <label className="interruptor">
            <input
              type="checkbox"
              checked={preferencias.marcoSteam}
              onChange={(e) => cambiar({ marcoSteam: e.target.checked })}
            />
            <span className="interruptor-caja" aria-hidden />
            Mostrar el marco de avatar de Steam
          </label>
          <label className="interruptor">
            <input
              type="checkbox"
              checked={preferencias.fondoSteam}
              onChange={(e) => cambiar({ fondoSteam: e.target.checked })}
            />
            <span className="interruptor-caja" aria-hidden />
            Mostrar el fondo de perfil de Steam
          </label>
        </div>
      </section>
    </div>
  );
}
