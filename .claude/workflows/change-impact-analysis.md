# Change Impact Analysis Workflow

How `graphify` (a static AST import/call graph over this repo, `graphify-out/graph.json`, already installed — see `.agents/rules/graphify.md`/`.agents/workflows/graphify.md` for the raw tool docs) fits into task routing. This workflow does not replace `.claude/workflows/task-routing.md` — it's an optional discovery step that can run *before* Step 1 of that workflow, to make the classification in Step 1 evidence-based instead of guessed.

**Graphify is navigation and impact evidence only. It is never the source of truth.** Source-of-truth order for any actual claim, always:

1. Actual source code
2. DB schema / migrations / constraints
3. Generated contracts (`packages/contracts/`)
4. Tests
5. Runtime evidence
6. Graphify's dependency evidence — last, and only as a pointer to where to look

## Flow

```
TASK
  |
  v
engineering lead (or main coordinator)
  |
  v
Graphify dependency/impact discovery   <- optional, HIGH/CRITICAL tasks should do this
  |
  v
actual source verification              <- mandatory, always — graphify's output is unverified until this step
  |
  v
affected-domain classification (task-routing.md Step 1)
  |
  v
specialist selection (task-routing.md Steps 3-5)
  |
  v
implementation
  |
  v
independent review (task-routing.md Steps 6-8)
  |
  v
QA (task-routing.md Step 9)
  |
  v
release gate (task-routing.md Step 10)
```

## Step 0 — Graph staleness check (before trusting any result)

Before relying on graphify for a HIGH/CRITICAL task, check whether the graph reflects the current commit:

```
python3 -c "import json; print(json.load(open('graphify-out/graph.json'))['built_at_commit'])"
git rev-parse HEAD
```

- Match (and no uncommitted changes to files you care about) -> graph is current, proceed.
- Mismatch, or uncommitted changes to relevant files -> `STALE_GRAPH = YES`. Run `graphify update .` (AST-only re-extraction, no API cost, safe to run any time — it only rewrites `graphify-out/`, a gitignored generated directory) before relying on it.

Do not assume the installed git hooks (`post-commit`/`post-checkout`, see `graphify hook status`) keep this current automatically — verified in this repo's own history that the graph can sit several commits behind despite the hooks reporting "installed." Treat the hook as a convenience, not a guarantee; check `built_at_commit` yourself.

## Step 1 — Discovery (engineering lead or coordinator, before classifying)

Anchor on a specific file or symbol name, not a broad natural-language phrase — broad phrasing returns noisy, low-precision results at this repo's scale (~5,200 nodes / ~15,000 edges). Useful commands:

- `graphify affected "<file-or-symbol>" --depth 2` — reverse traversal: what depends on this (blast radius of a change).
- `graphify path "<A>" "<B>"` — is there a dependency chain between two known points.
- `graphify explain "<node>"` — a node's direct neighbors (imports/calls in and out) — the highest-precision command, prefer it once you know roughly where to start.
- `graphify god-nodes --top 15` — the most-connected files, useful for judging whether a change touches an architectural hub.

**Confirmed hard limitation**: graphify's edges come from same-language static AST extraction (imports/calls within one process). It does **not** model the frontend<->backend HTTP boundary — `graphify path` between a frontend page/client file and a backend controller returns "no path found" even when the real request/response wiring is completely correct, because there is no import edge across a network call. Never conclude "no relationship" from a missing graphify path across that boundary; it means "graphify can't see across HTTP," not "these are unrelated." The `api-contract-auditor`'s job (verifying frontend path + base URL = contract path = backend route = production route from real evidence) is exactly the check that fills this gap — graphify cannot substitute for it.

## Step 2 — Source verification (mandatory, every time)

