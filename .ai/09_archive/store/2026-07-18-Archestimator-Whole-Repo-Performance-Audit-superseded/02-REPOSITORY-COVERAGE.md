# 02 — Repository Coverage

**Inventory artifact**: `artifacts/repository-file-inventory.csv` (12,621 tracked files, all classified).

## Coverage philosophy

A "whole repo" audit does not require reading every archived evidence file word-for-word. It requires that **every tracked file be accounted for** (no unclassified file), that **every material runtime surface be inspected**, and that **historical archives be selectively consulted only when they affect a current claim**. That bar is met here.

## Category summary

| Category | Files | Audited depth | Notes |
|---|---:|---|---|
| archived-evidence | 8,043 | classified only | `.ai/09_archive/store/**` — historical; consulted selectively |
| active-product-doc | 1,342 | shallow | `.ai/00_system/`, `.ai/01_roadmap/`, `.ai/03_plans/`, `.ai/10_state/`, README, AGENTS, DESIGN |
| test-benchmark-ci | 990 | shallow | `tests/`, `e2e/`, `.github/` — characterization only |
| agent-config-tooling | 519 | excluded | `.cursor/`, `.agents/`, `.codex/`, `.commandcode/`, `.vibe/`, `.claude/` — not runtime |
| react-next-server-runtime | 562 | **deep** | `src/app/**` (168 routes), `src/lib/**` server surfaces |
| browser-client-runtime | 386 | **deep** | `src/components/**`, `src/features/**`, `src/hooks/`, `src/stores/` |
| static-asset | 291 | excluded | images/fonts under `public/` |
| tooling-or-ci | 153 | medium | `scripts/` (126 files; 66 are Cloudflare release-gate proof generators per existing audit) |
| d1-schema | 84 | **deep** | `migrations/*.sql` (0056–0092 current span) |
| d1-query-mutation | 78 | **deep** | `src/lib/**/*repository*.ts`, `*.sql.ts`, `*intent*.ts` |
| api-server-action | 59 | **deep** | `src/app/api/**/route.ts` |
| generated-artifact | 54 | excluded | `.next/`, `.open-next/`, tsbuildinfo, lockfile |
| build-config-dep | 21 | **deep** | `wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`, `tsconfig.json`, `package.json`, etc. |
| worker-do-queue | 15 | **deep** | `src/lib/cloudflare/**`, `worker.ts`, DO classes |
| upload-r2-image-export | 7 | **deep** | `src/lib/uploads/`, `src/lib/proposal-export/` |
| auth-security | 5 | **deep** | `src/lib/auth/`, `src/lib/security/` |
| observability | 2 | **deep** | `src/instrumentation*.ts`, `src/lib/observability/` |
| worker-request-path | 1 | **deep** | `worker.ts` |
| excluded/uncategorized | 9 | — | stray empty file `=`, `.playwright-mcp/` local logs |
| **TOTAL** | **12,621** | | |

## Executable surface map (subset — full map in `03-RUNTIME-AND-DATAFLOW-MAP.md`)

### App Router
- 69 `page.tsx`, 59 `route.ts`, 5 `layout.tsx`, 18 `loading.tsx`, 15 `error.tsx`.
- 322 files with `"use client"`; 114 files with `"server-only"`; 54 files with `"use server"` directives.

### Migrations
- 84 SQL migrations (0056–0092 active span; some squashed slots before 0083 per existing audit notes).
- Migration 0092 (linked estimate template instances) is the newest and introduces 5 tables, 8 indexes — audited in depth (K-10).

### Workers / Cloudflare
- Worker `archestimator-proof` (`wrangler.jsonc`).
- 3 DOs (`CollaborationRoom`, `GlobalPresence`, `SupportInbox`).
- 2 Queues (`UPLOAD_JOBS_QUEUE`, `CLIENT_PORTAL_NOTIFICATIONS_QUEUE`).
- 4 Crons (`*/5 * * * *`, `0 3 * * *`, `15 3 * * *`, `30 3 * * *`).
- 1 R2 (`ARCH_UPLOADS_R2`), 1 D1 (`ARCH_DB`), 1 Images (`IMAGES`), 1 Email (`EMAIL`).

### D1 access layer
- `src/lib/estimates/d1-intents/{rows,nodes,tabs,templates,history-events,bulk-sheets}.ts` — primary mutation layer.
- `src/lib/estimates/estimate-tree-read-repository.ts`, `src/lib/repositories/workspace-repository.ts` (3,713 lines) — primary read layer.
- `src/lib/cloudflare/template-propagation-d1.ts`, `template-intent-recovery-d1.ts` — new linked-template surface.
- `src/lib/security/durable-rate-limit-d1.ts` — durable rate limit infrastructure.

## Files intentionally not modified
- All of `supabase/migrations/` (provider-exit archaeology; AGENTS.md forbids mutation).
- `.ai/09_archive/` (historical only).
- All `.cursor/`, `.agents/`, `.codex/`, `.commandcode/`, `.vibe/` tooling (not runtime).

## Coverage closure
- Every tracked file is classified. ✓
- Every material runtime surface is mapped. ✓
- Every claimed finding has a `file_path:line` source reference. ✓
- No file was modified outside `.ai/03_plans/2026-07-18-Archestimator-Whole-Repo-Performance-Audit/`. ✓
