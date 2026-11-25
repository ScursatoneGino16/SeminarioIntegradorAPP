// Envío de mails (avisos de lanzamiento). Sin SMTP_HOST el mail se imprime en la consola,
// así se puede probar el flujo completo en desarrollo sin una cuenta de correo.
import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporte = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.puerto,
      secure: config.smtp.puerto === 465,
      auth: config.smtp.usuario ? { user: config.smtp.usuario, pass: config.smtp.clave } : undefined,
    })
  : null;

export interface Mail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

export async function enviarMail(mail: Mail) {
  if (!transporte) {
    console.log(`[mail sin SMTP] Para: ${mail.para} · Asunto: ${mail.asunto}\n${mail.texto}\n`);
    return;
  }
  await transporte.sendMail({ from: config.mailRemitente, to: mail.para, subject: mail.asunto, text: mail.texto, html: mail.html });
}
