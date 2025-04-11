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

export async function insertNewClientWithPet(cedula: string, nombrePerro: string, descripcion: string) {
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

        // Verificar si ya existe esa cédula
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === cedula) {
                return { exists: true };
            }
        }

        // JSON del perro
        const perroJson = JSON.stringify({
            nombre: nombrePerro,
            descripcion: descripcion
        });

        // Agregar nueva fila con cédula + JSON del perro
        const appendResponse = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "usersDB",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [[cedula, perroJson]]
            },
            auth: authClient
        });

        const updatedRange = appendResponse.data?.updates?.updatedRange;

        if (updatedRange) {
            console.log(`✅ Cliente con cédula ${cedula} registrado en rango: ${updatedRange}`);
        }

        return { exists: false, added: true };
    } catch (error) {
        console.error("❌ Error al registrar cliente con perro:", error);
        return { exists: false, added: false, error: true };
    }
}

export async function addDogToExistingClient(cedula: string, nuevoPerro: { nombre: string, descripcion: string }) {
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
        let rowIndexToUpdate = -1;
        let perrosActuales = [];

        // Buscar cédula y obtener lista de perros
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === cedula) {
                rowIndexToUpdate = i;
                try {
                    perrosActuales = JSON.parse(rows[i][1] || "[]");
                    if (!Array.isArray(perrosActuales)) perrosActuales = [];
                } catch {
                    perrosActuales = [];
                }
                break;
            }
        }

        if (rowIndexToUpdate === -1) {
            return { updated: false, error: "Cedula no encontrada" };
        }

        perrosActuales.push(nuevoPerro);

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `usersDB!B${rowIndexToUpdate + 1}`,
            valueInputOption: "RAW",
            requestBody: {
                values: [[JSON.stringify(perrosActuales)]]
            },
            auth: authClient
        });

        return { updated: true };
    } catch (error) {
        console.error("Error al agregar nuevo perro:", error);
        return { updated: false, error: true };
    }
}

export async function getDogsFromCedula(cedula: string): Promise<{ nombre: string, descripcion: string }[]> {
    const { sheets, authClient } = await getSheetClient();
    const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
    const range = "usersDB!A1:AA1000";

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        auth: authClient
    });

    const rows = response.data.values || [];

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === cedula) {
            try {
                const perros = JSON.parse(rows[i][1] || "[]");
                return Array.isArray(perros) ? perros : [];
            } catch (err) {
                console.error("🐾 Error parseando perros:", err);
                return [];
            }
        }
    }

    return [];
}
