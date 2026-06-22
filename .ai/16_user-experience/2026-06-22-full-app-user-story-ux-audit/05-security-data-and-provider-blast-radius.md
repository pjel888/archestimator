# Security, Data, And Provider Blast Radius

Date: 2026-06-22

This document turns UX fixes into explicit security, database, and provider planning obligations.

## Trust Boundaries

| Boundary | Surfaces | Required control |
|---|---|---|
| Public visitor to authenticated app | Public pages, login, auth callback, beta gate | Redirect sanitization, no user data leak, closed-beta enforcement. |
| Primary App User to workspace data | Projects, estimates, library, settings, notifications | Workspace-scoped queries, RLS, role checks, fail-closed server actions. |
| Project Collaborator to project/workspace data | Invites, project collaboration, estimate context, presence | Invite state, collaboration role, project/workspace scope, RLS, revocation, and audit trail. |
| Owner/admin to support/admin tools | Beta allowlist, feedback, repair, release campaigns | Least privilege, audit trail, no raw DB spelunking as normal UX. |
| Shared-Link Recipient to share data | `/share/[token]`, share APIs, comments, decisions, unsubscribe | Token validation, no-store headers, password/session lockout, event privacy. |
| Browser to storage/assets | Project images, component images, attachments | Size/MIME validation, bucket scoping, signed URL lifetime, failed asset fallback. |
| App to provider | Supabase, Resend, Vercel, Maps/Places, AI, monitoring | Credential scoping, data minimization, webhook verification, outage state. |

## Authz And RLS Matrix Template

Every data-affecting implementation plan must fill this shape:

| Surface | Route/action/RPC/table/bucket | Actor | Scope key | Required role/token | RLS/policy proof | Fail-closed behavior | Test/proof |
|---|---|---|---|---|---|---|---|
| Template row | Exact entry | User/recipient/operator | workspace/project/share | Role or token | Policy/test/script | What user sees | Command/artifact |

Authority rule: product persona is not authority. Authority comes from the access path plus workspace membership, project collaboration role, admin/operator entitlement, share token, recipient session/password state, or public route policy.

> **Filled matrix lives in doc 14.** The FILLED matrix per high-risk surface (`/share/[token]`, `api/ai/ask`, `api/projects/images`, `api/webhooks/resend`, beta allowlist admin, invite handlers) — with real migration IDs, RPCs, and test files — is in `14-security-primitive-and-rls-binding.md`. **Do not implement a blast-radius item until its row exists there.** This template is the required shape; doc 14 is the required evidence.

## Required Coverage By Area

| Area | Must be proven before status can move to proven |
|---|---|
| Projects/estimates | User cannot read/write another workspace/project; shared project access follows collaboration role; destructive actions require owner/admin or explicit permission. |
| Collaboration/invites | Invite token lifecycle is bounded; wrong-account and revoked states fail closed; role changes are audited. |
| Publication/share | Revoked/expired/password-locked links fail closed; no-store/cache headers persist; tokens are redacted from logs and UI. NOTE: recipient comment/decision/unsubscribe actions are **NOT currently rate-limited** — see Rate-Limit Truth below. |
| Assets/uploads | Upload path cannot cross workspace; invalid MIME/size rejected; signed URLs expire; failed asset loads produce recipient-safe copy. |
| Library/cost | Supplier/cost/attachment governance does not expose private workspace data; accepted-cost or approval states are auditable. |
| Notifications/campaigns | Delivery rows are scoped to intended users; campaign targeting is reviewed; unsafe CTA cannot ship. |
| Feedback/support | Support sees only necessary user context; repair actions are logged; fallback email avoids leaking secrets or excessive payload. |
| AI | Sensitive project/user data sent to model is minimized; generated output requires human review before applying; prompt/output telemetry is redacted. |

### Rate-Limit Truth (honesty correction)

As of this audit, **the only currently-enforced rate limit in the app is AI ask**: `checkAiAskQuota` in `src/lib/ai/rate-limit.ts` (10/min, 60/hr) backed by `security_rate_limit_events` (migration `20260601003000`). The following actions are **NOT currently rate-limited** and any plan that claims otherwise is aspirational, not proven:

- Recipient comment / decision / unsubscribe on `/share/[token]`.
- Beta access requests (the beta gate request path).
- Invite accepts (wrong-account / revoked-replay paths).

