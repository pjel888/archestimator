# 03 — Evidence & Verification: Share Routes & Proxy /api Self-Gating

Adversarial verification pass, 2026-06-19. Method: re-opened every cited file from disk and tried
to REFUTE each finding; ran a live Supabase read to confirm the durable tables backing the
rate-limit / lockout claims exist. **Result: 0 refutations, 0 severity adjustments. All 7 findings
confirmed. Launch-blocker count: 0.**

## Per-finding verdicts

### SHARE-PROXY-01 — Proxy `/api/*` short-circuit is safe (every route self-gates) — CONFIRMED (info, LB false)
- **Re-proof:** `src/proxy.ts:56` returns `NextResponse.next({ request })` when `pathname`
  starts with `/api` (also `.`/`_next`), BEFORE the Supabase auth gate. Confirmed against the
  full route enumeration — `find src/app/api -name route.ts` = exactly 16 routes (8 share + 8
  other), matching the audit table.
- **Tried to refute:** looked for a route with no guard. Spot-verified guards directly:
  `component-library/{attachments,images}` and `projects/images` import + call
  `requireCurrentUserContext` / `getCurrentUserContext`; `proposal.xlsx` uses
  `getCurrentUserContext` + 401/404 fail-closed; `ai/{ask,package-builder}/route.ts` delegate to
  handlers that gate via `getAiRequestUserContext()` → 403 on non-supabase/no-workspace
  (`ai/ask/handler.ts:118-126`, `ai/package-builder/handler.ts:196-201`), and the route is also
  flag-gated (`isAiRoutesEnabled()`, default **false**). `health` returns static liveness JSON
  (no data); `webhooks/resend` requires `RESEND_WEBHOOK_SECRET` + svix-signed
  `verifyResendWebhookPayload`. **Could not refute — no unguarded route exists.**
- **Cross-pack:** the Auth pack (2026-06-19-Auth-And-Session-Security) explicitly **deferred**
  "the `/api` short-circuit's API-route impact — domain 4" and confirmed `src/proxy.ts` is the
  wired Next-16 gate. So this gap pack legitimately closes work no domain owned. existing_plan_overlap
  = covered-by:Auth (seam wiring) + closes the deferred per-route detail.
- **Proof gate:** static read PROVES each route references a guard symbol and that the proxy
  short-circuits `/api`. It CANNOT prove runtime auth end-to-end (would need a deployed request
  test). R2 (self-gating invariant test) raises the static guarantee for future routes but has
  the same limit.

### SHARE-PROXY-02 — `session` POST has no rate-limit — CONFIRMED (low, LB false)
- **Re-proof:** read `session/route.ts` in full. POST (lines 38-102) does same-origin
  (`assertSameOrigin`), password-cookie gate (56-68), and `verifySharedLinkRecipientToken`
  (70-73) — but **no `check*RateLimit` call anywhere** in the file. Contrast: `activity`,
  `comment`, `decision`, `password` all call a durable limiter.
- **Tried to refute (severity inflation check):** recipient tokens are `createPublicationToken()`
  = `toBase64Url(randomBytes(bytes))` with `bytes = 32` (`security.ts:62,68`) = 256-bit. Guessing
  is computationally infeasible, so this is NOT a brute-force vector — the prior auditor's
  "low / not a launch blocker" rating is correct, not inflated. The only real cost is resource
  abuse asymmetry + inconsistency with the rest of the surface.
- **Proof gate:** static read fully PROVES the absence of a limiter and the token entropy. It
  CANNOT prove production request volumes / abuse impact (load-test territory). The durable table
  `security_rate_limit_events` exists (live DB read), so R1's recommended fix has a backing store.

### SHARE-PROXY-03 — `activity` exposes non-internal comment bodies without a recipient session — CONFIRMED, accepted design (low, LB false)
- **Re-proof:** `activity/route.ts:156-160` builds `commentsQuery` filtered only by
  `publication_id` + `is_internal=false` — **unconditional on recipient session**. The verified
  recipient session (`verifiedRecipientId`, lines 144-154) gates ONLY `responsesQuery` /
  `eventsQuery` (161-174). Only the password gate (125-137) sits in front of comments. The client
  is `createPublicationServiceClient()` (line 108) = **service-role, RLS bypassed**, so the share
  link + optional password are the sole access control on comment bodies.
- **Tried to refute (is email/PII leaked?):** No. `author_email` is selected (line 158) but the
  view model `toPublicActivityViewModel` (60-78) omits it; author renders as display-name or
  "Client" (line 218); compose drops `visibility==="internal"` (line 252). So the exposure is
  bounded to non-internal comment *bodies* + display names to any link/password holder.
- **Tried to refute (is this a new exposure?):** No — it matches the documented "public
  shared-link activity" design (2026-06-01 OWASP shared-link surface; current-state
  2026-06-03/06-04). Hence owner-decision, not a blocker. existing_plan_overlap =
  covered-by:2026-06-01-security-owasp/14-shared-link-publication-surface.
