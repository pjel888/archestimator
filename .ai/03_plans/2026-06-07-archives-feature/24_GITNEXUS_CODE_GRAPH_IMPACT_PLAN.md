# GitNexus / Code-Review-Graph Impact Plan

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Tools Available

- **GitNexus:** Indexed as `archestimator` (~13,457 symbols, ~24,277 relationships, 300 execution flows). Use `gitnexus_impact` before editing any symbol.
- **Code-Review-Graph:** Available. Use `get_impact_radius`, `detect_changes`, `query_graph` for structural context.

## Impacted Symbols by Phase

### Phase 1 — Projects (HIGH RISK)
| Symbol | Module | Risk | Impact |
|--------|--------|------|--------|
| `listCurrentWorkspaceProjects` | `workspace-repository.ts` | HIGH | All project list consumers |
| `getWorkshopHomebaseData` | `workspace-repository.ts` | HIGH | Homebase + favorites |
| `getCurrentWorkspaceProject` | `workspace-repository.ts` | HIGH | Project dashboard, estimates, charts |
| `previewBulkDeleteProjects` | `projects/actions.ts` | LOW | New actions, no modification |
| `ProjectsPageClient` | `projects-page-client.tsx` | MEDIUM | Tab structure change |
| `LiveProjectCard` | `LiveProjectCard.tsx` | MEDIUM | New archive action |
| `BulkActionToolbar` | `BulkActionToolbar.tsx` | MEDIUM | New archive action |
| `ProjectDetailsModal` | `ProjectDetailsModal.tsx` | LOW | New archive button |

### Phase 2 — Estimate Sheets (HIGH RISK)
| Symbol | Module | Risk | Impact |
|--------|--------|------|--------|
| `listProjectEstimates` | `workspace-repository.ts` | HIGH | Estimate list consumers |
| `ProjectEstimatesTable` | `ProjectEstimatesTable.tsx` | HIGH | Table UI, TanStack Query |
| `use-estimate-query` | `use-estimate-query.ts` | HIGH | Cache invalidation |
| `ProjectCharts` | `project-charts/` | MEDIUM | Aggregation change |
| `createProposalWorkbookBuffer` | `proposal-export/` | MEDIUM | Export exclusion |
| `AI read context` | `ai/read-context.ts` | MEDIUM | Data exclusion |

### Phase 3 — Components (MEDIUM RISK)
| Symbol | Module | Risk | Impact |
|--------|--------|------|--------|
| `ComponentLibraryManager` | `component-library-manager/` | MEDIUM | New archived view |
| `component-library-repository` | `repositories/` | LOW | Filter already exists |
| `component-library/actions.ts` | `component-library/` | LOW | New restore actions |
| AI package builder | `ai/package-builder/` | LOW | Already handles lifecycle_state |

### Phase 4 — Templates (LOW RISK)
| Symbol | Module | Risk | Impact |
|--------|--------|------|--------|
| `TemplateLibraryManager` | `component-library-manager/` | LOW | New filter + actions |
| Template insertion | `component-library/actions.ts` | LOW | Filter archived templates |

## Required Future Checks

Before ANY source edit:
1. `gitnexus_impact({ target: "symbolName", direction: "upstream" })` — report blast radius
2. Warn if HIGH or CRITICAL risk before proceeding
3. `code-review-graph detect_changes` before committing
4. `code-review-graph get_affected_flows` to find impacted execution paths

## Affected Execution Flows

- `project-browsing`: project list with tabs
- `estimate-editing`: estimate sheet editor
- `component-browsing`: library view
- `template-insertion`: inserting templates into estimates
- `shared-link-viewing`: publication receiver page
- `proposal-export`: XLSX workbook generation
- `chart-viewing`: project comparison charts
- `ai-ask`: read-only copilot queries
- `ai-package-builder`: AI-driven estimate creation
- `invite-acceptance`: collaboration invite entry
