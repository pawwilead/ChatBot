import whatsappService from './whatsappService.js';
import appendToSheet from '../services/googleSheetsService.js';
import { updateCaregiverSelection } from '../services/googleSheetsService.js';

class MessageHandler {
  constructor() {
    this.appointmentState = {};
    this.defaultState = {
      step: null,
      petData: {
        name: null,
        breed: null,
        age: null,
        city: null,
        neighborhood: null,
        notes: null
      },
      ownerData: {
        name: null
      },
      caregiverData: {
        name: null,
        birthdate: null,
        city: null,
        neighborhood: null,
        phone: null,
        serviceInterest: null
      },
      serviceType: null,      // "paseador" o "cuidado"
      selectedHours: null,    // opción seleccionada para el servicio
      scheduleDate: null,     // fecha del servicio
      scheduleTime: null,     // hora del servicio
      scheduleAddress: null,  // dirección de recogida
      selectedCaregiver: null, // cuidador seleccionado
      availableCaretakers: []  // lista de cuidadores disponibles
    };
  }

  async handleIncomingMessage(message) {
    try {
      if (!message) return;
      const senderId = message.from;
      if (!this.appointmentState[senderId]) {
        this.appointmentState[senderId] = { ...this.defaultState };
      }
      const currentState = this.appointmentState[senderId];

      // --- Procesar flujos de registro de cuidador ---
      if (currentState.step && currentState.step.startsWith("caregiver_") && message.type === 'text') {
        switch (currentState.step) {
          case 'caregiver_name':
            currentState.caregiverData.name = message.text.body.trim();
            currentState.step = 'caregiver_birthdate';
            await whatsappService.sendMessage(senderId, "¿Cuál es tu fecha de nacimiento? (dd/mm/aaaa) 🎂");
            return;
          case 'caregiver_birthdate':
            currentState.caregiverData.birthdate = message.text.body.trim();
            currentState.step = 'caregiver_city';
            await whatsappService.sendMessage(senderId, "¿En qué ciudad te encuentras? 🌆");
            return;
          case 'caregiver_city':
            currentState.caregiverData.city = message.text.body.trim();
            currentState.step = 'caregiver_neighborhood';
            await whatsappService.sendMessage(senderId, "¿En qué barrio vives? 🏘️");
            return;
          case 'caregiver_neighborhood':
            currentState.caregiverData.neighborhood = message.text.body.trim();
            currentState.step = 'caregiver_phone';
            await whatsappService.sendMessage(senderId, "¿Nos compartes tu número de contacto? 📱");
            return;
          case 'caregiver_phone':
            currentState.caregiverData.phone = message.text.body.trim();
            currentState.step = 'caregiver_service_interest';
            await whatsappService.sendInteractiveButtons(
              senderId,
              "¿Qué servicio te gustaría ofrecer como cuidador/a? 🐾",
              [
                { type: "reply", reply: { id: "service_paseador", title: "Paseador local" } },
                { type: "reply", reply: { id: "service_cuidado", title: "Cuidado en casa" } },
                { type: "reply", reply: { id: "service_ambos", title: "Ambos" } }
              ]
            );
            return;
        }
      }

      // --- Procesar agendamiento (captura de fecha, hora y dirección) ---
      if (message.type === 'text') {
        const incomingMessage = message.text.body.trim();
        if (currentState.step === "schedule_date") {
          currentState.scheduleDate = incomingMessage;
          currentState.step = "schedule_time";
          await whatsappService.sendMessage(senderId, "Waf waf, ¿a qué hora? (ejemplo: 01:00 PM) ⏰");
          return;
        }
        if (currentState.step === "schedule_time") {
          const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
          if (!timeRegex.test(incomingMessage)) {
            await whatsappService.sendMessage(senderId, "Por favor, ingresa la hora en formato 12 horas. Ejemplo: 01:00 PM");
            return;
          }
          currentState.scheduleTime = incomingMessage;
          currentState.step = "schedule_address";
          await whatsappService.sendMessage(senderId, "Para completar la reserva, indícanos la dirección exacta donde recogeremos a tu peludito 📍");
          return;
        }
        if (currentState.step === "schedule_address") {
          currentState.scheduleAddress = incomingMessage;
          const rowData = [
            new Date().toLocaleString(),                     // Fecha de creación
            senderId,                                        // Número WhatsApp del usuario
            currentState.ownerData.name || "Sin nombre",     // Nombre del dueño
            currentState.petData.name || "",                 // Nombre del peludito
            currentState.petData.breed || "",                // Raza
            currentState.petData.age || "",                  // Edad
            currentState.petData.city || "",                 // Ciudad de la mascota
            currentState.petData.neighborhood || "",         // Barrio de la mascota
            currentState.petData.notes || "",                // Notas de la mascota
            currentState.serviceType || "",                  // Tipo de servicio
            currentState.selectedHours || "",                // Horas seleccionadas
            currentState.scheduleDate || "",                 // Fecha del servicio
            currentState.scheduleTime || "",                 // Hora del servicio
            currentState.scheduleAddress || "",              // Dirección de recogida
            currentState.selectedCaregiver || ""             // Cuidador seleccionado (vacío por ahora)
          ];
          await appendToSheet(rowData);
          await whatsappService.sendMessage(
            senderId,
            `Danos unos segundos, estamos buscando cuidadores en ${currentState.scheduleAddress} para ${currentState.scheduleDate} en esta ${currentState.scheduleTime}.`
          );
          currentState.step = "waiting_manual";
          return;
        }

        // --- Procesar flujos de registro de mascota y dueño ---
        if (
          currentState.step &&
          !currentState.step.startsWith("caregiver_") &&
          !currentState.step.startsWith("schedule_") &&
          !currentState.step.startsWith("select_")
        ) {
          switch (currentState.step) {
            case 'pet_name':
              currentState.petData.name = incomingMessage;
              currentState.step = 'pet_breed';
              await whatsappService.sendMessage(senderId, "¿Qué raza es? 🐾");
              return;
            case 'pet_breed':
              currentState.petData.breed = incomingMessage;
              currentState.step = 'pet_age';
              await whatsappService.sendMessage(senderId, "¿Cuántos años tiene? 🎂");
              return;
            case 'pet_age':
              currentState.petData.age = incomingMessage;
              currentState.step = 'pet_city';
              await whatsappService.sendMessage(senderId, "¿En qué ciudad te encuentras? 🌆");
              return;
            case 'pet_city':
              currentState.petData.city = incomingMessage;
              currentState.step = 'pet_neighborhood';
              await whatsappService.sendMessage(senderId, "¿En qué barrio te encuentras? 🏘️");
              return;
            case 'pet_neighborhood':
              currentState.petData.neighborhood = incomingMessage;
              currentState.step = 'pet_notes';
              await whatsappService.sendMessage(senderId, "¿Alguna observación sobre tu peludito? 📝 (Ejemplo: Es ansioso, necesita medicación)");
              return;
            case 'pet_notes':
              currentState.petData.notes = incomingMessage;
              currentState.step = 'owner_name';
              await whatsappService.sendMessage(senderId, "📝 Ahora dinos tu nombre completo:");
              return;
            case 'owner_name':
              currentState.ownerData.name = incomingMessage;
              currentState.step = null;
              await whatsappService.sendMessage(senderId, `¡Registro completo ${incomingMessage}! 🎉`);
              await this.sendMainMenu(senderId);
              return;
          }
        }

        // Mensajes genéricos
        if (this.isGreeting(incomingMessage.toLowerCase())) {
          await this.sendWelcomeMessage(senderId, message.id);
          await this.sendWelcomeMenu(senderId);
        } else if (incomingMessage.toLowerCase() === "ceo") {
          await this.sendMedia(senderId);
        } else {
          await whatsappService.sendMessage(senderId, `Echo: ${incomingMessage}`, message.id);
        }
      }
      // --- Procesar mensajes interactivos ---
      else if (message?.type === "interactive") {
        const option = message.interactive.button_reply.title.trim();

        // Si el usuario está en el paso de selección de paseador
        if (this.appointmentState[senderId].step === "select_caregiver") {
          // Extraer el índice del botón (ej: "caretaker_0")
          const selectedId = message.interactive.button_reply.id;
          const index = parseInt(selectedId.split("_")[1], 10);
          if (!this.appointmentState[senderId].availableCaretakers) {
            console.error("No hay cuidadores disponibles almacenados para este usuario.");
            return;
          }
          const selectedCaretaker = this.appointmentState[senderId].availableCaretakers[index];
          if (!selectedCaretaker) {
            console.error("No se encontró el cuidador seleccionado con índice:", index);
            return;
          }
          // Guardar el nombre del cuidador seleccionado en el estado
          this.appointmentState[senderId].selectedCaregiver = selectedCaretaker.name;
          // Actualizar la hoja de Sheets (columna "Cuidador Seleccionado", que es la columna O)
          await updateCaregiverSelection(senderId, selectedCaretaker.name);

          let priceMessage = "";
          if (this.appointmentState[senderId].serviceType === "paseador") {
            if (this.appointmentState[senderId].selectedHours === "1 hora") {
              priceMessage = "17.000 pesos";
            } else if (this.appointmentState[senderId].selectedHours === "2 horas") {
              priceMessage = "24.000 pesos";
            } else if (this.appointmentState[senderId].selectedHours === "Más de 2 horas") {
              priceMessage = "24.000 + 5.000 pesos por hora extra";
            }
          } else if (this.appointmentState[senderId].serviceType === "cuidado") {
            if (this.appointmentState[senderId].selectedHours === "Hasta 6 horas") {
              priceMessage = "precio X";
            } else if (this.appointmentState[senderId].selectedHours === "Hasta 12 horas") {
              priceMessage = "precio Y";
            } else if (this.appointmentState[senderId].selectedHours === "Noche completa") {
              priceMessage = "precio Z";
            }
          }
          await whatsappService.sendMessage(
            senderId,
            `¡Estoy listo! Te confirmo tu reserva para el ${this.appointmentState[senderId].scheduleDate} a las ${this.appointmentState[senderId].scheduleTime} con ${selectedCaretaker.name} a ${priceMessage}.`
          );
          // Limpiar el step para finalizar el flujo
          this.appointmentState[senderId].step = null;
          return;
        }

        // Otras interacciones (por ejemplo, walking_confirmation, casa_confirmation, etc.)
        if (this.appointmentState[senderId].step === "walking_confirmation") {
          await this.handleWalkingHoursConfirmation(senderId, message.interactive.button_reply.title.trim());
          return;
        }
        if (this.appointmentState[senderId].step === "casa_confirmation") {
          await this.handleCasaHoursConfirmation(senderId, message.interactive.button_reply.title.trim());
          return;
        }
        if (this.appointmentState[senderId].step && this.appointmentState[senderId].step === "caregiver_service_interest") {
          await this.handleCaregiverRegistrationOption(senderId, message.interactive.button_reply.title.trim());
        } else {
          await this.handleMenuOption(senderId, message.interactive.button_reply.title.trim());
        }
        await whatsappService.markAsRead(message.id);
      }

      await whatsappService.markAsRead(message.id);
    } catch (error) {
      console.error("Error processing incoming message:", error);
    }
  }

