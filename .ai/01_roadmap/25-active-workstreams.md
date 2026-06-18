# Active Workstreams

**Last updated:** 2026-06-18 (code-state reconciliation pass — stale plan-pack paths corrected and per-workstream "Code-state note" entries added against actual code; planning structure preserved)
**Purpose:** Organizes the implementation roadmap into 8 concurrent workstream tracks. Each workstream activates at a different wave. Within a wave, workstreams can run in parallel.

## Current MVP Launch Handoff

Status: repo-local launch implementation is frozen at `6ab5b38`; the broad MVP launch goal is blocked until external/provider/manual proof is configured and captured.

Active next workstream for the MVP launch pack: proof collection against `.ai/09_archive/mvp-launch-readiness-2026-06-01/46-manual-proof-matrix.md`.

> **⚠️ Path corrected (2026-06-18 cross-doc sync):** The previously-cited `.ai/03_plans/mvp-launch-readiness-2026-06-01/` no longer exists; the pack (including `46-manual-proof-matrix.md`) was archived to `.ai/09_archive/mvp-launch-readiness-2026-06-01/` (commit `b0ff67c3`, filesystem-verified). This matches the resolved paths in `28-evidence-artifact-index.md`. The bare `.ai/03_plans/...` form remains a GHOST REFERENCE if seen in any sibling roadmap doc.

Do not schedule more local launch implementation unless a new repo-local defect is found. The remaining work is Vercel/Supabase/Resend provider proof, hosted auth/manual E2E, spreadsheet-app proof, legal/owner signoff, support/alert ownership, rollback, and demo rehearsal evidence.

---

## 2026-06-14 — Templates Panel: comprehensive fix pass landed; deferred backlog filed

Estimate-sheet **right sidebar** (templates + reusable sources + insert flows). Comprehensive audit (5 parallel agents) → fixes → adversarial code review. **Landed on local `main` worktree (UNPUSHED):** RS-1 (non-default-tab insert showed wrong tab), INS-1/2/4 (lost inserts on category drop → batched action; silent failures → toasts; edit-clobber), and perf (precomputed totals, deferred search, `React.memo` sidebar, `refetchType:"none"`, removed duplicate tree build). tsc + eslint + targeted vitest green. DB/RPC layer audited = **fully applied on hosted, no drift** (corrects the stale "estimate_tabs unapplied / insert path unbuilt" assumption — see `.ai/10_state/` and the templates-projects-auto-added memory).
- **Deferred backlog (implementation-ready):** `.ai/03_plans/000-Follow Ups/2026-06-14-Templates-Panel-Followups/` (relocated from `.ai/03_plans/2026-06-14-Templates-Panel-Followups/` — verified 2026-06-18) — PERF-1 lazy template nodes, INS-3 atomic insert/wrap, RS-2/3/4 reusable-source query perf, RS-5/6 + error taxonomy, and a future-improvements file (hover-prefetch, shared-Tree memoization/virtualization, DB index hygiene, regression tests).
- **Recommended next:** hover-prefetch the lite library query (PERF-2, infra already exists) + regression tests for RS-1/INS-1.

---

## 2026-06-14 — Estimate-Tree Single-Node Unification: FULLY IMPLEMENTED (P0–P6); P5+P6 migrations APPLIED to prod

Plan now at `.ai/09_archive/store/2026-06-13-Estimate-Tree-Single-Node-Unification/` (archived since this entry was written; the "NOT archived" note below is stale — verified 2026-06-18). Branch `2026-06-13-Estimate-Tree-Single-Node-Unification` (worktree retained). Ledger: `.ai/05_logs/2026-06-14-estimate-tree-unification-implementation.md` (confirmed present). Code-state confirmed: `src/lib/estimates/tree-hierarchy.ts` (`ESTIMATE_NODE_DISPLAY_NAME = "Area"`, `normalizeEstimateTreeNodeKind`); migrations `20260614003639_unify_estimate_node_kinds.sql` + `20260614013638_enable_estimate_node_mixed_writes_p6.sql` present in canonical history (commit `bf05415e`). NOTE: "APPLIED to prod" is an owner-supervised hosted fact recorded in the ledger; code can only prove the migrations are merged to canonical history, not that they ran on the live DB.
- **Landed on `main`** (`b0dec7fc`→`1eb7195f`, ff-push): P0 (`prove:unify-kinds` + O2 share oracle), P1 (public **share firewall** — rows survive on any node), P2-export (proposal export keeps rows on any node), P3-crash-safety (row-move throw + hierarchy-validator error removed). All monotonic, production no-ops; 5 touched suites 54 passed/5 todo, type-check 0 errors.
- **NOW DONE (P0–P6, owner-supervised, final tip `bf05415e`):** P2-charts (own-node bucketing, no double-count, golden-master conserved); P3 activity-scope (stored/stable cache key); P4 "Area" vocab + mixed-content layout (rows-first, sticky cascade, one icon); **P5 relax migration + P6 RPC relax APPLIED to prod** (`20260614003639_unify_estimate_node_kinds`, `enable_estimate_node_mixed_writes_p6`) + UI write-enable (wrap machinery + client kind-guards deleted, single "Add Area" creates, insertion targets any node). P7 dead-code removed (except still-wired `correctKinds`). **Point of no return crossed.**
- **Owner decisions resolved:** Q-1 **"Area"**; Q-3 window **= now**.
- **Prod verified:** pre-flight 0 mixed → rollback captured → local PG17 prove green → applied → post-verified (functions relaxed, P6 guards dropped, data unchanged 139/114/10/16, advisors 0 ERROR, gen-types no-op). Branch/worktree retained; plan not yet archived pending owner sign-off.

---

## 2026-06-14 — Library Optimization IMPLEMENTED (merged to main)

The `/workshop/library` optimization plan (`.ai/09_archive/store/2026-06-14-Library-Optimization-Plan/`, now archived)
moved from planning to implemented on branch `2026-06-14-Library-Optimization-Plan` (merged to main).
- **Shipped:** P0 felt-latency (delay-before-show overlay, no blur on refresh, Overview skeleton reshape,
  browse-tab TanStack Query cache + `staleTimes` for warm-revisit no-skeleton, cache-patch mutations);
  P1 (`ensureDefaultWorkspace` `cache()`-dedupe, single-resolve insert, DS dialogs); P3 (app-layer
  editor-write guards, `/workshop` hardening headers + Report-Only CSP, creation quota, action-error
  sanitization, tab/panel ARIA). All TDD + type-check + design-lint + full DOM suite green.
- **P2 DB scaling-cliff** authored as ready, owner-gated migrations (`migrations/`) — NOT applied to
  hosted per plan 08 Q4; all additive/relax-only (zero data loss). Apply needs owner approval + the
  PG17 prove-harness (see `migrations/00_P2_MIGRATIONS_README.md`).
- **Residual gates (owner):** wall-clock browser standard-session (dev-auth disabled) + hosted P2 apply.
- Plan archived to `.ai/09_archive/store/2026-06-14-Library-Optimization-Plan/`.

