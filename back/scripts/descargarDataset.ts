// Descarga el Steam Games Dataset (games.json, ~1 GB) a data/dataset/games.json.
// Uso: npm run dataset:descargar
import { createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { URL_DATASET_STEAM } from '../src/modulos/catalogo/datasetSteam.js';

const destino = 'data/dataset/games.json';
const temporal = `${destino}.descargando`;

await mkdir('data/dataset', { recursive: true });
const res = await fetch(URL_DATASET_STEAM);
if (!res.ok || !res.body) {
  console.error(`No se pudo descargar el dataset (HTTP ${res.status})`);
  process.exit(1);
}
const total = Number(res.headers.get('content-length') ?? 0);
let recibidos = 0;
const cuerpo = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream);
cuerpo.on('data', (c: Buffer) => {
  recibidos += c.length;
  const mb = (recibidos / 1e6).toFixed(0);
  process.stdout.write(total ? `\r  ${mb} / ${(total / 1e6).toFixed(0)} MB` : `\r  ${mb} MB`);
});
await pipeline(cuerpo, createWriteStream(temporal));
await rename(temporal, destino);
console.log(`\nDataset guardado en ${destino}`);
