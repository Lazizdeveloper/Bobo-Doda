# Production Readiness Workflow

Run by the main coordinator, delegating to agents in `.claude/agents/` per `.claude/review-matrix.md`. Six phases, in order — do not skip or reorder.

## Phase A — Independent Audit

Each relevant agent audits its own area independently. **Agents must not rely on another agent's PASS** — if backend-engineer's audit depends on "security-engineer already confirmed auth is fine," that's a Phase A violation; backend-engineer verifies what it needs directly.

## Phase B — Cross Review

Each primary finding goes to its required reviewer(s) per the matrix. The reviewer independently re-derives the conclusion — reads the same evidence sources the primary used (or its own), not the primary's summary of them.

## Phase C — Conflict Resolution

When agents disagree (PASS vs FAIL, PASS vs WARNING, PASS vs UNKNOWN):

1. The coordinator does **not** pick PASS automatically, ever.
2. Delegate to a third independent specialist as tiebreaker — chosen for relevant expertise, not availability.
3. The tiebreaker reproduces or independently checks the disputed claim; it does not just read both reports and guess which is more convincing.
4. If evidence remains genuinely inconclusive after the tiebreaker: status = **UNKNOWN**.
5. **UNKNOWN blocks production GO for launch-critical areas.** It is not a fallback to PASS.

See `.claude/workflows/security-review.md`'s disagreement protocol for the full mechanics — the same protocol applies here.

## Phase D — Remediation

The primary specialist may implement a fix for its own finding. **The same agent that implemented the fix may not be the sole verifier of that fix** — this is the no-self-approval rule from the review matrix, applied to remediation specifically.

## Phase E — Regression Review

- `qa-engineer` validates regression coverage exists for the fix (not just that the fix compiles/passes once).
- `security-engineer` validates any security-sensitive fix specifically.
- `database-engineer` + `fintech-engineer` together validate any financial/data-integrity fix.

## Phase F — Release Gate

`release-engineer` reviews, in this order:
1. Evidence quality behind every claimed PASS (per the Evidence Standard — see `.claude/workflows/release-gate.md`)
2. CI status (real, current GitHub Actions runs — not cached/historical)
3. Deployment traceability (does `/health/live`'s commit match what's actually intended to be live?)
4. Rollback readiness (is there a real, documented, verified path back?)
5. Unresolved disagreements from Phase C

**`release-engineer` does not override a specialist's FAIL without new evidence it has personally verified.** A release-engineer that disagrees with a FAIL escalates to the coordinator with both positions intact — it does not unilaterally reclassify the finding.

## Production GO rule

GO requires ALL of:
- No unresolved P0
- No launch-critical P1
- No launch-critical UNKNOWN
- No unresolved specialist disagreement
- All required reviewers (per the matrix) have actually completed their review — not skipped for time

A category cannot be PASS if primary = PASS and its required reviewer = FAIL or UNKNOWN, even if the primary is confident.
