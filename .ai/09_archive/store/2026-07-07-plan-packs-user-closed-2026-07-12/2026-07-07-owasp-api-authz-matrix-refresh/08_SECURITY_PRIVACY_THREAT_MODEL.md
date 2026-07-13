# 08 — Security, Privacy, Threat Model

## Trust boundaries (re-verified)
1. Public internet → Cloudflare Worker edge (TLS, OAuth state validation, host redirect).
2. Worker → Proxy (route class, session presence, terms gate).
3. Proxy → Route/Action (`requireCurrentUserContext` + closed-beta + D1 membership).
4. Route/Action → Repository (`canAccess*`/`canEdit*` SQL scoping).
5. App → D1 (the only relational store; no RLS — app-authz is the gate).
6. App → R2 (server-mediated only).
7. App → DO `CollaborationRoom` (per-message authz).

## Actor model
- **Anonymous internet user:** can reach `/api/health`, `/api/compliance/privacy-requests`,
  all `/api/share/[token]/*`, `/invite/[token]/continue`, `/workshop/pending-invite`,
  `/api/internal/client-error`. Durable rate limits + CSRF + crypto are the barriers.
- **Authenticated non-member:** has a Better-Auth session but no membership in target
  workspace/project/estimate. Must be denied by D1 membership probes.
- **Workspace member (viewer/member/admin/owner):** scoped by role.
- **Project/estimate collaborator (viewer/editor/admin/owner):** scoped by collaboration role.
- **Platform admin (`ceo`/`admin`):** bypasses all D1 probes at JS layer.
- **Service/job (Bearer `CRON_SECRET`/job secret):** internal routes only.
- **Recipient (share token + optional password + recipient token):** scoped to one publication.

## OWASP API Top 10 (2023) mapping against current source

| API # | Risk | Current posture (verified) | Finding |
|---|---|---|---|
| API1 Broken Object Level Authorization | High | D1 membership probes on every authenticated route/action; fail-closed; `canAccessWholeProjectInD1` excludes estimate-only sheet members. Reads return opaque 404 on deny. | ✅ Strong. Coverage gaps in REQ-NEG-02 (read-repo denial tests). |
| API2 Broken Authentication | High | Better Auth (magic-link + Google) over D1; session cookie-cache disabled; OAuth state validated at edge; dev-bypass double-gated non-prod; closed-beta + terms gates. | ✅ Strong. |
| API3 Broken Object Property Level Authz (mass assignment) | Medium | Mutations use explicit typed args / manual formData readers; DTOs typed; no blind spreads found. | ✅ Acceptable (SEC-06 validation consistency). |
| API4 Unrestricted Resource Consumption | High | Durable D1 limits on public surfaces; **in-memory** for estimate mutations (SEC-03); **no edge/WAF** (SEC-02); WebSocket upgrade unauthenticated (SEC-04). | ⚠️ SEC-02/03/04. |
| API5 Broken Function Level Authorization | Medium | Admin actions (`canManageClosedBetaAllowlist`, `canReviewBetaFeedback`, `canApproveUploadScanOverride`) verified role-gated at action body. Publication/invite manager gates verified. | ✅ Strong (after verification downgrades). |
| API6 Unrestricted Access to Sensitive Flows | Medium | Publication password unlock has durable 5/hr lockout + escalating delays. Recipient/session binding prevents cross-publication reuse. | ✅ Strong. |
| API7 SSRF | Low | No outbound fetch of user-supplied URLs found on public surfaces; AI route calls DeepSeek with server-side key only. | ✅ No finding. |
| API8 Security Misconfiguration | Medium | CSP Report-Only except `/share` (SEC-07); `unsafe-inline`/`unsafe-eval`; `signedReadUrlFactory` unused (SEC-09); origin-source inconsistency request-url vs env (SEC-10). | ⚠️ SEC-07/09/10. |
| API9 Improper Inventory Management | Medium | Legacy `webhooks/resend/` has no route file (confirmed absent, not a finding); Supabase archaeology retained but not live; June audit stale. | ✅ Managed. |
| API10 Unsafe Consumption of APIs | Low | DeepSeek integration server-side; no third-party API consumed from client with user input. | ✅ No finding. |

## OWASP Top 10 (LLM/legacy) — relevant items
- **A01 Broken Access Control:** covered above (API1/API5).
- **A07 Identification & Authentication Failures:** Better Auth; no password flow; magic-link single-use hashed. ✅.
- **A08 Software & Data Integrity Failures:** dependency review is a release-gate gap (Dependabot disabled); not an authz finding.
- **A09 Security Logging Failures:** `account_security_events` audit table, keyed-HMAC IP/UA. Monitoring/alerting is an ops gap (Doc 09).

