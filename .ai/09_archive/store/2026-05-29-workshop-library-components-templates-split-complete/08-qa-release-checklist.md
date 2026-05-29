# 08 QA and Release Checklist

## Before Coding

- [ ] Confirm this plan is approved.
- [ ] Confirm active branch and dirty worktree:
  - `git status --short --branch`
- [ ] Identify unrelated proposal/export files and do not stage them.
- [ ] Run GitNexus impact checks for touched symbols.
- [ ] Start with focused failing tests.

## During Coding

- [ ] Keep changes route-scoped.
- [ ] Remove dropdown UI and state/functionality together.
- [ ] Do not leave hidden `RowCollectionSelect` behavior.
- [ ] Keep folder create/rename/delete/reorder working.
- [ ] Keep supplier organization working.
- [ ] Keep `/workshop/components` redirect.
- [ ] Keep estimate-page sidebar template insertion untouched.
- [ ] Keep app/workshop typography at or below 12px.

## Focused Verification

- [ ] Component manager UI tests pass.
- [ ] Workshop library consolidation tests pass.
- [ ] Reset baseline test passes.
- [ ] Template route/manager tests pass.
- [ ] Repository helper tests pass for component-only and template-only helpers.
- [ ] Estimate sidebar template insertion regression passes.
- [ ] Existing component-library sidebar guardrail test passes if sidebar controls or shared component-library utilities are touched.

## Full Verification

- [ ] `bun run validate` passes.
- [ ] `git diff --check` passes.
- [ ] `gitnexus detect-changes --scope staged` reviewed.
- [ ] Browser smoke passes for:
  - `/workshop/library`
  - `/workshop/templates`
  - `/workshop/components` redirect

## Manual QA Notes

Record these in the final implementation closeout:

- Which dev server/port was used.
- Whether dev auth bypass was used.
- Whether `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` was required.
- Exact focused test counts.
- Full validation output summary.
- Any existing warnings unrelated to the change.

## Commit Hygiene

- [ ] Stage only files directly needed for this plan.
- [ ] Verify staged files:
  - `git diff --cached --name-only`
- [ ] Use Lore commit protocol.
- [ ] Include `Co-authored-by: OmX <omx@oh-my-codex.dev>` trailer if using OMX closeout pattern.
- [ ] Push only the intended branch.

## Done Definition

The implementation is done only when:

- `/workshop/library` is component-only.
- the wrong dropdown and all its state/functionality are removed.
- right-sidebar copy matches the requested labels.
- `/workshop/templates` exists and behaves as a template-focused sibling page.
- estimate-sidebar template insertion remains intact.
- tests and browser smoke prove the route split.
- `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` reflect the new route truth.
