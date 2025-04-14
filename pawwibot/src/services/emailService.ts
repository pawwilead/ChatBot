import dotenv from 'dotenv';
dotenv.config(); // <-- Esto carga las variables del .env

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendNewLeadEmail(to: string, subject: string, message: string) {
  try {
    // Logs de verificación
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '****' : '(vacía)');

    const info = await transporter.sendMail({
      from: `"Pawwi Bot" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message
    });
    console.log('✅ Correo enviado:', info.messageId);
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
  }
}
