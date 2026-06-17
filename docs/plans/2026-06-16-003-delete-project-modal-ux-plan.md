# Delete Project Modal UX Plan

## Goal

Simplify the project deletion confirmation modal so a user understands the action without seeing server-side checker language.

## Current issue

The modal currently frames deletion as a dependency preview and explains server-side checks. That is accurate internally, but it makes a normal delete decision feel technical and unclear.

## Design contract

- Follow `DESIGN.md`: compact SF Pro product UI, neutral palette, 3px radius, thin borders, no decorative depth.
- Use plain task copy: consequence, blocker reason, and required confirmation.
- Preserve the destructive safety gate while treating active shared links as revoke-on-delete warnings.
- Do not weaken server-side validation or deletion RPC behavior.

## Implementation

1. Update `BulkDestructivePreviewModal` to present:
   - a concise consequence line;
   - a human-readable status strip;
   - blocked items as "Needs attention" rather than server check output;
   - typed confirmation with a clear disabled-action hint.
2. Update `/workshop/projects` delete modal description to remove server-side/internal wording.
3. Add/adjust tests that assert the modal avoids "server-side", "dependency preview", and "execution" language while preserving genuine blockers, active-link warnings, and confirmation behavior.

## Verification

- `bunx vitest run tests/vitest/mass-deletion-ui-contract.test.ts tests/vitest/bulk-destructive-preview-modal.test.tsx --maxWorkers=1`
- `bun run type-check`
- `bunx eslint src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/projects-page-client.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx`
- `git diff --check`
