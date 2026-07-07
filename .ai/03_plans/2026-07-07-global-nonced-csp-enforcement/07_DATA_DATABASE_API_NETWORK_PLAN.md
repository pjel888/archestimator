# 07 — Data, Database, API, and Network Plan

## 7.1 Data plane: not applicable

**This plan touches no data plane.** CSP is response-header work. There are:

- **No D1 schema changes.** No migration, no new tables/columns/indexes, no app-authz
  changes, no repository helpers, no generated-type changes. `cloudflare-env.d.ts`
  unchanged.
- **No R2 object-policy changes.**
- **No Durable Object state changes** (CollaborationRoom is untouched; the WebSocket
  is allowed via `connect-src wss:`).
- **No Queue/Cron changes.**
- **No Email changes.**
- **No Better Auth changes.** Session cookies, OAuth flow, invites, password unlocks
  — all unchanged. CSP only affects what the browser may execute/load.
- **No legacy-provider (Supabase/Postgres/Vercel/Resend) interaction.**

Per the Creating-Plan-Prompt, a Database Change Blueprint is required only "for every
database-relevant feature." This feature is not database-relevant. **Database Change
Blueprint: not applicable** (with this recorded evidence).

The single new route handler, `/api/csp-report`, is a **logging endpoint**, not a
data-mutation endpoint. It receives violation reports, redacts them, rate-limits, and
logs. It writes no application state. If durable violation counts are later desired
(for the telemetry gate OPS-02), that is a **separate future task** and would use a
small D1 table or a Workers Analytics Engine binding (out of scope here; flagged in
`13`).

## 7.2 API contracts

### New endpoint: `/api/csp-report`

| Aspect | Contract |
|---|---|
| Methods | `POST` (others → 405) |
| Request Content-Type | `application/csp-report` (legacy) or `application/reports+json` (Reporting API) |
| Request body (legacy) | `{ "csp-report": { "document-uri", "referrer", "violated-directive", "effective-directive", "original-policy", "blocked-uri", "line-number", "column-number", "source-file", "status-code", "script-sample" } }` |
| Request body (Reporting API) | Array of `{ type:"csp-violation", url, body:{...} }` |
| Response | `204 No Content` (legacy success); `200 OK` (Reporting API success); `400` malformed; `413` oversized; `429` rate-limited |
| Auth | Public (no auth — browsers submit cross-origin without credentials; the report must not require a session) |
| Rate limit | per-IP, e.g. 60/min; over → 429 |
| Redaction | drop query strings from `document-uri`/`blocked-uri`/`source-file`; never log cookies/tokens; cap `script-sample` length |
| Logging | structured event: `{ directive, route (host+path only), blocked_host, ts, count }` |
| Idempotency | always returns success for valid reports (no side effects) |

### Existing endpoints affected

None. The existing `/api/share/*`, `/api/auth/*`, `/api/projects/*`, etc. are JSON
endpoints that do not serve HTML and therefore do not need a `script-src`-bearing CSP.
They continue to receive only the hardening headers.

## 7.3 Network behavior

- **No new outbound fetches.** The CSP report endpoint **receives** reports; it does
  not call out.
- **No new WebSocket origins.** The collaboration WebSocket is same-origin (`wss://`
  derived from `window.location.href`); SEC-06 adds `wss:` to `connect-src`.
- **No new third-party domains.** OPEN-DEC-008 says no new sources; this plan respects
  it. The only additions are the **already-used** avatar hosts missing from landing
  (SEC-07) and `wss:` (SEC-06).
- **No CDN/edge changes.** Cloudflare edge caches HTML for marketing pages today;
  enforcing nonced CSP on marketing flips them dynamic (§6.4, DEC-11). The edge still
  caches static assets (`_next/static`, images).
- **`Cache-Control: no-store` on `/share`** is preserved — it already guarantees a
  fresh nonce per request, which is exactly what nonced CSP requires.

## 7.4 Access-path matrix

No data sources are added or changed. For completeness:

| Source | Chosen path | Runtime role | Authorization check | Proof source | Fallback |
|---|---|---|---|---|---|
| (none — header-only plan) | proxy sets response header | edge | n/a | proxy unit test | worker.ts fallback (`06` §6.7) |

## 7.5 Retry / timeout / partial-failure

- CSP header setting is synchronous in the proxy; no retry needed. If the proxy throws
  (e.g., `crypto.randomUUID` unavailable — not possible in Workers), the request falls
  through to Next without CSP — fail-open (page renders, no CSP). This is acceptable
  during Report-Only; for enforced routes, a missing CSP is a finding to fix-forward.
- `/api/csp-report` is best-effort: a failed report submission is invisible to the user
  (browsers fire-and-forget). No retry on the client.

## 7.6 Backward compatibility

- Existing clients see **stronger** headers (or identical, during Report-Only phase).
  No API contract changes. No breaking change to any `/api/*` consumer.
- The `/share` enforced CSP becomes **strict** (loses `'unsafe-inline'`/`'unsafe-eval'`)
  — but the nonce pipeline (SEC-01, SEC-02) ensures first-party scripts still run. The
  only "breakage" risk is third-party scripts not in the allowlist; `/share` loads none
  (verified, `03` §3.3), so no breakage.

## 7.7 Database Change Blueprint

**Not applicable.** No D1/R2/DO/Queue/Email/KV change. Evidence: this plan's entire
scope is response headers + one logging route handler. Recorded per
Creating-Plan-Prompt §8A ("If a feature does not touch [the database category], state
why with evidence").
