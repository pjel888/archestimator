# 08 — Security, Privacy, and Threat Model

## 8.1 Trust boundaries

| Boundary | Trust level | Notes |
|---|---|---|
| Browser ↔ Worker (edge) | Untrusted input | All request data untrusted; CSP is a **defense-in-depth** layer that limits what injected content can do **after** it reaches the browser |
| Worker ↔ Next render | Trusted (server-side) | Nonce generated server-side, never exposed to client before the response |
| Next render ↔ inline scripts | Trusted (first-party) | Inline scripts are authored in-repo; nonce authorizes them |
| Inline scripts ↔ third-party origins | Semi-trusted | GA4/Clarity/Cloudflare/Maps are explicitly allowlisted after review (OPEN-DEC-008) |
| `/api/csp-report` ↔ report submitters | Untrusted | Public endpoint; rate-limited; redacted |

CSP is **not** a substitute for input validation, output encoding, or authz. It is the
last line of defense: if an attacker injects HTML/script despite upstream controls,
CSP limits the blast radius (no exfil to attacker origins, no inline execution).

## 8.2 Actors

| Actor | Motivation | Capability relevant to CSP |
|---|---|---|
| Anonymous visitor | benign | n/a |
| Authenticated estimator | benign | n/a |
| Invitee / share recipient | benign (mostly); could attempt token reuse | CSP irrelevant to token authz |
| XSS attacker | inject script to exfil session/proposals | Blocked by strict CSP (no `'unsafe-inline'`, no attacker origin in `connect-src`/`script-src`) |
| Supply-chain attacker (compromised CDN) | exfil via trusted-looking script | Partially mitigated by `strict-dynamic` + nonce + allowlist; SRI would help further (out of scope) |
| Report-flooder | DoS the report endpoint | Rate-limited (SEC-08); reports are best-effort |

## 8.3 Attack surface inventory

1. **Inline script injection** (XSS) — primary threat CSP addresses.
   - Vector: stored/reflected XSS in any user-content surface (proposal comments,
     project names, share descriptions, etc.).
   - Today: `'unsafe-inline'` allows any injected script.
   - After: nonce-gated; injected scripts without the nonce are blocked + reported.
2. **External script injection** — `script-src` allowlist.
   - After: only `'self'`, the nonce, and the reviewed 3p allowlist.
3. **Exfiltration via fetch/WebSocket** — `connect-src`.
   - After: `'self' wss:` (+ analytics on landing). No attacker origins.
4. **Clickjacking** — `frame-ancestors 'none'` + `X-Frame-Options: DENY` (already in
   place).
5. **Form submission to attacker** — `form-action 'self'` (already in place).
6. **Plugin/object** — `object-src 'none'` (already in place).
7. **Base-tag hijack** — `base-uri 'self'` (already in place).
8. **Referer token leak** — `Referrer-Policy: no-referrer` (already in place; critical
   for `/invite/:token` and `/share/:token` URL tokens).

## 8.4 CSP-specific bypass vectors (threat model for the nonce itself)

| Bypass vector | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Nonce guessing** | Very Low | Full script execution | `crypto.randomUUID()` ≈ 122 bits; unguessable in the request window. Workers `crypto.randomUUID` is CSPRNG-backed. |
| **Nonce reuse across requests (static page)** | Medium if marketing enforced without dynamic | Weakens nonce to a predictable value | §6.4: enforce only on dynamic routes; marketing stays Report-Only until DEC-11 resolves |
| **Header injection by attacker** | Low (no user-controlled header reflection found) | Attacker sets a permissive CSP | No reflected-header sinks in the proxy; nonce/policy built from constants + `crypto.randomUUID` |
| **Double CSP header** | Medium if `next.config.headers()` not cleaned | Browser applies stricter of two; ambiguous | SEC-09 removes static CSP for nonced routes |
| **Missing nonce on a script** | Medium during rollout | That script blocked (enforced) or reported (Report-Only) | SEC-02 covers all 9 sites; TEST-03 browser proof per phase |
| **Report endpoint DoS** | Medium (public) | Flooded logs / cost | Rate-limit (SEC-08); cap body size; drop query strings |
| **Report endpoint info leak** | Low | Report bodies could contain sensitive URLs | Redact query strings, cap `script-sample`, never log cookies |
| **`strict-dynamic` over-propagation** | Low | A nonced script that's XSSed could load its own scripts | Acceptable tradeoff (standard posture); nonce still required for the bootstrap |
| **JSON-LD treated as executable** | Very Low | If JSON-LD were mutated to executable, CSP wouldn't catch it (it's `application/ld+json`) | JSON-LD is static + authored in-repo + `stringifyJsonLd` sanitizes; nonce added anyway for consistency |
| **Style injection** (CSS exfil) | Low | `style-src 'unsafe-inline'` allows CSS-based exfil | Accepted tradeoff (DEC-08); CSS exfil is lower-severity than script XSS |
| **Worker-script bypass** | Low | `worker-src 'self'` allows same-origin workers | No attacker-controllable worker entrypoint; acceptable |

