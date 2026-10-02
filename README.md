# SeminarioIntegradorAPP — Sistema de Reseñas (Grupo 08)

Aplicación web para consultar y publicar reseñas de videojuegos de Steam. El acceso es solo con cuenta de Steam (OpenID); la biblioteca y las horas de juego se leen de la Steam Web API.

| Capa | Tecnología |
| --- | --- |
| Front (`front/`) | React 19 + Vite + TypeScript + React Router |
| Back (`back/`) | Node.js + Express 5 + TypeScript + Prisma + Zod |
| Base de datos | PostgreSQL 17 (Docker) |

## Puesta en marcha

Requisitos: Node 20 o superior y Docker.

```bash
# 1. Base de datos (PostgreSQL en el puerto 5433)
docker compose up -d

# 2. Back
cd back
cp .env.example .env          # editar si hace falta (ver abajo)
npm install
npm run db:deploy             # crea las tablas
npm run dataset:descargar     # baja el Steam Games Dataset (~1 GB) a data/dataset/
npm run db:seed:steam         # importa ~142.000 juegos (tarda ~2 min)
npm run dev                   # http://localhost:3000

# 3. Front (en otra terminal)
cd front
npm install
npm run dev                   # http://localhost:5173
```

> Si solo querés probar rápido, `npm run db:seed` carga un catálogo chico de 48 juegos (`data/catalogo.json`) en lugar del dataset completo.

Abrí http://localhost:5173. La documentación de la API (Swagger) está en **http://localhost:5173/api/docs** (también en http://localhost:3000/api/docs; el JSON OpenAPI está en `/api/docs.json`). El front reenvía `/api` al back, así que el navegador trabaja con un solo origen (la cookie de sesión y el retorno de Steam funcionan sin CORS).

### Steam real o modo simulado

- **Iniciar sesión con Steam** siempre usa Steam real (OpenID 2.0, sin contraseñas). El nombre de perfil y el avatar se toman de la Web API si hay clave, o si no del XML público del perfil.
- **Sin `STEAM_API_KEY`** (o con `STEAM_MOCK=true`), la **biblioteca y las horas se simulan**, porque Steam no las expone sin clave. Además, el login muestra usuarios de prueba. Un SteamID terminado en `000` simula una biblioteca privada.
- **Con clave** (`STEAM_API_KEY` y `STEAM_MOCK=false`), la biblioteca y las horas se leen de Steam y se cruzan con el catálogo por AppID. Para que coincidan tus juegos tiene que estar cargado el dataset completo.
- **Administradores**: poné sus SteamID en `ADMIN_STEAM_IDS`, separados por coma. En modo simulado, `76561198000000001` ("Admin de prueba") sirve como admin.

En **[docs/integracion-steam-web-api.md](docs/integracion-steam-web-api.md)** está cómo obtener y configurar la clave, sus requisitos y límites, la privacidad del perfil y las llamadas que se hacen.

### Dataset del catálogo