Rate limiting is Postgres-native (NOT Redis). Which recipient/beta/invite actions need quotas beyond AI ask is an open owner decision — see `DEC-UX-RL-QUOTAS` and doc 14's Rate-Limit Truth Table. Abuse-case rows below that previously implied rate limits exist on these paths have been corrected to "planned, not enforced."

## Data Classification

| Data class | Examples | Target handling posture (advisory — not yet enforced in code) |
|---|---|---|
| Public | Public marketing/legal copy | Can be cached normally unless route policy says otherwise. |
| Account PII | Email, name, beta access, workspace membership | Redact in logs; expose only to owner/support with purpose. |
| Project commercial data | Client, address, estimate values, proposal contents, workbook exports | Workspace-scoped; share only through explicit publication/export. |
| Location/address | Project address, coordinates, Maps/Places request | Treat as sensitive project data; allow address-only fallback. |
| Tokens/secrets | Share tokens, invite tokens, API keys, service-role envs, webhooks | Never log; never surface except intended links; rotate/revoke path required. |
| Files/assets | Images, attachments, spec sheets, exported workbooks | Bucket-scoped, validated, recoverable, and auditable. |
| AI content | Prompts, generated proposal text, project context | Minimize, review before apply, redact telemetry. |
| Support/legal | Feedback, DSAR/deletion/export requests, repair notes | Owner-labeled, retention-aware, audit logged. |

> **Advisory, not enforced.** This posture is a planning target only. No enum, middleware guard, or redaction pipeline enforces these classes in code today. The only concrete redaction primitive in the codebase is `hashAiAuditValue` in `src/lib/ai/audit.ts` (AI audit-value redaction). Treating any row above as enforced is a false claim — see `DEC-UX-DATA-CLASSIFICATION` (data classification is advisory until a redaction guard exists).

## Provider Boundary Register

| Provider | Data shared | Main failure mode | Proof artifact | Security note |
|---|---|---|---|---|
| Supabase/Postgres | App data, auth/session, RLS, storage | RLS drift, migration failure, service-role/env issue | Linked readiness, migration readiness, RLS proof scripts | Project boundary is `ebxxqidacheyapmmzavr`; never mutate unrelated provider projects. |
| Resend | Invite/share/notification email metadata and recipient email | Missing env/DNS/webhook/inbox delivery | Resend readiness script, DNS check, webhook route proof, inbox/manual proof | Verify webhook signature and minimize logged payloads. |
| Vercel | Runtime env, hosted routes, analytics/speed insights | Env mismatch, protected route leak, cache/header drift | Env/health/production/sensitive-route scripts | Preview/prod differences must be explicit. |
| Google Maps/Places | Address/search/location data | Missing key, quota, billing, script load failure | Map provider tests and manual/provider proof | Restrict API key and provide address-only fallback. |
| AI provider | Project/estimate/library context, prompts, drafts | Disabled provider, quota, retention concern, hallucination | Deterministic local tests plus provider policy decision | Do not treat model output as authoritative without review. |
| Monitoring/logging | Errors, URLs, selected metadata | Token/PII leakage, missing alert owner | Support monitoring readiness and alert/drain proof | Redact tokens, emails where possible, project names, addresses, proposal contents. |

## Abuse Cases

