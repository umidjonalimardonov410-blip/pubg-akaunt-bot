# Inferno Stealth — End-to-End Railway & Telegram Bot Deployment Guide

This comprehensive guide covers deploying your Inferno Stealth PUBG Mobile marketplace and Telegram Mini App to **Railway** ([railway.app](https://railway.app)) and connecting it to your GitHub repository `umidjonalimardonov410-blip/pubg-akaunt-bot`.

---

## Step 1: Push Code to GitHub Repository
1. Open your repository on GitHub: [github.com/umidjonalimardonov410-blip/pubg-akaunt-bot](https://github.com/umidjonalimardonov410-blip/pubg-akaunt-bot).
2. You can upload the complete source archive (`Inferno-Stealth-phone-first-source-28937afe.zip`) directly via GitHub web interface, or push via git:
   ```bash
   git remote add origin https://github.com/umidjonalimardonov410-blip/pubg-akaunt-bot.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Create and Configure Project on Railway
1. Log in to [Railway Dashboard](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository: `umidjonalimardonov410-blip/pubg-akaunt-bot`.
4. Add a **MySQL** or **TiDB** database service to your Railway project.

---

## Step 3: Configure Environment Variables in Railway

### Core Mini App variables
The following variables are required for the marketplace server, authentication, database-backed escrow, and the Telegram Mini App shell:
- `PORT` = Railway's injected port (do not hardcode it in application code)
- `NODE_ENV` = `production`
- `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` when using the Railway MySQL service
- `JWT_SECRET` = a secure random 32+ character string
- `OAUTH_SERVER_URL` = the Manus OAuth API base URL
- `VITE_APP_ID` = the Manus application ID
- `OWNER_OPEN_ID` = the marketplace owner's Manus open ID
- `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` = the built-in storage/LLM service configuration
- `VITE_OAUTH_PORTAL_URL` = the frontend OAuth portal URL
- `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` = analytics configuration, if analytics is enabled

The core Mini App remains deployable without a Telegram BotFather token. In that fallback mode, in-app marketplace flows remain available and external Telegram delivery reports `setup_required`.

### Active Telegram bot and webhook variables
The verified `PUBG_TradeBot` configuration uses these Railway variables; never commit their values to GitHub:
- `TELEGRAM_BOT_TOKEN` = the BotFather token used for outbound bot messages
- `TELEGRAM_ADMIN_IDS` = comma-separated Telegram numeric IDs allowed to use `/admin`
- `VITE_TELEGRAM_BOT_USERNAME` = `PUBG_TradeBot` for referral and share links
- `TELEGRAM_MINI_APP_URL` = the public Mini App URL
- `TELEGRAM_WEBHOOK_URL` = `<public-url>/api/telegram/webhook`
- `TELEGRAM_WEBHOOK_SECRET` = a private random value sent in Telegram’s `X-Telegram-Bot-Api-Secret-Token` header
- `PUBLIC_APP_URL` = the canonical public app URL used in bot buttons

The server registers Uzbek commands, the Telegram Mini App menu button, and the webhook on startup. It accepts only requests with the configured webhook secret, and non-admin users receive a safe permission message rather than admin data.

---

## Step 4: Build & Database Migration Verification
1. Railway will automatically build the project using `railway.json` (`pnpm build`).
2. The server will start using `NODE_ENV=production node dist/index.js`.
3. Drizzle ORM migrations will run automatically on startup to initialize the MySQL tables.

---

## Step 5: Telegram BotFather & Webhook Setup
1. Message [@BotFather](https://t.me/BotFather) on Telegram.
2. The server automatically calls Telegram `setMyCommands`, `setChatMenuButton`, and `setWebhook` after startup. If you change the public domain, update `TELEGRAM_MINI_APP_URL` and `TELEGRAM_WEBHOOK_URL` in Railway.
3. The active Uzbek command menu is:
   - `/start` - Inferno Stealth menyusi va bozor
   - `/buy` - Akkauntlarni izlash
   - `/sell` - Akkaunt sotish
   - `/orders` - Buyurtmalar va escrow
   - `/wallet` - Wallet va tranzaksiyalar
   - `/support` - Yordam markazi
   - `/pro` - Pro vositalar
   - `/admin` - Faqat tasdiqlangan adminlar uchun
4. Ishonch qoidasi: platforma login yoki parolni chat orqali so‘ramaydi; escrow holati buyurtma ichida ko‘rsatiladi; nizo bo‘lsa buyurtma raqami va dalillar bilan support ticket ochiladi.
