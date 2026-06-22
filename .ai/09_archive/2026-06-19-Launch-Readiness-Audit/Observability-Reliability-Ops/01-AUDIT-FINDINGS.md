# Observability, Reliability & Ops Readiness — Audit Findings (2026-06-19)

Domain 9 of the 2026-06-19 Launch-Readiness Audit. READ-ONLY review. Stage: pre-launch
closed-beta MVP, no external users yet. Repo: `/Users/philiplewis/Documents/archestimator`.

## Scope & coverage

**Read in full:** `src/app/api/health/route.ts`; `src/components/system/LiquidGlassReady.tsx`;
`src/app/workshop/library/error.tsx` + `src/components/workshop/WorkshopRouteErrorState.tsx`;
`src/lib/analytics/vercel-web-analytics.ts`; `src/lib/ai/rate-limit.ts`;
`supabase/migrations/20260601003000_security_rate_limit_events.sql`;
`src/app/api/ai/ask/handler.ts` (quota wiring + fail posture);
`src/app/api/ai/package-builder/handler.ts` (head + gating);
`scripts/check-support-monitoring-readiness.ts`; `scripts/check-supabase-backup-readiness.ts`;
`src/app/api/share/[token]/decision/route.ts` (structured-log sink);
proposal-export route logging block; `vercel.json`; `src/app/providers.tsx`.

**Surveyed (rg, not line-by-line):** all `error.tsx` under `src/app` (7 found, all under
`workshop/`); `src/lib/ab-testing/**`, `src/lib/activity/**` error-handling shape; rate-limit
callers in publication/invite; `console.*` usage across `src/app/api`, `src/lib/publication`,
`src/lib/collaboration`, `src/lib/ai`; presence of any Sentry/OTel/pino/datadog dependency in
`package.json` (none); pg_cron/scheduled cleanup of the rate-limit table (none — inline GC only).

**Deferred / not deeply read:** full `experiment-tracker.ts` / `results-calculator.ts` internals
(scanned for unhandled rejections only); the share comment-route circuit-breaker internals
(already covered as a strength by the OWASP pack F-RL-03); DeepSeek error-body forwarding
(domain 4 / already F-ERR-03).

## Reconciliation vs prior packs

| Prior pack / source | Item | This audit's reconciliation |
|---|---|---|
| `2026-06-01-security-owasp/09-rate-limiting` F-RL-04 | "No rate limit on `/api/ai/ask` and `/api/ai/package-builder`" | **stale (partial)**: `/api/ai/ask` now rate-limited via `src/lib/ai/rate-limit.ts` (`checkAiAskQuota`, wired at `handler.ts:135`). `/api/ai/package-builder` STILL has no rate limit → re-reported as OPS-02. |
| `2026-06-01-security-owasp/09` F-RL-01/03/08 | rate-limit table service-role-only; comment circuit-breaker; invite routes limited | Confirmed still true (strengths). Not re-reported. |
| `2026-06-01-security-owasp/17-error-handling` F-ERR-04 | "Add `app/error.tsx` and `app/global-error.tsx` (R-58)" | **Confirmed, still open**: no `global-error.tsx`, no root `error.tsx`, no `not-found.tsx` exist. Re-reported as OPS-01 (this pack owns it as the ops/reliability gate, severity raised to high for the global crash case). |
| roadmap-sync 2026-06-18 / MEMORY | "Sentry NOT built" | Confirmed: zero error-tracking SDK in `package.json`. Re-reported as OPS-03 with launch-gate framing. |
| AGENTS.md / current-state PITR-disabled posture | PITR disabled (cost) | Confirmed and *intentional*; `check-supabase-backup-readiness.ts` has an explicit `daily-backup` accepted-risk mode. Recorded as OPS-06 (info / decision-record), NOT a blocker. |
| current-state `supportMonitoringReady` evidence | support/alert monitoring proof | The readiness scripts are **operator proof-flag parsers**, not live checks. Latest archived artifact shows `supportMonitoringReady: false`. Recorded as OPS-04 (gate must be satisfied before exposing users). |

---

## Findings

### OPS-01 — No `global-error.tsx` / root `error.tsx` / `not-found.tsx`: an uncaught render error in the root layout or any non-`workshop` route shows the raw Next.js crash screen

