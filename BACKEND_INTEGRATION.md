# Backend API Architecture & Integration Blueprint

This document defines the production API architecture intended to replace `lib/mock-api`. The frontend relies strictly on `lib/api/client.ts` as the bridge.

## 1. Authentication & RBAC

- **JWT Strategy**: Access tokens (15m expiry, stateless), Refresh tokens (7d expiry, stored in DB/Redis for revocation).
- **Session Security**: Multi-device sessions supported. Force logout available via Admin/SuperAdmin endpoints mapping to Redis token blacklists.
- **Roles**:
  - `Buyer`: Creates jobs, sends offers, funds escrow.
  - `Specialist`: Creates services, submits proposals, submits work.
  - `Admin`: Operational queues (KYC, Disputes, Withdrawals, Reports).
  - `SuperAdmin`: System settings, admin roles, global analytics, security center.
- **OTP**: Registration, Login, and Password Reset require a 6-digit OTP verified via a backend service (Telegram integration/SMS).

## 2. Escrow & Payments System

The core of the platform is the milestone-based escrow system.

### Escrow Lifecycle:
1. **Contract Signed**: Buyer and Specialist agree on a Contract and its Milestones. Status: `signed`.
2. **Funding**: Buyer pays the full contract amount. Status changes to `active`. Escrow ledger is credited. Milestone statuses become `mablaglangan`.
3. **Submission**: Specialist submits a milestone. Status: `topshirildi`.
4. **Acceptance & Payout**: Buyer accepts, or 3-day auto-accept job fires. Status: `qabul_qilindi`. Ledger moves funds from Escrow to Specialist's available balance minus commission.
5. **Revisions**: Buyer can request changes (`ozgartirish_soraldi`).
6. **Refunds/Cancellation**: Unfunded contracts are cancelled. Funded contracts require mutual agreement or Admin dispute resolution to refund.

### Wallet & Ledger:
Immutable double-entry ledger. Types: `deposit`, `escrow`, `release`, `refund`, `withdrawal`, `commission`.

## 3. Core API Endpoints

All endpoints require JWT `Authorization: Bearer <token>` unless marked public.

### Auth (`/api/v1/auth`)
- `POST /register`: Request OTP.
- `POST /verify`: Verify OTP & issue tokens.
- `POST /login`: Request OTP.
- `POST /refresh`: Issue new access token.
- `POST /logout`: Invalidate refresh token.

### Users & Profiles (`/api/v1/users`)
- `GET /me`: Current user (password omitted).
- `PATCH /me`: Update settings.
- `GET /specialists`: Paginated catalogue of active specialists.
- `GET /specialists/:id`: Public profile.

### Jobs & Proposals (`/api/v1/jobs`)
- `POST /`: Create job.
- `GET /`: Search jobs (Buyer owns, or Specialist browsing).
- `POST /:jobId/proposals`: Submit bid.
- `POST /:jobId/proposals/:proposalId/hire`: Convert bid to Contract.

### Contracts & Escrow (`/api/v1/contracts`)
- `GET /`: List user's contracts.
- `POST /:id/fund`: Initiate Click/Payme intent.
- `POST /:id/milestones/:mId/submit`: Submit work (requires attachment ID).
- `POST /:id/milestones/:mId/accept`: Release funds to Specialist.
- `POST /:id/cancel`: Cancel contract & refund if applicable.

### Admin & Moderation (`/api/v1/admin`)
- `GET /queues/kyc`: Pending verifications.
- `POST /queues/kyc/:id/approve`: Approve KYC.
- `GET /queues/withdrawals`: Pending payouts.
- `POST /queues/withdrawals/:id/approve`: Process payout via gateway.
- `POST /security/revoke-all`: SuperAdmin only. Invalidate all user sessions via Redis.

## 4. Notifications & Websockets
- **WebSocket (WSS)**: Connect with JWT. Used for:
  - Real-time chat messages (`/api/v1/messages`).
  - Contract state changes.
  - Push notifications.
- **Offline Delivery**: BullMQ workers send fallback emails or Telegram alerts for unread notifications after 15 minutes.

## 5. File Handling & CDN
Files (Avatars, Portfolios, Deliverables) must bypass the Node.js process:
1. Client requests a pre-signed URL: `POST /api/v1/storage/upload-url` (MIME, size checked).
2. Client uploads directly to S3.
3. Client sends the S3 object key to the backend resource (e.g. `POST /api/v1/messages`).
4. Backend triggers ClamAV scan worker. If infected, file is deleted and user notified.

## 6. Real-time Search
- Implement PostgreSQL Full-Text Search (FTS) or Elasticsearch for:
  - `/api/v1/jobs?q=veb`
  - `/api/v1/specialists?q=dizayn`
  - `categories` and `skills` facet filtering.
