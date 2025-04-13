import { addKeyword, EVENTS } from "@builderbot/bot";
import { conversation } from "~/model/models";
import { findCelInSheet, insertClientBasicInfo, insertLeadRow, updateDogsForClient } from "~/services/googleSheetsService";
import { getCiudadDesdeDireccion, getLocalidadDesdeDireccion } from "~/services/openStreetMap";

const conversations: { [key: string]: conversation } = {};

const init = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
        const userId = ctx.from;
        const resultado = await findCelInSheet(userId);

        if (resultado.exists && resultado.userData) {
            const [id, name, cc, petsJson] = resultado.userData;

            conversations[userId] = new conversation();
            conversations[userId].id = id;
            conversations[userId].cc = parseInt(cc);
            conversations[userId].name = name;
            conversations[userId].address = "";
            conversations[userId].dogs = [];

            try {
                const parsed = JSON.parse(petsJson || "{}");
                if (Array.isArray(parsed)) {
                    conversations[userId].dogs = parsed;
                } else if (parsed.nombre) {
                    conversations[userId].dogs = [parsed]; // convertir a lista
                }
            } catch (e) {
                console.error("🐾 Error al parsear los perros:", e);
                conversations[userId].dogs = [];
            }

            console.log("✅ Usuario recuperado con datos:", conversations[userId]);
            return gotoFlow(userRegistered);
        }

        return gotoFlow(start);
    });

const userRegistered = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
        const userId = ctx.from;

        //La idea es dirigir de una a f1 si el numero ya esta registrado con un perro
        const resultado = await findCelInSheet(userId);
        console.log(resultado);
        
        if (resultado.exists && resultado.userData) {
            const [, , , , petsJson] = resultado.userData;
            try {
                const parsed = JSON.parse(petsJson || "[]");
                
                conversations[userId].dogs = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                conversations[userId].dogs = [];
            }
        }

        // Construir botones actualizados
        const buttons = conversations[userId].dogs.map(dog => ({ body: dog.nombre }));

        if (conversations[userId].dogs.length < 3) {
            buttons.push({ body: 'Agregar perro' });
        }

        await flowDynamic([{
            body: `Guauuu, bienvenido/a de nuevo a Pawwi, soy Bimba. ¿A quién quieres que cuidemos?`,
            buttons
        }]);

    })
    .addAnswer('', { capture: true }) // Para capturar la opción seleccionada
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const userId = ctx.from;
        if (ctx.body === 'Agregar perro') return gotoFlow(i1);

        const dog = conversations[userId].dogs.find(d => d.nombre === ctx.body);
        if (dog) {
            conversations[userId].selectedDog = dog;
            //Temporal: Deberia ir a l1 pero como solo van a ser paseos en un inicio, salta directamente a paseo
            //return gotoFlow(l1);
            return gotoFlow(m1);
        }

        await flowDynamic('⚠️ No encontré ese nombre. Intenta de nuevo.');
        return gotoFlow(userRegistered);
});

const userRegistered_repeat = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
        const userId = ctx.from;

        //La idea es dirigir de una a f1 si el numero ya esta registrado con un perro
        const resultado = await findCelInSheet(userId);

        if (resultado.exists && resultado.userData) {
            const [, , , , petsJson] = resultado.userData;
            try {
                const parsed = JSON.parse(petsJson || "[]");
                conversations[userId].dogs = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                conversations[userId].dogs = [];
            }
        }

        const buttons = conversations[userId].dogs.map(dog => ({ body: dog.nombre }));

        if (conversations[userId].dogs.length < 3) {
            buttons.push({ body: 'Agregar perro' });
        }

        await flowDynamic([{
            body: `¿A quién quieres que cuidemos?`,
            buttons
        }]);

    })
    .addAnswer('', { capture: true }) // Para capturar la opción seleccionada
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const userId = ctx.from;
        if (ctx.body === 'Agregar perro') return gotoFlow(i1);

        const dog = conversations[userId].dogs.find(d => d.nombre === ctx.body);
        if (dog) {
            conversations[userId].selectedDog = dog;
            //Temporal: Deberia ir a l1 pero como solo van a ser paseos en un inicio, salta directamente a paseo
            //return gotoFlow(l1);
            return gotoFlow(m1);
        }

        await flowDynamic('⚠️ No encontré ese nombre. Intenta de nuevo.');
        return gotoFlow(userRegistered);
});

