const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtHoras = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export const fecha = (iso: string) => fmtFecha.format(new Date(iso));
export const horas = (h: number) => `${fmtHoras.format(h)} h`;

// Las fechas de lanzamiento son días (medianoche UTC): se formatean en UTC para no correrse un día.
const fmtDia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const diaLanzamiento = (iso: string) => fmtDia.format(new Date(iso));

/** "hoy", "mañana", "en 5 días" hasta un día de lanzamiento. */
export function faltaPara(iso: string) {
  const hoy = new Date();
  const inicioHoy = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((new Date(iso).getTime() - inicioHoy) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** Número romano de un escalón de clasificación (0 → I). */
export const romano = (nivel: number) => ROMANOS[nivel] ?? String(nivel + 1);
