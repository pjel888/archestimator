# Deployment, Migration, and Rollback Plan

## Current task boundaries
No deployment, migration, feature flag, package, runtime config, provider, GitHub settings, or Notion changes occur in this plan-refinement task.

## Future deployment considerations
- Agent framework docs/payload changes can ship as docs-only commits.
- PR/CI/GitHub rulesets must move from advisory to enforced only after dry-runs pass and Philip approves.
- Provider proof gates remain manual/external until scripts are explicitly approved.

## Rollback for agent instruction changes
- Commit Phase 1 docs/payload/harness changes separately.
- Revert the smallest commit if an adapter causes agent confusion.
- Keep `.ai` source-of-truth intact even when reverting a tool-specific adapter.

## Rollback for GitHub rulesets/protection
- Start with advisory/evaluate mode.
- Preserve admin/emergency bypass for Philip.
- Document exact ruleset names/settings and rollback toggle before enforcement.
- If rules block urgent recovery, relax rulesets and record incident.

## Rollback for CI workflows
- Separate docs-compliance checks from runtime validation.
- Keep feature-branch CI fast.
- Disable or downgrade flaky/heavy checks before broad enforcement.

## Rollback for Notion drift
- `.ai` always wins.
- Correct Notion mirror content only after authorization; record mirror sync date and source commit.

## Post-deploy checks for future implementation
Verify branch/commit, `git diff --check`, relevant validations, payload schema compliance, run-log entry, bug links, and final report standard.