---

## 2026-06-13 — New planning & audit workstreams (planning only, no code changed)

Four new plan packs were created on 2026-06-13, all planning/audit only (no code, schema, or data changed):

### Templates Feature Audit & Improvement Plan
- **Package:** `.ai/09_archive/store/2026-06-13-Templates-Audit-And-Improvement-Plan/` (18 docs; archived since this entry was written — verified 2026-06-18).
- **Status:** AUDIT COMPLETE — planning only. Owner decisions D-A/D-B/D-C required.
- **Summary (PARTIALLY SUPERSEDED — verified 2026-06-18):** Custom templates solid (`src/lib/component-library/actions.ts`, `template-editor-actions.ts`). The "estimate_tabs not applied / insert path never built / live outline 500s" assessment is now stale: the estimate_tabs foundation (`supabase/migrations/20260612094734_estimate_tabs_foundation.sql`) is in canonical history, the **insert path IS built** (`src/lib/reusable-sources/actions.ts` `insertProjectSourceIntoEstimate` → RPC `insert_estimate_subtree_into_estimate_with_history`, migration `20260613134852_insert_estimate_subtree_rpc.sql`), and `getReusableEstimateOutline` exists in the same file. The "2026-06-14 — Templates Panel" entry above already records this correction. The privilege-gap note (insert RPC auths on workspace membership) is a hosted-RPC/RLS fact not provable from app code.
- **Owner decisions needed:** Apply estimate_tabs migration? → migration now in canonical history; live-apply remains a hosted fact. Build insert path or scope to browse-only? → insert path built.

### Shared Link Improvement Plan
- **Package:** `.ai/09_archive/store/2026-06-13-Shared-Link-Improvement-Plan/` (15 docs, 2 adversarial passes; archived since this entry was written — verified 2026-06-18).
- **Status:** PLANNING COMPLETE — ready for owner sign-off. **Layout overhaul appears SHIPPED (verified 2026-06-18):** `src/components/share/ShareContainer.tsx` now encodes a responsive width ladder (`max-w-[820px] lg:max-w-[1120px] xl:max-w-[1280px] 2xl:max-w-[1440px]`), superseding the "currently max-w-[960px] with 8-12px type" summary. The "Client Portal" px type-scale exception is live in the enforcer (`scripts/enforce-app-design-system.mjs` exempts `src/components/share`).
- **Summary:** Full-browser layout overhaul for `/share/[token]`. 42 bugs found in owner modal (7 high-severity). UI-only / zero-DB / LOW blast radius.
- **Owner decision needed:** Approve "Client Portal" type-scale exception (requires design-system enforcer change) — exception is already present in the enforcer.

### Spreadsheet / XLSX Export Audit & Improvement Plan
- **Package:** `.ai/09_archive/store/2026-06-13-Spreadsheet-Export-Plan/` (12 docs, 2nd-pass adversarial; archived since this entry was written — verified 2026-06-18).
- **Status:** AUDIT COMPLETE — planning only. 9 owner decisions (D0–D8). **Several findings now addressed in code (verified 2026-06-18):** Material/Labor split exists as an interim compatibility mode (`src/lib/proposal-export/build-proposal-export-model.ts` `laborUnitCost` + `LABOR_DISCLAIMER_NOTE`/`cost_split_compatibility_mode`); VAT + contingency are consumed (`resolveProjectCharges`/`buildTotals`); audience redaction is server-derived (export route `resolveExportAudience`). Still open per Capability Map: preview≠download is intentional (preview built client-safe/active-tab only), and `ProposalExportMode`/`ProposalConsolidationMode` remain DEAD CONFIG (declared, never read).
- **Summary:** 34 findings (6 CRITICAL, 9 HIGH). Export is safe but over-promises: preview≠download, missing Material/Labor split, VAT/contingency, incomplete title block. Dead config surface. Tabs already export to separate worksheets.
- **Owner decisions needed:** Primary audience, preview approach, multi-tab total display, labor data source, VAT/contingency policy, etc.

### Add New Tabs Plan
- **Package:** `.ai/09_archive/2026-06-13-Add-New-Tabs/` (10 docs + mockups; archived since this entry was written — verified 2026-06-18).
- **Status:** SHIPPED (verified 2026-06-18) — the D-15 release gate has been **lifted**, not merely "built behind" it: `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx` wires `createEstimateTab` with a `canEditEstimate` gate and notes "release gate D-15 was lifted once tab-aware [export] shipped". Full tab CRUD+reorder is BUILT/VERIFIED per Capability Map (`src/lib/estimates/actions.ts`, tests `estimate-tab-strip.test.tsx`).
- **Summary:** The "+" button for new estimate tabs exists in code already; its release gate (precondition: tab-aware export) has since shipped and the gate is lifted. Plan covered lifting the gate, permission-gating on `canEditEstimate`, replacing toolbar row with right-click context menu, and browser-grade polish. No DB/RPC/RLS/type change required.
- **Implementation ready:** U1–U7 units defined, test/QA plan in place.

---

## 2026-06-03 ADD operating-framework track

Status: Phase 1A/1B repo-local framework rollout is complete, mirrored, and
archived at `.ai/09_archive/store/2026-06-03-agentic-development-framework-rollout/`.
The old active plan path under `.ai/03_plans` now exists only as an
archive-pointer README so stale goal references resolve to completion proof
instead of a missing-folder blocker. Do not schedule this as a new
implementation task unless OWNER_NAME_PLACEHOLDER explicitly reopens a later enforcement phase.
It must not displace the current closed-beta proof collection workstream or
claim provider readiness.

---

## Workstream 1: Environment & Deployment Foundation

**Purpose:** Create safe, isolated environments for testing and deploying before beta.

**Now-Unblocked Cards:**
- BETA-P0-INF-001 — Staging/environment separation plan and implementation

**Code-state note (verified 2026-06-18):** TOOLING built, external proof OPEN. A CI pipeline exists (`.github/workflows/ci.yml`: `validate` → `build` → `test:e2e` → `test:e2e:perf`) and environment/readiness CHECK SCRIPTS exist (`scripts/check-vercel-env-readiness.ts`, `check-vercel-production-readiness.ts`, `check-vercel-health-readiness.ts`, `check-supabase-linked-readiness.ts`) — but these only parse transcripts/probe URLs. The staging Supabase project, Vercel preview, env provisioning, and preview protection themselves are EXTERNAL/HOSTED facts no code can prove; this card stays OPEN until operator-run evidence is captured.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0 — see `29-enterprise-mvp-scope-and-owner-defaults.md`)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Supabase staging project creation (`supabase project create`)
- Vercel staging preview project configuration
- Preview deployment protection (auth gate or equivalent)
- Environment variable provisioning per environment (local / staging)

**Implementation Required (agent can execute):**
- Staging environment configuration documentation
- Environment variable inventory table (local vs staging vs future production)
- Staging smoke test script
- CI pipeline configuration for staging deployment
- Preview protection configuration

