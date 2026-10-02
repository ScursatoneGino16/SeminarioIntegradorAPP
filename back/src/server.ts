import { config } from './config.js';
import { crearApp } from './app.js';

crearApp().listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto}`);
  console.log(`Steam: ${config.steamMock ? 'MODO SIMULADO (sin STEAM_API_KEY o STEAM_MOCK=true)' : 'real'}`);
});
