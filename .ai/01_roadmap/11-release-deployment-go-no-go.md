# Release & Deployment Go/No-Go

Last updated: 2026-05-30

---

## 1. Deployment Architecture (planned, not implemented)

Archestimator's deployment architecture exists only on paper. Nothing is configured yet.

| Environment | Target | Status |
|---|---|---|
| Production | Vercel (primary hosting) | Not configured |
| Staging | Vercel preview/staging environment | Not configured |
| Preview | PR-based preview deployments (Vercel) | Not configured |
| Database | Single Supabase project `ebxxqidacheyapmmzavr` | Used for dev only |

**Risk: no staging isolation.** The same Supabase project is used for both local development and what would become production. There is no staging database. Any deployment to production shares the same data plane as local dev. This must be addressed before any beta or production deployment.

---

## 2. Environment Separation

| Environment | URL | Supabase | Env Vars | Purpose | Status |
|---|---|---|---|---|---|
| Local dev | localhost:3000 | linked remote (`ebxxqidacheyapmmzavr`) | `.env.local` | Development | Active |
| Staging | Not configured | Not configured | Not configured | Pre-release validation | Not configured |
| Production | Not configured | Not configured | Not configured | Live user traffic | Not configured |

**Todo before staging exists:**
- Create a separate Supabase project (or schema/table prefix strategy) for staging isolation
- Configure Vercel staging environment with staging env vars
- Set up preview protection (require login or password on staging)

---

## 3. Pre-Deployment Checklist

| Check | Required For | Status |
|---|---|---|
| All CI checks pass (typecheck, lint, design-system, unit tests, DOM tests, E2E) | Beta | Not yet passing |
| RLS denial tests pass | Beta | Not yet passing |
| Invite lifecycle staging tests pass | Beta | Not yet passing |
| Workshop smoke test pass | Beta | Not yet run |
| No secrets in diff | Always | Per-deploy check |
| Philip approval obtained | Always | Per-deploy gate |
| Migration parity verified | Beta | Not yet verified |
| Rollback plan documented | Production | Not yet documented |
| Support runbooks current | Production | Not yet written |

---

## 4. Deployment Approval Rule

**NO DEPLOY WITHOUT PHILIP APPROVAL.** This is a hard, permanent rule. It cannot be waived, automated, or delegated.

- **Pre-beta deployment:** Philip must explicitly approve each deploy. Approvals are verbal or written per-instance, not blanket.
- **Pre-production deployment:** Philip must sign off on the go/no-go checklist (Section 6) before any production deployment proceeds.

No CI automation, no scheduled deploy, no "merge to main and it ships" workflow bypasses this. Every deploy is a conscious decision.

---

## 5. Rollback Procedure (template)

1. **Identify the bad deploy.** Symptoms may include: errors in logs, broken flows, data integrity issues, unexpected behavior in critical paths.
2. **Notify Philip immediately.** Do not attempt to fix silently or wait to see if it resolves.
3. **Assess severity.** Can the issue wait for a fix-forward, or does it require immediate rollback? If users are affected, rollback is the default.
4. **Rollback (if needed).** Revert to last known good deployment via Vercel's deployment history. Vercel keeps previous deployments available for instant rollback.
5. **Database issues.** If the deploy included a migration that caused data problems, restore from Supabase backup if available. If no backup exists, escalate to Philip for manual recovery decision.
6. **Verify rollback.** Smoke test critical paths: invite lifecycle, workshop creation, estimating sheet generation.
7. **Post-incident.** Document what happened, why it wasn't caught, and what prevents it next time. File in `.ai/20_incidents/`.

---

## 6. Go/No-Go Decision Matrix

| Gate | Beta Requirement | Production Requirement | Current Status |
|---|---|---|---|
| Security | RLS denial tests pass, invite E2E on staging, no known critical vulns | All security gates + pen test | Not met |
| Legal | Owner acknowledged risk | Reviewed Privacy Notice + Terms published | Not met |
| Deployment | Staging environment exists, preview protection on | Production URL, CD pipeline, DNS/SSL, rollback drilled | Not met |
| QA | Core smoke tests pass, invite lifecycle staging pass | Full validation matrix pass, perf smoke, a11y audit | Not met |
| UX | Critical flows understandable by test users | All flows validated, non-technical user testing complete | Not met |
| AI | No autonomous claims in copy | Truthfulness audit, leakage tests | Partial |
| Support | Critical runbooks templated | All runbooks drilled, named owners | Not met |
| Owner | Philip signs off on beta scope | Philip signs off on production launch | Pending |

**Decision rule:** ALL gates must be MET before the corresponding deployment stage proceeds. A single NOT MET blocks the deploy. No exceptions.

---

## 7. Release Versioning

No versioning or tagging strategy has been defined yet.

**Recommendation (not yet adopted):**
- Use semver tags on `main` branch (`v0.1.0`, `v0.2.0`, etc.)
- Vercel auto-deploys from `main` only after Philip approval (see Section 4)
- Tag each approved production deploy so the last known good version is always unambiguous
- Maintain a `CHANGELOG.md` in the repo root

This section will be updated once a versioning decision is made.
