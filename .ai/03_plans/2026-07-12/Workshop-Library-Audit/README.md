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
| `04-VARIANT-AND-COMPONENT-FLOW.md` | deep-dive | Component create/edit + variant/cost-entry/image/attachment round-trip + the attachment-persistence defect |
| `05-UX-UI-DESIGN-ANALYSIS.md` | deep-dive | Layout, state coverage, interaction patterns, a11y, responsive, design-system, perceived-perf, the Overview skeleton/empty-body problem |
| `06-TEMPLATES-SURFACE.md` | deep-dive | Templates browse + editor + insert-into-estimate + the stale-link blindness defect |

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
| Audit status | COMPLETE (v2 — improved) | Full surface mapped; every claim has file:line evidence. v2 added 3 deep-dives (variants, UX/UI, templates), resolved DATA-DRIFT-01, and found 3 new headline bugs the first pass missed. |
| Bugs found | 34 | **5 P1**, 13 P2, 16 P3 — see `02-BUG-AND-RISK-REGISTER.md` |
| Highest-severity open bugs | **(1)** direct-upload authz gap (viewers can upload) `attachments/direct-upload/route.ts:486-488,499-501`; **(2)** non-atomic upload record writes strand R2 orphans `upload-records.ts:90-216`; **(3)** variant attachments never persisted (write-and-display-once; orphan in R2) `actions.ts:1012-1180`; **(4)** in-estimate component edit mutates local state only, never the library `EstimateSheetContent.tsx:1740-1765`; **(5)** template insert stale-link blindness — archived-component hard-block unreachable `repository.ts:988, 952-995` | All 5 P1 |
| Dead code items | 12 | `02` §Dead code |
| First-user readiness | **NOT READY** | Upgraded from CONDITIONAL after v2 found that the two core value streams (component create with attachments, template insert with stale-link gating) have silent data-loss/correctness defects. Browse/search/edit flows themselves are solid and well-authz'd. |

### What v2 changed (improvement provenance)

- **Resolved** the first-pass DATA-DRIFT-01 open question: variant fields DO
  round-trip through `metadata_json` (write via `priceOptionSnapshot`
  `actions.ts:909`, read via `normalizePriceOption` `repository.ts:580-632`). The
  type is a tolerant read model, not a missing-column bug. Documented in
  `04` §3.
- **Downgraded** first-pass BUG-P2-01 (`useTemplateEditor.run` race): re-analysis
  in `06` confirms the `previous` capture inside the state updater is the
  canonical React-18-safe pattern; not broken.
- **Found 3 new headline defects** the first pass missed: BUG-VA-01 (attachments
  never persist), BUG-VA-02 (in-estimate edit is local-only), BUG-TM-01 (template
  stale-link blindness) — all elevated to P1.
- **Added** the Overview skeleton/reality divergence as a P1 UX finding (`05` §8).

## One-line architecture (detail in `01-CURRENT-STATE-MAP.md`)

```
/workshop/library (layout: WorkshopRouteHeader + tabs)
├─ Overview tab      LibraryOverview (intentionally cleared) + LibraryOverviewSearch (⌘K combobox)
├─ Components tab    LibraryComponentsRoute (RSC) → ComponentLibraryManager (~2900L client)
│                    └─ LibraryFolderTree + AddComponentModal + ComponentInspectorDock + EditComponentDrawer
│                    └─ virtualized table + catalogue grid; query-cache coherence callbacks
│                    └─ variants: AddComponentModal (create) is multi-variant; EditComponentDrawer (edit) is single-variant
└─ Templates tab     TemplatesBrowsePageClient (warm TanStack cache) → TemplatesBrowseManager (~1200L)
   └─ TemplateGallery + SelectedTemplatePreview + InsertIntoEstimatePicker
   └─ /templates/[id] TemplateEditorClient (sheet + structure tree + right sidebar)

Data:
  Reads  component-library-repository.ts (workspace-scoped SELECT *, bounded vs workspace-wide paths)
  Writes component-library/actions.ts + template-editor-actions.ts (server actions, isWorkspaceEditorInD1)
  Uploads /api/component-library/{attachments,attachments/direct-upload,images,attachments/scan-override}
          → R2 (component-attachments / component-images buckets) + D1 upload_sessions/assets/events
          → UPLOAD_JOBS_QUEUE (cron) → scan → /api/internal/upload-scan

Critical round-trip contract (resolved in 04 §3):
  variant fields (sku, dims, mass, image path, etc.) persist INTO metadata_json (priceOptionSnapshot)
  and read BACK OUT of metadata_json (normalizePriceOption) — NOT as D1 columns.
```

## Resume pointer

- **Start here for bugs:** `02-BUG-AND-RISK-REGISTER.md` — sorted by severity.
- **Start here for architecture:** `01-CURRENT-STATE-MAP.md`.
- **Start here for the component/variant value stream:** `04-VARIANT-AND-COMPONENT-FLOW.md`.
- **Start here for UX/UI/design:** `05-UX-UI-DESIGN-ANALYSIS.md`.
- **Start here for templates/insert:** `06-TEMPLATES-SURFACE.md`.
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
