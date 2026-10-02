import { describe, expect, it } from 'vitest';
import { deltaValoracion } from '../src/modulos/resenas/organizarResena.js';
import { construirFiltro } from '../src/modulos/catalogo/catalogo.service.js';
import { campoXml, construirUrlLogin, extraerSteamId } from '../src/importadores/importadorSteamOpenID.js';
import { bibliotecaSimulada } from '../src/importadores/importadorBiblioteca.js';
import { modificarResenaSchema } from '../src/modulos/resenas/resena.service.js';
import { desdeDatasetSteam } from '../src/modulos/catalogo/datasetSteam.js';

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
  it('sin filtros devuelve todo', () => expect(construirFiltro({ categorias: [], etiquetas: [] })).toEqual({}));
  it('una búsqueda numérica también busca por AppID', () => {
    const f = construirFiltro({ q: '730', categorias: [], etiquetas: [] });
    expect(JSON.stringify(f)).toContain('"appId":730');
  });
  it('exige todas las categorías y etiquetas elegidas', () => {
    const f = construirFiltro({ categorias: [1, 2], etiquetas: [5] });
    expect(f.AND).toHaveLength(3);
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
    });
  });
  it('acepta tags vacíos como arreglo y descarta entradas sin nombre', () => {
    expect(desdeDatasetSteam('10', { name: 'X', tags: [] })?.etiquetas).toEqual([]);
    expect(desdeDatasetSteam('10', { name: '  ' })).toBeNull();
    expect(desdeDatasetSteam('abc', { name: 'X' })).toBeNull();
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
