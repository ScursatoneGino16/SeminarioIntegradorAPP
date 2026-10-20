# Sistema de Reseñas — Tecnologías e implementación

Seminario Integrador · Grupo 08

---

## 1. Justificación de las tecnologías elegidas

La aplicación es una **SPA (Single Page Application)** en React que consume una **API REST** en Node.js. Los datos se guardan en **PostgreSQL**. Se usa **TypeScript** en todas las capas, así el equipo trabaja con un único lenguaje y los errores de tipos aparecen al compilar y no en producción.

### Back-end

| Tecnología | Para qué se usa | Por qué se eligió |
| --- | --- | --- |
| **Node.js + TypeScript** | Entorno de ejecución del servidor | Su modelo asíncrono se adapta bien a una app que espera respuestas de un servicio externo (Steam) sin bloquear al resto de los usuarios (RNF 1 y 6). Se comparte el lenguaje con el front y los tipos estáticos reducen errores. |
| **Express 5** | Framework HTTP y ruteo | Es minimalista, estándar y muy documentado. En la versión 5 los errores de las funciones `async` llegan solos al manejador central, lo que simplifica el código. Permite organizar la API en módulos que respetan la Vista Arquitectónica. |
| **PostgreSQL 17** | Base de datos relacional | El modelo es claramente relacional (DER con tablas intermedias N a N). Garantiza integridad referencial, claves únicas y restricciones `CHECK` (RNF 8). Además soporta búsquedas sin distinguir mayúsculas (`ILIKE`) y consultas por lotes sobre los ~142.000 juegos del catálogo. |
| **Prisma ORM** | Acceso a datos y migraciones | Define el modelo en un solo archivo (`schema.prisma`) que refleja el DER, genera un cliente con tipos y versiona los cambios de esquema con migraciones. Cuando hace falta, también permite escribir SQL directo, como en el orden "Recomendado" o la importación masiva. |
| **Zod** | Validación de datos de entrada | Valida en el servidor cada cuerpo y parámetro de la API: 1 a 5 estrellas, hasta 1200 caracteres, SteamID de 17 dígitos (RNF 11). Los mismos esquemas generan la documentación de Swagger, así no quedan desactualizados. |
| **express-session + connect-pg-simple** | Gestión de sesiones | La sesión se guarda en PostgreSQL y viaja en una cookie `httpOnly`. Con `rolling` y `maxAge` vence tras **30 minutos de inactividad** (RNF 3). La autorización se verifica siempre en el servidor (RNF 9). |
| **Steam OpenID 2.0** | Autenticación | Es el mecanismo oficial de Steam. La app nunca ve ni guarda contraseñas: solo recibe el SteamID ya verificado (RNF 2). |
| **Steam Web API** | Biblioteca, horas de juego y perfil | Es la única fuente oficial de la biblioteca y las horas jugadas de cada usuario. También aporta el nivel y la experiencia, la antigüedad de la cuenta y los ítems equipados del perfil (avatar animado, marco y fondo). Las llamadas tienen un tope de 5 s con `AbortSignal.timeout` (RNF 1). |
| **stream-json** | Lectura del dataset del catálogo | El dataset de Steam pesa ~1 GB y no entra en memoria como texto. Este paquete lo lee de a partes, sin cargarlo entero. |
| **Swagger UI + OpenAPI 3.1** | Documentación de la API | Ofrece documentación navegable y la posibilidad de probar cada endpoint desde el navegador (`/api/docs`). |
| **Vitest** | Pruebas unitarias | Es rápido, compatible con TypeScript sin configuración y con una sintaxis estándar (`describe` / `it` / `expect`). Mitiga el riesgo R-05 (cobertura de pruebas insuficiente). |

### Front-end

| Tecnología | Para qué se usa | Por qué se eligió |
| --- | --- | --- |
| **React 19** | Interfaz de usuario | Es la biblioteca de UI más difundida. Permite armar componentes reutilizables, como la tarjeta de reseña, el selector de estrellas o la paginación, que se usan en varias pantallas. |
| **Vite** | Servidor de desarrollo y empaquetado | Arranca al instante, recarga en caliente y genera builds optimizados. Además, su **proxy** reenvía `/api` al back, así el navegador ve un único origen: la cookie de sesión y el retorno de Steam OpenID funcionan sin configurar CORS. |
| **React Router** | Navegación entre pantallas | Da URLs propias a cada vista (`/videojuegos/:appId`, `/usuarios/:steamId`) y protege las rutas que requieren sesión o rol de administrador. |
| **Tailwind CSS 4 + 8bitcn-ui** | Estilos y componentes | La interfaz imita a los RPG de 16 bits. 8bitcn-ui (sobre shadcn/ui) aporta componentes con estética pixelada (botones, buscador, selector) y Tailwind permite ajustarlos sin escribir CSS a mano para cada caso. El resto de las pantallas usa un CSS propio con variables (ventanas, avisos, reseñas), cargado en una capa de Tailwind para que ambos convivan. Todo es **responsivo** (RNF 7). |
| **Pixel art libre (CC0 / CC-BY)** | Fondos, íconos, marcos y efectos | Se toman de bancos de recursos libres (OpenGameArt, Kenney, Pixel Icon Library) en lugar de dibujarlos, con sus licencias registradas en `front/public/sprites/CREDITOS.md`. |

