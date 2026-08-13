# Inferno Stealth Ultimate Pro Marketplace & Telegram Mini App TODO

## Database & Backend Pro Modules
- [x] Add tables for AI price evaluation rules & estimation history
- [x] Add tables for support tickets & messages
- [x] Add tables for anti-fraud device/IP audit logs
- [x] Add tables for seller verification requests & badges
- [x] Add tables for premium listing placements & promotions
- [x] Add tRPC procedures for AI price estimation
- [x] Add tRPC procedures for support tickets and user messaging
- [x] Add tRPC procedures for seller verification and analytics
- [x] Add tRPC procedures for premium ad boosting and anti-fraud checks

## Frontend Pro UI & Telegram Mini App Experience
- [x] Build AI Account Price Estimator widget in Uzbek
- [x] Build Seller Analytics & Revenue Dashboard in Uzbek
- [x] Build Support Ticket Hub & Live Help in Uzbek
- [x] Build Account Comparison (Yonma-yon solishtirish) tool in Uzbek
- [x] Build Premium Listing Booster & Ad Campaign UI in Uzbek
- [x] Build Anti-Fraud Security Check & 2FA Status card in Uzbek
- [x] Integrate Telegram Mini App bot command simulation and webhook simulator in Uzbek

## Testing, Build & Delivery
- [x] Run full test suite covering all new pro procedures
- [x] Run production build and verify clean output
- [x] Save final checkpoint and package complete source ZIP
- [x] Add support_ticket_messages table for threaded user/admin support conversations
- [x] Add threaded support message procedures and live-help UI
- [x] Add a dedicated seller badge audit/model or revise seller badge tracking to be explicit
- [x] Add tests for support ticket, verification, and seller dashboard procedures
- [x] Add premium promotion and anti-fraud procedure/UI coverage before final release
- [x] Add a /pro-tools alias route and verify direct-route access for Telegram Mini App use
- [x] Add configurable price evaluation rules table and admin-managed rule query
- [x] Extend security audit storage with anonymized IP and device/session metadata
- [x] Add real anti-fraud evaluation procedure using risk rules and security audit persistence
- [x] Add TOTP-compatible two-factor setup, confirmation, and status flow
- [x] Add 2FA setup/status UI in the Uzbek Pro Tools security section
- [x] Add webhook simulation state and request preview to the Telegram command simulator
- [x] Add Pro router contract/feature tests and full-suite validation for support, verification, seller analytics, premium, and anti-fraud modules
- [x] Save a fresh checkpoint and package the final post-Pro Tools source ZIP
- [x] Add functional Vitest coverage for anti-fraud risk scoring and security audit persistence
- [x] Add functional Vitest coverage for the TOTP 2FA begin/confirm/disable lifecycle
- [x] Add functional Vitest coverage for premium promotion creation/listing and support threaded messaging
- [x] Add procedure-level coverage for seller verification submission and seller dashboard analytics responses
- [x] Add functional Vitest coverage for pro.promotions.mine listing after a seller promotion is created
- [x] Add functional Vitest coverage for pro.messages.list history retrieval and user/admin access control
- [x] Add a stateful Vitest that calls pro.promotions.create then pro.promotions.mine and verifies seller scoping
- [x] Add a pro.messages.list test proving admin retrieval is allowed while an unrelated user is forbidden
# Mobile-First Telegram Mini App Optimization
- [x] Replace desktop sidebar/header navigation with a touch-friendly bottom navigation bar and mobile top bar
- [x] Optimize account listing cards, image galleries, and filter drawers for 360-430px phone viewports
- [x] Make account detail pages, escrow steps, and seller forms single-column and thumb-reachable
- [x] Adapt Pro Tools, AI pricing estimator, and Telegram command simulator for compact mobile screens
- [x] Verify responsive layouts with mobile viewport screenshots and save checkpoint

## Pro Marketplace Expansion — requested by user
- [x] Add trust profile with real completed-sale metrics, response rate, verification badges, and seller status
- [x] Add completed-order review flow with anti-duplicate safeguards and buyer/seller rating summaries
- [x] Add dispute center with evidence upload metadata, status timeline, admin resolution, and notifications
- [x] Add payment-ready checkout provider abstraction with Click/Payme configuration fallback and escrow payment status
- [x] Add Telegram notification delivery abstraction for order, chat, dispute, and referral events
- [x] Add saved-search and price-drop alert settings
- [x] Add expanded PUBG filters for Glacier, X-Suit, Conqueror history, old account, verified seller, and media availability
- [x] Add referral dashboard with promo codes, milestones, and truthful reward ledger
- [x] Add seller CRM dashboard with listing funnel, views, chats, orders, revenue, and quick actions
- [x] Add admin trust/dispute/payment monitoring surface
- [x] Add Uzbek mobile-first UI for all expansion modules with accessible empty/loading/error states
- [x] Add Vitest coverage for new procedures, authorization, state transitions, and provider fallbacks
- [x] Run database migration, tests, production build, and responsive screenshots
- [x] Save a published checkpoint and package the updated source ZIP

## Gap-closure history
- [x] Add explicit anti-duplicate review tests/procedure evidence for completed-order reviews and surface buyer/seller rating summaries in code/tests
- [x] Implement and expose a dispute status timeline/history surface
- [x] Wire the Telegram delivery abstraction into alert preference and dispute update flows with safe fallback handling
- [x] Persist alert preferences and add a media-availability marketplace filter
- [x] Add seller listing view-count metrics to CRM backend/UI
- [x] Add explicit loading and error states for expansion queries
- [x] Add Vitest coverage for the existing expansion authorization/provider contracts and validate final transition behavior
