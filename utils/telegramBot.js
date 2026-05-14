const TelegramBot = require("node-telegram-bot-api");
const logger = require("./logger");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID; // Admin ka chat_id

if (!BOT_TOKEN || BOT_TOKEN === "your_bot_token_here") {
  logger.warn("Telegram bot token not set - bot disabled");
  module.exports = { bot: null, autoRegisterFromTelegram: null };
  return;
}

if (!ADMIN_CHAT_ID) {
  logger.warn("TELEGRAM_ADMIN_CHAT_ID not set - chat relay disabled");
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
logger.info("Telegram chatbot started");

// user chatId -> user info map (in-memory, restart pe reset)
// Production mein Redis ya DB use kar sakte hain
const userSessions = new Map(); // userId -> { chatId, firstName, username }
const adminReplying = new Map(); // adminChatId -> userChatId (jab admin reply kar raha ho)

// /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";
  const username = msg.from.username || null;

  // Save user session
  userSessions.set(chatId.toString(), { chatId, firstName, username });

  await bot.sendMessage(chatId,
    `👋 Hello ${firstName}!\n\nWelcome to *BitTrade7 Support*.\n\nSend your message and our support team will get back to you shortly. 🙏`,
    { parse_mode: "Markdown" }
  );
});

// User ka message admin ko forward karo
bot.on("message", async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text;

  // Ignore commands
  if (!text || text.startsWith("/")) return;

  // Agar admin reply kar raha hai
  if (chatId === ADMIN_CHAT_ID?.toString()) {
    // Admin ne kisi user ko reply kiya
    if (msg.reply_to_message) {
      // Reply message se user chatId nikalo
      const originalText = msg.reply_to_message.text || "";
      const match = originalText.match(/\[UserID: (\d+)\]/);
      if (match) {
        const userChatId = match[1];
        try {
          await bot.sendMessage(userChatId,
            `💬 *Support Team:*\n\n${text}`,
            { parse_mode: "Markdown" }
          );
          await bot.sendMessage(ADMIN_CHAT_ID, "✅ Reply sent to user.", { parse_mode: "Markdown" });
        } catch (err) {
          await bot.sendMessage(ADMIN_CHAT_ID, "❌ Failed to send reply to user.");
          logger.error("Bot reply to user failed", { error: err.message });
        }
      } else {
        await bot.sendMessage(ADMIN_CHAT_ID, "⚠️ Could not identify user. Please reply to a forwarded user message.");
      }
    }
    return; // Admin ke baaki messages ignore karo
  }

  // Normal user ka message — admin ko forward karo
  if (!ADMIN_CHAT_ID) return;

  const firstName = msg.from.first_name || "Unknown";
  const username = msg.from.username ? `@${msg.from.username}` : "No username";

  // User session save karo
  userSessions.set(chatId, { chatId, firstName, username });

  try {
    await bot.sendMessage(
      ADMIN_CHAT_ID,
      `📩 *New Message*\n\n👤 Name: ${firstName}\n🔗 Username: ${username}\n[UserID: ${chatId}]\n\n💬 Message:\n${text}`,
      { parse_mode: "Markdown" }
    );

    // User ko acknowledgement
    await bot.sendMessage(chatId,
      `✅ Your message has been received. Our support team will reply shortly.`,
    );
  } catch (err) {
    logger.error("Bot forward to admin failed", { error: err.message });
  }
});

// autoRegisterFromTelegram — purane code ke saath compatibility ke liye
const autoRegisterFromTelegram = null;

module.exports = { bot, autoRegisterFromTelegram };
