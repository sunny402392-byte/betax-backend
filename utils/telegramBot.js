const TelegramBot = require("node-telegram-bot-api");
const { UserModel } = require("../models/user.model");
const { IncomeModel } = require("../models/income.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { getToken } = require("../utils/token.generator");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (!BOT_TOKEN || BOT_TOKEN === "your_bot_token_here") {
  logger.warn("Telegram bot token not set - bot disabled");
  module.exports = { bot: null, autoRegisterFromTelegram: null };
  return;
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
logger.info("Telegram bot started");

// Register or login user from Telegram
const registerOrLoginTelegram = async ({ telegramId, username, firstName, referralCode }) => {
  try {
    const telegramHandle = `@${username || telegramId}`;

    // Check if already exists
    let user = await UserModel.findOne({
      $or: [
        { telegram: telegramHandle },
        { telegram: telegramId.toString() }
      ]
    }).populate("incomeDetails");

    let isNew = false;

    if (!user) {
      // Create new account
      let sponsorFind = null;
      if (referralCode) {
        sponsorFind = await UserModel.findOne({ referralLink: referralCode });
      }

      const id = generateCustomId({ prefix: "BSG", min: 7, max: 7 });
      const hashedPassword = await bcrypt.hash(telegramId.toString() + id, 10);

      user = new UserModel({
        id,
        username: firstName || username || `user_${telegramId}`,
        telegram: telegramHandle,
        email: `${telegramId}@tg.bittrade7.com`,
        password: hashedPassword,
        referralLink: id,
        ...(sponsorFind && { sponsor: sponsorFind._id }),
      });

      const newIncomes = new IncomeModel({ user: user._id });
      user.incomeDetails = newIncomes._id;

      if (sponsorFind) {
        sponsorFind.partners.push(user._id);
        await sponsorFind.save();
        // Add to team
        let sponsor = sponsorFind;
        while (sponsor) {
          sponsor.totalTeam += 1;
          sponsor.teamMembers.push(user._id);
          await sponsor.save();
          sponsor = sponsor.sponsor ? await UserModel.findById(sponsor.sponsor) : null;
        }
      }

      user.active.isVerified = true;
      user.active.isActive = false;

      await newIncomes.save();
      await user.save();
      isNew = true;
      logger.info("Telegram account created", { username, id });
    }

    // Generate fresh token
    const token = await getToken(user);
    user.token.token = token;
    await user.save();

    return { success: true, user, token, isNew };
  } catch (err) {
    logger.error("Telegram register/login error", { error: err.message });
    return { success: false, error: err.message };
  }
};

// /start command
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const username = msg.from.username || `user_${telegramId}`;
  const firstName = msg.from.first_name || username;
  const referralCode = match[1]?.trim() || null;

  try {
    // Register or login
    const result = await registerOrLoginTelegram({ telegramId, username, firstName, referralCode });

    if (!result.success) {
      await bot.sendMessage(chatId, "❌ Something went wrong. Please try again.");
      return;
    }

    // Build login URL with token - user directly logged in
    const loginUrl = `${FRONTEND_URL}/tg-auth?token=${result.token}&uid=${result.user._id}&role=${result.user.role}`;

    const displayName = msg.from.username ? `@${msg.from.username}` : firstName;
    const welcomeText = result.isNew
      ? `Hello, ${displayName}! 🚀 Get ready for an exciting adventure!\n\nJoin us, complete challenges, and earn crazy rewards, which will greatly enhance your gaming experience! Unleash the power of your team! Form a strong team and have more fun!\n\nClick *"Start Now"* to open a new chapter in the USDD encryption world!`
      : `Welcome back, ${displayName}! 👋\n\nYour account is ready. Click *"Start Now"* to continue your mining journey!`;

    // Get referral link for invite
    const referralLink = `${FRONTEND_URL}/register?ref=${result.user.referralLink}`;
    const shareText = encodeURIComponent(`🚀 Join BitTrade7 Mining!\n\nEarn daily crypto rewards by mining!\nUse my referral link to get started:\n${referralLink}`);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`;

    await bot.sendMessage(chatId, welcomeText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🚀 Start Now", web_app: { url: loginUrl } },
            { text: "👥 Invite Friend", url: shareUrl }
          ]
        ]
      }
    });

  } catch (err) {
    logger.error("Bot /start error", { error: err.message });
    await bot.sendMessage(chatId, "❌ Error occurred. Please try again.");
  }
});

// API endpoint for manual telegram register (from web)
const autoRegisterFromTelegram = async ({ telegramId, username, referralCode }) => {
  return registerOrLoginTelegram({ telegramId, username, firstName: username, referralCode });
};

module.exports = { bot, autoRegisterFromTelegram };
