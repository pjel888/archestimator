# First Execution Queue

**Last updated:** 2026-05-30
**Reconciled against code:** 2026-06-18 (ROADMAP_SYNC_LOOP) — see `[SYNC 2026-06-18]` status column.
**Purpose:** The ordered queue Codex/Ralph Loop must follow after this cleanup pass.

> **[SYNC 2026-06-18] STALE-QUEUE WARNING.** This queue (written 2026-05-30) framed every Phase 2 card
> as `READY FOR CODEX` (not started). Code review on 2026-06-18 shows several are already implemented
> (benchmark harness, bundle analyzer, privacy/terms pages, workshop error/loading boundaries). A new
> `[SYNC 2026-06-18] Code status` column annotates each row. `DONE (code)` means the implementation
> exists in the repo — it does NOT assert an evidence-artifact pack was recorded. Phase 1 (human
> external setup) and Phase 3 (staging-dependent) remain external/unprovable from code.

## Phase 1: Human External Setup (NOT Codex tasks)

| Order | Goal ID | Task | Who | Can Codex start? | Why now |
|---|---|---|---|---|---|
| H1 | HUMAN-P0-INF-001A | Create staging Supabase project | Philip | No — external service | First blocker. All security tests need staging target. |
| H2 | HUMAN-P0-INF-001B | Create Vercel staging/preview environment | Philip | No — external service | Needed for safe deploy testing before beta. |
| H3 | HUMAN-P0-INF-001C | Provide staging env vars securely | Philip | No — credentials | Codex needs env vars to configure staging mapping. |

## Phase 2: Codex Tasks (can run before staging exists)

| Order | Goal ID | Task | Can Codex start now? | Requires external setup? | Why now | Evidence path | [SYNC 2026-06-18] Code status |
|---|---|---|---|---|---|---|---|
| C1 | CODEX-P0-INF-001C | Env var inventory and staging mapping | YES — READY FOR CODEX | No | Documents all env vars per environment. No staging needed. | .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-INF-001C/ | NEEDS INPUT — `.env.example` env contract exists; staging-mapping deliverable unconfirmed. |
| C2 | BETA-P0-SEC-004 | Secrets scanning / service-role leak audit | YES — READY FOR CODEX | No | CI change only. Can run locally. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-004/ | OPEN (ghost) — no secret-scan step in `.github/workflows/ci.yml` or `scripts/`. Not built. |
| C3 | BETA-P0-SEC-003A | API route inventory | YES — READY FOR CODEX | No | Read-only audit of src/app/api/. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003A/ | NEEDS INPUT — routes exist under `src/app/api/**`; inventory deliverable unconfirmed. |
| C4 | BETA-P0-SEC-003D | Server action inventory | YES — READY FOR CODEX | No | Read-only audit of src/lib/*/actions.ts. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003D/ | NEEDS INPUT — many `src/lib/*/actions.ts` exist; inventory deliverable unconfirmed. |
| C5 | BETA-P0-PERF-001A | Benchmark harness foundation | YES — READY FOR CODEX | No | Create harness structure. No staging needed. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001A/ | DONE (code) — `scripts/measure-route-transitions.ts`, `e2e/route-transition-performance.spec.ts`, perf:* scripts. |
| C6 | BETA-P0-PERF-002A | Bundle analyzer integration | YES — READY FOR CODEX | No | Build config change. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002A/ | DONE (code) — `next.config.ts` `@next/bundle-analyzer` + `optimizePackageImports`. |
| C7 | BETA-P0-UX-004 | Workshop desktop guard | YES — READY FOR CODEX | No | UI component only. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-004/ | OPEN (ghost) — no desktop/min-viewport guard component found in `src/components/workshop/`. Not built. |
| C8 | BETA-P0-LEGAL-001A | Minimum beta privacy notice draft | YES — READY FOR CODEX | No | Content-only. Static page. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001A/ | DONE (code) — `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/lib/legal/terms-content.ts`. NOTE: NOT counsel-reviewed (`legalReviewStatus = ...pending_counsel_review`). |
| C9 | BETA-P0-OPS-001B | Feedback intake tracker | YES — READY FOR CODEX | No | .ai/ log setup. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-OPS-001B/ | NEEDS INPUT — in-app beta feedback exists (`src/lib/workshop/beta-feedback-actions.ts`); `.ai/` tracker deliverable unconfirmed. |
| C10 | BETA-P0-REL-001 | Error boundaries + 404/500 + mobile guard | YES — READY FOR CODEX | No | Standalone UI resilience. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-REL-001/ | PARTIAL (code) — 7 `error.tsx` + 11 `loading.tsx` under `src/app/workshop/**`; GAPS: no `src/app/global-error.tsx`, no custom `src/app/not-found.tsx`, no mobile guard (see C7). |

## Phase 3: Codex Tasks (after staging exists)

> **[SYNC 2026-06-18]** Phase 3 is staging/provider dependent; "done" is an external fact code cannot
> prove. Notes below record only what code shows about local scaffolding vs. the staging deliverable.

| Order | Goal ID | Task | Can Codex start now? | Requires external setup? | Why now | Evidence path | [SYNC 2026-06-18] Code status |
|---|---|---|---|---|---|---|---|
| S1 | BETA-P0-SEC-001A | RLS test harness foundation | No — needs staging | Yes — staging Supabase | Build harness against staging. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001A/ | OPEN (staging) — local-only prove-*postgres.mjs harnesses exist (`scripts/prove-rls-initplan-postgres.mjs`, `prove-notification-rls-postgres.mjs`), NOT in CI; no `tests/integration/` dir; staging harness OPEN. |
| S2 | BETA-P0-SEC-001B | Core hierarchy RLS denial tests | No — needs staging | Yes — staging Supabase | First batch of real RLS tests. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001B/ | OPEN (staging) — `tests/vitest/notification-rls-proof.test.ts` is describe.skip without live env; real denial tests against staging OPEN. |
| S3 | BETA-P0-SEC-002A | Storage test harness foundation | No — needs staging | Yes — staging Supabase | Build storage test harness. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002A/ | OPEN (staging) — only mocked `tests/vitest/storage-cleanup-allowlist.test.ts`; no staging storage harness. |
| S4 | BETA-P0-SEC-002B | component-images public-read/upload-denial tests | No — needs staging | Yes — staging Supabase | Storage bucket scoping. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002B/ | OPEN (staging) — no storage-denial test found; staging-dependent. |
| S5 | BETA-P0-SEC-003B | API auth tests for AI routes | No — needs staging | Yes — staging Supabase | Auth audit against real routes. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003B/ | PARTIAL — AI auth guard IS unit-tested (`tests/vitest/ai-auth-guard.test.ts`, `ai-ask-route.test.ts`) but mocked; staging-route auth audit OPEN. (AI routes are flag-OFF by default: `ARCHESTIMATOR_AI_ENABLED`.) |
| S6 | BETA-P0-OBS-001B | Sentry client/server SDK integration | No — needs DSN | Yes — Sentry DSN | SDK integration after DSN provisioned. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001B/ | OPEN (matches) — no `@sentry/*` in `package.json`, no Sentry init in `src/`. Not built (confirms doc). |

## Quick Start

1. Philip completes Phase 1 (H1-H3)
2. Codex starts Phase 2 (C1-C10) — these can run without staging
3. After staging exists, Codex starts Phase 3 (S1-S6)

## Rules
- Execute in order within each phase
- Do not skip Phase 1
- Do not run Phase 3 tasks before Phase 1 is complete
- All Phase 2 tasks are independent — they can run in parallel (but Codex should still do one at a time)
