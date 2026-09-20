# Security Review Workflow

For changes touching auth, authorization, secrets, sessions, HTTP security, or production hardening. Run by the main coordinator; `security-engineer` (`.claude/agents/security-engineer.md`) is always a required reviewer here, never the sole author-and-approver of a security-relevant change.

## Evidence Standard

Every PASS must cite at least one of these evidence categories — "looks correct" is not one of them, and "configured" is not the same as "verified":

- **CODE** — specific files/lines
- **TEST** — specific command + actual result
- **RUNTIME** — actual deployed behavior observed directly
- **DATABASE** — actual constraint/privilege/query evidence (e.g. an attempted `UPDATE` that was actually rejected, not a schema comment claiming it would be)
- **NETWORK** — HTTP/TLS/DNS/CORS evidence from a real request
- **CI** — a real GitHub Actions run, not a historical/cached result
- **PRODUCTION** — live smoke evidence

## Disagreement protocol

When two agents disagree on a security-relevant finding:

1. Preserve both reports in full — do not summarize one away.
2. Compare evidence, not confidence. A longer or more detailed explanation is not stronger evidence.
3. Delegate to a third relevant agent as tiebreaker.
4. The third agent must independently reproduce or check the claim — reading both reports and picking one is not sufficient.
5. The coordinator resolves the disagreement only from the resulting evidence.

**Never resolve a disagreement by:** majority vote, model confidence, whichever explanation is longer, or "probably." If the tiebreaker's independent check is also inconclusive, the status is UNKNOWN, and UNKNOWN blocks GO for launch-critical areas (see `production-readiness.md`).

## High-risk change requirements involving security

| Change | Required agents |
|---|---|
| Auth change | backend + security + QA |
| Secret/auth config change | security + devops + release |
| Payment enablement | fintech + backend + database + security + QA + release |

## Rules specific to security review

- `security-engineer` never marks something secure because another report says so — it verifies independently every time, per its own agent definition.
- Discovered secrets are never printed in full — redact and report type/location/exposure risk only.
- No destructive security testing against production, ever, regardless of how confident the tester is that it's safe.
- A production safety flag (e.g. `PAYMENTS_ENABLED=false`, `DEV_EXPOSE_OTP=false`) is PASS only when the *actual runtime behavior* is fail-closed — trace the code path, don't read the flag's default value and stop there.

## Finding format

Same as `code-change-review.md`:

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
