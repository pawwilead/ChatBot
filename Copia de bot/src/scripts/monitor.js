import cron from 'node-cron';
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import messageHandler from '../services/messageHandler.js';

dotenv.config();

// Configurar autenticación para Google Sheets
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "src/credentials", "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

// Crear la instancia de Sheets
const sheets = google.sheets({ version: "v4", auth });

// Obtener el ID de la hoja desde el .env o usar un valor por defecto
const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";

// Definir el rango a leer (incluyendo 27 columnas: A hasta AA)
const range = "usuarios!A1:AA1000";

async function readSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    return response.data.values;
  } catch (error) {
    console.error("Error al leer la hoja:", error);
    return [];
  }
}

async function markRowAsNotified(rowNumber) {
  try {
    // Se asume que la columna "Notificación Enviada" es la columna Q (índice 17, letra Q)
    const updateRange = `usuarios!Q${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Si"]]
      }
    });
    console.log(`Fila ${rowNumber} marcada como notificada.`);
  } catch (error) {
    console.error("Error al actualizar la fila:", error);
  }
}

async function processRows() {
  const rows = await readSheet();
  if (!rows || rows.length <= 1) {
    console.log("No hay datos o solo está la cabecera.");
    return;
  }

  // La primera fila es la cabecera. Recorremos desde la segunda fila.
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Aseguramos que la fila tenga al menos 27 columnas (A-AA)
    while (row.length < 27) {
      row.push("");
    }
    console.log(`Fila ${i + 1}:`, row);

    // Definición de índices (0-based):
    // - Estado de la Solicitud ("listo") en columna P (índice 15)
    // - Notificación Enviada en columna Q (índice 16)
    // - Cuidador Seleccionado en columna O (índice 14)
    // - Fecha del Servicio en columna L (índice 11)
    // - Hora del Servicio en columna M (índice 12)
    // - Confirmación de la Cita en columna AA (índice 26)
    const estadoSolicitud = row[15] ? row[15].trim().toLowerCase() : "";
    const notificado = row[16] ? row[16].trim().toLowerCase() === "si" : false;
    const confirmacion = row[26] ? row[26].trim().toLowerCase() : "";
    console.log(`Estado solicitud: "${estadoSolicitud}", Confirmación: "${confirmacion}", Notificado: ${notificado}`);

    // Si la solicitud está "listo" y la confirmación es "confirmada" y aún no se ha notificado, enviamos la notificación final
    if (estadoSolicitud === "listo" && confirmacion === "confirmada" && !notificado) {
      const senderId = row[1]; // Número WhatsApp (columna B)
      const scheduleDate = row[11]; // Fecha del Servicio
      const scheduleTime = row[12]; // Hora del Servicio
      const selectedCaregiver = row[14]; // Cuidador Seleccionado
      // Puedes calcular el precio según la lógica de tu negocio
      const price = "valor calculado";
      const details = { scheduleDate, scheduleTime, selectedCaregiver, price };
      try {
        await messageHandler.notifyUserFinalConfirmation(senderId, details);
        console.log(`Notificación final enviada al usuario con senderId ${senderId}`);
        await markRowAsNotified(i + 1);
      } catch (error) {
        console.error(`Error notificando final para senderId ${senderId}:`, error);
      }
    }
    // Si el estado es "listo" pero la confirmación aún no está marcada, enviar las opciones de cuidadores (si no se han enviado)
    else if (estadoSolicitud === "listo" && !notificado) {
      const senderId = row[1];
      const caretakers = [
        { name: row[17], activity: row[18], age: row[19] },
        { name: row[20], activity: row[21], age: row[22] },
        { name: row[23], activity: row[24], age: row[25] }
      ];
      try {
        await messageHandler.notifyUserWithCaretakerOptions(senderId, caretakers);
        console.log(`Notificación de opciones enviada al usuario con senderId ${senderId}`);
        // Aquí no marcamos la fila como notificada, ya que la notificación final depende de la confirmación.
      } catch (error) {
        console.error(`Error notificando opciones para senderId ${senderId}:`, error);
      }
    }
  }
}

// Ejecuta el proceso cada minuto
cron.schedule('* * * * *', async () => {
  console.log("⏳ Ejecutando monitor de solicitudes...", new Date().toLocaleString());
  await processRows();
});

console.log("🚀 Monitor de solicitudes iniciado...");