El catálogo se alimenta del [Steam Games Dataset](https://huggingface.co/datasets/FronkonGames/steam-games-dataset) (FronkonGames, licencia MIT, ~142.000 juegos). Cómo se mapea:

| Dataset | Aplicación |
| --- | --- |
| clave del objeto (AppID) | `Videojuego.appId` |
| `name`, `short_description`, `header_image` | nombre, descripción, portada |
| `genres` (traducidos al español) | Categorías |
| `tags` (las 20 más votadas) | Etiquetas |
| `positive` + `negative` | `votosSteam` (popularidad, para ordenar) |

El catálogo se ordena por defecto como **Recomendado**: primero los juegos de tu biblioteca de Steam (por horas jugadas), después los más reseñados en la plataforma, luego los más votados en Steam y por último el resto. La biblioteca se sincroniza en segundo plano al iniciar sesión.

El importador (`npm run importar-catalogo -- <archivo>`) lee el archivo en streaming y procesa lotes de 500 juegos, cada uno en una transacción corta, así que se puede ejecutar con la app en uso (RNF 4). Volver a ejecutarlo actualiza los juegos existentes. `--limpiar-huerfanas` borra categorías y etiquetas que quedaron sin juegos.

### Scripts útiles (back)

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor con recarga automática |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | Verificación de tipos |
| `npm run dataset:descargar` | Descarga el Steam Games Dataset a `data/dataset/games.json` |
| `npm run db:seed:steam` | Importa el dataset completo |
| `npm run importar-catalogo -- archivo.json` | Importa o actualiza juegos desde un archivo (formato propio o dataset de Steam) |
| `npm run db:migrate` | Crea una migración nueva después de cambiar `schema.prisma` |

Formato propio de importación (también lo acepta *Administración → Importar catálogo*; si no se pasa `imagenUrl`, se usa la portada de Steam):

```json
[{ "appId": 620, "nombre": "Portal 2", "descripcion": "...", "categorias": ["Aventura"], "etiquetas": ["Puzzle"] }]
```

## Arquitectura

El back replica los componentes de la *Vista Arquitectónica de Diseño Detallada*:

```
back/src/
├── importadores/                 CapaLogicaNoPersistente / ProcesosImportadores
│   ├── importadorSteamOpenID.ts  login OpenID + datos de cuenta (DatosCuentaSteamID)
│   ├── importadorBiblioteca.ts   biblioteca y horas (InformacionVideojuegosDeUsuario)
│   └── steamHttp.ts              timeout de 5 s y errores de Steam
└── modulos/                      CapaLogicaPersistente
    ├── usuario/                  GestionUsuario: Usuario, Perfil, Sesion, autorización
    ├── videojuego/               GestionVideojuego: Videojuego, Categoria, Etiqueta
    ├── catalogo/                 GestionCatalogo: búsqueda, filtros, importación del dataset
    └── resenas/                  GestionPublicacionYGestionReseñas: Reseña, OrganizarReseña
back/src/docs/openapi.ts          Documentación Swagger / OpenAPI
front/src/pages/                  CapaPresentacionWeb (Catálogo, Videojuego, Perfil, Biblioteca, Admin)
```

El modelo de datos (`back/prisma/schema.prisma`) sigue el DER: Usuario, Videojuego, Categoria, Etiqueta, Reseña, UsuarioXVideojuego, VideojuegoXCategoria, VideojuegoXEtiqueta y ValoracionXReseña. Suma la tabla de sesiones y dos columnas de apoyo: `videojuego.votos_steam` (popularidad en Steam para ordenar el catálogo) y `usuario.perfil_actualizado_en` (el nombre y el avatar se vuelven a leer de Steam cada 6 horas, sin tener que reiniciar sesión). Los SteamID se guardan como texto porque son enteros de 64 bits.

### Requerimientos no funcionales

| RNF | Cómo se resuelve |
| --- | --- |
| 1. Tiempo de respuesta de Steam | Toda llamada a Steam tiene un tope de `STEAM_TIMEOUT_MS` (5000 ms) con `AbortSignal.timeout` |
| 2. Autenticación con Steam | Solo Steam OpenID 2.0 con verificación `check_authentication`; no se guardan contraseñas |
| 3. Expiración de sesión | Sesión en PostgreSQL con `rolling` y `maxAge` de 30 min: vence tras 30 min sin actividad y el front redirige al login |
| 4. Actualización del catálogo | Importador independiente (script o endpoint de admin) que procesa cada juego en una transacción corta |
| 6. Tolerancia a fallos de Steam | Catálogo y reseñas se leen solo de la base local; si Steam falla, la biblioteca se sirve desde la última copia guardada |
| 8. Integridad | Claves foráneas, `UNIQUE(steam_id, app_id)` en reseñas (una por usuario y juego) y `CHECK` de calificación y contadores |
| 9. Autorización | El servidor verifica que la reseña sea del usuario antes de editarla o borrarla; las rutas de admin exigen rol |
| 10. Horas históricas | `horas_al_comentar` se guarda al publicar y no cambia al editar |
| 11. Validación | Zod en el back (1 a 5 estrellas, hasta 1200 caracteres) y validación en el formulario |
| 7. Diseño responsivo | CSS adaptable a escritorio, tablet y móvil |

## API

La documentación completa e interactiva está en Swagger: **`/api/docs`**. Todas las rutas, salvo `/api/auth/*`, piden sesión iniciada. Para usar "Try it out", iniciá sesión en la app (o ejecutá `POST /api/auth/dev-login` desde Swagger en modo simulado): la cookie se envía sola porque Swagger se sirve desde el mismo origen.
