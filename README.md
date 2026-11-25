# SteamVault (Grupo 08)

**SteamVault** es una aplicación web para consultar y publicar reseñas de videojuegos de Steam. El acceso es solo con cuenta de Steam (OpenID); la biblioteca y las horas de juego se leen de la Steam Web API.

| Capa | Tecnología |
| --- | --- |
| Front (`front/`) | React 19 + Vite + TypeScript + React Router + Tailwind CSS 4 + 8bitcn-ui |
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

### Estética

La interfaz imita a los RPG de 16 bits (Final Fantasy IV/VI, Chrono Trigger, Dragon Quest, EarthBound): ventanas de menú azules con bisel, cursor de mano, tipografías pixeladas (Jacquard 24, Tiny5 y DotGothic16), fondo animado y animaciones cortas (apertura de ventanas, transición de batalla al entrar a un juego, diálogos letra por letra, destellos y números flotantes). Todas las animaciones se desactivan si el sistema tiene activado "reducir movimiento".

En **Perfil → Configuración** cada usuario elige el fondo, el marco del retrato y si se muestran el avatar animado, el marco de avatar y el fondo de perfil de Steam (se guarda en el navegador).

El pixel art viene de bancos de recursos libres (OpenGameArt, Kenney, Pixel Icon Library). Los créditos y licencias están en [`front/public/sprites/CREDITOS.md`](front/public/sprites/CREDITOS.md).

### Steam real o modo simulado

- **Iniciar sesión con Steam** siempre usa Steam real (OpenID 2.0, sin contraseñas). El nombre de perfil y el avatar se toman de la Web API si hay clave, o si no del XML público del perfil.
- **Sin `STEAM_API_KEY`** (o con `STEAM_MOCK=true`), la **biblioteca y las horas se simulan**, porque Steam no las expone sin clave. Además, el login muestra usuarios de prueba. Un SteamID terminado en `000` simula una biblioteca privada.
- **Con clave** (`STEAM_API_KEY` y `STEAM_MOCK=false`), la biblioteca y las horas se leen de Steam y se cruzan con el catálogo por AppID. Para que coincidan tus juegos tiene que estar cargado el dataset completo.
- **Perfil de Steam**: la página de perfil muestra nivel y barra de EXP, antigüedad de la cuenta, juegos y horas totales (con clave), y el avatar animado, el marco de avatar y el fondo de perfil equipados (los toma de un endpoint de Steam no documentado que no requiere clave). En modo simulado, el nivel, la EXP y las horas son valores de prueba.
- **Administradores**: poné sus SteamID en `ADMIN_STEAM_IDS`, separados por coma. En modo simulado, `76561198000000001` ("Admin de prueba") sirve como admin.

En **[docs/integracion-steam-web-api.md](docs/integracion-steam-web-api.md)** está cómo obtener y configurar la clave, sus requisitos y límites, la privacidad del perfil y las llamadas que se hacen.

### Clasificaciones

SteamVault tiene dos sistemas de clasificación, los dos según horas de juego. Se muestran juntos en la ventana del perfil.

| | Rango de cuenta (horas totales de Steam) | | Insignia por juego (horas en ese juego) |
| --- | --- | --- | --- |
| I | Novato · 0–49 h | I | Recién llegado · 0–4 h |
| II | Aprendiz · 50–199 h | II | Explorador · 5–19 h |
| III | Aventurero · 200–499 h | III | Combatiente · 20–49 h |
| IV | Guerrero · 500–999 h | IV | Veterano · 50–99 h |
| V | Maestro · 1.000–2.499 h | V | Experto · 100–199 h |
| VI | Paladín · 2.500–4.999 h | VI | Maestro · 200–399 h |
| VII | Héroe legendario · 5.000–9.999 h | VII | Campeón · 400–799 h |
| VIII | Mítico · 10.000 h o más | VIII | Leyenda · 800–1.499 h |
| | | IX | Héroe de leyenda · 1.500–2.999 h |
| | | X | Trascendente · 3.000 h o más |

