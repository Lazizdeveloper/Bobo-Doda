# Backend integration contract

The UI imports application data only through `lib/api`. The current adapter
delegates to `lib/mock-api`; backend work should replace `lib/api/client.ts`
without changing pages or components.

## Boundaries

- `auth`: session, login, registration, verification, role selection
- `users`: current user, buyer/seller profiles and account settings
- `jobs`: create, list, detail, edit/close
- `proposals`: submit, list, employer review, withdraw and hire
- `offers`: create, list, accept, decline and withdraw
- `contracts`: list, detail, cancellation and lifecycle
- `milestones`: funding, submission, revision and acceptance
- `payments`: intents, provider hand-off, capture, refund, payout and ledger
- `messages`: contract/offer threads and messages
- `notifications`: user-owned notification feed
- `reviews`: eligibility, submission and publication
- `disputes`: case creation, evidence, response and resolution
- `admin`: authentication, permissions, moderation, audit and incidents

Interface definitions live in `lib/api/contracts.ts`. Entity transition rules
live in `lib/api/state-machines.ts`. Backend implementations must enforce the
same transitions and actor permissions server-side; frontend checks are only UX.

## Response and error conventions

Single-resource operations resolve to the typed DTO. List endpoints should use:

```ts
interface ApiPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
```

All failures must normalize to `ApiErrorShape` from `lib/api/errors.ts`.

- `401 UNAUTHENTICATED`: no valid session
- `403 FORBIDDEN`: authenticated but action is not permitted
- `404 NOT_FOUND`: resource absent or deliberately hidden by ownership policy
- `410 DELETED` / `EXPIRED`: known terminal resource
- `409 CONFLICT` / `INVALID_TRANSITION`: stale version or illegal lifecycle action
- `422 VALIDATION`: field errors
- `429 RATE_LIMITED`: retry according to server metadata
- `503 PAYMENTS_PAUSED`: operational guard

Mutations should accept an idempotency key. Concurrent updates should use an
entity version or ETag and return `409` when stale.

## Authentication

Do not store access tokens in `localStorage`. Prefer an HttpOnly, Secure,
SameSite cookie session. Every endpoint must verify resource-level ownership;
route visibility is not authorization.

Admin authentication is a separate security boundary with MFA and server-side
RBAC. Audit events are append-only and cannot be edited by admins.

## Payment hand-off

Card PAN/CVV must be collected by provider-hosted fields or redirect flows.
The application receives provider tokens/references only. Payment status changes
come from verified webhooks, not from the browser redirect alone.

Required identifiers:

- internal payment ID
- provider reference
- contract and milestone IDs
- idempotency key
- immutable ledger entry IDs
- correlation/request ID

## Pagination and cancellation

Production list endpoints use cursor pagination and stable sorting. Search and
filter state belongs in URL query parameters. Every request adapter accepts an
`AbortSignal`; route/filter changes cancel obsolete requests.

## Route result model

Dynamic resources distinguish:

- loading
- available
- unauthenticated
- forbidden
- not found
- deleted
- expired
- transient failure

The adapter maps HTTP status/error codes to these states. It must not turn all
authorization and network failures into an empty list.

## Backend acceptance criteria

1. Contract tests cover every service interface.
2. State-machine transition tests cover allowed and denied actors.
3. Ownership tests attempt cross-account reads and writes.
4. Payment mutations are idempotent and transactionally consistent.
5. Playwright lifecycle, stress and accessibility suites pass against the API.
6. No page imports storage, transport details, or backend-specific SDKs.
