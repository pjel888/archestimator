# 10 - Source Map and Conflict Resolution

## Purpose

This document prevents the combined folder from becoming another pile of overlapping plans. It names the canonical owner for each topic and resolves known conflicts discovered during the consolidation audit.

## Precedence Order

When documents disagree:

1. Current source code, migrations, tests, and live environment evidence.
2. `.ai/10_state/current-state.md` and `.ai/10_state/known-issues.md`.
3. This folder's root `09-unified-implementation-flow.md`.
4. This folder's root `05`, `06`, `07`, and `11` gate documents.
5. Lane-specific canonical docs listed below.
6. Lane appendices and historical review logs.

## Canonical Topic Owners

| Topic | Canonical owner | Supporting docs |
| --- | --- | --- |
| Cross-lane implementation order | `09-unified-implementation-flow.md` | `11-validation-and-agent-handoff.md` |
| Security/token/cookie/rate-limit rules | `05-security-threat-model-and-hardening.md` | `06-performance-and-observability-plan.md` |
| Detailed invite acceptance criteria | `07-implementation-acceptance-criteria.md` | `collaboration-invite/04-prioritized-improvement-roadmap.md` |
| Detailed shared-link manager acceptance criteria | `07-implementation-acceptance-criteria.md` | `shared-link-manager/04-prioritized-improvement-roadmap.md` |
| Invite current implementation inventory | `collaboration-invite/01-current-inventory.md` | current source/tests |
| Shared-link manager current inventory | `shared-link-manager/01-current-inventory.md` | current source/tests |
| Receiver current implementation inventory | `shared-link-receiver-ux/01-current-implementation-inventory.md` | current source/tests |
| Receiver UI strategy | `shared-link-receiver-ux/12-selected-ui-strategy-and-wireframe-contract.md` | `shared-link-receiver-ux/05-ui-layout-maximization-plan.md` |
| Receiver implementation slices | `shared-link-receiver-ux/13-implementation-prd-and-slice-contract.md` | root `09` |
| Receiver test spec | `shared-link-receiver-ux/15-implementation-test-spec.md` | `shared-link-receiver-ux/09-validation-qa-acceptance-gates.md` |
| Receiver personas | `shared-link-receiver-ux/11-personas-jobs-and-scenario-fit.md` | `shared-link-receiver-ux/04-ux-paths-happy-sad-edge-cases.md` |
| Receiver evidence assets | `shared-link-receiver-ux/03-live-layout-and-visual-audit.md` | `shared-link-receiver-ux/evidence/` |

## Resolved Conflicts

### 1. Former Folder Split

**Conflict:** Collaboration/share audit and receiver UX lived in separate folders, so agents could implement shared-link manager hardening and `/share/[token]` layout without seeing dependencies.

**Resolution:** This folder is canonical. The former collaboration audit is now the root/cross-cutting spine, and the former share-page UX pack is now `shared-link-receiver-ux/`.

### 2. Receiver Slice Order

**Conflict:** `shared-link-receiver-ux/10-agent-handoff-and-execution-sequence.md` uses:

1. confirm evidence,
2. shell/column rebalance,
3. estimate workspace extraction,
4. chart/mobile reorder,
5. search/navigation,
6. response rail polish.

`shared-link-receiver-ux/13-implementation-prd-and-slice-contract.md` and `15-implementation-test-spec.md` use:

1. shell/layout,
2. workspace extraction,
3. navigation/search,
4. context rail/response,
5. route state polish.

**Resolution:** `13` and `15` win. Chart/mobile reorder is part of Slice 2 or Slice 4 depending on the affected component, not a separate canonical slice. `10` is kept as historical handoff and file-ownership reference only.

### 3. Shared-Link Phase Numbering

**Conflict:** The shared-link manager roadmap had lane-local `P0` visibility plus duplicate `Phase 2` headings, while root docs describe shared-link visibility as a later cross-feature phase.

**Resolution:** Root `09` wins for cross-lane sequencing. Lane-local numbers in `shared-link-manager/04-prioritized-improvement-roadmap.md` are source-roadmap labels only. The duplicate Phase 2 heading is corrected to separate recipient identity from content/polish.

### 4. Gap Counts

**Conflict:** Older README counts said collaboration invite had 9 medium gaps and shared-link had 5 high/12 medium/17 low gaps.

