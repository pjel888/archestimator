# Feature Inventory — Codebase ↔ Documentation Cross-Reference

**Last updated:** 2026-06-18
**Purpose:** Single source of truth mapping every implemented feature to its spec, plan, tests, and archive evidence.

## How to use

For any feature, this table tells you:
- **Code** — where the implementation lives
- **Spec** — the canonical feature specification
- **Plan** — the implementation plan (if separate from spec)
- **Tests** — test coverage
- **Archive** — completion evidence (if feature is complete)

---

## Status legend & claims discipline

This inventory uses the internal status buckets from `ARCHESTIMATOR_MASTER.md` §7.2 (v4.3, 2026-06-18):

| Status | Meaning |
|--------|---------|
| **Live** | Shipped and usable in the pre-launch MVP. |
| **Partial** | Shipped but incomplete or awaiting a policy decision. |
| **Planned (Next)** | Committed near-term roadmap. |
| **Later** | Roadmap, not committed to launch. |
| **Deferred (roadmap)** | Deliberately deferred from launch and from tiering. |

Public-facing materials must use the labels **Live / Partial / Planned / Dormant** (§15) and map this file's `Later` bucket to **Dormant** or **Not yet**. Public copy must avoid:

- "immutable issued record," "procurement system," "ERP," "only we make estimates reusable"
- AI as a current capability
- claims that planned features exist today

Exports are working documents, not legal documents, POs, or immutable records. The cost intelligence layer is marketed as direction; the live, compounding foundation is the proof. See `ARCHESTIMATOR_MASTER.md` §15 for the full claims-discipline table.


## Auth & Tenancy

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Login page (Google OAuth + email link) | Live | `src/app/login/page.tsx` | `supabase-auth-setup.md` | — | `auth-magic-link.test.ts`, `auth-entry-ui-contract.test.ts` | `2026-05-27-sign-up-login-authentication-local-implementation-evidence/` |
| Auth callback | Live | `src/app/auth/callback/route.ts` | `supabase-auth-setup.md` | — | `auth-callback-route.test.ts`, `auth-error-mapping.test.ts` | same |
| Safe redirect sanitizer | Live | `src/lib/auth/redirects.ts` | `supabase-auth-setup.md` | — | `auth-redirect-sanitizer.test.ts` | same |
| Route protection (proxy) | Live | `src/proxy.ts` | `supabase-auth-setup.md` | — | `auth-proxy.test.ts` | same |
| Dev auth bypass | Live | `src/lib/auth/dev-auth.ts`, `dev-auth-gate.ts` | `supabase-auth-setup.md` | — | — | same |
| Session management | Live | `src/lib/auth/session.ts` | `supabase-auth-setup.md` | — | `auth-sensitive-api-boundaries.test.ts` | same |
| Account data (profiles, workspaces) | Live | `src/lib/auth/account-*.ts` | `supabase-auth-setup.md` | — | `auth-account-data-*.test.ts` | same |
| Account security events | Live | `src/lib/auth/account-audit.ts` | `supabase-auth-setup.md` | — | — | same |
| Onboarding guard | Live | `src/app/workshop/onboarding/page.tsx` | `supabase-auth-setup.md` | — | `auth-onboarding-*.test.ts` | same |
| Settings (profile + workspace) | Live | `src/app/workshop/settings/` | `supabase-auth-setup.md` | — | `auth-settings-ui-contract.test.ts` | same |

## Project Management

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Project list/create | Live | `src/app/workshop/projects/page.tsx` | `live-project-estimate-bootstrap.md` | — | `project-dashboard-ui.test.ts`, `project-creation-ui.test.ts` | — |
| Project cards | Live | `src/components/workshop/ProjectCard.tsx`, `LiveProjectCard.tsx` | same | — | `projects-page-*.test.tsx` | — |
| Project detail/dashboard | Live | `src/app/workshop/projects/[projectId]/page.tsx` | same | — | — | — |
| Project creation form | Live | `src/components/workshop/NewProjectForm.tsx`, `NewProjectModal.tsx` | same | — | `project-creation-ui.test.ts` | — |
| Project image upload | Live | `src/app/api/projects/images/route.ts` | same | — | — | — |
| Project code generation | Live | `src/lib/projects/project-code.ts` | same | — | — | — |
| Project metadata/budget | Live | `src/lib/projects/actions.ts` | same | — | `estimate-sheet-project-budget-schema.test.ts` | — |
| Favorites (project + sheet) | Planned (Next) | `src/lib/workshop/actions.ts` | (roadmap) | — | `workshop-favorites-schema.test.ts` | — |

