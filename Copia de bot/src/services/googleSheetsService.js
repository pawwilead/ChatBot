import { google } from 'googleapis';
import path from 'path';

const sheets = google.sheets("v4");

async function addRowToSheet(authClient, spreadsheetId, values) {
  const request = {
    spreadsheetId,
    range: "usuarios",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [values],
    },
    auth: authClient,
  };

  try {
    const response = await sheets.spreadsheets.values.append(request);
    return response;
  } catch (error) {
    console.error("Error al agregar fila:", error);
  }
}

export async function updateCaregiverSelection(senderId, caregiverName) {
  try {
    // Configurar la autenticación
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "src/credentials", "credentials.json"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const authClient = await auth.getClient();
    const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
    const range = "usuarios!A1:AA1000";
    
    // Leer la hoja completa
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      auth: authClient
    });
    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.error("No se encontraron datos en la hoja.");
      return;
    }
    
    // Buscar la fila cuyo "Número WhatsApp" (columna 2, índice 1) coincida con senderId
    // y que la columna "Cuidador Seleccionado" (columna 15, índice 14) esté vacía.
    let rowNumber = null;
    for (let i = 1; i < rows.length; i++) {
      console.log(`Comparando senderId en hoja: "${rows[i][1]}" con "${senderId}" en fila ${i+1}`);
      if (rows[i][1] === senderId && (!rows[i][14] || rows[i][14].trim() === "")) {
        rowNumber = i + 1; // Las filas en Sheets son 1-based
        break;
      }
    }
    if (rowNumber === null) {
      console.error("No se encontró la fila para actualizar el cuidador seleccionado.");
      return;
    }
    
    // Actualizar la columna "Cuidador Seleccionado" (columna 15, índice 14)
    const updateRange = `usuarios!O${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: {
        values: [[caregiverName]]
      },
      auth: authClient
    });
    console.log(`Fila ${rowNumber} actualizada con cuidador: ${caregiverName}`);
  } catch (error) {
    console.error("Error al actualizar el cuidador seleccionado:", error);
  }
}

const appendToSheet = async (data) => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), "src/credentials", "credentials.json"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const authClient = await auth.getClient();
    const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
    await addRowToSheet(authClient, spreadsheetId, data);
    return "Datos agregados correctamente";
  } catch (error) {
    console.error("Error en appendToSheet:", error);
  }
};

export default appendToSheet;
