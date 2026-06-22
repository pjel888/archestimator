# Second-Pass Test Loop Completeness Review

Date: 2026-06-22

Scope: read-only audit of `testing-loop-and-validation.md`, `post-fix-scenario-tests.md`, `canonical-feature-status.csv`, and current tests under `tests/vitest`, `tests/unit`, and `e2e`. No broad validation was run. No canonical UX audit files were modified.

## Executive Finding

The pack has a useful feature-to-test inventory, but it is not yet a complete user-story test loop. Every major story group has at least a related automated test path, but several groups do not have a concrete end-to-end or post-fix scenario path that proves the user experience described in the CSV.

The first-pass status mostly overclaims through wording: "Mapped to existing tests" often means a nearby component, contract, schema, or route test exists. It does not necessarily mean the full actor story, post-fix behavior, provider state, browser layout, or operational recovery path has been executed.

## Evidence Reviewed

- `canonical-feature-status.csv`: 55 story rows across public site, auth/legal, workshop shell, settings/account/admin, projects, estimates, estimate sheet, library, charts/data/location, collaboration, publication/share, proposal export, AI, notifications, feedback, and operations.
- `testing-loop-and-validation.md`: records inventory-only checks and explicitly avoids broad `bun run validate` because current state says it is red/hanging.
- `post-fix-scenario-tests.md`: lists 29 post-fix scenarios, but most are written as desired future proof rather than mapped to concrete current commands.
- Existing test inventory: `package.json` exposes `bun run test`, `bun run test:dom`, and `bun run test:e2e`; targeted file execution is available via Vitest/Playwright file arguments.

## Major Story Group Coverage

| Story group | Current concrete path | Completeness judgment |
|---|---|---|
| Public site and legal pages | Landing/contact/legal tests plus `e2e/landing-audit.spec.ts`. | Adequate for static route/copy smoke, incomplete for maturity-label drift and owner/legal readiness. |
| Auth, closed beta, Terms | Auth/closed-beta/terms Vitest files plus `e2e/auth.spec.ts`. | Good contract coverage; missing full hosted allowed/denied/revoked beta journey through Terms. |
| Workshop shell, home, settings | Sidebar/favorites/provider/dashboard/settings component tests. | Partial. Root error/not-found/global-error and full settings modal role discovery remain test gaps. |
| Account, workspace, admin | Schema/action tests and allowlist admin UI tests. | Partial. Good action coverage, but no live provider/admin queue proof. |
| Projects and dashboard | Projects page, grouping, favorites, create/edit/delete, dashboard UI tests. | Broad component coverage; missing one authenticated browser story covering create/edit/favorite/group/delete-preview route behavior. |
| Estimate list and sheet | Many estimate sheet/tree/tabs/cost/library/version tests plus E2E tabs/DnD/template specs. | Strongest local coverage after publication, but still lacks one joined user story from dashboard into sheet edit, reload, and persistence. |
| Library/templates | Library overview, component manager, folder, template, route tests. | Broad but context-light. Needs estimate-context insert/replace/unlink/promote story coverage. |
| Project data, charts, maps | Chart/data/location/map provider tests. | Partial. Chart lint reds and real Maps key/quota/tile failure are explicitly outside current proof. |
| Collaboration/invites/realtime | Collaboration action/schema/realtime tests, invite E2E, gated two-user E2E. | Partial. `e2e/teamspace-collaboration.spec.ts` exists but is environment-gated; stale presence/reconnect is not proven by default. |
| Publication/share | Heavy publication/share/security tests plus gated/fixture-dependent receiver E2E. | Strong contract coverage; receiver browser proof and Resend delivery remain provider/fixture dependent. |
| Proposal export | Export model/route/workbook/preview tests. | Good workbook contract coverage; incomplete for preview design-lint red and real Excel/Numbers readability. |
| AI | Extensive deterministic route/draft/apply/security tests plus live E2E file. | Boundary coverage only. Does not prove model quality or user trust; should remain beta/deferred in UX claims. |
| Notifications/feedback | Notification center/provider/action tests, feedback form/review tests, notification E2E. | Good local UI coverage; incomplete for fallback mailto payload preservation, pagination, inbox/support workflows, monitoring. |
| Operations/readiness | Readiness script tests and route performance specs. | Inventory exists, but no durable route-specific manifest that converts red/hanging broad validation into actionable release signals. |

## First-Pass Overclaims

- `testing-loop-and-validation.md` says "Recommended Execution Order For Full User-Story Testing," but the listed order is a category matrix, not a runnable manifest. It does not name exact commands, required env flags, fixtures, or pass/fail recording locations per story group.
- CSV `Testing Status` values like "Mapped to existing tests; source/static verified" overstate completeness when the matching tests are contract-level. Examples: settings modal discovery, project details dirty-close protection, stale library replacement, map quota failure, collaboration reconnect, Resend delivery, AI disabled/quota states, and operations monitoring.
- `post-fix-scenario-tests.md` presents 29 "as if fixed" scenarios, but several have no current focused test file or command target. The document should mark these as missing test additions, not just retest items.
- E2E coverage is sometimes counted as evidence even when specs are skipped or fixture-gated. `shared-link-receiver.spec.ts` is gated by `ARCHESTIMATOR_E2E_SHARED_LINK`; `teamspace-collaboration.spec.ts` is gated by `ARCHESTIMATOR_E2E_COLLABORATION` and Supabase service credentials.
- Provider proof is correctly called uneven, but the CSV still often pairs "Implemented" with "Mapped to tests" in ways that can be mistaken for launch-ready proof. Provider-dependent stories need an explicit `Not provider-proven` status.
- Broad validation blockers are acknowledged, but OPS-001 needs a replacement verification path. "Inventory verified; broad validate known red/hanging" is not enough for a beta release loop.

