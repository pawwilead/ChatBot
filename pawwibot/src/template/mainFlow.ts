import { addKeyword, EVENTS } from "@builderbot/bot";
import { conversation } from "~/model/models";
import { findCedulaInSheet } from "~/services/googleSheetsService";

const conversations: { [key: string]: conversation } = {};

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

const i1 = addKeyword('write_cc_new')
    .addAnswer(`Guauuu, que bien, ¿Cómo se llama tu peludito?`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const nombre = ctx.body.trim();

        if (!ctx.state) ctx.state = {};
        conversations[ctx.from].newDog = nombre

        return gotoFlow(k1);
    });

const k1 = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic }) => {
        const petName = conversations[ctx.from].newDog || '[vacio]';

        await flowDynamic(`Describenos a *${petName}*: ¿Qué raza es, cuántos años tiene, si es sociable y cualquier consideración adicional que debamos saber?`);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const descripcion = ctx.body.trim();

        if (!ctx.state) ctx.state = {};
        conversations[ctx.from].newDogDescription = descripcion
        conversations[ctx.from].selectedDog = descripcion

        return gotoFlow(l1);
    });

const l1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from;
    const dogName = conversations[userId]?.selectedDog || 'tu peludito';

    await flowDynamic([
      {
        body: `¿Qué quieres para *${dogName}*?`,
        buttons: [
          { body: 'Paseo' },
          { body: 'Cuidarlo en casa' }
        ]
      }
    ]);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
    const choice = ctx.body;

    if (choice === 'Paseo') return gotoFlow(m1);
    if (choice === 'Cuidarlo en casa') return gotoFlow(m2);
    return gotoFlow(b1_repeat);
  });

const m1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from;

    await flowDynamic([
      {
        body: `¿Cuánto tiempo necesitas el paseo?`,
        buttons: [
          { body: 'Media hora' },
          { body: 'Una hora' },
          { body: 'Más de una hora' }
        ]
      }
    ]);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
    const choice = ctx.body;

    if (choice === 'Media hora') {
        conversations[ctx.from].tipoServicio = "Paseo"
        return gotoFlow(q1);}
    if (choice === 'Una hora') {
        conversations[ctx.from].tipoServicio = "Paseo"
        return gotoFlow(q1);}
    if (choice === 'Más de una hora') {
        conversations[ctx.from].tipoServicio = "Paseo"
        return gotoFlow(o1);}
    return gotoFlow(b1_repeat);
  });

const m2 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {

    await flowDynamic([
      {
        body: `¿Cuánto tiempo necesitas que ${conversations[ctx.from].selectedDog} mascota se quede en la casa del cuidador? `,
        buttons: [
          { body: 'Medio dia' },
          { body: 'Un dia' },
          { body: 'Varios dias' }
        ]
      }
    ]);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
    const choice = ctx.body;

    if (choice === 'Medio dia') {
        conversations[ctx.from].tipoServicio = "Cuidado"
        return gotoFlow(q1);}
    if (choice === 'Un dia') {
        conversations[ctx.from].tipoServicio = "Cuidado"
        return gotoFlow(q1);}
    if (choice === 'Varios dias') {
        conversations[ctx.from].tipoServicio = "Cuidado"
        return gotoFlow(o2);}
    return gotoFlow(b1_repeat);
  });

const o1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {

      await flowDynamic(`¿Cuantas horas?`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
      const cita = ctx.body.trim();

      if (!ctx.state) ctx.state = {};
      conversations[ctx.from].tiempoServicio = cita

      return gotoFlow(q1);
  });

const o2 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].newDog || '[vacio]';

      await flowDynamic(`¿Cuantos dias?`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
      const cita = ctx.body.trim();

      if (!ctx.state) ctx.state = {};
      conversations[ctx.from].tiempoServicio = cita

      return gotoFlow(q1);
  });

const q1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].newDog || '[vacio]';

      await flowDynamic(`¿Para cuando quisieras el servicio? Indica hora y fecha (dd/mm/hh)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
      const cita = ctx.body.trim();

      if (!ctx.state) ctx.state = {};
      conversations[ctx.from].inicioServicio = cita

      console.log(conversations[ctx.from]);

      return gotoFlow(s1);
  });

const s1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {

      await flowDynamic(`Indicanos tu dirección`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
      const cita = ctx.body.trim();

      if (!ctx.state) ctx.state = {};
      conversations[ctx.from].inicioServicio = cita

      console.log(conversations[ctx.from]);

      return gotoFlow(u1);
  });

const u1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {

    await flowDynamic([
      {
        body: `La información es correcta? (Aqui va todo lo demas) `,
        buttons: [
          { body: 'Si' },
          { body: 'No' },
        ]
      }
    ]);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
    const choice = ctx.body;
    console.log(conversations[ctx.from]);
    
    if (choice === 'Si') {
        return gotoFlow(q1);}
    if (choice === 'No') {
        return gotoFlow(l1);}
    return gotoFlow(b1_repeat);
  });

// 🆕 Flujo para registro nuevo
const c2 = addKeyword('write_cc_new')
    .addAnswer(`Empecemos con el registro, ¿cuál es tu cédula? (Escribe sin puntos ni letras)`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const cedula = ctx.body.trim();
        const isValid = /^\d{6,10}$/.test(cedula);

        if (isValid) {
            const userId = ctx.from;
            conversations[userId] = conversations[userId] || new conversation();
            conversations[userId].cc = parseInt(cedula);

            console.log('🆔 Conversación ID:', userId);
            console.log('🗂 Conversación actual:', conversations[userId]);

            return gotoFlow(e3);
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(c2);
    });

const e3 = addKeyword('write_cc_check')
    .addAction(async (ctx, { flowDynamic }) => {
        const cedula = conversations[ctx.from].cc || '[cédula no encontrada]';

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
    i1,
    k1,
    l1,
    m1,
    m2,
    o1,
    o2,
    q1,
    s1,
    u1
};