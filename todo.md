# Phone-First Telegram Mini App Rework & Enhancements

- [x] Audit all marketplace routes for compact 360-430px smartphone ergonomics and touch targets
- [x] Implement bottom-sheet search filters, full-screen mobile image gallery modals, and sticky bottom navigation across all pages
- [x] Add saved-search shortcuts and one-tap price drop alerts for mobile buyers
- [x] Add quick-support FAQ drawer and direct Telegram chat initiation for mobile users
- [x] Run Vitest test suite and production build verification
- [x] Save published checkpoint and package the complete project source ZIP for direct download

## GitHub & Railway Deployment
- [x] Inspect repository https://github.com/umidjonalimardonov410-blip/pubg-akaunt-bot
- [x] Prepare Railway-ready build/start scripts and environment template
- [x] Push complete source tree to umidjonalimardonov410-blip/pubg-akaunt-bot
- [x] Provide clear step-by-step Railway and Telegram bot deployment instructions
- [x] Railway deployment: validate supplied Railway token, connect Railway service, configure environment variables and database, deploy, and verify the live service
- [x] Add and run a lightweight Railway credential validation test before deployment
- [x] Fix Railway production crash caused by importing vite.config.ts with undefined import.meta.dirname in Node 18
- [x] Configure required Railway runtime variables, including OAuth, session secret, app ID, and database URL
- [x] Redeploy and verify the public Railway service health and static app response
- [x] Push the latest Node 18 compatibility fix and path-preserved source tree to GitHub after write permission is granted
- [x] Confirm Telegram BotFather token is optional for core Mini App deployment; document webhook setup as a later optional configuration
- [x] Use the user-supplied GitHub write token to push the final path-preserved source tree to main
- [x] Verify the GitHub tree and final Railway deployment after the authorized push
- [x] Update RAILWAY.md to separate core Mini App requirements from optional Telegram bot/webhook setup
- [x] Re-verify the deployed core Mini App without TELEGRAM_BOT_TOKEN and document the optional bot status
- [x] Configure TELEGRAM_BOT_TOKEN and admin IDs (8801986213 / 8787603995) in Railway and project secrets
- [x] Refine Uzbek Telegram bot menus, escrow trust copy, and trustworthy user-facing messaging
- [x] Set up Telegram bot webhook and verify live bot response on Railway
- [x] Update the existing wallet withdrawal regression test for required cardNumber and cardHolderName inputs
- [x] Add Vitest coverage for admin withdrawal approval/rejection and profile/account listing behavior
- [x] Send a signed /start webhook payload to the live Railway endpoint and verify handled=true (deployed handler returned handled=true; Telegram delivery requires the admin chat to start the bot)
- [x] Document the live Telegram command-processing result before the final checkpoint (Railway returned handled=true; Telegram getChat reported chat not found until the admin opens the bot)
- [x] Have the administrator open @PUBG_TradeBot and send /start once so Telegram recognizes the admin chat for outbound replies
- [x] Perform a non-destructive live smoke check of the withdrawal/admin queue without submitting a real payout (public app returned 200; protected admin queue returned 401; no wallet mutation)
- [x] Notify the user to rotate the GitHub personal access token used for the repository transfer (user action remains required)

## New Feature Requests (Payout Cards, Profiles, Withdrawals & 3-Column Layout)
- [x] Add payout card support (5614 3600 **** 7758 / Alimardonov U) with masked display for users and secure admin view
- [x] Upgrade account listings to a clean 3-column responsive grid on desktop and 1-column on mobile
- [x] Build a robust user profile showing Telegram ID, username, active listings, and sold-account history ("Sotilgan akkauntlar")
- [x] Implement wallet withdrawal requests with admin notification, user check/receipt verification guidance, and admin approval/rejection workflow
- [x] Connect all Telegram start menu commands and web app buttons to the updated marketplace flows
- [x] Run full test suite, production build, and redeploy to Railway

## User-Requested Additions (Staging Withdrawals, Uzbek Checklist & Audit Logs)
- [x] Add staging-safe withdrawal test utility with clearly labeled non-mutating staging data for admin verification
- [x] Expand Uzbek notification messages and admin withdrawal verification checklist
- [x] Build Telegram Mini App admin audit log and payout status history table
- [x] Verify responsive 3-column account grid layout at desktop and mobile breakpoints
- [x] Add an explicit admin-only mock/test balance toggle with server enforcement, UI state, and tests proving real wallet balances are never mutated in test mode.

## Phone-First & User Feature Repairs (2026-08-13)
- [x] Convert marketplace layout strictly to phone-first single-column width (remove desktop 3-column grid constraints)
- [x] Fix account filtering responsiveness so lists filter instantly without hanging or freezing on mobile
- [x] Implement robust Telegram Mini App login state handling with clear in-app auth actions
- [x] Build profile editing (avatar, bio, display name, Telegram handle) and profile photo upload via S3
- [x] Add seller view-count and cart-addition analytics per account listing in the seller dashboard
- [x] Build card top-up and deposit flow with receipt submission (image upload/text ref) and admin confirmation queue
- [x] Run full test suite, build verification, and phone viewport visual inspection (68 passed, 2 skipped; 390x844 screenshots verified)
- [x] Add focused regression coverage proving mobile filter changes update query inputs without refetch loops or hanging behavior.
- [x] Inspect and test the profile avatar upload path end to end, including storagePut/S3 URL integration and editor wiring.
- [x] Inspect and test the server media.upload path used by profile avatars, confirming storagePut/S3 execution and returned URL behavior.

