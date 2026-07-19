---
name: refactor-safely
description: Reshape existing Archestimator code while preserving behavior and shared-worktree safety. Use for renames, extraction, deletion, consolidation, or structural cleanup; do not use for feature changes, speculative rewrites, new dependencies, blind find-and-replace, or unauthorized automated tests.
---

<!-- ARCHESTIMATOR REPO-LOCAL OVERRIDE — additive; preserve through fleet 3-way merge. Do not delete. -->
> **ArchEstimator repo policy (override):** This skill's graph-first workflow applies to broad/high-risk/unfamiliar-code work. For narrow, reversible local edits, a focused `rg`/targeted-read/LSP check is sufficient — do not force full graph traversal or the token cap on small changes. Canonical authority: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` + `AGENT_FRAMEWORK_PROTOCOL.md`; `.ai` wins on any conflict.
<!-- END ARCHESTIMATOR REPO-LOCAL OVERRIDE -->

# Refactor Safely

Prefer deletion, existing utilities, and current repository patterns. Keep the
diff small enough to review and reverse.

## Workflow

1. Define the behavior contract, scope, non-goals, and cheapest decisive
   evidence. For cleanup/deslop work, record a short cleanup plan before editing.
2. Inspect `git status --short --branch`, the active diff, and the complete
   source context around each target. Preserve unfamiliar concurrent changes.
3. Use source and targeted searches for narrow refactors. Add GitNexus or
   code-review-graph impact/flow analysis only when the code is unfamiliar,
   cross-cutting, or high risk; verify graph results against current source and
   surface high-risk blast radius before editing.
4. For symbol renames, use a language-aware or graph-aware rename and inspect
   every proposed edit. Never use blind text replacement.
5. Reread every shared target file immediately before applying the patch, then
   make one coherent behavior-preserving change at a time.
6. Inspect the final diff and affected callers. Use change detection for broad
   or transitive refactors, but treat current source and diff as primary proof.

## User Test Gate

- `NOT_REQUIRED` is the default: use source, diff, type/LSP, lint, static,
  dry-run, or narrow runtime evidence.
- `TEST_PROPOSAL` names the risk and exact command but does not run it.
- `TEST_TASK` exists only when the user explicitly requested testing for the
  current task; only then may tests be created or run.

Stop when behavior is preserved by the authorized evidence, expected files are
the only files changed, and remaining risk is explicit.
