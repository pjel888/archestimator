# Blast Radius And Risk Analysis

**Date:** 2026-06-06
**Scope:** Future UI library + Storybook implementation.

## Affected User Flows

Storybook-only MVP should not affect production user flows. Future package/config changes may affect local dev/build tooling. Future component extraction may affect:

- workshop project list/create;
- estimate workspace tree and sheet;
- component library manager;
- shared link review UI;
- project charts;
- notification/release modal UI;
- settings/profile/workspace pages;
- login/legal support surfaces if shared primitives are changed.

## Affected Modules

Potential future modules:

- `src/components/ui`
- `src/components/workshop`
- `src/components/share`
- `src/features/notifications`
- `src/components/sidebar`
- `src/components/landing`
- `src/app/globals.css`
- `scripts/enforce-app-design-system.mjs`
- `package.json`
- `.storybook`
- `tests/vitest`

## Graph Evidence

| Tool | Finding | Risk use |
|---|---|---|
| GitNexus | `Button`: CRITICAL, 107 impacted nodes, 13 processes, 13 modules. | Treat Button API/styling changes as high-risk. |
| GitNexus | `SearchInput`: CRITICAL, 27 impacted nodes, 2 processes, 6 modules. | Treat search primitive changes as high-risk. |
| GitNexus | `WorkshopTree`: HIGH, 8 impacted nodes. | Defer tree migration until Storybook/domain stories and targeted tests exist. |
| GitNexus | Share tree renderers: LOW, 1 impacted node each. | Good candidate for isolated domain stories, not app migration. |
| code-review-graph | Representative UI/tree/package files: high, 500 impacted nodes, 128 files. | Package/shared UI surface needs phased rollback points. |
| code-review-graph | Affected flows for representative files: 0. | Useful but not enough to weaken direct symbol risk. |

## Risk Matrix

| Risk | Severity | Likelihood | Mitigation | Rollback |
|---|---|---:|---|---|
| Storybook package incompatibility with Next.js 16/React 19 | High | Medium | Re-check official docs; choose `nextjs-vite` vs `nextjs`; isolate in one commit. | Revert package/config commit. |
| Tailwind/global CSS drift | High | Medium | Import existing `src/app/globals.css`; do not alter app tokens casually; run design lint. | Revert CSS/config changes. |
| Design-system lint conflict | High | Medium | Add stories/components using current tokens and allowed classes. | Revert component commit; update docs if linter needs new rule. |
| Shared primitive visual regression | High | High | Add stories before production migration; targeted tests; graph impact. | Revert primitive commit. |
| Bundle/dependency bloat | Medium | Medium | Gate Flowbite, Motion, Radix, Storybook test addons separately. | Remove dependency and lockfile changes. |
| Icon inconsistency | Medium | High | Use Phosphor app wrapper; reconcile `components.json` lucide default. | Revert icon wrapper/map changes. |
| Flowbite paid-content/privacy leakage | High | Medium | Public docs only unless approved; never store paid screenshots/source/credentials. | Remove leaked material; create security bug. |
| Aceternity Motion dependency risk | High | Medium | Landing-only by default; reduced-motion and performance gate. | Revert motion dependency/effect commit. |
| shadcn/Radix dependency expansion | Medium | Medium | Use existing context-menu first; approve new Radix packages. | Revert dependency/component commit. |
| Storybook app-directory/Next risk | High | Medium | Set `nextjs.appDirectory: true`; mock navigation/auth/providers. | Revert or switch framework. |
| Visual drift from external styles | High | Medium | Adapt to `DESIGN.md`; prohibit alien Flowbite/Aceternity visual defaults. | Revert component; adjust token/story. |
| Accessibility regression | High | Medium | a11y docs/addon/play candidates; keyboard matrix. | Revert component; add test. |
| Merge conflicts | Medium | High | Keep commits scoped; avoid source migration. | Rebase carefully; never force push. |
| Agent misuse | High | High | `30_AGENT_UI_USAGE_RULES_DRAFT.md`; no app migration without approval. | Revert unauthorized migration; create bug plan. |

## Affected Tests

Existing relevant tests:

- `tests/vitest/ui-modal-tooltip.test.tsx`
- `tests/vitest/toast.test.tsx`
- `tests/vitest/header-icon-toolbar-ui.test.tsx`
- `tests/vitest/component-library-ui.test.tsx`
- `tests/vitest/component-library-manager-ui.test.tsx`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/project-estimates-table-inline-edit.test.tsx`
- `tests/vitest/share/reconstruct-share-tree.test.ts`
- `tests/vitest/release-announcement-modal.test.tsx`
- `tests/vitest/workshop-route-error-boundaries.test.tsx`

Future Storybook-specific tests are not present yet.

## Build And Runtime Behavior

Storybook package/config changes affect dev tooling and static Storybook build. The MVP should not affect production runtime behavior unless a future agent touches current app imports, which is out of scope.

## Future GitNexus/code-review Graph Requirements

Before modifying any shared primitive, domain component, or exported API:

1. Run GitNexus impact for the symbol.
2. Run code-review-graph impact/detect changes after edits.
3. Warn on HIGH/CRITICAL impact before proceeding with source edits.
4. Keep high-impact work in separate commits with targeted tests.
