import dotenv from 'dotenv';
dotenv.config();
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function enviarEmail(destinatario, asunto, texto) {
  const msg = {
    to: destinatario,
    from: process.env.SENDGRID_FROM, // debe estar verificado en SendGrid
    subject: asunto,
    text: texto,
  };

  try {
    await sgMail.send(msg);
    console.log('Email enviado a', destinatario);
  } catch (error) {
    console.error('Error enviando email:', error.response?.body || error.message);
  }
}
