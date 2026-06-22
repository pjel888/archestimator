# Open Decisions And Risk Register

## Decisions And Remaining Risks

### D1 - Final Tab Label

Recommendation: `Library`, `Project`, `Templates`.

Alternative: `Components`, `Project`, `Templates`.

Why recommendation wins: Project entries are also components. `Library` names the ownership/reuse scope and matches the existing row label `Library Component`.

Default: use `Library`.

Status: product-confirmed direction is ownership/scope, not a new component type. `Library`, `Project`, `Templates` remains the implementation default.

### D2 - Project Tab Inclusion

Recommendation: show only rows carrying the current project projection contract:

- express/inline-authored
- detached/project-specific

Do not show:

- clean linked library rows
- copied used rows
- source-less manual rows without projection metadata
- legacy blank placeholders

Default: strict projection only.

Status: implementation default.

### D3 - Source-Less Manual Rows

Problem: row details currently label manual/source-less rows as `Project Component`, but projection code does not include all source-less manual rows in the project component library.

Recommendation: keep them out of the Project tab v1 unless they have explicit projection metadata. This avoids turning the tab into "all project rows."

Default: exclude.

Status: still the one meaningful product edge case. Do not block v1 on it; keep the Project tab strict.

### D4 - Project Tab Actions

Recommendation: Project tab supports add/drag/preview, but not folder management or delete in v1.

Default: no destructive sidebar actions for Project rows.

### D5 - Templates Copy

Recommendation: rename Templates `Project sources` to `From projects` or `Project-derived sources`.

Default: `From projects`.

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Duplicate project rows in Library and Project | High | Split arrays before tree building; add DOM/helper tests. |
| Project rows leak through supplier/brand/custom Library modes | High | Filter tab item arrays before calling all tree builders. |
| Users read Project as "all components used in this project" | Medium | Empty/helper copy says project-owned; linked library rows stay in Library. |
| Templates project sources get confused with Project tab | Medium | Rename Templates copy and keep behavior separate. |
| Project tab inherits unsafe delete/edit controls | High | Suppress destructive actions in Project v1. |
| Cache stale after detach/promote/express insert | Medium | Preserve invalidation and add integration tests. |
| Scope expands into `/workshop/library` redesign | Medium | Keep plan scoped to Estimate Sheet right sidebar only. |
| Visual polish becomes a blocker before code is correct | Low | Reuse existing sidebar components; defer browser proof to implementation-only browser claims. |

## Strong Product Opinion

The Project tab is the right move, but it should be framed as a scope/ownership tab, not a new object category. That lets the UI be honest: project components are components, but they are not library components.
