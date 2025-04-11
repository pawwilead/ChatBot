import { addKeyword, EVENTS } from "@builderbot/bot";
import { conversation } from "~/model/models";
import { addDogToExistingClient, findCedulaInSheet, insertNewClient, insertNewClientWithPet, getDogsFromCedula } from "~/services/googleSheetsService";
import { getLocalidadDesdeDireccion } from "~/services/openStreetMap";

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

        if (!isValid) {
            await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
            return gotoFlow(c1);
        }

        const existe = await findCedulaInSheet(cedula);
        conversations[ctx.from] = conversations[ctx.from] || new conversation();
        conversations[ctx.from].cc = parseInt(cedula);

        if (existe) {
            await flowDynamic(`✅ La cédula *${cedula}* ya está registrada. Bienvenido de nuevo.`);

            //TODO:
            const perros = await getDogsFromCedula(cedula);
            console.log(perros);
            
            if (perros.length > 0) {
                await flowDynamic("📋 Estos son tus peluditos registrados. ¿Con cuál quieres continuar?");

                // Mostrar botones con hasta 2 perros + opción de agregar otro
                const botones = perros.slice(0, 2).map(p => ({ body: p.nombre }));
                botones.push({ body: '➕ Agregar nuevo peludito' });

                await flowDynamic([
                    {
                        body: "Selecciona un peludito:",
                        buttons: botones
                    }
                ]);

                // Guardar lista para posterior comparación
                conversations[ctx.from].dogs = perros;
                return; // Espera captura
            } else {
                await flowDynamic("😅 No encontramos peluditos registrados aún.");
                return gotoFlow(i1);
            }
        } else {
            return gotoFlow(e1);
        }
    })
    .addAnswer('', { capture: true }) // Captura la selección
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const seleccion = ctx.body.trim();
        const userId = ctx.from;
        const perrosGuardados = conversations[userId].dogs || [];

        if (seleccion === '➕ Agregar nuevo peludito') {
            return gotoFlow(i1);
        }

        const match = perrosGuardados.find(p => p.nombre.toLowerCase() === seleccion.toLowerCase());

        if (match) {
            conversations[userId].selectedDog = match;

            await flowDynamic(`🐶 ¡Perfecto! Vamos a continuar con *${match.nombre}*.`);
            return gotoFlow(l1); // o el siguiente paso
        }

        await flowDynamic("⚠️ No reconocí ese nombre. Intenta nuevamente.");
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
        const userId = ctx.from;

        conversations[userId] = conversations[userId] || new conversation();
        conversations[userId].dogs = conversations[userId].dogs || [];

        conversations[userId].selectedDog = { nombre, descripcion: '' }; // Temporal
        return gotoFlow(k1);
    });


const k1 = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic }) => {
        const petName = conversations[ctx.from].selectedDog?.nombre || '[vacio]';
        await flowDynamic(`Describenos a *${petName}*: ¿Qué raza es, cuántos años tiene, si es sociable y cualquier consideración adicional que debamos saber?`);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const descripcion = ctx.body.trim();
        const userId = ctx.from;

        // Guardar descripción en el objeto seleccionado
        if (conversations[userId].selectedDog) {
            conversations[userId].selectedDog.descripcion = descripcion;
        }

        return gotoFlow(k1_register);
    });


const k1_register = addKeyword('write_pet_description')
        .addAction(async (ctx, { flowDynamic }) => {
            const userId = ctx.from;
            const selectedDog = conversations[userId].selectedDog;
            const cedula = conversations[userId].cc.toString();
    
            if (!selectedDog) {
                await flowDynamic("⚠️ No tengo registrado el nombre del perrito. Intenta de nuevo.");
                return;
            }
    
            const nuevoPerro = {
                nombre: selectedDog.nombre,
                descripcion: selectedDog.descripcion
            };
    
            const yaRegistrado = await findCedulaInSheet(cedula);
    
            if (yaRegistrado) {
                const result = await addDogToExistingClient(cedula, nuevoPerro);
                if (result.updated) {
                    await flowDynamic(`🐶 ¡Tu nuevo perrito *${nuevoPerro.nombre}* fue agregado con éxito!`);
                } else {
                    await flowDynamic(`⚠️ Ocurrió un error al agregar a *${nuevoPerro.nombre}*. Intenta de nuevo.`);
                }
            } else {
                await insertNewClientWithPet(cedula, nuevoPerro.nombre, nuevoPerro.descripcion);
                await flowDynamic(`🎉 *${nuevoPerro.nombre}* ha sido registrado exitosamente.`);
            }
    
            // Guardar también localmente
            conversations[userId].dogs = conversations[userId].dogs || [];
            conversations[userId].dogs.push(nuevoPerro);
        })
        .addAction(async (ctx, { gotoFlow }) => {
            return gotoFlow(l1);
        });
    
    


