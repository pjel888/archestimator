# 04 — Requirements Specification

Stable IDs. Categories: FR (functional), SEC (security), ARCH (architecture),
PERF (performance), REL (reliability), OPS (operational), TEST (testing),
DOC (documentation), A11Y (accessibility). Source strength abbreviations:
`brief` = PROMPT.md; `repo` = repo evidence; `docs` = official Next.js 16 doc;
`decision` = prior `.ai` decision; `derived` = inferred from evidence.

Every requirement has acceptance criteria that are objective and testable. The
shadow-path matrix (end of this doc) covers the behavior-bearing flows.

## SEC requirements (the core)

### SEC-01 — Per-request nonce generation in the proxy
- **Statement:** The Next.js 16 proxy (`src/proxy.ts` → `src/lib/auth/request-proxy.ts`)
  generates a cryptographically random, base64-encoded nonce per HTTP response using
  `crypto.randomUUID()`, exactly as documented in the official Next.js 16 CSP guide.
- **Rationale:** Nonces must be unpredictable and unique per request; only the proxy
  runs before render and can both set the response header and propagate to server
  components.
- **Source:** `docs` (official CSP guide); `repo` (proxy already injects request
  headers via `NextResponse.next({ request })`).
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-SEC-01a: The proxy sets an `x-nonce` request header on every non-static,
    non-prefetch HTML route, value = base64 of a UUID ≥ 122 bits of entropy.
  - AC-SEC-01b: The proxy sets a `Content-Security-Policy` response header whose
    `script-src` contains `'nonce-{value}'` matching the `x-nonce` value.
  - AC-SEC-01c: Two consecutive requests to the same route produce different nonces.
- **Validation:** unit test invoking `proxy()` with a mock `NextRequest`; assert
  headers (`tests/vitest/csp-nonce-proxy.test.ts`, new).
- **Affected code:** `src/proxy.ts`, `src/lib/auth/request-proxy.ts`, new
  `src/lib/csp/nonce.ts`.
- **Risks:** nonce-injection conflicts with existing auth-gating logic → serialize in
  one agent; RISK-04.
- **Status:** pending.

### SEC-02 — Nonce propagation to inline scripts
- **Statement:** The root layout (`src/app/layout.tsx`) reads the `x-nonce` request
  header via `headers()` and passes it as the `nonce` prop to every `next/script` and
  inline `<script>` (the 9 sites in `03` §3.3). Next.js auto-applies the nonce to its
  own framework inline scripts.
- **Rationale:** Without propagation, dropping `'unsafe-inline'` breaks first-party
  scripts. The official guide confirms Next.js auto-nonces its own scripts when the
  `x-nonce` header is present.
- **Source:** `docs`; `repo`.
- **Priority:** P0.
- **Dependencies:** SEC-01.
- **Acceptance criteria:**
  - AC-SEC-02a: `AuthStateMismatchRecoveryScript`, `CloudflareWebAnalytics`,
    `ClarityScript`, `GoogleAnalytics` render with `nonce={nonce}`.
  - AC-SEC-02b: JSON-LD scripts (`structured-data.tsx` ×2, v3 FAQ) render with
    `nonce={nonce}`.
  - AC-SEC-02c: The two server-rendered HTML inline scripts
    (`worker-route-optimizations.ts:173`, `pending-invite/route.ts:56`) inject the
    nonce into the `<script>` tag.
  - AC-SEC-02d: Browser DevTools shows Next.js framework inline scripts carry the nonce
    attribute (proof gate).
- **Validation:** DOM/ unit test for nonce prop; browser proof (Playwright) for
  framework-script auto-nonce.
- **Affected code:** `src/app/layout.tsx`, `src/components/auth/AuthStateMismatchRecoveryScript.tsx`,
  `src/components/landing/{CloudflareWebAnalytics,ClarityScript,LandingAnalyticsLoader}.tsx`,
  `src/components/landing/structured-data.tsx`,
  `src/components/landing-v3/ArchestimatorLandingPage.tsx`,
  `src/app/workshop/pending-invite/route.ts`,
  `src/lib/cloudflare/worker-route-optimizations.ts`.
- **Status:** pending.

