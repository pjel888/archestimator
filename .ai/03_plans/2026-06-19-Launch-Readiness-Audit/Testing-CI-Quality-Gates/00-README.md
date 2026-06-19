# Launch-Readiness Audit — Testing, CI & Quality Gates

> Part of the **2026-06-19 Launch-Readiness Audit** (sibling packs under
> `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/<Pack>/`). This pack is **deletable**: it is a
> findings/plan surface, not durable product state. If Philip rejects it, delete the
> folder; nothing in the app depends on it.

## Owner / user job this protects

Philip is opening Archestimator to **closed-beta external users**. The job this pack
protects is: *"every change merged before/during beta is gated by an automated signal
that actually runs and actually goes green, so a regression in auth, RLS, export, share,
or publication cannot silently ship to real users."* Today that signal exists on paper
(`.github/workflows/ci.yml` + `bun run validate`) but **has not executed on `main` in
~a month and cannot go green locally** — so the gate is decorative.

## Routes / screens affected (by remediation, not by findings)

None directly — this is CI/tooling/test-config work. Remediation touches:
`.github/workflows/ci.yml`, `eslint.config.mjs`, `vitest.config.ts`,
`playwright.config.ts`, `tsconfig.json`, `package.json` scripts, and the 3 source files
holding the lint reds (`src/components/sidebar/useLiquidGlassRefraction.ts`,
`src/components/workshop/projects-page-client.tsx`,
`src/components/sidebar/MainSidebar.tsx`). The design-lint red sits on `MainSidebar.tsx`
icon weight — **advise, do not block** (DESIGN.md is an alpha guide).

## Non-goals

- Not rewriting the test suite (coverage is genuinely strong: ~372 dom + 18 e2e + 5 unit
  specs covering auth/RLS/publication/share/export). The problem is the **gate**, not the
  tests.
- Not adding Sentry/Turnstile/PITR (owned by Observability + DB packs).
- Not enforcing DESIGN.md contrast/icon rules as launch blockers.
- Not standing up a full hosted-Supabase ephemeral CI environment for authenticated e2e
  (proposed as a follow-up, not a beta blocker).

## Files expected to change during remediation

- `.github/workflows/ci.yml` — add `timeout-minutes`, split/gate steps, decide whether to
  fail-fast on lint vs. report; confirm the workflow actually triggers.
- `eslint.config.mjs` — add `.gitnexus/**` to `globalIgnores` (local-only require() noise).
- `src/components/sidebar/useLiquidGlassRefraction.ts`,
  `src/components/workshop/projects-page-client.tsx` — fix the 3 real `react-hooks`
  lint errors that block `bun run validate`.
- `vitest.config.ts` — (optional) coverage reporting; investigate the all-DOM hang.
- `.ai/10_state/current-state.md` — update the stale known-red description (it names
  `ProposalExportPreviewDialog` design-lint + "charts set-state-in-effect"; both have
  moved — see findings TESTING-02).

## Validation gate for remediation

Tier 0 + Tier 1 from `.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/14_TESTING_AND_VALIDATION_PROTOCOL.md`:
`bun run type-check` (passes today) → `bun run lint` (must reach 0 errors) →
`bun run lint:design-system` (advisory) → `bun run build` → `bun run test` →
targeted `bun run test:dom` matrices. Then confirm one **green** CI run on a PR before
declaring the gate live.

## Loop-surface selection

This is HIGH-BLAST-RADIUS adjacent (release-readiness / quality-gate), so remediation runs
as a lightweight in-session loop with a recorded ledger here; a dated LOOP_LEDGER.md is
warranted if the CI-trigger investigation turns into multi-session work. Codex review gate
applies to the ci.yml change (release surface).

## Durable-state path

Durable findings/decisions belong in `.ai/10_state/current-state.md` and
`.ai/10_state/decisions.md`. This folder is the scratch/plan surface and is safe to delete.

## Deletion criteria

Delete this pack if Philip decides (a) CI stays advisory-only for beta and the known-reds
are accepted as documented debt, or (b) the findings are folded into the parent
`2026-06-19-Launch-Readiness-Audit` rollup. No code depends on this folder.
