# Agentic Development Protocol

## Phase gates
DEFINE -> DISCOVER -> DESIGN -> SETUP -> BUILD -> VALIDATE -> RELEASE.

## Required agent receipt
Every agent must state/record: mode, scope, non-goals, branch/worktree, dirty worktree status, required reading completed, graph check status, allowed/disallowed writes, validation gates, stop condition, provider/GitHub/Notion boundary.

## Runtime rules
- `.ai` canonical; shared rules win.
- No secrets; no destructive commands; no provider/admin mutations without approval.
- No source edits in plan-only/read-only modes.
- No overlapping multi-agent writes.
- No provider/GitHub/Notion claims without proof.

## `.ai` updates
Update `.ai/10_state` only for true project reality changes, `.ai/04_tasks` for task packets, `.ai/05_logs` for run evidence, `.ai/15_Bugs` for blockers, `.ai/09_archive` only after verified completion.

## Stop conditions
Stop for destructive/credentialed/external-production actions, unresolved dirty-worktree conflict, missing authority, repeated same blocker, or validation failure that cannot be safely investigated.