**Evidence Required:**
- Staging Supabase project URL (redacted) + configuration proof
- Vercel staging preview URL (redacted) + deployment proof
- Environment variable inventory (per-environment table, values redacted)
- Staging smoke test pass output
- Preview protection verification

**Performance Gate:** Staging environment must mirror production for realistic performance testing.

**Security Gate:** Staging must use separate service-role keys from dev. Preview deployments must not be publicly accessible. No credentials shared between environments.

**UX Gate:** N/A (infrastructure work)

**First Ralph Loop Target:** BETA-P0-INF-001 — prepare staging plan, configuration files, and OWNER_NAME_PLACEHOLDER execution checklist. Verify staging is operational and smoke-tested.

**Dependencies:** Wave 0 (owner defaults — DONE). This workstream activates first and unblocks all others.

**Explicitly Out of Scope:**
- Production CD pipeline (Workstream 7, Wave 8)
- Multi-region deployment (POST-MVP)
- Full monitoring dashboards (Workstream 3)
- PITR / advanced backup configuration (Workstream 6)
- Domain/DNS/SSL setup (Wave 8)

---

## Workstream 2: Security Evidence

**Purpose:** Prove tenant isolation, data boundaries, and auth safety before any external user touches the system.

**Now-Unblocked Cards:**
- BETA-P0-SEC-001 — RLS denial test harness
- BETA-P0-SEC-002 — Storage denial test harness
- BETA-P0-SEC-003 — API/server-action authorization audit and tests
- BETA-P0-SEC-004 — Secrets scanning and service-role leak check
- BETA-P0-SEC-005 — Persistent rate limiting or equivalent durable protection
- BETA-P1-SEC-006 — Cloudflare Turnstile (BETA P1 — recommended but can be accepted risk)

**Code-state note (verified 2026-06-18):** Several of these cards already have substantial code, though the *evidence-against-staging* deliverable remains open. BUILT in repo: BETA-P0-SEC-005 persistent/durable rate limiting (`src/lib/publication/public-repository.ts` `checkRecordedRateLimit`, `src/lib/ai/rate-limit.ts`, migration `supabase/migrations/20260601003000_security_rate_limit_events.sql`); BETA-P0-SEC-003 API/server-action authorization is enforced in-action across the codebase (`requireCurrentUserContext`, `assertCan*` helpers) with tests (e.g. `estimate-sheet-actions-authz.test.ts`). PARTIAL: BETA-P0-SEC-001/002 RLS/storage denial proofs exist only as local-Postgres harnesses (`scripts/prove-rls-initplan-postgres.mjs`, `scripts/prove-notification-rls-postgres.mjs`) that are NOT in CI and need local PG binaries; running them against staging is still pending. NOT STARTED in repo: BETA-P0-SEC-004 secrets-scanning CI (no gitleaks/trufflehog config in `.github/`) and BETA-P1-SEC-006 Turnstile (no integration in code). NEEDS INPUT: staging-Supabase test execution + bundle service-role audit are external/hosted facts not provable from code.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Rate limiting: Redis or equivalent durable store provisioning (if Redis-backed approach chosen)
- Turnstile: Cloudflare account and site key (if OWNER_NAME_PLACEHOLDER opts for BETA-P1-SEC-006)

**Implementation Required (agent can execute):**
- RLS denial test suite for all user-data tables (against staging Supabase)
- Storage denial test suite (cross-workspace access)
- API/server-action auth audit script + manual review checklist
- Secrets scanning CI configuration (gitleaks or equivalent)
- Service-role bundle audit (verify key never in client JS)
- Persistent rate limiting implementation (survives restart, enforces lockout)
- Turnstile integration (if OWNER_NAME_PLACEHOLDER activates BETA-P1-SEC-006)

**Evidence Required:**
- RLS denial test output (`.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001/`)
- Storage denial test output (`.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002/`)
- API auth audit report (`.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003/`)
- Secrets scanning CI config + verification (`.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-004/`)
- Rate limit persistence verification (`.ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-005/`)
- Bundle audit proof (service-role key absent from client build)

**Performance Gate:** Test harness must run in under 5 minutes. RLS denial tests should use transaction rollback. Rate limiting must not add >50ms to auth endpoints.

**Security Gate:** ALL security tests must pass. Zero bypasses tolerated. RLS gap found = BLOCKER. Rate limiting must survive process restart. Secrets scanning must block commits with credential patterns.

**UX Gate:** N/A (backend security work)

**First Ralph Loop Target:** BETA-P0-SEC-001 — RLS denial test harness. Write tests, run against staging Supabase, produce PASS/FAIL report.

**Dependencies:** Wave 1 (staging environment — MUST exist before tests can run against it). Wave 0 (owner defaults — DONE).

**Critical Note:** Security tests MUST run against staging Supabase (or a safe local harness with identical RLS/storage configuration), NOT against the dev Supabase project. Running denial tests against dev risks corrupting development data and does not prove staging/production safety. Workstream 1 (staging) MUST complete before this workstream begins test execution.

**Explicitly Out of Scope:**
- Third-party penetration testing (POST-MVP)
- Full OWASP ASVS compliance (Wave 8)
- Bug bounty program (Wave 8)
- Fixing RLS policy gaps (report only — fixes are separate goal cards)
- Rewriting auth middleware (report only)

---

## Workstream 3: Performance & Observability

**Purpose:** Establish error visibility and baseline performance. Prevent slow or bloated MVP. Code-split heavy modules.

**Now-Unblocked Cards:**
- BETA-P0-OBS-001 — Sentry / basic error tracking and logging path
- BETA-P0-ANA-001 — First-party product events / analytics
- BETA-P0-PERF-001 — Performance benchmark harness (route transitions, row editing, tree rendering, export)
- BETA-P0-PERF-002 — Bundle analyzer + code splitting
- CODEX-P0-DBIDX-001 — Database Index & Query Plan Audit
- CODEX-P0-DBIDX-002 — Migration Parity & Shared-Link Schema Reconciliation
- CODEX-P0-DBIDX-003 — EXPLAIN Protocol for Critical Queries
- CODEX-P1-DBIDX-004 — Candidate Index Migration Draft for Staging

**Code-state note (verified 2026-06-18):** BUILT in repo: BETA-P0-PERF-001 route-transition benchmark harness (`scripts/measure-route-transitions.ts`, `e2e/route-transition-performance.spec.ts`, readiness gate `scripts/check-route-transition-readiness.ts`); BETA-P0-PERF-002 bundle analyzer + bundle config (`@next/bundle-analyzer` in `package.json` + `next.config.ts`, `experimental.optimizePackageImports`/`staleTimes`); BETA-P0-ANA-001 first-party/Vercel web analytics with privacy redaction (`src/lib/analytics/vercel-web-analytics.ts`, `@vercel/analytics`, mounted in `src/app/layout.tsx`); CODEX-DBIDX EXPLAIN/inventory evidence (`metrics/p2-explain-before.txt`/`-after.txt`, `scripts/build-performance-query-inventory.ts`). NOT STARTED in repo: BETA-P0-OBS-001 Sentry/error-tracking — there is NO `@sentry/*` SDK or any exception-monitoring integration anywhere (`src/lib/*-telemetry.ts` are console-only seams). The Web Vitals probe is dev-only console logging, not RUM; `@vercel/speed-insights` is not installed. NEEDS INPUT: ExcelJS/D3/Three are all present in `package.json`, but whether they are `next/dynamic` code-split, plus Lighthouse/staging benchmark execution, remain to verify (not provable from the inventory alone).

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Sentry account creation and project setup
- Sentry DSN provisioning for staging environment

