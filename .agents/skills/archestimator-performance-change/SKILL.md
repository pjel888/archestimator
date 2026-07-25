---
name: archestimator-performance-change
description: "Guide performance-sensitive Archestimator changes involving loading, mounting, streaming, Suspense, prefetch, caching, server and client boundaries, bundles, or route transitions. Do not use for ordinary changes without a performance claim."
---

# Archestimator Performance Change

## Authority

- Read `AGENTS.md`, `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`, and `.ai/00_system/VALIDATION_MATRIX.md`.
- Follow numeric budgets only from `.ai/01_roadmap/27-performance-budget-and-regression-gates.md`; never copy them into this skill.
- Read the relevant installed Next.js 16 guide under `node_modules/next/dist/docs/` before changing framework APIs or conventions.

## Workflow

1. State the user-visible performance claim, affected execution path, baseline evidence available, validation decision, and stop condition.
2. Inspect `git status --short --branch`. Map the direct and transitive path. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Identify the actual bottleneck or regression mechanism before optimizing. Preserve server-first data flow, explicit Suspense boundaries, stable mount behavior, and current cache or invalidation contracts.
4. Prefer deletion, reduced work, narrower client boundaries, existing concurrency, and existing instrumentation over new caches, wrappers, dependencies, or speculative memoization.
5. Change one evidence-supported bottleneck at a time and reread shared files before edits.

## Boundaries

- Stay on the current branch and worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unfamiliar changes.
- Keep provider changes within resources bound by current `wrangler.jsonc`; do not deploy, purchase services, mutate unrelated Cloudflare projects, or touch legacy `supabase/migrations/` without explicit authority.
- Inherit automatic `Q0_CONTRACT_ONLY` through `Q3_RELEASE_GATE`
  classification and run every selected local performance, test, build,
  browser, screenshot, Storybook, and visual-QA layer under standing
  authorization.

## Evidence And Stop

- Use focused source and diff inspection plus available type, LSP, lint, static analysis, or non-test dry-run evidence. Do not claim a performance improvement from code shape alone; label it as an implementation change until measured.
- Stop when the stated mechanism is coherently changed, behavior contracts remain intact, the requested claim has the strongest authorized evidence available, and remaining measurement risk is explicit.