### Infraestructura

| Tecnología | Por qué se eligió |
| --- | --- |
| **Docker Compose** | Levanta PostgreSQL con un solo comando (`docker compose up -d`). Todos los integrantes trabajan con la misma versión de base de datos, sin instalarla en su máquina. |
| **Git + GitHub** | Versionado del código y trabajo en equipo, igual que con la documentación del proyecto. |

### Relación con los requerimientos no funcionales

| RNF | Tecnología o decisión que lo resuelve |
| --- | --- |
| 1. Tiempo de respuesta de Steam | Node asíncrono y `AbortSignal.timeout(5000)` en todas las llamadas a Steam |
| 2. Autenticación con Steam | Steam OpenID 2.0 con verificación `check_authentication` |
| 3. Expiración de sesión | `express-session` con `rolling` y `maxAge` de 30 min, sesiones guardadas en PostgreSQL |
| 4. Actualización del catálogo | Importador independiente del servidor que procesa lotes en transacciones cortas |
| 6. Tolerancia a fallos de Steam | Catálogo y reseñas en la base local; copia de la biblioteca como respaldo |
| 7. Diseño responsivo | Tailwind y CSS adaptables a escritorio, tablet y celular; las animaciones respetan "reducir movimiento" |
| 8. Integridad de datos | PostgreSQL con claves foráneas, `UNIQUE` y `CHECK`, más migraciones de Prisma |
| 9. Control de autorización | Middlewares de sesión y rol, y verificación del dueño de cada reseña en el servidor |
| 10. Horas históricas | Columna `horas_al_comentar` que se escribe al publicar y no cambia al editar |
| 11. Validación | Zod en el back y validación en los formularios del front |

---

## 2. Breve descripción de la implementación

### Arquitectura

El sistema replica la **Vista Arquitectónica de Diseño Detallada**: cada componente lógico del diagrama tiene su módulo en el back y su pantalla en el front.

