# Bobo&Doda — Review Matrix

Which agent owns a change, who must independently review it, and who gives the final gate. Routing and cross-review coordination is done by `bobododa-engineering-lead` (`.claude/agents/bobododa-engineering-lead.md`) per `.claude/workflows/task-routing.md`, or by the main coordinator directly when the lead agent isn't invoked — either way, this matrix is the source of truth both must follow.

**No self-approval, ever.** The agent that implements or primarily audits a change cannot be its only reviewer, no matter how confident it is.

## Orchestration role — read before delegating

`bobododa-engineering-lead` is:
- **ROLE:** orchestrator — classifies the task, selects the minimum sufficient specialist team per this matrix, and enforces the no-self-approval and disagreement-resolution rules below.

`bobododa-engineering-lead` is explicitly **NOT**:
- **NOT a reviewer of record** — its own classification is never counted as one of the required independent reviews for a category.
- **NOT an implementation owner** — it does not write application code; see its agent definition's boundaries.
- **NOT the final release authority** — `release-engineer` remains the only release gate; the lead cannot send anything to production and cannot override a specialist FAIL.

Do not skip domain review because the lead already looked at the diff — its classification is a routing decision, not a substitute for `qa-engineer`/`security-engineer`/etc. actually investigating.

| Change type | Primary | Review | Security | Final |
|---|---|---|---|---|
| Backend | `backend-engineer` | `qa-engineer` | `security-engineer` | `release-engineer` |
| Frontend | `frontend-engineer` | `qa-engineer` | `security-engineer` | `release-engineer` |
| Database | `database-engineer` | `fintech-engineer` | — (`sre-engineer` operational) | `release-engineer` |
| Financial | `fintech-engineer` | `database-engineer` | `security-engineer` | `release-engineer` |
| DevOps / Infra | `devops-engineer` | `sre-engineer` | `security-engineer` | `release-engineer` |
| SRE / Observability | `sre-engineer` | `devops-engineer` | — (`qa-engineer` instead) | `release-engineer` |
| CI/CD / Release | `release-engineer` | `devops-engineer` | `security-engineer` (where relevant) | — (`qa-engineer` instead) |
| Performance | `performance-engineer` | `backend-engineer` or `database-engineer` (whichever the finding concerns) | — | — (`qa-engineer` instead) |
| API / route / contract | `backend-engineer` (or `frontend-engineer` if the defect is purely client-side) | `api-contract-auditor` (mandatory — see below) + `qa-engineer` | `security-engineer` (if auth or sensitive data) | `release-engineer` |

For the two rows without a Security column, the adjacent listed reviewer fills that slot — read the row's actual reviewer list, not just the visual column, before treating an agent as "not required."

## `api-contract-auditor` — mandatory triggers

`api-contract-auditor` (`.claude/agents/api-contract-auditor.md`) is required, in addition to whatever the row above already lists, for **any** of:
- A new API endpoint
- A route path or method change
- An API global-prefix change (e.g. anything touching `backend/src/config/api-prefix.ts`, `backend/src/main.ts`'s `setGlobalPrefix`, or `NEXT_PUBLIC_API_URL`'s expected shape)
- An auth API change (register/login/OTP/refresh/staff auth)
- A generated-contract change (`packages/contracts/**`, `backend/scripts/emit-openapi.ts`)
- A frontend API client change (`lib/api/**`)
- A public error response shape change (`AllExceptionsFilter`, `ApiError`/`DomainError` mapping)
- An API versioning change

It verifies the boundary between `backend-engineer`'s and `frontend-engineer`'s work — it does not replace either of their own reviews, and it is never satisfied by one side's self-report about the other side's code.

## High-risk change requirements (in addition to the matrix above)

| Change | Required agents |
|---|---|
| Auth change | backend + security + `api-contract-auditor` + QA |
| Financial change | fintech + database + QA + release |
| Database migration | database + backend + release |
| Production infra change | devops + SRE + release |
| Secret/auth config change | security + devops + release |
| Payment enablement (`PAYMENTS_ENABLED=true` or similar) | fintech + backend + database + security + QA + release |

## Reading this matrix

- **Primary** produces the initial finding/implementation with evidence.
- **Review** independently re-verifies the primary's claim — not a rubber stamp; see `.claude/workflows/code-change-review.md` for what "independently" requires.
- **Security** specifically challenges auth/authz/secrets/HTTP-security aspects, even when the primary domain isn't security itself.
- **Final** is the release gate — checks evidence quality and unresolved disagreements, not domain correctness it isn't qualified to judge.

A category is **not** PASS if primary = PASS and any required reviewer = FAIL or UNKNOWN. See `.claude/workflows/production-readiness.md` Phase F and the Release GO rule.
