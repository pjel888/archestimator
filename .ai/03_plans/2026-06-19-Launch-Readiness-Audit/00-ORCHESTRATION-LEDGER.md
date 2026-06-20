# Launch-Readiness MVP Audit — Orchestration Ledger

**Date:** 2026-06-19
**Lead:** Claude (Opus 4.8, ultracode / xhigh + workflow orchestration)
**Owner:** Philip
**Goal (orchestrator):** Produce a comprehensive, evidence-backed launch-readiness
audit of the entire Archestimator codebase across every production discipline
(security, performance, database, deploy, reliability, testing, a11y, deps,
integrations) and emit one consolidated, self-contained launch-readiness pack under
`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`, reconciled with existing packs
(do not duplicate prior work).

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
migrations. Live owner-only closed-beta MVP; this audit gates wider/external beta.
Standing DB-autonomy mandate applies only inside the Archestimator project boundary.

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

## Domains (each -> one subfolder under this consolidated audit pack)

| # | Domain | Folder | Status |
|---|--------|--------|--------|
| 1 | Auth & Session Security | `Auth-And-Session-Security` | completed audit pack; 1 config verify blocker |
| 2 | RLS, RPC & DB Security | `RLS-RPC-And-DB-Security` | completed audit pack; no exploitable RLS blocker, DR drift blocker owned in master index |
| 3 | DB Schema, Indexing & Query Perf | `Database-Schema-Indexing-Query-Perf` | completed audit pack; no domain launch blocker |
| 4 | API Routes & Server Actions | `API-Routes-And-Server-Actions` | completed audit pack; AI rate limit is conditional pre-flip gate |
| 5 | Frontend Rendering Performance | `Frontend-Rendering-Performance` | completed audit pack; green-gate code lint items feed B2 |
| 6 | Bundle & Asset Optimization | `Bundle-And-Asset-Optimization` | completed audit pack; no launch blocker |
| 7 | Next.js/Vercel, Headers & Deploy | `NextJS-Vercel-Deploy-And-Headers` | completed audit pack; no domain launch blocker |
| 8 | Data Fetching, Caching & RSC | `Data-Fetching-Caching-RSC` | completed audit pack; no launch blocker |
| 9 | Observability, Reliability & Ops | `Observability-Reliability-Ops` | completed audit pack; 2 hard blockers + monitoring gate |
| 10 | Testing, CI & Quality Gates | `Testing-CI-Quality-Gates` | completed audit pack; 2 hard blockers |
| 11 | Accessibility, SEO & Legal/Content | `Accessibility-SEO-Legal-Content` | completed audit pack; no domain launch blocker after SEO down-rate |
| 12 | Dependencies, Supply Chain & Code Health | `Dependencies-Supply-Chain-Code-Health` | completed audit pack; no launch blocker |
| 13 | Email, Notifications & Integrations | `Email-Notifications-Integrations` | completed audit pack; no launch blocker |

## Phase log

- [DONE] Phase 1 — 13-domain parallel deep audit + adversarial verify + coverage/conflict critic
  (Workflow 1, `wf_8c26c813-ffe`; 27 agents, ~2.36M tok). 6 findings refuted, ~10 down-rated.
- [DONE] Phase 2 — synthesis into `01-MASTER-INDEX.md` (reconciled/deduped blocker register,
  conflict resolutions, canonical-owner table, sequencing). SEO-01 conflict resolved (not a blocker).
- [DONE] Phase 3 — 5-pack gap pass over the critic's unowned surfaces (Workflow 2, `wf_ef1892a5-29b`;
  10 agents, ~0.9M tok): Realtime, Consent/Privacy, DSAR, Storage, Share-Proxy. Added B8/B9 + V1/V2;
  closed the proxy `/api` seam (all 16 routes self-gate, verified) + the staleTimes/collab handoff.
- [DONE] Phase 4 — master index finalized; `.ai/03_plans/README.md` + `current-state.md` updated;
  completeness verified for the original pack skeleton.
- [DONE] Phase 5 — consolidation: all 18 domain packs moved to live as subfolders of THIS single
  folder (`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`), alongside this ledger and
  `01-MASTER-INDEX.md`. No separate sibling launch-readiness folders remain. Docs only —
  nothing implemented.
- [DONE] Phase 6 — implementation-readiness pass: added the scorecard, launch-gate register,
  proof/authority taxonomy, UX crosswalk, and UX flow matrices; reconciled RLS/OPS/Realtime/Consent
  gate taxonomy and corrected stale handoff references.
- [DONE] Phase 7 — 2026-06-20 parallel plan-review closeout: six independent review lanes
  (UX/design, product, security, adversarial documents, feasibility/blast radius, coherence)
  re-rated the pack, then root controls were expanded to docs `07`-`17`. That first closeout left
  109 markdown documents: 18 root controls, 18 standard five-doc domain/gap packs, and one
  extra DSAR runbook. Docs only; no source, DB, or provider state was mutated.
- [DONE] Phase 8 — 2026-06-20 certainty-hardening pass: added official-source criteria mapping,
  blast-radius/rollback scoring, gate traceability, and residual uncertainty registers in docs
  `18`-`21`. The folder now has 113 markdown documents: 22 root controls, 18 standard five-doc
  domain/gap packs, and one extra DSAR runbook. Docs only; no source, DB, or provider state was
  mutated.
- [DONE] Phase 9 — 2026-06-20 implementation execution-control pass: added docs `22` and `23`
  for least-risk-first sequencing, per-gate loop enforcement, concurrent-agent coordination,
  conflict logging, lead-owned integration, and archive-on-resolution under `.ai/09_archive`.
  The folder now has 115 markdown documents: 24 root controls, 18 standard five-doc domain/gap
  packs, and one extra DSAR runbook. Docs only; no source, DB, or provider state was mutated.
- [DONE] Phase 10 — 2026-06-20 overnight autonomy pass: added doc `24` for sleeping-owner
  execution, unanswered-question classes, preauthorized defaults, parked-lane handling,
  hard stops, and morning handoff format. The folder now has 116 markdown documents: 25 root
  controls, 18 standard five-doc domain/gap packs, and one extra DSAR runbook. Docs only;
  no source, DB, provider, CI, or production state was mutated.

**Outcome:** NOT yet wider/external launch-ready — ~9 hard blockers + 2 verify-gates + 1 conditional,
mostly S/M effort, clustered in CI/quality-gate, observability, and legal/DSAR; security core verified
strong. Full detail and sequence: `01-MASTER-INDEX.md`.