| Surface | Abuse scenario | Planning mitigation | Bound implementation |
|---|---|---|---|
| Auth/login | Open redirect or unsafe `next` link | Sanitize redirects and explain dropped unsafe path. | — (no concrete primitive bound; TODO-verify redirect sanitizer) |
| Beta access | Enumerating or repeatedly requesting access | Queue/allowlist state isolation; avoid exposing private allowlist state. Quota is **planned, not enforced** — see Rate-Limit Truth + `DEC-UX-RL-QUOTAS`. | — (no rate-limit primitive bound today) |
| Invite | Token forwarding, wrong account, revoked invite replay | Token state validation, wrong-account flow, audit repair. Accept-quota is **planned, not enforced** (`DEC-UX-RL-QUOTAS`). | doc 14 Bound Security Primitives: invite token validation (see invite handlers row) |
| Share link | Token brute force, link forwarding, scraping, open-count privacy leak | High-entropy tokens, no-store, revocation, privacy-safe events. Rate limits on this path are **planned, not enforced** (`DEC-UX-RL-QUOTAS`). | doc 14: token brute-force -> HMAC-SHA256 (`hashPublicationToken`) + `submit_client_response` RPC (migration `20260621120000`) validates both `token_hash` and `recipient_token_hash` |
| Comments/decisions | Spam, duplicate decisions, conflict race | CSRF, idempotency or conflict copy, retry semantics. Recipient comment/decision rate limit is **planned, not enforced** (`DEC-UX-RL-QUOTAS`). | — (no rate-limit primitive bound today; idempotency TODO-verify) |
| Unsubscribe | Invalid token abuse or CSRF | Token validation, safe interstitial, no account leakage. Unsubscribe rate limit is **planned, not enforced** (`DEC-UX-RL-QUOTAS`). | doc 14: recipient token validation via `submit_client_response` RPC |
| Password lockout | Password brute force on password-protected share | Slow hashing, lockout posture. | doc 14: `passwordHashPrefix` (scrypt) in `src/lib/publication/security.ts` |
| Uploads/assets | Oversized files, MIME spoofing, path traversal, private asset leak | Validation, bucket scoping, signed URLs, failed asset fallback. | doc 14: `api/projects/images` row (size/MIME/bucket scoping) |
| Feedback | Payload spam, PII overcollection | Size limits, safe fallback mailto, triage owner, no secrets in payload. | — (no concrete primitive bound; TODO-verify size cap) |
| AI | Prompt injection, sensitive data exfiltration, unsafe generated edits | Prompt isolation, data minimization, output review, disabled/quota states. | doc 14: quota enforced via `checkAiAskQuota` (`src/lib/ai/rate-limit.ts`, 10/min 60/hr); telemetry redaction -> `hashAiAuditValue` (`src/lib/ai/audit.ts`) |
| Export | Huge workbook causing failure or data leak | Preflight size warning, split guidance, scoped export data. | — (no concrete primitive bound) |
| Campaigns | Unsafe CTA or wrong target audience | Preview, CTA validation, target inspection, delivery proof. | — (no concrete primitive bound) |
| Webhooks | Forged delivery webhook | Signature verification and scoped route tests. | doc 14: `verifyResendWebhookPayload` + `RESEND_WEBHOOK_SECRET` + svix header verification + 413 size cap (`src/app/api/webhooks/resend/route.ts`) |

> The **Bound implementation** column points at doc 14's Bound Security Primitives table for each abuse case that has a real, greppable primitive today. Empty cells mean the mitigation is still planning-only — do not claim it is enforced.

## Blast-Radius Checklist

Before implementing any issue in `UX-019`, `UX-020`, `UX-021`, `UX-022`, `UX-024`, `UX-029`, `UX-031`, `UX-032`, `UX-033`, `UX-034`, `UX-036`, `UX-038`, `UX-039`, `UX-040`, `UX-043`, answer:

1. Which identities can enter the flow?
2. Which workspace/project/share/library/support records can be read?
3. Which records can be written or deleted?
4. Which provider receives data or must be available?
5. Which tokens, emails, addresses, or proposal contents could leak through logs, URLs, telemetry, support email, or provider errors?
6. Which RLS, server action, API route, or storage policy proves isolation?
7. What happens under provider outage, stale session, revoked access, and concurrent edit?
8. How is the action audited and reversed or repaired?

## Security Stop Condition

Do not mark an implementation unit security-ready unless:

- Authz/RLS matrix rows exist for every touched data boundary.
- Token/PII redaction is planned for logs, telemetry, provider errors, and support surfaces.
- Provider proof is marked pass/fail/blocked, not assumed.
- Share/public routes preserve no-store/cache and safe headers.
- Support/admin repair paths state least privilege and audit records.
- AI/data exposure posture is explicit before AI-related UX is promoted.

### Telemetry & Redaction Gate

**Redaction must be designed before any outcome-metric instrumentation ships.** `reportWebVitals` + Vercel SpeedInsights are already wired in `src/app/layout.tsx`, so any new analytics/telemetry sink (see `DEC-UX-ANALYTICS`) will begin receiving URLs, errors, and metadata immediately. Before such a sink goes live, a redaction guard for tokens, emails, addresses, and proposal contents must exist — not the reverse. Today the only concrete redaction primitive is `hashAiAuditValue` in `src/lib/ai/audit.ts`; a general-purpose classification/redaction guard does not yet exist (advisory only — see `DEC-UX-DATA-CLASSIFICATION`). Cross-link: doc 13 (telemetry & event instrumentation) defines the event taxonomy that must pass through this gate.