### SEC-03 — Drop `'unsafe-inline'` from `script-src` on enforced routes
- **Statement:** Enforced route policies use `script-src 'self' 'nonce-{nonce}'
  'strict-dynamic' <3p-allowlist>` with **no** `'unsafe-inline'`. (When a nonce is
  present, browsers ignore `'unsafe-inline'` anyway, but it is removed for clarity.)
- **Rationale:** `'unsafe-inline'` defeats CSP's XSS protection.
- **Source:** `brief`; `docs` (MDN script-src).
- **Priority:** P0 (per phase; enforced routes only).
- **Dependencies:** SEC-01, SEC-02.
- **Acceptance criteria:**
  - AC-SEC-03a: Enforced route `script-src` does not contain the literal
    `'unsafe-inline'`.
- **Validation:** policy-string unit test against the proxy builder.
- **Status:** pending.

### SEC-04 — `'unsafe-eval'` removed in production, kept in dev
- **Statement:** Production enforced policies omit `'unsafe-eval'`. Dev policies
  include it (React uses `eval` for dev error stacks — official guide).
- **Rationale:** Production code does not use `eval`; dev tooling does.
- **Source:** `docs` (official CSP guide "Good to know" box).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-SEC-04a: `NODE_ENV==='production'` policy omits `'unsafe-eval'`.
  - AC-SEC-04b: `NODE_ENV==='development'` policy includes `'unsafe-eval'`.
- **Validation:** policy builder unit test with both envs.
- **Status:** pending.

### SEC-05 — `style-src 'self' 'unsafe-inline'` retained (intentional)
- **Statement:** All policies use `style-src 'self' 'unsafe-inline'`. Removing
  `'unsafe-inline'` from style-src is explicitly **not** a goal (DEC-08).
- **Rationale:** React-rendered `<style>` tags cannot be nonced natively.
- **Source:** `docs` (MDN); `repo` (`03` §3.4).
- **Priority:** P0 (document the decision; not a hardening target).
- **Acceptance criteria:**
  - AC-SEC-05a: Every policy's `style-src` includes `'unsafe-inline'`, and DEC-08
    records why.
- **Status:** pending (decision recorded).

### SEC-06 — `connect-src` includes WebSocket for collaboration
- **Statement:** `connect-src` includes `'self'` and `wss:` (and `ws:` in dev) so the
  collaboration Durable Object WebSocket works under enforcement.
- **Rationale:** Today's CSP omits `wss:`; the WebSocket would break under enforcement.
- **Source:** `repo` (`collaboration-room-client.ts:81`).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-SEC-06a: Enforced policy `connect-src` contains `wss:` (prod) and `ws:` (dev).
- **Validation:** policy builder unit test; browser proof on `/workshop` collaboration.
- **Status:** pending.

### SEC-07 — `img-src` covers Google OAuth avatars on all route classes
- **Statement:** Landing + workshop + share policies include the avatar hosts
  (`*.ggpht.com`, `*.googleusercontent.com`, `lh3.googleusercontent.com`).
- **Rationale:** Today missing from landing → logged-in user avatar breaks.
- **Source:** `repo` (`03` §3.5).
- **Priority:** P1.
- **Acceptance criteria:**
  - AC-SEC-07a: Landing policy `img-src` includes the avatar hosts.
- **Status:** pending.

### SEC-08 — CSP violation reporting endpoint + header
- **Statement:** A `/api/csp-report` route handler accepts violation reports (JSON,
  `application/csp-report` and `application/reports+json`), redacts sensitive fields,
  rate-limits, and logs structured events. Policies include `report-to` /
  `Reporting-Endpoints` referencing it.
- **Rationale:** The `OPEN-DEC-008` observation window cannot close without telemetry.
- **Source:** `decision` (OPEN-DEC-008); `docs` (W3C Reporting API; MDN).
- **Priority:** P0 (P1 phase — prerequisite for enforcement).
- **Acceptance criteria:**
  - AC-SEC-08a: `/api/csp-report` returns 204 for valid reports, 400 for malformed.
  - AC-SEC-08b: Reports are rate-limited per-IP (abuse resistance).
  - AC-SEC-08c: No raw URL/cookie/token values are logged (redaction).
  - AC-SEC-08d: Policies include `Reporting-Endpoints` + `report-to`.