  // Funciones auxiliares y menús

  isGreeting(message) {
    const greetings = ["hola", "hello", "hi", "buenos dias", "buenas noches", "buenas tardes"];
    return greetings.some(greeting => message.includes(greeting));
  }

  async sendWelcomeMessage(to, messageId) {
    await whatsappService.sendMessage(
      to,
      "👋🏻 Guauuu, bienvenido/a a Pawwi, soy Bimba. ¡Existimos para que tú estés tranqui! Nos encargamos de encontrar cuidadores confiables en tu zona. ¿Qué servicio necesitas? 🤔",
      messageId
    );
  }

  async sendWelcomeMenu(to) {
    await whatsappService.sendInteractiveButtons(to, "Elige una opción: 👇", [
      { type: "reply", reply: { id: "option_1", title: "Buscar un cuidador📍" } },
      { type: "reply", reply: { id: "option_2", title: "Sé un cuidador🐶" } }
    ]);
  }

  async handleMenuOption(to, option) {
    if (!this.appointmentState[to]) {
      this.appointmentState[to] = { ...this.defaultState };
    }
    const currentState = this.appointmentState[to];

    switch (option) {
      case "Cuidado en casa🏠":
        currentState.serviceType = "cuidado";
        await this.sendCuidadoCasaMenu(to);
        break;
      case "Paseador local📍":
        currentState.serviceType = "paseador";
        await this.sendPaseadorMenu(to);
        break;
      case "Buscar un cuidador📍":
        await this.askIfRegistered(to);
        break;
      case "Sé un cuidador🐶":
        currentState.step = "caregiver_name";
        currentState.caregiverData = {
          name: null,
          birthdate: null,
          city: null,
          neighborhood: null,
          phone: null,
          serviceInterest: null
        };
        await whatsappService.sendMessage(
          to,
          "¡Genial! 🐶🎉 Nos encanta conocer personas que aman a los perritos. Déjanos tu información y te contactaremos pronto."
        );
        await whatsappService.sendMessage(to, "¡Cuéntame, cómo te llamas? 😊");
        break;
      case "1 hora":
      case "2 horas":
      case "Más de 2 horas":
        if (currentState.serviceType === "paseador") {
          currentState.step = "walking_confirmation";
          currentState.selectedHours = option;
          await this.handleWalkingHoursSelection(to, option);
        }
        break;
      case "Hasta 6 horas":
      case "Hasta 12 horas":
      case "Noche completa":
        if (currentState.serviceType === "cuidado") {
          currentState.step = "casa_confirmation";
          currentState.selectedHours = option;
          await this.handleCasaHoursSelection(to, option);
        }
        break;
      case "Sí ✅":
        if (currentState.petData?.name) {
          if (!currentState.ownerData?.name) {
            await whatsappService.sendMessage(to, "📝 Primero dinos tu nombre completo:");
            currentState.step = "owner_name";
          } else {
            await this.sendMainMenu(to);
          }
        } else {
          await whatsappService.sendMessage(to, "¡Genial! Envíanos el nombre de tu peludito 🐶.");
          currentState.step = "pet_name";
        }
        break;
      case "No ❌":
        if (currentState.step === "pet_name") {
          await whatsappService.sendMessage(to, "¡Entendido! Cuando necesites buscar un cuidador, aquí estaré. 🐾");
          delete this.appointmentState[to];
        } else {
          await whatsappService.sendMessage(to, "No hay problema, te ayudaremos a registrarlo ahora mismo. 📝");
          currentState.step = "pet_name";
          await whatsappService.sendMessage(to, "¿Cómo se llama tu peludito? 🐶");
        }
        break;
      default:
        await whatsappService.sendMessage(
          to,
          "🐩 Paro orejas, no entiendo tu selección, por favor elige una de las opciones del menú."
        );
    }
  }