## Missing Targeted Scenarios To Add

1. Closed-beta auth journey: denied user, allowed user through Terms, revoked user, sanitized `next`, and cache/header expectations.
2. Root/workshop failure recovery: `not-found`, route `error`, root `global-error`, and branded safe navigation.
3. Settings role discovery: member vs admin sees account/workspace/support/legal/beta/admin affordances with role-aware explanations.
4. Project details dirty-close: backdrop, Escape, close button, pending image upload, save/stay/discard choices.
5. Project dashboard route story: create project, edit metadata/location, favorite, group/reorder, delete-preview with active publication warning.
6. Estimate sheet joined story: open from dashboard, switch tabs, add/edit/delete row, drag/reorder, insert component/template, observe totals/activity, reload persistence.
7. Library in-context story: browse/filter component, insert into estimate, mark project-specific, stale replacement warning, unlink/relink or promote back.
8. Map fallback story: missing key, script failure/quota failure, address-only edit path, privacy behavior for non-editors.
9. Two-user collaboration: manager/viewer roles, invite accept, role-limited controls, cursor/presence disconnect/reconnect.
10. Recipient share story: publish selected sheets, recipient opens link/password, comments/decision, owner rotate/revoke, old link fails closed with recovery copy.
11. Proposal export UX: preview design-lint/readability, large export preflight, generated workbook opens with expected tabs/totals/styles.
12. AI disabled/quota/provider/draft-expired states: no writes before explicit apply; recovery copy and audit metadata are visible.
13. Feedback/support loop: persistence failure preserves typed payload in fallback mailto; review queue has pagination/search beyond 50.
14. Concurrent error feedback: two async failures do not overwrite critical inline errors or collide toast ids.
15. Operations manifest: targeted commands for each story group, provider readiness checks separated from local source tests, and known broad-validation blockers quarantined.

## Recommended Targeted Commands

Use these as a starting manifest. They are intentionally narrower than `bun run validate`.

```bash
# Unit-only baseline
bun run test

# Public/auth/legal
bunx vitest run tests/vitest/landing-auth-state.test.ts tests/vitest/contact-form-mailto.test.tsx tests/vitest/auth-onboarding-guard.test.ts tests/vitest/auth-session-closed-beta.test.ts tests/vitest/legal-terms-gate.test.ts tests/vitest/terms-acceptance-panel.test.tsx --maxWorkers=1
bun run test:e2e -- e2e/auth.spec.ts

# Workshop shell/settings/projects/dashboard
bunx vitest run tests/vitest/workshop-dashboard-recent-favorites.test.tsx tests/vitest/workshop-settings-modal-content-view.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-group-mode.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/project-dashboard-route-shell-ui.test.ts tests/vitest/bulk-destructive-preview-modal.test.tsx --maxWorkers=1

# Estimate list/sheet/library
bunx vitest run tests/vitest/project-estimates-create-optimistic.test.tsx tests/vitest/project-estimates-delete-duplicate.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/template-gallery.test.tsx --maxWorkers=1
bun run test:e2e -- e2e/estimate-tabs.spec.ts e2e/estimate-tree-dnd.spec.ts e2e/workshop-template-insert-smoke.spec.ts

# Data/charts/maps/proposal export
bunx vitest run tests/vitest/project-data-a11y.test.tsx tests/vitest/project-charts-ui.test.tsx tests/vitest/project-charts-aggregation.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/project-location-map-provider.test.tsx tests/vitest/proposal-export-preview.test.tsx tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-workbook.test.ts --maxWorkers=1

# Collaboration/share/publication
bunx vitest run tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-realtime.test.ts tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/recipient-email-composer.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-security.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share/share-page-decision-anonymous.test.tsx --maxWorkers=1
# Provider/fixture-gated, run only when seeded:
ARCHESTIMATOR_E2E_COLLABORATION=1 bun run test:e2e -- e2e/teamspace-collaboration.spec.ts
ARCHESTIMATOR_E2E_SHARED_LINK=1 bun run test:e2e -- e2e/shared-link-receiver.spec.ts

# AI, notifications, feedback, operations
bunx vitest run tests/vitest/ai-ask-route.test.ts tests/vitest/ai-package-builder-route.test.ts tests/vitest/ai-package-builder-apply.test.ts tests/vitest/estimate-copilot-floating-button.test.tsx tests/vitest/notification-center.test.tsx tests/vitest/notifications-actions.test.ts tests/vitest/beta-feedback.test.ts tests/vitest/beta-feedback-form-ui.test.tsx tests/vitest/beta-feedback-review-ui.test.tsx tests/vitest/route-transition-readiness-script.test.ts --maxWorkers=1
bun run test:e2e -- e2e/notifications-center.spec.ts e2e/notifications-release-modal.spec.ts
```

## Status Changes Recommended For The Pack

- Replace generic "Mapped to existing tests" with one of:
  - `Concrete focused local test path exists`
  - `Related contract/component tests only`
  - `Browser proof required`
  - `Provider proof required`
  - `Post-fix test missing`
- Add a `Targeted command` or `Verification manifest ID` column, or create a separate manifest referenced by each CSV row.
- For each `UX-001` through `UX-029`, mark whether the current repo already has a test, needs a new Vitest/component test, needs Playwright, or needs provider/manual proof.
- Split operations into local source confidence vs provider/runtime confidence. Do not let readiness script existence count as monitoring, inbox, legal, or hosted proof.

## Stop Condition

This second-pass lane found no reason to run broad validation and did not modify canonical audit files. The next useful step is to convert the missing scenarios above into a targeted verification manifest and then add focused post-fix tests only for rows whose fixes are implemented.
