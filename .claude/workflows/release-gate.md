# Release Gate Workflow

The last step before production GO. Owned by `release-engineer`, but `release-engineer` is a gate on evidence quality — not a substitute for the domain reviews in `.claude/workflows/code-change-review.md` and `production-readiness.md`, and not authorized to override a specialist's FAIL on its own judgment. `bobododa-engineering-lead`, if it routed the work, hands off to `release-engineer` here and stops — the lead is never itself a release authority (see `.claude/review-matrix.md`'s "Orchestration role" note), and it cannot skip this gate for anything production-affecting.

## What release-engineer checks

1. **Evidence** — every claimed PASS in scope cites a real category from the Evidence Standard (`security-review.md`): CODE, TEST, RUNTIME, DATABASE, NETWORK, CI, or PRODUCTION. Reject any PASS resting on "looks correct" or "should work."
2. **CI** — a real, current GitHub Actions run is green for every required check on the target branch. Historical/cached results don't count if the branch has moved since.
3. **Deployment traceability** — the actual deployed commit (via `/health/live`'s `commit` field or equivalent) matches what's intended to be live. Never infer "live == main" without checking.
4. **Rollback** — a real, documented, previously-verified rollback path exists for this class of change (app rollback vs. migration forward-fix are different procedures — confirm the right one is documented for what's being released).
5. **Unresolved disagreements** — nothing from Phase C of `production-readiness.md` is still open.
6. **Contract review complete when triggered** — if scope includes any endpoint, route, prefix, or generated-contract change, `api-contract-auditor`'s review is one of the "every required reviewer" checks in the GO rule below, same as any other mandatory reviewer.

## Release GO rule

GO requires ALL of:
- No unresolved P0
- No launch-critical P1
- No launch-critical UNKNOWN
- No unresolved specialist disagreement
- Every required reviewer per `.claude/review-matrix.md` has actually completed review for everything in scope

**A category cannot be PASS if primary = PASS and its required reviewer = FAIL.** Same rule for reviewer = UNKNOWN. This holds even under time pressure — a rushed release does not get to skip a required reviewer's sign-off.

## What release-engineer does not do

- Does not merge PRs, push to `main`, change branch protection, or trigger deploys itself — these need explicit main-coordinator authorization from the human user, per the agent's own boundaries.
- Does not re-litigate a specialist's domain judgment (e.g. whether a query pattern is actually an N+1 problem) — only whether that specialist's claim has real evidence behind it.
- Does not force-push, bypass branch protection, disable a required check to get a merge through, or rewrite history under any circumstance.

## When release-engineer disagrees with a FAIL

It does not unilaterally reclassify the finding. It escalates to the coordinator with both the specialist's FAIL and its own reasoning intact, and — per the disagreement protocol in `security-review.md` — a third independent specialist reproduces or checks the disputed claim before any resolution.

## Finding format

Same as the other workflows:

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