```
┌────────────────────── CapaPresentacionWeb (front/ · React) ───────────────────────┐
│  Login · Catálogo · Videojuego · Perfil · Mi biblioteca · Administración           │
└──────────────────────────────────┬─────────────────────────────────────────────────┘
                                   │ HTTP/JSON  (/api, cookie de sesión)
┌──────────────────── CapaLogicaPersistente (back/src/modulos · Express) ───────────┐
│  usuario/     GestionUsuario       Usuario, Perfil, Sesion, autorización           │
│  videojuego/  GestionVideojuego    Videojuego, Categoria, Etiqueta                 │
│  catalogo/    GestionCatalogo      búsqueda, filtros, orden, importación           │
│  resenas/     GestionPublicacionYGestionReseñas   Reseña, OrganizarReseña          │
│                         │ Prisma                                                    │
│                    PostgreSQL                                                       │
└──────────────────────────────────┬─────────────────────────────────────────────────┘
                                   │
┌────────────── CapaLogicaNoPersistente (back/src/importadores) ────────────────────┐
│  importadorSteamOpenID   login y datos de la cuenta (DatosCuentaSteamID)           │
│  importadorBiblioteca    biblioteca y horas (InformacionVideojuegosDeUsuario)      │
│  steamHttp               tiempo máximo de 5 s y manejo de fallos de Steam          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Cada módulo separa las **rutas** (`*.routes.ts`: reciben la petición, validan con Zod y verifican la sesión) de los **servicios** (`*.service.ts`: reglas de negocio y acceso a datos con Prisma). Los errores se traducen a respuestas HTTP en un único manejador central.

### Modelo de datos

El esquema de Prisma sigue el DER: `Usuario`, `Videojuego`, `Categoria`, `Etiqueta`, `Resena`, `UsuarioXVideojuego`, `VideojuegoXCategoria`, `VideojuegoXEtiqueta` y `ValoracionXResena`. Se agregaron:

- la tabla `session`, para las sesiones;
- `videojuego.votos_steam`, la popularidad en Steam, para ordenar el catálogo;
- `usuario.perfil_actualizado_en`, para refrescar nombre y avatar cada 6 horas.

Los SteamID se guardan como texto porque son enteros de 64 bits. La regla "una reseña por usuario y juego" está garantizada por una clave única `(steam_id, app_id)`.

El esquema evolucionó con tres migraciones versionadas: la inicial, la que eliminó las reacciones con emoji (quedaron fuera de alcance) y la de popularidad y perfil.

### Integración con Steam

1. **Login:** el usuario va a Steam y Steam lo devuelve a `/api/auth/steam/retorno`. El back verifica la firma con Steam, obtiene el SteamID, lee nombre y avatar y crea la sesión. Después sincroniza la biblioteca en segundo plano.
2. **Biblioteca:** `GetOwnedGames` devuelve los juegos y los minutos jugados. Se guardan en `UsuarioXVideojuego` solo los que existen en el catálogo, cruzados por **AppID**.
3. **Fallos:** si Steam tarda más de 5 s o falla, se usa la última copia guardada. El catálogo y las reseñas siguen disponibles porque no dependen de Steam.
4. **Modo simulado:** sin clave de la Web API, la biblioteca se simula y hay usuarios de prueba. Así el sistema se puede desarrollar y presentar sin depender de Steam.

### Catálogo

El catálogo se carga desde el **Steam Games Dataset** (FronkonGames, licencia MIT): **142.430 videojuegos, 33 categorías y 452 etiquetas**.

- Los géneros pasan a ser Categorías (traducidos al español) y las 20 etiquetas más votadas de cada juego, Etiquetas.
- El importador lee el archivo de a partes y guarda lotes de 500 juegos, cada uno en una transacción corta. La carga completa tarda menos de 2 minutos y se puede ejecutar con la app en uso (RNF 4).

### Flujo de publicación de una reseña

1. El front envía la calificación y el comentario. El back los valida con Zod.
2. Se verifica que el juego exista y que el usuario no lo haya reseñado antes.
3. Se consulta la biblioteca en Steam (CU 6). Si es privada o el juego no está, se rechaza con un mensaje claro.
4. Se guarda la reseña junto con las **horas jugadas en ese momento** (RNF 10).

### Calidad

- **19 pruebas unitarias** (Vitest) sobre validaciones, cálculo de "Me gusta", filtros del catálogo, login de Steam, lectura del perfil, datos simulados del perfil de Steam y adaptación del dataset.
- Verificación de tipos en back y front (`tsc`).
- Pruebas de punta a punta de la API y la interfaz durante el desarrollo, incluida la autorización: un usuario no puede editar ni borrar reseñas ajenas.
- Documentación de los 29 endpoints con Swagger en `/api/docs`.

---

## 3. Principales funcionalidades desarrolladas

### Usuario y sesión

- **Iniciar sesión con Steam** (CU 1, 22): sin registro ni contraseñas propias. Se muestran el nombre y el avatar reales de Steam.
- **Expiración automática** de la sesión tras 30 minutos sin actividad, con aviso y regreso al login.
- **Consultar mi biblioteca** (CU 6): juegos de Steam presentes en el catálogo con sus horas jugadas, avisos si la biblioteca es privada o si Steam no responde, y botón para actualizar.
- **Consultar perfil de usuario** (CU 12): propio o de otro usuario, como una pantalla de estado de RPG: nivel de Steam con barra de EXP, antigüedad de la cuenta, juegos y horas totales, avatar animado, marco de avatar y fondo de perfil de Steam, e historial de reseñas.
- **Configuración**: fondo, marco del retrato y qué ítems del perfil de Steam mostrar.

### Catálogo y videojuegos

- **Consultar catálogo** (CU 2) con paginación.
- **Orden "Recomendado"**: primero los juegos de la biblioteca del usuario (por horas jugadas), después los más reseñados en la plataforma, luego los más votados en Steam y el resto. También se puede ordenar por votos de Steam, cantidad de reseñas, nombre o AppID.
- Insignia **"En tu biblioteca · X h"** en los juegos propios.
- **Buscar videojuego** (CU 3) por nombre o por AppID.
- **Filtrar** (CU 4) por categorías y etiquetas (CU 23, 24). Se pueden combinar y las etiquetas tienen un buscador.
- **Consultar videojuego** (CU 5): portada, descripción, categorías, etiquetas, calificación promedio y cantidad de reseñas.

### Reseñas

- **Registrar reseña** (CU 7): de 1 a 5 estrellas y hasta 1200 caracteres. Solo para juegos de la biblioteca (que debe ser pública), una por juego, y guarda las horas jugadas al publicar.
- **Consultar reseñas** (CU 8) de un juego, ordenadas por cantidad de "Me gusta".
- **Modificar reseña** (CU 9) propia. Las horas registradas se conservan.
- **Eliminar reseña** (CU 10) propia, con confirmación.
- **Valorar reseñas** (CU 11) de otros usuarios con "Me gusta" / "No me gusta". Se puede cambiar o quitar el voto, y no se pueden valorar las propias.

### Administración (rol Administrador)

- **ABM de videojuegos** (CU 13, 14, 15): alta indicando AppID, nombre, descripción, portada, categorías y etiquetas.
- **ABM de categorías** (CU 16, 17, 18) y **etiquetas** (CU 19, 20, 21), con la cantidad de juegos asociados a cada una.
- **Importar catálogo** desde un archivo JSON, desde la interfaz o por consola.

### Transversales

- **Interfaz responsiva** para escritorio, tablet y celular, con estética de RPG de 16 bits y animaciones cortas que respetan "reducir movimiento".
- **Tolerancia a fallos de Steam**: la app sigue funcionando con los datos locales.
- **Documentación interactiva de la API** con Swagger.
- **Modo simulado** para desarrollar y presentar sin clave de Steam.
