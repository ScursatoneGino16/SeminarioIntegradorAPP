// Los dos sistemas de clasificación de SteamVault:
//  1. Rango de cuenta: según las horas totales jugadas en Steam (todos los juegos).
//  2. Insignia por juego: según las horas jugadas en cada juego.
// Cada uno es una lista de escalones de menor a mayor; para cambiar nombres o umbrales
// alcanza con editar las tablas de abajo. El número romano (I, II…) es la posición en la lista.

export interface Escalon {
  /** Identificador estable (se usa en el front para el color y la medalla) */
  id: string;
  titulo: string;
  /** Horas mínimas del escalón */
  desde: number;
}

/** Clasificación por horas totales de Steam (todos los juegos de la cuenta). */
export const RANGOS_CUENTA: Escalon[] = [
  { id: 'novato', titulo: 'Novato', desde: 0 },
  { id: 'aprendiz', titulo: 'Aprendiz', desde: 50 },
  { id: 'aventurero', titulo: 'Aventurero', desde: 200 },
  { id: 'guerrero', titulo: 'Guerrero', desde: 500 },
  { id: 'maestro', titulo: 'Maestro', desde: 1000 },
  { id: 'paladin', titulo: 'Paladín', desde: 2500 },
  { id: 'heroe-legendario', titulo: 'Héroe legendario', desde: 5000 },
  { id: 'mitico', titulo: 'Mítico', desde: 10000 },
];

/** Clasificación por horas en cada juego. */
export const INSIGNIAS_JUEGO: Escalon[] = [
  { id: 'recien-llegado', titulo: 'Recién llegado', desde: 0 },
  { id: 'explorador', titulo: 'Explorador', desde: 5 },
  { id: 'combatiente', titulo: 'Combatiente', desde: 20 },
  { id: 'veterano', titulo: 'Veterano', desde: 50 },
  { id: 'experto', titulo: 'Experto', desde: 100 },
  { id: 'maestro', titulo: 'Maestro', desde: 200 },
  { id: 'campeon', titulo: 'Campeón', desde: 400 },
  { id: 'leyenda', titulo: 'Leyenda', desde: 800 },
  { id: 'heroe-de-leyenda', titulo: 'Héroe de leyenda', desde: 1500 },
  { id: 'trascendente', titulo: 'Trascendente', desde: 3000 },
];

/** Escalón alcanzado con esas horas, o null si no llega al primero. */
export function escalonPorHoras(escalones: Escalon[], horas: number): Escalon | null {
  let actual: Escalon | null = null;
  for (const e of escalones) if (horas >= e.desde) actual = e;
  return actual;
}

/** Insignia de un juego con su posición (0 = I). */
export function insigniaPorHoras(horas: number) {
  const e = escalonPorHoras(INSIGNIAS_JUEGO, horas);
  return e && { ...e, nivel: INSIGNIAS_JUEGO.indexOf(e) };
}

/** Rango de cuenta con el progreso hacia el siguiente. null si no se conocen las horas totales. */
export function rangoCuenta(horasTotales: number | null) {
  if (horasTotales === null) return null;
  const actual = escalonPorHoras(RANGOS_CUENTA, horasTotales) ?? RANGOS_CUENTA[0];
  const siguiente = RANGOS_CUENTA[RANGOS_CUENTA.indexOf(actual) + 1] ?? null;
  return { ...actual, nivel: RANGOS_CUENTA.indexOf(actual), horas: horasTotales, siguiente };
}
