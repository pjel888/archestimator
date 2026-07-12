# Cloudflare Hosted Collaboration Invitation Proof

Generated: 2026-07-11T11:06:50.278Z
Base URL: https://archestimator.com
Endpoint: /api/internal/collaboration-invitation-proof
Response status: 200
Secret input present: yes
Secret input source: process.env

Calls the deployed Cloudflare Worker collaboration-invitation proof endpoint with a local bearer secret, then records sanitized D1 resolve, accept-by-token, accept-by-id, replay denial, wrong-account denial, revoked terminal-state, and cleanup evidence. It does not print secret values, delete provider resources, downgrade external providers, or touch real customer/project data.

## Summary

| Gate | Ready |
| --- | --- |
| D1 binding | yes |
| Active resolve | yes |
| Revoked terminal-state redaction | yes |
| Accept by token | yes |
| Accept by invitation id | yes |
| Wrong-account denial | yes |
| Replay denial | yes |
| Cleanup zero | yes |
| Hosted collaboration invitation D1 proof | yes |
| Production cutover | no |

## Sanitized Results

- Active resolve state: active
- Active resolve project visible: yes
- Revoked resolve state: revoked
- Revoked resolve project visible: no
- Accept-by-token state: accepted
- Accept-by-token membership rows: 1
- Accept-by-token audit rows: 1
- Replay same actor state: already_member
- Replay other actor state: already_used
- Replay blocked audit rows: 1
- Wrong-account state: wrong_account
- Wrong-account membership rows: 0
- Wrong-account audit rows: 1
- Accept-by-id state: accepted
- Accept-by-id replay state: already_member
- Accept-by-id membership rows: 1
- Cleanup after: {"workspaces":0,"profiles":0,"workspaceMembers":0,"projects":0,"estimates":0,"projectMembers":0,"estimateMembers":0,"invitations":0,"tokens":0,"auditEvents":0}

## Blockers

- (none)
