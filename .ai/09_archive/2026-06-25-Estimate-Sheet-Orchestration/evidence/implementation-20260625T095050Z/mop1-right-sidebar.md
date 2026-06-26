---
title: MOP-1 Right Sidebar Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-1 Right Sidebar Evidence

## Scope

Implemented the right-sidebar persistence-honesty slice:

- Component delete affordances now archive through existing server actions
  `previewBulkArchiveLibraryComponents` and
  `executeBulkArchiveLibraryComponents`.
- The sidebar no longer exposes local-only component Edit/Duplicate actions.
- Project-source search uses an explicit latest-request id before applying
  async results.
- Project-source preview copy now describes snapshot insertion rather than a
  live/read-through source.
- The local-only empty custom template group creator was removed from the
  right sidebar; no replacement table was added.
- Add-component duplicate detection normalizes whitespace and preserves the
  existing name + category + (supplier OR brand) identity contract.
- Telemetry tests lock that raw project-source search text is not emitted
  through the existing sanitized telemetry sink.

No migration, hosted write, provider setting change, durable telemetry store,
restore UI, browser automation, production deploy, or paid add-on was added.

## RED Evidence

Command:

```bash
bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1
```

Result before implementation: failed as expected.

- Bulk action still exposed `Delete selected components` and local-only copy.
- Component row context menu still exposed local-only Edit/Duplicate/Delete.
- Project-source preview still showed `Live source` and `Read-through source`.
- Duplicate detection missed `Door    Hinge` vs `Door Hinge`.
- A late focused RED pass on `tests/vitest/component-library-ui.test.tsx`
  failed because `Add Template Group` was still present.

The telemetry raw-query assertion already passed against the existing
sanitizer; it remains a regression lock rather than a RED.

## GREEN Evidence

Commands after implementation:

```bash
bun x vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Results:

- Focused MOP-1 tests: passed, 3 files / 105 tests.
- Type-check: passed.
- `git diff --check`: passed.

Vitest emitted the known Node `module.register()` deprecation warning; no test
failed on that warning.

## Follow-Up Boundaries

- Restore is not shown in the right sidebar because no persisted restore path
  was wired here; archive success does not offer Undo.
- Durable rollout telemetry remains unselected. The current implementation only
  preserves the existing sanitized telemetry sink behavior and privacy tests.
- MOP-1 did not resolve hosted migration drift recorded in MOP-0.
