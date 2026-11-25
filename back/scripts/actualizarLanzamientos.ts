// Trae los próximos lanzamientos de la tienda de Steam (también lo hace el servidor cada LANZAMIENTOS_HORAS).
// Uso: npm run lanzamientos:actualizar [-- cantidad]
import { prisma } from '../src/db.js';
import { actualizarLanzamientos } from '../src/modulos/lanzamientos/lanzamientos.service.js';

const cantidad = Number(process.argv[2]) || 100;
try {
  await actualizarLanzamientos({ cantidad, alProgresar: console.log });
} finally {
  await prisma.$disconnect();
}
