# Supabase Advisors After CLI Upgrade

Date: 2026-06-14

## CLI Upgrade

- Previous local CLI: `2.98.2`.
- Current local CLI: `2.106.0`.
- Install path: `/opt/homebrew/bin/supabase`.
- Homebrew metadata fetches hung on `formulae.brew.sh`, so the upgrade used the
  official Supabase CLI GitHub release tarball
  `supabase_2.106.0_darwin_arm64.tar.gz`.
- Release artifact SHA-256 verified:
  `71240d9349f7a4e5b5a5654e99925547d7363388561f20d8c243af4e08adaded`.
- The release contains both `supabase` and `supabase-go`; both are installed
  under `/opt/homebrew/Cellar/supabase/2.106.0/bin/`.

## Linked Migration Check

`supabase migration list --linked` passed under CLI `2.106.0`.

Result:

- No remote-only rows.
- Only documented local-only rows remain:
  - `20260520100459`
  - `20260605123000`
  - `20260605131500`

## Advisor Summary

Command:

```bash
SUPABASE_TELEMETRY_DISABLED=1 supabase db advisors --linked --type all --level warn --fail-on none
```

Summary:

| Finding | Count | Category |
| --- | ---: | --- |
| `anon_security_definer_function_executable` | 32 | Security |
| `authenticated_security_definer_function_executable` | 75 | Security |
| `function_search_path_mutable` | 3 | Security |
| `auth_leaked_password_protection` | 1 | Security |
| `auth_rls_initplan` | 13 | Performance |
| `multiple_permissive_policies` | 169 | Performance |

## Recommended Remaining Work

1. Classify security-definer functions as private helpers, authenticated RPCs, or
   intentionally anonymous RPCs before changing grants.
2. Revoke `anon` execute from functions that are not intentionally public.
3. Fix the three mutable ordinary-function search paths:
   `resolve_app_role_for_email`, `set_updated_at`, and
   `collaboration_role_rank`.
4. Enable leaked password protection for Supabase Auth before launch.
5. Finish the 13 remaining `auth.uid()` initplan policy rewrites.
6. Treat the 169 multiple-permissive-policy findings as a performance cleanup
   pass, not a blocker for the completed migration-ledger repair.

## Notes

- Running multiple Supabase CLI commands in parallel under `2.106.0` triggered a
  local telemetry rename race in `~/.supabase`. Sequential commands with
  `SUPABASE_TELEMETRY_DISABLED=1` avoided the issue.
- The advisor backlog is broader than the original app-facing repair scope.
