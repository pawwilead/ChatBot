import { google } from 'googleapis';
import path from 'path';
import { JWT } from 'google-auth-library';
import { conversation } from '~/model/models';

const sheets = google.sheets("v4");

async function getSheetClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), "src/credentials", "credentials.json"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const authClient = await auth.getClient() as JWT;
    return { sheets, authClient };
}

export async function getClientBasicInfoByCC(cedula: string): Promise<{
    id: number,
    name: string,
    cc: number,
    address: string
} | null> {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
        const range = "usersDB!A1:D1000"; // A: id, B: name, C: cc, D: address

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: authClient
        });

        const rows = response.data.values || [];

        // Buscar por cédula en columna C (índice 2)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][2] === cedula || rows[i][2] === String(cedula)) {
                return {
                    id: Number(rows[i][0]),
                    name: rows[i][1],
                    cc: Number(rows[i][2]),
                    address: rows[i][3]
                };
            }
        }

        // No encontrado
        return null;
    } catch (error) {
        console.error("❌ Error al obtener cliente:", error);
        return null;
    }
}


export async function insertClientBasicInfo(client: conversation) {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";
        const range = "usersDB"; // se usa solo el nombre de la hoja

        // Formatear los datos: cada valor en una celda de la misma fila
        const values = [[
            client.id,
            client.name,
            client.cc,
            client.address
        ]];

        const appendResponse = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values
            },
            auth: authClient
        });

        const updatedRange = appendResponse.data?.updates?.updatedRange;

        if (updatedRange) {
            console.log(`✅ Cliente insertado en rango: ${updatedRange}`);
        }

        return { added: true };
    } catch (error) {
        console.error("❌ Error al insertar cliente:", error);
        return { added: false, error };
    }
}

export async function findCedulaInSheet(id) {
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
            //console.log(rows[i][0]);
            
            if (rows[i][0] === id) {
                
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

        // Agregar nueva fila: cedula en A, campos vacíos en B-D, perroJson en E
        const appendResponse = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "usersDB",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [[cedula, "", "", "", perroJson]]
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
