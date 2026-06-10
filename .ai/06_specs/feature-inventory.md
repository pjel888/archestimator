# Feature Inventory — Codebase ↔ Documentation Cross-Reference

**Last updated:** 2026-06-10
**Purpose:** Single source of truth mapping every implemented feature to its spec, plan, tests, and archive evidence.

## How to use

For any feature, this table tells you:
- **Code** — where the implementation lives
- **Spec** — the canonical feature specification
- **Plan** — the implementation plan (if separate from spec)
- **Tests** — test coverage
- **Archive** — completion evidence (if feature is complete)

---

## Auth & Tenancy

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Login page (Google OAuth + email link) | `src/app/login/page.tsx` | `supabase-auth-setup.md` | — | `auth-magic-link.test.ts`, `auth-entry-ui-contract.test.ts` | `2026-05-27-sign-up-login-authentication-local-implementation-evidence/` |
| Auth callback | `src/app/auth/callback/route.ts` | `supabase-auth-setup.md` | — | `auth-callback-route.test.ts`, `auth-error-mapping.test.ts` | same |
| Safe redirect sanitizer | `src/lib/auth/redirects.ts` | `supabase-auth-setup.md` | — | `auth-redirect-sanitizer.test.ts` | same |
| Route protection (proxy) | `src/proxy.ts` | `supabase-auth-setup.md` | — | `auth-proxy.test.ts` | same |
| Dev auth bypass | `src/lib/auth/dev-auth.ts`, `dev-auth-gate.ts` | `supabase-auth-setup.md` | — | — | same |
| Session management | `src/lib/auth/session.ts` | `supabase-auth-setup.md` | — | `auth-sensitive-api-boundaries.test.ts` | same |
| Account data (profiles, workspaces) | `src/lib/auth/account-*.ts` | `supabase-auth-setup.md` | — | `auth-account-data-*.test.ts` | same |
| Account security events | `src/lib/auth/account-audit.ts` | `supabase-auth-setup.md` | — | — | same |
| Onboarding guard | `src/app/workshop/onboarding/page.tsx` | `supabase-auth-setup.md` | — | `auth-onboarding-*.test.ts` | same |
| Settings (profile + workspace) | `src/app/workshop/settings/` | `supabase-auth-setup.md` | — | `auth-settings-ui-contract.test.ts` | same |

## Project Management

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Project list/create | `src/app/workshop/projects/page.tsx` | `live-project-estimate-bootstrap.md` | — | `project-dashboard-ui.test.ts`, `project-creation-ui.test.ts` | — |
| Project cards | `src/components/workshop/ProjectCard.tsx`, `LiveProjectCard.tsx` | same | — | `projects-page-*.test.tsx` | — |
| Project detail/dashboard | `src/app/workshop/projects/[projectId]/page.tsx` | same | — | — | — |
| Project creation form | `src/components/workshop/NewProjectForm.tsx`, `NewProjectModal.tsx` | same | — | `project-creation-ui.test.ts` | — |
| Project image upload | `src/app/api/projects/images/route.ts` | same | — | — | — |
| Project code generation | `src/lib/projects/project-code.ts` | same | — | — | — |
| Project metadata/budget | `src/lib/projects/actions.ts` | same | — | `estimate-sheet-project-budget-schema.test.ts` | — |
| Favorites (project + sheet) | `src/lib/workshop/actions.ts` | (roadmap) | — | `workshop-favorites-schema.test.ts` | — |

