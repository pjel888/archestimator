# 10 — Security, Secrets, and Provider Proof Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## Security posture

Agentic CI/CD standardization is security work. The goal is to prevent accidental or unauthorized production changes while keeping the solo-founder workflow usable.

## Secrets policy

Never commit provider tokens, API keys, service-role keys, OAuth secrets, Resend keys, or Vercel tokens. Evidence docs must redact tokens, private client data, proposal identifiers, and raw provider payloads.

## GitHub Actions token policy

| Job | Permissions |
|---|---|
| normal CI | `contents: read` |
| PR comment/report if added | `pull-requests: write` only there |
| deployments | `deployments: write` only if needed |
| OIDC | `id-token: write` only in auth/deploy job |

Avoid `write-all`.

## Proof boundaries

| Boundary | Meaning | Allowed claim |
|---|---|---|
| `local-only` | local checks passed | implemented locally |
| `ci-proven` | GitHub Actions passed current SHA | CI-proven |
| `staging-proven` | staged URL smoke passed | staging-proven |
| `provider-proven` | provider/dashboard/API evidence captured | provider-proven |
| `production-promoted` | production alias/current domain proof | production-promoted |
| `manual-proof-pending` | owner/provider proof missing | not complete |

## Provider proof packet

```md
# Provider Proof Packet
Date:
Actor:
Provider:
Environment:
Branch/SHA:
Action taken:
Evidence source:
Redactions applied:
Smoke checks:
Rollback path:
Remaining risks:
```

## Hard stops

Stop if proof would expose secrets, workflow permissions are broad without justification, an agent bypasses branch protection for normal work, or production deploy is requested without owner-approved release path.