## Comprehensive Phone-First & Notification Enhancements (2026-08-13)
- [x] Add explicit seller sales history ("Sotuv tarixi") and current balance widget in the mobile profile page.
- [x] Implement automatic Telegram bot notification sending to users when their deposit is approved or rejected.
- [x] Enhance admin panel with receipt zoom modal (kattalashtirib ko'rish) and status filtering for deposits and withdrawals.
- [x] Add external Telegram Mini App menu buttons and professional emoji-enhanced Uzbek copy.
- [x] Ensure the phone-only shell prevents viewport scrolling outside the Mini App frame and renders smoothly on mobile.
- [x] Create a reusable skill (`telegram-mini-app-marketplace`) using the `/skill-creator` process.
- [x] Push complete source to GitHub (`umidjonalimardonov410-blip/pubg-akaunt-bot`) and verify Railway redeployment.
- [x] Add withdrawal status filter controls in AdminPage and cover both deposit and withdrawal filtering with tests (covered by server/admin.filters.test.ts).
- [x] Implement and verify viewport/body overflow locking for the phone-only Mini App shell, then add a focused regression or documented code evidence (#root max-width 480px, overscroll-behavior-y none).
- [x] Create the reusable skill `telegram-mini-app-marketplace` conforming to the skill-creator format (`/home/ubuntu/skills/telegram-mini-app-marketplace/SKILL.md`).
- [x] Push the latest source changes to GitHub and verify a fresh Railway deployment of this exact revision.

## New Scope: Multi-Currency, Payment Webhooks & Promotional Broadcasts (2026-08-13)
- [x] Add UZS/USD/RUB currency selection and display with a transparent, configurable exchange-rate model; keep ledger values canonical and avoid floating-point balance mutations.
- [x] Add Click payment initiation and callback/webhook verification with idempotent provider references and wallet crediting only after a verified successful callback.
- [x] Add Payme payment initiation and callback/webhook verification with idempotent provider references and wallet crediting only after a verified successful callback.
- [x] Add admin payment-provider status, webhook event history, and Uzbek success/failure messaging; retain manual receipt fallback.
- [x] Add Telegram promotional broadcast campaigns for rare item listings with admin-only targeting, preview, delivery tracking, rate limiting, and failure reporting.
- [x] Refine Uzbek Telegram menus, admin payout-card visibility, receipt submission/review flow, and compact phone-first account cards with 3-row information hierarchy.
- [x] Recreate or update the reusable `telegram-mini-app-marketplace` skill through the documented `/skill-creator` workflow and validate it.
- [x] Add focused Vitest coverage for currency conversion, Click/Payme signature/idempotency, broadcast authorization/delivery handling, and compact card data.
- [x] Run full tests, production build, mobile screenshots, sync latest source to GitHub, trigger Railway deployment, and verify live endpoints without mutating real funds or sending an unapproved broadcast.

## New Scope: Wishlist, Neon Theme & Multilingual UI (2026-08-13)
- [x] Persist wishlist price snapshots and per-account price-drop alert preferences.
- [x] Create notifications when an authorized listing price decreases for opted-in wishlist users.
- [x] Add a visible wishlist price-drop toggle and translated saved-account states.
- [x] Enable a persistent neon dark/light mode toggle and synchronize Telegram WebApp colors.
- [x] Add Uzbek, English, and Russian language selection for core navigation, notifications, and wishlist UI.
- [ ] Update and validate the reusable `telegram-mini-app-marketplace` skill through the skill-creator workflow.
- [ ] Add focused regression coverage and run full Vitest/build/mobile checks.
- [ ] Sync the verified revision to GitHub and redeploy the same revision to Railway; report exact status without claiming unverified features.

## User Screenshot Audit & Repair Scope (2026-08-13)
- [x] Fix profile balance display so unauthenticated or zero balance clearly shows `0 so‘m` instead of broken symbol
- [x] Ensure profile edit dialog opens properly and allows saving Telegram handle, display name, bio, and avatar
- [x] Ensure deposit card flow clearly displays admin payment card details (`5614 3600 **** 7758 / Alimardonov U`) for copying and receipt upload
- [x] Verify account cards layout on mobile for compact 3-row touch ergonomics
- [x] Push verified fixes to GitHub and Railway deployment

## Telegram Bot Audit & Repair Scope (2026-08-13)
- [x] Inspect server/telegramBot.ts and webhook handlers to verify command handling (`/start`, `/market`, `/wallet`, `/profile`, `/support`, `/help`)
- [x] Verify reply keyboard markup and Mini App web_app button bindings in the Telegram bot
- [x] Verify outbound notification helper (`sendTelegramNotification`) and admin alerts for deposits/withdrawals
- [x] Push verified bot code to GitHub and trigger Railway update

## Telegram Bot Live Diagnosis & Repair (2026-08-13)
- [x] Check server startup logs for TELEGRAM_BOT_TOKEN initialization and webhook endpoint registration
- [x] Verify whether server/routers.ts or server/_core/index.ts registers POST `/api/telegram/webhook`
- [x] Test bot getMe and webhook status programmatically against Telegram Bot API
- [x] Ensure Railway receives the exact commit that registers the webhook and handles updates

## Destructive Railway Rebuild Scope (User Confirmed: IKKALASINI O'CHIR)
- [ ] Delete both confirmed Railway projects (`Inferno Stealth` and `comfortable-ambition`) using the Railway API or manual instructions
- [ ] Verify fresh Railway project creation and link it to the GitHub repository `umidjonalimardonov410-blip/pubg-akaunt-bot`
- [ ] Restore required environment variables in Railway (JWT_SECRET, DATABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS, PUBLIC_APP_URL, TELEGRAM_WEBHOOK_URL)
- [ ] Trigger fresh clean build and deployment on Railway from the GitHub `main` branch
- [ ] Verify live Railway public HTTP 200 health check, Mini App frontend, and Telegram webhook registration