**Implementation Required (agent can execute):**
- Sentry SDK integration (client + server, with source maps)
- Log visibility path (Vercel logs or log drain configuration)
- Bundle analyzer integration (`@next/bundle-analyzer` or equivalent)
- Heavy module code-splitting (ExcelJS, D3, Three.js via `next/dynamic`)
- Route transition benchmark harness
- Estimate sheet row-edit latency measurement
- Tree render benchmark (500 nodes)
- XLSX export benchmarks (100 and 500 rows)
- Share receiver FMP measurement
- AI timeout/degraded-state behavior validation

**Evidence Required:**
- Sentry dashboard screenshot showing errors from staging
- Log visibility proof (searchable log entry from staging)
- Bundle analyzer report with chunk sizes
- Lighthouse reports for key routes (landing, workshop, share receiver)
- Performance trace files (route transitions, row editing, tree rendering)
- Benchmark output CSV/JSON (XLSX export timings, tree node counts, sheet row counts)

**Performance Gate:**

| Metric | Beta Target | Public Launch Target |
|--------|------------|---------------------|
| Route transitions | < 200ms acceptable, < 100ms target | < 100ms |
| Estimate row edit latency | < 200ms | < 100ms |
| Tree render 500 nodes | < 1s | < 500ms |
| Component library 1,000 items | < 1.5s | < 1s |
| XLSX export 100 rows | < 3s | < 2s |
| XLSX export 500 rows | < 10s | < 5s or background job |
| Share receiver FMP | < 2s | < 1.5s |
| Main bundle chunk | < 200KB gzipped | < 150KB gzipped |
| Total JS bundle | < 500KB gzipped | < 400KB gzipped |

**Security Gate:** Sentry must sanitize PII in error reports. Error pages must not leak stack traces or internal paths.

**UX Gate:** N/A (infrastructure and benchmarking work)

**First Ralph Loop Target:** BETA-P0-OBS-001 — configure Sentry, verify errors appear in dashboard from staging. Prepare Sentry setup instructions for Philip.

**Dependencies:** Wave 1 (staging environment for benchmark execution), Wave 2 (security evidence foundation).

**Explicitly Out of Scope:**
- Achieving all public-launch performance targets (Wave 8)
- Advanced caching strategies (POST-MVP)
- Offline mutation queue (POST-MVP)
- Circuit breakers for external services (Wave 8)
- Full offline/degraded mode design (Wave 8)

---

## Workstream 4: Core Product UX & Onboarding

**Purpose:** Make first users reach value without confusion or external help.

**Now-Unblocked Cards:**
- BETA-P0-UX-001 — Core onboarding and first-value flow
- BETA-P0-UX-002 — Core estimating happy path polish
- BETA-P0-UX-004 — Desktop guard for workshop
- BETA-P0-REL-001 — Error boundaries, custom 404/500, degraded states

**Code-state note (verified 2026-06-18):** Mixed. PARTIAL: BETA-P0-REL-001 — workshop route `error.tsx` boundaries are BUILT (7 files under `src/app/workshop/**`: library, library/components, library/templates[/[templateId]], projects/[projectId]/data, .../estimates[/[nodeId]]) with sanitized-retry UI tested (`workshop-route-error-boundaries.test.tsx`), BUT there is **no custom `not-found.tsx` anywhere** (no custom 404) and **no root `src/app/error.tsx`/`global-error.tsx`** (landing/login/share/invite fall back to Next defaults). NOT STARTED in repo: BETA-P0-UX-001 guided onboarding/first-value wizard — `src/app/workshop/onboarding/page.tsx` is a redirect stub to `/workshop/settings`, `completeOnboarding` (`src/lib/auth/account-actions.ts`) is orphaned with no UI caller, and there is no react-joyride/wizard component (the `2026-06-03-react-joyride-onboarding-implementation-plan` remains a plan); BETA-P0-UX-004 desktop guard <768px — no dedicated viewport-guard component found. BETA-P0-UX-002 estimating happy path is largely BUILT (estimate-core is mature per Capability Map). NEEDS INPUT: non-technical-user walkthrough evidence + empty-state CTA coverage are manual/QA facts not provable from code.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required:** None

**Implementation Required (agent can execute):**
- First-run onboarding path (landing → login → workshop → project → estimate → rows → cost visible)
- Empty-state CTAs on all blank surfaces (workshop, project, estimate, library, templates)
- Guided estimate creation with bootstrap tree (Lot → Structure → Level → Area)
- "Add your first line item" prompt on empty area nodes
- Export/Share button visibility after rows exist
- Invite onboarding flows (signed-out accept, signed-in accept, wrong-account recovery)
- Desktop guard overlay at <768px viewport with clear message
- Error boundaries on all workshop-level components
- Custom `not-found.tsx` for workshop routes (design system)
- Custom `error.tsx` with retry button (design system)
- Design-system consistency pass: all workshop routes

**Evidence Required:**
- Onboarding flow screenshots (full path: landing → login → workshop → project → estimate → row → cost)
- Empty-state UI screenshots (workshop, project, estimate, library, templates)
- Happy path walkthrough evidence (non-technical user test results)
- Design-system consistency lint output (`bun run lint:design-system`)
- Desktop guard overlay screenshot at <768px
- Custom 404/500 page screenshots
- Error boundary trigger + recovery evidence

**Performance Gate:** Must not regress route transitions, sheet editing latency, or bundle size. Loading states must use design-system Skeleton. First-run onboarding must not add bundle weight to authenticated routes. Empty states should render instantly.

**Security Gate:** All new onboarding paths must respect auth boundaries. Unauthenticated users must not reach workshop routes. Desktop guard must not be bypassable.

**UX Gate:**
- Every empty state has a clear CTA button (not just "nothing here yet")
- Every loading state uses Skeleton (not spinner or "Loading..." text)
- Every error state shows recovery path (retry button, go home link)
- Every success state has subtle confirmation (toast, checkmark, or updated UI)
- Design-system compliance: `bun run lint:design-system` passes
- Font: SF Pro only, 12px max in app, xs radius only, zero letter-spacing, neutral palette

**First Ralph Loop Target:** BETA-P0-UX-001 — core onboarding first-value flow. Implement guided onboarding path, verify non-technical user can create estimate and see cost without guidance.