- **Severity:** high · **launch_blocker: true**
- **Files:** `src/app/` (absent: `global-error.tsx`, `error.tsx`, `not-found.tsx`); present boundaries only at `src/app/workshop/library/error.tsx` and 6 other `workshop/**/error.tsx`; `src/components/workshop/WorkshopRouteErrorState.tsx`.
- **Evidence:** `find src/app -name global-error.tsx` → none; `-name error.tsx` → 7 hits, ALL under `src/app/workshop/`; `-name not-found.tsx` → none. There is no React `ErrorBoundary` class anywhere (`rg getDerivedStateFromError|componentDidCatch` → 0 hits), so `src/app/providers.tsx` (Query/Toast/Notification providers) has no catch. A throw in `layout.tsx`, `providers.tsx`, or any error in `/login`, `/invite/*`, `/share/*`, `/about`, `/pricing`, `/contact`, `/beta` renders Next's default unstyled error page. `global-error.tsx` is the ONLY thing that catches a root-layout error.
- **Impact:** First-impression closed-beta users (who land on `/`, `/login`, `/invite/[token]`) get an unbranded white crash screen with no recovery affordance if any RSC/layout error occurs. Tokenized `/invite` and `/share` are exactly the high-variability, externally-triggered paths most likely to throw.
- **Recommendation:** Add `src/app/global-error.tsx` (must include its own `<html><body>`), a root `src/app/error.tsx` for the segment tree, and a branded `src/app/not-found.tsx`. Reuse the existing `WorkshopRouteErrorState` visual pattern. In each, log `error.digest` to whatever sink OPS-03 settles on (at minimum `console.error` server-side so Vercel captures it).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** partial:2026-06-01-security-owasp-compliance-audit (F-ERR-04/R-58 recommends it but never implemented; severity raised here).

### OPS-02 — `/api/ai/package-builder` calls DeepSeek with auth but NO rate limit (cost + abuse exposure); `/api/ai/ask` is limited but package-builder was missed

- **Severity:** high · **launch_blocker: true**
- **Files:** `src/app/api/ai/package-builder/handler.ts:176-209`; contrast `src/app/api/ai/ask/handler.ts:129-135` + `src/lib/ai/rate-limit.ts`.
- **Evidence:** `handlePackageBuilderRequest` authenticates (`getUserContext`, requires `authMode === "supabase"` + `workspaceId`, `handler.ts:194-201`) and then proceeds to the DeepSeek provider (`createDeepSeekPackageBuilderProvider`, line 46) with no quota call. `rg "quota|rate.?limit"` in the package-builder handler/route → none. By contrast `ai/ask` enforces `checkAiAskQuota` (10/min, 60/hr per workspace+user+IP) and fails **closed** (503 "AI quota is unavailable" on DB error, `ask/handler.ts:130-134`).
- **Impact:** Any authenticated closed-beta user (or a compromised session) can drive unbounded DeepSeek spend through package-builder. The OWASP pack flagged this (F-RL-04) but recorded both AI endpoints together; only `ai/ask` was subsequently fixed, leaving package-builder as a silent residual gap.
- **Recommendation:** Apply the same per-user/workspace durable rate limit (a `package_builder` scope on `security_rate_limit_events`) with fail-closed semantics, mirroring `ai/ask`. Choose a window appropriate to draft cost (it is heavier than ask).
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** stale:2026-06-01-security-owasp-compliance-audit (F-RL-04 — `ai/ask` half is now done, package-builder half remains open).

### OPS-03 — No error-tracking / centralized logging sink: structured logs go to `console.*` only (ephemeral Vercel function logs), so production errors are effectively unobservable

- **Severity:** high · **launch_blocker: true** (interim posture must be agreed before exposing users)
- **Files:** `package.json` (no `@sentry/*`, `pino`, `@vercel/otel`, datadog, logtail — `rg` → NONE); `src/app/api/share/[token]/decision/route.ts:34-36` and `comment/route.ts:71` (`logStructured` → `console.error`); proposal-export `route.ts:169-182` (`console.error`/`console.info`); `src/lib/collaboration/realtime-telemetry.ts:7` and `src/lib/estimates/express-components-telemetry.ts:28` (comments explicitly say "in prod a real sink (Clarity/Sentry) can be swapped in" — i.e. not yet wired).
- **Evidence:** The codebase HAS a deliberate structured single-line log shape (`{ level, route, errorCode, ipHash, ts }`) and IP-hashing (good), but every sink is `console.*`. On Vercel, function `console` output is retained only for a short window and is not alertable/queryable without a drain. There is no error aggregation, no alerting, no release/issue grouping. `error.digest` from route error boundaries lands nowhere durable.
- **Impact:** During closed beta a crash, a 5xx spike, a failed export, or a quota-exhaustion incident produces no signal the operator can act on after the log scrolls off. Combined with OPS-01 (raw crash screen) and OPS-04 (monitoring proof not satisfied), the team is blind to user-facing failures. Sentry being roadmap-deferred is a *posture decision*, but launching with zero durable error visibility is the blocker.
- **Recommendation:** Either (a) stand up a minimal error tracker (Sentry free tier / `@sentry/nextjs` with `beforeSend` PII scrub — reuse the existing IP-hash/redaction patterns), OR (b) explicitly accept-risk in `.ai/10_state/decisions.md` AND attach a Vercel log drain so `console` output is queryable/alertable, AND assign a human to watch it for the beta window. Do not launch with neither.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** partial (roadmap-sync records "Sentry NOT built"; no pack frames the launch-gate consequence of zero durable logging).

