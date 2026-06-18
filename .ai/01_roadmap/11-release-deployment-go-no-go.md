# Release & Deployment Go/No-Go

Last updated: 2026-06-18 (roadmap-sync pass: readiness *tooling* now exists; hosted/provider/manual *proof* remains open)

> Sync note (2026-06-18): Since the 2026-05-30 baseline, a substantial readiness
> *tooling* layer landed in code: a full CI pipeline (`.github/workflows/ci.yml`)
> plus ~17 readiness/verifier scripts under `scripts/check-*.ts` and
> `scripts/verify-*.ts` (Vercel env/health/production/speed-insights, Supabase
> linked/backup/migration, Resend, support DNS/monitoring, legal owner, hosted
> auth/export/sensitive-route fail-closed). These prove the *scaffolding is BUILT*.
> They do NOT prove any hosted deploy, applied migration, staging environment,
> provider config, legal review, or green CI run — those remain external/manual
> facts. No gate below has been promoted to MET on the strength of code alone.

---

## 1. Deployment Architecture (planned, not implemented)

Archestimator's deployment architecture exists only on paper. Nothing is configured yet.
(Evidence: no staging entry in `supabase/config.toml` — single project model; a root
`vercel.json` exists but only disables git deploys — `{"git":{"deploymentEnabled":false}}` —
so no staging/production hosting is configured, and hosting state is not code-provable.)

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
| All CI checks pass (typecheck, lint, design-system, unit tests, DOM tests, E2E) | Beta | Pipeline BUILT (`.github/workflows/ci.yml`: validate → build → impeccable → playwright e2e + perf smoke); green-run status is an external GitHub Actions fact, not code-provable. NOTE: in CI 16/18 e2e specs skip (no Supabase service-role/dev-auth secrets) |
| RLS denial tests pass | Beta | Tooling BUILT: `scripts/prove-rls-initplan-postgres.mjs` + 4 other `scripts/prove-*-postgres.mjs` harnesses (require local Postgres binaries, NOT in CI). Live RLS on hosted DB remains unproven |
| Invite lifecycle staging tests pass | Beta | Not yet passing (e2e `e2e/project-invite-entry.spec.ts` exists but is env-gated/skipped without hosted Supabase + pepper; PROJECT_INVITE_ENTRY_ENABLED defaults OFF) |
| Workshop smoke test pass | Beta | Not yet run (gated e2e specs; require dev-auth/hosted session) |
| No secrets in diff | Always | Per-deploy check |
| Philip approval obtained | Always | Per-deploy gate |
| Migration parity verified | Beta | Tooling BUILT: `scripts/check-supabase-migration-readiness.ts` (parses Supabase CLI transcript); actual local-vs-remote parity is an external/operator fact. NOTE: 2 reviewed migrations deliberately NOT applied (`supabase/migrations-pending-review/`) |
| Rollback plan documented | Production | Template documented in §5 below (still requires a drilled, deployment-specific runbook) |
| Support runbooks current | Production | Drafted: `.ai/01_roadmap/09-support-incident-rollback-runbooks.md` exists; "current/drilled" remains an owner/manual fact |

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
| Security | RLS denial tests pass, invite E2E on staging, no known critical vulns | All security gates + pen test | Not met (prove-*-postgres RLS harnesses BUILT but local-only/not in CI; live-DB RLS + invite E2E remain external) |
| Legal | Owner acknowledged risk | Reviewed Privacy Notice + Terms published | Not met (Terms/Privacy copy + pages BUILT in code — `src/lib/legal/terms-content.ts` self-declares `legalReviewStatus='...pending_counsel_review'`; counsel review is an external/manual fact. `scripts/check-legal-owner-readiness.ts` records owner attestation only) |
| Deployment | Staging environment exists, preview protection on | Production URL, CD pipeline, DNS/SSL, rollback drilled | Not met (no staging in `supabase/config.toml`; Vercel readiness *check scripts* BUILT — `scripts/check-vercel-*-readiness.ts` — but hosted deploy/staging/DNS are external) |
| QA | Core smoke tests pass, invite lifecycle staging pass | Full validation matrix pass, perf smoke, a11y audit | Not met (CI runs unit+DOM+e2e smoke+perf smoke; in CI 16/18 e2e specs skip without secrets; no a11y/coverage gate in CI) |
| UX | Critical flows understandable by test users | All flows validated, non-technical user testing complete | Not met (user-testing is a manual fact) |
| AI | No autonomous claims in copy | Truthfulness audit, leakage tests | Partial (AI surface is default-OFF, `ARCHESTIMATOR_AI_ENABLED=false` → 404; DeepSeek-only, requires `DEEPSEEK_API_KEY`; audit-trail BUILT+tested (`src/lib/ai/audit.ts` + `tests/vitest/ai-audit-flow.test.ts`); AI tenant/auth isolation enforced and tested (`tests/vitest/ai-package-builder-security-contract.test.ts` asserts no service-role client, `requireCurrentUserContext`, workspace-editor RPC checks). NOTE: prompt-injection defense is system-prompt framing only ("untrusted data" notices in `src/lib/ai/read-context.ts`/`package-builder/provider.ts`) — no dedicated injection-defense module/test exists; truthfulness/leakage audit + copy review remain open) |
| Support | Critical runbooks templated | All runbooks drilled, named owners | Not met (runbook doc 09 drafted; `scripts/check-support-monitoring-readiness.ts` records operator flags only — no integrated monitoring/alerting exists in code) |
| Owner | Philip signs off on beta scope | Philip signs off on production launch | Pending |

**Decision rule:** ALL gates must be MET before the corresponding deployment stage proceeds. A single NOT MET blocks the deploy. No exceptions. (Sync note: code/scaffolding/check-scripts existing does NOT satisfy a gate — every gate above still requires its hosted/provider/manual/owner proof.)

---

## 7. Release Versioning

No versioning or tagging strategy has been defined yet.

**Recommendation (not yet adopted):**
- Use semver tags on `main` branch (`v0.1.0`, `v0.2.0`, etc.)
- Vercel auto-deploys from `main` only after Philip approval (see Section 4)
- Tag each approved production deploy so the last known good version is always unambiguous
- Maintain a `CHANGELOG.md` in the repo root

This section will be updated once a versioning decision is made.