- **Validation:** route handler unit test; adversarial oversized/malformed report test.
- **Status:** pending.

### SEC-09 — No double CSP header
- **Statement:** Once a route class is owned by the proxy's nonced CSP, the
  corresponding static CSP string is **removed** from `next.config.headers()` to avoid
  two `Content-Security-Policy` headers.
- **Rationale:** Next appends `headers()` entries to proxy response headers → duplicate
  CSP → browser behavior is ambiguous.
- **Source:** `repo` (`03` §3.8); `decision` (OPEN-DEC-007).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-SEC-09a: For each enforced route class, exactly one `Content-Security-Policy`
    response header is present (verified via proxy unit test + browser DevTools).
- **Status:** pending.

## ARCH requirements

### ARCH-01 — CSP generation moves from `next.config.headers()` to proxy (per phase)
- **Statement:** Nonced route classes generate CSP in the proxy; static hardening
  headers (nosniff/DENY/no-referrer/HSTS/X-Robots-Tag) stay in `next.config.headers()`.
- **Rationale:** Nonces are per-request; hardening headers are static.
- **Source:** `docs`; `decision` (OPEN-DEC-007).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-ARCH-01a: Hardening headers still present on all routes after rollout.
  - AC-ARCH-01b: Nonced CSP present only where the proxy owns the route.
- **Status:** pending.

### ARCH-02 — Route-class policy selector
- **Statement:** A `src/lib/csp/policy.ts` module selects the policy per route class
  (landing, workshop, invite, share, auth, default) so the proxy emits the correct
  nonced CSP.
- **Rationale:** Centralizes the per-route-class allowlist (avoids duplication).
- **Source:** `derived`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-ARCH-02a: Single source of truth for route-class → policy mapping.
- **Status:** pending.

### ARCH-03 — Proxy matcher excludes prefetch requests
- **Statement:** The proxy `config.matcher` adds the official `missing` clauses for
  `next-router-prefetch` and `purpose: prefetch`.
- **Rationale:** Avoids nonce churn + CSP mismatch between prefetched route data and
  the eventual render (official recommendation).
- **Source:** `docs` (official CSP guide matcher example).
- **Priority:** P1.
- **Acceptance criteria:**
  - AC-ARCH-03a: Prefetch requests do not pass through nonce generation.
- **Status:** pending.

## PERF requirements

### PERF-01 — Dynamic-rendering cost isolated + measured
- **Statement:** Nonced routes become dynamic (nonces require it). The plan documents
  which routes lose static caching and measures TTFB before/after.
- **Rationale:** Marketing pages are currently cached (`s-maxage=31536000`); forcing
  them dynamic has a performance cost.
- **Source:** `docs` (CSP guide "Forcing dynamic rendering"); `repo`.
- **Priority:** P1 (landing phase P5).
- **Acceptance criteria:**
  - AC-PERF-01a: TTFB regression on affected routes is measured and recorded.
  - AC-PERF-01b: If TTFB regression exceeds the threshold (DEC-11), the route stays
    Report-Only.
- **Status:** pending (see `09`).

## REL requirements

### REL-01 — CSP failure does not break the page during Report-Only phase
- **Statement:** During Report-Only phases, a CSP misconfiguration logs violations but
  does not block rendering.
- **Rationale:** Report-Only is the safe observation window.
- **Source:** `docs` (MDN Content-Security-Policy-Report-Only).
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-REL-01a: Report-Only phase: zero user-visible breakage even with policy errors.
- **Status:** pending.

## OPS requirements

### OPS-01 — Per-phase rollback
- **Statement:** Each enforcement phase has a one-command rollback (flip the route class
  back to Report-Only or restore the static CSP).
- **Rationale:** Enforcement can break third-party scripts; must be reversible.
- **Source:** `brief` ("rollback points").
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-OPS-01a: Each phase documents the exact rollback command/config change.
- **Status:** pending (see `13`).

### OPS-02 — Observation window telemetry gate
- **Statement:** An enforcement phase proceeds only after ≥ N days of Report-Only
  telemetry with zero unexpected violations (or triaged-and-accepted violations).