**Dependencies:** Wave 1 (staging), Wave 2 (security evidence — users must trust the system), Wave 3 (error boundaries — recovery paths only work if errors are caught).

**Explicitly Out of Scope:**
- Product-led self-serve onboarding for public launch (Wave 8)
- Full accessibility audit (BETA P1)
- Mobile workshop editing (Workstream 6)
- PDF export (Workstream 6)
- Tooltip tours and progressive disclosure (Wave 8)
- Success celebrations and gamification (POST-MVP)

---

## Workstream 5: Share / Export / AI Validation

**Purpose:** Prove external-facing features and AI flows are safe, understandable, and truthful.

**Now-Unblocked Cards:**
- BETA-P0-UX-003 — Shared-link client receiver comprehension
- BETA-P0-AI-001 — Ask/package-builder clarity and safety evidence

**Code-state note (verified 2026-06-18):** BUILT in repo: BETA-P0-UX-003 shared-link receiver surface is mature and the most-tested public route (`src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/**`, password lockout + recipient session + comments/decisions, 10+ test files) — receiver code is VERIFIED-grade, but *non-technical-user comprehension* is a manual-QA fact. BETA-P0-AI-001 AI Ask + package-builder are BUILT with auth/audit + injection defense and provider identification (`src/app/api/ai/ask/**`, `src/app/api/ai/package-builder/**`, `src/lib/ai/deepseek.ts`). NOTE (verified 2026-06-18): per-user **rate-limiting/quota** (`checkAiAskQuota`) is wired on the **Ask** route only; the **package-builder** route is auth-gated but **NOT rate-limited** (no quota/429/`Retry-After` call) — consistent with `26-codex-goal-cards.md` SEC-005E. Both are **flag-gated OFF by default** (`ARCHESTIMATOR_AI_ENABLED` default false → 404; UI flag `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` default false) and require a `DEEPSEEK_API_KEY` at runtime. The provider is **DeepSeek** (model `deepseek-v4-flash`), NOT OpenAI/Anthropic — consistent with this card's "AI provider identification" requirement. NEEDS INPUT: AI clarity/safety *evidence capture* and live answer quality are provider/runtime/manual facts not provable from code; cross-workspace AI denial is enforced in code (`src/lib/ai/auth.ts`) but full proof needs the flag enabled + a live session.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required:** None

**Implementation Required (agent can execute):**
- Shared link receiver comprehension validation (non-technical user test)
- Password gate lockout verification
- Comments/decisions/activity evidence capture
- XLSX export validation (50/200/500 row estimates)
- AI Ask safety validation (cross-workspace denial, scoped responses)
- Package-builder confirmation-gate validation
- Public claims truthfulness audit (landing, about, features, pricing pages)
- AI disclaimer visibility verification
- AI provider identification (DeepSeek, not OpenAI/Anthropic)

**Evidence Required:**
- Shared link receiver comprehension test results (non-technical user)
- Password gate lockout verification screenshots
- Comments/decisions/activity evidence screenshots
- XLSX export evidence (valid file, correct contents for all row counts)
- AI Ask safety evidence (cross-workspace denial, scoped responses)
- Package-builder confirmation-gate evidence
- Public claims truthfulness audit results
- AI disclaimer screenshots

**Performance Gate:**

| Metric | Beta Target |
|--------|------------|
| Share receiver FMP | < 2s |
| XLSX 100 rows | < 3s |
| XLSX 500 rows | < 10s |
| AI Ask timeout | clear UI by 30s |
| Package-builder response | must not block UI |

**Security Gate:**
- Shared link tokens must not be enumerable (random token → 404)
- Password-gated share must enforce progressive lockout (5 attempts, 15-min window)
- AI Ask must not access other workspaces' data
- AI Package-builder must require explicit user confirmation before writing any data
- AI disclaimers must be visible in both Ask and Package-builder UI
- Public copy must not claim autonomous AI, RAG, conversation memory, or internet access

**UX Gate:** AI features must have clear disclaimers. Shared receiver must be understandable by non-technical users. Public claims must be audited for truthfulness.

**First Ralph Loop Target:** BETA-P0-UX-003 — shared-link client receiver comprehension. Run non-technical user through shared link flow, document comprehension results, fix any blockers.

**Dependencies:** Wave 1 (staging), Wave 2 (security evidence — shared link boundaries, AI auth must be proven safe), Wave 4 (UX polish — receiver and AI UI must be polished).

**Explicitly Out of Scope:**
- PDF export (Workstream 6)
- Immutable issued proposal snapshots (Workstream 6)
- AI conversation history storage (POST-MVP)
- Vector/RAG/embeddings (DEFERRED)
- Broad AI memory expansion (DEFERRED)
- Autonomous AI mutations (NEVER — against product principles)

---

## Workstream 6: Enterprise MVP Feature Completion

**Purpose:** Ship the features that distinguish enterprise-ready product from beta prototype.

**Now-Unblocked Cards:**
- ENTERPRISE-P1-PROD-001 — Immutable issued proposal snapshots
- ENTERPRISE-P1-PROD-002 — PDF package workflow
- ENTERPRISE-P1-LEGAL-001 — Public-ready legal review (ToS, Privacy Notice, subprocessor list)
- ENTERPRISE-P1-SEC-001 — Strict CSP on workshop routes + feature flags
- ENTERPRISE-P1-UX-001 — Accessibility baseline beyond critical blockers + self-serve DSAR + full restore drill + full browser matrix + full mobile editing

**Code-state note (verified 2026-06-18):** Mixed; most of this workstream is genuinely open. BUILT in repo: a feature-flag system already exists and over-satisfies the "minimum 3 flags" requirement of ENTERPRISE-P1-SEC-001 (`src/lib/ai/feature-flags.ts`, `src/lib/collaboration/feature-flags.ts`, express-component flags, `closed-beta-access.ts`); publication snapshot foundation for ENTERPRISE-P1-PROD-001 exists (`src/lib/publication/snapshot.ts` `buildProjectPublicationSnapshot`, `snapshot_json`), though true write-once immutability is a hosted-DB fact. STILL OPEN in repo: ENTERPRISE-P1-PROD-002 PDF workflow — there is NO PDF library or PDF code path anywhere (export is XLSX-only via ExcelJS); ENTERPRISE-P1-SEC-001 *strict* CSP on workshop — `next.config.ts` ships `/workshop` as **Report-Only** CSP (only `/share` is enforced, per decision D-9), so the "switch to strict" deliverable is not done; ENTERPRISE-P1-UX-001 self-serve DSAR/export/delete — no DSAR flow exists (deletion is "email support@archestimator.com"). NEEDS INPUT: ENTERPRISE-P1-LEGAL-001 counsel review — `src/lib/legal/terms-content.ts` self-declares `legalReviewStatus: 'closed_beta_owner_approved_pending_counsel_review'` (owner-authored, NOT counsel-reviewed); accessibility/browser-matrix/PITR-restore/mobile-editing are manual/external facts.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Legal counsel engagement for ToS/Privacy Notice/subprocessor review
- PITR/backup configuration in Supabase
- CSP enforcement switch from Report-Only to strict

