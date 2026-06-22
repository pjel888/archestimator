# Evidence — Repository Inventory

Snapshot at HEAD `2f28daf147ac` (branch `main`), 2026-06-14.

## Counts (measured)

| Area | Count | Source |
|---|---|---|
| `src/app` files | 81 | `find src/app -type f` |
| Route-convention files (page/route/layout/loading/error) | 73 | `find ... -name page.tsx ...` |
| `src/components`+`src/features`+`src/hooks`+`src/lib`+`src/stores` files | 409 | `find` |
| `tests`+`e2e`+`scripts`+`supabase` files | 472 | `find` |
| Supabase migration files | 91 | `ls supabase/migrations` (README says 67 — STALE, see CLEAN-F33) |
| Vitest test files (`tests/vitest`) | ~296 files in run / ~240 `.test.*` | `bun run test:dom` reported 296 files |
| Bun unit test files (`tests/unit`) | 3 | run reported 3 files (README says 2 — STALE) |
| E2E specs (`e2e`) | 18 `.spec.ts` | lane 6 (README says 7 — STALE) |
| Custom hooks (`src/hooks`) | 11 | lane 2 (README says 8 — STALE) |
| `public/` total size | ~20 MB | lane 7 |
| DB tables (from migration SQL) | 54 | lane 4 |
| DB RPC/functions | ~110 live | lane 4 |
| RLS policies | ~145 | lane 4 |
| Indexes | 115 | lane 4 |
| Triggers | 35 | lane 4 |
| Storage buckets | 3 (`component-images` public, `component-attachments` private, `project-images` private) | lane 4 |
| Enums | 13 | lane 4 |

## Toolchain

- Runtime/PM: Bun 1.3.14; Node 26.0.0 (dev only)
- Framework: Next.js 16.2.6 (App Router/RSC), React 19.2.6
- DB: Supabase/Postgres 17, project `ebxxqidacheyapmmzavr` (standing pre-launch DB authorization per AGENTS.md)
- State: TanStack Query 5, Zustand 5
- Styling: Tailwind v4 (CSS-first, no `tailwind.config.ts`)
- Charts: imports `d3-shape` (package.json lists umbrella `d3` — see CLEAN-F21)
- Patch: `@firecms/neat@0.8.0` (adds `paused` for WebGL pause/resume — actively used by `NeatWireframeBackground`)

## Top-level route map (from `src/app`)

Public: `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/login`, `/beta/access-required`, `/auth/callback`, `/invite/[token]` (+accept/continue/sign-out), `/share/[token]`.
Authenticated `/workshop`: `page`, `onboarding`(redirect), `pending-invite`, `components`(redirect→library), `templates`(redirect→library/templates), `feedback`, `terms`, `settings`(+profile/workspace/beta-users/feedback), `projects`(+`[projectId]` dashboard/charts/estimates/`[nodeId]`), `library`(+components/templates/`[templateId]`).
API: `/api/health`, `/api/ai/ask`, `/api/ai/package-builder`, `/api/component-library/{images,attachments}`, `/api/projects/images`, `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`, `/api/share/[token]` (+session/password/activity/comment/decision/events/unsubscribe), `/api/webhooks/resend`.

## Static-gate snapshot

| Gate | Result |
|---|---|
| `type-check` | PASS |
| `build` | PASS |
| `test` (unit) | PASS (9) |
| `lint` | FAIL — 65 errors / 409 warnings (mostly test-file `no-unused-expressions`/`no-explicit-any`) |
| `lint:design-system` | FAIL — `ProposalExportPreviewDialog.tsx` font-size + `rounded-full` |
| `test:dom` | FAIL — 2/2200 (`estimate-sheet-version-control-ui`, `proposal-export-preview`) |

These pre-existing failures are baseline context for cleanup, not blockers (see Risk Register).
