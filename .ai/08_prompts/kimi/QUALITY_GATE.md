# Kimi Prompt Pack Quality Gate

Use this before handing the folder to Kimi and after Kimi returns worked folders.

## Pack-level requirements

- [ ] Root `README.md` exists.
- [ ] Root `COMMON_KIMI_OPERATING_PROTOCOL.md` exists.
- [ ] Root `PASS_COMPLETION_PROTOCOL.md` exists.
- [ ] Root `PROOF_BOUNDARIES.md` exists.
- [ ] Root `COORDINATION_MATRIX.md` exists.
- [ ] Root `DROP_IN_HANDOFF.md` exists.
- [ ] Root `LEAD_REVIEW_GUIDE.md` exists.
- [ ] Root `BLOCKERS_TEMPLATE.md` exists.
- [ ] Exactly nine task folders exist, ignoring any leading pass-result prefix.
- [ ] Each task folder has:
  - [ ] `PROMPT.md`
  - [ ] `CHECKLIST.md`
  - [ ] `REPORT.md`
  - [ ] `EVIDENCE.md`
  - [ ] `PATCH_NOTES.md`
  - [ ] `PASS_STATUS.md`
  - [ ] `PASS_HISTORY.md`
- [ ] Each `PROMPT.md` contains a dedicated `/goal`.
- [ ] Each `PROMPT.md` contains `DISCOVER`, `PLAN`, `EXECUTE`, `VERIFY`, `REPORT`, and `DECIDE`.
- [ ] Each `PROMPT.md` contains a `Pass completion` section.
- [ ] Every pass-completion section names the expected first-pass `Completed`, `Blocked`, and `Failed` folder names.
- [ ] No task prompt instructs Kimi to mutate production by default.
- [ ] Provider work is gated on target-project confirmation and preflight evidence.
- [ ] Reports are required in the same task folder.
- [ ] Proof boundaries are labeled precisely.
- [ ] `PASS_STATUS.md` templates do not preselect `Completed`, `Blocked`, or `Failed`.
- [ ] Task prompts derive the current folder from the base folder and do not depend on the unprefixed folder path after pass 1.

## Suggested verification commands

Run from the repository root:

```bash
find .ai/08_prompts/kimi -mindepth 1 -maxdepth 1 -type d | wc -l
```

Expected for an unused pack: `9`.

```bash
find .ai/08_prompts/kimi -mindepth 1 -maxdepth 1 -type d | sort | while read -r d; do
  for f in PROMPT.md CHECKLIST.md REPORT.md EVIDENCE.md PATCH_NOTES.md PASS_STATUS.md PASS_HISTORY.md; do
    test -f "$d/$f" || echo "missing $d/$f"
  done
done
```

Expected: no output.

```bash
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "/goal"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "Pass completion"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "1st-Pass-Completed__"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "1st-Pass-Blocked__"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "1st-Pass-Failed__"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "DISCOVER"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "PLAN"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "EXECUTE"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "VERIFY"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "REPORT"
find .ai/08_prompts/kimi -mindepth 2 -maxdepth 2 -name PROMPT.md -print0 | xargs -0 rg --files-without-match "DECIDE"
```

Expected: no output.

```bash
term_a="$(printf 'T%sD' B)"
term_b="$(printf 'TO%sO' D)"
term_c="$(printf 'fill in det%s' ails)"
rg -n "$term_a|$term_b|$term_c" .ai/08_prompts/kimi --glob '!QUALITY_GATE.md'
rg -n "/Users/" .ai/08_prompts/kimi --glob '!QUALITY_GATE.md'
bad_status="$(printf 'Result: `Not %s`' started)"
bad_destination="$(printf 'Intended folder after rename: `%s' '1st-Pass-Completed__')"
rg -n "$bad_status|$bad_destination" .ai/08_prompts/kimi --glob '!QUALITY_GATE.md'
rg -n "Label one:" .ai/08_prompts/kimi/*/EVIDENCE.md
label_a="$(printf 'local-%s' db)"
label_b="$(printf 'provider-%s' proven)"
rg -n "$label_a|$label_b" .ai/08_prompts/kimi --glob '!QUALITY_GATE.md'
```

Expected: no output for placeholder phrases, absolute machine-local paths, preselected pass results, or task-local proof-boundary enums.

```bash
git diff --check -- .ai/08_prompts/kimi
```

Expected: no output.

## Post-Kimi double-check

For each returned folder:

1. Compare folder name to `PASS_STATUS.md`.
2. Confirm prefix format is `<ordinal>-Pass-<Result>__<base-folder>`.
3. Confirm `PASS_HISTORY.md` has an append-only entry for this pass.
4. Confirm `REPORT.md` final status matches the prefix result.
5. Confirm `EVIDENCE.md` contains command evidence or clear skipped-check rationale.
6. Confirm `CHECKLIST.md` has checked items or blocked items.
7. Confirm `PATCH_NOTES.md` exists and is updated if Kimi changed source.
8. Confirm `BLOCKERS.md` exists for blocked passes.
9. Confirm Kimi did not claim provider/browser/production proof from local-only checks.
10. Confirm Kimi did not edit unrelated dirty files or revert other agents.
