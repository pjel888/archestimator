# Landing Validation Stale Tests And Repo Lint Blockers

Date: 2026-06-10
Status: open
Classification: validation-blocker

## Evidence

During the landing diagram connector fix on branch `codex/landing-page-new`,
the closest landing-focused Vitest command failed:

```bash
bunx vitest run tests/vitest/landing-amigo-redesign.test.tsx tests/vitest/landing-company-proof.test.ts --maxWorkers=1
```

Failures were stale-current-branch expectations unrelated to the connector
coordinate edit, including old header labels (`Workflow`, `Insights`), old hero
headline copy, old section ordering expectations, and an old company proof rail
background token (`bg-[#f8f6f1]` versus current `bg-[#f6f2ec]`).

The full lint command also failed:

```bash
bun run lint
```

It reported existing repo-wide errors in unrelated surfaces, including `.omx`
runtime plugin template files, `src/components/ui/bulk-action-toolbar.tsx`,
`src/components/ui/overlays/command-dialog.tsx`, and
`src/stories/navigation/tabs.stories.tsx`. The changed landing component had no
lint errors, only existing unused local path-string warnings.

## Impact

These blockers prevent using the broad landing test pair and full repository
lint as clean acceptance gates for small landing-page fixes. They do not appear
to be caused by the connector coordinate change.

## Proposed Fix

Refresh the stale landing tests to match the current `codex/landing-page-new`
landing copy/navigation/section structure, and either exclude generated/runtime
plugin caches from repo lint or clean the unrelated lint errors intentionally in
a separate quality pass.

## Verification Plan

- Re-run the stale landing test pair after expectations are updated.
- Re-run `bun run lint` after lint scope or unrelated errors are repaired.
- Keep changed-file lint and browser visual smoke as the narrow acceptance gate
  for coordinate-only landing diagram fixes until this blocker is closed.
