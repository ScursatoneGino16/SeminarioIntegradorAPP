/**
 * Un juego todavía no salió si Steam lo marca como "próximamente" y su fecha (si la tiene)
 * no llegó. Así las reseñas se habilitan solas el día del lanzamiento, sin esperar al importador.
 */
export function estaPorSalir(v: { proximamente: boolean; fechaLanzamiento: Date | null }, ahora = new Date()) {
  return v.proximamente && (!v.fechaLanzamiento || v.fechaLanzamiento.getTime() > ahora.getTime());
}