- **Rationale:** OPEN-DEC-008.
- **Source:** `decision`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-OPS-02a: Telemetry gate defined with sample window + violation threshold.
- **Status:** pending.

## TEST requirements

### TEST-01 — Existing CSP tests rewritten for proxy-owned CSP
- **Statement:** Tests #1, #3, #4 (`03` §3.11) are rewritten to test the proxy output
  (invoke `proxy()`, assert response headers), not the static `next.config` strings.
  Test #5 P11 placeholders become real assertions.
- **Source:** `repo`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-TEST-01a: Rewritten tests pass against the proxy implementation.
- **Status:** pending.

### TEST-02 — New proxy/nonce unit tests
- **Statement:** New tests cover nonce uniqueness, nonce-in-CSP match, route-class
  policy selection, no-double-header, dev vs prod eval, wss: presence.
- **Source:** `derived`.
- **Priority:** P0.
- **Status:** pending.

### TEST-03 — Browser proof on each enforcement phase
- **Statement:** Each enforcement phase has a Playwright/browser proof that (a) the
  page renders, (b) no CSP violations in the console, (c) third-party scripts load,
  (d) collaboration WebSocket connects.
- **Source:** `brief` ("CSP violation evidence").
- **Priority:** P0.
- **Status:** pending.

## DOC requirements

### DOC-01 — `.ai` decisions updated
- **Statement:** D-9/D6, OPEN-DEC-007, OPEN-DEC-008 are updated to record closure by
  this plan's DEC-* entries; `current-state.md` P0.2 row updated per phase.
- **Source:** `repo` (`.ai`).
- **Priority:** P1.
- **Status:** pending.

## Shadow-path matrix (behavior-bearing flows)

Applies to the runtime behavior the future implementation must handle. "Report-Only
phase" = violations logged, not blocked; "Enforced phase" = violations blocked.

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Proxy nonce generation | nonce set on every HTML route | n/a (always generates) | n/a | n/a | n/a | crypto.randomUUID never throws in Workers | two requests → two nonces | n/a | headers present | TEST-02 |
| Nonce propagation to inline script | script runs | missing x-nonce header → script has no nonce → blocked under enforcement (logged) | n/a | malformed nonce → ignored by browser | n/a | n/a | n/a | n/a | page works under Report-Only; breaks under enforcement if nonce missing | TEST-03 |
| Google Maps loader (workshop) | map loads | Maps API key missing → loader no-op | n/a | bad key → maps error (non-CSP) | n/a | network fail → maps error | n/a | n/a | map renders or graceful empty | TEST-03 |
| Collaboration WebSocket | wss connects | no session → connect fails (non-CSP) | n/a | n/a | unauthorized → close | DO unreachable → retry | two tabs → two sockets | reconnect on close | realtime updates or stale UI | TEST-03 |
| CSP report submission | 204 returned | malformed body → 400 | empty body → 400 | oversized → 413/429 | n/a (public endpoint) | n/a | flood → rate-limited | idempotent (always 204) | no user-visible result | SEC-08 tests |
| OAuth callback (`/auth/callback`) | redirect to app | missing code → error page | n/a | bad code → error | state mismatch → reset (existing) | IdP down → error | n/a | n/a | signed-in or error page | TEST-03 |
| Enforced CSP blocks injected script | blocked + reported | n/a | n/a | n/a | n/a | n/a | n/a | n/a | injection does not execute | TEST-03 |

## Credential-material taxonomy

This plan touches no new credentials. The CSP nonce is **derived** (random per
request), **client-visible** (it is in the HTML `nonce=` attribute and the response
header by design), **single-use**, and **non-secret** (its only purpose is to match
the response header to the inline scripts in that same response). It is not a session
token, not stored, not rotated (regenerated per request). No credential material
taxonomy beyond this is required because CSP adds no tokens, cookies, or secrets.

| Material | Type | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| CSP nonce | derived (random) | proxy per request | response header + HTML attribute only (not persisted) | browser CSP engine + inline scripts | Yes (by design) | No | n/a — single-use per response | TEST-02 |