  async handleWalkingHoursSelection(to, option) {
    const userName = this.appointmentState[to].ownerData?.name || "estimado/a";
    let responseMessage = "";
    switch (option) {
      case "1 hora":
        responseMessage = `🐶 Super, el precio de 1 hora de paseo es de 17.000 pesos 🐾. ¿Deseas agendar ${userName}?`;
        break;
      case "2 horas":
        responseMessage = `🐶 Super, el precio de 2 horas de paseo es de 24.000 pesos 🐾. ¿Deseas agendar ${userName}?`;
        break;
      case "Más de 2 horas":
        responseMessage = `🐶 Super, el precio de más de 2 horas de paseo es de 24.000 + 5.000 pesos por hora extra 🐾. ¿Deseas agendar ${userName}?`;
        break;
      default:
        responseMessage = "Opción inválida.";
    }
    await whatsappService.sendInteractiveButtons(to, responseMessage, [
      { type: "reply", reply: { id: "confirm_yes", title: "Sí ✅" } },
      { type: "reply", reply: { id: "confirm_no", title: "No ❌" } }
    ]);
  }

  async handleWalkingHoursConfirmation(to, option) {
    const lowerOption = option.toLowerCase();
    if (lowerOption.includes("sí")) {
      await whatsappService.sendMessage(
        to,
        "Perfecto ✅, ¿para cuándo quisieras el servicio? (dd/mm/aaaa)"
      );
      this.appointmentState[to].step = "schedule_date";
    } else if (lowerOption.includes("no")) {
      await whatsappService.sendMessage(
        to,
        "Entiendo, si necesitas algo más, aquí estaré. ¡Hasta luego! 😔🐶"
      );
      this.appointmentState[to].step = null;
      delete this.appointmentState[to].selectedHours;
    } else {
      await whatsappService.sendMessage(
        to,
        "No entendí tu respuesta, por favor selecciona Sí ✅ o No ❌."
      );
    }
  }

