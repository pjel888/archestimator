# React Doctor Warning Cleanup

Date: 2026-06-23

## Current Evidence

- Error diagnostics are cleared in `/tmp/react-doctor-after-rls.json`.
- Remaining diagnostics are warnings only.
- React Doctor was scanning product source plus non-product archives and local tooling; those are not runtime application code and should not drive React refactors.

## Cleanup Order

1. Keep React Doctor focused on app-relevant code by ignoring archived/design/tooling folders.
2. Fix warnings that are local, behavior-preserving, and verifiable with type-check/static scan.
3. Treat structural warnings (`unused-export`, `unused-file`, `only-export-components`, `no-giant-component`) as planned refactors unless a usage check proves the deletion/split is safe.
4. Avoid broad async or state rewrites without behavior-specific tests.

## Verification

- Run `bun run type-check` after source edits.
- Run React Doctor JSON scans after each warning batch.
- Use targeted tests only when a warning fix changes runtime behavior.
