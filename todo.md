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
- [ ] Push the latest Node 18 compatibility fix and path-preserved source tree to GitHub after write permission is granted
- [ ] Configure TELEGRAM_BOT_TOKEN and webhook after the user supplies a Telegram BotFather token
