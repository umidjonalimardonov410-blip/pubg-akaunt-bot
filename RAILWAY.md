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
In your Railway service settings, add the following variables:
- `PORT` = `3000` (or Railway auto-assigned port)
- `NODE_ENV` = `production`
- `DATABASE_URL` = (MySQL connection string provided by Railway MySQL plugin)
- `JWT_SECRET` = (Generate a secure random 32+ character string)
- `TELEGRAM_BOT_TOKEN` = (Get your token from [@BotFather](https://t.me/BotFather))
- `TELEGRAM_WEBHOOK_URL` = `https://your-app-domain.railway.app/api/telegram/webhook`

---

## Step 4: Build & Database Migration Verification
1. Railway will automatically build the project using `railway.json` (`pnpm build`).
2. The server will start using `NODE_ENV=production node dist/index.js`.
3. Drizzle ORM migrations will run automatically on startup to initialize the MySQL tables.

---

## Step 5: Telegram BotFather & Webhook Setup
1. Message [@BotFather](https://t.me/BotFather) on Telegram.
2. Use `/setwebapp` to link your bot to your Railway public domain (`https://your-app-domain.railway.app`).
3. Set your bot menu buttons using `/setcommands`:
   - `/start` - Asosiy menyu va bozor
   - `/buy` - Akkauntlarni izlash
   - `/sell` - Akkaunt sotish
   - `/orders` - Buyurtmalar va escrow
   - `/wallet` - Hamyon
   - `/support` - Yordam markazi