**Implementation Required (agent can execute):**
- PDF generation from estimate tree (styled proposal output)
- Immutable snapshot creation, retrieval, and issuance workflow
- Strict CSP header enforcement on all workshop routes
- Feature flag system (minimum 3 flags for controlled rollout)
- Accessibility baseline (aXe/WAVE audit, remediation of findings)
- Self-serve DSAR/export/delete flows
- Full restore drill procedure and documentation
- Full browser matrix validation (Chrome, Safari, Firefox, Edge)
- Responsive mobile editing on mobile viewports

**Evidence Required:**
- PDF output samples (styled, well-formatted proposals from estimate tree)
- Snapshot creation/retrieval/immutability verification screenshots
- CSP header verification (strict, not Report-Only)
- Feature flag dashboard/config proof
- aXe/WAVE audit report (all workshop routes)
- DSAR export output sample (complete user data)
- PITR restore drill documentation + screenshots
- Browser matrix smoke test results (4 browsers)
- Mobile editing screenshots (375px and 768px viewports)

**Performance Gate:** PDF generation must not block UI (>3s → async with progress indicator). Mobile editing must meet same row-edit latency targets as desktop. Feature flags must not add measurable overhead.

**Security Gate:** Strict CSP must have zero violations on workshop routes. DSAR export must be auth-gated. Feature flags must not leak feature state to unauthorized users. Snapshots must be truly immutable (write-once, read-many).

**UX Gate:** PDF output must be professionally styled. Snapshot UI must clearly communicate immutability. DSAR flows must be discoverable and understandable. Mobile editing must be usable, not just functional. Feature flags must be invisible to end users.

**First Ralph Loop Target:** ENTERPRISE-P1-PROD-001 — Immutable Issued Proposal Snapshots. Implement snapshot creation, retrieval, and issuance workflow from estimate tree.

**Dependencies:** Waves 1-5 complete (beta-validated core). This workstream runs in parallel with Workstream 7 (Beta Operations). Enterprise MVP features are NOT prerequisites for beta go/no-go.

**Explicitly Out of Scope:**
- Billing/payment integration (Wave 8)
- Admin dashboard (Wave 8)
- Enterprise SSO (POST-MVP)
- i18n / localization (POST-MVP)
- Multi-region deployment (POST-MVP)

---

## Workstream 7: Beta Operations

**Purpose:** Everything needed to start, run, and learn from a controlled design-partner beta.

**Now-Unblocked Cards:**
- BETA-P0-BETA-001 — Controlled beta kickoff system
- BETA-P0-OPS-001 — Support email configuration
- BETA-P0-LEGAL-001 — Beta legal / limitations pack

**Code-state note (verified 2026-06-18):** Supporting infra for BETA-P0-BETA-001 is BUILT in repo: closed-beta allowlist + admin queue (`supabase/migrations/20260601182522_closed_beta_allowed_emails.sql`, `src/lib/auth/beta-allowlist-admin.ts`), beta-feedback submission + review (`src/lib/workshop/beta-feedback-actions.ts`, `beta-feedback-review-actions.ts`) and admin pages (`src/app/workshop/settings/{beta-users,feedback}/page.tsx`). Beta legal/limitations copy exists (`src/lib/legal/terms-content.ts`, `/terms` + `/privacy` pages) but is owner-authored/`pending_counsel_review`. STILL OPEN (external/manual): BETA-P0-OPS-001 support email/auto-responder (provider+mailbox config), the beta checklist/risk-register/partner-list/runbook-drill artifacts, and OWNER_NAME_PLACEHOLDER beta signoff — none provable from code; closed-beta allow/deny at runtime also depends on hosted Supabase data.

**Blocked Goal Cards:**
- PUBLIC-P0-LEGAL-001 — Final Privacy/Terms/Subprocessor (Wave 8)
- ENTERPRISE-P1-PROD-001 — PDF/immutable proposals (Workstream 6)
- ENTERPRISE-P1-MOBILE-001 — Full mobile editing (Workstream 6)

**Owner Decisions Required:** OWNER_NAME_PLACEHOLDER beta signoff (all other decisions resolved in Wave 0)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Support email configuration (SUPPORT_INBOX_PLACEHOLDER with auto-responder)
- Beta partner outreach and commitment confirmation

**Implementation Required (agent can execute):**
- Beta checklist compilation (all BETA P0 items with evidence links)
- Risk acceptance register (Philip-signed, listing all BETA P1 accepted risks)
- Beta partner list (3-5 named design partners with contact info and use cases)
- Beta kickoff script (30-min facilitated session outline)
- Known limitations disclosure document (published, shareable)
- Feedback intake workflow (how users report, how OWNER_NAME_PLACEHOLDER triages)
- Weekly review ritual template (30-min agenda)
- Support email auto-responder content

**Evidence Required:**
- Beta checklist (all BETA P0 items marked DONE with evidence links)
- Risk acceptance register (Philip-signed document)
- Beta partner list (names, contact info, use cases — internal document)
- Beta kickoff script (30-min session outline)
- 4 critical runbooks drilled (AUTH-001 auth outage, SEC-001 data leak, DEP-002 bad deploy, COL-001 invite failure)
- Known limitations disclosure (published document)
- Feedback intake workflow documentation
- Weekly review ritual template
- Support email configuration proof + test
- OWNER_NAME_PLACEHOLDER beta approval (written signoff with date and scope)

**Performance Gate:** Beta operations are manual (Philip-led). No performance impact from this workstream. Support email should be lightweight (no ticketing system for <10 users).

**Security Gate:** Known limitations disclosure must be honest about security posture. Beta partners must sign acknowledgment of limitations.

**UX Gate:** Beta kickoff script must guide users to first value in <30 minutes. Support email auto-responder must set clear expectations (response time, scope).

**First Ralph Loop Target:** BETA-P0-OPS-001 — support email configuration. Configure and test SUPPORT_INBOX_PLACEHOLDER with auto-responder, prepare support intake template.

**Dependencies:** Waves 1-5 must complete before beta go/no-go. Enterprise MVP features (Workstream 6) are NOT prerequisites for beta. Beta operations can run in parallel with Workstream 6.

**Explicitly Out of Scope:**
- Public launch operations (Wave 8)
- Billing/payment processing (Wave 8)
- Automated onboarding flows (Wave 8)
- Marketing website update (separate task)
- Public signup or waitlist (POST-MVP)
- SLA commitments (Wave 8)

---

## Workstream 8: Collaboration & Sharing Hardening

**Purpose:** Unblock collaboration invites and bring shared-link to production-hardening parity. Cross-cuts Security (Workstream 2) and UX (Workstream 4).

