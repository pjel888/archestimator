# Security Threat Model and RLS Audit Plan

## Fourth-Pass Closed Beta Security Addendum - 2026-06-02

Closed beta adds a new primary threat: whitelist bypass.

Required controls:

- Server-side allowlist enforcement only.
- RLS on `closed_beta_allowed_emails`.
- No full allowlist reads by normal users.
- Exact Google/Supabase authenticated email matching after lower/trim.
- Revoked status checked on protected route/session access.
- Public share/invite routes remain separated from workshop access.
- Service role key remains server-only.
- Denied/revoked access should be logged through existing security/event surfaces if feasible.

See `41-beta-access-security-threat-model.md` for the detailed threat model.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## Assets, Actors, Boundaries

| Category | Items |
| --- | --- |
| Assets | User accounts, workspace/project/estimate data, library/templates, source snapshots, exports, uploaded images/attachments, share/invite tokens, email events, service-role key, audit/rate-limit events. |
| Actors | Anonymous visitor, signed-in workspace member, invited collaborator, public share recipient, beta admin, service-role backend, Resend webhook, malicious user, misconfigured preview deployment. |
| Trust boundaries | Browser/server, server/Supabase, public share token/session, invite token/login bridge, Vercel env, Supabase service role, Resend webhook, storage bucket access. |
| Data flows | Auth -> workshop; row mutations -> RPC/history; export -> XLSX download; share/invite -> token/session/email; webhook -> email status; uploads -> storage/image rendering. |

## STRIDE Table

| Threat | Surface | Risk | Mitigation / proof |
| --- | --- | --- | --- |
| Spoofing | Auth callback, invite/share recipient session | Wrong account or forged recipient. | Hosted auth proof, token hashing, signed cookies, recipient-session tests. |
| Tampering | Estimate row edits/unlink/export formulas | Library mutation or wrong totals. | Revision RPCs, detach tests, Excel formula tests. |
| Repudiation | Row/history/share/email events | User denies change or send. | `estimate_sheet_events`, email events, audit metadata. |
| Information disclosure | RLS/storage/share/source snapshots/logs | Cross-workspace or public leak. | RLS/storage denial, DTO redaction, log scrubbing. |
| Denial of service | Public share/invite/email/export/AI | Abuse or expensive export. | Rate limits, Redis threshold decision, export guards, AI disabled. |
| Elevation of privilege | Service role, dev auth bypass, API route bypassing proxy | Admin access exposure. | Server-only env, no dev bypass in AI, route auth matrix, secret scan. |

## Route Access Matrix

| Surface | Expected access | P0 proof |
| --- | --- | --- |
| `/workshop/**` | Signed-in workspace member only. | Proxy + server action/RLS proof. |
| `/api/projects/.../export/proposal.xlsx` | Authorized project/estimate member. | Cross-workspace denial test. |
| `/api/ai/*` | Disabled for MVP. | Disabled route tests; no provider calls. |
| `/share/[token]` | Valid public token/session/password as configured. | Revoked/expired/password/recipient tests. |
| `/api/share/[token]/comment|decision` | Same-origin + recipient session. | CSRF and session tests. |
| `/invite/[token]` | Valid invite token, optional signed-out preview. | expired/revoked/wrong-account tests. |
| `/api/webhooks/resend` | Valid Resend/Svix signature. | Raw-body signature tests. |
| Upload/image routes | Auth/RLS/storage policy constrained. | unauthorized upload/read denial. |

## RLS Verification Queries

IMPLEMENTATION SKETCH — must be adapted to staging seed IDs before execution:

```sql
-- As user A: can read own workspace project.
select id from projects where workspace_id = '<workspace_a>' limit 1;

-- As user B: cannot read workspace A project.
select id from projects where workspace_id = '<workspace_a>' limit 1;

-- As anonymous/anon: cannot directly read protected estimate rows.
select id from estimate_row_items where estimate_id = '<estimate_a>' limit 1;
```

IMPLEMENTATION SKETCH — storage verification:

```sql
-- Verify bucket policies exist and expected buckets are present.
select id, public from storage.buckets where id in ('component-images','project-images','component-attachments');
```

Do not copy/paste with placeholder IDs. Store actual staging output in `14-evidence-index.md`.

## API Security Checklist

- Route handlers enforce auth themselves; API routes bypass `src/proxy.ts`.
- Service-role key never exposed to client bundle or public logs.
- Share/invite tokens hashed/signed and revoked/expired paths tested.
- Resend webhook requires raw body and signature.
- AI routes disabled before provider/tool/audit/write code.
- Mutating POST routes have CSRF/same-origin checks where public.
- User-entered project/component/notes data is escaped in UI and Excel formulas are not formula-injection vectors.
- Uploads enforce MIME/size/bucket policy.
- Dependency/secret scans run before launch.
- Logs avoid PII, raw tokens, project secrets, and client confidential data.

## No-Go Security Issues

- Any cross-workspace read/write succeeds.
- Any service-role secret appears client-side.
- Any public share/invite token bypasses expiration/revocation/password/session rules.
- AI or export route can be abused without intended auth/disable controls.
- Storage bucket exposes private attachments.
- RLS/migration proof is missing.
