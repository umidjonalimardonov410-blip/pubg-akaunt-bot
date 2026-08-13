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
- [x] Save checkpoint and deliver result

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
- [x] Run Vitest and production build, then synchronize the final source to GitHub and verify the reachable deployment route.

## Live UI Sync Blocker
- [x] Determine why the user-facing bot/Mini App still serves the previous marketplace layout after local changes.
- [x] Compare the local commit, GitHub main, Railway deployment commit, and public Mini App response before claiming the change is live.
- [x] Fix the deployment synchronization path or provide the exact remaining user action if Railway access is unavailable.

## Verification Gaps Before Release Checkpoint
- [x] Remove the remaining `/pro` Telegram command and unused Pro router exposure, or document why a non-user-facing compatibility path remains.
- [x] Verify the concrete Telegram WebApp initData user/auth synchronization path and add focused coverage if it is not directly implemented.
- [x] Verify the unauthenticated Mini App fallback or open-in-Telegram prompt from the actual code path.
- [x] Capture an actual Railway deployment identifier or log record rather than inferring deployment state only from the live page.
- [x] Only mark the compact marketplace release and deployment synchronization complete after the exact GitHub and Railway source states are reconciled.

## Railway Target Discovery
- [x] Discover the Railway project/service/deployment target from available public metadata, repository integration, or authorized API responses without requiring manual identifier lookup.
- [x] Attempt a targeted redeploy of the exact GitHub commit and verify the public Mini App after the redeploy attempt.
- [x] Railway access was obtained; the conditional credential-scope limitation path was not required.

## Railway Static Serving Fix
- [x] Fix production static serving to use the actual Vite output directory `dist/public` instead of missing `/app/public`.
- [x] Add regression coverage for the production static path and verify the rebuilt Railway deployment serves `/` and `/accounts`.

## Final Root Route Verification
- [x] Verify the live Railway root route `/` after deployment `71396c32-9e8c-4eac-bff7-31c6babec934` serves the SPA instead of `Not Found`.
- [x] If the root route still fails, fix the production route/static fallback and re-verify both `/` and `/accounts`.
- [x] Deliver the verified checkpoint/result to the user with the checkpoint attachment.

## Favorite Accounts and Toggle Animation
- [x] Make favorite/save work persistently for authenticated users and reflect active state in both 3-column cards and compact rows.
- [x] Verify the saved/favorites view shows the user’s saved accounts and handles empty/loading states cleanly.
- [x] Add a polished phone-first transition animation when switching between 3-column and 5-row compact modes, respecting reduced-motion preferences.
- [x] Add or update focused Vitest coverage for favorite toggling and layout-state behavior.
- [ ] Run tests, production build, mobile screenshots, then push GitHub and redeploy the exact commit to Railway.

## Saved Favorites UI Verification
- [ ] Verify `/saved` in the browser for unauthenticated, loading, empty, and populated favorite states.
- [ ] Add focused UI coverage for the saved/favorites page empty and loading states if the existing tests do not cover them.

## Mobile Readability and Seller Flow Repair
- [x] Increase phone-sized marketplace card readability: larger level labels, larger favorite heart hit targets, readable price/action controls, and less wasted/awkward space while preserving the three-column browse intent.
- [x] Verify the compact list mode remains readable and that the view toggle does not leave a visually broken intermediate state.
- [x] Make the profile page clearly require and use Telegram Mini App login, with a usable login prompt outside Telegram.
- [x] Repair seller image and video selection/upload flow and show clear upload progress, success, and error states.
- [x] Add focused regression coverage for profile Telegram gating and seller media upload behavior.
- [ ] Run tests, build, mobile verification, GitHub push, and exact Railway redeploy after these repairs.

## Seller Upload Verification Gaps
- [ ] Add a visible seller upload progress/loading state that is clearly shown while image/video files are being uploaded.
- [ ] Add focused seller media regression coverage for invalid type, size limit, successful image/video selection, and upload submission states.
- [ ] Re-verify the seller flow after the new upload-state test and only then finalize the release checklist.
