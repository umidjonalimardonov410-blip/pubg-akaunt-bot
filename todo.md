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

## Telegram Bot Real-World Repair
- [x] Trace and document the exact cause of `setup_required`/`sent:false` by checking required env vars and Telegram API error responses
- [x] Implement and commit the actual bot fix if needed, then verify `handleTelegramUpdate` returns `sent:true` for `/start`
- [x] Add a focused test covering POST `/api/telegram/webhook` with a `/start` payload
- [x] Verify live bot reply after pushing and deploying

## Three-Across Marketplace Cards
- [x] Update marketplace account grid in Home.tsx / EnhancedPages.tsx to use grid-cols-3 (three items horizontally per row) with compact padding, smaller fonts, and concise badges
- [x] Verify touch readability and layout alignment on mobile viewport
- [x] Run test suite and production build verification
- [ ] Save checkpoint and deliver result

## Remove Pro and Enable Telegram Login
- [x] Remove Pro menu links, bottom navigation tab, and Pro pages/components
- [x] Wire Telegram WebApp `window.Telegram.WebApp.initDataUnsafe?.user` into automatic sign-in and profile synchronization
- [x] Ensure unauthenticated users are seamlessly authenticated via Telegram WebApp data or prompted to open inside Telegram Mini App
- [x] Run full test suite and production build verification

## Compact 4-5 Row View and GitHub Sync
- [x] Implement compact 4-5 row card mode triggered by marketplace layout button
- [x] Ensure all key details fit cleanly without vertical overflow
- [x] Run test suite and production build, and push to GitHub

## Final Compact Marketplace Polish
- [x] Replace the current expanded list card with a phone-first compact 4–5-row account view showing Level, K/D, Win Rate, Skins, and Price.
- [x] Make the marketplace layout toggle clearly switch between the 3-across browse grid and the compact detail list.
- [x] Verify both modes at 375px and a wider viewport without horizontal overflow or clipped information.
- [ ] Run Vitest and production build, then synchronize the final source to GitHub and verify the reachable deployment route.

## Live UI Sync Blocker
- [x] Determine why the user-facing bot/Mini App still serves the previous marketplace layout after local changes.
- [x] Compare the local commit, GitHub main, Railway deployment commit, and public Mini App response before claiming the change is live.
- [ ] Fix the deployment synchronization path or provide the exact remaining user action if Railway access is unavailable.

## Verification Gaps Before Release Checkpoint
- [x] Remove the remaining `/pro` Telegram command and unused Pro router exposure, or document why a non-user-facing compatibility path remains.
- [x] Verify the concrete Telegram WebApp initData user/auth synchronization path and add focused coverage if it is not directly implemented.
- [x] Verify the unauthenticated Mini App fallback or open-in-Telegram prompt from the actual code path.
- [ ] Capture an actual Railway deployment identifier or log record rather than inferring deployment state only from the live page.
- [ ] Only mark the compact marketplace release and deployment synchronization complete after the exact GitHub and Railway source states are reconciled.

## Railway Target Discovery
- [ ] Discover the Railway project/service/deployment target from available public metadata, repository integration, or authorized API responses without requiring manual identifier lookup.
- [ ] Attempt a targeted redeploy of the exact GitHub commit and verify the public Mini App after the redeploy attempt.
- [ ] If Railway access cannot be obtained, document the precise credential-scope limitation and keep the deployment item explicitly unresolved.

## Railway Static Serving Fix
- [ ] Fix production static serving to use the actual Vite output directory `dist/public` instead of missing `/app/public`.
- [ ] Add regression coverage for the production static path and verify the rebuilt Railway deployment serves `/` and `/accounts`.