  async handleCasaHoursSelection(to, option) {
    const userName = this.appointmentState[to].ownerData?.name || "estimado/a";
    let responseMessage = "";
    switch (option) {
      case "Hasta 6 horas":
        responseMessage = `🐶 Genial, el precio para hasta 6 horas de cuidado en casa es de precio X. ¿Deseas agendar ${userName}?`;
        break;
      case "Hasta 12 horas":
        responseMessage = `🐶 Genial, el precio para hasta 12 horas de cuidado en casa es de precio Y. ¿Deseas agendar ${userName}?`;
        break;
      case "Noche completa":
        responseMessage = `🐶 Genial, el precio para noche completa de cuidado en casa es de precio Z. ¿Deseas agendar ${userName}?`;
        break;
      default:
        responseMessage = "Opción inválida.";
    }
    await whatsappService.sendInteractiveButtons(to, responseMessage, [
      { type: "reply", reply: { id: "casa_confirm_yes", title: "Sí ✅" } },
      { type: "reply", reply: { id: "casa_confirm_no", title: "No ❌" } }
    ]);
  }

  async handleCasaHoursConfirmation(to, option) {
    const lowerOption = option.toLowerCase();
    if (lowerOption.includes("sí")) {
      await whatsappService.sendMessage(
        to,
        "Perfecto ✅, ¿para cuándo quisieras el servicio? (dd/mm/aaaa)"
      );
      this.appointmentState[to].step = "schedule_date";
    } else if (lowerOption.includes("no")) {
      await whatsappService.sendMessage(
        to,
        "Entiendo, si necesitas algo más, aquí estaré. ¡Hasta luego! 😔🐶"
      );
      this.appointmentState[to].step = null;
      delete this.appointmentState[to].selectedHours;
    } else {
      await whatsappService.sendMessage(
        to,
        "No entendí tu respuesta, por favor selecciona Sí ✅ o No ❌."
      );
    }
  }