**Resolution:** The gap-analysis docs win:

- Collaboration Invite: 33 total gaps: 3 critical, 12 high, 10 medium, 8 low.
- Shared Link Manager: 34 total gaps: 0 critical, 5 high, 13 medium, 16 low.

### 5. Durable Rate Limiting Priority

**Conflict:** Some source docs treat shared-link visibility as the first shared-link phase, while security docs identify in-memory/unthrottled public endpoints as a beta blocker.

**Resolution:** Visibility-only manager UX may start early if it does not add public traffic or mutation surfaces. Public endpoint expansion, password/comment/session behavior changes, and external beta claims require the durable rate-limit decision in Wave 2.

### 6. Invite P0 vs Receiver UX

**Conflict:** Collaboration invite P0 is config-blocked, while receiver UX has no direct dependency on invite delivery.

**Resolution:** Invite P0 blocks invite readiness claims and pending-invite UX that depends on live invitations. It does not block no-API `/share/[token]` receiver layout work, provided receiver work preserves token/password/session/comment/decision behavior.

### 7. Recipient Token Query Parameter

**Conflict:** `src/lib/publication/actions.ts` currently builds recipient email links with `?rt=...`, while `src/app/share/[token]/page.tsx` reads only `?recipient=...` before verifying the recipient token and setting the shared-link session cookie.

**Resolution:** Treat this as Wave 2 safety/data work. Any recipient identity, comment, decision, or per-recipient tracking slice must first make generated recipient links and receiver parsing agree, with tests proving the emitted email URL establishes the recipient session.

## Source Documents to Treat as Appendices

These are useful but not canonical for sequencing:

- `shared-link-receiver-ux/05-ui-layout-maximization-plan.md` — option/history detail.
- `shared-link-receiver-ux/06-feature-opportunities-roadmap.md` — feature ideas; root `09` chooses implementation order.
- `shared-link-receiver-ux/08-readiness-risks-open-questions.md` — source risk log; root `09`/`11` carry forward stop gates.
- `shared-link-receiver-ux/09-validation-qa-acceptance-gates.md` — detailed matrix; `15` wins for receiver test spec.
- `shared-link-receiver-ux/10-agent-handoff-and-execution-sequence.md` — historical file ownership; root `09` and receiver `13`/`15` win for order.
- `shared-link-receiver-ux/14-third-pass-quality-review.md` — process archive.
- `shared-link-manager/appendix-industry-comparison.md` — benchmark reference.
- `shared-link-manager/appendix-technical-analysis.md` — architecture reference; verify against source before editing.
- `collaboration-invite/appendix-ux-signifiers-and-visibility.md` — detailed signifier reference; root `09` chooses when to implement signifiers.

## Current Code Surfaces to Re-Verify Before Editing

- `/share/[token]`: `src/app/share/[token]/page.tsx`
- Receiver estimate UI: `src/components/share/SharePageTabs.tsx`, `ShareEstimateTreePanel.tsx`, `ShareEstimateTreeView.tsx`
- Receiver interactions: `src/components/share/SharePageDecision.tsx`, `SharePageComments.tsx`, `SharePageSessionBanner.tsx`
- Public share APIs: `src/app/api/share/[token]/*`
- Publication core: `src/lib/publication/actions.ts`, `public-repository.ts`, `security.ts`, `types.ts`
- Invite entry: `src/app/invite/[token]/page.tsx`, `accept/route.ts`, `continue/route.ts`
- Invite core: `src/lib/collaboration/actions.ts`, `invite-entry.ts`, `pending-invite.ts`, `types.ts`
- Shared project surfaces: `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/LiveProjectCard.tsx`, `projects-page-client.tsx`, `MainSidebar.tsx`, `WorkshopHomebaseClient.tsx`, `ProjectTeamspaceHeader.tsx`

## Current Test Surfaces to Re-Verify

- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-publication-decision.test.tsx`
- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-public-repository.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/share/reconstruct-share-tree.test.ts`
- `tests/vitest/project-invite-feature-flag.test.ts`
- `tests/vitest/project-invite-entry-schema.test.ts`
- `tests/vitest/projects-page-shared-access.test.tsx`
- `e2e/project-invite-entry.spec.ts`
- `e2e/shared-link-receiver.spec.ts`
