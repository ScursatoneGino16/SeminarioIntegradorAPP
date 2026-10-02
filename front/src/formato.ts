const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtHoras = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export const fecha = (iso: string) => fmtFecha.format(new Date(iso));
export const horas = (h: number) => `${fmtHoras.format(h)} h`;