**Now-Unblocked Cards:**
- HUMAN-P0-COLLAB-001A — Configure Supabase Auth Email Provider (human external setup)
- CODEX-P0-COLLAB-001B — Invite Environment Variable Inventory
- CODEX-P0-COLLAB-002 — Invite Acceptance Route Fail-Closed / POST-Only
- CODEX-P0-COLLAB-003 — Invite Lifecycle E2E Validation (after external setup)
- CODEX-P0-COLLAB-004 — Invite Messaging Truthfulness
- CODEX-P1-COLLAB-005 — Invite Visibility Signifiers
- CODEX-P1-SHARE-001 — Shared-Link Visibility Signifiers
- CODEX-P1-SHARE-002 — Shared-Link Recipient Tracking
- CODEX-P1-SHARE-003 — Shared-Link Owner Digest Sender Fix
- CODEX-P1-SHARE-004 — Shared-Link Destructive Confirmations

**Code-state note (verified 2026-06-18):** Most of the agent-executable cards here are BUILT in repo. CODEX-P0-COLLAB-002 invite-accept fail-closed/POST-only — `src/app/invite/[token]/accept/route.ts` mutates only on `POST` and is origin-guarded (`isAllowedInviteOrigin`), tested (`invite-accept-origin.test.ts`). CODEX-P1-SHARE-002 recipient tracking, CODEX-P1-SHARE-003 owner digest, recipient management — all in `src/lib/publication/actions.ts` (`listSharedLinkRecipients`/`addSharedLinkRecipients`/`maybeTriggerSharedLinkActivityDigest`). Mass-deletion/destructive confirmation patterns (relevant to SHARE-004) are BUILT/VERIFIED per Capability Map (`src/lib/mass-deletion/**`). CAVEAT: project-invite entry links are **FEATURE-FLAGGED OFF by default** (`PROJECT_INVITE_ENTRY_ENABLED` must === 'true', `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` blank by default) — the default collaboration path is a direct `project_members` upsert. NEEDS INPUT / external: HUMAN-P0-COLLAB-001A Supabase Auth email provider config and CODEX-P0-COLLAB-003 invite lifecycle E2E both depend on hosted Supabase + email delivery (Resend) — these stay OPEN; "Email sent" truthfulness depends on real delivery, which code cannot prove.

**Blocked Goal Cards:** None

**Owner Decisions Required:** None (all resolved in Wave 0)

**External Setup Required (OWNER_NAME_PLACEHOLDER executes, agent prepares):**
- Supabase Auth email/SMTP provider configuration
- `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` env var provisioning

**Implementation Required (agent can execute):**
- Invite env var inventory and documentation
- POST-only invite acceptance route hardening
- Invite lifecycle E2E validation (after config unblock)
- Invite messaging truthfulness audit and fix
- Invite visibility signifiers throughout workshop surfaces
- Shared-link visibility signifiers (project-card badges, one-click copy)
- Shared-link per-recipient open tracking
- Shared-link owner digest sender identity fix
- Shared-link destructive confirmation dialogs

**Evidence Required:**
- Redacted Supabase dashboard screenshot (email provider)
- Env var inventory with invite vars
- POST-only accept proof (GET must not mutate)
- Invite lifecycle E2E evidence
- Visibility/signifier screenshots
- Recipient tracking proof
- Destructive confirmation screenshots
- Audit event evidence

**Performance Gate:** Must not regress route transitions, sheet editing latency, or bundle size. Rate limiting must add <5ms per request.

**Security Gate:** Invite tokens must not be enumerable. POST-only mutation must be enforced. Missing config must fail closed. "Email sent" must not be shown unless delivery is confirmed. In-memory rate limiting is not acceptable for external beta.

**UX Gate:** Invite states must be visible in project/sidebar/homebase surfaces. Shared-link badges and one-click copy must use design-system tokens. Destructive actions must require confirmation.

**First Ralph Loop Target:** HUMAN-P0-COLLAB-001A — OWNER_NAME_PLACEHOLDER configures Supabase Auth email provider. Then CODEX-P0-COLLAB-001B — document invite env vars.

**Dependencies:** Wave 1 (staging, human email provider setup). P0 invite cards align with Wave 2 (security evidence). P1 cards can run in parallel with Waves 4-5.

**Explicitly Out of Scope:**
- Full invite email template redesign (current audit scope only)
- Threaded comments (POST-MVP)
- Advanced recipient analytics (POST-MVP)

---

## Workstream Status Dashboard

| Workstream | Wave | Active Cards | Blocked Cards | Owner Decisions Pending | Dependencies Met? | Overall Status |
|------------|------|-------------|---------------|------------------------|-------------------|----------------|
| 1. Environment & Deployment | Wave 1 | 1 | 0 | 0 | Yes (Wave 0 DONE) | **READY — START NOW** |
| 2. Security Evidence | Wave 2 | 6 | 0 | 0 | No (needs Wave 1 staging) | **QUEUED — unblocks after Wave 1** |
| 3. Performance & Observability | Wave 3 | 4 | 0 | 0 | No (needs Waves 1-2) | **QUEUED — unblocks after Wave 2** |
| 4. Core UX & Onboarding | Wave 4 | 4 | 0 | 0 | No (needs Waves 1-3) | **QUEUED — unblocks after Wave 3** |
| 5. Share/Export/AI | Wave 5 | 2 | 0 | 0 | No (needs Waves 1-4) | **QUEUED — unblocks after Wave 4** |
| 6. Enterprise MVP | Wave 6 | 5 | 0 | 0 | No (needs Waves 1-5) | **QUEUED — unblocks after Wave 5** |
| 7. Beta Operations | Wave 7 | 3 | 3 | OWNER_NAME_PLACEHOLDER signoff | No (needs Waves 1-5) | **QUEUED — unblocks after Wave 5** |
| 8. Collaboration & Sharing Hardening | Waves 1-5 | 10 | 0 | 0 (human setup for invite config) | Partial (needs Wave 1 staging + Supabase email provider) | **P0: READY for human setup. P1: QUEUED — unblocks after Wave 4** |

**All 8 workstreams are unblocked for planning.** Owner decisions are codified (Wave 0 is DONE). Workstream 1 (Environment & Deployment) can begin immediately. Workstream 8 (Collaboration & Sharing) has P0 human external setup ready now. Subsequent workstreams activate in wave order as dependencies are satisfied.

> **Dashboard accuracy note (verified 2026-06-18):** This table encodes the original *planning sequence* and "Active/Blocked Card" counts, not current build state. Since it was written, much of the agent-executable implementation in WS2 (rate limiting, server-action authz), WS3 (perf harness, bundle analyzer, web analytics — but NOT Sentry), WS4 (workshop error boundaries — but NOT custom 404/global-error or onboarding wizard), WS5 (share receiver, AI Ask/package-builder behind default-OFF flags), WS6 (feature-flag system, publication snapshot foundation — but NOT PDF, strict-workshop-CSP, or DSAR), and WS8 (invite fail-closed, recipient tracking, digest) has LANDED in code — see each workstream's "Code-state note" above. The remaining MVP-launch work is overwhelmingly the external/provider/manual proof described in "Current MVP Launch Handoff", not fresh repo-local implementation.

