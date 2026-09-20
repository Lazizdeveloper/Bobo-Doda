# Code Change Review Workflow

For a single change (not a full production audit — see `production-readiness.md` for that). Run by `bobododa-engineering-lead` when invoked (see `.claude/workflows/task-routing.md`), or by the main coordinator directly per `.claude/review-matrix.md` when it isn't. The lead classifies and routes; it is never the reviewer of record and never the final approver — see the "Orchestration role" note at the top of `.claude/review-matrix.md`.

## 1. Identify change category

Backend, frontend, database, financial, devops/infra, SRE/observability, CI/CD/release, API/route/contract, or performance — per the review-matrix table. A change can span categories (e.g. a database migration touching the ledger is both Database and Financial; an auth endpoint change is both Backend and API/route/contract) — apply every matching row's requirements, not just the first one that fits. Any new endpoint, route/method/prefix change, generated-contract change, or frontend API-client change triggers the mandatory `api-contract-auditor` review listed in the matrix, on top of whatever else that category already requires.

## 2. Delegate to primary specialist

The primary implements or produces the initial finding, with evidence per the Evidence Standard (`release-gate.md`).

## 3. Delegate independent cross-review — mandatory, no self-approval

**The author of a change cannot be its only reviewer.** Concretely:

- `backend-engineer` implements an auth fix -> `security-engineer` review required, `api-contract-auditor` review required, `qa-engineer` regression required.
- `database-engineer` changes ledger schema -> `fintech-engineer` review required, `qa-engineer` for relevant tests, `release-engineer` final gate.
- `devops-engineer` changes Railway deployment config -> `sre-engineer` runtime verification required, `release-engineer` deployment-traceability check.
- `backend-engineer` or `frontend-engineer` changes a route path, API prefix, or generated contract -> `api-contract-auditor` review required, independent of whichever side authored the change.

The reviewer does not see this as "does the primary's explanation sound reasonable" — it independently re-checks the claim (runs the test itself, queries the endpoint itself, reads the constraint itself).

## 4. Require QA/security/fintech review per the matrix

Pull the exact required-reviewer list from `.claude/review-matrix.md` and the high-risk-change table. Do not shortcut this list because the change "seems small."

## 5. Resolve disagreement with independent evidence

If primary and reviewer disagree, follow `.claude/workflows/security-review.md`'s disagreement protocol (same mechanics apply to any domain, not just security): preserve both reports, compare evidence not confidence, escalate to a third relevant specialist, that specialist reproduces/checks independently, coordinator resolves only from the resulting evidence.

## 6. Send to release-engineer only after required reviews pass

`release-engineer` is the last step, not a substitute for the domain reviews above — it checks evidence quality and release mechanics, not domain correctness.

## Every finding, from any agent, uses this format

```
OWNER:
REVIEWER:

CLAIM:
EVIDENCE:

REVIEW RESULT: CONFIRMED / REJECTED / PARTIAL / UNKNOWN

SEVERITY: P0 / P1 / P2 / P3

REASON:

REQUIRED ACTION:

REGRESSION COVERAGE:
```
