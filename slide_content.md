# Inferno Stealth — Railway Deployment & Telegram Mini App Architecture

## Slide 1: Executive Summary
- **Project Name**: Inferno Stealth (PUBG Mobile Account Trading Platform)
- **Architecture**: React 19 + Tailwind 4 + tRPC 11 + Express + Drizzle ORM (MySQL)
- **Deployment Target**: Railway (Autoscale / Reserved hosting) with GitHub CI synchronization (`umidjonalimardonov410-blip/pubg-akaunt-bot`)
- **Key Highlights**: Mobile-first 3-row account grids, secure escrow, wishlist price drops, and robust Telegram Mini App integration.

## Slide 2: Railway Deployment Architecture
- **Build Command**: `pnpm build` (compiles Vite frontend and bundles server via esbuild into `dist/index.js`)
- **Start Command**: `node dist/index.js` (runs Express server with automated Drizzle database migrations)
- **Database**: Railway MySQL/TiDB integration via `${{MySQL.MYSQL_URL}}`
- **Environment Isolation**: Secure server-side injection of JWT secrets and bot tokens without client exposure.

## Slide 3: Essential Environment Variables
- `NODE_ENV` = `production`
- `DATABASE_URL` = Connection string for MySQL
- `JWT_SECRET` = Secure session signing key (32+ characters)
- `TELEGRAM_BOT_TOKEN` = BotFather API token (`8801986213:...`)
- `TELEGRAM_ADMIN_IDS` = Comma-separated admin Telegram IDs (`8801986213,8787603995`)
- `PUBLIC_APP_URL` & `TELEGRAM_MINI_APP_URL` = Canonical public domain (`https://...up.railway.app`)
- `TELEGRAM_WEBHOOK_URL` = Secure webhook endpoint (`.../api/telegram/webhook`)

## Slide 4: Telegram WebApp & Bot Integration
- **Commands**: `/start`, `/buy`, `/sell`, `/orders`, `/wallet`, `/support`, `/pro`, `/admin`
- **Mini App Menu Button**: Direct launcher for the marketplace inside Telegram
- **Signed Webhooks**: Validated using `X-Telegram-Bot-Api-Secret-Token` header
- **User Trust**: Clear escrow protection messages and secure ID verification without credential exposure.

## Slide 5: Payment Gateway & Escrow Workflows
- **Inferno Wallet**: Canonical ledger balancing for secure escrow holds and releases.
- **Manual Receipt Deposit**: Receipt image upload (`storagePut`/S3) and transaction reference tracking for admin review.
- **Provider Readiness**: Standardized extensibility stubs for Click and Payme webhook protocols.
- **Admin Audit Trail**: Comprehensive deposit/withdrawal logs with receipt zoom and status filtering.

## Slide 6: Quality Assurance & Delivery Status
- **Automated Tests**: 79 passing Vitest specs covering escrow, wishlist, profile, and bot handlers.
- **Source Control**: Full code tree synchronized to GitHub (`umidjonalimardonov410-blip/pubg-akaunt-bot`).
- **Responsive Verification**: Verified 390px phone-first viewport ergonomics and touch targets.
- **Next Steps**: Complete Railway project re-linking and live webhook validation.
