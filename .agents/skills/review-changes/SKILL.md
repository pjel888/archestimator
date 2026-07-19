---
name: review-changes
description: Review an Archestimator worktree, branch diff, patch, or pull-request change set with findings grounded in current source. Use when asked for correctness, regression, security, performance, or maintainability review; do not implement fixes unless asked, treat graph metadata as proof, or run user-gated tests automatically.
---

<!-- ARCHESTIMATOR REPO-LOCAL OVERRIDE — additive; preserve through fleet 3-way merge. Do not delete. -->
> **ArchEstimator repo policy (override):** This skill's graph-first workflow applies to broad/high-risk/unfamiliar-code work. For narrow, reversible local edits, a focused `rg`/targeted-read/LSP check is sufficient — do not force full graph traversal or the token cap on small changes. Canonical authority: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` + `AGENT_FRAMEWORK_PROTOCOL.md`; `.ai` wins on any conflict.
<!-- END ARCHESTIMATOR REPO-LOCAL OVERRIDE -->

# Review Changes

Review the diff and current source first. Graph and test metadata are supporting
signals, not substitutes for reading the changed behavior.

## Workflow

1. Establish the review base and inspect `git status --short --branch`, the
   complete diff, and any untracked files in scope.
2. Read each changed function, class, route, schema, or workflow in its current
   source context. Follow direct callers and data boundaries only as far as the
   review claim requires.
3. Check the requested concerns plus repository safety, error handling,
   authorization, data integrity, concurrency, and compatibility where relevant.
4. Use GitNexus/code-review-graph change detection or impact analysis only for
   broad, unfamiliar, or transitive changes. Reconcile every graph finding with
   current source and the active diff.
5. Treat tests as evidence only when they were actually run and cover the
   changed claim. Do not create or run tests, builds as test gates, browser
   automation, screenshots, or visual QA without explicit current-task user
   authorization.

## Output

List actionable findings first, ordered by severity. Each finding must include a
clickable `path:line` reference, the concrete failure mode, why it matters, and
the smallest credible repair. Then state assumptions or evidence gaps and a
concise overall assessment. If there are no findings, say so and name any
verification that was not performed.