---

## Sequencing & Parallelism

Waves 0-8 are **sequential** — each builds on the previous. Within each wave, workstreams can run in **parallel**:

- **Wave 0:** Owner defaults codified — **DONE.** All workstreams unblocked for planning.
- **Wave 1:** Workstream 1 (Environment & Deployment) activates. 1 card: staging foundation.
- **Wave 2:** Workstream 2 (Security Evidence) activates. 6 cards can run in parallel.
- **Wave 3:** Workstream 3 (Performance & Observability) activates. 4 cards can run in parallel.
- **Wave 4:** Workstream 4 (Core UX & Onboarding) activates. 4 cards can run in parallel.
- **Wave 5:** Workstream 5 (Share/Export/AI) activates. 2 cards can run in parallel.
- **Wave 6:** Workstream 6 (Enterprise MVP) activates. 5 cards can run in parallel. Runs in parallel with Wave 7.
- **Wave 7:** Workstream 7 (Beta Operations) activates. 3 cards. Runs after Waves 1-5. Runs in parallel with Wave 6.
- **Wave 8:** Public/Paid Launch hardening. Not yet planned as workstreams. After beta + enterprise MVP.

**Key parallelization rule:** Waves 6 and 7 can run in parallel because Wave 7 (beta go/no-go) depends on Waves 1-5 only — NOT on Wave 6 enterprise features.

The workstreams are not 7 independent parallel tracks — they **activate at different waves** based on dependencies. See `23-codex-goal-execution-plan.md` for the full wave dependency graph.

---

## New Goal Card to Workstream Mapping

| Goal Card | Description | Workstream | Wave |
|-----------|-------------|------------|------|
| BETA-P0-INF-001 | Staging/environment foundation | 1 | 1 |
| BETA-P0-SEC-001 | RLS denial tests | 2 | 2 |
| BETA-P0-SEC-002 | Storage denial tests | 2 | 2 |
| BETA-P0-SEC-003 | API/server-action auth audit | 2 | 2 |
| BETA-P0-SEC-004 | Secrets scanning / service-role leak check | 2 | 2 |
| BETA-P0-SEC-005 | Persistent rate limiting | 2 | 2 |
| BETA-P1-SEC-006 | Cloudflare Turnstile (BETA P1) | 2 | 2 |
| BETA-P0-OBS-001 | Sentry / basic error tracking | 3 | 3 |
| BETA-P0-ANA-001 | First-party product events / analytics | 3 | 3 |
| BETA-P0-PERF-001 | Performance benchmark harness | 3 | 3 |
| BETA-P0-PERF-002 | Bundle analyzer + code splitting | 3 | 3 |
| CODEX-P0-DBIDX-001 | Database index & query-plan audit | 3 | 2 |
| CODEX-P0-DBIDX-002 | Migration parity & schema reconciliation | 3 | 2 |
| CODEX-P0-DBIDX-003 | EXPLAIN protocol for critical queries | 3 | 2 |
| CODEX-P1-DBIDX-004 | Candidate index migration draft | 3 | 3 |
| CODEX-P1-DBIDX-005 | Database search index strategy | 3 | 6 |
| BETA-P0-UX-001 | Core onboarding first-value flow | 4 | 4 |
| BETA-P0-UX-002 | Estimating happy path polish | 4 | 4 |
| BETA-P0-UX-004 | Desktop guard for workshop | 4 | 4 |
| BETA-P0-REL-001 | Error boundaries, 404/500 | 4 | 4 |
| BETA-P0-UX-003 | Shared-link receiver comprehension | 5 | 5 |
| BETA-P0-AI-001 | AI clarity and safety evidence | 5 | 5 |
| ENTERPRISE-P1-PROD-001 | Immutable issued proposal snapshots | 6 | 6 |
| ENTERPRISE-P1-PROD-002 | PDF package workflow | 6 | 6 |
| ENTERPRISE-P1-LEGAL-001 | Public-ready legal review | 6 | 6 |
| ENTERPRISE-P1-SEC-001 | Strict CSP + feature flags | 6 | 6 |
| ENTERPRISE-P1-UX-001 | Accessibility + DSAR + PITR + browser matrix + mobile | 6 | 6 |
| BETA-P0-BETA-001 | Controlled beta kickoff | 7 | 7 |
| BETA-P0-OPS-001 | Support email | 7 | 7 |
| BETA-P0-LEGAL-001 | Beta legal / limitations pack | 7 | 7 |

---

## Next Action

1. **Start with Wave 1: BETA-P0-INF-001.** Owner defaults are codified (Wave 0 DONE). Staging/environment foundation is the first implementation workstream.
2. Agent prepares staging plan, configuration files, and OWNER_NAME_PLACEHOLDER execution checklist for Supabase staging project + Vercel staging preview.
3. Once staging is operational and smoke-tested, proceed to Wave 2 (Security Evidence).
4. Follow wave sequence as defined in `23-codex-goal-execution-plan.md`.

---

## Activity History Overhaul V1 — completed archived workstream

| Field | Value |
|---|---|
| Status | `COMPLETED / ARCHIVED — repo-local implementation complete; final main merge pending` |
| Branch | `feat/activity-history-overhaul-v1` |
| Archived plan | `.ai/09_archive/store/2026-06-03-activity-history-overhaul-v1/` (path corrected — verified 2026-06-18) |
| Evidence ledger | `.ai/01_roadmap/35-activity-history-overhaul-v1-execution.md` |
| Archive path | `.ai/09_archive/store/2026-06-03-activity-history-overhaul-v1/` (path corrected — verified 2026-06-18) |
| Production telemetry | `NO-GO` until docs 64/66/68 gates have real evidence |

This workstream covers PR 2 through PR 9 repo-local implementation: preflight correctness, composer module, estimate UI integration, shared-link API integration, recipient actor copy, privacy-safe access telemetry, pagination/Realtime hardening, telemetry operations hardening, and UI/accessibility/performance polish.

---

## Mass deletion project / estimate sheet / component cleanup — repo-local implementation complete

| Field | Value |
|---|---|
| Status | `IMPLEMENTED LOCALLY / DB PROVIDER APPLY OPEN` |
| Branch | `feat/mass-project-estimate-component-deletion` |
| Archived plan | `.ai/09_archive/2026-06-03-mass-deletion-projects-estimate-sheets-library-components/` |
| Core files | `src/lib/projects/actions.ts`, `src/lib/estimates/actions.ts`, `src/lib/component-library/actions.ts`, `supabase/migrations/20260603160000_mass_deletion_governance.sql` |
| Verification | `bun run validate`; `bun run build`; targeted mass-deletion + affected UI suites |
| Production gate | Apply the mass-deletion SQL migration to the target Supabase environment before using live destructive controls |

This workstream adds preview-first project deletion, estimate-sheet deletion, and reversible component archive with typed confirmation, audit rows, cache revalidation, storage cleanup allowlists, and design-system compliant bulk UI.
