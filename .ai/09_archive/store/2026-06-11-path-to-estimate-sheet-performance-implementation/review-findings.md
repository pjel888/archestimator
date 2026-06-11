# Independent Review Findings — 2026-06-11

Method: 25-agent multi-lens adversarial workflow over `git diff 626d44a..HEAD` (lenses: React correctness, security/auth, performance-regression skeptic, API/test contracts). Every finding was independently re-verified by a refutation agent. 16 confirmed (most are explicit validations), 5 dismissed as unfounded.

## Actionable findings → dispositions

| Finding | Severity | Disposition |
|---------|----------|-------------|
| Lazy library cache staleness: sidebar mutations never invalidated `["workspace-component-library"]`, so remounts within staleTime re-seeded from pre-mutation data | HIGH | **FIXED**: `onLibraryDataChanged` prop fired at all 8 server-confirmed mutation handlers (create/edit/delete/undo/bulk-delete component; create/rename/delete template) → `queryClient.invalidateQueries` in EstimateSheetContent; wiring pinned by contract test |
| `getComponentImageUrl` import shadowed a same-named re-export with a different param type | MEDIUM | **FIXED**: aliased to `getMaterialCardImageUrl` at the activity-history import |
| `BLANK_ESTIMATE_ROW_*` labels duplicated between activity-composer.ts and activity-history.tsx | MEDIUM | **FIXED** (duplication pre-dated this run — composer had private copies at base; now lib exports the single source and the component imports/re-exports) |
| CommandPalette empty-vs-sidebar-sample inconsistency during lazy load | noted in verdict | Accepted: intentional per U4 directive (production lazy path must never show sample data; sidebar only mounts after data resolves, so sample never shows in production either) |

## Validations confirmed by reviewers (no action)

- CSS scoping safe both directions (react-complex-tree → workshop only; lenis → landing only), with consumer greps.
- Lazy query gating correct, no request waterfall (tree and library queries independent).
- U2 column narrowing safe: no consumer of dropped columns; Pick types + select strings in two-way parity; compile-time enforced.
- Cursor isolation genuinely complete (hook state local to the layer; verified render counts).
- Landing auth display change preserves all security boundaries; protected routes' fail-closed validation untouched.
- Memo comparator complete: all 11 callbacks identity-checked, per-item slices for editableRows/selection.
- Test edits relocate/strengthen coverage rather than weaken it (verified per file).

## Dismissed (refuted by verification agents)

- "Missing dependency array in useInsertionEffect" (intentional run-on-every-render ref update)
- "EstimateSheetCursorLayer stale surface memory leak" (cleanup correct)
- "Extracted exports not re-exported" (public surface verified preserved)
- "ComponentLibrarySidebarFallback unstable callback" (not memoized, renders only in fallback state)
- "projectTotal memoization" (confirmed correct, flagged only as validation)
