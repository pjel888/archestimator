# 01 — Executive Summary

## What this plan delivers

A phased, evidence-gated path from Archestimator's current **partial / Report-Only
CSP** posture to a **globally enforced, per-request-nonced Content-Security-Policy**
across every user-facing HTML route, while preserving the OpenNext/Cloudflare Workers
deployment and the existing auth-gating proxy.

## Why now

Archestimator is **preparing for first users** (per `AGENTS.md` "Current stage"). CSP
is a P0.2 launch-gate item (`.ai/10_state/current-state.md` records it as PARTIAL as of
2026-07-05). Today's posture has three concrete weaknesses that block launch-readiness:

1. **Report-Only does not protect.** `/`, `/about`, `/features`, `/pricing`, `/contact`,
   `/workshop/*`, `/invite/*` ship `Content-Security-Policy-Report-Only` with
   `'unsafe-inline'` + `'unsafe-eval'` in `script-src` (`next.config.ts:20-47`). A
   Report-Only header never blocks an injected script — it only logs.
2. **The "enforced" surface isn't strict.** `/share/:path*` is enforced
   (`next.config.ts:191-206`) but reuses `landingReportOnlyCsp`, so it still allows
   `'unsafe-inline'` / `'unsafe-eval'`. The enforcement is symbolic.
3. **Coverage gaps.** `/login`, `/signup`, `/access-required`, `/auth/callback`,
   `/api/auth/*`, and all non-`/api/share` API routes get **no CSP** at all — only the
   catch-all hardening headers (`next.config.ts:266-279`). Additionally
   `/trust`, `/privacy`, `/terms`, `/security`, `/new` **load third-party analytics
   scripts via `PublicPageShell` but are not in the Report-Only source list** — a real
   coverage hole the audit confirmed.

## The core engineering move

Replace the **static, blanket-allowlist** CSP strings in `next.config.ts headers()`
with a **per-request, nonce-based CSP generated in the Next.js 16 proxy**
(`src/proxy.ts` → `src/lib/auth/request-proxy.ts`), following the exact pattern in the
official Next.js 16 CSP guide (`node_modules/next/dist/docs/01-app/02-guides/
content-security-policy.md`):

```
proxy generates nonce (crypto.randomUUID, base64)
  → sets x-nonce REQUEST header (so server components can read it)
  → sets Content-Security-Policy RESPONSE header with 'nonce-{value}' + 'strict-dynamic'
  → Next.js auto-applies the nonce to its own framework scripts (RSC flight, runtime)
  → root layout (src/app/layout.tsx) reads x-nonce via headers()
  → passes nonce prop to next/script components (AuthStateMismatchRecoveryScript,
     CloudflareWebAnalytics, ClarityScript, GoogleAnalytics) and to inline JSON-LD
```

This is the documented, supported Next.js 16 approach. The existing proxy already
runs on every non-static route and already injects request headers via
`NextResponse.next({ request: { headers } })` (`request-proxy.ts createRequestPathResponse`)
— so the nonce pipeline slots into a pattern the codebase already uses.

## Key constraints discovered

- **Static-page nonce problem:** nonces require dynamic rendering. Marketing pages
  (`/`, `/about`, etc.) are currently cached (`s-maxage=31536000` in the proxy).
  Moving them to nonced CSP forces them dynamic — a real performance cost weighed in
  `09` and resolved per-route-class in `06`.
- **Header-ownership conflict:** `next.config.ts headers()` AND the proxy would both
  emit `Content-Security-Policy` → Next appends, producing two headers. The rollout
  must move CSP out of `next.config.headers()` for nonced routes (the 4 plain
  hardening headers stay). This is `OPEN-DEC-007` from the prior CSP decision brief.
- **`style-src 'unsafe-inline'` stays.** React-rendered `<style>` tags (e.g.
  `PublicPageShell.tsx`, `spinner.tsx`) cannot be nonced natively. The official and
  standard posture is `style-src 'self' 'unsafe-inline'`. Removing it is not a goal.
- **`connect-src` is missing `wss:`** today — the collaboration Durable Object
  WebSocket (`collaboration-room-client.ts:81`) would break under any enforced CSP
  until added.
- **No CSP violation reporting endpoint exists** — `report-to` / `Reporting-Endpoints`
  / `/api/csp-report` are all absent. The Report-Only observation window
  (`OPEN-DEC-008`) cannot close until one exists.
- **OpenNext/Workers:** proxy-based per-request nonce generation is supported (auth
  gating already proves dynamic per-request behavior works on Workers). No wrangler
  header block interferes (`wrangler.jsonc` has no `headers[]`).

## Phased rollout (summary — full detail in `11` and `13`)

| Phase | Objective | Routes | Mode | Rollback |
|---|---|---|---|---|
| P1 | Reporting infra + nonce pipeline (no enforcement) | all HTML routes proxy-emits Report-Only nonced CSP alongside existing static CSP; observation only | Report-Only | disable proxy CSP branch (env flag) |
| P2 | Close content gaps | add `wss:` to connect-src; add avatar hosts to landing img-src; decide seed-host migration (DEC-12) | Report-Only | revert policy string |
| P3 | Enforce on safest surface first | `/share/:path*` + `/invite/*` (token-bearing, already `no-store`) flip to enforced nonced CSP | Enforced | flip back to Report-Only |
| P4 | Enforce on authenticated app | `/workshop/*` flips to enforced nonced CSP | Enforced | flip back to Report-Only |
| P5 | Enforce on marketing + close remaining gaps | landing + `/login`/`/signup`/`/access-required`/`/auth/callback` enforced; remove static CSP from `next.config.headers()` | Enforced | restore static CSP + remove proxy branch |

Each phase has an explicit proof gate (browser proof, CSP violation telemetry, test
suite) and a rollback point. The recommended policy posture for nonced routes:
`script-src 'self' 'nonce-{nonce}' 'strict-dynamic' <3p-allowlist>` +
`style-src 'self' 'unsafe-inline'`.

## Major findings

- **Architecture:** proxy is the correct nonce site; root layout must become `async`.
- **Security:** nonce-guess resistance is strong (`crypto.randomUUID` base64 ≈ 122
  bits); the residual bypass risks are static-page caching and the absence of a
  reporting endpoint — both addressed.
- **Performance:** marketing pages lose static caching under nonced CSP. The plan
  isolates this to P5 (last) and documents the cost; `/share` and `/workshop` are
  already dynamic so no cost there.
- **Blast radius:** every HTML route + 4 existing tests must change; the data plane
  (D1/R2/DO/Queue/Email) is untouched.

## Readiness verdict (full detail in `17`)

`verification_mode: emulated`. Per the suite authority contract, this caps overall
readiness at **97** and caps package status at **`CONDITIONALLY READY`** for a
high-blast-radius planning package unless an independent reviewer or explicit owner
acceptance later approves it.

**Recommended package status: `CONDITIONALLY READY`.** The single condition is **owner
acceptance of the marketing-page dynamic-rendering tradeoff** (DEC-11) and the
seed-host migration decision (DEC-12). Once those two owner decisions are recorded,
the non-token-bearing phases (P1, P2) can move to implementation immediately; the
enforcement phases (P3–P5) proceed after the reporting endpoint and observation
window close.

## External decisions still required

- **DEC-11 (owner):** accept that marketing pages become dynamic (lose `s-maxage`
  static caching) under enforced nonced CSP, OR keep marketing Report-Only.
- **DEC-12 (owner):** migrate demo seed `imageUrl` hosts to local thumbnails vs.
  allowlist them (currently in no CSP and no `remotePatterns`).

No destructive, paid, or provider-mutation action is required by this plan.
