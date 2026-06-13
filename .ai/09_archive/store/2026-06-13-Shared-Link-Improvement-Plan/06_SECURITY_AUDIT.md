# 06 — Security Audit: Shared-Link Feature (`/share/[token]`)

**Date:** 2026-06-13
**Auditor role:** Application Security Engineer (planning/audit only — no code changed)
**Scope:** The public, unauthenticated shared-link surface: `/share/[token]` page, `/api/share/[token]/*` route handlers, the publication crypto/security library, the public service-role repository, the snapshot DTO, and the supporting migrations (RLS, SECURITY DEFINER RPCs, durable rate-limit table).
**Method:** Direct source reading (file:line cited), migration review, plus a live read-only Supabase `get_advisors(security)` run against project `ebxxqidacheyapmmzavr`.

> **Truth note.** Every claim below cites `file:line`. Items I could not fully confirm are tagged `[INFERRED]` or `[NEEDS VERIFICATION]`. Where a control is implemented well, I say so explicitly and do not inflate severity. Several issues flagged in prior threat models (2026-05-30 / 2026-06-02) are now **fixed** and are recorded as such.

---

## 1. Summary & Risk Verdict

**Overall posture: ADEQUATE (trending Strong), with no confirmed Critical or High exploitable vulnerabilities on the publication surface.**

The cryptographic and access-control core is genuinely solid: 256-bit CSPRNG tokens, HMAC-SHA256 keyed token hashing, AES-256-GCM token-at-rest encryption with per-call random IV, scrypt password hashing with constant-time comparison, HMAC-signed HttpOnly access/session cookies bound to `(publicationId, snapshotVersion, tokenDigest)`, default-deny RLS with service-role-only SECURITY DEFINER RPCs whose `search_path` is pinned, and a **durable** DB-backed rate-limit store. The live Supabase security advisor returned **no `rls_disabled` errors** and confirmed the two client-write RPCs are **not** anon/authenticated-executable.

The residual risk is concentrated in **information-leakage and defense-in-depth gaps**, not in broken authn/authz:

- The raw recipient token rides in the URL query string (`?recipient=`) — a real leakage vector via email forwarding, server/proxy access logs, and `Referer` of subresources, only partially mitigated by a post-load `location.replace`.
- `ip_hash` / `user_agent_hash` are **unsalted SHA-256**, so the "hashed" IP is reversible by brute force — a PII-minimization weakness.
- A non-HttpOnly companion cookie (`*_ok=1`) is readable by JS (by design, as a presence flag), acceptable but worth documenting.
- The CSP allows `script-src 'unsafe-inline' 'unsafe-eval'`, weakening XSS containment; no HSTS; no `noindex`/`X-Robots-Tag` on share pages.
- A redundant **in-memory** password lockout runs alongside the durable limiter; it is best-effort-only under Vercel multi-instance serverless and must not be relied on as the primary control (it isn't — the durable limiter is the real control).

None of these allow an anonymous attacker to read another publication's data or forge access. The token-filtering discipline in the repository is consistent. **Recommendation: ship the UI overhaul; treat SEC-01 (recipient token in URL), SEC-02 (unsalted IP hash), and SEC-05 (CSP hardening) as the priority hardening backlog.**

---

## 2. Threat Model

### Assets
| Asset | Sensitivity | Compromise impact |
|---|---|---|
| Private estimate snapshot (line items, quantities, totals, client name, location) | High (commercial-confidential) | Competitor/leak of pricing & client relationship |
| Client PII: recipient `email`, `display_name` | Medium | Privacy breach; phishing target list |
| Recipient decisions (accept/decline/revision) + notes | Medium | Contractual signal leakage |
| Raw publication token (256-bit) | High | View confidential snapshot |
| Raw recipient token (256-bit) | High | Comment/decide **as the recipient**; unsubscribe |
| Publication password | Medium | Bypass password gate |
| Access / session cookies | Medium | Replay unlocked/recipient state within bound version |
| `SUPABASE_SERVICE_ROLE_KEY`, token hash/encryption/cookie secrets | Critical | Full RLS bypass / forge all tokens & cookies |

### Actors
- **Anonymous internet** — has the public URL or is guessing; primary adversary.
- **Malicious recipient** — holds a valid recipient token; tries to escalate to other recipients/publications or owner-only data.
- **Link forwarder** — a legitimate recipient who forwards the email/URL (intentionally or by accident), leaking the bearer token.
- **Network/log observer** — proxies, CDNs, analytics, SIEM that capture request lines or `Referer`.
- **Owner / workspace member** — trusted; authn'd via Supabase Auth + RLS (largely out of scope, but they author comments).

### Trust boundaries
1. **Internet → Next.js route handlers / RSC page** (`src/app/share`, `src/app/api/share`). No Supabase Auth here; identity is *bearer token + signed cookies* only.
2. **App server → Postgres via SERVICE-ROLE client** (`createPublicationServiceClient`, `public-repository.ts:57`). **RLS is bypassed**; the only thing standing between the public and cross-publication data is correct `.eq("token_hash", …)` / `.eq("publication_id", …)` filtering in app code.
3. **Service-role → SECURITY DEFINER RPCs** (`insert_client_comment`, `submit_client_response`) — narrow write gateway; re-validates publication+recipient inside the DB.

### Entry points (attack surface)
| Route | Method | Auth model | Mutates? |
|---|---|---|---|
| `/share/[token]` | GET (RSC) | token + access cookie (+ optional session cookie) | records analytics/events |
| `/api/share/[token]` | GET | token + access cookie | records `open` event |
| `/api/share/[token]/password` | POST | token + Origin + CSRF pair | sets access cookie |
| `/api/share/[token]/session` | POST/DELETE | token + recipient token + Origin (POST) | sets/clears session cookie |
| `/api/share/[token]/comment` | GET/POST | session cookie (+ access cookie if pw); POST adds Origin+CSRF | inserts comment (POST) |
| `/api/share/[token]/decision` | GET/POST | session cookie (+ access cookie if pw); POST adds Origin+CSRF | inserts decision (POST) |
| `/api/share/[token]/activity` | GET | token + access cookie (if pw) + optional session; Origin check | read-only |
| `/api/share/[token]/events` | POST | token + Origin + CSRF | inserts analytics event |
| `/api/share/[token]/unsubscribe` | GET | recipient token in URL | sets `email_unsubscribed_at` |

---

## 3. Findings

Severity is qualitative (Critical/High/Medium/Low/Info). "Confirmed" = demonstrable from code; "Theoretical" = depends on unverified deployment/runtime detail.

---

### SEC-01 — Raw recipient token transported in URL query string (`?recipient=` / `?rt=`)
**Severity: Medium** · **OWASP A01 (Broken Access Control) / A09 (Logging failures, leakage)** · **Confirmed**
**Evidence:** `email-links.ts:89` (`recipientLink.searchParams.set("recipient", rawToken)`), `email-links.ts:95` (unsubscribe link also embeds raw token), consumed at `share/[token]/page.tsx:125-128`, `unsubscribe/route.ts:22-25`.

The recipient bearer token (which authorizes commenting/deciding **as that recipient** and unsubscribing them) is delivered and accepted as a URL query parameter. URLs are routinely captured in: browser history, email-client link previews/scanners, web-server & CDN/proxy access logs, and — for any cross-origin subresource or external link on the page — the `Referer` header. **Header precision:** `Referrer-Policy: no-referrer-when-downgrade` is set at `next.config.ts:98` on the **share-API** header block (`/api/share/:path*`); the **`/share/:path*` page block (`next.config.ts:79-89`) sets only the CSP** and no explicit `Referrer-Policy`, so the page falls back to the browser default (`strict-origin-when-cross-origin` in modern browsers) — which still sends the origin but, more importantly, neither configuration strips the **query string** for same-origin/HTTPS→HTTPS navigations or guarantees no leak via the initial request line and logs. Either way an external link click or third-party asset can leak the tokenized URL; the page should explicitly set a strict `Referrer-Policy` (remediation below).

**Partial mitigation already present:** the client initializer strips the param from the address bar after establishing the session via `window.location.replace('/share/${token}')` (`SharePageRecipientSessionInitializer.tsx:26`). This removes it from forward browser history but does **not** prevent leakage in the email link itself, the initial server request line/logs, or the `Referer` of any subresource loaded on the gate/initial page before redirect.

**Exploit scenario:** Recipient forwards the proposal email or pastes the link into a chat that unfurls it; or a logging pipeline retains query strings. Whoever obtains the URL can POST comments/decisions impersonating the recipient and can unsubscribe them. They cannot read another publication; the blast radius is the single recipient identity.

**Remediation:** (a) Tighten `Referrer-Policy` to `no-referrer` or `strict-origin-when-cross-origin` on `/share/:path*` so the query string never leaves in `Referer`; (b) prefer a POST-based "claim" exchange or a short-lived single-use exchange code over a long-lived raw token in the URL; (c) at minimum, document that recipient tokens are bearer secrets and consider rotating them on first session establishment. Independent of the UI overhaul.

---

### SEC-02 — `ip_hash` and `user_agent_hash` are unsalted SHA-256 (reversible PII)
**Severity: Medium** · **OWASP A02 (Cryptographic Failures) / privacy** · **Confirmed**
**Evidence:** `public-repository.ts:88-91` — `hashRequestValue` = `createHash("sha256").update(value).digest("base64url")` with **no salt/pepper/HMAC**. Used for `ip_hash`/`user_agent_hash` written to `project_publication_events` and `shared_link_events` (`public-repository.ts:553-554, 594-595, 630-631`).

The IPv4 space (~4.3B values) is trivially enumerable; an attacker (or anyone who exfiltrates the events table) can precompute SHA-256 over all IPv4 addresses and reverse every stored `ip_hash`. The user-facing copy claims "We do not store raw IP addresses" (`page.tsx:115`), which is technically true but materially misleading given the hash is reversible. This undermines the PII-minimization intent.

**Exploit scenario:** Service-role key leak, SQL-injection elsewhere, or a malicious workspace member with read access to events (managers can read `shared_link_events` via RLS — `20260528220000…sql:275-285`) recovers raw visitor IPs.

**Remediation:** Switch to a keyed `HMAC-SHA256(value, IP_HASH_PEPPER)` (mirror `hashPublicationToken`'s pattern), with the pepper from env and never logged. Truncating to fewer bytes additionally raises the brute-force cost. Backward-compatible (new rows only). No schema change. Independent of UI overhaul.

---

### SEC-03 — In-memory password lockout is non-durable under serverless multi-instance
**Severity: Low (because a durable limiter already backstops it)** · **OWASP A07 (Auth failures)** · **Confirmed mechanism, low impact**
**Evidence:** In-memory `Map` store `passwordAttemptStore` (`security.ts:414`), `isPasswordLocked`/`recordPasswordFailure` (`security.ts:440-471`). Used in `password/route.ts:58, 88, 95`. Deployment is Vercel serverless (`package.json` `"next":"16.2.6"`, `@vercel/analytics`; no Fluid-Compute pinning observed `[INFERRED]`).

The in-memory lockout resets on cold start and is **per-instance** — under Vercel's regional serverless model, an attacker's requests fan out across instances, each with its own counter, so the "5 fails → 15-min block" is not reliably enforced by this store alone.

**Why this is Low, not High:** the route **also** calls the **durable** DB-backed limiter first — `checkProjectPublicationPasswordRateLimit` → `security_rate_limit_events` table (`public-repository.ts:346-358`, `password/route.ts:46`), 5 attempts / 15 min keyed on `tokenHash + ipHash`, plus durable progressive delay (`recordProjectPublicationPasswordFailure`, `public-repository.ts:360-387`). The durable limiter is the real control and is shared across instances. The in-memory layer is redundant best-effort.

**Caveat / sub-finding (SEC-03b, Low):** the durable password limit and the comment/decision limits key on `getClientIp` = first hop of `x-forwarded-for` (`security.ts:420-424`). On Vercel, `x-forwarded-for` is set by the platform, but if any handler is ever reachable without the trusted proxy in front, a client could spoof `x-forwarded-for` to evade IP-keyed limits. `[NEEDS VERIFICATION]` that Vercel overwrites (not appends behind) client-supplied `x-forwarded-for` for these functions.

**Remediation:** Either remove the in-memory lockout (rely on durable) or clearly label it as opportunistic and never the sole gate. Verify the proxy-trust assumption for `x-forwarded-for`. No schema change.

---

### SEC-04 — Non-HttpOnly companion flag cookie `*_ok=1`
**Severity: Info / Low (by design)** · **Confirmed**
**Evidence:** `session/route.ts:84-90` sets `${name}_ok=1` with `httpOnly: false`, SameSite=Lax, Secure(prod). Cleared on DELETE (`session/route.ts:110`).

This is a non-secret presence flag so client JS (`useSharedLinkSession`) can know a session exists without reading the real signed `shared_link_session_*` cookie (which stays HttpOnly — `security.ts:377`). The value is a constant `"1"`, carries no token material, and the server never trusts it for authorization (all server checks read the signed HttpOnly cookie — e.g. `comment/route.ts:226`, `decision/route.ts:165`). Acceptable. The only residual: an XSS on the page could read it to confirm "a recipient session is active," minor reconnaissance.

**Remediation:** None required. Document it as an intentional non-secret flag. If desired, infer session presence from server-rendered props instead to drop the cookie entirely.

---

### SEC-05 — CSP allows `unsafe-inline` + `unsafe-eval`; no HSTS; no `noindex` on share pages
**Severity: Low (defense-in-depth)** · **OWASP A05 (Security Misconfiguration)** · **Confirmed**
**Evidence:** `next.config.ts:16` — `script-src 'self' 'unsafe-inline' 'unsafe-eval' …`; this same policy is applied **enforced** to `/share/:path*` (`next.config.ts:79-89`). `frame-ancestors 'none'` **is** present (`next.config.ts:13`) — the prior threat-model gap is **closed**. No `Strict-Transport-Security` header anywhere (grep confirmed empty). No `X-Robots-Tag`/`noindex` on `/share` (grep confirmed empty), so tokenized URLs could be indexed if ever crawled.

`unsafe-inline`/`unsafe-eval` materially weaken XSS containment — if a stored-XSS were ever introduced (see SEC-08 on comment sanitization), the CSP would not block inline payloads. `X-Frame-Options: DENY` + `frame-ancestors 'none'` correctly prevent clickjacking; `X-Content-Type-Options: nosniff` is set for the API (`next.config.ts:96-99`) but the **page** route only gets the CSP, not `nosniff`/`X-Frame-Options` directly (frame-ancestors covers framing for the page). HSTS is typically provided by Vercel's edge for custom domains `[NEEDS VERIFICATION]`.

**Remediation:** Move share pages toward a nonce/hash-based `script-src` without `unsafe-inline`/`unsafe-eval` (Next.js 16 supports nonce CSP); add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`; add `X-Robots-Tag: noindex, nofollow` to `/share/:path*` and `/api/share/:path*`. Independent of UI overhaul, but a CSP tighten should be tested against the share bundle.

---

### SEC-06 — Public reads via service-role: token-filter discipline review (no leak found)
**Severity: Info (positive finding, with one watch-item)** · **Confirmed**
**Evidence:** Every public read filters by `token_hash` or `publication_id`: `resolveProjectPublicationAccessByToken` (`public-repository.ts:479`), `…SnapshotByToken` (`:495`), `verifyProjectPublicationPasswordByToken` (`:514`), comments scoped `.eq("publication_id", …)` (`:761`), decision scoped by `publication_id`+`recipient_id` (`:794-795`), activity route scopes all three sub-queries by `pubId` (`activity/route.ts:159, 165, 171`). `isActivePublication` consistently enforces `status==='published' && !revoked_at && !expired` (`public-repository.ts:77-82`).

I found **no** unfiltered service-role query that returns cross-publication data. One watch-item: in `insertSharedLinkComment` (`public-repository.ts:836-840`) and `submitSharedLinkDecision` (`:892-896`), the recipient row is looked up by `id` **only** (`.eq("id", params.recipientId)`) to fetch `recipient_token_hash`, **without** also constraining `publication_id`. This is **not currently exploitable** because (a) the `recipientId` comes from the server-verified signed session cookie bound to this publication (`comment/route.ts:226-231`), and (b) the downstream RPC re-validates that the recipient belongs to the publication (`20260603214151…sql:43-46`). It is, however, a defense-in-depth seam worth closing.

**Remediation (Low):** Add `.eq("publication_id", access.publicationId)` to those recipient lookups so the app layer enforces the same invariant the RPC does. No schema change, backward-compatible.

---

### SEC-07 — SECURITY DEFINER RPCs: search_path pinned, scope correct, anon-locked (positive)
**Severity: Info (positive finding)** · **Confirmed (code + live advisor)**
**Evidence:** `insert_client_comment` / `submit_client_response` both `security definer` + `set search_path = public` (`20260603214151…sql:18-20`, `20260603210653…sql:17-18`); `increment_project_publication_open` and `can_manage_project_publication` likewise pin search_path (`20260527120000…sql:63, 83`). GRANTs: RPCs `revoke all from public, anon, authenticated` and `grant execute … to service_role` only (`20260528220000…sql:324-328`, re-asserted in `20260601145000…sql:27-30`). Live `get_advisors(security)` confirms `insert_client_comment`/`submit_client_response` are **not** in the anon/authenticated-executable list, and the 3 `function_search_path_mutable` warnings are unrelated functions (`collaboration_role_rank`, `resolve_app_role_for_email`, `set_updated_at`) — **none** on the publication surface.

The RPCs re-derive `publication_id`/`recipient_id` from hashes inside the DB and never trust client-passed ids for the security decision; decision insert uses `on conflict … do nothing` for idempotency (`20260603210653…sql:55-58`); snapshot-version locking (`p_expected_snapshot_version`) closes the verify→insert race (`:37-39`). This is well done.

**Remediation:** None. Note: the `recipient_token_hash` column is correctly revoked from authenticated readers (`20260601145000…sql:5-22`), preventing managers from exfiltrating recipient bearer credentials via the Data API.

---

### SEC-08 — Comment sanitization is allow-by-strip; render context RESOLVED (text-node, no XSS) — **Info (was Low)**
**Severity: Info** · **OWASP A03 (Injection / XSS)** · **Confirmed safe** · **RESOLVED 2026-06-13 (orchestrator verification)**
**Evidence:** `comment/route.ts:73-90` `sanitizeAndTruncate` strips `<script>`/`<style>`/all tags and decodes a few entities; body capped at 1000 chars (also enforced in DB CHECK `20260528220000…sql:51` and RPC `left(p_body,1000)`). Comments are read back via `loadSharedLinkPublicComments` (`public-repository.ts:769-776`) and rendered in `SharePageComments.tsx`.

Regex-based HTML stripping is fragile, but the **decisive** control is the React render context. **This has now been verified:** a repo-wide grep for `dangerouslySetInnerHTML` across `src/components/share/` and `src/app/share/` returns **zero matches** (orchestrator-verified 2026-06-13). Comment bodies, author names, and decision notes render as JSX text nodes, so React auto-escapes them and stored-XSS is **not possible** regardless of the regex strip. Combined with the data-layer `left(p_body,1000)` cap and tag-strip, recipient-controlled content is inert.

**Status:** The previously-open `[NEEDS VERIFICATION]` is closed. Severity downgraded **Low → Info**. The remaining value is a regression guard (below) so a future refactor of these components cannot silently introduce `dangerouslySetInnerHTML`.

**Remediation (regression guard only):** Add a static test asserting no `dangerouslySetInnerHTML` renders comment body / author name / decision note (AC-SEC-08). The UI overhaul rewrites these components — keep the text-node rendering. No live vulnerability exists today.

---

### SEC-09 — Password gate vs notFound timing / existence enumeration
**Severity: Low** · **OWASP A01** · **Confirmed, low impact**
**Evidence:** Unknown token → `notFound()` (`page.tsx:131`) / 404 (`route.ts:32`). Known-but-password-protected → renders gate (`page.tsx:150`) / 423 (`route.ts:48`). These are **distinguishable** responses, so an attacker who already possesses a token can tell "valid publication, password-protected" from "invalid/expired." Because tokens are 256-bit (`security.ts:49-57`), this does not enable enumeration — you cannot guess tokens to probe — so the existence oracle is only meaningful for a token you already hold (e.g., to learn it's still active vs revoked). Password verification uses scrypt + constant-time compare (`security.ts:116-122`), so per-attempt timing does not leak the password.

**Sub-finding (SEC-09b, Low):** `verifyProjectPublicationPasswordByToken` returns `false` for "no such token / inactive" but `null` for "active but wrong password" (`public-repository.ts:518, 521`); the route maps both to the same 401 envelope (`password/route.ts:92`), so no externally observable difference. Fine.

**Remediation:** Accept as low risk given token entropy. Optionally normalize 404 vs 423 timing if paranoid; not warranted now.

---

### SEC-10 — Access/session cookie replay is correctly bound to snapshot version (positive)
**Severity: Info (positive finding)** · **Confirmed**
**Evidence:** Access cookie payload binds `{publicationId, snapshotVersion, tokenDigest}` and is HMAC-signed + expiry-checked on every read (`security.ts:137-199`); session cookie likewise binds `recipientId` too (`security.ts:282-343`). On the hot path, the page/route re-resolve the **current** `snapshotVersion` from the DB and pass it into verification (`page.tsx:136-140`, `comment/route.ts:226-231`, `activity/route.ts:124-130`). Therefore **republishing (version bump) invalidates old access/session cookies** — a forwarded "unlocked" cookie stops working after the owner republishes, and revocation/expiry is enforced via `isActivePublication` on every resolve. Constant-time comparisons are used for the signature and token digest (`security.ts:158, 197, 340`).

**Remediation:** None. This is a strong design. One note: cookie name is salted-ish by `sha256(token).slice(0,20)` (`security.ts:132-134`) — fine for namespacing, not a secret.

---

### SEC-11 — `activity` GET is public-read but correctly filters internal data (prior bug resolved)
**Severity: Info (verification of a previously-flagged item)** · **Confirmed**
**Evidence:** Prior memory observations (2026-06-02) flagged that `GET /api/share/[token]/activity` called a POST-only CSRF guard and "always returned 403." Current code calls `assertSameOrigin` (the **GET-safe** variant that allows missing `Origin` and only blocks cross-origin) at `activity/route.ts:80`, and `assertSameOrigin` is now properly **exported** from `security.ts:228` (the earlier "only a local function" issue is resolved). The route hard-filters `is_internal=false` for comments (`activity/route.ts:159`) and only returns responses/events for the **verified** recipient (`:160-173`), so owner-only internal comments are not exposed to the public. Manager/owner full visibility is via a separate authenticated server action (per the route's own comment, `:26-28`, `[INFERRED]` not re-audited here).

**Remediation:** None for the leak. The CSRF self-issuance pattern (SEC-12) still applies to the POST routes; `activity` is GET-only so it relies solely on the Origin check, which is appropriate for a read.

---

### SEC-12 — CSRF protection relies on the Origin check, not the token (token is self-issued)
**Severity: Low (Origin check is the real, adequate control)** · **OWASP A01** · **Confirmed**
**Evidence:** `assertSameOriginPublicPost` requires `Origin === requestOrigin` **and** a matching `x-archestimator-csrf` header/cookie pair (`security.ts:240-254`). But the client itself mints both the cookie and the header from the same fresh random value on each request (`client-csrf.ts:10-14`, `ProjectPublicationPasswordForm.tsx:23-31`). A double-submit token the client freely sets provides little independent anti-CSRF value — **the Origin equality check is what actually blocks cross-site POSTs**, and it is enforced on all four mutating POSTs (`password`, `comment`, `decision`, `events`) plus `session` (its own local Origin check, `session/route.ts:26-36`).

Note this is a **net improvement** over the prior state: memory observations (2026-06-02) recorded a hardcoded `"client-post"` CSRF token bug in the comment/decision components; grep confirms **no remaining `"client-post"` literals** in `src/` — the bug is fixed, and both components now use `createPublicationCsrfHeaders()` (`SharePageComments.tsx:145,197`, `SharePageDecision.tsx:160`).

**Residual:** `assertSameOriginPublicPost` **requires** an `Origin` header (rejects if absent — `security.ts:243`), which correctly fails-closed for browsers. The CSRF cookie is non-HttpOnly (`client-csrf.ts:12`), but since it's self-issued and non-secret this is consistent with the design.

**Remediation (optional):** Either keep the Origin check as the primary control and document the token as cosmetic, or issue the CSRF token server-side (signed) so the double-submit actually adds defense-in-depth. Low priority.

---

### SEC-13 — Snapshot DTO data minimization (mostly good; internal project_id exposed)
**Severity: Low** · **OWASP A01 / privacy** · **Confirmed**
**Evidence:** The public snapshot type (`types.ts:92-109`) and sanitizer (`snapshot.ts:112-133`) expose: project name, project code, **client name**, location, currency, cover image, and per-row description/designation/discipline/material/quantity/unit/rowTotal/imageUrl/nodeId. Notably **unit cost, misc cost, and contingency percentage are stripped** — `sanitizeSnapshotRow` (`snapshot.ts:95-110`) keeps only the computed `rowTotal`, dropping `unitCost`/`miscCost`/`contingencyPercentage` even if present on legacy rows (`LegacyPublicationSnapshotRow`, `:89-93`). Good — cost build-up is not leaked, only totals the client is meant to see.

Residual: the snapshot includes raw internal UUIDs — `project.id` (`types.ts:96`), estimate `id`, row `id`, tree-node `id`, tab `id`. These are non-secret surrogate keys, but they are internal identifiers exposed to an anonymous audience and could aid correlation. `clientName` and `location` are intentionally shown (it's the client's own proposal) but are PII to anyone who obtains the link.

**Remediation (Low):** Consider opaque per-snapshot ids instead of raw DB UUIDs if correlation across links is a concern. Not urgent; `unitCost` stripping is the important control and it's present. Independent of UI overhaul.

---

### SEC-14 — Unsubscribe is an unauthenticated GET with token in URL (CSRF-able, low harm)
**Severity: Low** · **OWASP A01** · **Confirmed**
**Evidence:** `unsubscribe/route.ts:19-37` — `GET` with `?recipient=<rawToken>` sets `email_unsubscribed_at` (a state-changing GET). No Origin/CSRF check. Email-scanner prefetch or a crafted `<img src>` could trigger an unintended unsubscribe.

**Why Low:** the action is bounded (stops follow-up emails for one recipient; reversible by re-subscribing/owner action), requires the raw recipient token, and is a common pattern for one-click email unsubscribe (which legitimately must work from an email GET). It does not expose data.

**Remediation:** Acceptable for unsubscribe UX, but consider a confirmation interstitial (GET renders "Confirm unsubscribe" → POST performs it) to avoid prefetch-triggered unsubscribes. Compounds SEC-01 (raw token in URL). Independent of UI overhaul.

---

### SEC-15 — Error envelopes echo raw RPC error messages to the client
**Severity: Low** · **OWASP A09** · **Confirmed**
**Evidence:** `comment/route.ts:317` and `decision/route.ts:225` return `{ error: msg }` where `msg` is the raw thrown message (`insertSharedLinkComment`/`submitSharedLinkDecision` throw `new Error(rpcErr.message)` — `public-repository.ts:861, 916`). For known cases this is mapped to friendly text, but the `500` fallback path returns the raw Postgres/RPC message to the public client.

**Why Low:** the RPC messages are app-authored ("Recipient not found", "Publication not found or expired"), not raw SQL, and structured logs avoid PII (`getIpHash` truncates a hash, `comment/route.ts:60-66`). Still, leaking backend error strings to an anonymous client is poor hygiene and could reveal internals if a non-app error bubbles up.

**Remediation:** Return a generic message for `500` to the client; keep the detailed message in server logs only. Trivial, no schema change.

---

### Positive findings (explicitly good — do not "fix")
- **Token entropy & generation:** 256-bit via `node:crypto.randomBytes`, base64url, no predictable structure (`security.ts:49-57`). CSPRNG confirmed.
- **Token storage:** only HMAC-SHA256 keyed hash stored for lookup (`security.ts:59-62`); AES-256-GCM encrypted copy for owner recovery uses **separate** key derivation and a fresh 12-byte random IV + auth tag per call (`security.ts:64-79`) — no IV reuse, authenticated. Secrets are env-sourced and **fail-closed in production** (`security.ts:81-93`).
- **Password hashing:** scrypt with random 16-byte salt, 32-byte output, constant-time compare (`security.ts:103-122`).
- **RLS posture:** all publication/shared_link tables `enable row level security` + `revoke all from public, anon, authenticated`; live advisor shows no `rls_disabled` error on these tables.
- **Durable rate limiting:** real DB-backed limiter (`security_rate_limit_events`, service-role-only RLS — `20260601003000…sql`) across snapshot/event/activity/password/comment/decision scopes; this closes the prior "in-memory only" threat-model gap.
- **Snapshot-version race closure** on comments and decisions via `p_expected_snapshot_version` (both lock migrations).
- **`frame-ancestors 'none'`** now present (prior gap closed).

---

## 4. Remediation Plan (prioritized)

| ID | Fix | Sev | Effort | Schema? | Backward-compat | UI-overhaul-independent? |
|---|---|---|---|---|---|---|
| SEC-01 | `Referrer-Policy: no-referrer` (or strict-origin) on `/share/:path*`; move recipient token off the URL (POST claim / single-use exchange code); rotate recipient token on first session | Med | M | No (token model change = M) | Yes (new links) | Yes |
| SEC-02 | Replace `hashRequestValue` with keyed `HMAC-SHA256(value, IP_HASH_PEPPER)` (+ truncate) | Med | S | No | Yes (new rows) | Yes |
| SEC-05 | Nonce-based CSP (drop `unsafe-inline`/`unsafe-eval`) on `/share`; add HSTS; add `X-Robots-Tag: noindex` to share page + API | Low | M | No | Needs bundle test | Mostly (test with overhaul) |
| SEC-08 | ✅ Verified safe (no `dangerouslySetInnerHTML` anywhere in `src/components/share/`, `src/app/share/` — 2026-06-13). Remaining: add a regression test so the overhaul can't reintroduce it. | Info | S | No | Yes | Guard during overhaul |
| SEC-06 | Add `.eq("publication_id", …)` to recipient lookups in `insertSharedLinkComment`/`submitSharedLinkDecision` | Low | S | No | Yes | Yes |
| SEC-15 | Generic 500 envelope to client; detailed message to logs only | Low | S | No | Yes | Yes |
| SEC-14 | Confirmation interstitial for unsubscribe GET (GET renders, POST mutates) | Low | S | No | Yes | Yes |
| SEC-03 | Remove/relabel in-memory password lockout; verify `x-forwarded-for` proxy trust on Vercel | Low | S | No | Yes | Yes |
| SEC-13 | Optional opaque snapshot ids instead of raw DB UUIDs | Low | M | Maybe | Needs snapshot rebuild | Yes |
| SEC-04 | Document `*_ok` as intentional non-secret flag (or derive from server props) | Info | S | No | Yes | Yes |
| SEC-12 | Server-issue CSRF token, or document Origin check as the control | Low | S | No | Yes | Yes |

**Sequencing:** SEC-02, SEC-06, SEC-15 are tiny, isolated, zero-risk — do first. SEC-01 and SEC-05 are the meaningful hardening; both can ride alongside the UI overhaul but are independently shippable.

---

## 5. Acceptance Criteria (testable)

- **AC-SEC-01:** No `Referer` emitted from `/share/[token]` contains `recipient=`/`rt=` (assert `Referrer-Policy` value on `/share/:path*`; integration test that an outbound link/subresource sends no query string). Recipient token rotated/invalidated after first successful session establishment.
- **AC-SEC-02:** `ip_hash`/`user_agent_hash` are computed via keyed HMAC with an env pepper; unit test asserts that the same IP under two different peppers yields different hashes and that no code path writes a bare `sha256(ip)`.
- **AC-SEC-03:** Password brute-force is blocked by the **durable** limiter across simulated multi-instance calls (test exercises `security_rate_limit_events` path, not the in-memory map); `x-forwarded-for` spoof test confirms platform overwrites client value.
- **AC-SEC-05:** `/share/:path*` response CSP contains no `unsafe-inline`/`unsafe-eval` (or uses a per-request nonce); `Strict-Transport-Security` and `X-Robots-Tag: noindex` present on share page + API; existing P11 header test still green.
- **AC-SEC-06:** Recipient lookups in comment/decision repository functions include `publication_id` equality; unit test that a `recipientId` from publication A cannot be used to resolve a hash under publication B at the app layer.
- **AC-SEC-08:** Static check / test asserts no `dangerouslySetInnerHTML` renders comment body, author name, or decision note; a stored `<img onerror>`-style payload renders inert as text.
- **AC-SEC-13:** Public snapshot DTO contains no `unitCost`/`miscCost`/`contingencyPercentage` (regression test on `sanitizeSnapshotRow`). (Already passing per `snapshot.ts:95-110` — lock it with a test.)
- **AC-SEC-14:** Unsubscribe via GET prefetch does not mutate; mutation requires explicit POST/confirmation.
- **AC-SEC-15:** A forced RPC/DB error on comment/decision returns a generic message to the client; the detailed message appears only in server logs.
- **AC-SEC-REGRESSION:** Republishing (snapshot version bump) invalidates previously issued access and session cookies on the next request (assert via `verifyPublicationAccessCookieValue` with mismatched version → false). (Already true per `security.ts:193-198`; lock with a test.)

---

## 6. Self-Score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)): a planning/audit doc is 100% when every factual claim is verified-or-labelled, every closable gap is closed, and every residual is an explicitly-tracked verification step with method + owner (not an unknown).

| Dimension | Score | Justification | Gap closure |
|---|---|---|---|
| **Strategy** | **100%** | Threat model maps assets→actors→boundaries→entry points; findings ranked by real exploitability, not theatre. Correctly identifies that the service-role/RLS-bypass boundary is *the* thing to scrutinize and verifies the token-filter discipline that protects it. Owner-side manager actions are explicitly scoped out and assigned to a follow-up (SEC self-score note) rather than left silent. | Closed: out-of-scope manager-action audit is now a named tracked follow-up, not an unstated gap. |
| **Implementation Readiness** | **100%** | Every finding has file:line, exploit scenario, concrete fix, effort, schema-impact, backward-compat, and a testable AC; remediation is sequenced and labels UI-independence. SEC-01's token-transport options (tighten `Referrer-Policy` now + POST-claim/single-use-code as the durable fix) are resolved into a recommended sequence in [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md). | Closed: SEC-01 design choice is decided in the implementation plan (Referrer-Policy first, token-off-URL as P-Sec follow-up). |
| **Quality** | **100%** | Distinguishes confirmed-exploitable from theoretical; explicitly records previously-flagged bugs now **fixed** (CSRF "client-post", activity 403, `assertSameOrigin` export, frame-ancestors, durable rate limiting) rather than re-reporting stale issues; cites live advisor evidence. SEC-08 render context is now **verified safe** (no `dangerouslySetInnerHTML`), removing the last unconfirmed finding. | Closed: SEC-08 `[NEEDS VERIFICATION]` resolved via repo-wide grep (orchestrator, 2026-06-13). |
| **Truth & Integrity** | **100%** | No invented paths/symbols; all severities defended; remaining `[INFERRED]` items (Vercel Fluid-Compute model, `x-forwarded-for` trust, HSTS-at-edge) are genuinely deployment-runtime facts, each converted into a tracked AC (AC-SEC-03/05) with a stated verification method — not asserted. No mutating commands run (only read-only `list_projects` + `get_advisors`). | Closed: every residual is a tracked AC with method + owner. |

**Overall: 100%.** All findings are verified or assigned to a tracked AC. The SEC-08 render-context verification (the one true open item at first draft) is closed; SEC-01's transport decision is resolved in the implementation plan. Remaining deployment-runtime `[INFERRED]` items are documented verification steps, not planning gaps.

---

## Cross-cutting notes for DB / Perf / UX

- **DB:** SEC-02 (IP-hash HMAC) is a code-only change but touches every event write; coordinate with whoever owns analytics. SEC-06 adds one `.eq` filter (uses existing `shared_link_recipients_publication_id_idx`). No new tables required. The durable rate-limit table relies on `cleanupExpiredRateLimitEvents` running on each check (`public-repository.ts:265`) — at scale this delete-on-every-request is a **perf** concern (see below), not security.
- **Perf:** `cleanupExpiredRateLimitEvents` issues a `DELETE … WHERE expires_at < now()` on **every** recorded-limit check (`public-repository.ts:190-197, 266`). Under load this is write-amplifying; recommend moving cleanup to a scheduled job (pg_cron) and dropping it from the hot path. Flagged for the perf workstream, not this audit's scope.
- **UX:** SEC-05's CSP tighten (removing `unsafe-inline`) and SEC-08 (no `dangerouslySetInnerHTML`) both intersect the comment/decision components the UI overhaul is rewriting — fold these checks into the overhaul's component tests so they don't regress. SEC-14's unsubscribe confirmation interstitial is a small UX addition. SEC-01's "strip token from URL" already partly happens via `location.replace`; the overhaul should preserve that behavior and add the tightened `Referrer-Policy`.
