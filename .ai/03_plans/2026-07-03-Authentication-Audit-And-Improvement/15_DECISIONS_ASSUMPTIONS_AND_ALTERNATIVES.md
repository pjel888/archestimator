# 15 - Decisions, Assumptions, And Alternatives

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| DEC-001 | Treat Cloudflare-first + Better Auth as the active planning baseline. | Current source/config/current-state point there; Supabase/Vercel docs are stale unless source proves active runtime. |
| DEC-002 | Use phase-scoped implementation rather than one broad auth refactor. | Auth, publication, role taxonomy, and provider cleanup have different blast radii. |
| DEC-003 | Do not adopt Better Auth organization/RBAC plugin until local role taxonomy is explicit. | Plugin adoption before mapping workspace/project/estimate roles risks hiding access-control gaps. |
| DEC-004 | Treat publication recipient sessions as separate from Better Auth app sessions. | Shared-link recipients should not become workspace users by receiving a token. |
| DEC-005 | Treat credential-adjacent evidence as sensitive even when expired. | OAuth state/codes/tokens/cookies/invite URLs can teach attackers system shape and should be redacted. |

## Assumptions To Revalidate

| ID | Assumption | Revalidate by |
|---|---|---|
| ASM-001 | Better Auth installed version still supports Google provider `prompt`. | Check installed types/docs before Phase 1. |
| ASM-002 | Current Google callback path is `/api/auth/callback/google`, not legacy `/auth/callback`. | Check OAuth clients/provider config before deleting legacy route. |
| ASM-003 | `.env.example` remains aligned with invite pepper names. | Check before closing docs/env cleanup. |
| ASM-004 | D1 schema contains the needed tables for publication/share hardening. | Inspect migrations/current D1 schema before Phase 2/4. |
| ASM-005 | Provider-exit sibling pack remains the authority for production provider removal. | Check sibling pack/current-state before Phase 5. |

## Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Only add `prompt=select_account` and stop. | It fixes the visible bug but leaves lockout, authz matrix, privacy, and cleanup risks unhandled. |
| Use Google logout redirect as the only account-switch fix. | It is provider-specific, can be disruptive, and still needs local session policy; account picker is the direct UX fix. |
| Rely on UI hiding for permissions. | D1 has no RLS fallback; server-side authz is mandatory. |
| Keep in-memory publication lockout as "good enough". | Cloudflare Worker isolates make it non-durable for security-critical hard lock. |
| Bulk delete all Supabase/Vercel/Resend references. | Some references may be archaeology, tests, proof scripts, or sibling-pack context; classify first. |
