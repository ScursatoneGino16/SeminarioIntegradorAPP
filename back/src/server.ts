import { config } from './config.js';
import { crearApp } from './app.js';
import { iniciarTareasLanzamientos } from './modulos/lanzamientos/lanzamientos.service.js';
import { iniciarLimpiezaNotificaciones } from './modulos/notificaciones/notificaciones.service.js';

crearApp().listen(config.puerto, () => {
  console.log(`API escuchando en http://localhost:${config.puerto}`);
  console.log(`Steam: ${config.steamMock ? 'MODO SIMULADO (sin STEAM_API_KEY o STEAM_MOCK=true)' : 'real'}`);
  console.log(`Mails: ${config.smtp.host ? `SMTP ${config.smtp.host}` : 'sin SMTP_HOST, se muestran en la consola'}`);
  iniciarTareasLanzamientos();
  iniciarLimpiezaNotificaciones();
});
