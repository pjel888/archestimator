# 13 - Future Rollout, Rollback, And Operations Planning

## Rollout Principles

- Plan phases independently where possible.
- Keep future source changes small and reversible.
- Require tests that prove behavior before touching production/provider state.
- Do not combine security-critical authz refactors with provider cleanup deletions.

## Future Rollout Planning Considerations

| Phase | Future rollout planning requirement |
|---|---|
| 1 | Local/test rollout first. If browser proof is needed, test Google OAuth in a controlled environment with redacted artifacts. |
| 2 | Plan durable lockout behind clear tests. Monitor password-failure/locked events after implementation. |
| 3 | Introduce role helpers/matrix incrementally; run denied/allowed tests per surface. |
| 4 | Plan redaction and share-boundary tests before collecting new auth evidence. |
| 5 | Plan provider-leftover deletion only after classification, caller/dependent-test checks, and targeted regression tests. |

## Rollback Plan

| Change type | Rollback |
|---|---|
| Google prompt config | Revert provider prompt value if it breaks OAuth, but keep tests documenting expected product behavior. |
| Logout policy | Revert to local-session-only if provider revocation causes UX/provider failures; document residual shared-device risk. |
| Durable lockout | Revert to prior D1 limiter only if the new durable path blocks legitimate users; keep P0 risk open until repaired. |
| Role helpers | Revert helpers only with failing-surface isolation; avoid partial helper adoption that splits authority rules. |
| Redaction helper | Revert only with a replacement that still redacts `/share/<token>`, `/invite/<token>`, `/api/share/<token>`, recipient/rt/state/code/cookie query values, emails, bearer values, and raw cookies from diagnostics. |
| Provider cleanup | Restore deleted docs/tests/routes only if classification was wrong; rotate any exposed obsolete secret rather than reusing it. |

## Operations Runbooks To Add Or Update

- Auth incident triage: sign-in failure, state mismatch spike, wrong-account reports.
- Invite repair: expired/revoked/wrong-account/broken parent/default workspace failure.
- Publication support: password lockout, revoked/expired link, recipient session lost, comment/decision conflict.
- DSAR: identity verification, data search/export/delete, deadline tracking.
- Breach response: detect, investigate, decide awareness time, notify if required, preserve sanitized evidence.
- Provider exit: stale Supabase/Vercel/Resend secret removal and post-exit smoke proof.
- Provider-exit handoff: use `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json` for post-deploy source/smoke fields and `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json` for sanitized operator decisions; never paste raw cookies, tokens, env values, database dumps, provider logs, or private mailbox contents.

## Phase 4 Closed-Beta Privacy Runbooks

### DSAR / Access / Deletion

1. Verify the requester through the signed-in account email or a support path that does not expose tokens in the ticket.
2. Identify scope: account profile, Better Auth session/account rows, workspaces, project/estimate data, invites, shared-link recipients, publication activity, support messages, and security/audit metadata.
3. Export user-facing data in readable form and security/audit metadata only as redacted metadata; never include raw cookies, OAuth state/codes, invite tokens, publication tokens, recipient tokens, CSRF tokens, bearer values, or provider secrets.
4. Delete or anonymize data where legally and operationally allowed; record exceptions for legal, abuse-prevention, security, or accounting obligations.
5. Track request date, verification date, completion date, scope, exception rationale, and owner/legal handoff.

### Breach Response

1. Record the first awareness timestamp and preserve sanitized evidence.
2. Triage affected systems and material: Better Auth sessions, OAuth state/codes, invite/share tokens, publication recipient data, emails, IP/UA hashes, D1/R2/DO/Queue/Email resources, provider secrets, and logs.
3. Contain by revoking sessions/tokens, rotating secrets, disabling affected links, or pausing affected workflows.
4. Map affected data subjects and data categories without copying raw secrets into the incident record.
5. Decide notification obligations, including the 72-hour GDPR supervisory-authority clock where applicable.
6. Record remediation, validation evidence, and follow-up prevention tasks.

### Publication / Shared-Link Support

1. For password lockouts, inspect durable rate-limit metadata and share only generic status with the recipient.
2. For revoked/expired links, direct the project owner to rotate/republish; do not disclose project details to unauthenticated requesters.
3. For lost recipient sessions, have the recipient reopen the current recipient link; do not manually send raw recipient tokens through logs or support notes.
4. For comments/decisions conflicts, use publication id / recipient id references and redacted route templates, not raw `/share/<token>` URLs.

## Post-Implementation Evidence To Require

Require only after a separate implementation task lands:
- Google sign-in account picker check.
- Sign-out policy check.
- State mismatch log search.
- Authz denial sample checks.
- Publication lockout metric check.
- Redaction log spot check for tokenized share/invite/auth callback diagnostics.
- Provider-leftover search, retained-string allowlist, and stale proof-utility dependent-test cascade check.
