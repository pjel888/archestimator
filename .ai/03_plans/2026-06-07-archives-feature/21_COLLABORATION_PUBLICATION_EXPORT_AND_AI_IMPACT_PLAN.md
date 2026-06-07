# Collaboration, Publication, Export, and AI Impact Plan

**Date:** 2026-06-07
**Plan:** `.ai/03_plans/2026-06-07-archives-feature/`

## Per-Entity Effects Matrix

| Feature | Projects (P1) | Estimate Sheets (P2) | Components (P3) | Templates (P4) |
|---------|--------------|---------------------|-----------------|----------------|
| **Project members** | Archived projects hidden from shared lists | N/A | N/A | N/A |
| **Estimate sheet members** | N/A | Cannot access archived sheets | N/A | N/A |
| **Pending invites** | Preserved; acceptance blocked | N/A | N/A | N/A |
| **Shared links** | Paused; show "Project Archived" | Excluded from new snapshots; existing preserved | N/A (components use lifecycle_state; no separate shared-link publication for individual components) | N/A |
| **Publication snapshots** | Existing preserved; new blocked | Excluded from new snapshots | N/A | N/A |
| **Comments/decisions** | Preserved; read-only during archive | Preserved | N/A | N/A |
| **Proposal export** | N/A (project-level; export blocked for archived projects) | Reject archived sheet export | N/A | N/A |
| **Project charts** | N/A (blocked for archived projects) | Exclude archived sheets from aggregation | N/A | N/A |
| **AI Ask/read context** | Exclude archived project data | Exclude archived sheet data | Already excludes archived (existing) | Exclude archived templates from AI search |
| **AI package builder** | Reject operations on archived projects | Reject operations on archived sheets | Already rejects archived (existing) | Exclude archived templates from AI template search (code queries `estimate_templates` in `src/lib/ai/package-builder/read-tools.ts`) |
| **Activity history** | Preserved; visible on restore | Preserved; visible on restore | N/A | N/A |
| **Favorites** | Hide; re-appear on restore | Hide; re-appear on restore | N/A | N/A |
| **Template insertion** | N/A | Blocked for archived sheets | N/A | N/A |

## Implementation Notes

### AI Read Context
Existing code in `src/lib/ai/read-context.ts` already excludes `lifecycle_state = 'archived'` for components. Extend same pattern to:
- Projects: exclude if `archived_at IS NOT NULL`
- Estimate sheets: exclude if `archived_at IS NOT NULL`

### AI Package Builder
Existing code in `src/lib/ai/package-builder/apply.ts` and `read-tools.ts` already rejects archived/discontinued components. Extend same pattern to reject operations on archived projects and estimate sheets.

### Proposal Export
`src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — check estimate `archived_at` before building workbook. Return appropriate response if archived.

### Project Charts
`src/lib/project-charts/` — filter estimates by `archived_at IS NULL` before aggregation.

### Publication
- `src/lib/publication/public-repository.ts` — check project `archived_at` when resolving publication tokens. Return "project archived" state.
- When creating new snapshots from estimate data, exclude archived estimate sheets.

### Collaboration
- `src/lib/collaboration/actions.ts` — `assertProjectAccessManager` / `assertEstimateAccessManager` should check archive state when relevant.
- `src/app/invite/[token]/page.tsx` — block invite resolution if parent project is archived.
- `src/lib/collaboration/pending-invite-actions.ts` — `acceptPendingInvitationById` should reject if project archived.
