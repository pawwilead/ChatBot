import { addKeyword, EVENTS } from "@builderbot/bot";

let tmpCedula: number = 0

// 🟢 Flujo inicial
const mainFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer(`Guauuu, bienvenido/a a Pawwi, soy Bimba. ¡Existimos para que tú estés tranqui! Nos encargamos de encontrar cuidadores confiables en tu zona. ¿Qué quieres hacer hoy?`, {
        buttons: [
            { body: 'Buscar cuidador' },
            { body: 'Ser cuidador' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Buscar cuidador') return gotoFlow(askIfRegistered);
        if (choice === 'Ser cuidador') {
            await flowDynamic('Para ser un Pawwier, por favor rellena el siguiente formulario: {Link de formulario}');
            return;
        }

        return gotoFlow(mainFlow_repeat);
    });

// 🔁 Repetición en caso de opción inválida
const mainFlow_repeat = addKeyword('main_repeat')
    .addAnswer(`⚠️ Opción no válida. Por favor, elige una de las opciones.`, {
        buttons: [
            { body: 'Buscar cuidador' },
            { body: 'Ser cuidador' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Buscar cuidador') return gotoFlow(askIfRegistered);
        if (choice === 'Ser cuidador') {
            await flowDynamic('Para ser un Pawwier, por favor rellena el siguiente formulario: {Link de formulario}');
            return;
        }

        return gotoFlow(mainFlow_repeat);
    });

// 🐶 Pregunta si tiene mascota registrada
const askIfRegistered = addKeyword('ask_registered')
    .addAnswer(`¡Qué emoción! ¿Ya tienes registrado a tu peludito con nosotros?`, {
        buttons: [
            { body: 'Si' },
            { body: 'No' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Si') return gotoFlow(writeCC);
        if (choice === 'No') return gotoFlow(writeCCNew);
        return gotoFlow(askIfRegistered_repeat);
    });

// 🔁 Repetición si no responde con Si/No
const askIfRegistered_repeat = addKeyword('ask_registered_repeat')
    .addAnswer(`Por favor, elige una de las opciones. ¿Ya tienes registrado a tu peludito con nosotros?`, {
        buttons: [
            { body: 'Si' },
            { body: 'No' }
        ]
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Si') return gotoFlow(writeCC);
        if (choice === 'No') return gotoFlow(writeCCNew);
        return gotoFlow(askIfRegistered_repeat);
    });

// 🧾 Validación de cédula ya registrada
const writeCC = addKeyword('write_cc')
    .addAnswer(`Por favor, ingresa tu número de cédula: (Escribe sin puntos ni letras)`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const cedula = ctx.body.trim();
        const isValid = /^\d{6,10}$/.test(cedula);

        if (isValid) {
            await flowDynamic(`✅ Gracias. Has ingresado la cédula: *${cedula}*`);
            // Aquí puedes continuar al siguiente flujo
            return;
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(writeCC);
    });

// 🆕 Flujo para registro nuevo
const writeCCNew = addKeyword('write_cc_new')
    .addAnswer(`Perfecto, empecemos con el registro, ¿cuál es tu cédula? (Escribe sin puntos ni letras)`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const cedula = ctx.body.trim();
        const isValid = /^\d{6,10}$/.test(cedula);

        if (isValid) {
            if (!ctx.state) ctx.state = {};  // ✅ inicializamos el objeto state
            ctx.state.tmpCedula = parseInt(cedula);  // ✅ ya es seguro usarlo

            return gotoFlow(writeCCNewCheck);
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(writeCCNew);
    });



// 🔍 Confirmación de la cédula ingresada
const writeCCNewCheck = addKeyword('write_cc_check')
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
            await flowDynamic('✅ ¡Perfecto! Continuamos con tu registro...');
            return;
        }

        if (choice === 'no') {
            await flowDynamic('🔁 Vamos a intentarlo de nuevo.');
            return gotoFlow(writeCCNew);
        }

        await flowDynamic("Por favor, selecciona una opción válida.");
        return gotoFlow(writeCCNewCheck);
    });




// ✅ Exporta solo el flujo principal
export {
    mainFlow,
    askIfRegistered,
    askIfRegistered_repeat,
    writeCC,
    writeCCNew,
    writeCCNewCheck,
    mainFlow_repeat
};

