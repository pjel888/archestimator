# Bug Plan Creation Playbook

Use this only for a material unresolved blocker, stale source-of-truth claim,
validation failure, provider-proof gap, merge conflict, or security issue that
needs durable follow-up. Do not create a bug plan for an issue resolved in the
same run or for an optional tool/test gap that does not block the deliverable.

## File

`.ai/15_Bugs/YYYY-MM-DD-<bug-slug>.md`

## Required Sections

- Title
- Classification
- Date discovered
- Discovery context
- Evidence
- Reproduction steps or command
- Expected behavior
- Actual behavior
- Suspected root cause
- Affected files/modules
- Impact
- Severity
- Blocks current work: yes/no
- Proposed fix
- Verification plan
- Status
- Related plan/run

## Classifications

`INTRODUCED_BY_THIS_WORK_BLOCKING`,
`INTRODUCED_BY_THIS_WORK_NON_BLOCKING`,
`PRE_EXISTING_BLOCKING`,
`PRE_EXISTING_NON_BLOCKING`,
`PLAN_GAP`,
`MERGE_CONFLICT`,
`REQUIRES_HUMAN_DECISION`,
`TOOLING_OR_ENVIRONMENT_BLOCKER`.
