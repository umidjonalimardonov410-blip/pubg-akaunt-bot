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
- [ ] Perform a non-destructive live smoke check of the withdrawal/admin queue without submitting a real payout
- [ ] Rotate the GitHub personal access token used for the repository transfer

## New Feature Requests (Payout Cards, Profiles, Withdrawals & 3-Column Layout)
- [x] Add payout card support (5614 3600 **** 7758 / Alimardonov U) with masked display for users and secure admin view
- [x] Upgrade account listings to a clean 3-column responsive grid on desktop and 1-column on mobile
- [x] Build a robust user profile showing Telegram ID, username, active listings, and sold-account history ("Sotilgan akkauntlar")
- [x] Implement wallet withdrawal requests with admin notification, user check/receipt verification guidance, and admin approval/rejection workflow
- [x] Connect all Telegram start menu commands and web app buttons to the updated marketplace flows
- [x] Run full test suite, production build, and redeploy to Railway
