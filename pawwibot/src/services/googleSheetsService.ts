import { google } from 'googleapis';
import path from 'path';
import { JWT } from 'google-auth-library';

const sheets = google.sheets("v4");

async function getSheetClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), "src/credentials", "credentials.json"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const authClient = await auth.getClient() as JWT;
    return { sheets, authClient };
}

export async function findCedulaInSheet(cedula) {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
        const range = "usersDB!A1:AA1000";

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: authClient
        });

        const rows = response.data.values || [];

        // Recorremos desde la segunda fila (i = 1)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === cedula) {
                
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error("Error al buscar o agregar cédula:", error);
        return false;
    }
}

export async function insertNewClient(cedula) {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
        const range = "usersDB!A1:AA1000";

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: authClient
        });

        const rows = response.data.values || [];

        // Recorremos desde la segunda fila (i = 1)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === cedula) {
                return { exists: true };
            }
        }

        // No encontrada, agregarla
        const appendResponse = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "usersDB",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [[cedula]]
            },
            auth: authClient
        });
        const updatedRange = appendResponse.data?.updates?.updatedRange;

        if (updatedRange) {
            console.log(`✅ Cédula ${cedula} insertada en rango: ${updatedRange}`);
        } else {
            console.log(`⚠️ No se pudo determinar la celda exacta para la cédula ${cedula}`);
        }


        return { exists: false, added: true };
    } catch (error) {
        console.error("Error al buscar o agregar cédula:", error);
        return { exists: false, added: false, error: true };
    }
}