### OPS-04 — Support/alert/incident monitoring readiness is unproven; the readiness scripts only record operator-confirmed flags, they do not verify anything live

- **Severity:** high · **launch_blocker: true**
- **Files:** `scripts/check-support-monitoring-readiness.ts:52-86`; latest archived artifact reports `supportMonitoringReady: false` (current-state.md:2079).
- **Evidence:** `checkSupportMonitoringReadiness` reads five env proof-flags (`SUPPORT_MONITORING_*_CONFIRMED`) and four owner labels, then sets `supportMonitoringReady = missing.length === 0`. Its own `note` admits: "it does not verify inbox access, alert dashboards, linked feedback rows, hosted auth, or incident delivery by itself" (line 84). The latest recorded run has all flags false + all owners missing + 9 missing checks. So: no confirmed uptime alert, no confirmed error alert, no confirmed incident escalation path, no named on-call owner.
- **Impact:** There is currently no proven way for anyone to be *notified* when the beta breaks — uptime, error-rate, or incident escalation are all unconfirmed. This is the operational counterpart to OPS-03: even if logs existed, no alert routes them to a human.
- **Recommendation:** Before exposing users: stand up a minimal uptime monitor hitting `/api/health` (see OPS-05), an error-rate alert (tied to OPS-03 sink), and an incident escalation owner; then set the proof flags + owner labels so `launch:check-support-monitoring` passes truthfully (not just flag-flipped). Record the named owner in the runbook.
- **Effort:** M · **Confidence:** high · **existing_plan_overlap:** partial (proof harness + runbook exist in archive; the live monitoring/alerting they attest to is not stood up).

### OPS-05 — `/api/health` is a static liveness stub: it always returns `{ ok: true }` with no dependency (DB/auth) check, so an uptime monitor on it cannot detect a Supabase outage

- **Severity:** medium · **launch_blocker: false**
- **Files:** `src/app/api/health/route.ts:7-16`.
- **Evidence:** The route returns a hard-coded `{ ok: true, service, timestamp }` with `force-dynamic` + `no-store`. It performs no Supabase ping, no env-presence assertion, no auth-config check. `check-vercel-health-readiness.ts` only parses `ok === true`, so a green health check proves the Next function is alive — nothing about whether the app can actually serve data.
- **Impact:** A monitor wired to this endpoint (OPS-04) gives false confidence: Supabase could be down, the service-role key rotated/revoked, or RLS broken, and `/api/health` stays green. Real user requests would 5xx while uptime shows 100%.
- **Recommendation:** Add a shallow, time-boxed dependency probe (e.g. a `select 1` / cheap RPC against Supabase with a ~1–2s timeout) behind an optional `?deep=1` or a separate `/api/health/ready` so the liveness stub stays cheap but a readiness probe exists for the monitor. Keep it unauthenticated-safe and leak-free (return `{ ok:false }`, never the error detail).
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** none.

### OPS-06 — PITR disabled is an intentional cost posture, but the recovery decision (RPO/RTO + restore-drill) is recorded only as a script-acceptable "blocked" risk, not a signed-off decision

- **Severity:** medium · **launch_blocker: false**
- **Files:** `scripts/check-supabase-backup-readiness.ts:149-180` (the `daily-backup` accepted-risk path); AGENTS.md / current-state PITR-disabled posture.
- **Evidence:** `checkSupabaseBackupReadiness` supports a `daily-backup` `readinessMode` where `pitrReady` is forced true and a `restoreDrillStatus: "blocked"` counts as accepted-risk (`restoreDrillAcceptedRisk`, line 149). The script never performs a restore (its `note` says so, line 178). So "backup ready" can pass with PITR off and NO actual restore ever exercised — purely on operator assertion + a non-empty backup list.
- **Impact:** With PITR off, the worst-case data-loss window is up to ~24h (daily backups) and recovery has never been rehearsed. For a closed beta with no external users this is an acceptable trade — but the RPO (≤24h) and the fact that restore is untested should be an explicit, recorded owner decision, not implicit in a script's accepted-risk branch.
- **Recommendation:** Record a one-line decision in `.ai/10_state/decisions.md`: PITR intentionally off for closed beta, RPO ≤24h via daily backups, restore drill deferred — and revisit before GA / before any real customer data lands. Optionally run one `daily-backup` restore drill into a throwaway project to convert the "blocked" to "passed".
- **Effort:** S · **Confidence:** high · **existing_plan_overlap:** covered-by:AGENTS.md/current-state PITR posture (the cost decision exists; this finding only asks to formalize the RPO/restore-drill record).

