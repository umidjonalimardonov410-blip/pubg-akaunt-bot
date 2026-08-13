# Inferno Stealth Configuration & Polishing

- [x] Configure Telegram Bot commands, description, and short description via API
- [x] Ensure Click and Payme webhook handlers return proper provider-compliant responses (JSON-RPC for Payme, Click status format)
- [x] Verify automated price-drop notification checking mechanism
- [x] Perform final full build and production verification

## Mobile-First Verification & Strict 390px Adaptation

- [x] Capture 375x812 mobile viewport screenshots across marketplace, account cards grid, and profile
- [x] Verify that account listings use compact mobile-optimized grid (no desktop sidebars)
- [x] Confirm Telegram WebApp header, safe areas, and bottom navigation bar are properly fitted
- [x] Run full test suite and production build verification

- [x] Mobile verification states documented: `/accounts` marketplace/listing cards, `/saved` wishlist, `/profile` wallet/profile, `/pro` Pro tools, `/support` help center at 375x812; all rendered without horizontal overflow.
