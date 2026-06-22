# Evidence — Command Log

All commands run from working directory `/Users/philiplewis/Documents/archestimator` on 2026-06-14 (UTC) during the cleanup intelligence pass. Secrets redacted; no provider/DB mutation performed. This is an **audit** — no source files, migrations, dependencies, or provider settings were changed.

| # | Timestamp (approx, UTC) | Command | Result | Summary | Artifact | Blocking? |
|---|---|---|---|---|---|---|
| 1 | 2026-06-14T07:49Z | `git status --short && git branch --show-current && git rev-parse HEAD` | success | branch `main`, HEAD `2f28daf147ac`, only untracked file is `.ai/08_prompts/cleanup-prompt.md` | inline | non-blocking |
| 2 | 2026-06-14T07:49Z | `bun --version` / `node --version` | success | bun `1.3.14`, node `v26.0.0` | inline | non-blocking |
| 3 | 2026-06-14T07:49Z | `find src/app -type f` | success | 81 files under `src/app` | `evidence/src-app-files.txt` | non-blocking |
| 4 | 2026-06-14T07:49Z | `find src/components src/features src/hooks src/lib src/stores -type f` | success | 409 source files | `evidence/src-code-files.txt` | non-blocking |
| 5 | 2026-06-14T07:49Z | `find tests e2e scripts supabase -type f` | success | 472 test/script/db files | `evidence/test-script-db-files.txt` | non-blocking |
| 6 | 2026-06-14T07:49Z | `find src/app -type f \( -name page.tsx -o -name route.ts -o -name layout.tsx -o -name loading.tsx -o -name error.tsx \)` | success | 73 route convention files | `evidence/route-files.txt` | non-blocking |
| 7 | 2026-06-14T07:50Z | `bun run type-check` (`tsc --noEmit`) | **PASS** (exit 0) | no type errors | `evidence/gates/type-check.log` | non-blocking |
| 8 | 2026-06-14T07:50Z | `bun run lint` (eslint) | **FAIL** (exit 1) | 474 problems: 65 errors, 409 warnings; concentrated in test files and AI/types modules | `evidence/gates/lint.log` | non-blocking (pre-existing) |
| 9 | 2026-06-14T07:50Z | `bun run lint:design-system` | **FAIL** (exit 1) | `ProposalExportPreviewDialog.tsx` font-size + `rounded-full` violations | `evidence/gates/lint-design-system.log` | non-blocking (pre-existing) |
| 10 | 2026-06-14T07:50Z | `bun run test` (bun unit) | **PASS** (exit 0) | 9 tests across 3 files, 120 expect() calls | `evidence/gates/test-unit.log` | non-blocking |
| 11 | 2026-06-14T07:50Z | `bun run test:dom` (vitest) | **FAIL** (exit 1) | 2 failed / 2190 passed / 3 skipped / 5 todo (296 files) | `evidence/gates/test-dom.log` | non-blocking (pre-existing) |
| 12 | 2026-06-14T07:50Z | `bun run build` (next build) | **PASS** (exit 0) | production build succeeded | `evidence/gates/build.log` | non-blocking |
| 13 | 2026-06-14T08:0xZ | `bunx knip --no-progress` (ephemeral) | success | unused deps: `class-variance-authority`, `d3`, `three`; unused devDeps: `@types/d3`, `@types/three`; unlisted: `d3-shape` | summarized in `dependency-analysis.md` | non-blocking |
| 14 | 2026-06-14T08:0xZ | `bunx depcheck` (ephemeral) | success | unused: cva, d3, three (+ Storybook/tailwind false positives); missing: `d3-shape`, `server-only` | summarized in `dependency-analysis.md` | non-blocking |
| 15 | 2026-06-14T08:0xZ | `bunx madge src --extensions ts,tsx --warning --circular` (ephemeral) | success | **No circular dependencies**; 286 files skipped (`@/*` alias resolution — expected) | summarized in `dependency-analysis.md` | non-blocking |
| 16 | 2026-06-14T08:0xZ | text-marker + import + env/flag scans via `rg` across `src tests e2e scripts` | success | feeds `import-reference-index.md`, `feature-flag-inventory.md` | distributed across lane reports | non-blocking |

## Reference-analysis method (8 parallel read-only research lanes)

Eight scoped read-only sub-audits were run concurrently, each using `rg`/`find`/file reads only (no edits, no DB, no provider calls). Each candidate was checked against the reference classes in `import-reference-index.md`. Lanes:

1. Routes & API endpoints (`src/app/**`)
2. Components / hooks / stores / lib-ui (`src/components`, `src/hooks`, `src/stores`)
3. Server actions / repositories / domain (`src/lib/**`)
4. Database schema / migrations / RPCs / RLS / types (`supabase/migrations`, `scripts/sql`, `database.types.ts`)
5. Dependencies / scripts / patches / build (`package.json`, `patches/`, `scripts/`, config)
6. Tests / Storybook / E2E / prove scripts (`tests/`, `e2e/`, `stories/`)
7. Assets / env / flags / config (`public/`, `globals.css`, env reads)
8. Docs / `.ai` plans / watchlist remnants

## Commands NOT run (blocked / deliberately skipped — audit posture)

| Command | Why skipped | Status |
|---|---|---|
| `bun run test:e2e` / `test:e2e:perf` | Needs running dev server + Supabase local stack + auth session; many specs env-flag-gated | BLOCKED (not attempted) |
| `bun run storybook:validate` | Heavy; builds static Storybook; not required for static cleanup audit | NOT RUN (governance gate exists) |
| `bun run prove:*` (5 RLS/migration proofs) | Spins up ephemeral Postgres; reserved for the migration phases that actually touch DB | NOT RUN (run during P4/P5) |
| `bun run launch:*` (hosted readiness) | Requires live Vercel/Supabase access; would touch providers | NOT RUN (audit posture) |
| `supabase status` / linked DB inventory | No local Supabase started; hosted DB is read-only-only and out of audit scope | BLOCKED — DB object inventory derived statically from migration SQL + code references |

> Existing failures (lint, lint:design-system, 2 dom tests) are **cleanup context**, not audit invalidation. They are recorded honestly in `16_RISK_REGISTER_AND_BLAST_RADIUS.md` and `14_TESTING_AND_VALIDATION_PROTOCOL.md`.