const start = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
        const userId = ctx.from;

        const existe = await findCelInSheet(userId);

        console.log("¿Usuario ya registrado?:", existe);

        await flowDynamic([{
            body: `Guauuu, bienvenido/a a Pawwi, soy Bimba. ¡Existimos para que tú estés tranqui! Nos encargamos de encontrar cuidadores confiables en tu zona. ¿Qué quieres hacer hoy?`,
            buttons: [
                { body: 'Buscar cuidador' },
                { body: 'Ser cuidador' }
            ]
        }]);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const choice = ctx.body;

        if (choice === 'Buscar cuidador') return gotoFlow(c2);
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

        if (choice === 'Buscar cuidador') return gotoFlow(c2);
        if (choice === 'Ser cuidador') {
            await flowDynamic('Para ser un Pawwier, por favor rellena el siguiente formulario: {Link de formulario}');
            return;
        }

        return gotoFlow(start_repeat);
    });

    const i1 = addKeyword('write_cc_new')
    .addAnswer(`Guauuu, que bien, ¿Cómo se llama tu peludito?`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const nombre = ctx.body.trim();
        const userId = ctx.from;

        conversations[userId] = conversations[userId] || new conversation();
        conversations[userId].dogs = conversations[userId].dogs || [];

        conversations[userId].selectedDog = {
            nombre,
            raza: '',
            edad: '',
            peso: '',
            descripcion: ''
        };

        return gotoFlow(k1_raza);
    });

    const k1_raza = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const petName = conversations[ctx.from]?.selectedDog?.nombre || '[vacio]';
        await flowDynamic(`Perfecto, ahora cuéntame ¿Qué raza es *${petName}*?`);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const raza = ctx.body.trim();
        const userId = ctx.from;
        if (conversations[userId].selectedDog) {
            conversations[userId].selectedDog.raza = raza;
        }
        return gotoFlow(k1_edad);
    });

const k1_edad = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const petName = conversations[ctx.from]?.selectedDog?.nombre || '[vacio]';
        await flowDynamic(`¿Cuántos años tiene *${petName}*?`);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const edad = ctx.body.trim();
        const userId = ctx.from;
        if (conversations[userId].selectedDog) {
            conversations[userId].selectedDog.edad = edad;
        }
        return gotoFlow(k1_peso);
    });

    const k1_peso = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const petName = conversations[ctx.from]?.selectedDog?.nombre || '[vacio]';
        await flowDynamic(`¿Cuánto pesa aproximadamente *${petName}*? (en kilogramos)`);
    })
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const peso = ctx.body.trim();
        const userId = ctx.from;
        if (conversations[userId].selectedDog) {
            conversations[userId].selectedDog.peso = peso;
        }
        return gotoFlow(k1_consideraciones);
    });


const k1_consideraciones = addKeyword('write_pet_description')
    .addAnswer(`¿Tienes alguna consideración especial que debamos saber? (Medicamentos, enfermedades, tratos especiales)`, { capture: true })
    .addAction(async (ctx, { gotoFlow }) => {
        const consideraciones = ctx.body.trim();
        const userId = ctx.from;
        if (conversations[userId].selectedDog) {
            conversations[userId].selectedDog.descripcion = consideraciones;
        }
        return gotoFlow(k1_register);
    });


const k1_register = addKeyword('write_pet_description')
    .addAction(async (ctx, { flowDynamic }) => {
        const userId = ctx.from;
        const selectedDog = conversations[userId].selectedDog;

        if (!selectedDog) {
            await flowDynamic("⚠️ No tengo registrado el nombre del perrito. Intenta de nuevo.");
            return;
        }

        // Agregar perro actual a la lista
        conversations[userId].dogs.push(selectedDog);
        conversations[userId].id = userId;

        const yaExiste = await findCelInSheet(userId);

        if (yaExiste.exists) {
            // Actualizar la columna de perros
            const result = await updateDogsForClient(userId, conversations[userId].dogs);
            if (result.updated) {
                await flowDynamic(`🐶 Agregamos a *${selectedDog.nombre}* a tu lista de peluditos.`);
            } else {
                await flowDynamic(`⚠️ Ocurrió un error al actualizar tu lista. Intenta más tarde.`);
            }
        } else {
            // Insertar nueva fila
            const result = await insertClientBasicInfo(conversations[userId]);
            if (result.added) {
                await flowDynamic(`🐾 ¡Tu peludito *${selectedDog.nombre}* fue registrado exitosamente!`);
            } else {
                await flowDynamic(`⚠️ Ocurrió un error al registrar a *${selectedDog.nombre}*. Intenta más tarde.`);
            }
        }
    })
    .addAction(async (ctx, { gotoFlow }) => {
        //Temporal: Deberia ir a l1 pero como solo van a ser paseos en un inicio, salta directamente a paseo
        //return gotoFlow(l1);

        return gotoFlow(m1);
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
    return gotoFlow(l1);
  });

