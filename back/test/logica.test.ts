import { describe, expect, it } from 'vitest';
import { deltaValoracion } from '../src/modulos/resenas/organizarResena.js';
import { construirFiltro } from '../src/modulos/catalogo/catalogo.service.js';
import { campoXml, construirUrlLogin, extraerSteamId } from '../src/importadores/importadorSteamOpenID.js';
import { perfilSimulado } from '../src/importadores/importadorPerfilSteam.js';
import { bibliotecaSimulada } from '../src/importadores/importadorBiblioteca.js';
import { listadoSchema, modificarResenaSchema } from '../src/modulos/resenas/resena.service.js';
import { desdeDatasetSteam } from '../src/modulos/catalogo/datasetSteam.js';
import { esContenidoAdulto } from '../src/modulos/catalogo/contenidoNoApto.js';
import { INSIGNIAS_JUEGO, RANGOS_CUENTA, insigniaPorHoras, rangoCuenta } from '../src/modulos/insignias/clasificaciones.js';
import { amigosSimulados } from '../src/importadores/importadorAmigosSteam.js';
import { parsearFechaSteam } from '../src/importadores/importadorLanzamientos.js';
import { estaPorSalir } from '../src/modulos/lanzamientos/proximamente.js';
import { adjuntoSchema, extensionImagen } from '../src/modulos/adjuntos/adjuntos.service.js';

describe('deltaValoracion', () => {
  it('suma un like nuevo', () => expect(deltaValoracion(null, true)).toEqual({ like: 1, dislike: 0 }));
  it('cambia like por dislike', () => expect(deltaValoracion(true, false)).toEqual({ like: -1, dislike: 1 }));
  it('quita un dislike', () => expect(deltaValoracion(false, null)).toEqual({ like: 0, dislike: -1 }));
  it('repetir la misma valoración no cambia nada', () => expect(deltaValoracion(true, true)).toEqual({ like: 0, dislike: 0 }));
});

describe('validación de reseñas (RNF 11)', () => {
  it('acepta 1 a 5 estrellas y hasta 1200 caracteres', () => {
    expect(modificarResenaSchema.safeParse({ calificacion: 5, comentario: 'a'.repeat(1200) }).success).toBe(true);
  });
  it('rechaza 0 o 6 estrellas', () => {
    expect(modificarResenaSchema.safeParse({ calificacion: 0, comentario: 'x' }).success).toBe(false);
    expect(modificarResenaSchema.safeParse({ calificacion: 6, comentario: 'x' }).success).toBe(false);
  });
  it('rechaza comentarios de más de 1200 caracteres o vacíos', () => {
    expect(modificarResenaSchema.safeParse({ calificacion: 3, comentario: 'a'.repeat(1201) }).success).toBe(false);
    expect(modificarResenaSchema.safeParse({ calificacion: 3, comentario: '   ' }).success).toBe(false);
  });
});

describe('construirFiltro', () => {
  it('sin filtros devuelve todo lo visible', () =>
    expect(construirFiltro({ categorias: [], etiquetas: [] })).toEqual({ AND: [{ contenidoAdulto: false }] }));
  it('una búsqueda numérica también busca por AppID', () => {
    const f = construirFiltro({ q: '730', categorias: [], etiquetas: [] });
    expect(JSON.stringify(f)).toContain('"appId":730');
  });
  it('exige todas las categorías y etiquetas elegidas (además de que el juego sea visible)', () => {
    const f = construirFiltro({ categorias: [1, 2], etiquetas: [5] });
    expect(f.AND).toHaveLength(4);
  });
});

describe('Steam OpenID', () => {
  it('arma la URL de login con return_to y realm', () => {
    const url = new URL(construirUrlLogin('http://localhost:5173/api/auth/steam/retorno', 'http://localhost:5173'));
    expect(url.origin).toBe('https://steamcommunity.com');
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    expect(url.searchParams.get('openid.return_to')).toBe('http://localhost:5173/api/auth/steam/retorno');
  });
  it('extrae el SteamID del claimed_id', () => {
    expect(extraerSteamId('https://steamcommunity.com/openid/id/76561197960435530')).toBe('76561197960435530');
    expect(extraerSteamId('https://evil.com/openid/id/76561197960435530')).toBeNull();
  });
});

describe('bibliotecaSimulada', () => {
  it('es determinística', () => {
    expect(bibliotecaSimulada('76561198000000001', [1, 2, 3, 4, 5])).toEqual(
      bibliotecaSimulada('76561198000000001', [1, 2, 3, 4, 5]),
    );
  });
  it('SteamID terminado en 000 simula biblioteca privada', () => {
    expect(bibliotecaSimulada('76561198000000000', [1, 2, 3])).toEqual({ publica: false, juegos: [] });
  });
});

