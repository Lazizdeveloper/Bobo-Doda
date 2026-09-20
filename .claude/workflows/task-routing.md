# Task Routing Workflow

How an incoming engineering task gets classified and routed to the minimum sufficient independent review team. Run by `bobododa-engineering-lead` (`.claude/agents/bobododa-engineering-lead.md`) when invoked, or by the main coordinator directly per the same rules when it isn't. This workflow does not replace `.claude/workflows/code-change-review.md` or `production-readiness.md` — it's the step that decides which of those apply and to whom, before either one starts.

**The point of this system is not "spawn every agent." It is "spawn the minimum sufficient independent review team for the risk."** Naming the specialists you are deliberately excluding is as much a part of routing as naming the ones you're including.

## INPUT

A user task — a bug report, a feature request, a production incident, a CI failure, anything that touches the Bobo&Doda codebase or its infrastructure.

## STEP 1 — Classify affected domains

One or more of: `BACKEND`, `FRONTEND`, `AUTH_SECURITY`, `DATABASE`, `FINANCIAL`, `API_CONTRACT`, `DEVOPS_INFRA`, `SRE_OPERATIONS`, `PERFORMANCE`, `QA_TESTING`, `RELEASE`. Most real tasks span more than one — classify all of them, not just the most obvious.

## STEP 2 — Classify risk

`LOW` / `MEDIUM` / `HIGH` / `CRITICAL` — see `.claude/agents/bobododa-engineering-lead.md` for the definitions and examples. Risk drives how strict the no-self-approval and disagreement rules are enforced, not whether they apply at all — they always apply.

## STEP 3 — Select primary owner

One specialist per `.claude/review-matrix.md`'s table, matched to the domain(s) from Step 1. If domains span multiple rows, the primary is whichever specialist owns the actual defect's root cause, not whichever domain was mentioned first.

## STEP 4 — Select mandatory reviewers

Pull the exact list from `.claude/review-matrix.md` (the base table, the `api-contract-auditor` mandatory-trigger list, and the high-risk-change table). Do not shortcut this because the change "seems small" — risk level affects urgency and depth, not whether a required reviewer is skipped.

## STEP 5 — Select optional reviewers based on actual impact

Add a reviewer beyond the mandatory list only when the specific evidence in front of you shows it's relevant (e.g. `performance-engineer` only if there's an actual latency/throughput claim; `fintech-engineer` only if a financial table or invariant is actually touched). Do not add reviewers "to be safe" — that defeats the minimal-team goal and dilutes accountability for who actually checked what.

## STEP 6 — Independent investigations

Every mandatory and selected reviewer investigates independently before anyone compares conclusions. Task each one with the question, not with another agent's answer — see `.claude/workflows/production-readiness.md` Phase A. This is the step most likely to be shortcut under time pressure; it is also the step that catches shared blind spots, so it is never skipped.

## STEP 7 — Implementation (if requested)

If the task asks for a fix, the primary specialist's role is to produce the finding with evidence; only the main coordinator (not a read-only specialist subagent) can actually edit files in this environment. The specialist that identified the root cause is never the sole verifier of the resulting fix — that verification goes back through Steps 4-6 against the actual diff.

## STEP 8 — Cross-review

Once independent reports exist, compare them. Agreement: proceed. Disagreement (PASS vs FAIL, PASS vs UNKNOWN, or any other real conflict): follow the disagreement protocol in `.claude/workflows/security-review.md` — third independent specialist, reproduces the claim, coordinator resolves only from that evidence. Never resolved by vote, confidence, or answer length.

## STEP 9 — Regression validation

`qa-engineer` confirms regression coverage exists for whatever was fixed — not just that it currently passes once. Domain-specific validation (unit/integration/e2e, contract drift checks, boot-time config checks) runs per `.claude/workflows/code-change-review.md`.

## STEP 10 — Release gate if production-affecting

Anything that will reach a real environment goes through `.claude/workflows/release-gate.md`. `release-engineer` checks evidence quality, CI status, deployment traceability, and rollback readiness — it does not re-litigate domain correctness, and it cannot override a specialist's FAIL without new, independently-verified evidence. Nothing here authorizes an actual production mutation, deploy, or branch-protection change without the human user's explicit authorization to the main coordinator.

## Worked examples

Each example shows the routing decision only — actual investigation follows Steps 6-10 as normal.