- **Proof gate:** static read PROVES the comments query is session-independent and that email is
  not emitted. DB read confirms the tables. It CANNOT decide product intent — that is R3, an
  owner call. If rejected, the fix is mechanical (gate comments behind `verifiedRecipientId`).

### SHARE-PROXY-04 — Comment stored-XSS mitigated on write + render — CONFIRMED (info, LB false)
- **Re-proof:** `comment/route.ts:74-91` `sanitizeAndTruncate` strips `<script>`/`<style>`/all
  tags, decodes a fixed entity set, collapses whitespace, truncates to 1000 chars. Render side:
  `rg dangerouslySetInnerHTML src/components/share src/app/share` = **zero hits** (re-run, empty),
  so bodies render as auto-escaped React text nodes.
- **Tried to refute:** the strip is regex-based (not a full HTML parser), but because the render
  side never uses `dangerouslySetInnerHTML`, even a sanitizer-bypass string is escaped at render.
  Defense is at the render boundary, which is the robust layer. Could not produce a stored-XSS
  path.
- **Proof gate:** static read PROVES no `dangerouslySetInnerHTML` in the share surface and that
  the write-side sanitizer runs. It CANNOT prove every downstream consumer of `body` (e.g. email
  notifications) escapes — out of this pack's lane (Email domain), noted as a cross-domain check.

### SHARE-PROXY-05 — Password lockout is durable-backed, in-mem is fast-path only — CONFIRMED (info, LB false)
- **Re-proof:** `password/route.ts:46` calls `checkProjectPublicationPasswordRateLimit` and `:87`
  calls `recordProjectPublicationPasswordFailure` — both durable (table
  `security_rate_limit_events`, confirmed present via live DB read). The in-memory Map in
  `security.ts` is complementary. Brute-force protection survives serverless cold starts.
- **Tried to refute:** if the durable call were absent, the in-mem-only store would be defeated by
  cold starts — but the durable call IS present (line 46/87). Not a gap.
- **Proof gate:** static read + DB existence read PROVE the durable layer is wired and the table
  exists. They CANNOT prove the exact lockout threshold semantics under concurrency (RPC behavior
  is domain 2 RLS/RPC); the `ask`/`password` paths already exercise this table in prod.

### SHARE-PROXY-06 — Session cookie scope/flags/TTL/signing sound — CONFIRMED (info, LB false)
- **Re-proof:** issuance in `session/route.ts:75-90`: signed cookie via
  `getSharedLinkSessionCookieParts` (HttpOnly, SameSite=Lax, Secure-in-prod, 24h, HMAC binding
  publicationId+credentialVersion+recipientId per the audit's `security.ts:473-501` cite); the
  non-HttpOnly `_ok` companion carries only `"1"` (no secret). DELETE expires both. Credential
  version is derived from the password hash, so a password change invalidates old sessions
  (verified usage at `activity/route.ts:130,150` via `deriveCredentialVersion(pub.password_hash)`).
- **Tried to refute:** the `_ok` cookie is reachable by JS — but it holds no secret and is purely
  a client UX hint; the authoritative session cookie is HttpOnly + signed. No defect.
- **Proof gate:** static read PROVES flags/TTL/binding and that `_ok` is non-secret. It CANNOT
  prove the HMAC secret is strong in prod env (config/secret-management lane).

### SHARE-PROXY-07 — reusable-sources / aec-classification no launch risk — CONFIRMED (info, LB false)
- **Re-proof:** `reusable-sources/actions.ts` — every exported action begins with
  `requireCurrentUserContext()` (lines 67, 81, 110, 297, 364) and uses RLS-scoped user clients,
  never service-role (comment at :402 "RLS-scoped user client only … never an admin/service-role
  client"). aec-classification = pure static lookup table (no I/O, no auth surface).
- **Tried to refute:** looked for an export missing the guard or a service-role client — none
  found. No injection/authz/data-exposure path.
- **Proof gate:** static read PROVES the guard prefix + client choice. RLS row-scoping itself is
  domain 2; this only confirms the actions route through user (RLS-enforced) clients.

## Live DB reads performed
- `information_schema.tables` (public): confirmed presence of `security_rate_limit_events`,
  `shared_link_comments`, `shared_link_responses`, `shared_link_events`,
  `shared_link_recipients`, `project_publications`. Backs SHARE-PROXY-02 (R1 store),
  SHARE-PROXY-03 (comment table), SHARE-PROXY-05 (durable lockout store).

## What this pass cannot prove (honest limits)
- Runtime end-to-end auth on each `/api` route (no deployed-request test was run).
- Production abuse/load behavior of the uncapped `session` route (load-test territory).
- RLS row-scoping correctness of the user-client paths (domain 2 RLS/RPC).
- Downstream (email/export) escaping of comment bodies (domains 11/email).
- Strength of the HMAC/cookie signing secret in the prod environment (secret management).