describe('desdeDatasetSteam', () => {
  it('mapea géneros a categorías en español y toma las etiquetas más votadas', () => {
    const item = desdeDatasetSteam('1245620', {
      name: 'ELDEN RING',
      short_description: 'Action RPG',
      header_image: 'https://x/header.jpg',
      genres: ['Action', 'RPG'],
      tags: { 'Open World': 5078, 'Souls-like': 6994, Fantasy: 3226 },
      positive: 900,
      negative: 100,
    });
    expect(item).toEqual({
      appId: 1245620,
      nombre: 'ELDEN RING',
      descripcion: 'Action RPG',
      imagenUrl: 'https://x/header.jpg',
      categorias: ['Acción', 'RPG'],
      etiquetas: ['Souls-like', 'Open World', 'Fantasy'],
      votosSteam: 1000,
      contenidoAdulto: false,
    });
  });
  it('acepta tags vacíos como arreglo y descarta entradas sin nombre', () => {
    expect(desdeDatasetSteam('10', { name: 'X', tags: [] })?.etiquetas).toEqual([]);
    expect(desdeDatasetSteam('10', { name: '  ' })).toBeNull();
    expect(desdeDatasetSteam('abc', { name: 'X' })).toBeNull();
  });
});

describe('perfilSimulado', () => {
  it('es estable, con nivel de 1 a 60 y EXP coherente', () => {
    const p = perfilSimulado('76561198000000002');
    expect(p).toEqual(perfilSimulado('76561198000000002'));
    expect(p.nivel).toBeGreaterThanOrEqual(1);
    expect(p.nivel).toBeLessThanOrEqual(60);
    expect(p.experiencia!.actual).toBeGreaterThanOrEqual(p.experiencia!.inicioNivel);
    expect(p.experiencia!.faltante).toBeGreaterThan(0);
  });
  it('SteamID terminado en 000 simula un perfil privado', () => {
    expect(perfilSimulado('76561198000000000').nivel).toBeNull();
  });
});

describe('perfil público de Steam (XML)', () => {
  const xml = `<profile><steamID64>76561197960287930</steamID64><steamID><![CDATA[Rabscuttle]]></steamID>
    <visibilityState>3</visibilityState><avatarFull><![CDATA[https://avatars.akamai.steamstatic.com/a_full.jpg]]></avatarFull></profile>`;
  it('lee nombre, avatar y visibilidad', () => {
    expect(campoXml(xml, 'steamID')).toBe('Rabscuttle');
    expect(campoXml(xml, 'avatarFull')).toBe('https://avatars.akamai.steamstatic.com/a_full.jpg');
    expect(campoXml(xml, 'visibilityState')).toBe('3');
    expect(campoXml(xml, 'noExiste')).toBeNull();
  });
});

describe('clasificación por horas de juego (insignia por juego)', () => {
  const titulo = (h: number) => insigniaPorHoras(h)?.titulo;
  it('respeta los límites de cada escalón', () => {
    expect([0, 4.9].map(titulo)).toEqual(['Recién llegado', 'Recién llegado']);
    expect([5, 19.9].map(titulo)).toEqual(['Explorador', 'Explorador']);
    expect([20, 50, 100, 200, 400, 800, 1500].map(titulo)).toEqual([
      'Combatiente', 'Veterano', 'Experto', 'Maestro', 'Campeón', 'Leyenda', 'Héroe de leyenda',
    ]);
    expect([2999.9, 3000, 1e6].map(titulo)).toEqual(['Héroe de leyenda', 'Trascendente', 'Trascendente']);
  });
  it('informa la posición del escalón (0 = I)', () => {
    expect(insigniaPorHoras(0)?.nivel).toBe(0);
    expect(insigniaPorHoras(3000)?.nivel).toBe(INSIGNIAS_JUEGO.length - 1);
  });
  it('los escalones están ordenados de menor a mayor', () => {
    for (const lista of [INSIGNIAS_JUEGO, RANGOS_CUENTA])
      expect(lista.map((e) => e.desde)).toEqual([...lista.map((e) => e.desde)].sort((a, b) => a - b));
  });
});

describe('clasificación por horas totales de Steam (rango de cuenta)', () => {
  const titulo = (h: number) => rangoCuenta(h)?.titulo;
  it('respeta los límites de cada rango', () => {
    expect([0, 49.9].map(titulo)).toEqual(['Novato', 'Novato']);
    expect([50, 199.9].map(titulo)).toEqual(['Aprendiz', 'Aprendiz']);
    expect([200, 500, 1000, 2500, 5000].map(titulo)).toEqual(['Aventurero', 'Guerrero', 'Maestro', 'Paladín', 'Héroe legendario']);
    expect([9999.9, 10000].map(titulo)).toEqual(['Héroe legendario', 'Mítico']);
  });
  it('informa el siguiente rango', () => {
    expect(rangoCuenta(600)?.siguiente?.titulo).toBe('Maestro');
    expect(rangoCuenta(1e7)?.siguiente).toBeNull();
  });
  it('sin horas conocidas no hay rango', () => expect(rangoCuenta(null)).toBeNull());
});

