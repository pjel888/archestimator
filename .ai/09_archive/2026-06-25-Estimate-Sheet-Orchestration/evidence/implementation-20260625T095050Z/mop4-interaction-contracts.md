---
title: MOP-4 Shared Interaction and Feedback Contracts Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-4 Shared Interaction and Feedback Contracts Evidence

## Scope

Implemented the local shared interaction-contract slice:

- Added a shared library item insert contract in
  `src/components/workshop/estimate-sheet/rows/constants.ts` for the
  `archestimator:add-library-item` event, library drag MIME payloads, and
  accepted/rejected payload results.
- Replaced ad hoc library drag `JSON.parse` consumers in center row drop zones,
  row table, and row cells with the guarded shared parser.
- Added shared template and project-source custom-event detail validators in
  `src/components/workshop/component-library/templates.ts`.
- Updated right-sidebar insert fallback to emit through the shared
  `dispatchAddLibraryItemEvent` helper so success/recents update only after the
  center acknowledges the insert.
- Updated center custom-event consumers to reject malformed library/template/
  project-source details without mutation; malformed library events emit
  sanitized `insert_payload_rejected` telemetry.
- Added read-only guards to center insert/replace/template/project-source/blank
  row entry points and record sanitized `authz_denied` telemetry for denied
  library mutations.
- Preserved project-source insert target semantics while keeping the MOP-2
  revision gate on returned full-tree application.
- Fixed two adjacent jsdom-exposed regressions while proving the contracts:
  checkbox handlers now capture `checked` before state updater execution, and
  `TreePanelHeader` uses an explicit `role="search"` container instead of the
  experimental `<search>` tag.

No hosted Supabase migration, provider setting change, production deploy,
browser automation, paid add-on, or destructive hosted data operation was used.

## RED Evidence

Focused MOP-4 tests failed before implementation on the intended missing
contracts:

- No shared library item drag/custom-event parser existed.
- Malformed custom add-library events were not rejected through an acknowledged
  event contract and telemetry path.
- Viewer/read-only custom add-library events could still reach mutation paths.
- Right sidebar success/recents fallback was not tied to center acceptance.
- Template and project-source custom-event detail validation remained local and
  permissive.

An expanded cost-input run also exposed two adjacent issues during MOP-4
verification:

- React checkbox handlers read `event.currentTarget.checked` inside state
  updater callbacks.
- The tab search panel used the experimental `<search>` element, which jsdom did
  not expose consistently as the `search` role.

## GREEN Evidence

Commands after implementation:

```bash
bun x vitest run tests/vitest/estimate-library-item-insert-contract.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-library-item-insert-contract.test.ts tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/reusable-source-drag.test.ts tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-workspace-client-cache.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```

Results:

- Parser/event contract test: passed, 1 file / 5 tests.
- Center library insert contract suite: passed, 1 file / 27 tests.
- Cost-input interaction suite: passed, 1 file / 40 tests.
- MOP-4 matrix: passed, 6 files / 92 tests.
- Authz/telemetry guardrails: passed, 2 files / 16 tests.
- Cache/selection-adjacent guardrails: passed, 2 files / 13 tests.
- Type-check: passed.
- `git diff --check`: passed.

Vitest emitted the known Node `module.register()` deprecation warning; no test
failed on that warning.

## Follow-Up Boundaries

- The telemetry sink remains the existing in-process sanitized
  `recordLibraryEvent` sink from MOP-0; no durable telemetry table or provider
  write was introduced in this slice.
- Browser drag-and-drop proof was intentionally not run. The claims verified in
  this slice are parser, DOM custom-event, read-only authz, telemetry payload,
  jsdom interaction, type, and diff hygiene claims.
- Broader final package review, UltraQA, and before/after documentation remain
  MOP-5 work.