## 8.5 Privacy implications

- **No new data collected** except CSP violation reports. Violation reports contain
  only: directive violated, route (host+path, **query redacted**), blocked host,
  timestamp, count. No user identity, no cookies, no proposal content, no tokens.
- `/api/csp-report` is a **new processing surface** for privacy purposes: it receives
  browser telemetry. Per privacy minimization, reports are redacted and aggregated.
  No PII stored.
- **HSTS preload** (already set) — privacy-neutral.
- **No new cookies.** The nonce is not a cookie.
- Consistent with `.ai/03_plans/2026-07-07-privacy-request-operations-and-erasure-workflow`:
  no retention of user data; violation logs are operational telemetry, not user data.

## 8.6 Auth/publication/share interaction

- **Better Auth:** unchanged. Session cookies unaffected. OAuth callback
  (`/auth/callback`) gets an enforced nonced CSP in P5 — the OAuth redirect still
  works (it's a 302, not script-dependent). The `AuthStateMismatchRecoveryScript` is
  nonced (SEC-02) so the state-mismatch recovery still runs.
- **Share tokens:** `/share/:token` already `no-store` + enforced. The nonce
  guarantees fresh-per-request; the token boundary (authz, enumeration lockout) is
  separate (SEC-05 launch-gate item, which is about tokens, not CSP — clarified in
  `03` §3.14).
- **Invite tokens:** `/invite/:token` gets enforced nonced CSP in P3. The raw token in
  the URL is protected by `Referrer-Policy: no-referrer` (already set).

## 8.7 Abuse resistance

- `/api/csp-report` rate-limited per-IP.
- Report body size capped (return 413 over limit).
- No reflection of report content into responses (no XSS on the report endpoint).
- No auth bypass introduced (CSP is additive; it never grants access).

## 8.8 Denial tests required (per `AGENTS.md`)

For the implementation (TEST-03 / adversarial matrix in `12`):
- Inject an inline `<script>alert(1)</script>` into a rendered page → under enforced
  CSP, blocked + reported; under Report-Only, executed + reported.
- Inject `<script src="https://evil.example/a.js">` → blocked (not in allowlist).
- Inject `<img src=x onerror=alert(1)>` → blocked (no `'unsafe-inline'` on script-src;
  inline event handlers need `'unsafe-hashes'` which we do not add).
- Submit a malformed/oversized CSP report → 400/413; submit a flood → 429.

## 8.9 Logging safety

- `/api/csp-report` logs: directive, route (no query), blocked host, ts, count.
- Never logs: cookies, Authorization, `better-auth.session_token`, share/invite raw
  tokens, OAuth state, request bodies beyond the redacted fields.
- Per `AGENTS.md` GitHub Security PR Loop: redact security evidence; use hashes/
  prefixes, not raw values.

## 8.10 Residual security risk

After full rollout (all phases), the residual risks are:
- **Style-based exfil** (accepted, DEC-08).
- **Supply-chain compromise of an allowlisted origin** (GA4/Clarity/Cloudflare/Maps) —
  partially mitigated by `strict-dynamic` + nonce; SRI would strengthen but is out of
  scope.
- **Marketing pages** if kept Report-Only (DEC-11 Option B) — they remain
  `'unsafe-inline'`-tolerant; XSS there is not blocked. Mitigated by enforcing in a
  later phase once perf clears.
