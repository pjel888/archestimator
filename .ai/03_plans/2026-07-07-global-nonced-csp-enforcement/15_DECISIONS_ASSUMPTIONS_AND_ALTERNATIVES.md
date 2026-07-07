# 15 — Decisions, Assumptions, and Alternatives

Load-bearing decisions with rationale and rejected alternatives. IDs are stable.

## DEC-01 — CSP generation moves to the Next.js 16 proxy (nonce site)
- **Problem:** Where to generate the per-request nonce and CSP.
- **Constraints:** Must propagate the nonce to server components (so `<Script>` and
  framework inline scripts can be tagged); must work on OpenNext/Cloudflare Workers;
  must be testable locally.
- **Options considered:**
  - (A) **Proxy generates nonce, sets x-nonce request header + CSP response header**
    (official Next.js 16 pattern).
  - (B) Worker-only rewrite in `worker.ts` (sets CSP but cannot set the request header
    that server components read).
  - (C) Generate nonce in the root layout via `headers()`-independent crypto + prop-
    drill (no request-header propagation; framework scripts wouldn't auto-nonce).
- **Recommended:** (A).
- **Reason:** Official guide (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
  documents exactly this; the codebase already injects request headers via the proxy
  (`request-proxy.ts createRequestPathResponse`); Next.js auto-applies the nonce to its
  own framework scripts only when the `x-nonce` request header is present.
- **Rejected:** (B) — OPEN-DEC-007 already rejected it (harder to test locally; no
  request-header propagation). (C) — loses framework auto-nonce.
- **Consequences:** CSP must move out of `next.config.headers()` for nonced routes
  (SEC-09).
- **Conditions to change:** If OpenNext proves unable to propagate `x-nonce` to RSC
  render, fall back to (B) with worker.ts injecting CSP + a different propagation
  (hashed scripts) — but this is unlikely (auth-gating already proves header injection
  works).
- **Closes:** OPEN-DEC-007.

## DEC-02 — Keep `/share` tracking-free and map-free (OPEN-DEC-008)
- **Problem:** Which third-party origins to allow on `/share`.
- **Decision:** `/share` policy has **no** analytics (GA4/Clarity/Cloudflare) and **no**
  maps. Only `'self'`, the nonce, and avatar hosts.
- **Reason:** `/share` carries confidential client proposals; tracking scripts must not
  load (verified: `PublicPageShell`/`LandingAnalyticsLoader` are not imported by
  `share/[token]/page.tsx`).
- **Closes:** OPEN-DEC-008 (share portion).

## DEC-03 — Workshop/invite keep their existing 3p allowlists until telemetry
- **Decision:** Workshop allows Maps origins; invite is minimal. No new origins added
  without a brief + test (per OPEN-DEC-008).
- **Closes:** OPEN-DEC-008 (workshop/invite portion).

## DEC-04 — `strict-dynamic` + nonce + allowlist posture
- **Problem:** Pure nonce vs `strict-dynamic`.
- **Decision:** `script-src 'self' 'nonce-{n}' 'strict-dynamic' <allowlist>`.
- **Reason:** `strict-dynamic` lets nonced first-party scripts load their dependencies
  without expanding the allowlist per-dependency (web.dev strict-csp; MDN). The
  allowlist is belt-and-braces for the bootstrap.

## DEC-05 — Remove `'unsafe-inline'` from script-src on enforced routes
- **Decision:** Enforced script-src omits `'unsafe-inline'` (browsers ignore it when a
  nonce is present anyway, but removed for clarity).
- **Reason:** SEC-03.

## DEC-06 — Proxy matcher excludes prefetch
- **Decision:** Add the official `missing: next-router-prefetch, purpose: prefetch`
  clauses.
- **Reason:** Avoids nonce churn + stale-nonce CSP mismatch (official recommendation;
  RISK-16).

## DEC-07 — `'unsafe-eval'` in dev only
- **Decision:** Production policies omit `'unsafe-eval'`; dev includes it.
- **Reason:** Official guide: React uses `eval` in dev for error-stack reconstruction;
  production code uses no `eval`.

## DEC-08 — Retain `style-src 'self' 'unsafe-inline'` (not a hardening target)
- **Problem:** React-rendered `<style>` tags can't be nonced natively.
- **Decision:** Keep `style-src 'self' 'unsafe-inline'`. Removing it is **not** a goal.
- **Reason:** Standard Next.js posture; the 4 inline `<style>` sites (`03` §3.4) would
  break otherwise.
- **Rejected:** nonce-on-style (not supported), hashed styles (brittle).
- **Accepted residual:** CSS-based exfil (RISK-11) — lower severity than script XSS.

## DEC-09 — Trusted Types deferred
- **Decision:** Do **not** add `require-trusted-types-for 'script'` in this plan.
- **Reason:** Would break GA4/Clarity/Maps; large separate rollout; too risky for
  first-users.
- **Future:** A dedicated Trusted Types plan after CSP enforcement is stable.

## DEC-10 — Add a `test:csp` script
- **Decision:** Add `package.json` script `test:csp` bundling the CSP-specific vitest
  files for fast iteration.
- **Reason:** No CSP-specific script exists today; speeds the rollout loop.

## DEC-11 — Marketing-page dynamic-rendering tradeoff (owner decision)
- **Problem:** Nonced CSP requires dynamic rendering; marketing pages are static-cached.
- **Options:**
  - (A) Enforce nonced CSP on marketing, accept dynamic (TTFB cost).
  - (B) Keep marketing Report-Only until perf measured.
- **Recommendation:** Start with (B); enforce on authenticated/token surfaces (already
  dynamic) first; flip marketing to (A) only after PERF-01 TTFB within threshold.
- **Decision owner:** Philip (owner).
- **Impact of each:** (A) stronger security, modest TTFB cost; (B) zero perf cost,
  marketing XSS not blocked until later flip.
- **Blocks:** P5 (landing enforcement).

## DEC-12 — Demo seed `imageUrl` hosts (owner decision)
- **Problem:** `src/components/workshop/estimate-tree-data.ts` references external hosts
  (Unsplash/IKEA/Boysen/etc.) not in any CSP or `remotePatterns`.
- **Options:**
  - (A) Migrate to local `/component-thumbnails/` (preferred — removes external dep,
    aligns with CSP minimization).
  - (B) Allowlist the hosts in workshop img-src + next.config remotePatterns.
- **Recommendation:** (A) migrate.
- **Decision owner:** Philip (owner) — touches demo/seed data content.
- **Blocks:** workshop img-src correctness (not the core nonce pipeline).

## DEC-13 — Env-flag kill-switch
- **Decision:** `ARCHESTIMATOR_CSP_NONCE_ENABLED` master switch + per-route-class
  enforcement mode config.
- **Reason:** Safe rollback (OPS-01).

## Assumptions

| ID | Assumption | Validated? | Source strength |
|---|---|---|---|
| ASSUMP-01 | OpenNext/Workers propagates proxy-set request headers to RSC render | Yes (auth gating proves it: `workshop/layout.tsx` reads `AUTH_REQUEST_PATH_HEADER`) | repo evidence |
| ASSUMP-02 | Next.js auto-nonces its framework scripts when `x-nonce` is present | Yes | official docs (CSP guide "How nonces work") |
| ASSUMP-03 | `crypto.randomUUID()` is available in the proxy runtime (edge) | Yes | official docs example uses it; Workers global | docs |
| ASSUMP-04 | No existing code relies on `'unsafe-inline'` for legitimate non-first-party scripts | Yes | `03` §3.3 inventory | repo evidence |
| ASSUMP-05 | `/share` loads no analytics/maps | Yes | `03` §3.3; cloudflare-web-analytics-integration.test.ts | repo evidence |
| ASSUMP-06 | Workers per-isolate rate-limiting is acceptable for first-users volume | Inferred | derived (low volume pre-launch) |
| ASSUMP-07 | The 5 exact-match landing routes inherit/don't-inherit catch-all hardening headers per Next.js source matching | Not fully validated → DISCOVERY in P1 | to be confirmed in-browser |