describe('amigos', () => {
  const ids = ['76561198000000101', '76561198000000102', '76561198000000103', '76561198000000104', '76561198000000105'];
  it('las amistades simuladas de Steam son simétricas', () => {
    for (const a of ids)
      for (const b of ids) {
        if (a === b) continue;
        expect(amigosSimulados(a, ids).steamIds.includes(b)).toBe(amigosSimulados(b, ids).steamIds.includes(a));
      }
  });
  it('nadie es su propio amigo y los SteamID terminados en 000 tienen la lista privada', () => {
    expect(amigosSimulados(ids[0], ids).steamIds).not.toContain(ids[0]);
    expect(amigosSimulados('76561198000000000', ids)).toEqual({ publica: false, steamIds: [] });
  });
  it('las reseñas de amigos se piden sin steamId (de un juego o como actividad)', () => {
    expect(listadoSchema.safeParse({ deAmigos: 'true' }).success).toBe(true);
    expect(listadoSchema.safeParse({ deAmigos: 'true', appId: '620' }).success).toBe(true);
    expect(listadoSchema.safeParse({ deAmigos: 'true', steamId: ids[0] }).success).toBe(false);
    expect(listadoSchema.safeParse({}).success).toBe(false);
  });
});

describe('fechas de lanzamiento de Steam', () => {
  it('entiende "22 Oct, 2026" y "Oct 22, 2026"', () => {
    expect(parsearFechaSteam('22 Oct, 2026')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
    expect(parsearFechaSteam('Oct 22, 2026')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
    expect(parsearFechaSteam('3 September 2027')?.toISOString()).toBe('2027-09-03T00:00:00.000Z');
  });
  it('devuelve null para fechas aproximadas o inválidas', () => {
    for (const t of ['Q1 2027', '2027', 'Coming soon', 'To be announced', '31 Feb, 2027']) expect(parsearFechaSteam(t)).toBeNull();
  });
  it('bloquea las reseñas hasta el día de salida', () => {
    const fecha = new Date('2026-10-22T00:00:00Z');
    expect(estaPorSalir({ proximamente: true, fechaLanzamiento: fecha }, new Date('2026-10-21T12:00:00Z'))).toBe(true);
    expect(estaPorSalir({ proximamente: true, fechaLanzamiento: fecha }, new Date('2026-10-22T00:00:00Z'))).toBe(false);
    expect(estaPorSalir({ proximamente: true, fechaLanzamiento: null })).toBe(true);
    expect(estaPorSalir({ proximamente: false, fechaLanzamiento: null })).toBe(false);
  });
});

describe('adjuntos de reseñas', () => {
  it('reconoce el tipo de imagen por sus bytes', () => {
    expect(extensionImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(extensionImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(extensionImagen(Buffer.from('GIF89a...'))).toBe('gif');
    expect(extensionImagen(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });
  it('solo acepta GIFs servidos por Giphy', () => {
    expect(adjuntoSchema.safeParse({ tipo: 'gif', url: 'https://media2.giphy.com/media/abc/200.gif?cid=1' }).success).toBe(true);
    expect(adjuntoSchema.safeParse({ tipo: 'gif', url: 'https://giphy.com.evil.net/x.gif' }).success).toBe(false);
    expect(adjuntoSchema.safeParse({ tipo: 'gif', url: 'http://media.giphy.com/x.gif' }).success).toBe(false);
  });
  it('las imágenes deben ser subidas a la app', () => {
    expect(adjuntoSchema.safeParse({ tipo: 'imagen', url: 'https://otro.sitio/foto.png' }).success).toBe(false);
    expect(adjuntoSchema.safeParse({ tipo: 'imagen', url: '/api/uploads/../../.env' }).success).toBe(false);
  });
});

describe('contenido no apto', () => {
  it('oculta juegos donde Hentai/NSFW pesan frente a la etiqueta principal', () => {
    expect(esContenidoAdulto({ 'Visual Novel': 1000, Hentai: 980 })).toBe(true);
    expect(esContenidoAdulto({ 'Sexual Content': 500, Nudity: 480, NSFW: 95, Simulation: 300 })).toBe(true);
  });
  it('no oculta juegos con etiquetas adultas puestas en broma (Blender, LEGO)', () => {
    expect(esContenidoAdulto({ 'Design & Illustration': 1000, NSFW: 110 })).toBe(false);
  });
  it('no oculta RPG maduros sin Hentai/NSFW (Cyberpunk 2077)', () => {
    expect(esContenidoAdulto({ 'Open World': 1000, Nudity: 800, 'Sexual Content': 700 })).toBe(false);
  });
  it('sin votos de etiquetas no oculta nada', () => expect(esContenidoAdulto({})).toBe(false));
});