## Credential material taxonomy (publication surface)
See Doc 03 Section C. Key invariants:
- Raw token / raw password **never stored** — HMAC hash, AES-GCM ciphertext, scrypt hash only.
- Access + session cookies are HMAC-signed and bound to `{publicationId, credentialVersion,
  tokenDigest, recipientId}` — rotation/password-change invalidates them.
- Recipient token is a distinct raw bearer (URL `?recipient=`); cross-publication reuse
  defended at session-cookie + repository layers (SEC-06 defense-in-depth).
- A stored hash is **not** a substitute for a raw bearer value: the public routes require
  the raw token in the URL to derive the hash for lookup.

## Tenant isolation (verified)
- `workspaceId` always session-derived (`profile.default_workspace_id`); never path/body
  for scoping (privacy intake stores it as metadata only, unauthenticated).
- Every membership probe embeds `workspace_id` + `user_id`.
- **No cross-tenant leak found** in the D1 app-authz layer.
- Platform-admin bypass is explicit and centralized.

## Threat scenarios (residual)

| ID | Threat | Vector | Current control | Residual risk |
|---|---|---|---|---|
| T-01 | Invite CSRF via stripped headers | cross-site POST to `/invite/<token>/accept` with no Origin/Referer | `isAllowedInviteOrigin` returns `true` (SEC-01); **SameSite=Lax session cookie + authenticated-session requirement** (both present) ⇒ exploitability materially reduced | LOW–MED (defense-in-depth gap; demoted from HIGH after mitigation audit) |
| T-02 | D1/Worker quota exhaustion | parallel hits to public/auth surfaces | app-level D1 limits; no edge limit (SEC-02) | MED-HIGH for broad launch |
| T-03 | Estimate mutation abuse | high-frequency authenticated edits | in-memory per-isolate limiter (SEC-03) | MED |
| T-04 | CollaborationRoom socket exhaustion | many unauthenticated upgrades | per-message authz correct; no upgrade rate limit (SEC-04) | MED |
| T-05 | Replay of single-row creates | double-submit project/component create | idempotency only on bulk + estimate rows (REQ-IDEMP-01) | LOW |
| T-06 | Oversized public JSON body | large `request.json()` before clamp | post-parse length clamps only (SEC-06) | LOW |
| T-07 | Refactor drops repo-layer auth | moving `loadRecipientProposals` repo call | repository `getCurrentUserContext` (SEC-05) | LOW (defense-in-depth) |
| T-08 | Token in URL leaked via Referer | outbound nav from `/share` | `Referrer-Policy: no-referrer` enforced | LOW (mitigated) |
| T-09 | `assertSameOrigin` (read path) allows missing Origin | GET `/api/share/[token]/activity` with no Origin | read-only; allows missing Origin (standard for same-origin GET) | LOW (consistency asymmetry vs `assertSameOriginPublicPost`) |
| T-10 | Caller-authorized Server Action without action-layer auth | direct POST to `maybeTriggerSharedLinkActivityDigest` | callers (comment/decision routes) authorize recipient token+CSRF+session | LOW (SEC-11, defense-in-depth) |

## Privacy / data minimization
- Telemetry IP/UA is keyed-HMAC (not reversible) — cannot reconstruct IPs.
- Publication snapshots strip GPS, remap UUIDs to opaque public IDs, enforce
  `location_visibility`.
- Privacy intake sanitizes metadata (strips `token|secret|password|cookie|authorization`).
- Client-error logging hashes UA + redacts PII.
- No `NEXT_PUBLIC_*` secret exposure (verified all are non-secret config/IDs).

## Findings that were flagged by exploration but VERIFIED NON-ISSUES
Recorded to prevent re-investigation:
1. `group-actions.ts` auth-only — **non-issue** (per-user `WHERE workspace_id=? AND user_id=?`).
2. `beta-allowlist-admin-actions.ts` auth-only — **non-issue** (`canManageClosedBetaAllowlist`).
3. `beta-feedback-review-actions.ts` auth-only — **non-issue** (`canReviewBetaFeedback`).
4. `publication/actions.ts` trust-RLS-only — **non-issue (with one exception → SEC-11)**:
   every publication *mutation* taking a `projectId` calls `assertProjectPublicationManager`.
   **Exception:** `maybeTriggerSharedLinkActivityDigest` (`actions.ts:1968`) has no
   action-layer auth — it relies on callers (comment/decision routes) having authorized
   the recipient. Refiled as SEC-11 (LOW, defense-in-depth), folded into SEC-05 audit scope.
   Reads (`refreshProjectPublicationSummary`) use `requireAuth` + workspace-scoped queries.
5. `template-editor-actions.ts` cross-ws IDOR — **non-issue** (`requireWorkspaceTemplate` SQL scope).
6. `recipient-proposals/actions.ts` no auth — **downgraded to SEC-05** (repo-layer auth).

These six were flagged HIGH/P0 by read-only exploration; the lead's direct source read
corrected them. This is the core maker/checker value-add of this planning pass.