## Estimate Workspace

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Estimate list/create | Live | `src/app/workshop/projects/[projectId]/estimates/page.tsx` | `live-project-estimate-bootstrap.md` | — | `project-estimates-*.test.tsx` | — |
| Estimate workspace shell | Live | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `live-estimate-node-route.test.ts`, `estimate-bootstrap-ui.test.ts` | — |
| Estimate sheet content | Live | `src/components/workshop/EstimateSheetContent.tsx` | same | — | `estimate-sheet-*.test.tsx` | — |
| Estimate tree (navigation) | Live | `src/components/workshop/EstimateSheetTree.tsx` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-*.test.tsx` | `2026-05-29-estimate-tree-dnd-reorganization-complete/` |
| Tree DnD reorder | Live | `src/lib/estimates/estimate-tree-reorder.ts` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-reorder.test.ts`, `estimate-node-reorder-action.test.ts` | `2026-05-21-estimate-tree-dnd-reorganization-complete/` |
| Tree context menu | Live | `src/components/workshop/` (shadcn/Radix) | (decisions #36) | — | `estimate-tree-context-menu.test.tsx` | `2026-05-21-shadcn-context-menu-integration-complete/` |
| Tree hierarchy (Group/Area) | Live | `src/lib/estimates/tree-hierarchy.ts`, `src/lib/domain/estimate-tree.ts` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-data.test.ts`, `estimate-tree-edit.test.ts` | `2026-05-29-estimate-sheet-node-distinction-complete/` |
| Row mutations (insert/edit/delete) | Live | `src/lib/estimates/actions.ts`, `src/hooks/use-estimate-row-mutations.ts` | `current-project-estimates-component-library-spec.md` | — | `estimate-sheet-cost-inputs.test.tsx`, `estimate-sheet-library-insert.test.tsx` | — |
| Row tree patching | Live | `src/lib/estimates/estimate-row-tree-patch.ts` | same | — | `estimate-row-tree-patch.test.ts` | — |
| Area drop zones | Live | `src/components/workshop/EstimateSheetContent.tsx` | same | — | — | — |
| Workspace state | Live | `src/hooks/use-estimate-workspace-state.ts`, `use-estimate-query.ts` | `state-and-supabase-foundation.md` | — | — | — |
| Estimate metadata strip | Live | `src/components/workshop/ProjectEstimateMetadataStrip.tsx` | same | — | — | — |
| Estimate totals | Live | `src/lib/domain/estimate-totals.ts` | same | — | — | — |
| Project total header | Live | `src/components/workshop/ProjectTotalHeader.tsx` | same | — | `project-total-header.test.tsx` | — |
| Duplicate sheet | Live | `src/app/workshop/projects/[projectId]/estimates/page.tsx` | (decisions #39) | — | `project-estimates-client-create.test.tsx` | — |

## Activity + Node Activity + Row Version History

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Activity ledger (sheet/row/node) | Live | `src/lib/estimates/` (RPC-based) | `project-estimate-versioning-system.md` | — | `estimate-sheet-version-control-*.test.ts` | `2026-05-29-estimate-sheet-version-control-complete/` |
| Activity UI modal | Live | `src/components/workshop/` | same | — | `estimate-sheet-version-control-ui.test.tsx` | same |
| Row revision protection | Live | `src/lib/estimates/estimate-row-tree-patch.ts` | same | — | — | same |
| Node create/rename history | Live | `src/lib/estimates/estimate-tree-edit.ts` | same | — | — | same |
| Retention metrics | Live | (Supabase RPC) | same | — | — | same |

## Component Library
_Live. Includes components, suppliers, brands, variants, pricing, images, attachments, and `misc_cost` line items._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Library workspace | Live | `src/app/workshop/library/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `component-library-ui.test.tsx`, `workshop-library-consolidation-ui.test.tsx` | `2026-05-29-workshop-library-components-templates-split-complete/` |
| Library tree (folders) | Live | `src/components/workshop/component-library/tree/` | same | — | `library-folder-*.test.ts` | same |
| Component cards | Live | `src/components/workshop/component-library/ComponentCard.tsx` | same | — | — | same |
| Add component | Live | `src/components/workshop/component-library/NewComponentForm.tsx` | same | — | — | `2026-05-29-workshop-library-component-creation-versioning-complete/` |
| Component versioning | Live | `src/lib/component-library/` (RPC-based) | same | — | `component-library-versioning-schema.test.ts` | same |
| Component variants | Live | `src/components/workshop/` | same | — | `component-library-manager-ui.test.tsx` | `2026-05-29-component-variant-assets-and-cost-history-complete/` |
| Brand/Supplier mgmt | Live | `src/lib/component-library/` | same | — | `component-library-brand-schema.test.ts` | `2026-05-29-component-library-identity-and-brand-view-complete/` |
| Image upload | Live | `src/app/api/component-library/images/route.ts` | same | — | — | same |
| Attachment upload | Live | `src/app/api/component-library/attachments/route.ts` | same | — | — | same |
| Category taxonomy (V3) | Live | `src/lib/component-library/taxonomy.ts` | same | — | — | `2026-05-29-component-category-library-taxonomy-complete/` |
| Library sidebar (estimate page) | Live | `src/components/workshop/component-library/index.tsx` | same | — | `estimate-sheet-library-insert.test.tsx` | `2026-05-21-estimate-component-library-sidebar-audit-complete/` |
| Command palette | Live | `src/components/workshop/component-library/CommandPalette.tsx` | same | — | — | — |
| Unit options | Live | `src/lib/component-library/unit-options.ts` | same | — | — | — |
| Folder reorder | Live | `src/lib/component-library/library-folder-reorder.ts` | same | — | `library-folder-reorder.test.ts` | — |
| Library manager (admin) | Live | `src/components/workshop/component-library-manager/` | same | — | `component-library-manager-ui.test.tsx` | — |

## Templates

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Template workspace | Live | `src/app/workshop/templates/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `template-library-manager-ui.test.tsx` | `2026-05-29-component-library-templates-complete/` |
| Template model (DB) | Live | `src/lib/component-library/estimate-templates.ts` | same | — | `component-library-templates-schema.test.ts`, `component-library-templates-repository.test.ts` | same |
| Template insertion | Live | (Supabase RPC) | same | — | — | same |

## Proposal Export
_Live as Excel (.xlsx) working-document export. Exports are not immutable issued records or POs (see Claims discipline). Issued-snapshot policy is Partial/Planned._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| XLSX workbook generation | Live | `src/lib/proposal-export/create-proposal-workbook.ts` | `proposal-package-system.md` | — | `proposal-workbook.test.ts` | `2026-05-29-industry-standard-excel-proposal-export-complete/` |
| Export model | Live | `src/lib/proposal-export/build-proposal-export-model.ts` | same | — | `proposal-export-model.test.ts` | same |
| Export API route | Live | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | same | — | `proposal-export-route.test.ts` | same |
| Preview dialog | Live | `src/components/workshop/ProposalExportPreviewDialog.tsx` | same | — | `proposal-export-preview.test.tsx` | same |

## Project Charts
_Live. D3 comparison charts: donut + bubble._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Chart board | Live | `src/app/workshop/projects/[projectId]/charts/page.tsx` | (roadmap Phase 5) | — | `project-charts-ui.test.tsx` | `2026-05-29-project-charts-estimate-comparison-complete/` |
| Donut chart (D3) | Live | `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | same | — | — | same |
| Bubble chart (D3) | Live | `src/components/workshop/project-charts/ProjectCostBubbleChart.tsx` | same | — | — | same |
| Chart aggregation | Live | `src/lib/project-charts/aggregate-project-charts.ts` | same | — | `project-charts-aggregation.test.ts` | same |
| Chart types | Live | `src/lib/project-charts/types.ts` | same | — | — | same |

## Shared Link / Publication
_Live. Project publication + shared links with comments, decisions, and password protection._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Shared link manager | Live | `src/components/workshop/ProjectPublicationHeader.tsx` | `shared-link-and-publication-spec.md` | — | `project-publication-header.test.tsx` | `2026-05-27-project-client-publication-complete/` (V1), P0–P14 (V2) |
| Publication actions | Live | `src/lib/publication/actions.ts` | same | — | `project-publication-actions.test.ts` | same |
| Publication snapshot | Live | `src/lib/publication/snapshot.ts` | same | — | `project-publication-snapshot.test.ts` | same |
| Share receiver page | Live | `src/app/share/[token]/page.tsx` | same | — | `project-publication-page.test.tsx` | same |
| Share page tabs | Live | `src/components/share/SharePageTabs.tsx` | same | — | — | same |
| Comments | Live | `src/components/share/SharePageComments.tsx` | same | — | `project-publication-comments.test.tsx` | same |
| Decisions | Live | `src/components/share/SharePageDecision.tsx` | same | — | `project-publication-decision.test.tsx` | same |
| Activity feed | Live | `src/components/share/SharedLinkActivityFeed.tsx` | same | — | `project-publication-activity.test.tsx` | same |
| Recipient emails | Live | `src/components/workshop/publication/RecipientEmailComposer.tsx` | same | — | — | same |
| Password protection | Live | `src/app/api/share/[token]/password/route.ts` | same | — | `project-publication-security.test.ts` | same |
| Security headers | Live | `src/lib/publication/security.ts` | same | — | `project-publication-security-headers.test.ts` | same |
| Public repository | Live | `src/lib/publication/public-repository.ts` | same | — | `project-publication-public-repository.test.ts` | same |
| Session cookie | Live | `src/hooks/use-shared-link-session.ts` | same | — | — | same |
| Share estimate view | Live | `src/components/share/ShareEstimateTreeView.tsx`, `ShareFloatingTreeNav.tsx` | same | — | — | `2026-05-29-share-page-estimate-view-enhancement-complete/` |
| Share chart buckets | Live | `src/lib/share/aggregate-share-chart-buckets.ts` | same | — | — | same |
| Share tree reconstruction | Live | `src/lib/share/reconstruct-share-tree.ts` | same | — | — | same |

## AI Copilot (Ask Flip) — Deferred (roadmap)
_Deferred from launch and tiering. When it ships, it enters at Pro and up. Not a current capability._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Ask endpoint | Deferred (roadmap) | `src/app/api/ai/ask/route.ts` | `ai-assistant-and-package-builder-spec.md` | `ai-chatbot-agent-readiness/` | `ai-ask-*.test.ts` | — |
| Package builder endpoint | Deferred (roadmap) | `src/app/api/ai/package-builder/route.ts` | same | same | `ai-package-builder-*.test.ts` | — |
| Read context | Deferred (roadmap) | `src/lib/ai/read-context.ts` | same | same | `ai-ask-read-context.test.ts` | — |
| Draft token | Deferred (roadmap) | `src/lib/ai/package-builder/draft-token.ts` | same | same | `ai-package-builder-draft.test.ts` | — |
| Draft generation | Deferred (roadmap) | `src/lib/ai/package-builder/draft.ts` | same | same | — | — |
| Apply commands | Deferred (roadmap) | `src/lib/ai/package-builder/apply.ts` | same | same | `ai-package-builder-apply.test.ts` | — |
| Read tools | Deferred (roadmap) | `src/lib/ai/package-builder/read-tools.ts` | same | same | `ai-package-builder-read-tools.test.ts` | — |
| Provider (DeepSeek) | Deferred (roadmap) | `src/lib/ai/deepseek.ts`, `provider.ts` | same | same | `ai-package-builder-provider.test.ts` | — |
| AI auth guard | Deferred (roadmap) | `src/lib/ai/auth.ts` | same | same | `ai-auth-guard.test.ts` | — |
| Audit foundation | Deferred (roadmap) | `src/lib/ai/audit.ts` | same | same | `ai-audit-*.test.ts` | — |
| Memory (ranking hints) | Deferred (roadmap) | `src/lib/ai/package-builder/memory.ts` | same | same | `ai-package-builder-memory.test.ts` | — |
| Feature flags | Deferred (roadmap) | `src/lib/ai/package-builder/feature-flags.ts` | same | same | — | — |
| Schemas | Deferred (roadmap) | `src/lib/ai/package-builder/schemas.ts` | same | same | `ai-package-builder-schema.test.ts` | — |
| UI floating button | Deferred (roadmap) | `src/components/workshop/EstimateCopilotFloatingButton.tsx` | same | same | `estimate-copilot-floating-button.test.tsx` | — |

## Teamspaces / Collaboration
_Live. Collaboration invites (email, roles) + realtime cursors._

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Collaboration actions | Live | `src/lib/collaboration/actions.ts` | `teamspaces-collaboration-spec.md` | — | `project-collaboration-actions.test.ts` | `2026-05-27-project-workspace-invite-entry-complete/` |
| Collaboration types | Live | `src/lib/collaboration/types.ts` | same | — | `project-collaboration-summary.test.ts` | same |
| Invite entry tokens | Live | `src/lib/collaboration/invite-entry.ts` | same | — | `project-invite-entry-schema.test.ts`, `project-invite-entry-feature-flag.test.ts` | same |
| Invite entry page | Live | `src/app/invite/[token]/page.tsx` | same | — | `project-invite-entry-route.test.ts` | same |
| Invite accept/continue | Live | `src/app/invite/[token]/accept/route.ts`, `continue/route.ts` | same | — | — | same |
| Pending invite bridge | Live | `src/lib/collaboration/pending-invite.ts`, `src/app/workshop/pending-invite/route.ts` | same | — | `pending-invite-cookie.test.ts`, `workshop-pending-invite.test.tsx` | same |
| Project presence | Live | `src/hooks/use-project-presence.ts` | same | — | `project-collaboration-realtime.test.ts` | same |
| Cursor broadcast | Live | `src/hooks/use-estimate-cursor-broadcast.ts` | same | — | — | same |
| Collaboration colors | Live | `src/lib/collaboration/colors.ts` | same | — | `collaboration-colors.test.ts` | same |
| Teamspaces header | Live | `src/components/workshop/ProjectTeamspaceHeader.tsx` | same | — | `teamspace-collaboration-header.test.tsx` | same |

## Landing Page & Marketing

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Landing page | Live | `src/app/page.tsx`, `src/components/landing/` | `mvp-ux-flow.md` | `landing-page-improvement/` | `landing-interactivity.test.tsx` | `2026-05-28-landing-page-below-hero-complete/` |
| About page | Planned (Next) | `src/app/about/page.tsx` | (roadmap) | — | — | — |
| Features page | Planned (Next) | `src/app/features/page.tsx` | (roadmap) | — | — | — |
| Pricing page | Planned (Next) | `src/app/pricing/page.tsx` | (roadmap) | — | — | — |
| Contact page | Planned (Next) | `src/app/contact/page.tsx` | (roadmap) | — | — | — |
| Privacy/Terms | Live | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | (roadmap Phase 1) | — | — | — |
| A/B testing | Live | `src/lib/ab-testing/` | (plan docs) | `landing-page-improvement/ab-testing-gdpr-international-compliance/` | `landing-ab-testing.test.tsx` | `2026-05-28-landing-page-ab-testing-and-consent-complete/` |
| Cookie consent | Live | `src/lib/landing/consent.ts`, `useLandingCookieConsent.ts` | (plan docs) | same | `landing-consent.test.tsx` | same |
| CSP headers | Live | In `next.config.ts` | (plan docs) | same | `landing-security-headers.test.ts` | same |
| Auth state helper | Live | `src/lib/landing/get-landing-auth-state.ts` | (plan docs) | same | `landing-auth-state.test.ts` | same |
| GA4 + Clarity | Live | `src/components/landing/LandingAnalyticsLoader.tsx`, `ClarityScript.tsx` | (plan docs) | same | — | same |

## Route Performance

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Bfcache handler | Live | `src/components/bfcache-handler.tsx` | `route-transition-perf-experiment.md` | `route-transition-performance-optimization/` | — | — |
| Performance monitor | Live | `src/components/performance-monitor.tsx` | same | same | — | — |
| Prefetch on hover | Live | `src/hooks/use-prefetch-on-hover.ts` | same | same | — | — |
| Skeleton primitive | Live | `src/components/ui/skeleton.tsx` | same | same | — | — |
| Loading skeletons | Live | `src/app/workshop/*/loading.tsx` | same | same | — | — |

## Shared UI Primitives

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Button | Live | `src/components/ui/button.tsx`, `button-link.tsx` | `DESIGN.md` | — | — | — |
| Badge | Live | `src/components/ui/badge.tsx` | same | — | — | — |
| Card | Live | `src/components/ui/` (card primitives) | same | — | — | — |
| Input/Select | Live | `src/components/ui/` (control-*, search-input) | same | — | — | — |
| Chip | Live | `src/components/ui/chip.tsx` | same | — | — | — |
| Modal | Live | `src/components/ui/modal.tsx` | same | — | `ui-modal-tooltip.test.tsx` | — |
| Toast | Live | `src/components/ui/toast.tsx` | same | — | `toast.test.tsx` | — |
| Context menu | Live | `src/components/ui/context-menu.tsx` | (decisions #36) | — | — | — |
| Toolbar icon button | Live | `src/components/ui/toolbar-icon-button.tsx` | same | — | `header-icon-toolbar-ui.test.tsx` | — |
| Toolbar icon select | Live | `src/components/ui/toolbar-icon-select.tsx` | same | — | — | — |
| Toolbar tooltip | Live | `src/components/ui/toolbar-tooltip.tsx` | same | — | `ui-modal-tooltip.test.tsx` | — |
| Empty state | Live | `src/components/ui/empty-state.tsx` | same | — | — | — |
| Skeleton | Live | `src/components/ui/skeleton.tsx` | same | — | — | — |
| cn utility | Live | `src/lib/ui/cn.ts` | same | — | — | — |

## Foundation / Infrastructure

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Supabase client | Live | `src/lib/supabase/client.ts`, `server.ts` | `state-and-supabase-foundation.md` | — | — | — |
| Supabase types | Live | `src/lib/supabase/types.ts` | `initial-data-model.md` | — | — | — |
| ID guards (UUID) | Live | `src/lib/ids.ts` | — | — | `id-guards.test.ts` | — |
| AEC Classification | Live | `src/lib/aec-classification/disciplines.ts` | (decisions) | — | `aec-classification.test.ts` | — |
| Email (Resend) | Live | `src/lib/email/resend-client.ts` | (publication spec) | — | — | — |
| Navigation router | Live | `src/hooks/use-navigation-router.ts` | — | — | — | — |
| Design system lint | Live | `scripts/enforce-app-design-system.mjs` | `DESIGN.md` | — | `app-css-regressions.test.ts` | — |
| Domain mutations | Live | `src/lib/domain/estimate-mutations.ts` | (estimate specs) | — | — | — |
| Schema compat | Live | `src/lib/repositories/estimate-schema-compat.ts` | — | — | `estimate-schema-compat.test.ts` | — |
| Repositories | Live | `src/lib/repositories/*.ts` | — | — | `estimate-repository.test.ts`, `workspace-repository-estimate-tree.test.ts` | — |
| Charts (shared) | Live | `src/lib/charts/types.ts`, `src/components/charts/CostDonutChart.tsx` | (charts spec) | — | — | — |

## Workshop Shell & Navigation

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Workshop homebase | Live | `src/app/workshop/page.tsx` | (roadmap) | — | `workshop-reset.test.tsx` | — |
| Workshop shell | Live | `src/components/workshop/WorkshopPageShell.tsx` | (roadmap) | — | — | — |
| Sidebar | Live | `src/components/sidebar/` | `DESIGN.md` | — | — | — |
| Workshop header | Live | `src/components/workshop/WorkshopTitleHeader.tsx` | (roadmap) | — | — | — |
| Resizable panels | Live | `src/components/workshop/ResizableSidePanel.tsx` | (roadmap) | — | — | — |
| Collection layout | Live | `src/components/workshop/WorkshopCollectionLayout.tsx` | (roadmap) | — | — | — |
| Estimate center column | Live | `src/components/workshop/EstimateCenterColumnBoundary.tsx` | (estimate spec) | — | — | — |
| Project mini sidebar | Live | `src/components/workshop/ProjectMiniSidebar.tsx` | (estimate spec) | — | — | — |
| Project workspace header | Live | `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` | (estimate spec) | — | — | — |
| Project workspace code | Live | `src/components/workshop/ProjectWorkspaceProjectCode.tsx` | (project spec) | — | — | — |

## Notifications & Release Announcements

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Notification system (in-app + release modals) | Live | `src/features/notifications/`, `src/lib/notifications/` | (plan) | `2026-06-06-notification-system/` | `notifications-*.test.tsx` (Storybook) | `2026-06-06-notification-system-implementation/` |
| Notification DB schema | Live | `supabase/migrations/20260606090000_notification_system.sql` | same | same | `notification-rls-*.test.ts` | same |
| Notification RLS proof (no-Docker) | Live | `scripts/prove-notification-rls-postgres.mjs` | same | same | RLS postgres smoke | same |
| Notification center UI | Live | `src/features/notifications/components/NotificationCenter.tsx` | same | same | Storybook stories | same |
| Header bell badge | Live | `WorkshopPageShell` action slot | same | same | Storybook stories | same |

## Terms & Legal

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Public Terms/Privacy pages | Live | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | (roadmap Phase 1) | — | `terms-*.test.tsx` | `2026-06-06-terms-and-conditions-sheet-implementation-complete/` |
| Authenticated Terms acceptance (clickwrap) | Live | `src/app/workshop/terms/page.tsx`, `src/lib/legal/` | same | — | `terms-acceptance-*.test.tsx` | same |
| Terms acceptance DB schema | Live | `supabase/migrations/20260606095935_legal_terms_acceptance.sql` | same | — | schema tests | same |
| Workshop layout terms gate | Live | `src/app/workshop/layout.tsx` | same | — | gate tests | same |

## Beta Access & Governance

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Closed beta allowlist | Live | `supabase/migrations/20260601182522_closed_beta_allowed_emails.sql` | (roadmap Phase 7) | `mvp-launch-readiness-2026-06-01/` | `closed-beta-*.test.ts` | `2026-06-02-mvp-closed-beta-manual-proof/` |
| Beta access check RPC | Live | `src/lib/auth/closed-beta-access.ts` | same | same | `beta-access-*.test.ts` | same |
| Beta access-required page | Live | `src/app/beta/access-required/page.tsx` | same | same | route guard tests | same |
| Beta feedback submissions | Live | `src/app/workshop/feedback/page.tsx`, `supabase/migrations/20260602083000_beta_feedback_submissions.sql` | same | same | `beta-feedback-*.test.ts` | same |
| Beta feedback admin review | Live | `src/app/workshop/settings/feedback/page.tsx`, `supabase/migrations/20260602084500_beta_feedback_review_queue.sql` | same | same | `feedback-admin-*.test.ts` | same |
| Beta user management | Live | `src/app/workshop/settings/beta-users/page.tsx` | same | same | `beta-users-*.test.ts` | same |

## Storybook Component Library (Review Surface)

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Storybook installation (10.4.2) | Live | `.storybook/main.ts`, `.storybook/preview.tsx` | `DESIGN.md` | `2026-06-06-ui-component-optimization-componentization/` | `storybook-provider-boundary.test.ts` | `2026-06-07-storybook-standalone-component-completion/` |
| UI component library (60+ components) | Live | `src/components/ui/**` | `DESIGN.md` | same | Vitest + Storybook stories | same |
| Storybook stories (85+ story files) | Live | `src/stories/**` | `DESIGN.md` | same | Storybook stories | same |
| Overlay system (Dialog, Modal, Sheet, etc.) | Live | `src/components/ui/overlays/**` | `DESIGN.md` | same | Storybook overlay stories + Playwright smoke | `2026-06-07-complete-ui-component-system-implementation/` |
| Storybook validation scripts | Live | `scripts/check-storybook-boundary.mjs`, `scripts/check-storybook-component-coverage.mjs` | same | same | `storybook:validate` | same |
| Provider boundary guard | Live | `scripts/check-storybook-boundary.mjs` | same | same | `storybook-provider-boundary.test.ts` | same |

_Note: Storybook is a review surface only. Production app routes have NOT migrated to the new component library. Public Storybook hosting and Supabase/provider-backed stories remain unperformed._

## Security Hardening (2026-06-04 Codex Security Batch)

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| CSV formula injection hardening | Live | `src/components/workshop/component-library/helpers.ts` | (Codex Security finding) | — | `component-library-helpers.test.ts` | `csv-formula-escape-2026-06-04.json` |
| Share image URL validation | Live | `src/lib/publication/snapshot.ts` | (Codex Security finding) | — | `project-publication-snapshot.test.ts` | `codex-security-share-image-url-finding-close/` |
| Share tree designation DoS bounds | Live | `src/lib/share/reconstruct-share-tree.ts` | (Codex Security finding) | — | `reconstruct-share-tree.test.ts` | share-tree-dos bounds artifact |
| Comment bad-UUID DoS hardening | Live | `src/app/api/share/[token]/comment/route.ts` | (Codex Security finding) | — | `project-publication-comments.test.tsx` | comment-circuit DoS artifact |
| Password-protected share metadata hardening | Live | `src/app/share/[token]/page.tsx` | (Codex Security finding) | — | `project-publication-page.test.tsx` | password-metadata artifact |
| Republish scope hardening | Live | `src/components/workshop/ProjectPublicationHeader.tsx` | (Codex Security finding) | — | `project-publication-header.test.tsx` | republish-scope artifact |
| Project image private storage | Live | `src/app/api/projects/images/route.ts` | (Codex Security finding) | — | `auth-sensitive-api-boundaries.test.ts` | project-images-private artifact |
| Component price audit RLS hardening | Live | `supabase/migrations/20260603234326_harden_component_price_audit_grants.sql` | (Codex Security finding) | — | `component-library-schema.test.ts` | component-price-audit artifact |
| Library folder editor-only RLS | Live | `supabase/migrations/20260603235355_harden_library_folder_editor_access.sql` | (Codex Security finding) | — | `library-folder-*.test.ts` | library-folder-editor artifact |
| Mass deletion actor derivation | Live | `supabase/migrations/20260603191903_harden_mass_deletion_actor_derivation.sql` | (Codex Security finding) | — | `mass-deletion-*.test.ts` | mass-deletion-actor artifact |
| AI Ask quota + audit fail-closed | Live | `src/lib/ai/audit.ts`, `src/app/api/ai/ask/route.ts` | (Codex Security finding) | — | `ai-ask-*.test.ts` | ai-ask-quota-audit artifact |
| Chart/XLSX export load bounds | Live | `src/lib/project-charts/`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | (Codex Security finding) | — | `proposal-export-route.test.ts` | chart-xlsx-load-bounds artifact |

## Mass Deletion & Governance

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Mass deletion governance | Live | `supabase/migrations/20260603160000_mass_deletion_governance.sql` | (plan) | `2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` | `mass-deletion-*.test.ts` | `2026-06-03-mass-deletion-implementation-log/` |
| Transactional library folder delete | Live | `supabase/migrations/20260605113000_transactional_library_folder_delete.sql` | same | same | `library-folder-delete.test.ts` | same |
| Mass deletion storage cleanup RPC lock | Live | `supabase/migrations/20260604031000_lock_mass_deletion_cleanup_result_rpc.sql` | (security) | same | `mass-deletion-*.test.ts` | cleanup-rpc-lock artifact |

## Email (Resend) Integration

| Feature | Status | Code | Spec | Plan | Tests | Archive |
|---------|--------|------|------|-------|-------|---------|
| Resend email client | Live | `src/lib/email/resend-client.ts` | `shared-link-and-publication-spec.md` | `mvp-launch-readiness-2026-06-01/` | `resend-*.test.ts` | `2026-06-02-mvp-closed-beta-manual-proof/` |
| Webhook receiver (signed) | Live | `src/app/api/webhooks/resend/route.ts` | same | same | webhook route tests | `resend-signed-delivered-webhook-reconciliation/` |
| Shared link recipient emails | Live | `src/components/workshop/publication/RecipientEmailComposer.tsx` | same | same | `project-publication-actions.test.ts` | shared-link email artifacts |
| Production Resend domain verification | Live | DNS + Resend dashboard | same | same | — | `resend-domain-verified-email-enabled/` |

---

## Documentation Gaps (verified 2026-06-18)

These features are implemented but lack dedicated spec files (covered by other docs):

| Feature | Coverage via |
|---------|-------------|
| Workshop shell/navigation | Roadmap Phase 2 + current-state.md route list |
| Shared UI primitives | DESIGN.md + roadmap Phase 0 |
| Repository layer | Implementation detail (covered by feature specs) |
| Email (Resend) | Shared link spec + roadmap Phase 5A |
| AEC Classification | decisions.md (#88-89) |
| ID guards | Simple utility |
| Charts (shared CostDonutChart) | Charts spec (roadmap Phase 5) |

**All implemented features are covered by at least one .ai/ documentation source.** No undocumented features found.

## Partial, Planned (Next), Later, and Deferred summary

Source: `ARCHESTIMATOR_MASTER.md` §7.2 (v4.3, 2026-06-18). These items are either not represented by a dedicated implementation row above or need a distinct status label.

### Partial

| Feature | Status | Notes |
|---------|--------|-------|
| Activity rollups / action taxonomy | Partial | Improving; taxonomy still evolving. |
| Proposal export policy (issued / immutable snapshot) | Partial | Preview/download exists; issued/immutable snapshot policy is an open decision. |

### Planned (Next)

| Feature | Status | Notes |
|---------|--------|-------|
| Proposal snapshots / issued exports | Planned (Next) | Policy gate first. |
| Archiving / trash | Planned (Next) | Restore deleted projects and estimates; paid-tier feature (§9.2). |
| Proposal open tracking | Planned (Next) | Sender sees when a client opens the shared link; tiered (§9.2). |
| Beta onboarding | Planned (Next) | First-run flow + demo data/reset rules. |
| Public claims matrix | Planned (Next) | Live/Partial/Planned/Dormant mapping for public surfaces. |
| Hosted auth redirect verification | Planned (Next) | Verify redirects in the hosted environment. |
| Revision intelligence | Planned (Next) | — |
| Proposal comparisons | Planned (Next) | — |
| Surfacing accumulated cost intelligence | Planned (Next) | Recall/organize your own past estimates by client, project type, and supplier (not an external aggregator). |

### Later

| Feature | Status | Notes |
|---------|--------|-------|
| Supplier catalog layer | Later | Products, specs, price ranges, lead times, supplier profiles. |
| Design / takeoff bridge | Later | — |
| Quote requests | Later | — |
| Product comparison | Later | — |
| ERP / procurement handoff | Later | — |
| Client-side proposal record / archive | Later | Persistent client-side archive. |
| Approval-to-payment workflow | Later | — |
| Milestone payment tracking | Later | — |

### Deferred (roadmap)

| Feature | Status | Notes |
|---------|--------|-------|
| AI Copilot (Ask, future Draft/Apply) | Deferred (roadmap) | Not in launch or tiers. When it ships, enters at Pro and up (§7.2, §9.2). |
