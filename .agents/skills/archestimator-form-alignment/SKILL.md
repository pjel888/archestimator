---
name: archestimator-form-alignment
description: "Align form labels, controls, helper or error rows, dropdown affordances, and paired fields on authenticated Archestimator product routes, especially /workshop/library. Do not use this skill to constrain public or otherwise unauthenticated routes, including / and /new, and do not run browser, Storybook, build, or automated test evidence unless the user explicitly requests it."
---

# Archestimator Form Alignment

## Public Route Bypass

This skill has no authority over forms on routes that render without a valid
authenticated session. Public forms may use any visual structure or component
strategy directed by the current user; do not load `DESIGN.md` or apply this
skill's alignment contract to them unless the user explicitly asks for it.

## Authority

- For authenticated form work, read `AGENTS.md`, `DESIGN.md`, and
  `.ai/00_system/VALIDATION_MATRIX.md`.
- Inspect the current shared primitives in `src/components/ui/control-input.tsx`, `src/components/ui/control-input-base.tsx`, `src/components/ui/creatable-combobox.tsx`, and `src/components/ui/dropdown-select.tsx` before adding local chrome.
- Use `src/components/workshop/component-library-manager/AddComponentModal.tsx` as the named starting surface when the request concerns the Add Component flow.

## Workflow

1. Define the target alignment, affected rows, cheapest non-test evidence, and stop condition.
2. Inspect `git status --short --branch`; preserve unfamiliar work. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Treat each shared row as one contract: align label baselines, control tops and heights, helper or error slots, and responsive wrapping together.
4. Prefer the shared control primitives and shared padding or inset rules. Reserve message space when conditional helper or error text would otherwise move adjacent controls. Keep dropdown icons and inline clear buttons away from borders.
5. Make the smallest coherent shared fix; avoid per-field transforms, arbitrary margins, or duplicated field wrappers.

## Boundaries

- Stay on the current branch and worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unrelated changes.
- Keep any provider-adjacent work inside resources bound by current `wrangler.jsonc`; never change legacy `supabase/migrations/`, unrelated Cloudflare projects, paid services, or external deployments without explicit authority.
- Default to `NOT_REQUIRED`. Do not create or run tests, builds, browser automation, screenshots, Storybook, or visual QA unless explicitly requested for the current task. Use `TEST_PROPOSAL` with the exact command when additional testing would materially reduce risk.

## Evidence And Stop

- Verify the edited source, focused diff, and available type, LSP, lint, or static-contract evidence that does not cross the test gate.
- Stop when the shared row contract is consistent across the affected surface, no one-off offset remains, and the final report names the evidence run and any honest proof gap.
