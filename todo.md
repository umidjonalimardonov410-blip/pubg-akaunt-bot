# PUBG Inferno Market - Implementation Checklist

## Database & Backend
- [x] Database schema (accounts, orders, reviews, transactions, notifications)
- [x] tRPC procedures for accounts CRUD
- [x] tRPC procedures for orders and escrow flow
- [x] tRPC procedures for reviews and ratings
- [x] tRPC procedures for wallet and transactions
- [x] tRPC procedures for admin operations
- [x] S3 storage integration for media uploads
- [x] Notification system (email and in-app)

## Frontend Pages
- [x] Landing page with hero banner and featured listings
- [x] Account listings page with grid/list toggle
- [x] Search and filter system (price, level, region, skins)
- [x] Account detail page with gallery and video support
- [x] Sell account form with media upload
- [x] User profile and wallet page
- [x] Orders page with active/completed tabs
- [x] Escrow trade flow (3-stage process)
- [x] Ratings and reviews page
- [x] Admin panel with statistics and management
- [x] Support and FAQ page

## Styling & Theme
- [x] Inferno Stealth branding (matte black + glowing red)
- [x] Responsive design for mobile and desktop
- [x] All content translated to Uzbek
- [x] Custom CSS for fire effects and animations

## Features
- [x] Authentication integration and profile viewing
- [x] Secure escrow trading system
- [x] Media gallery with image and video support
- [x] Seller ratings and review system
- [x] Admin verification and dispute management
- [x] Wallet top-up and withdrawal
- [x] Transaction history
- [x] Near-real-time in-app notifications (30-second polling)
- [x] Search and filtering with smart suggestions

## Testing & Deployment
- [x] Unit tests for critical procedures
- [x] Integration tests for order flow
- [x] Visual testing on mobile and desktop
- [x] Performance baseline: cached data queries and bounded notification polling
- [x] Final checkpoint saved; publishing remains a user action in the Management UI
- [x] Smart search autocomplete suggestions for account ID, player name, and skins
- [x] Suggestion-selection UI test coverage
- [x] Add frontend component tests for autocomplete dropdown visibility and skin/account/player selection
- [x] Add integration coverage for autocomplete loading and empty states
- [x] Add escrow flow regression coverage for the exact three stages and status labels
- [x] Implement real escrow fund handling: freeze buyer balance, record hold/release transactions, and settle on confirmation or cancel/dispute
- [x] Add tests for accounts.create, media.upload validation, reviews permissions/idempotency, wallet transactions, and admin actions
- [x] Add a persistence-boundary order flow test covering create through Completed plus forbidden access and invalid transitions
- [x] Ensure Home.escrow.test.ts is discovered and executed by the final Vitest command

## Pro Marketplace & Telegram Mini App Enhancements
- [x] Add Telegram WebApp SDK bootstrap with header/background sync, expand, BackButton, and haptic feedback helpers
- [x] Add Telegram Mini App deep-link/share utilities for account listings and referrals
- [x] Add favorites/watchlist persistence with buyer-facing saved accounts view
- [x] Add buyer-seller secure chat threads scoped to an account/order with admin-readable procedures
- [ ] Add seller profile editing and public seller trust card with verification, badges, rating, sales count, and response indicators
- [ ] Add account comparison and recently viewed listings for faster purchase decisions
- [x] Add referral/invite tracking with Uzbek share copy and wallet reward ledger
- [ ] Add stronger seller media validation, upload limits, and listing draft/preview flow
- [ ] Add admin audit log and marketplace analytics export-ready queries
- [x] Add Telegram helper tests for deep links, initialization, and haptic behavior
- [x] Re-run TypeScript, Vitest, production build, and desktop/mobile visual checks
- [x] Save a new checkpoint and package the updated Mini App source ZIP
- [x] Parse Telegram start_param or startapp referral payload and automatically stage/claim it after authentication
- [x] Add referral deep-link attribution test coverage for incoming ref_ payloads
- [x] Add Home referral adapter coverage that verifies authenticated Telegram payload triggers profile.claimReferral once
- [x] Add referral auto-claim edge-case tests for duplicate/self-referral errors and sessionStorage deduplication
- [x] Add a Home.tsx/client component test that mocks authenticated Telegram start_param and verifies profile.claimReferral is invoked once
- [x] Add an explicit self-referral error test and confirm sessionStorage deduplication for that response