const l1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from;
    const dogName = conversations[userId]?.selectedDog.nombre || 'tu peludito';
    console.log(conversations[ctx.from]);
    
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
    conversations[ctx.from].tipoServicio = "Paseo"
    if (choice === 'Media hora') {
        conversations[ctx.from].tiempoServicio = "Media hora"
        return gotoFlow(q1);}
    if (choice === 'Una hora') {
        conversations[ctx.from].tiempoServicio = "1 Hora"
        return gotoFlow(q1);}
    if (choice === 'Más de una hora') {
        return gotoFlow(o1);}
    return gotoFlow(b1_repeat);
  });

const m2 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {

    await flowDynamic([
      {
        body: `¿Cuánto tiempo necesitas que ${conversations[ctx.from].selectedDog.nombre} mascota se quede en la casa del cuidador? `,
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
    conversations[ctx.from].tipoServicio = "Cuidado"
    if (choice === 'Medio dia') {
        conversations[ctx.from].tiempoServicio = "Medio dia"
        return gotoFlow(q1);}
    if (choice === 'Un dia') {
        conversations[ctx.from].tiempoServicio = "Un dia"
        return gotoFlow(q1);}
    if (choice === 'Varios dias') {
        return gotoFlow(o2);}
    return gotoFlow(b1_repeat);
  });

const o1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      await flowDynamic(`¿Cuántas horas necesitas el servicio? (Escribe solo un número del 1 al 12)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
      const cita = ctx.body.trim();
      const esNumero = /^\d+$/.test(cita);
      const numero = parseInt(cita);

      if (!esNumero || numero < 1 || numero > 12) {
          await flowDynamic("❌ Por favor, escribe un número válido entre 1 y 12.");
          return gotoFlow(o1); // Repite la pregunta
      }

      conversations[ctx.from].tiempoServicio = cita;

      return gotoFlow(q1);
  });

const o2 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].selectedDog?.nombre || '[vacio]';

      await flowDynamic(`¿Cuántos días necesitas que *${petName}* se quede? (Escribe solo el número del 1 al 30)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
      const cita = ctx.body.trim();
      const esNumero = /^\d+$/.test(cita);
      const numero = parseInt(cita);

      if (!esNumero || numero < 1 || numero > 30) {
          await flowDynamic("❌ Por favor, ingresa un número válido entre 1 y 30.");
          return gotoFlow(o2); // Repite la pregunta
      }

      conversations[ctx.from].tiempoServicio = cita;

      return gotoFlow(q1);
  });

const q1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].selectedDog?.nombre || '[vacio]';

      await flowDynamic(`¿Para cuándo quisieras el servicio para *${petName}*? Indica hora y fecha en el formato 👉 *dd/mm/hh* (por ejemplo: 25/04/14)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
      const cita = ctx.body.trim();

      // Validar formato dd/mm/hh
      const regexFecha = /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[012])\/([0-1]?[0-9]|2[0-3])$/;

      if (!regexFecha.test(cita)) {
          await flowDynamic("❌ Formato inválido. Por favor, escribe la fecha y hora como *dd/mm/hh* (ejemplo: 25/04/14)");
          return gotoFlow(q1);
      }

      conversations[ctx.from].inicioServicio = cita;

      return gotoFlow(s1);
  });


  const s1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      await flowDynamic(`Indícanos tu dirección`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
      const direccion = ctx.body.trim();

      if (!ctx.state) ctx.state = {};

      // Guardamos la dirección original
      conversations[ctx.from].address = direccion;

      // Obtenemos la localidad/barrio
      const localidad = await getLocalidadDesdeDireccion(direccion);
      console.log(localidad);

      if (localidad) {
          await flowDynamic(`(JUST FOR TESTS)📍 Hemos detectado la zona: ${localidad}`);
          //conversations[ctx.from].localidad = localidad;
      } else {
          await flowDynamic(`⚠️ No pudimos detectar tu zona exacta, pero seguiremos con la dirección que nos diste.`);
      }

      console.log(conversations[ctx.from]);

      return gotoFlow(u1);
  });


const u1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {

    await flowDynamic([
      {
        body: `Ya casi, vamos a confirmar tus datos:

Nombre del peludito: ${conversations[ctx.from].selectedDog.nombre}
Dirección: ${conversations[ctx.from].address}
Inicio de servicio: ${conversations[ctx.from].inicioServicio}
Horas de ${conversations[ctx.from].tipoServicio}: ${conversations[ctx.from].tiempoServicio}

Total: {servicio.hora.precio}

¿Estas de acuerdo con la información?`,
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
    k1_register,
    l1,
    m1,
    m2,
    o1,
    o2,
    q1,
    s1,
    u1
};