# Integración con la Steam Web API

Este documento resume cómo se integra la aplicación con Steam y qué hace falta para usar una clave real de la Steam Web API.

## 1. Qué usa la aplicación de Steam

| Necesidad | Servicio de Steam | ¿Requiere clave? | Dónde está en el código |
| --- | --- | --- | --- |
| Iniciar sesión e identificar al usuario por SteamID (CU 1, 22) | **Steam OpenID 2.0**: `https://steamcommunity.com/openid/login` | No | `back/src/importadores/importadorSteamOpenID.ts` |
| Nombre de perfil, avatar y visibilidad | `ISteamUser/GetPlayerSummaries/v2` o, sin clave, el XML público `steamcommunity.com/profiles/<steamid>/?xml=1` | Opcional | `obtenerDatosCuenta()` en el mismo archivo |
| Biblioteca y horas de juego (CU 6, 7, RNF 10) | `IPlayerService/GetOwnedGames/v1` | **Sí** | `back/src/importadores/importadorBiblioteca.ts` |
| Datos descriptivos de los juegos (nombre, descripción, portada, géneros, etiquetas) | Se toman del **dataset** (ver README), no de la API | No | `back/src/modulos/catalogo/datasetSteam.ts` |

> Steam OpenID solo devuelve el SteamID. Por eso el nombre y el avatar hay que pedirlos aparte. Sin clave se usa el XML público del perfil, que no requiere autenticación.
>
> La lista de juegos **no** se puede obtener sin clave: la página `/games?xml=1` hoy redirige al login de Steam. Por eso, sin `STEAM_API_KEY`, la app trabaja con una biblioteca simulada.

## 2. Obtener la clave

1. Iniciar sesión en Steam con la cuenta del proyecto y entrar a **https://steamcommunity.com/dev/apikey**.
2. Completar el **nombre de dominio**. En desarrollo se puede poner `localhost`; es solo informativo, la clave funciona desde cualquier origen.
3. Aceptar los [Términos de uso de la Steam Web API](https://steamcommunity.com/dev/apiterms) y presionar **Registrar**.
4. Copiar la clave (32 caracteres hexadecimales).

**Requisito de la cuenta:** las *cuentas limitadas* (las que nunca gastaron al menos USD 5 en la tienda de Steam) **no pueden generar claves**. Steam muestra *"Access Denied. You will be granted access to Steam Web API keys when you have games in your Steam account."* Para habilitarla hay que cargar o gastar USD 5 en la tienda de Steam. Activar códigos de juegos o recibir regalos no cuenta.

## 3. Configurarla en el proyecto

En `back/.env`:

```env
STEAM_API_KEY="TU_CLAVE"
STEAM_MOCK=false
STEAM_TIMEOUT_MS=5000
ADMIN_STEAM_IDS="7656119xxxxxxxxxx"
```

Después reiniciá el back (`npm run dev`). La pantalla de login deja de mostrar los usuarios de prueba y la biblioteca pasa a leerse de Steam.

Reglas importantes de los términos de uso:

- **La clave es secreta.** *"You agree that you will keep your Steam Web API key confidential, and not to share it with any third party."* Por eso vive solo en el back (`.env`, que está en `.gitignore`) y **nunca** se manda al navegador ni se sube a GitHub. Cada integrante del grupo puede usar su propia clave.
- **Límite de uso:** 100.000 llamadas por día. La app consulta `GetOwnedGames` solo al abrir "Mi biblioteca" o al publicar una reseña, así que queda muy por debajo.

## 4. Llamadas que hace el back

### GetOwnedGames (biblioteca y horas)

```
GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/
    ?key=<STEAM_API_KEY>
    &steamid=<SteamID64>
    &include_played_free_games=1
    &format=json
```

Respuesta con biblioteca pública:

```json
{ "response": { "game_count": 2, "games": [
  { "appid": 1245620, "playtime_forever": 8155 },
  { "appid": 730, "playtime_forever": 120 }
] } }
```

- `playtime_forever` viene en **minutos**. La app lo convierte a horas con un decimal y lo guarda en `UsuarioXVideojuego.horas_jugadas` y, al publicar, en `Resena.horas_al_comentar` (RNF 10).
- Si la biblioteca es **privada**, Steam responde `{"response":{}}`, sin `game_count`. La app lo interpreta como biblioteca privada y no deja reseñar (CU 7).
- Solo se guardan los juegos que existen en el catálogo, que se relacionan por **AppID**. Por eso hay que cargar el dataset completo para que coincidan los juegos reales del usuario.

### GetPlayerSummaries (nombre y avatar)

```
GET https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=<STEAM_API_KEY>&steamids=<SteamID64>
```

Se usan `personaname`, `avatarfull` y `communityvisibilitystate` (3 = público).

## 5. Privacidad del usuario

Para que Steam devuelva la biblioteca, el usuario tiene que tener en Steam, en **Perfil → Editar perfil → Configuración de privacidad**:

- **Mi perfil:** Público.
- **Detalles de juego:** Público. Además, desmarcar *"Mantener siempre privado el tiempo de juego total"* si se quiere que se vean las horas.

La API **no puede saltear** esta configuración: si es privada, la app muestra el aviso correspondiente en "Mi biblioteca".

## 6. Tiempo de respuesta y fallos (RNF 1 y RNF 6)

- Todas las llamadas a Steam pasan por `fetchSteam()` (`back/src/importadores/steamHttp.ts`), que corta a los `STEAM_TIMEOUT_MS` (5 s) con `AbortSignal.timeout`.
- Ante un timeout, un error de red o una respuesta HTTP no exitosa, se lanza `SteamNoDisponibleError` (HTTP 503) y:
  - "Mi biblioteca" muestra la última copia guardada (`desdeCache: true`);
  - al publicar una reseña se usan las horas guardadas, o se responde 503 si no hay datos;
  - el catálogo y las reseñas siguen funcionando porque solo usan la base local.

## 7. Cómo probar la integración

```bash
# Verificar la clave sin levantar la app (reemplazar KEY y STEAMID)
curl "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=KEY&steamid=STEAMID&include_played_free_games=1"
```

En la app: iniciar sesión con Steam, entrar a **Mi biblioteca** y presionar **Actualizar desde Steam**. Deberían aparecer tus juegos que estén en el catálogo, con sus horas.

## Fuentes

- Steam Web API, documentación para desarrolladores: https://steamcommunity.com/dev
- Términos de uso de la Steam Web API: https://steamcommunity.com/dev/apiterms
- `IPlayerService` (GetOwnedGames): https://partner.steamgames.com/doc/webapi/IPlayerService
- Clave para cuentas limitadas: https://steamcommunity.com/discussions/forum/1/3266809889823316316/