## Estimate Workspace

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Estimate list/create | `src/app/workshop/projects/[projectId]/estimates/page.tsx` | `live-project-estimate-bootstrap.md` | — | `project-estimates-*.test.tsx` | — |
| Estimate workspace shell | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `live-estimate-node-route.test.ts`, `estimate-bootstrap-ui.test.ts` | — |
| Estimate sheet content | `src/components/workshop/EstimateSheetContent.tsx` | same | — | `estimate-sheet-*.test.tsx` | — |
| Estimate tree (navigation) | `src/components/workshop/EstimateSheetTree.tsx` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-*.test.tsx` | `2026-05-29-estimate-tree-dnd-reorganization-complete/` |
| Tree DnD reorder | `src/lib/estimates/estimate-tree-reorder.ts` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-reorder.test.ts`, `estimate-node-reorder-action.test.ts` | `2026-05-21-estimate-tree-dnd-reorganization-complete/` |
| Tree context menu | `src/components/workshop/` (shadcn/Radix) | (decisions #36) | — | `estimate-tree-context-menu.test.tsx` | `2026-05-21-shadcn-context-menu-integration-complete/` |
| Tree hierarchy (Group/Area) | `src/lib/estimates/tree-hierarchy.ts`, `src/lib/domain/estimate-tree.ts` | `estimate-tree-drag-stability-design.md` | — | `estimate-tree-data.test.ts`, `estimate-tree-edit.test.ts` | `2026-05-29-estimate-sheet-node-distinction-complete/` |
| Row mutations (insert/edit/delete) | `src/lib/estimates/actions.ts`, `src/hooks/use-estimate-row-mutations.ts` | `current-project-estimates-component-library-spec.md` | — | `estimate-sheet-cost-inputs.test.tsx`, `estimate-sheet-library-insert.test.tsx` | — |
| Row tree patching | `src/lib/estimates/estimate-row-tree-patch.ts` | same | — | `estimate-row-tree-patch.test.ts` | — |
| Area drop zones | `src/components/workshop/EstimateSheetContent.tsx` | same | — | — | — |
| Workspace state | `src/hooks/use-estimate-workspace-state.ts`, `use-estimate-query.ts` | `state-and-supabase-foundation.md` | — | — | — |
| Estimate metadata strip | `src/components/workshop/ProjectEstimateMetadataStrip.tsx` | same | — | — | — |
| Estimate totals | `src/lib/domain/estimate-totals.ts` | same | — | — | — |
| Project total header | `src/components/workshop/ProjectTotalHeader.tsx` | same | — | `project-total-header.test.tsx` | — |
| Duplicate sheet | `src/app/workshop/projects/[projectId]/estimates/page.tsx` | (decisions #39) | — | `project-estimates-client-create.test.tsx` | — |

## Estimate Activity History

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Activity ledger (sheet/row/node) | `src/lib/estimates/` (RPC-based) | `project-estimate-versioning-system.md` | — | `estimate-sheet-version-control-*.test.ts` | `2026-05-29-estimate-sheet-version-control-complete/` |
| Activity UI modal | `src/components/workshop/` | same | — | `estimate-sheet-version-control-ui.test.tsx` | same |
| Row revision protection | `src/lib/estimates/estimate-row-tree-patch.ts` | same | — | — | same |
| Node create/rename history | `src/lib/estimates/estimate-tree-edit.ts` | same | — | — | same |
| Retention metrics | (Supabase RPC) | same | — | — | same |

## Component Library

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Library workspace | `src/app/workshop/library/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `component-library-ui.test.tsx`, `workshop-library-consolidation-ui.test.tsx` | `2026-05-29-workshop-library-components-templates-split-complete/` |
| Library tree (folders) | `src/components/workshop/component-library/tree/` | same | — | `library-folder-*.test.ts` | same |
| Component cards | `src/components/workshop/component-library/ComponentCard.tsx` | same | — | — | same |
| Add component | `src/components/workshop/component-library/NewComponentForm.tsx` | same | — | — | `2026-05-29-workshop-library-component-creation-versioning-complete/` |
| Component versioning | `src/lib/component-library/` (RPC-based) | same | — | `component-library-versioning-schema.test.ts` | same |
| Component variants | `src/components/workshop/` | same | — | `component-library-manager-ui.test.tsx` | `2026-05-29-component-variant-assets-and-cost-history-complete/` |
| Brand/Supplier mgmt | `src/lib/component-library/` | same | — | `component-library-brand-schema.test.ts` | `2026-05-29-component-library-identity-and-brand-view-complete/` |
| Image upload | `src/app/api/component-library/images/route.ts` | same | — | — | same |
| Attachment upload | `src/app/api/component-library/attachments/route.ts` | same | — | — | same |
| Category taxonomy (V3) | `src/lib/component-library/taxonomy.ts` | same | — | — | `2026-05-29-component-category-library-taxonomy-complete/` |
| Library sidebar (estimate page) | `src/components/workshop/component-library/index.tsx` | same | — | `estimate-sheet-library-insert.test.tsx` | `2026-05-21-estimate-component-library-sidebar-audit-complete/` |
| Command palette | `src/components/workshop/component-library/CommandPalette.tsx` | same | — | — | — |
| Unit options | `src/lib/component-library/unit-options.ts` | same | — | — | — |
| Folder reorder | `src/lib/component-library/library-folder-reorder.ts` | same | — | `library-folder-reorder.test.ts` | — |
| Library manager (admin) | `src/components/workshop/component-library-manager/` | same | — | `component-library-manager-ui.test.tsx` | — |

## Templates

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Template workspace | `src/app/workshop/templates/page.tsx` | `current-project-estimates-component-library-spec.md` | — | `template-library-manager-ui.test.tsx` | `2026-05-29-component-library-templates-complete/` |
| Template model (DB) | `src/lib/component-library/estimate-templates.ts` | same | — | `component-library-templates-schema.test.ts`, `component-library-templates-repository.test.ts` | same |
| Template insertion | (Supabase RPC) | same | — | — | same |

## Proposal Export

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| XLSX workbook generation | `src/lib/proposal-export/create-proposal-workbook.ts` | `proposal-package-system.md` | — | `proposal-workbook.test.ts` | `2026-05-29-industry-standard-excel-proposal-export-complete/` |
| Export model | `src/lib/proposal-export/build-proposal-export-model.ts` | same | — | `proposal-export-model.test.ts` | same |
| Export API route | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | same | — | `proposal-export-route.test.ts` | same |
| Preview dialog | `src/components/workshop/ProposalExportPreviewDialog.tsx` | same | — | `proposal-export-preview.test.tsx` | same |

## Project Charts

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Chart board | `src/app/workshop/projects/[projectId]/charts/page.tsx` | (roadmap Phase 5) | — | `project-charts-ui.test.tsx` | `2026-05-29-project-charts-estimate-comparison-complete/` |
| Donut chart (D3) | `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` | same | — | — | same |
| Bubble chart (D3) | `src/components/workshop/project-charts/ProjectCostBubbleChart.tsx` | same | — | — | same |
| Chart aggregation | `src/lib/project-charts/aggregate-project-charts.ts` | same | — | `project-charts-aggregation.test.ts` | same |
| Chart types | `src/lib/project-charts/types.ts` | same | — | — | same |

## Shared Link / Publication

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Shared link manager | `src/components/workshop/ProjectPublicationHeader.tsx` | `shared-link-and-publication-spec.md` | — | `project-publication-header.test.tsx` | `2026-05-27-project-client-publication-complete/` (V1), P0–P14 (V2) |
| Publication actions | `src/lib/publication/actions.ts` | same | — | `project-publication-actions.test.ts` | same |
| Publication snapshot | `src/lib/publication/snapshot.ts` | same | — | `project-publication-snapshot.test.ts` | same |
| Share receiver page | `src/app/share/[token]/page.tsx` | same | — | `project-publication-page.test.tsx` | same |
| Share page tabs | `src/components/share/SharePageTabs.tsx` | same | — | — | same |
| Comments | `src/components/share/SharePageComments.tsx` | same | — | `project-publication-comments.test.tsx` | same |
| Decisions | `src/components/share/SharePageDecision.tsx` | same | — | `project-publication-decision.test.tsx` | same |
| Activity feed | `src/components/share/SharedLinkActivityFeed.tsx` | same | — | `project-publication-activity.test.tsx` | same |
| Recipient emails | `src/components/workshop/publication/RecipientEmailComposer.tsx` | same | — | — | same |
| Password protection | `src/app/api/share/[token]/password/route.ts` | same | — | `project-publication-security.test.ts` | same |
| Security headers | `src/lib/publication/security.ts` | same | — | `project-publication-security-headers.test.ts` | same |
| Public repository | `src/lib/publication/public-repository.ts` | same | — | `project-publication-public-repository.test.ts` | same |
| Session cookie | `src/hooks/use-shared-link-session.ts` | same | — | — | same |
| Share estimate view | `src/components/share/ShareEstimateTreeView.tsx`, `ShareFloatingTreeNav.tsx` | same | — | — | `2026-05-29-share-page-estimate-view-enhancement-complete/` |
| Share chart buckets | `src/lib/share/aggregate-share-chart-buckets.ts` | same | — | — | same |
| Share tree reconstruction | `src/lib/share/reconstruct-share-tree.ts` | same | — | — | same |

## AI Copilot (Ask Flip)

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Ask endpoint | `src/app/api/ai/ask/route.ts` | `ai-assistant-and-package-builder-spec.md` | `ai-chatbot-agent-readiness/` | `ai-ask-*.test.ts` | — |
| Package builder endpoint | `src/app/api/ai/package-builder/route.ts` | same | same | `ai-package-builder-*.test.ts` | — |
| Read context | `src/lib/ai/read-context.ts` | same | same | `ai-ask-read-context.test.ts` | — |
| Draft token | `src/lib/ai/package-builder/draft-token.ts` | same | same | `ai-package-builder-draft.test.ts` | — |
| Draft generation | `src/lib/ai/package-builder/draft.ts` | same | same | — | — |
| Apply commands | `src/lib/ai/package-builder/apply.ts` | same | same | `ai-package-builder-apply.test.ts` | — |
| Read tools | `src/lib/ai/package-builder/read-tools.ts` | same | same | `ai-package-builder-read-tools.test.ts` | — |
| Provider (DeepSeek) | `src/lib/ai/deepseek.ts`, `provider.ts` | same | same | `ai-package-builder-provider.test.ts` | — |
| AI auth guard | `src/lib/ai/auth.ts` | same | same | `ai-auth-guard.test.ts` | — |
| Audit foundation | `src/lib/ai/audit.ts` | same | same | `ai-audit-*.test.ts` | — |
| Memory (ranking hints) | `src/lib/ai/package-builder/memory.ts` | same | same | `ai-package-builder-memory.test.ts` | — |
| Feature flags | `src/lib/ai/package-builder/feature-flags.ts` | same | same | — | — |
| Schemas | `src/lib/ai/package-builder/schemas.ts` | same | same | `ai-package-builder-schema.test.ts` | — |
| UI floating button | `src/components/workshop/EstimateCopilotFloatingButton.tsx` | same | same | `estimate-copilot-floating-button.test.tsx` | — |

## Teamspaces / Collaboration

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Collaboration actions | `src/lib/collaboration/actions.ts` | `teamspaces-collaboration-spec.md` | — | `project-collaboration-actions.test.ts` | `2026-05-27-project-workspace-invite-entry-complete/` |
| Collaboration types | `src/lib/collaboration/types.ts` | same | — | `project-collaboration-summary.test.ts` | same |
| Invite entry tokens | `src/lib/collaboration/invite-entry.ts` | same | — | `project-invite-entry-schema.test.ts`, `project-invite-entry-feature-flag.test.ts` | same |
| Invite entry page | `src/app/invite/[token]/page.tsx` | same | — | `project-invite-entry-route.test.ts` | same |
| Invite accept/continue | `src/app/invite/[token]/accept/route.ts`, `continue/route.ts` | same | — | — | same |
| Pending invite bridge | `src/lib/collaboration/pending-invite.ts`, `src/app/workshop/pending-invite/route.ts` | same | — | `pending-invite-cookie.test.ts`, `workshop-pending-invite.test.tsx` | same |
| Project presence | `src/hooks/use-project-presence.ts` | same | — | `project-collaboration-realtime.test.ts` | same |
| Cursor broadcast | `src/hooks/use-estimate-cursor-broadcast.ts` | same | — | — | same |
| Collaboration colors | `src/lib/collaboration/colors.ts` | same | — | `collaboration-colors.test.ts` | same |
| Teamspaces header | `src/components/workshop/ProjectTeamspaceHeader.tsx` | same | — | `teamspace-collaboration-header.test.tsx` | same |

## Landing Page & Marketing

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Landing page | `src/app/page.tsx`, `src/components/landing/` | `mvp-ux-flow.md` | `landing-page-improvement/` | `landing-interactivity.test.tsx` | `2026-05-28-landing-page-below-hero-complete/` |
| About page | `src/app/about/page.tsx` | (roadmap) | — | — | — |
| Features page | `src/app/features/page.tsx` | (roadmap) | — | — | — |
| Pricing page | `src/app/pricing/page.tsx` | (roadmap) | — | — | — |
| Contact page | `src/app/contact/page.tsx` | (roadmap) | — | — | — |
| Privacy/Terms | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | (roadmap Phase 1) | — | — | — |
| A/B testing | `src/lib/ab-testing/` | (plan docs) | `landing-page-improvement/ab-testing-gdpr-international-compliance/` | `landing-ab-testing.test.tsx` | `2026-05-28-landing-page-ab-testing-and-consent-complete/` |
| Cookie consent | `src/lib/landing/consent.ts`, `useLandingCookieConsent.ts` | (plan docs) | same | `landing-consent.test.tsx` | same |
| CSP headers | In `next.config.ts` | (plan docs) | same | `landing-security-headers.test.ts` | same |
| Auth state helper | `src/lib/landing/get-landing-auth-state.ts` | (plan docs) | same | `landing-auth-state.test.ts` | same |
| GA4 + Clarity | `src/components/landing/LandingAnalyticsLoader.tsx`, `ClarityScript.tsx` | (plan docs) | same | — | same |

## Route Performance

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Bfcache handler | `src/components/bfcache-handler.tsx` | `route-transition-perf-experiment.md` | `route-transition-performance-optimization/` | — | — |
| Performance monitor | `src/components/performance-monitor.tsx` | same | same | — | — |
| Prefetch on hover | `src/hooks/use-prefetch-on-hover.ts` | same | same | — | — |
| Skeleton primitive | `src/components/ui/skeleton.tsx` | same | same | — | — |
| Loading skeletons | `src/app/workshop/*/loading.tsx` | same | same | — | — |

## Shared UI Primitives

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Button | `src/components/ui/button.tsx`, `button-link.tsx` | `DESIGN.md` | — | — | — |
| Badge | `src/components/ui/badge.tsx` | same | — | — | — |
| Card | `src/components/ui/` (card primitives) | same | — | — | — |
| Input/Select | `src/components/ui/` (control-*, search-input) | same | — | — | — |
| Chip | `src/components/ui/chip.tsx` | same | — | — | — |
| Modal | `src/components/ui/modal.tsx` | same | — | `ui-modal-tooltip.test.tsx` | — |
| Toast | `src/components/ui/toast.tsx` | same | — | `toast.test.tsx` | — |
| Context menu | `src/components/ui/context-menu.tsx` | (decisions #36) | — | — | — |
| Toolbar icon button | `src/components/ui/toolbar-icon-button.tsx` | same | — | `header-icon-toolbar-ui.test.tsx` | — |
| Toolbar icon select | `src/components/ui/toolbar-icon-select.tsx` | same | — | — | — |
| Toolbar tooltip | `src/components/ui/toolbar-tooltip.tsx` | same | — | `ui-modal-tooltip.test.tsx` | — |
| Empty state | `src/components/ui/empty-state.tsx` | same | — | — | — |
| Skeleton | `src/components/ui/skeleton.tsx` | same | — | — | — |
| cn utility | `src/lib/ui/cn.ts` | same | — | — | — |

## Foundation / Infrastructure

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Supabase client | `src/lib/supabase/client.ts`, `server.ts` | `state-and-supabase-foundation.md` | — | — | — |
| Supabase types | `src/lib/supabase/types.ts` | `initial-data-model.md` | — | — | — |
| ID guards (UUID) | `src/lib/ids.ts` | — | — | `id-guards.test.ts` | — |
| AEC Classification | `src/lib/aec-classification/disciplines.ts` | (decisions) | — | `aec-classification.test.ts` | — |
| Email (Resend) | `src/lib/email/resend-client.ts` | (publication spec) | — | — | — |
| Navigation router | `src/hooks/use-navigation-router.ts` | — | — | — | — |
| Design system lint | `scripts/enforce-app-design-system.mjs` | `DESIGN.md` | — | `app-css-regressions.test.ts` | — |
| Domain mutations | `src/lib/domain/estimate-mutations.ts` | (estimate specs) | — | — | — |
| Schema compat | `src/lib/repositories/estimate-schema-compat.ts` | — | — | `estimate-schema-compat.test.ts` | — |
| Repositories | `src/lib/repositories/*.ts` | — | — | `estimate-repository.test.ts`, `workspace-repository-estimate-tree.test.ts` | — |
| Charts (shared) | `src/lib/charts/types.ts`, `src/components/charts/CostDonutChart.tsx` | (charts spec) | — | — | — |

## Workshop Shell & Navigation

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Workshop homebase | `src/app/workshop/page.tsx` | (roadmap) | — | `workshop-reset.test.tsx` | — |
| Workshop shell | `src/components/workshop/WorkshopPageShell.tsx` | (roadmap) | — | — | — |
| Sidebar | `src/components/sidebar/` | `DESIGN.md` | — | — | — |
| Workshop header | `src/components/workshop/WorkshopTitleHeader.tsx` | (roadmap) | — | — | — |
| Resizable panels | `src/components/workshop/ResizableSidePanel.tsx` | (roadmap) | — | — | — |
| Collection layout | `src/components/workshop/WorkshopCollectionLayout.tsx` | (roadmap) | — | — | — |
| Estimate center column | `src/components/workshop/EstimateCenterColumnBoundary.tsx` | (estimate spec) | — | — | — |
| Project mini sidebar | `src/components/workshop/ProjectMiniSidebar.tsx` | (estimate spec) | — | — | — |
| Project workspace header | `src/components/workshop/ProjectWorkspaceHeaderRow.tsx` | (estimate spec) | — | — | — |
| Project workspace code | `src/components/workshop/ProjectWorkspaceProjectCode.tsx` | (project spec) | — | — | — |

## Notifications & Release Announcements

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Notification system (in-app + release modals) | `src/features/notifications/`, `src/lib/notifications/` | (plan) | `2026-06-06-notification-system/` | `notifications-*.test.tsx` (Storybook) | `2026-06-06-notification-system-implementation/` |
| Notification DB schema | `supabase/migrations/20260606090000_notification_system.sql` | same | same | `notification-rls-*.test.ts` | same |
| Notification RLS proof (no-Docker) | `scripts/prove-notification-rls-postgres.mjs` | same | same | RLS postgres smoke | same |
| Notification center UI | `src/features/notifications/components/NotificationCenter.tsx` | same | same | Storybook stories | same |
| Header bell badge | `WorkshopPageShell` action slot | same | same | Storybook stories | same |

## Terms & Legal

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Public Terms/Privacy pages | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | (roadmap Phase 1) | — | `terms-*.test.tsx` | `2026-06-06-terms-and-conditions-sheet-implementation-complete/` |
| Authenticated Terms acceptance (clickwrap) | `src/app/workshop/terms/page.tsx`, `src/lib/legal/` | same | — | `terms-acceptance-*.test.tsx` | same |
| Terms acceptance DB schema | `supabase/migrations/20260606095935_legal_terms_acceptance.sql` | same | — | schema tests | same |
| Workshop layout terms gate | `src/app/workshop/layout.tsx` | same | — | gate tests | same |

## Beta Access & Governance

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Closed beta allowlist | `supabase/migrations/20260601182522_closed_beta_allowed_emails.sql` | (roadmap Phase 7) | `mvp-launch-readiness-2026-06-01/` | `closed-beta-*.test.ts` | `2026-06-02-mvp-closed-beta-manual-proof/` |
| Beta access check RPC | `src/lib/auth/closed-beta-access.ts` | same | same | `beta-access-*.test.ts` | same |
| Beta access-required page | `src/app/beta/access-required/page.tsx` | same | same | route guard tests | same |
| Beta feedback submissions | `src/app/workshop/feedback/page.tsx`, `supabase/migrations/20260602083000_beta_feedback_submissions.sql` | same | same | `beta-feedback-*.test.ts` | same |
| Beta feedback admin review | `src/app/workshop/settings/feedback/page.tsx`, `supabase/migrations/20260602084500_beta_feedback_review_queue.sql` | same | same | `feedback-admin-*.test.ts` | same |
| Beta user management | `src/app/workshop/settings/beta-users/page.tsx` | same | same | `beta-users-*.test.ts` | same |

## Storybook Component Library (Review Surface)

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Storybook installation (10.4.2) | `.storybook/main.ts`, `.storybook/preview.tsx` | `DESIGN.md` | `2026-06-06-ui-component-optimization-componentization/` | `storybook-provider-boundary.test.ts` | `2026-06-07-storybook-standalone-component-completion/` |
| UI component library (60+ components) | `src/components/ui/**` | `DESIGN.md` | same | Vitest + Storybook stories | same |
| Storybook stories (85+ story files) | `src/stories/**` | `DESIGN.md` | same | Storybook stories | same |
| Overlay system (Dialog, Modal, Sheet, etc.) | `src/components/ui/overlays/**` | `DESIGN.md` | same | Storybook overlay stories + Playwright smoke | `2026-06-07-complete-ui-component-system-implementation/` |
| Storybook validation scripts | `scripts/check-storybook-boundary.mjs`, `scripts/check-storybook-component-coverage.mjs` | same | same | `storybook:validate` | same |
| Provider boundary guard | `scripts/check-storybook-boundary.mjs` | same | same | `storybook-provider-boundary.test.ts` | same |

_Note: Storybook is a review surface only. Production app routes have NOT migrated to the new component library. Public Storybook hosting and Supabase/provider-backed stories remain unperformed._

## Security Hardening (2026-06-04 Codex Security Batch)

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| CSV formula injection hardening | `src/components/workshop/component-library/helpers.ts` | (Codex Security finding) | — | `component-library-helpers.test.ts` | `csv-formula-escape-2026-06-04.json` |
| Share image URL validation | `src/lib/publication/snapshot.ts` | (Codex Security finding) | — | `project-publication-snapshot.test.ts` | `codex-security-share-image-url-finding-close/` |
| Share tree designation DoS bounds | `src/lib/share/reconstruct-share-tree.ts` | (Codex Security finding) | — | `reconstruct-share-tree.test.ts` | share-tree-dos bounds artifact |
| Comment bad-UUID DoS hardening | `src/app/api/share/[token]/comment/route.ts` | (Codex Security finding) | — | `project-publication-comments.test.tsx` | comment-circuit DoS artifact |
| Password-protected share metadata hardening | `src/app/share/[token]/page.tsx` | (Codex Security finding) | — | `project-publication-page.test.tsx` | password-metadata artifact |
| Republish scope hardening | `src/components/workshop/ProjectPublicationHeader.tsx` | (Codex Security finding) | — | `project-publication-header.test.tsx` | republish-scope artifact |
| Project image private storage | `src/app/api/projects/images/route.ts` | (Codex Security finding) | — | `auth-sensitive-api-boundaries.test.ts` | project-images-private artifact |
| Component price audit RLS hardening | `supabase/migrations/20260603234326_harden_component_price_audit_grants.sql` | (Codex Security finding) | — | `component-library-schema.test.ts` | component-price-audit artifact |
| Library folder editor-only RLS | `supabase/migrations/20260603235355_harden_library_folder_editor_access.sql` | (Codex Security finding) | — | `library-folder-*.test.ts` | library-folder-editor artifact |
| Mass deletion actor derivation | `supabase/migrations/20260603191903_harden_mass_deletion_actor_derivation.sql` | (Codex Security finding) | — | `mass-deletion-*.test.ts` | mass-deletion-actor artifact |
| AI Ask quota + audit fail-closed | `src/lib/ai/audit.ts`, `src/app/api/ai/ask/route.ts` | (Codex Security finding) | — | `ai-ask-*.test.ts` | ai-ask-quota-audit artifact |
| Chart/XLSX export load bounds | `src/lib/project-charts/`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | (Codex Security finding) | — | `proposal-export-route.test.ts` | chart-xlsx-load-bounds artifact |

## Mass Deletion & Governance

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Mass deletion governance | `supabase/migrations/20260603160000_mass_deletion_governance.sql` | (plan) | `2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md` | `mass-deletion-*.test.ts` | `2026-06-03-mass-deletion-implementation-log/` |
| Transactional library folder delete | `supabase/migrations/20260605113000_transactional_library_folder_delete.sql` | same | same | `library-folder-delete.test.ts` | same |
| Mass deletion storage cleanup RPC lock | `supabase/migrations/20260604031000_lock_mass_deletion_cleanup_result_rpc.sql` | (security) | same | `mass-deletion-*.test.ts` | cleanup-rpc-lock artifact |

## Email (Resend) Integration

| Feature | Code | Spec | Plan | Tests | Archive |
|---------|------|------|------|-------|---------|
| Resend email client | `src/lib/email/resend-client.ts` | `shared-link-and-publication-spec.md` | `mvp-launch-readiness-2026-06-01/` | `resend-*.test.ts` | `2026-06-02-mvp-closed-beta-manual-proof/` |
| Webhook receiver (signed) | `src/app/api/webhooks/resend/route.ts` | same | same | webhook route tests | `resend-signed-delivered-webhook-reconciliation/` |
| Shared link recipient emails | `src/components/workshop/publication/RecipientEmailComposer.tsx` | same | same | `project-publication-actions.test.ts` | shared-link email artifacts |
| Production Resend domain verification | DNS + Resend dashboard | same | same | — | `resend-domain-verified-email-enabled/` |

---

## Documentation Gaps (verified 2026-06-10)

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
