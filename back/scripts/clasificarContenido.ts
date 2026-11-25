// Marca los juegos con contenido sexual explícito (contenido_adulto) leyendo los votos de etiquetas
// del Steam Games Dataset, sin volver a importar todo el catálogo. El importador ya lo hace solo
// con los juegos nuevos; esto sirve para una base cargada antes de que existiera la marca.
// Uso: npm run contenido:clasificar [-- data/dataset/games.json]
import { prisma } from '../src/db.js';
import { leerDatasetSteam } from '../src/modulos/catalogo/datasetSteam.js';

const ruta = process.argv[2] ?? 'data/dataset/games.json';
try {
  const adultos: number[] = [];
  let leidos = 0;
  for await (const item of leerDatasetSteam(ruta)) {
    leidos++;
    if (item.contenidoAdulto) adultos.push(item.appId);
  }
  // Una sola sentencia: marca los adultos y desmarca los que dejaron de cumplir el criterio.
  const cambiados = await prisma.$executeRaw`
    UPDATE videojuego SET contenido_adulto = (app_id = ANY(${adultos}::int[]))
    WHERE contenido_adulto <> (app_id = ANY(${adultos}::int[]))`;
  console.log(`Juegos leídos del dataset: ${leidos}. Con contenido adulto: ${adultos.length}. Filas actualizadas: ${cambiados}.`);
} finally {
  await prisma.$disconnect();
}
