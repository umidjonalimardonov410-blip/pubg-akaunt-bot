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
- [x] Implement and locally verify the retry-safe existing-table migration; production startup was confirmed only after the later TiDB compatibility repairs.

- [x] Correct over-escaped Drizzle migration-table identifiers that prevented the retry recovery SQL from executing.
- [x] Exercise the real `ensureProductionDatabaseSchema()` recovery path and prove non-ignorable SQL errors still fail startup.
- [x] Re-run final verification: 69 tests passed, 2 integration tests skipped, and production build succeeded.

## TiDB Recovery SQL Compatibility — 2026-08-13
- [x] Make migration recovery retry-safe for the observed TiDB JSON default syntax error without masking unrelated schema errors.
- [x] Add regression coverage for the JSON default syntax conflict and rerun the full test/build verification.
- [x] Push and test commit `3a9df8e`; production startup was not healthy until the later stripped-default TiDB repair.

## TiDB JSON Default Restriction — 2026-08-13
- [x] TiDB rejects defaults on the observed `pubg_accounts.featuredSkins` and `pubg_accounts.galleryUrls` JSON columns (`ER_BLOB_CANT_HAVE_DEFAULT`); strip those migration DEFAULT clauses during recovery.
- [x] Add regression coverage for the stripped JSON default and rerun tests/build.
- [x] Push the stripped-default repair to GitHub and redeploy the exact commit to Railway.
- [x] Confirm the Railway runtime startup probe is healthy and recheck the live Mini App after the repair.

## Final TiDB-Compatible Production Verification — 2026-08-13
- [x] Final verified source: GitHub main commit `d584bc7b9514b779e702658193054e6a80d5a1f9`.
- [x] Final verified Railway deployment: `3e553782-8f60-4dc1-bf02-1f4724d1f9e5`, status `SUCCESS`.
- [x] Final startup logs show migrations applied, server running, and Telegram commands/menu/webhook active.
- [x] Final live `/start` webhook returned HTTP 200 with `sent=true`; signed Telegram auth returned HTTP 200 with `loginMethod=telegram`.
- [x] Final live root, marketplace grid, compact mode, profile gate, Saved gate, and seller gate were verified after the successful deployment.

## Phase 2–6: Telegram Media Selling, Admin Payout, Click/Payme Production Integration — 2026-08-13
- [x] Improve seller form UI for mobile users (clear drag/drop or tap upload, thumbnail preview, file size/type validation warnings, and progress feedback).
- [x] Test admin payout queue, approval/rejection actions, and audit-log entries with controlled staging data.
- [x] Configure Click and Payme production merchant keys via `webdev_request_secrets` and test provider webhooks. Automated merchant keys remain intentionally inactive because the requested production workflow was changed to manual receipt verification.
- [x] Run full Vitest suite, build production bundle, push to GitHub, and deploy to Railway.
- [x] Verify production deployment and report final status to the user.

## Manual Balance Top-Up Workflow — 2026-08-14
- [x] Audit the existing wallet, receipt, admin review, and S3 media paths for manual balance deposits.
- [x] Add fixed 10,000 / 20,000 / 50,000 UZS top-up choices with the configured card number and cardholder display.
- [x] Add Telegram receipt image upload with validation, pending-review status, and admin visibility.
- [x] Add admin approve/reject actions with idempotent automatic wallet credit on approval.
- [x] Add Uzbek user/admin notifications and audit-log entries for receipt lifecycle changes.
- [x] Add regression tests for receipt validation, approval, rejection, duplicate approval, and wallet credit.
- [x] Run the full test suite and production build, push to GitHub, redeploy to Railway, and verify the flow in production.


## Manual Wallet Receipt Review — 2026-08-14
- [x] Replace instant wallet top-up with manual 10k/20k/50k UZS receipt submission and S3-backed receipt metadata.
- [x] Add admin deposit receipt queue with image preview, status filtering, approve/reject actions, balance credit, notifications, and audit events.
- [x] Add payout queue review and audit-log visibility for administrators.
- [x] Add Telegram wallet menu and receipt-photo capture workflow with user/admin notifications.
- [x] Replace Profile wallet top-up UI with card-owner instructions, fixed amount choices, receipt upload, and pending status.
- [x] Extend admin dashboard with deposit review, payout queue, and audit sections.
- [x] Add regression tests for receipt submission, approval/rejection idempotency, payout review, Telegram photo capture, and mobile UI states.
- [x] Verify manual wallet flow in development and production, build the project, push source to GitHub, and save a live checkpoint.


## User Transaction and Notification Enhancements — 2026-08-14
- [x] Add a mobile-first transaction history page showing all wallet top-ups, withdrawals, refunds, purchases, and seller payouts.
- [x] Add transaction history navigation from Profile and the main mobile menu.
- [x] Show receipt review pending status and loading animation during receipt upload/submission.
- [x] Surface approval and rejection notifications in the user-facing app with unread/read handling.
- [x] Add regression tests for transaction history, pending receipt UI, and notification display.
- [x] Verify the new flows with the test suite, production build, and mobile screenshots.
- [x] Commit and push the verified changes to GitHub.
- [x] Save a release checkpoint after the GitHub push.


## Final Seller Media QA Hardening — 2026-08-14
- [x] Add mobile-friendly thumbnail/video previews and inline file validation feedback to the seller media picker.
- [x] Add focused regression coverage for seller preview rendering and validation messages.


## Public Marketplace and Listing Management Repair — 2026-08-14
- [x] Verify user-created accounts become publicly visible in the marketplace after the listing lifecycle completes, rather than remaining stuck in review-only UI.
- [x] Repair listing status/approval behavior so approved public listings appear in the bot and Mini App marketplace without weakening admin moderation controls.
- [x] Add or repair owner-only listing edit controls and update procedures for account details, price, description, and media.
- [x] Repair Telegram bot marketplace navigation and listing-management buttons for public browsing and owner editing.
- [x] Add regression tests for public listing visibility, owner authorization, listing updates, and Telegram marketplace controls.
- [x] Verify mobile and production flows, push the repaired release to GitHub, and save a checkpoint.


## Open Marketplace, Filters, and Seller Notifications — 2026-08-14
- [x] Ensure every Telegram-authenticated user can open the seller flow and add a PUBG account without an admin-only gate.
- [x] Verify all available public listings are returned to marketplace users and add regression coverage for multi-seller visibility.
- [x] Add public marketplace filters for minimum/maximum price and account category with reset behavior and mobile layout.
- [x] Notify sellers in Telegram when their account is successfully sold and when a buyer sends a new message.
- [x] Improve profile listing editing with field-level validation errors, server-error mapping, and save/loading feedback.
- [x] Run full tests/build/mobile verification, push the changes to GitHub, and save a release checkpoint.
