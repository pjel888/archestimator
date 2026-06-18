# 11 — Security Threat Model & RPC Authz Contract

> Phase 3 is optional and high blast radius. This document is the hard security contract for any `workspace_homebase_summary` work.

## Trust Boundaries

```
browser -> Next RSC / server code -> Supabase authenticated client -> PostgREST/RPC -> RLS + SQL membership joins
```

The caller is an authenticated app user, not a trusted service. The RPC must remain correct when the user guesses a valid workspace id, project id, or estimate id from another tenant.

Branch DB fixtures are a separate trust boundary:

- synthetic data only unless the owner explicitly authorizes a specific beta/dev source;
- no production data copy;
- service-role keys only in local/provider tooling, never in committed files or logs;
- branch credentials stay out of `.ai`, `.omx`, screenshots, and trace output;
- branch teardown or retention is recorded after measurement.

## Data Classification

The homebase summary mixes workspace-scoped and user-personalized data:

| Payload area | Required scope |
|---|---|
| Recent projects | caller must be a workspace member and row must pass current project visibility/RLS. |
| Favorite projects | `project_favorites.user_id = (select auth.uid())`; never show another user's favorites. |
| Recent estimates | estimate/project visibility for caller; no workspace-wide estimate scan. |
| Favorite estimates | `estimate_favorites.user_id = (select auth.uid())`; never show another user's favorites. |
| Estimate node roots | only estimates visible to caller; bounded to the visible estimate id set. |
| Publications | stay app-side best-effort unless a later plan designs optional-table guards. |
| Pending-invite summary | stay app-side and role-filtered; do not put manage-only counts in a broad summary RPC. |

## RPC SQL Checklist

The function must satisfy every item:

- `language sql stable security invoker`;
- `set search_path = public`;
- explicit `revoke execute on function public.workspace_homebase_summary(uuid, int) from public, anon;`;
- explicit `grant execute ... to authenticated;`;
- every subquery joins through caller-authorized workspace/project/estimate membership, not child-table RLS alone;
- user-owned data filters on `(select auth.uid())`;
- no `select *`;
- no service-role assumption;
- deterministic `ORDER BY updated_at DESC, id DESC`;
- `recent_limit` is clamped, for example `least(greatest(coalesce(recent_limit, 12), 1), 50)`;
- returns an empty authorized payload, not an error with raw SQL details, when the caller lacks access;
- response shape is parity-tested against the app path before caller switch.

## Authz Matrix

| Caller | Expected result |
|---|---|
| Workspace owner | sees workspace-visible recent data plus only their own favorites. |
| Workspace editor/member | same as current app path for that role; no manage-only invite counts in RPC. |
| Project member in workspace | sees only current app-visible project/estimate rows. |
| Sheet collaborator without project manage role | no manage-only counts; no extra project data. |
| Workspace member not on project | cannot infer private project/estimate names through counts or node roots. |
| Authenticated non-member | empty/denied summary for guessed workspace id. |
| User A in same workspace | cannot read User B's favorite projects or estimates. |
| Anonymous caller | cannot execute the function. |

## Instrumentation Privacy

Logs, headers, trace output, and scorecards may contain:

- sanitized labels;
- timings;
- aggregate synthetic fixture sizes;
- pass/fail gate status.

They must not contain:

- ids, emails, names, tokens, cookies, SQL text with tenant values, PostgREST URLs with filters, raw provider errors that include identifiers, or exact production tenant counts.

## Required Security Gates

- `prove:workspace-homebase-summary`: cross-tenant guessed workspace id returns empty/denied for non-member.
- Same-workspace user-isolation proof: User A cannot observe User B's favorites.
- Role matrix proof: owner/editor/viewer/project member/sheet collaborator/non-member.
- `bun run prove:rls-initplan` and Supabase security advisor after any migration.
- Branch fixture credential audit: no service-role leakage in logs or repo.
- App fallback proof: RPC failure falls back to the app path or fails closed without leaking partial payload.

## Official Supabase Sources Used For This Contract

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Database Functions: https://supabase.com/docs/guides/database/functions
- Securing the API: https://supabase.com/docs/guides/api/securing-your-api
- Branching: https://supabase.com/docs/guides/deployment/branching
- Database Advisors: https://supabase.com/docs/guides/database/database-advisors
