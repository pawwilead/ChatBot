import axios from 'axios';
import config from '../config/env.js';

class WhatsAppService {
  async sendMessage(to, body, messageId) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          text: { body },
          context: messageId ? { message_id: messageId } : undefined
        },
      });
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
    }
  }

  async markAsRead(messageId) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
      });
    } catch (error) {
      console.error('Error marking message as read:', error.response?.data || error.message);
    }
  }

  async sendInteractiveButtons(to, bodyText, buttons) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons
            }
          }
        },
      });
    } catch (error) {
      console.error('Error sending interactive buttons:', error.response?.data || error.message);
    }
  }

  async sendMediaMessage(to, type, mediaUrl, caption) {
    try {
      const mediaObject = {};

      switch (type) {
        case "image":
          mediaObject.image = { link: mediaUrl, caption: caption}
          break;

        case "document" :
          mediaObject.document = { link: mediaUrl, caption: caption, filename: "pawwi.pdf"}
          break;
      
        default:
          throw new Error("Not Supported Media Type");
      }
      
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          type: type,
          ...mediaObject
        },
      });

    } catch (error) {
      console.error("Error Sending Media", error); 

    }
  }
}

console.log("API_VERSION:", config.API_VERSION);
console.log("BUSINESS_PHONE:", config.BUSINESS_PHONE);
console.log("API_TOKEN:", config.API_TOKEN ? "Token cargado correctamente" : "Falta API_TOKEN");

export default new WhatsAppService();