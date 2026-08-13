# Visual verification

## 2026-08-13

- Mobile viewport: 390x844. The black/red Inferno Stealth shell renders without horizontal overflow, with a compact header, readable hero copy, touch-sized actions, and a sticky five-tab bottom navigation.
- Desktop viewport: 1280x720. The header uses the full navigation layout, the hero remains balanced, and the featured account card is legible with clear status and pricing hierarchy.
- Automated checks completed after the latest profile authorization and seller-history changes: 19 Vitest files passed, 63 tests passed, 2 integration tests skipped by design; production build completed successfully.

## Live deployment verification

The latest GitHub commit [e708aa5](https://github.com/umidjonalimardonov410-blip/pubg-akaunt-bot/commit/e708aa5b5f67cb8e20c0438e05391da1538e0d1a) was deployed to the existing Railway production service. Railway deployment `3dddf9fc-c7be-409f-af7a-1e15e8417ea0` progressed from BUILDING to DEPLOYING to SUCCESS on 2026-08-13. The public service [inferno-stealth-production.up.railway.app](https://inferno-stealth-production.up.railway.app/) returned HTTP 200 with the Inferno Stealth title. The protected `admin.getWithdrawalRequests` route returned HTTP 401 for an unauthenticated request, confirming the admin queue is not publicly accessible; no withdrawal or wallet mutation was submitted.