- El **rango de cuenta** cuenta todos los juegos de la cuenta de Steam, no solo los del catálogo. En el perfil aparece con una barra hacia el rango siguiente.
- La **insignia por juego** es una medalla (un metal distinto por escalón). El perfil muestra las de los juegos con más horas, con opción a ver todas, y cada reseña muestra la del autor en ese juego.
- Las tablas están en `back/src/modulos/insignias/clasificaciones.ts`. Se calculan con la última biblioteca guardada, así que no agregan consultas a Steam. Con la biblioteca privada no hay rango ni insignias.

### Amigos

La amistad es propia de SteamVault: uno manda una **solicitud** y el otro la **acepta**. Los amigos de Steam se usan solo como **sugerencias** ("estos amigos tuyos de Steam ya usan SteamVault"), así la app no depende de que Steam responda ni de la privacidad de la lista de amigos.

- **Amigos** (menú): pestañas de amigos, solicitudes recibidas y enviadas, sugerencias y actividad (últimas reseñas de tus amigos).
- En el **perfil** de otro usuario: agregar, cancelar, aceptar o rechazar la solicitud, o eliminar la amistad.
- En la página de un **juego**: filtro *De mis amigos* para ver solo sus reseñas.
- Si dos usuarios se mandan solicitud mutuamente, la amistad se acepta sola.
- Las sugerencias usan `GetFriendList` (requiere clave y lista de amigos pública). En modo simulado, la "amistad en Steam" entre dos usuarios registrados se decide con un hash del par.

### Notificaciones

La **campanita** del encabezado muestra cuántas notificaciones sin leer hay y un panel con las últimas. *Ver todas* abre `/notificaciones`. Se notifica cuando:

| Tipo | Cuándo |
| --- | --- |
| Solicitud de amistad | alguien te manda una (se borra sola si la cancela) |
| Amistad aceptada | aceptan tu solicitud |
| Me gusta | a alguien le gusta tu reseña. Los "Me gusta" sin leer de una misma reseña se agrupan ("A Ana y 3 más…") |
| Reseña de un amigo | un amigo publica una reseña |
| Lanzamiento | sale mañana un juego del que pediste aviso (además del mail) |

El contador se actualiza cada 30 s, **pero solo si hubo actividad en el último minuto**: como cada request renueva la sesión, consultar sin parar haría que la sesión no venza nunca por inactividad (RNF 3). Las notificaciones leídas se borran a los 90 días.

### Próximos lanzamientos y avisos por mail

En **Lanzamientos** hay un calendario mensual con los próximos juegos populares de la tienda de Steam (en el celular se ve como agenda). Al entrar a un juego que todavía no salió, las **reseñas están bloqueadas** hasta el día de salida y se puede dejar un **mail para recibir un aviso 24 h antes** del lanzamiento. El mail trae un enlace para darse de baja.

- Los lanzamientos se leen de la tienda de Steam (no hace falta API key): la búsqueda de *próximos populares* y `/api/appdetails` para la fecha. El servidor los actualiza cada `LANZAMIENTOS_HORAS` (6 por defecto), y también se puede hacer a mano con `npm run lanzamientos:actualizar` o desde el botón *Actualizar desde Steam* (admin).
- Los juegos nuevos se agregan al catálogo. Si Steam no da un día exacto ("Q1 2027"), el juego aparece en *Sin fecha exacta* y el aviso se envía cuando se confirme el día.
- Cada 10 minutos el servidor envía los avisos de los juegos que salen en las próximas 24 h. **Sin `SMTP_HOST`, los mails se imprimen en la consola del back**, así se puede probar sin una cuenta de correo. Para enviarlos de verdad, completá `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM` (sirve cualquier SMTP: Gmail con contraseña de aplicación, Mailtrap, Brevo, etc.).

### GIFs e imágenes en las reseñas

Las reseñas admiten hasta **4 adjuntos**: GIFs buscados en Giphy o imágenes subidas (PNG, JPG, GIF o WEBP, hasta `MAX_MB_IMAGEN` MB, 3 por defecto).

