import { addKeyword, EVENTS } from "@builderbot/bot"

const mainFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer(`🙌 Hello, welcome to this *Chatbot*! Choose an option:`, {
        buttons: [
            { body: 'Say Hello' },
            { body: 'Tell a Joke' }
        ]
    })
    .addAnswer('Waiting for your choice...', { capture: true }) // Espera input del usuario
    .addAction(async (ctx, { flowDynamic }) => {
        const choice = ctx.body;

        if (choice === 'Say Hello') {
            await flowDynamic('👋 Hello there!');
        } else if (choice === 'Tell a Joke') {
            await flowDynamic('😂 Why don’t scientists trust atoms? Because they make up everything!');
        } else {
            await flowDynamic("❓ I didn't understand that.");
        }
    });

export { mainFlow }
