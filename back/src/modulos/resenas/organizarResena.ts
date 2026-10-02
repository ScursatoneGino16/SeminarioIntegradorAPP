// OrganizarReseña: criterio de orden de las reseñas y cálculo de valoraciones.
import type { Prisma } from '@prisma/client';

/** Reseñas de un videojuego: más "Me gusta" primero; a igualdad, la más reciente. */
export const ordenPorRelevancia: Prisma.ResenaOrderByWithRelationInput[] = [
  { cantLike: 'desc' },
  { fechaCreacion: 'desc' },
  { resenaId: 'desc' },
];

/** Historial de un usuario: cronológico descendente. */
export const ordenCronologico: Prisma.ResenaOrderByWithRelationInput[] = [
  { fechaCreacion: 'desc' },
  { resenaId: 'desc' },
];

/** Cambios en los contadores al pasar de una valoración previa a una nueva (null = sin valoración). */
export function deltaValoracion(previa: boolean | null, nueva: boolean | null) {
  const cuenta = (v: boolean | null) => ({ like: v === true ? 1 : 0, dislike: v === false ? 1 : 0 });
  const a = cuenta(previa);
  const b = cuenta(nueva);
  return { like: b.like - a.like, dislike: b.dislike - a.dislike };
}
