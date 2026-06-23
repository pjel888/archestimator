# UX-030 — Security And RLS

Date: 2026-06-23 | Level: **MEDIUM** | Conflict: **Estimate sheet**

## Trust Boundaries

| Boundary | Risk |
|---|---|
| Public -> Authenticated | Session hijacking, open redirect |
| Authenticated -> DB | RLS bypass, privilege escalation |
| DB -> Share Recipient | Token leakage, enumeration |
| Client -> Provider | Data exposure at provider boundary |

## Actors & AuthZ

| Actor | AuthN | Scope |
|---|---|---|
| Anonymous | None | Public pages |
| Primary App User | Supabase Auth | Own workspace |
| Project Collaborator | Supabase + project_members | Assigned project |
| Share Recipient | Hashed token + password | Single publication |
| Admin | Supabase + workspace_admin | Workspace-level |

## RLS Policy Review

N/A — UI/copy-only surface with no database mutations.

## Rate Limiting

| Action | Limit |
|---|---|
| AI ask | 10/min, 60/hr |
| Share comment/decision | Postgres durable limiter present; Policy B first-class quota proof |
| Beta/landing/invite request paths | Postgres limiter coverage exists; verify route quotas before proof claims |
| Login | Supabase Auth config |

## Abuse Cases

| Abuse | Mitigation |
|---|---|
| Brute-force share token | HMAC/SHA-256 token hashing, no-store/session controls, and Postgres share limiter scopes; verify hosted quotas |
| Enumerate project IDs | UUIDv4, 404 |
| XSS | Server-side sanitization |
| Open redirect | Validate `next` param |
| Token in copy | Never display raw token |

## Output Redaction

- Tokens: [REDACTED] or hash; never in logs/copy/errors
- Emails: Hash in logs; truncate in analytics
- Cost data: Never in public errors
- User IDs: Never in client-side errors

## Issue-Specific: UX-030

- Estimator mobile, low-bandwidth, interrupted-draft capture is not a distinct story.
- No new attack surface beyond existing trust boundary
- New endpoints: verify auth + Zod validation
- User content: sanitize for XSS
- RLS changes: test with non-privileged session

## Linkage

[05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md) | [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | [12-DATABASE-AND-MIGRATION.md](12-DATABASE-AND-MIGRATION.md)
