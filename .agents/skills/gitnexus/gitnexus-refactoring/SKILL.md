---
name: gitnexus-refactoring
description: Use an available GitNexus index to plan a high-risk rename, extraction, split, or move across Archestimator modules. Do not apply graph-generated edits blindly, do not use it for narrow local cleanup, and preserve the shared worktree and user-controlled test gate.
---

# GitNexus Refactoring

1. Reread shared files and inspect `git status --short`.
2. Confirm GitNexus availability and map direct callers, callees, and affected
   flows for the target.
3. Preview coordinated renames when the tool supports a dry run; otherwise use
   language-aware editor or compiler evidence rather than text replacement.
4. Edit in dependency order and reread shared files before each patch.
5. Review the diff and graph-reported change scope when available.
6. Use static, type, or LSP evidence by default. Run tests only for `TEST_TASK`.

Stop when references, imports, public contracts, and the requested behavior are
reconciled with fresh source evidence.
