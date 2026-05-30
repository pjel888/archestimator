# First Execution Queue

**Last updated:** 2026-05-30
**Purpose:** The ordered queue Codex/Ralph Loop must follow after this cleanup pass.

## Phase 1: Human External Setup (NOT Codex tasks)

| Order | Goal ID | Task | Who | Can Codex start? | Why now |
|---|---|---|---|---|---|
| H1 | HUMAN-P0-INF-001A | Create staging Supabase project | Philip | No — external service | First blocker. All security tests need staging target. |
| H2 | HUMAN-P0-INF-001B | Create Vercel staging/preview environment | Philip | No — external service | Needed for safe deploy testing before beta. |
| H3 | HUMAN-P0-INF-001C | Provide staging env vars securely | Philip | No — credentials | Codex needs env vars to configure staging mapping. |

## Phase 2: Codex Tasks (can run before staging exists)

| Order | Goal ID | Task | Can Codex start now? | Requires external setup? | Why now | Evidence path |
|---|---|---|---|---|---|---|
| C1 | CODEX-P0-INF-001C | Env var inventory and staging mapping | YES — READY FOR CODEX | No | Documents all env vars per environment. No staging needed. | .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-INF-001C/ |
| C2 | BETA-P0-SEC-004 | Secrets scanning / service-role leak audit | YES — READY FOR CODEX | No | CI change only. Can run locally. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-004/ |
| C3 | BETA-P0-SEC-003A | API route inventory | YES — READY FOR CODEX | No | Read-only audit of src/app/api/. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003A/ |
| C4 | BETA-P0-SEC-003D | Server action inventory | YES — READY FOR CODEX | No | Read-only audit of src/lib/*/actions.ts. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003D/ |
| C5 | BETA-P0-PERF-001A | Benchmark harness foundation | YES — READY FOR CODEX | No | Create harness structure. No staging needed. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-001A/ |
| C6 | BETA-P0-PERF-002A | Bundle analyzer integration | YES — READY FOR CODEX | No | Build config change. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-PERF-002A/ |
| C7 | BETA-P0-UX-004 | Workshop desktop guard | YES — READY FOR CODEX | No | UI component only. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-UX-004/ |
| C8 | BETA-P0-LEGAL-001A | Minimum beta privacy notice draft | YES — READY FOR CODEX | No | Content-only. Static page. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-LEGAL-001A/ |
| C9 | BETA-P0-OPS-001B | Feedback intake tracker | YES — READY FOR CODEX | No | .ai/ log setup. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-OPS-001B/ |
| C10 | BETA-P0-REL-001 | Error boundaries + 404/500 + mobile guard | YES — READY FOR CODEX | No | Standalone UI resilience. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-REL-001/ |

## Phase 3: Codex Tasks (after staging exists)

| Order | Goal ID | Task | Can Codex start now? | Requires external setup? | Why now | Evidence path |
|---|---|---|---|---|---|---|
| S1 | BETA-P0-SEC-001A | RLS test harness foundation | No — needs staging | Yes — staging Supabase | Build harness against staging. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001A/ |
| S2 | BETA-P0-SEC-001B | Core hierarchy RLS denial tests | No — needs staging | Yes — staging Supabase | First batch of real RLS tests. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-001B/ |
| S3 | BETA-P0-SEC-002A | Storage test harness foundation | No — needs staging | Yes — staging Supabase | Build storage test harness. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002A/ |
| S4 | BETA-P0-SEC-002B | component-images public-read/upload-denial tests | No — needs staging | Yes — staging Supabase | Storage bucket scoping. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-002B/ |
| S5 | BETA-P0-SEC-003B | API auth tests for AI routes | No — needs staging | Yes — staging Supabase | Auth audit against real routes. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-SEC-003B/ |
| S6 | BETA-P0-OBS-001B | Sentry client/server SDK integration | No — needs DSN | Yes — Sentry DSN | SDK integration after DSN provisioned. | .ai/09_archive/store/YYYY-MM-DD-BETA-P0-OBS-001B/ |

## Quick Start

1. Philip completes Phase 1 (H1-H3)
2. Codex starts Phase 2 (C1-C10) — these can run without staging
3. After staging exists, Codex starts Phase 3 (S1-S6)

## Rules
- Execute in order within each phase
- Do not skip Phase 1
- Do not run Phase 3 tasks before Phase 1 is complete
- All Phase 2 tasks are independent — they can run in parallel (but Codex should still do one at a time)
