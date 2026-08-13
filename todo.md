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
- [x] Run tests, production build, mobile screenshots, then push GitHub and redeploy the exact commit to Railway.

## Saved Favorites UI Verification
- [x] Verify `/saved` in the browser for unauthenticated, loading, empty, and populated favorite states.
- [x] Add focused UI coverage for the saved/favorites page empty and loading states if the existing tests do not cover them.

## Mobile Readability and Seller Flow Repair
- [x] Increase phone-sized marketplace card readability: larger level labels, larger favorite heart hit targets, readable price/action controls, and less wasted/awkward space while preserving the three-column browse intent.
- [x] Verify the compact list mode remains readable and that the view toggle does not leave a visually broken intermediate state.
- [x] Make the profile page clearly require and use Telegram Mini App login, with a usable login prompt outside Telegram.
- [x] Repair seller image and video selection/upload flow and show clear upload progress, success, and error states.
- [x] Add focused regression coverage for profile Telegram gating and seller media upload behavior.
- [x] Run tests, build, mobile verification, GitHub push, and exact Railway redeploy after these repairs.

## Seller Upload Verification Gaps
- [x] Add a visible seller upload progress/loading state that is clearly shown while image/video files are being uploaded.
- [x] Add focused seller media regression coverage for invalid type, size limit, successful image/video selection, and upload submission states.
- [x] Re-verify the seller flow after the new upload-state test and only then finalize the release checklist.

## Production Mismatch Reported After Railway Deployment
- [x] Audit Railway runtime environment, deployed commit, Telegram webhook, Mini App URL, and bot command registration against GitHub main.
- [x] Reproduce the reported Telegram bot and Mini App flows that appear unchanged or non-functional.
- [x] Repair any runtime configuration, webhook, authentication, or production build mismatch discovered during the audit.
- [x] Re-run tests and production build after the repair.
- [x] Push the corrected commit to GitHub and redeploy that exact commit to Railway.
- [x] Verify the real Telegram entry flow, profile, seller, favorites, payments, and admin-facing routes in production.

## Single Source of Truth and Full Railway Release
- [x] Reconcile the complete Inferno Stealth source in this repository with GitHub main and remove any stale or split deployment path.
- [x] Repair every production blocker found in Telegram bot registration, Mini App authentication, webhook delivery, and Railway runtime configuration.
- [x] Run the full test suite and production build after the repairs.
- [x] Push one complete release commit to the configured GitHub repository.
- [x] Redeploy that exact release commit to the existing Inferno Stealth Railway project and confirm the service is online.
- [x] Verify the real bot webhook, Mini App launch, profile, seller, favorites, payment, and admin flows from production.

## Post-deploy Production Evidence — 2026-08-13
- [x] Confirm Railway deployment `0b7ef8ab-678b-4409-9ccd-75cc1daf8883` is `SUCCESS` on GitHub commit `4bd3f0318da860148edbf17828610b22bce047fe`.
- [x] Confirm Railway startup applied committed Drizzle migrations before serving traffic.
- [x] Confirm Railway startup registered Telegram commands, menu button, and webhook with `status=active`.
- [x] Send a controlled `/start` update through the live Telegram webhook and receive `httpStatus=200`, `handled=true`, `status=active`, and `sent=true`.
- [x] Verify signed Telegram WebApp authentication against production returns `httpStatus=200`, `ok=true`, and `loginMethod=telegram`.
- [x] Verify live marketplace, compact mode, favorites gate, profile gate, seller gate, escrow, admin protection, Click, and Payme routes after redeploy.
- [x] Preserve the previously verified 375px mobile layout because this release changes only server startup and Telegram bot behavior, not the mobile UI files.

## Final Regression Hardening — 2026-08-13
- [x] Add a real `SellPage` jsdom flow test covering file selection, pending upload progress, duplicate-submit prevention, upload completion, and account creation payload.
- [x] Re-check the live `/saved` route after the regression update; production shows the expected Telegram login gate.
- [x] Use existing `SavedPage.test.tsx` coverage for authenticated loading, empty, and populated states because those states require an authenticated Telegram session in the browser.

## Railway Restart Migration Repair — 2026-08-13
- [x] Make the production Drizzle migration bootstrap safe to retry when a previous deployment has already created one or more tables.
- [x] Add regression coverage for an existing-table migration retry and rerun the full test/build verification.
- [x] Push the idempotent migration fix to GitHub and redeploy the exact commit to Railway.
- [ ] Confirm the Railway startup probe is healthy and recheck the live Mini App after the retry-safe migration fix.

- [x] Correct over-escaped Drizzle migration-table identifiers that prevented the retry recovery SQL from executing.
- [x] Exercise the real `ensureProductionDatabaseSchema()` recovery path and prove non-ignorable SQL errors still fail startup.
- [x] Re-run final verification: 69 tests passed, 2 integration tests skipped, and production build succeeded.

## TiDB Recovery SQL Compatibility — 2026-08-13
- [x] Make migration recovery retry-safe for the observed TiDB JSON default syntax error without masking unrelated schema errors.
- [x] Add regression coverage for the JSON default syntax conflict and rerun the full test/build verification.
- [ ] Push the TiDB-compatible repair to GitHub and redeploy the exact commit to Railway.
- [ ] Confirm the Railway runtime startup probe is healthy and recheck the live Mini App after the repair.

## TiDB JSON Default Restriction — 2026-08-13
- [x] TiDB rejects defaults on the observed `pubg_accounts.featuredSkins` and `pubg_accounts.galleryUrls` JSON columns (`ER_BLOB_CANT_HAVE_DEFAULT`); strip those migration DEFAULT clauses during recovery.
- [x] Add regression coverage for the stripped JSON default and rerun tests/build.
- [ ] Push the stripped-default repair to GitHub and redeploy the exact commit to Railway.
- [ ] Confirm the Railway runtime startup probe is healthy and recheck the live Mini App after the repair.