- **GIFs**: conseguí una clave gratuita en https://developers.giphy.com/ y ponela en `GIPHY_API_KEY`. La búsqueda pasa por el back, así la clave no llega al navegador. Sin clave, el botón *+ GIF* no aparece.
- **Imágenes**: se guardan en `back/uploads/` (`UPLOADS_DIR`) con un nombre aleatorio. El tipo se verifica por el contenido del archivo, no por la extensión.

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

**Contenido no apto.** Para poder presentar la app en un ámbito académico, cierto contenido se **oculta** (no se borra, así se puede revertir):

- Las categorías *Violento, Gore, Desnudos y Contenido sexual* y las etiquetas *Violent, Gore, Blood, Sexual Content, Nudity, Mature, Hentai y NSFW* no aparecen en los filtros ni en las fichas de los juegos. Los juegos con esas categorías siguen visibles.
- Los juegos con **contenido sexual explícito** (~1.000) no aparecen en ningún lado: catálogo, búsqueda, ficha, reseñas, biblioteca, insignias ni calendario. Se detectan con los **votos** de las etiquetas del dataset: Hentai o NSFW tienen que pesar frente a la etiqueta más votada del juego. Tener la etiqueta no alcanza, porque en Steam la comunidad las vota a veces en broma (Blender tiene "NSFW"), y RPG maduros como Cyberpunk 2077 o Baldur's Gate 3 siguen visibles.
- Las listas y el criterio están en `back/src/modulos/catalogo/contenidoNoApto.ts`. El importador marca los juegos nuevos solo; para volver a clasificar una base ya cargada: `npm run contenido:clasificar`.

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
| `npm run lanzamientos:actualizar [-- cantidad]` | Trae los próximos lanzamientos de la tienda de Steam (100 por defecto) |
| `npm run contenido:clasificar` | Vuelve a marcar los juegos con contenido sexual explícito según el dataset (~40 s) |
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
│   ├── importadorLanzamientos.ts próximos lanzamientos de la tienda de Steam
│   ├── importadorAmigosSteam.ts  amigos de Steam (para sugerencias)
│   └── steamHttp.ts              timeout de 5 s y errores de Steam
└── modulos/                      CapaLogicaPersistente
    ├── usuario/                  GestionUsuario: Usuario, Perfil, Sesion, autorización
    ├── videojuego/               GestionVideojuego: Videojuego, Categoria, Etiqueta
    ├── catalogo/                 GestionCatalogo: búsqueda, filtros, importación del dataset
    ├── resenas/                  GestionPublicacionYGestionReseñas: Reseña, OrganizarReseña
    ├── insignias/                clasificaciones: rango de cuenta e insignias por juego
    ├── amigos/                   GestionAmigos: solicitudes, amistades y sugerencias
    ├── notificaciones/           GestionNotificaciones: campanita
    ├── lanzamientos/             calendario, avisos por mail y actualización desde la tienda
    └── adjuntos/                 GIFs (Giphy) e imágenes subidas
back/src/docs/openapi.ts          Documentación Swagger / OpenAPI
front/src/pages/                  CapaPresentacionWeb (Catálogo, Videojuego, Perfil, Biblioteca, Lanzamientos, Amigos, Notificaciones, Admin)
```

El modelo de datos (`back/prisma/schema.prisma`) sigue el DER: Usuario, Videojuego, Categoria, Etiqueta, Reseña, UsuarioXVideojuego, VideojuegoXCategoria, VideojuegoXEtiqueta y ValoracionXReseña, más AdjuntoReseña (GIFs e imágenes), SuscripcionLanzamiento (avisos por mail), Amistad y Notificacion. Videojuego guarda además la fecha de lanzamiento y si todavía no salió, y Usuario las horas totales de Steam (para el rango de cuenta). Suma la tabla de sesiones y dos columnas de apoyo: `videojuego.votos_steam` (popularidad en Steam para ordenar el catálogo) y `usuario.perfil_actualizado_en` (el nombre y el avatar se vuelven a leer de Steam cada 6 horas, sin tener que reiniciar sesión). Los SteamID se guardan como texto porque son enteros de 64 bits.

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
