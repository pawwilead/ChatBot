# Pawwi bot

Pawwi chatbot designed to manage dog owners' scheduling with dog walkers

## Requirements
* Nodejs v.20 or higher

## Installation
```bash
npm install
```

```bash
npm install dotenv
```

```bash
npm install openai
```

## How to run
1. Open port 3000 on your device and make it public, If your using visual Studio Code, copy the url
2. Run chatBot with:
```bash
npm run dev
```
3. Go to meta -> WhatsApp -> Configuration
4. On Callback URL, paste the url from your port, followed by /webhook
5. On token verification, write the same token verification on .env
6. Send a message to the bot in WhatsApp
