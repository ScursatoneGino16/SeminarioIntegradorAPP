// Proceso de carga del catálogo independiente del servidor (RNF 4).
// Uso:
//   npm run importar-catalogo -- <archivo.json> [--limpiar-huerfanas]
// Formatos aceptados (se detectan solos):
//   - Arreglo propio: [{ appId, nombre, descripcion, imagenUrl?, categorias[], etiquetas[] }]
//   - games.json del Steam Games Dataset (objeto { "<appId>": {...} }), leído en streaming.
import { open, readFile } from 'node:fs/promises';
import { prisma } from '../src/db.js';
import {
  datasetSchema,
  eliminarClasificacionesHuerfanas,
  importarCatalogo,
  type ResultadoImportacion,
} from '../src/modulos/catalogo/catalogo.service.js';
import { leerDatasetSteam } from '../src/modulos/catalogo/datasetSteam.js';

const args = process.argv.slice(2);
const ruta = args.find((a) => !a.startsWith('--'));
const limpiarHuerfanas = args.includes('--limpiar-huerfanas');
if (!ruta) {
  console.error('Uso: npm run importar-catalogo -- <archivo.json> [--limpiar-huerfanas]');
  process.exit(1);
}

/** Primer carácter no blanco del archivo: '[' → formato propio, '{' → dataset de Steam. */
async function primerCaracter(archivo: string): Promise<string> {
  const fh = await open(archivo);
  try {
    const { buffer, bytesRead } = await fh.read(Buffer.alloc(64), 0, 64, 0);
    return buffer.subarray(0, bytesRead).toString('utf8').trimStart()[0] ?? '';
  } finally {
    await fh.close();
  }
}

const inicio = Date.now();
const mostrarProgreso = (r: ResultadoImportacion) =>
  process.stdout.write(
    `\r  ${r.procesados.toLocaleString('es-AR')} procesados (${r.creados} nuevos, ${r.actualizados} actualizados, ${r.errores.length} errores) · ${Math.round((Date.now() - inicio) / 1000)} s`,
  );

try {
  const formato = await primerCaracter(ruta);
  let r: ResultadoImportacion;
  if (formato === '{') {
    console.log(`Importando Steam Games Dataset desde ${ruta} (streaming)...`);
    r = await importarCatalogo(leerDatasetSteam(ruta), { alProgresar: mostrarProgreso });
  } else {
    const items = datasetSchema.parse(JSON.parse(await readFile(ruta, 'utf8')));
    console.log(`Importando ${items.length} videojuegos desde ${ruta}...`);
    r = await importarCatalogo(items, { alProgresar: mostrarProgreso });
  }
  console.log(`\nListo: ${r.creados} creados, ${r.actualizados} actualizados, ${r.errores.length} con error.`);
  for (const e of r.errores.slice(0, 20)) console.error(`  AppID ${e.appId}: ${e.error}`);
  if (r.errores.length > 20) console.error(`  ... y ${r.errores.length - 20} más`);

  if (limpiarHuerfanas) {
    const h = await eliminarClasificacionesHuerfanas();
    console.log(`Se eliminaron ${h.categorias} categorías y ${h.etiquetas} etiquetas sin videojuegos.`);
  }
} finally {
  await prisma.$disconnect();
}