### OPS-07 — `security_rate_limit_events` has no scheduled GC; expired-row cleanup is opportunistic (inline, traffic-driven) and per-key, so a low-traffic scope can leak rows indefinitely

- **Severity:** low · **launch_blocker: false**
- **Files:** `supabase/migrations/20260601003000_security_rate_limit_events.sql` (no `pg_cron`); `src/lib/ai/rate-limit.ts:51-54`; `src/lib/publication/public-repository.ts:285-287`; `src/lib/collaboration/invite-entry.ts:146-147`.
- **Evidence:** Each caller deletes `expires_at < now` *before* inserting its own event, but only when that code path actually runs. There is no `pg_cron` job (`rg pg_cron|cron.schedule` over migrations → none) and the migration grants `delete` to `service_role` solely for the inline path. A scope that stops receiving traffic (or a window that's rarely hit) leaves its expired rows until the next same-path call. The `_expiry_idx` exists, so a sweeper would be cheap.
- **Impact:** Minor. At closed-beta volume the table cannot grow large enough to matter; worst case is slow index bloat over months. Not a launch blocker, but a hygiene item the durable-rate-limit design should own rather than rely on traffic to GC.
- **Recommendation:** Add a small `pg_cron` (or Vercel cron hitting an admin route) sweep: `delete from security_rate_limit_events where expires_at < now()` on an hourly/daily cadence. Defer until post-beta if desired; record as known debt.
- **Effort:** S · **Confidence:** medium · **existing_plan_overlap:** none.

### OPS-08 — Structured logs include `ipHash` but the broader log payloads are not centrally schema-guarded; low risk of message/PII leakage into ephemeral logs from spread `...extra` / error objects

- **Severity:** low · **launch_blocker: false**
- **Files:** `src/app/api/share/[token]/decision/route.ts:34-36` (`logStructured(... ...extra)`); `src/lib/collaboration/actions.ts:582,724` (`console.warn("[collaboration] invite email delivery failed", { ... })`); `src/lib/publication/actions.ts:1127,1217` (`console.warn(... { email: r.email, error: sendResult.error })`).
- **Evidence:** The share routes correctly hash IPs and log codes (good). But several email/collaboration warn-logs include recipient `email` and raw `error` objects in the payload. On Vercel these land in function logs; with no drain/redaction layer (OPS-03), recipient emails + provider error bodies sit in plaintext logs. The analytics path IS well-redacted (`vercel-web-analytics.ts` strips `/share`, `/invite`, `/workshop`), so this is narrowly the server-log surface, not client analytics.
- **Impact:** Low at closed-beta scale and given the logs are short-lived and access-controlled to the Vercel project. Becomes more relevant if OPS-03 adds a durable drain — at that point PII retention/redaction must be considered.
- **Recommendation:** When wiring the OPS-03 sink, route these warn-logs through a small redacting helper (hash/elide emails, map provider errors to codes) the same way the share routes hash IPs. Until then, accept-risk given access-controlled ephemeral logs.
- **Effort:** S · **Confidence:** medium · **existing_plan_overlap:** none.

---

## Confirmed strengths (not findings — recorded so they are not re-flagged)

- `ai/ask` rate limit is **durable + fail-closed** (`ask/handler.ts:130-134`, `rate-limit.ts`).
- Vercel Web Analytics has solid PII redaction: drops `/share`, `/invite`, `/workshop` URLs and non-parseable URLs (`vercel-web-analytics.ts:12-37`).
- Share routes use IP-hashing + structured single-line logs + a documented circuit-breaker (OWASP F-RL-03).
- Workshop route error boundaries exist and gate `console.error` behind `NODE_ENV !== "production"` (no dev-noise/PII in prod) (`WorkshopRouteErrorState.tsx:14-22`).
- `LiquidGlassReady` degrades gracefully (rAF backstop + idle fallback + reduced-transparency opt-out) — good client reliability hygiene.
- Rate-limit table is RLS-locked to `service_role` only (OWASP F-RL-01).
