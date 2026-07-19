# Persona Fixture Register

Synthetic, local-preview-only identities used by this audit. None of these are
real users, real invitations, or real recipients. No magic links, tokens, OAuth
state, or session cookies were captured into the pack.

| Persona ID | Role | Used by journeys | Synthetic identity |
|---|---|---|---|
| P-DP-001 | Prospective Philippine design partner (solo/freelance estimator or QS) | J-01 | Unauthenticated visitor; no fixture required |
| P-DP-002 | Solo architect / small practice | J-01 | Vocabulary-check lens only (no separate session) |
| P-IW-001 | New invited workspace owner | J-02 | Unauthenticated invite recipient; only synthetic malformed tokens (`00000000-0000-0000-0000-000000000000`, `not-a-real-token`) used |
| P-RW-001 | Returning workspace owner | J-03, J-04, J-05, J-06 | Dev-auth-bypass header (`x-archestimator-dev-auth-bypass`); no real account |
| P-ED-001 | Editor / collaborator | J-04 (source-traced only) | Source-trace only; no live session |
| P-VW-001 | Viewer / denied member | J-04 (source-traced only) | Source-trace only; no live session |
| P-CR-001 | Client recipient using a public proposal link | J-07, J-08 | Unauthenticated; only synthetic malformed share tokens used |
| P-FO-001 | Founder / admin operator | J-09 | Dev-auth-bypass header; `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` not set, so admin DB-bypass is off |

## Notes

- All authenticated runtime probing used the dev-auth-bypass header configured in
  `.env.local` (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + 64-char secret). The bypass
  is gated on `NODE_ENV !== "production"` AND a local-dev hostname
  (`127.0.0.1`/`localhost`), so it cannot reach a deployed Worker.
- No storage-state file was persisted. Each journey used a fresh ephemeral
  browser context that was closed at the end of the journey.
- The malformed token values (`00000000-0000-0000-0000-000000000000`,
  `not-a-real-token`) are constant UUID / slug values chosen to exercise
  invalid/expired/malformed state handlers without touching D1.
- `P-FO-001` founder/admin live probing was blocked by the build break
  (`UX-BUILD-001`); admin journeys were dispositioned via source trace.
