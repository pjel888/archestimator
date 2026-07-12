# Cloudflare Hosted Estimate History Proof

Generated: 2026-07-02T07:19:40.322Z
Base URL: https://archestimator.com
Endpoint: /api/internal/estimate-history-proof
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed Cloudflare Worker estimate-history proof endpoint with a local bearer secret, then records sanitized D1 rollback, idempotency, viewer-denial, cross-workspace-denial, and cleanup evidence. It does not print secret values, delete provider resources, downgrade external providers, or touch real customer/project data.

## Summary

| Gate | Ready |
| --- | --- |
| D1 binding | yes |
| App-layer editor guard | yes |
| Viewer edit denial | yes |
| Cross-workspace edit denial | yes |
| Mutation idempotency | yes |
| Transaction rollback | yes |
| Cleanup zero | yes |
| Hosted estimate-history D1 proof | yes |
| Production cutover | no |

## Sanitized Results

- Idempotency event count: 1
- Idempotency replay returned same event: yes
- Viewer can edit: no
- Stranger can edit: no
- Viewer denied event count: 0
- Stranger denied event count: 0
- Rollback error observed: yes
- Rollback row residue: 0
- Rollback event residue: 0
- Cleanup after: {"workspaces":0,"profiles":0,"workspaceMembers":0,"projects":0,"estimates":0,"estimateTabs":0,"estimateNodes":0,"estimateRows":0,"estimateEvents":0,"estimateAdjustments":0}

## Blockers

- (none)
