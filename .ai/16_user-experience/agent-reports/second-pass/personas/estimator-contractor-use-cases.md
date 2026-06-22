# Persona/use-case second-pass: estimator, contractor, installer/field operator, PM, and business owner

Last updated: 2026-06-22

Scope: identify missed or underrepresented stories in current implementation/docs compared with `canonical-feature-status.csv`, focusing on estimating workflow, project dashboard, estimate sheet, proposal export, data/charts, collaboration, mobile/field constraints, and contractor handoff/logistics.

Source anchors used:
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/canonical-feature-status.csv`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/README.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/post-fix-scenario-tests.md`
- `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/testing-loop-and-validation.md`
- `src/app/workshop/projects/page.tsx`
- `src/components/workshop/projects-page-client.tsx`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/components/workshop/ProjectDashboardClient.tsx`
- `src/components/workshop/ProjectChromeAsync.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[estimateId]/page.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/*`
- `src/components/workshop/ProposalExportPreviewDialog.tsx`
- `src/components/workshop/EstimateHeaderActions.tsx`
- `src/lib/proposal-export/*`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`
- `src/app/workshop/projects/[projectId]/data/page.tsx`
- `src/components/workshop/project-data/ProjectDataClient.tsx`
- `src/lib/workshop/project-data-route-state.ts`
- `src/components/workshop/project-data/*`
- `src/components/workshop/ProjectTeamspaceHeader.tsx`
- `src/lib/collaboration/actions.ts`
- `src/hooks/use-project-collaboration-query.ts`
- `src/hooks/use-project-presence.ts`
- `src/app/share/[token]/page.tsx`
- `src/components/share/ShareContainer.tsx`
- `src/app/api/share/[token]/*`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-location-actions.test.ts`
- `.ai/16_user-experience/agent-reports/second-pass/route-feature-coverage-review.md`
- `.ai/16_user-experience/agent-reports/second-pass/ux-issue-completeness-review.md`
- `.ai/16_user-experience/agent-reports/second-pass/personas/client-recipient-use-cases.md`
- `.ai/16_user-experience/agent-reports/workshop-estimates-user-stories.md`
- `.ai/16_user-experience/agent-reports/publication-proposal-ai-user-stories.md`

## Coverage snapshot in canonical CSV (existing IDs)
- Estimating workflow: `EST-001` to `EST-009` cover sheet load, tree navigation, tabs, row and cost entry, reorder, insert, history, activity feed, proposal preview/download.
- Project-level management: `PROJECT-001` to `PROJECT-006` cover list, grouped views, create/search/lock/delete, project-level dashboard.
- Data/charts: `DATA-001` and `DATA-002` cover dashboard and chart fallback/compatibility.
- Collaboration: `COLLAB-001` to `COLLAB-003` cover teamspace activity/invites/membership.
- Publication/share: `SHARE-001` to `SHARE-006` cover tokenized/public/protected access and controls.

## Gaps and underrepresented persona stories

### Estimator
- Missing explicit “quick capture” story for rough/partial estimate updates (field notes + later enrichment).
- Existing sheet workflow is desktop-centric and does not explicitly support interrupted/offline entry on small devices.
  - Evidence: the mobile-oriented tests currently focus on share/receiver page behavior (`tests/vitest/project-publication-page.test.tsx`), while estimate sheet route and table controls are feature-complete but not covered under mobile/offline contexts.
- Missing dedicated story for multi-estimate mode handling in estimator flow (version branching + what-if scenarios before publication), despite version and revision metadata existing (`EST-008` exists but is activity-centric, not decision-branch oriented).
- Missing explicit handoff handover metadata step (e.g., “mark final package version + scope lock” before sending to installer/business owner).

### Contractor
- No direct contractor/operator path currently modeled in canonical list; collaboration and project roles exist but lack explicit contractor job role language.
  - Evidence: role model includes owner/admin/editor/viewer in `src/components/workshop/ProjectTeamspaceHeader.tsx` and collaboration actions, but no dedicated “contractor” workflow row.
- Missing contractor-focused estimate review/response cycle (acknowledge/reject scope items, provide feasibility notes, flag assumptions before acceptance).
- Missing explicit logistics artifact generation for contractor execution context (subcontractor package, material list, sequencing plan).
- `ProposalExportMetadata` still carries interim contractor fields (`contractorName` from workspace), indicating incomplete contractor object/model.
  - Evidence: `src/lib/proposal-export/types.ts` and metadata assembly in `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`.

### Installer / Field operator
- No canonical rows currently represent on-site/operator persona.
- Missing practical field-side features:
  - Printable/downloading a field-safe work package with trimmed, low-bandwidth layout.
  - Acknowledge receipt/acceptance in field, mark task readiness, and provide completion progress notes.
  - Offline-safe checklist access at point-of-service.
- Current tests for location actions and share comments indicate platform awareness of real-world contexts, but there is no explicit estimate/contractor handoff path to a field actor.
  - Evidence: `tests/vitest/project-location-actions.test.ts`, share tests focus on publication/comments.

### Project manager
- PM dashboard exists (`PROJECT-004`, `DATA-001`) but persona-level PM orchestration stories are narrow:
  - Missing explicit “pre-job readiness” and “handoff risk” views before proposal issuance.
  - Missing PM action list for sequencing estimate revisions to assignment and status across team members.
  - Missing explicit control for contractor/field feedback intake and closure actions inside project dashboard.
- Collaboration logs are present but not yet tied to operational approval workflow (who owns final version before publish).

### Business owner
- Current canonical coverage skews toward permission/control/share but misses owner operational governance stories.
- Missing explicit business-owner workflow around publication governance:
  - who can issue final packet, when package can be changed after sent, and delivery evidence retention for audit.
- Missing business-owner view for margin/profit/cost alerts from estimate history to dashboard beyond generic chart availability.
  - `DATA-001` and `DATA-002` provide charts, but no owner-specific alert/decision story in canonical IDs.
- Missing explicit “client-facing proposal package ownership handoff” story that includes owner signoff checkpoints.

## Recommended canonical feature-status additions

### New ID: `EST-010`
- Area: Estimating
- Persona: Estimator
- Story: “Create and update a draft estimate from mobile/low-bandwidth context with interruption and resume support, with offline-friendly draft buffering.”
- Why: estimate editing UX is implemented (table and actions), but mobile/field constraints are only validated for share pages, not estimator workflows.

### New ID: `EST-011`
- Area: Estimating
- Persona: Estimator + Contractor
- Story: “Branch estimate versions for alternatives (base / premium / reduced scope) and track intent-to-price differences before proposal publish.”
- Why: revision/versioning exists (`EST-008`) but not presented as an estimator decision workflow.

### New ID: `EST-012`
- Area: Proposal export
- Persona: Contractor / PM
- Story: “Generate a field execution package export (scope sheet + material/sequence summary + revision stamp + contractor identity) distinct from client proposal export.”
- Why: current `EST-009` and export API cover proposal workbook only; contractor handoff metadata is currently interim.

### New ID: `EST-013`
- Area: Estimating / Collaboration
- Persona: Contractor
- Story: “Contractor receives scoped estimate version, can annotate feasibility constraints and request clarifications inside the project context before approval.”
- Why: no explicit contractor commentary/clarification loop in canonical list.

### New ID: `FIELD-001`
- Area: Collaboration / Field operations
- Persona: Installer / Field operator
- Story: “Access a minimal field handoff package (read-optimized, printable/low-data, checklist-driven) and confirm receipt/completion status on-site.”
- Why: no installer/field persona represented anywhere in canonical set.

### New ID: `FIELD-002`
- Area: Collaboration / Workflow handoff
- Persona: Installer / Field operator
- Story: “Mark operational constraints (access, weather, stock, dependencies) during handoff and feed updates back to estimate/dashboard.”
- Why: contractor handoff/logistics is implied but lacks explicit field feedback path.

### New ID: `PM-001`
- Area: Project dashboard
- Persona: Project manager
- Story: “Run a pre-release readiness checklist on project dashboard (estimate lock, scope confirmation, version selected, attachment completeness) before sharing/export.”
- Why: dashboard exists, but readiness checks are not explicit user stories.

### New ID: `PM-002`
- Area: Project dashboard
- Persona: Project manager
- Story: “Track approval/acceptance status by actor (estimator, PM, contractor) and block or highlight proposal publish until required approvals are present.”
- Why: collaboration and activity exist, but explicit gatekeeping flow is missing.

### New ID: `OWNER-001`
- Area: Data/charts
- Persona: Business owner
- Story: “Receive approval-risk and margin alerts (scope creep, revision count, cost variance trend) in project dashboard before finalization.”
- Why: chart infrastructure exists, but owner decision-centric alerting is not present.

### New ID: `OWNER-002`
- Area: Publication/share
- Persona: Business owner
- Story: “Record and review final package dissemination lifecycle (issued, received, retracted, version replaced, acknowledgement state) in one audit-friendly timeline.”
- Why: share flow supports publish and tokens, but owner-specific audit/approval lifecycle is incomplete.

### New ID: `COLLAB-004`
- Area: Collaboration
- Persona: Contractor + Field operator
- Story: “Invite contractor/field actors into a project context with role-specific permissions and handoff-focused access views.”
- Why: collaboration roles exist but are generic and not role-specific to contractor logistics.

## Suggested canonical CSV row update style (example)
- Add `status` as `underrepresented` for stories above if the implementation is partially present.
- Add `owner` as `ux` or `product` with acceptance criteria notes (mobile behavior, handoff artifact contract, PM-ready checks, owner-level governance).

## Recommended CSV modifications (do not apply here)
- Keep `canonical-feature-status.csv` unchanged as requested.
- Add the new IDs under relevant area sections preserving current naming style and ordering.
- In `notes`, include explicit route/test evidence references from this report to justify each addition.
