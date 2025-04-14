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

export async function insertClientBasicInfo(client: conversation) {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";

        const dogsAsJson = JSON.stringify(client.dogs || []);

        // Orden correcto: Cel | CC | Name | Address | Pets
        const values = [[
            client.id,
            client.cc,
            client.name,
            client.address,
            dogsAsJson
        ]];

        const appendResponse = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "usersDB!A2",  // 👈 Empieza desde columna A (segunda fila, bajo encabezados)
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values },
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

export async function findCelInSheet(cedula: string): Promise<{
    id?: string;
    userData?: string[];
    exists: boolean;
}> {
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

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === cedula) {
                return {
                    id: cedula,
                    userData: rows[i],
                    exists: true
                };
            }
        }

        return { exists: false };
    } catch (error) {
        console.error("❌ Error al buscar cédula:", error);
        return { exists: false };
    }
}

export async function updateDogsForClient(id: string, newDogsList: { nombre: string, descripcion: string }[]) {
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

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === id) {
                const updateRange = `usersDB!E${i + 1}`; // E = columna de 'Pets'
                const dogsAsJson = JSON.stringify(newDogsList);

                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: updateRange,
                    valueInputOption: "RAW",
                    requestBody: {
                        values: [[dogsAsJson]]
                    },
                    auth: authClient
                });

                console.log(`✅ Lista de perros actualizada para ${id}`);
                return { updated: true };
            }
        }

        return { updated: false, reason: "Usuario no encontrado" };
    } catch (error) {
        console.error("❌ Error actualizando perros:", error);
        return { updated: false, error };
    }
}

export async function insertLeadRow(conv: conversation) {
    try {
        const { sheets, authClient } = await getSheetClient();
        const spreadsheetId = "1blH9C1I4CSf2yJ_8AlM9a0U2wBFh7RSiDYO8-XfKxLQ";

        const selectedDog = conv.selectedDog!;
        const values = [[
            new Date().toISOString().slice(0, 16).replace('T', ' '),
            conv.id,
            conv.cc,
            conv.name,
            selectedDog.nombre,
            selectedDog.raza,
            selectedDog.edad,
            selectedDog.peso,
            selectedDog.descripcion,
            conv.ciudad,
            conv.localidad,
            conv.barrio,
            conv.address,
            conv.tipoServicio,
            conv.tiempoServicio,
            conv.fechaServicio,
            conv.inicioServicio,
            conv.precio
        ]];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "leads",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values },
            auth: authClient
        });        

        return { inserted: true };
    } catch (error) {
        console.error("❌ Error al insertar lead:", error);
        return { inserted: false, error };
    }
}