const m1 = addKeyword('write_cc')
  .addAction(async (ctx, { flowDynamic }) => {
    const userId = ctx.from;

    await flowDynamic([
      {
        body: `¿Cuánto tiempo necesitas el paseo?`,
        buttons: [
          { body: 'Express (20 min)' },
          { body: 'Medium (30 min)' },
          { body: 'Jumbo (1 Hora)' }
        ]
      }
    ]);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow }) => {
    const choice = ctx.body;
    conversations[ctx.from].tipoServicio = "Paseo"
    if (choice === 'Express (20 min)') {
        conversations[ctx.from].tiempoServicio = "20 minutos"
        conversations[ctx.from].precio = 7500
        return gotoFlow(q1);}
    if (choice === 'Medium (30 min)') {
        conversations[ctx.from].tiempoServicio = "30 minutos"
        conversations[ctx.from].precio = 10000
        return gotoFlow(q1);}
    if (choice === 'Jumbo (1 Hora)') {
        conversations[ctx.from].tiempoServicio = "60 minutos"
        conversations[ctx.from].precio = 17000
        return gotoFlow(q1);}
    return gotoFlow(m1);
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
    return gotoFlow(m2);
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
          return gotoFlow(o1);
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
          return gotoFlow(o2);
      }

      conversations[ctx.from].tiempoServicio = cita;

      return gotoFlow(q1);
  });

const q1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].selectedDog?.nombre || '[vacio]';

      await flowDynamic(`¿Para qué fecha quisieras el servicio para *${petName}*? Indícala en el formato 👉 *dd/mm* (por ejemplo: 25/04)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
      const cita = ctx.body.trim();

      // Validar formato dd/mm
      const regexFecha = /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[012])$/;

      if (!regexFecha.test(cita)) {
          await flowDynamic("❌ Formato inválido. Por favor, escribe la fecha como *dd/mm* (ejemplo: 25/04)");
          return gotoFlow(q1);
      }

      conversations[ctx.from].fechaServicio = cita;

      return gotoFlow(q1_hora);
  });

const q1_hora = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      const petName = conversations[ctx.from].selectedDog?.nombre || '[vacio]';

      await flowDynamic(`¿A qué hora quisieras que recogamos a *${petName}*? Indica la hora en el formato 👉 *hh:mm* (por ejemplo: 14:30)`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
      const hora = ctx.body.trim();

      // Validar formato hh:mm (24 horas)
      const regexHora = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

      if (!regexHora.test(hora)) {
          await flowDynamic("❌ Formato inválido. Por favor, escribe la hora como *hh:mm* (ejemplo: 14:30)");
          return gotoFlow(q1_hora);
      }

      conversations[ctx.from].inicioServicio = hora;

      return gotoFlow(s1);
  });

  const s1 = addKeyword('write_pet_description')
  .addAction(async (ctx, { flowDynamic }) => {
      await flowDynamic(`Indícanos tu dirección y tu barrio`);
  })
  .addAnswer('', { capture: true })
  .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
      const direccion = ctx.body.trim();

      if (!ctx.state) ctx.state = {};

      // Guardamos la dirección original
      conversations[ctx.from].address = direccion;

      // Obtenemos la localidad/barrio
      const localidad = await getLocalidadDesdeDireccion(direccion);
      const ciudad = await getCiudadDesdeDireccion(direccion);
      conversations[ctx.from].barrio = localidad;
      conversations[ctx.from].ciudad = ciudad;
      console.log(localidad);

      /*
      if (localidad) {
          await flowDynamic(`(JUST FOR TESTS)📍 Hemos detectado la zona: ${localidad}`);
          //conversations[ctx.from].localidad = localidad;
      } else {
          await flowDynamic(`⚠️ No pudimos detectar tu zona exacta, pero seguiremos con la dirección que nos diste.`);
      }
        */

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
Dia: ${conversations[ctx.from].fechaServicio}
Hora de recogida: ${conversations[ctx.from].fechaServicio}
Tiempo de ${conversations[ctx.from].tipoServicio}: ${conversations[ctx.from].tiempoServicio}

Total: ${conversations[ctx.from].precio}

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
        await insertLeadRow(conversations[ctx.from]);
        return gotoFlow(q1);
    }
    if (choice === 'No') {
        return gotoFlow(userRegistered_repeat);}
    return gotoFlow(u1);
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

            return gotoFlow(name);
        }

        await flowDynamic("❌ Lo que ingresaste no parece una cédula válida. Intenta de nuevo por favor.");
        return gotoFlow(c2);
    });

    const name = addKeyword('write_cc_new')
    .addAnswer(`¿Cuál es tu nombre?`)
    .addAnswer('', { capture: true })
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        const nombre = ctx.body.trim();
        conversations[ctx.from].name = ctx.body.trim()
        return gotoFlow(i1);
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
        init,
        userRegistered,
        userRegistered_repeat,
        start,
        start_repeat,
        e3,
        name,
        i1,
        k1_raza,
        k1_edad,
        k1_peso,
        k1_consideraciones,
        k1_register,
        l1,
        m1,
        m2,
        o1,
        o2,
        q1,
        q1_hora,
        s1,
        u1,
        c2
    };
    