  async handleCaregiverRegistrationOption(to, option) {
    const currentState = this.appointmentState[to];
    currentState.caregiverData.serviceInterest = option;
    await whatsappService.sendMessage(
      to,
      `¡Gracias, ${currentState.caregiverData.name}! Nos pondremos en contacto contigo muy pronto para terminar de completar tu perfil. 🤗🫰🏻`
    );
    currentState.step = null;
  }

  async askIfRegistered(to) {
    await whatsappService.sendInteractiveButtons(
      to,
      "¡Excelente! Antes de seguir, ¿tienes a tu peludito registrado? 🥸",
      [
        { type: "reply", reply: { id: "option_si", title: "Sí ✅" } },
        { type: "reply", reply: { id: "option_no", title: "No ❌" } }
      ]
    );
  }

  async askFindCaretaker(to) {
    const city = this.appointmentState[to].petData.city;
    const neighborhood = this.appointmentState[to].petData.neighborhood;
    await whatsappService.sendInteractiveButtons(
      to,
      `¡Perfecto! Buscaremos cuidadores en ${city}, ${neighborhood} 🗺️\n¿Quieres continuar?`,
      [
        { type: "reply", reply: { id: "find_yes", title: "Sí ✅" } },
        { type: "reply", reply: { id: "find_no", title: "No ❌" } }
      ]
    );
  }

