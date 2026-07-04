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
| 5 | Plan provider-leftover deletion only after classification and regression tests. |

## Rollback Plan

| Change type | Rollback |
|---|---|
| Google prompt config | Revert provider prompt value if it breaks OAuth, but keep tests documenting expected product behavior. |
| Logout policy | Revert to local-session-only if provider revocation causes UX/provider failures; document residual shared-device risk. |
| Durable lockout | Revert to prior D1 limiter only if the new durable path blocks legitimate users; keep P0 risk open until repaired. |
| Role helpers | Revert helpers only with failing-surface isolation; avoid partial helper adoption that splits authority rules. |
| Provider cleanup | Restore deleted docs/tests/routes only if classification was wrong; rotate any exposed obsolete secret rather than reusing it. |

## Operations Runbooks To Add Or Update

- Auth incident triage: sign-in failure, state mismatch spike, wrong-account reports.
- Invite repair: expired/revoked/wrong-account/broken parent/default workspace failure.
- Publication support: password lockout, revoked/expired link, recipient session lost, comment/decision conflict.
- DSAR: identity verification, data search/export/delete, deadline tracking.
- Breach response: detect, investigate, decide awareness time, notify if required, preserve sanitized evidence.
- Provider exit: stale Supabase/Vercel/Resend secret removal and post-exit smoke proof.

## Post-Implementation Evidence To Require

Require only after a separate implementation task lands:
- Google sign-in account picker check.
- Sign-out policy check.
- State mismatch log search.
- Authz denial sample checks.
- Publication lockout metric check.
- Redaction log spot check.
- Provider-leftover search.
