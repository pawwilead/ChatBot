import { addKeyword, EVENTS } from "@builderbot/bot";
import { findCedulaInSheet } from "~/services/googleSheetsService";

// 🟢 Flujo inicial
const start = addKeyword(EVENTS.WELCOME)
    .addAnswer(`Guauuu, bienvenido/a a Pawwi, soy Bimba. ¡Existimos para que tú estés tranqui! Nos encargamos de encontrar cuidadores confiables en tu zona. ¿Qué quieres hacer hoy?`, {
        buttons: [
            { body: 'Buscar cuidador' },
            { body: 'Ser cuidador' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Buscar cuidador') return gotoFlow(b1);
        if (choice === 'Ser cuidador') {
            await flowDynamic('Para ser un Pawwier, por favor rellena el siguiente formulario: https://form.jotform.com/250937943404057');
            return;
        }

        return gotoFlow(start_repeat);
    });

// 🔁 Repetición en caso de opción inválida
const start_repeat = addKeyword('main_repeat')
    .addAnswer(`⚠️ Opción no válida. Por favor, elige una de las opciones.`, {
        buttons: [
            { body: 'Buscar cuidador' },
            { body: 'Ser cuidador' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Buscar cuidador') return gotoFlow(b1);
        if (choice === 'Ser cuidador') {
            await flowDynamic('Para ser un Pawwier, por favor rellena el siguiente formulario: {Link de formulario}');
            return;
        }

        return gotoFlow(start_repeat);
    });

// 🐶 Pregunta si tiene mascota registrada
const b1 = addKeyword('ask_registered')
    .addAnswer(`¡Qué emoción! ¿Ya tienes registrado a tu peludito con nosotros?`, {
        buttons: [
            { body: 'Si' },
            { body: 'No' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Si') return gotoFlow(c1);
        if (choice === 'No') return gotoFlow(c2);
        return gotoFlow(b1_repeat);
    });

// 🔁 Repetición si no responde con Si/No
const b1_repeat = addKeyword('ask_registered_repeat')
    .addAnswer(`Por favor, elige una de las opciones. ¿Ya tienes registrado a tu peludito con nosotros?`, {
        buttons: [
            { body: 'Si' },
            { body: 'No' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Si') return gotoFlow(c1);
        if (choice === 'No') return gotoFlow(c2);
        return gotoFlow(b1_repeat);
    });

// 🧾 Validación de cédula ya registrada
const c1 = addKeyword('write_cc')
    .addAnswer(`Por favor, ingresa tu número de cédula: (Escribe sin puntos ni letras)`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const cedula = ctx.body.trim();
        const isValid = /^\d{6,10}$/.test(cedula);

        if (isValid) {
            const existe = await findCedulaInSheet(cedula);
            
            if (existe) {
                await flowDynamic(`✅ La cédula *${cedula}* ya está registrada. Bienvenido de nuevo.`);
            } else {
                return gotoFlow(e1);
            }
            return;
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(c1);
    });

// 🧾 Validación de cédula ya registrada
const e1 = addKeyword('write_cc')
.addAnswer(`Upss, no apareces registrado, vuelve a escribir tu cedula`)
.addAnswer('', { capture: true })
.addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    const cedula = ctx.body.trim();
    const isValid = /^\d{6,10}$/.test(cedula);

    if (isValid) {
        const existe = await findCedulaInSheet(cedula);
        if (existe) {
            await flowDynamic(`✅ La cédula *${cedula}* ya está registrada. Bienvenido de nuevo.`);
        } else {
            return gotoFlow(e2);
        }
        return;
    }

    await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
    return gotoFlow(c1);
});

// 🧾 Validación de cédula ya registrada
const e2 = addKeyword('write_cc')
    .addAnswer(`Al parecer no apareces registrado, asi que empecemos registrandote, el numero de cedula que ingresaste es correcto?`, {
        buttons: [
            { body: 'Si' },
            { body: 'No' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Si') return gotoFlow(i1);
        if (choice === 'No') return gotoFlow(c1);
        return gotoFlow(b1_repeat);
    });



const i1 = addKeyword('write_cc')
    .addAnswer(`Guauuu, que bien, ¿Cómo se llama tu peludito?`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const newPet = ctx.body.trim();
        return gotoFlow(k1);
    });

const k1 = addKeyword('write_cc')
    .addAnswer(`Describenos a {perro}, que raza es, cuantos años tiene, si es sociable, y consideraciones adicionales que tenga tu perro`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const newPetName = ctx.body.trim();
        return gotoFlow(c1);
    });

// 🆕 Flujo para registro nuevo
const c2 = addKeyword('write_cc_new')
    .addAnswer(`Empecemos con el registro, ¿cuál es tu cédula? (Escribe sin puntos ni letras)`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const cedula = ctx.body.trim();
        const isValid = /^\d{6,10}$/.test(cedula);

        if (isValid) {
            if (!ctx.state) ctx.state = {};  // ✅ inicializamos el objeto state
            ctx.state.tmpCedula = parseInt(cedula);  // ✅ ya es seguro usarlo

            return gotoFlow(e3);
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(c2);
    });



// 🔍 Confirmación de la cédula ingresada
const e3 = addKeyword('write_cc_check')
    .addAction(async (ctx, { flowDynamic }) => {
        const cedula = ctx.state?.tmpCedula || '[cédula no encontrada]';

        await flowDynamic([
            {
                body: `Tu cédula es ${cedula}, ¿es correcto?`,
                buttons: [
                    { body: 'Si' },
                    { body: 'No' }
                ]
            }
        ]);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body.toLowerCase();

        if (choice === 'si' || choice === 'sí') {
            return gotoFlow(i1);
        }

        if (choice === 'no') {
            await flowDynamic('🔁 Vamos a intentarlo de nuevo.');
            return gotoFlow(c2);
        }

        await flowDynamic("Por favor, selecciona una opción válida.");
        return gotoFlow(e3);
    });




// ✅ Exporta solo el flujo principal
export {
    start,
    start_repeat,
    b1,
    b1_repeat,
    c1,
    c2,
    e1,
    e2,
    e3,
};