  async sendMainMenu(to) {
    const ownerName = this.appointmentState[to].ownerData?.name || "estimado/a";
    await whatsappService.sendInteractiveButtons(
      to,
      `¡Hola ${ownerName}! ¿Qué quieres hacer hoy? ☀️`,
      [
        { type: "reply", reply: { id: "option_paseador", title: "Paseador local📍" } },
        { type: "reply", reply: { id: "option_cuidado", title: "Cuidado en casa🏠" } }
      ]
    );
  }

  async sendPaseadorMenu(to) {
    await whatsappService.sendInteractiveButtons(
      to,
      "Perfecto, ¿Cuántas horas necesitas el paseo? 🚶‍♂️🐕",
      [
        { type: "reply", reply: { id: "paseador_1hora", title: "1 hora" } },
        { type: "reply", reply: { id: "paseador_2horas", title: "2 horas" } },
        { type: "reply", reply: { id: "paseador_masde2horas", title: "Más de 2 horas" } }
      ]
    );
  }

  async sendCuidadoCasaMenu(to) {
    await whatsappService.sendInteractiveButtons(
      to,
      "¿Cuánto tiempo necesitas que tu peludito se quede en la casa del cuidador? 🏡🐕",
      [
        { type: "reply", reply: { id: "cuidado_6horas", title: "Hasta 6 horas" } },
        { type: "reply", reply: { id: "cuidado_12horas", title: "Hasta 12 horas" } },
        { type: "reply", reply: { id: "cuidado_noche", title: "Noche completa" } }
      ]
    );
  }

  async sendMedia(to) {
    await whatsappService.sendMediaMessage(
      to,
      "image",
      "https://pawwi.co/wp-content/uploads/2025/02/NicoPawwi-scaled.jpeg",
      "Nico Pawwi"
    );
  }

  /**
   * NUEVA LÓGICA: Enviar varios mensajes para cada cuidador.
   * Se envía un mensaje de descripción y luego un mensaje interactivo con botón.
   */
  async notifyUserWithCaretakerOptions(senderId, caretakers) {
    if (!this.appointmentState[senderId]) {
      this.appointmentState[senderId] = { ...this.defaultState };
    }
    // Guardamos el arreglo completo de cuidadores en el estado
    this.appointmentState[senderId].availableCaretakers = caretakers;
    // Establecemos el step para la selección
    this.appointmentState[senderId].step = "select_caregiver";

    await whatsappService.sendMessage(
      senderId,
      "Estos son los paseadores disponibles. Revisa cada uno y selecciona el que más te guste:"
    );

    for (let i = 0; i < caretakers.length; i++) {
      const caretaker = caretakers[i];
      const caretakerInfo = `Nombre: ${caretaker.name}\nEdad: ${caretaker.age}\nActividad: ${caretaker.activity}\n⭐️⭐️⭐️⭐️ (ejemplo)`;
      await whatsappService.sendMessage(senderId, caretakerInfo);

      let buttonTitle = `Elegir a ${caretaker.name}`;
      if (buttonTitle.length > 20) {
        buttonTitle = buttonTitle.slice(0, 20);
      }

      await whatsappService.sendInteractiveButtons(
        senderId,
        "¿Deseas seleccionar a este cuidador?",
        [
          {
            type: "reply",
            reply: {
              id: `caretaker_${i}`,
              title: buttonTitle
            }
          }
        ]
      );
    }
  }

  /**
   * NUEVA FUNCIÓN: Notificar al dueño con la confirmación final.
   * Se invoca cuando el admin marca "confirmada" en la hoja.
   * details debe contener: scheduleDate, scheduleTime, selectedCaregiver y price.
   */
  async notifyUserFinalConfirmation(senderId, details) {
    await whatsappService.sendMessage(
      senderId,
      `¡Mi colita se mueve! ${details.selectedCaregiver} recibió tu solicitud. Y confirmó tu cita ✅🐶.`
    );
    await whatsappService.sendMessage(
      senderId,
      `¡Estoy listo para el paseo! Te confirmo tu reserva para el ${details.scheduleDate} a las ${details.scheduleTime} con ${details.selectedCaregiver} a ${details.price}. Te recomendamos llevar la correa de tu peludo y galletitas.`
    );
  }
}

export default new MessageHandler();
