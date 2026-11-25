// GestionVideojuego: Videojuego, Categoria, Etiqueta y PersistenciaVideojuego.
import { z } from 'zod';
import { prisma } from '../../db.js';
import { noEncontrado, solicitudInvalida } from '../../shared/errores.js';
import { estaPorSalir } from '../lanzamientos/proximamente.js';
import { juegoVisible } from '../catalogo/contenidoNoApto.js';

export const videojuegoSchema = z.object({
  appId: z.coerce.number().int().positive('El AppID debe ser un entero positivo'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  descripcion: z.string().trim().max(5000).default(''),
  imagenUrl: z.url('La portada debe ser una URL válida').nullable().optional(),
  categoriaIds: z.array(z.number().int().positive()).default([]),
  etiquetaIds: z.array(z.number().int().positive()).default([]),
});
export const videojuegoUpdateSchema = videojuegoSchema.omit({ appId: true });

export const incluirClasificacion = {
  categorias: { include: { categoria: true } },
  etiquetas: { include: { etiqueta: true } },
} as const;

type ConClasificacion = {
  categorias: Array<{ categoria: { categoriaId: number; nombre: string; oculta: boolean } }>;
  etiquetas: Array<{ etiqueta: { etiquetaId: number; nombre: string; oculta: boolean } }>;
};

/** Aplana las tablas intermedias para la respuesta HTTP, sin las categorías y etiquetas ocultas. */
export function aplanar<T extends ConClasificacion>(v: T) {
  const { categorias, etiquetas, ...resto } = v;
  return {
    ...resto,
    categorias: categorias.flatMap(({ categoria: { oculta, ...c } }) => (oculta ? [] : [c])),
    etiquetas: etiquetas.flatMap(({ etiqueta: { oculta, ...e } }) => (oculta ? [] : [e])),
  };
}

async function validarReferencias(categoriaIds: number[], etiquetaIds: number[]) {
  const [cats, etqs] = await Promise.all([
    prisma.categoria.count({ where: { categoriaId: { in: categoriaIds } } }),
    prisma.etiqueta.count({ where: { etiquetaId: { in: etiquetaIds } } }),
  ]);
  if (cats !== new Set(categoriaIds).size) throw solicitudInvalida('Alguna categoría indicada no existe');
  if (etqs !== new Set(etiquetaIds).size) throw solicitudInvalida('Alguna etiqueta indicada no existe');
}

export async function consultarVideojuego(appId: number) {
  const v = await prisma.videojuego.findUnique({ where: { appId }, include: incluirClasificacion });
  // Los juegos con contenido adulto se comportan como si no existieran
  if (!v || v.contenidoAdulto) throw noEncontrado(`No existe un videojuego con AppID ${appId}`);
  const stats = await prisma.resena.aggregate({
    where: { appId },
    _avg: { calificacion: true },
    _count: true,
  });
  return {
    ...aplanar(v),
    // true mientras el juego no salió: las reseñas quedan bloqueadas
    proximamente: estaPorSalir(v),
    cantidadResenas: stats._count,
    promedioCalificacion: stats._avg.calificacion,
  };
}

export async function registrarVideojuego(datos: z.infer<typeof videojuegoSchema>) {
  await validarReferencias(datos.categoriaIds, datos.etiquetaIds);
  const v = await prisma.videojuego.create({
    data: {
      appId: datos.appId,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      imagenUrl: datos.imagenUrl ?? null,
      categorias: { create: [...new Set(datos.categoriaIds)].map((categoriaId) => ({ categoriaId })) },
      etiquetas: { create: [...new Set(datos.etiquetaIds)].map((etiquetaId) => ({ etiquetaId })) },
    },
    include: incluirClasificacion,
  });
  return aplanar(v);
}

export async function modificarVideojuego(appId: number, datos: z.infer<typeof videojuegoUpdateSchema>) {
  await validarReferencias(datos.categoriaIds, datos.etiquetaIds);
  const v = await prisma.videojuego.update({
    where: { appId },
    data: {
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      imagenUrl: datos.imagenUrl ?? null,
      categorias: {
        deleteMany: {},
        create: [...new Set(datos.categoriaIds)].map((categoriaId) => ({ categoriaId })),
      },
      etiquetas: {
        deleteMany: {},
        create: [...new Set(datos.etiquetaIds)].map((etiquetaId) => ({ etiquetaId })),
      },
    },
    include: incluirClasificacion,
  });
  return aplanar(v);
}

export async function eliminarVideojuego(appId: number) {
  await prisma.videojuego.delete({ where: { appId } });
}

// --- Categorías y etiquetas (misma forma: id + nombre único) ---

export const nombreSchema = z.object({ nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100) });

export const categorias = {
  listar: () =>
    prisma.categoria.findMany({
      where: { oculta: false },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { videojuegos: { where: { videojuego: juegoVisible } } } } },
    }),
  crear: (nombre: string) => prisma.categoria.create({ data: { nombre } }),
  modificar: (id: number, nombre: string) => prisma.categoria.update({ where: { categoriaId: id }, data: { nombre } }),
  eliminar: (id: number) => prisma.categoria.delete({ where: { categoriaId: id } }),
};

export const etiquetas = {
  listar: () =>
    prisma.etiqueta.findMany({
      where: { oculta: false },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { videojuegos: { where: { videojuego: juegoVisible } } } } },
    }),
  crear: (nombre: string) => prisma.etiqueta.create({ data: { nombre } }),
  modificar: (id: number, nombre: string) => prisma.etiqueta.update({ where: { etiquetaId: id }, data: { nombre } }),
  eliminar: (id: number) => prisma.etiqueta.delete({ where: { etiquetaId: id } }),
};
