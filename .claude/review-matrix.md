# Bobo&Doda — Review Matrix

Which agent owns a change, who must independently review it, and who gives the final gate. The main coordinator (not a subagent) enforces this — see workflows in `.claude/workflows/`.

**No self-approval, ever.** The agent that implements or primarily audits a change cannot be its only reviewer, no matter how confident it is.

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

For the two rows without a Security column, the adjacent listed reviewer fills that slot — read the row's actual reviewer list, not just the visual column, before treating an agent as "not required."

## High-risk change requirements (in addition to the matrix above)

| Change | Required agents |
|---|---|
| Auth change | backend + security + QA |
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
