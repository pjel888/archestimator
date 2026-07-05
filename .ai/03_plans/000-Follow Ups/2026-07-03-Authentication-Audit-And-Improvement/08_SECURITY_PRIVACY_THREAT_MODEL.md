# 08 - Security, Privacy, And Threat Model

## Security Objectives

1. Prevent account confusion and unintended Google account reuse.
2. Prevent tenant/object access bypass in a D1 app-layer-authz world.
3. Prevent shared-link recipient authority from escalating into app authority.
4. Prevent app users from bypassing publication password/session controls.
5. Prevent credential-adjacent material from leaking through logs, evidence, analytics, support, or stale provider artifacts.
6. Preserve enough auditability for abuse/security response while minimizing personal data.

## Attacker Profiles

| Attacker | Goal | Primary controls |
|---|---|---|
| Wrong Google account on shared device | Accidentally or intentionally access another account | account picker, explicit logout semantics, reauth policy |
| Authenticated low-role user | Read/mutate another workspace/project/estimate | server-side object-role checks, deny-by-default tests |
| Invite link holder | Accept as wrong account or replay/abuse invite | token hash, email match, rate limits, bridge cookie integrity |
| Shared-link recipient | Escalate to workspace or act as another recipient | independent share session, token/recipient hash, CSRF, no-store |
| Public internet attacker | Brute-force publication passwords/tokens or exhaust resources | high entropy, durable rate limits/lockouts, no enumeration |
| Future maintainer/agent | Delete the wrong provider artifact or leak evidence | cleanup worksheet, credential taxonomy, redaction checklist |

## Threat Matrix

| Threat | Risk | Mitigation | Test/evidence |
|---|---|---|---|
| Cached Google account silently reused | Wrong account signs in | Google `prompt` policy; copy for account switch | OAuth URL/config test |
| OAuth state mismatch leaks raw state/code in evidence | Credential-adjacent leak | redaction policy; no raw OAuth evidence in docs/logs | evidence review |
| Server action misses object-role check | Broken access control | full authz matrix; central role helpers; fail-closed tests | Phase 3 matrix tests |
| D1 query lacks tenant predicate | Cross-tenant data exposure | repository review; query tests with attacker fixture | targeted Vitest |
| Publication password lockout reset by Worker isolate | Brute-force weakening | D1/DO durable lockout | Phase 2 tests |
| Viewer cookie accepted as app session | App escalation | distinct cookie names and middleware checks | middleware/share tests |
| Better Auth session bypasses share password | Confidential publication exposure | share routes require publication access/session cookies | share route tests |
| Invite wrong-account accept | Unauthorized collaborator access | invited email match and wrong-account repair | invite tests |
| Analytics/logs collect tokens in URL | Credential leak | URL redaction allowlist/denylist | static/logger tests |
| Provider leftovers retain active secrets | Unauthorized old-provider access | provider cleanup classification and rotation/removal | Phase 5 checklist |

## Privacy And GDPR/EDPB Plan

Planning baseline:
- Minimize personal data in auth/security logs.
- Prefer hashed IP/UA/email where raw values are unnecessary.
- Define retention for sessions, OAuth state, invites, publication recipient sessions, audit events, support requests, and provider evidence.
- Define DSAR access/export/delete workflow before public/paid launch.
- Define breach investigation and 72-hour notification decision workflow where GDPR applies.

## Evidence Redaction Policy

Never include raw values for:
- OAuth `state`, `code`, `id_token`, `access_token`, `refresh_token`.
- Better Auth session cookies and state cookies.
- Invite raw tokens and share raw tokens/URLs.
- Publication password values, access/session cookies, CSRF values.
- API keys, provider secrets, peppers, webhook secrets.
- Raw personal emails/IPs/UA in public docs unless intentionally sanitized.

Allowed evidence:
- Redacted path examples such as `/share/[REDACTED_TOKEN]`.
- Hash prefixes only when non-reversible and not sufficient for lookup.
- Synthetic emails such as `user@example.test`.
- Event names, status codes, test names, and sanitized metadata keys.

## Standards Mapping

Detailed source links are in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

| Standard | Applied use |
|---|---|
| OWASP ASVS 5.0.0 | Auth/session/access-control verification backlog |
| OWASP Authorization Cheat Sheet | deny-by-default, validate every request, centralize checks |
| OWASP Authentication/Session/CSRF/OAuth cheat sheets | OAuth state, session lifecycle, CSRF protections |
| OWASP API Security Top 10 2023 | object/function/property-level auth, resource consumption |
| NIST SP 800-63-4 / 63B-4 | reauth/session/authenticator lifecycle and assurance decisions |
| GDPR / EDPB | minimization, storage limitation, DSAR, breach response |