Everything graphify surfaces is a hypothesis about structure, not a verified fact. Before it enters a finding or a routing decision:
- Read the actual file(s) at the edges graphify reported.
- Confirm the edge means what it looks like it means — an import edge to a queue processor does not prove a synchronous call; an import of `RateLimiterService` does not prove it's invoked on every relevant endpoint. (Both of these were real gaps found during this workflow's own smoke test — see below.)
- Only then classify domains/risk per `task-routing.md` Step 1-2.

## Step 3 — Specialist selection

Use the affected-module/flow list from Step 1-2 to inform (not replace) `task-routing.md`'s normal selection. Do not spawn a specialist merely because their domain's files appeared somewhere in the traversal — `.claude/review-matrix.md` and the risk classification still govern who's actually needed. Example: an auth change traced through OTP/Redis/SMS-provider code correctly routes to `backend-engineer`, `frontend-engineer`, `security-engineer`, `api-contract-auditor`, `qa-engineer` — the same team `task-routing.md`'s AUTH BUG example already names, arrived at faster with evidence instead of a guess.

## Blast-radius note for HIGH/CRITICAL tasks

Before routing a HIGH or CRITICAL task, include:

```
GRAPHIFY IMPACT:
SOURCE VERIFIED:
AFFECTED MODULES:
AFFECTED FLOWS:
REQUIRED REVIEWERS:
```

`SOURCE VERIFIED` must name what was actually read, not just what graphify reported — an entry here that only cites graphify output is not a completed check.

## Safety

Graphify stays strictly read-only for analysis. Nothing it reports triggers, justifies, or substitutes for authorization of: production changes, DB migrations, Railway/Vercel/DNS changes, secret changes, or payment enablement. Those all still require the human user's explicit authorization to the main coordinator, exactly as `bobododa-engineering-lead.md` and `task-routing.md` already require, regardless of what a dependency graph seems to imply about safety or blast radius.

## Worked example — smoke test (registration OTP flow, read-only, no code changed)

Run once to validate this workflow before adoption. Task: "Trace the registration OTP flow" (`graphify explain`/`graphify path`, anchored on `app/(auth)/royxatdan-otish/tasdiqlash/page.tsx` and `backend/src/modules/auth/otp.service.ts`), independently verified by `backend-engineer` and `security-engineer`.

**GRAPHIFY VIEW**: frontend page -> `authService` -> (HTTP boundary, invisible to graphify) -> `auth.controller.ts` -> `auth.service.ts` -> `otp.service.ts` -> `otp-sms.processor.ts` -> `sms-provider.interface.ts` -> `{playmobile,textup,console}.provider.ts`.

**SOURCE REALITY (backend-engineer, confirmed by reading the actual files)**: the chain was structurally correct, with two corrections graphify's static edges could not show — (1) `otp.service.ts` never calls `OtpSmsProcessor` directly; it enqueues a BullMQ job (`smsQueue.add('send', ...)`) and the processor runs asynchronously, picked up in-process because `AuthModule` imports `SmsModule`; (2) OTP verification never touches SMS at all — only the request/resend path does. Effective route: `POST /api/v1/auth/register/verify-otp`.

**SOURCE REALITY (security-engineer, confirmed by reading the actual files)**: OTP secrecy and the `DEV_EXPOSE_OTP` fail-closed production gate both held up. But rate limiting was found to apply only to *requesting* an OTP, not to *verifying* one, and the wrong-attempt counter is read-then-written non-atomically — a real (unverified by test, reasoned from code) race that could let concurrent guesses exceed the intended 5-attempt limit. This is exactly the class of gap the workflow's own text above warns about: graphify showed `RateLimiterService` imported by `otp.service.ts`, which looked sufficient until the actual call sites were read.

**Conclusion**: graphify sped up finding the relevant files and produced a broadly correct first-pass map, but every part of the map that mattered for a real conclusion (async vs. sync, which endpoint actually calls the rate limiter, the HTTP-boundary route) required reading the real code — confirming the source-of-truth order at the top of this document is not a formality.