**AUTH BUG** (e.g. a login or OTP flow returning an unexpected error)
Classification: `BACKEND` + `AUTH_SECURITY` + `API_CONTRACT`. Risk: `HIGH`.
Primary: `backend-engineer`. Required: `security-engineer`, `api-contract-auditor`, `qa-engineer`. Final: `release-engineer`.
Not needed (unless evidence expands scope): `database-engineer`, `fintech-engineer`, `performance-engineer`.

**API CONTRACT BUG** (e.g. a route 404s in production, or the generated OpenAPI contract disagrees with the live server)
Classification: `BACKEND` + `FRONTEND` + `API_CONTRACT`. Risk: `HIGH` (production-facing route breakage) or `MEDIUM` (contract drift caught before deploy).
Primary: `backend-engineer` (or `frontend-engineer` if the defect is purely in the client's base-URL/path construction). Required: `api-contract-auditor`, the other of backend/frontend, `qa-engineer`. Final: `release-engineer`.
Not needed: `database-engineer`, `fintech-engineer`, `sre-engineer` (unless the incident also involved a production outage, in which case add it).

**FRONTEND UI BUG** (e.g. a broken layout, a copy error, a non-functional button with no auth/data implication)
Classification: `FRONTEND`. Risk: `LOW` or `MEDIUM`.
Primary: `frontend-engineer`. Required: `qa-engineer`. Final: scaled to risk — a LOW-risk pure-copy fix may not need a formal release gate at all; a MEDIUM behavioral fix still goes through `release-engineer` before it ships.
Not needed: `security-engineer` (add only if the bug touches auth/secrets/CSP/redirects/permissions/user-sensitive data), `backend-engineer`, `database-engineer`, `api-contract-auditor` (unless the "UI bug" turns out to be a symptom of an API mismatch, in which case reclassify as an API contract bug).

**DATABASE MIGRATION**
Classification: `DATABASE` (+ `FINANCIAL` if ledger/escrow tables are touched). Risk: `HIGH`, or `CRITICAL` if the migration is destructive or touches financial tables.
Primary: `database-engineer`. Required: `backend-engineer`, `qa-engineer`. Add `fintech-engineer` if financial invariants are affected, `sre-engineer` if production availability is affected. Final: `release-engineer`.

**FINANCIAL CHANGE** (payments, ledger, escrow, refunds, payouts, settlement)
Classification: `FINANCIAL` (+ whatever else the change touches). Risk: `CRITICAL`.
Primary: `fintech-engineer`. Required: `database-engineer`, `backend-engineer`, `security-engineer`, `qa-engineer`. Add `sre-engineer` if runtime/provider/deployment behavior changes. Final: `release-engineer`. Remember the standing policy: `PAYMENTS_ENABLED=false` and `PAYOUTS_ENABLED=false` stay off unless the human user explicitly authorizes a change to that — no agent, including the lead, may flip that switch on its own initiative.

**RAILWAY CONFIG**
Classification: `DEVOPS_INFRA` (+ `SRE_OPERATIONS`). Risk: `HIGH`.
Primary: `devops-engineer`. Required: `sre-engineer`. Add `security-engineer` if network/secrets/CORS/TLS/config is affected. Final: `release-engineer`. Actually changing Railway/Vercel/DNS requires explicit user authorization regardless of what the routing decision says — routing produces a recommendation and evidence, not permission to act.

**PERFORMANCE ISSUE**
Classification: `PERFORMANCE` (+ whichever domain the root cause lands in once diagnosed). Risk: usually `MEDIUM`, `HIGH` if it's production-availability-affecting.
Primary: `performance-engineer`. Required reviewer depends on root cause: `backend-engineer` (backend issue), `database-engineer` (DB issue), `frontend-engineer` (frontend issue). `qa-engineer` verifies a reproducible benchmark/regression where practical.
Not needed: everyone else, unless the fix itself crosses into their domain (e.g. a DB index change also needs `database-engineer` as primary reviewer of the migration, not just performance sign-off).

**CI FAILURE**
Classification: `RELEASE` (+ whichever domain the failing check actually covers — e.g. a contract-drift failure is also `API_CONTRACT`). Risk: usually `MEDIUM`; `HIGH` if it's masking a real regression rather than a flaky/infra issue.
Primary: `release-engineer`. Required: `devops-engineer`, `qa-engineer`. Add `security-engineer` if secrets or release security are implicated. Note: `release-engineer` being primary here does not mean it can self-approve the fix — someone else still independently verifies the fix per the no-self-approval rule, per `.claude/review-matrix.md`.
