# Workshop Library Page Audit (2026-07-12)

> **Audit / readiness digest. Not an implementation plan.**
> Profile: `high-blast-radius` (cross-cutting audit: UI/UX, data, server actions,
> authz, performance, Cloudflare/Workers/D1/R2/Images/Queue). This is a
> **read-only audit** of `/workshop/library` and everything it touches. No code,
> migrations, config, or provider state was changed to produce this pack.

## Outcome (what this pack delivers)

A comprehensive, evidence-grounded audit of the `/workshop/library` surface that
**comprehends, memorizes, and analyzes everything about it** — UX/UI, data,
server, authz, performance, Cloudflare code, and bugs — so any future agent or
the owner can act on it without rediscovery:

1. **Maps every moving part** — the three library tabs (Overview, Components,
   Templates), their route/server/client boundaries, component trees, the
   repository + server-actions write layer, the four API upload routes, the
   D1/R2/Images/Queue pipeline, and the Cloudflare bindings.
2. **Classifies the surface against current source** — what is live, what is
   legacy-but-live, what is dead/duplicate, what is outdated (stale RLS/Postgres
   comments, empty taxonomy table), and what drifted from the schema.
3. **Registers concrete bugs and risks** with severity and file:line evidence —
   an authz gap, non-atomic write sequences, orphan-prone upload records, render-
   phase setState patterns, perf anti-patterns, and dead code.
4. **States readiness** for first users honestly and prioritizes the work.

This is a planning artifact only. Per the **User Test Authorization Gate**, no
tests/builds/browser automation were run or authorized for this task. All
evidence is source inspection (`rg`, targeted reads) and migration/schema
cross-reference.

## Canonical artifacts in this pack

| Artifact | Role | Purpose |
|---|---|---|
| `README.md` (this file) | entrypoint | Outcome, scope, status, resume pointer |
| `01-CURRENT-STATE-MAP.md` | audit | Full route/client/data/server/authz/perf/cloudflare map with file:line refs |
| `02-BUG-AND-RISK-REGISTER.md` | audit | Every defect/risk found, severity, evidence, recommended surface |
| `03-READINESS-AND-RECOMMENDATIONS.md` | audit | First-user readiness verdict + prioritized recommendations |

No `plan-pack.json` manifest is emitted because this is an **audit-only** pack
(no implementation units, gates, or status tuple to enforce). Emitting a
manifest would imply an executable plan, which this is not. If the owner wants
these findings turned into an executable plan, a dated implementation pack is
the canonical next step (see `03` §"Turning this into implementation work").

## Scope

### In scope

- `/workshop/library` routes: `src/app/workshop/library/**` (layout + 3 tab pages
  + template-editor sub-route), each with `loading.tsx` / `error.tsx`.
- Client UI: `src/components/workshop/library/**` (overview, components route,
  templates browse, template editor, facet filter, source-trust, surface theming).
- Older-but-live library module: `src/components/workshop/component-library/**`
  (EstimateRightSidebar, helpers, tree) — consumed by the template editor +
  browse managers.
- Components surface: `src/components/workshop/component-library-manager/**`
  (folder tree, add/edit modal, the main manager).
- API upload layer: `src/app/api/component-library/**` (attachments,
  direct-upload, scan-override, images).
- Write layer: `src/lib/component-library/**` (actions, template-editor-actions).
- Read layer: `src/lib/repositories/component-library-repository.ts`.
- Upload pipeline: `src/lib/uploads/**`, `src/lib/cloudflare/upload-job-queue.ts`.
- D1 schema: `migrations/0010, 0011, 0022, 0023, 0024, 0026, 0028, 0036, 0037,
  0038` and the legacy `supabase/migrations` variant file.
- Cloudflare bindings: D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, Images `IMAGES`, Queue
  `UPLOAD_JOBS_QUEUE`.

### Non-goals

- Implementing any fix. This is audit-only.
- The estimate sheet itself (only the EstimateRightSidebar overlap is noted).
- Running tests, builds, browser automation, or provider audits (User Test
  Authorization Gate — not requested).
- Mutating D1, R2, Git, or any provider.

## Status snapshot (2026-07-12)

| Field | Value | Notes |
|---|---|---|
| Audit status | COMPLETE | Full surface mapped; every claim has file:line evidence |
| Bugs found | 23 | 2 P1, 10 P2, 11 P3 — see `02-BUG-AND-RISK-REGISTER.md` |
| Highest-severity open bug | **direct-upload authz gap** (viewers can upload) `attachments/direct-upload/route.ts:486-488,499-501` + **non-atomic upload record writes strand R2 orphans** `upload-records.ts:90-216` | Both P1 |
| Dead code items | 11 | `02` §Dead code |
| First-user readiness | **CONDITIONAL** | Common browse/search/edit flows work and are well-authz'd on the main paths; the upload pipeline has an authz gap and non-atomic write paths that will leak R2 orphans and can strand sessions under failure. |

## One-line architecture (detail in `01-CURRENT-STATE-MAP.md`)

```
/workshop/library (layout: WorkshopRouteHeader + tabs)
├─ Overview tab      LibraryOverview (intentionally cleared) + LibraryOverviewSearch (⌘K combobox)
├─ Components tab    LibraryComponentsRoute (RSC) → ComponentLibraryManager (~2900L client)
│                    └─ LibraryFolderTree + AddComponentModal + ComponentInspectorDock + EditComponentDrawer
│                    └─ virtualized table + catalogue grid; query-cache coherence callbacks
└─ Templates tab     TemplatesBrowsePageClient (warm TanStack cache) → TemplatesBrowseManager (~1200L)
   └─ TemplateGallery + SelectedTemplatePreview + InsertIntoEstimatePicker
   └─ /templates/[id] TemplateEditorClient (sheet + structure tree + right sidebar)

Data:
  Reads  component-library-repository.ts (workspace-scoped SELECT *, bounded vs workspace-wide paths)
  Writes component-library/actions.ts + template-editor-actions.ts (server actions, isWorkspaceEditorInD1)
  Uploads /api/component-library/{attachments,attachments/direct-upload,images,attachments/scan-override}
          → R2 (component-attachments / component-images buckets) + D1 upload_sessions/assets/events
          → UPLOAD_JOBS_QUEUE (cron) → scan → /api/internal/upload-scan
```

## Resume pointer

- **Start here for bugs:** `02-BUG-AND-RISK-REGISTER.md` — sorted by severity.
- **Start here for architecture:** `01-CURRENT-STATE-MAP.md`.
- **Start here for "what do we do about it":** `03-READINESS-AND-RECOMMENDATIONS.md`.

## Provenance

- Audit performed: 2026-07-12.
- Method: parallel read-only codebase exploration (3 lanes: UI components, API +
  repository, DB schema/migrations) + lead direct source reads to verify the
  highest-impact claims; `.ai` doc + migration cross-reference.
- Baseline HEAD: confirm with `git rev-parse HEAD` before any fix work.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). Where a bug warrants a test, `02` records a `TEST_PROPOSAL` and waits
  for explicit owner authorization.
