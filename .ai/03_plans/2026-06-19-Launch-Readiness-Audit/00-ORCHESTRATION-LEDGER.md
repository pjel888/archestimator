# Launch-Readiness MVP Audit — Orchestration Ledger

**Date:** 2026-06-19
**Lead:** Claude (Opus 4.8, ultracode / xhigh + workflow orchestration)
**Owner:** Philip
**Goal (orchestrator):** Produce a comprehensive, evidence-backed launch-readiness
audit of the entire Archestimator codebase across every production discipline
(security, performance, database, deploy, reliability, testing, a11y, deps,
integrations) and emit one self-contained, deletable plan pack per domain under
`.ai/03_plans/`, reconciled with existing packs (do not duplicate prior work).

## Method

Parallel multi-agent fan-out (one auditor per independent domain) → adversarial
verification per finding → coverage/conflict critic (arbiter resolves overlaps &
gaps) → synthesis into this master index → per-domain remediation plan packs.
Assume multiple AI agents edit this repo concurrently: auditors are READ-ONLY on
source; each writes ONLY into its own dated folder; the orchestrator owns shared
files (this ledger, the README index).

## Stack & stage (verified 2026-06-19)

Next.js 16.2.6 · React 19.2.6 · Bun · TS 6 · Tailwind v4 · Supabase/Postgres
(`ebxxqidacheyapmmzavr`) · TanStack Query · Zustand · D3/Three.js/roughjs ·
ExcelJS · Resend · Vercel. ~216K LOC ts/tsx across ~1,090 source files + ~57
migrations. Pre-launch closed-beta MVP; standing DB-autonomy mandate in-project.

## Reframing — this is a WIDER-launch hardening audit, not pre-first-deploy

`.ai/10_state/known-issues.md` confirms the app is **already a live owner-only
closed beta** at `www.archestimator.com`: production deploy healthy, Resend
delivery/webhook proven, linked-Supabase RLS/anon-deny readiness proven, owner
beta journey + logout + fail-closed routing proven. Several items are **decided,
not open**: CI/CD intentionally deferred (2026-06-06 decision); PITR
owner-accepted-off (daily-backup closed-beta mode); two Codex history-exposure
findings owner-accepted for single-owner beta. **Synthesis must separate
genuinely-open issues from already-decided/accepted ones**, and the gate is
"ready for *wider/external* users," not "ready to deploy at all."

## Early signals (confirmed during scouting)

- **`src/proxy.ts` (146 lines) is the auth wall** (Next.js 16 uses `proxy.ts`,
  not `middleware.ts`). Prior OWASP audit flagged `proxy.ts:33` short-circuiting
  `/api/*` (defense-in-depth gap).
- CSP is **Report-Only** on `/`, `/workshop`, `/invite`; **enforced** only on
  `/share`. `'unsafe-inline'`/`'unsafe-eval'` still allowed; nonce pipeline deferred.
- `vercel.json` → `git.deploymentEnabled: false` (CLI deploys only).
- `bun run validate` known-red on `main` (charts `set-state-in-effect`;
  `ProposalExportPreviewDialog` design-lint); `test:dom` all-phase hang risk.
- **111 migrations total**; ~63 landed **since** the 2026-06-01 OWASP audit
  (which covered ~48) → prior security audit is materially stale on newer
  surfaces (beta allowlist, mass-deletion, notifications, teamspace membership,
  estimate tabs, project groups, homebase summary).
- **`supabase/migrations-pending-review/`** holds unmerged DB-hygiene migrations
  (AC-MOD-T4 shared-link telemetry/indexes/rate-limit-GC, one-published-publication,
  recipient-set-null, FK covering indexes) — unmerged launch-relevant DB work.
- PITR disabled (owner-accepted); Sentry/Turnstile not built (per roadmap sync).

## Prior-audit headline findings (to reconcile/refresh, not re-report)

OWASP 2026-06-01 top open items: (1) CI lacks SAST/SCA/secret-scan/dep-review
(deferred by decision); (2) no structured security monitoring/alerting; (3) AI
endpoints `/api/ai/ask` + `/api/ai/package-builder` have no rate limit/cost cap;
(4) share-cookie `Secure`/`SameSite` not explicit + HSTS (HSTS since added in
`next.config.ts` — verify); (5) `proxy.ts` `/api/*` bypass. Strengths: shared-link
HMAC+AES-GCM, AI draft-token HMAC + `revoke from service_role`, invite fail-closed,
upload magic-byte+sharp re-encode, Svix webhook verification, RLS on all tables,
SECURITY DEFINER `search_path=public` pinned.

## Domains (each → one `2026-06-19-Launch-Readiness-<Domain>/` pack)

| # | Domain | Folder | Status |
|---|--------|--------|--------|
| 1 | Auth & Session Security | `...-Auth-And-Session-Security` | pending |
| 2 | RLS, RPC & DB Security | `...-RLS-RPC-And-DB-Security` | pending |
| 3 | DB Schema, Indexing & Query Perf | `...-Database-Schema-Indexing-Query-Perf` | pending |
| 4 | API Routes & Server Actions | `...-API-Routes-And-Server-Actions` | pending |
| 5 | Frontend Rendering Performance | `...-Frontend-Rendering-Performance` | pending |
| 6 | Bundle & Asset Optimization | `...-Bundle-And-Asset-Optimization` | pending |
| 7 | Next.js/Vercel, Headers & Deploy | `...-NextJS-Vercel-Deploy-And-Headers` | pending |
| 8 | Data Fetching, Caching & RSC | `...-Data-Fetching-Caching-RSC` | pending |
| 9 | Observability, Reliability & Ops | `...-Observability-Reliability-Ops` | pending |
| 10 | Testing, CI & Quality Gates | `...-Testing-CI-Quality-Gates` | pending |
| 11 | Accessibility, SEO & Legal/Content | `...-Accessibility-SEO-Legal-Content` | pending |
| 12 | Dependencies, Supply Chain & Code Health | `...-Dependencies-Supply-Chain-Code-Health` | pending |
| 13 | Email, Notifications & Integrations | `...-Email-Notifications-Integrations` | pending |

## Phase log

- [in progress] Phase 1 — Parallel deep audit + adversarial verify (Workflow 1).
- [pending] Phase 2 — Synthesis: master index, dedup, launch-blocker ranking.
- [pending] Phase 3 — Coverage/conflict resolution & gap closure.
- [pending] Phase 4 — Final completeness verification & README index update.
