# 92 — Observability & Alerting (Public Shared-Link Surface)

Date: 2026-06-21 · Status: **BETA WAIVER ACCEPTED — signals/thresholds defined, dashboards UNBUILT; live alert/drain proof remains GA/pre-production follow-up**

Scope: the public receiver surface (`/share/[token]` page + `/api/share/[token]/*` routes) and the
manager-side publish/rotate/digest path. This doc specifies **what to watch, where it lands, the
threshold, and who gets paged** for the telemetry that was deliberately **deferred** (open/session
analytics moved off the hot path, PERF-02) and **rate-limited** (SEC-SHARE-03, open/event-write
limiters). Because that telemetry is now best-effort and asynchronous, monitoring is the
compensating control — a silent failure (e.g. SEC-SHARE-06 digest, swallowed event writes) is only
detectable here.

Canonical IDs/severities/statuses are bound to [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md);
if any signal below disagrees with 75, **75 wins**. Cross-links:
[`05_PRODUCT_STRATEGY_BRIEF.md`](05_PRODUCT_STRATEGY_BRIEF.md) (success metrics → §6),
[`50_PERFORMANCE_SPEED_AUDIT.md`](50_PERFORMANCE_SPEED_AUDIT.md) (PERF budgets these signals confirm),
[`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md) (launch verdict consumes §3 watch items).
Open decisions referenced: [`71_OPEN_DECISIONS_REGISTER.md`](71_OPEN_DECISIONS_REGISTER.md) (D1, D4, D9).

> **As-of source note (re-verify before acting):** anchors below were re-verified against current
> source on 2026-06-21. `actions.ts` is ~1538 lines; the digest gate (`maybeTriggerSharedLinkActivityDigest`)
> is at `src/lib/publication/actions.ts:1526-1534`, not the older "~1471" citation. Pin to a commit SHA
> before instrumenting.

---

## 0. Telemetry landing zones (where signals can actually be read)

> **Instrumentation readiness (read first):** most signals below ride emitters that are **LIVE today** —
> sink A (`logStructured` from the public routes) and sink B (the DB event tables) already emit, so those
> alert gates only need a drain/query wired, not new code. A minority require more evidence before the
> gate can fire in production: digest delivery success/failure (§2.5 / §3.1) and the "owner awareness"
> success metric (§6). SEC-SHARE-06's public-route auth gate is fixed in code; any future
> `digest-auth-required` occurrence is a regression sentinel, not the expected path.

There are exactly **three** sinks. Every signal in §2 maps to one; if a signal has no sink today it is
marked **UNVERIFIED — no emitter** with the command to confirm.

| Sink | What it holds | How to query (beta) |
|---|---|---|
| **A. Structured route logs** | `logStructured(level, route, errorCode, ipHash, extra)` JSON lines emitted from the public API routes (def: `src/app/api/share/[token]/comment/route.ts:70`; mirrored in `decision/route.ts`, `session/route.ts`). IP is HMAC-hashed (SEC-SHARE-04, `hashPublicTelemetryValue()`), never raw. | Vercel/host log drain → log-search by `route` + `errorCode`. No metrics backend wired yet → **UNVERIFIED: confirm a drain exists** with `rg -n "logStructured" src/app/api/share` (emitter present) and a host-side check that logs are retained. |
| **B. DB event tables** | `project_publication_events` (`event_type ∈ {open, password_success, password_failure, password_attempt, download_attempt_blocked}`, insert at `src/lib/publication/public-repository.ts:712,748,786`); `security_rate_limit_events` (insert/delete at `src/lib/ai/rate-limit.ts:52-68`). | SQL via Supabase MCP `execute_sql` / `get_logs`, read-only. Manager-read RLS on `project_publication_events` is **gated on D10** ([71](71_OPEN_DECISIONS_REGISTER.md)) — until then query as service-role. |
| **C. Provider/host metrics** | Vercel function p50/p95/p99 latency + error rate per route; Supabase DB CPU/latency; email-provider send results (Resend/P0 `sendEmail`). | Provider dashboards; not yet alert-wired. Closed-beta waiver evidence: `evidence/observability-archive-readiness-2026-06-21/beta-observability-waiver-2026-06-21.md`. |

---

## 1. Reading guide

Each §2 row carries: **signal**, **sink** (A/B/C), **source/query**, **threshold**, **severity (P0–P3, bound to 75)**,
**routing**, and a **binary gate** (PASS/FAIL) used by `99`. Thresholds are **beta starting values** — single-node,
low-volume — and must be re-baselined after the first 7 days of real traffic (see §5).

---

## 2. Signal catalog

### 2.1 Public-open error rate
- **Sink:** A (route logs) + C (Vercel error rate for `GET /api/share/[token]` / page render).
- **Source/query:** count `logStructured("error"/"warn", "/api/share/[token]/...", …)` over total public requests; cross-check Vercel function error rate for the `share/[token]` route group.
- **Threshold:** error rate > **2%** of public requests over any 15-min window (warn at 1%).
- **Severity:** P2 (availability of the receiver surface). Maps to no single 75 finding; it is the umbrella health signal.
- **Routing:** on-call **receiver-route owner**; page if sustained > 30 min.
- **Gate:** FAIL if 15-min error rate ≥ 2% twice in a rolling hour.

### 2.2 Stale-snapshot 409 rate (SEC-SHARE-01 fix in action — D1 UX signal)
- **Sink:** A. Emitted from `comment/route.ts:228-234` and `decision/route.ts:186-192` when `viewedSnapshotVersion !== access.snapshotVersion` (HTTP 409, "Publication snapshot changed").
- **Source/query:** count of 409 responses on `POST comment`/`POST decision` ÷ total comment+decision POSTs.
- **Threshold:** 409 share of write attempts > **5%** over a rolling 24h.
- **Severity:** P1 finding fixed (SEC-SHARE-01, **Fixed** per 75) — but a **409 spike is a UX-friction signal**, not a security regression. Per **D1** ([`71`](71_OPEN_DECISIONS_REGISTER.md)) a content-only republish forces a recipient reload; a sustained spike means owners republish mid-review and recipients lose drafted comments.
- **Routing:** **product owner** (D1 input), not on-call. A breach is evidence for the D1 decision, not an incident.
- **Gate:** WATCH only (informs D1). FAIL the *beta* only if 409 share > 15% (indicates the republish flow is actively hostile).

### 2.3 Password lockout / failure rate
- **Sink:** B. `project_publication_events` rows with `event_type ∈ {password_failure, password_attempt}` (enum at `public-repository.ts:10`); paired `password_success`. Session-route gate at `session/route.ts:58-66`.
- **Source/query:** `select event_type, count(*) from project_publication_events where event_type in ('password_failure','password_attempt','password_success') and created_at > now() - interval '1 hour' group by 1, publication_id`.
- **Threshold:** per-publication `password_failure` > **20 in 10 min**, or failure:success ratio > 5:1 over 1h.
- **Severity:** P2 (brute-force / link-leak indicator; ties to the SEC-SHARE-02/03 limiter family, both **Fixed** per 75).
- **Routing:** **security on-call**; correlate with §2.7 rate-limit rows for the same `ip_hash`.
- **Gate:** FAIL if a single publication shows the failure burst above and the session-start limiter did **not** also fire (means the limiter regressed).

### 2.4 `security_rate_limit_events` row count + GC duration (rate-limit table growth)
- **Sink:** B (row count) + A/C (GC duration once the scheduled GC lands).
- **Source/query:** `select count(*) from security_rate_limit_events;` plus, after the pending GC job, the GC run duration. Lazy in-app delete is at `rate-limit.ts:52-68`; the **deterministic scheduled GC** is in pending review: `supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql` (job `security-rate-limit-gc`) and **is not yet applied** (gated on **D8** migration reconciliation).
- **Threshold:** total rows > **250k** (warn at 100k); GC run duration > **5s** or GC job missed (no run in 25h).
- **Severity:** P2 (unbounded growth → write amplification; this is the watch item that justifies AC-MOD-T4-P7). Related limiter findings SEC-SHARE-02/03 are **Fixed**, but the *cleanup* is the open operational risk.
- **Routing:** **DB/infra owner**.
- **Gate:** FAIL if row count exceeds 250k OR the GC job has not run in 25h (pre-launch: FAIL if AC-MOD-T4-P7 is unapplied and no lazy-delete fallback verified — confirm with `rg -n "delete" src/lib/ai/rate-limit.ts`).

### 2.5 Digest send success/failure — **SEC-SHARE-06 regression watch**
- **Sink:** A (the only signal today is `console.warn`). Send path records digest send failures / owner-email-missing skips; SEC-SHARE-06's former public-route `digest-auth-required` path is fixed and should not occur.
- **Source/query:** count `console.warn("[publication] owner digest skipped…")`, any `digest-send-failed`, and any future `digest-auth-required` string if it reappears in route/action logs.
- **Threshold:** ANY `digest-auth-required` occurrence; `digest-send-failed` > 5% of attempted digests.
- **Severity:** **P3, Fixed-with-regression-watch** per 75 (SEC-SHARE-06). Functional notification gap is closed locally; delivery evidence is still needed for beta acceptance.
- **Routing:** **receiver-route owner** + product owner (notification reliability). Decision **D9** records beta notification/delivery acceptance.
- **Gate:** FAIL the *digest feature acceptance* if any `digest-auth-required` is observed in beta.

### 2.6 Snapshot byte size (PERF-06 byte budget)
- **Sink:** B/C. The heavy `snapshot_json` blob is read in the snapshot path (`public-repository.ts:115,651-660`); size grows O(n) with the published estimate.
- **Source/query:** `select max(pg_column_size(snapshot_json)), avg(pg_column_size(snapshot_json)) from project_publications where status='published';`
- **Threshold:** measured local budget uses tiered fixture caps: 100 rows <= 64 KiB, 1k rows <= 512 KiB, and 10k rows <= 4 MiB. Evidence in [`evidence/perf-budgets.md`](evidence/perf-budgets.md) shows compact v1.3 passing at 100 rows 29.7 KiB, 1k rows 263.1 KiB, and 10k rows 2.55 MiB.
- **Severity:** P2, Fixed locally (PERF-06); provider `pg_column_size(snapshot_json)` monitoring remains useful during beta.
- **Routing:** **performance owner**.
- **Gate:** PASS locally for snapshot bytes while the histogram stays under budget; fail if provider `snapshot_json` bytes breach the tiered caps in beta.

### 2.7 Rotate duration — PERF-12 O(recipients)
- **Sink:** C (route/function latency for the rotate action) + A if instrumented.
- **Source/query:** rotate action latency p95; rotate writes scale with recipient count (PERF-12 "Rotate is O(recipient count)").
- **Threshold:** rotate p95 > **2s**, or any rotate touching > 200 recipients.
- **Severity:** P3, Fixed for beta / GA scale backlog (PERF-12 per 75; provider rotate p95 passed for 10/100/1000 recipients; credential-version model is the scale backlog).
- **Routing:** **manager-workflow owner**.
- **Gate:** WATCH; supplies PERF-12 measurement. FAIL only if a single rotate exceeds 5s (user-perceived hang in the manager modal).

### 2.8 Comment/decision 5xx + circuit-breaker open rate
- **Sink:** A. Circuit breaker is real and source-verified: `comment/route.ts:20` (">50% 5xx over 5min → 503 for 2min cooldown"), open-state log `CIRCUIT_OPEN` at `comment/route.ts:264` returning 503 + `Retry-After: 120` at `:265`. Rate-limit 429s at `:159,:275`.
- **Source/query:** count `logStructured(... "CIRCUIT_OPEN" ...)` events; count 503/5xx vs total on `POST comment`/`POST decision`.
- **Threshold:** ANY `CIRCUIT_OPEN` event is a page (it means >50% of comment writes were failing); 5xx rate > 1% sustained 10 min.
- **Severity:** P1-class operational (the breaker exists; QA-G05 exact 503/`Retry-After: 120` route test is **Fixed** per 75, and this monitor is the beta runtime signal).
- **Routing:** **receiver-route on-call**, page immediately on `CIRCUIT_OPEN`.
- **Gate:** FAIL if any `CIRCUIT_OPEN` fires without a corresponding upstream (Supabase/provider) incident — indicates an app-side defect, not a dependency outage.

---

## 3. Finding-tied watch items (beta)

These are the four monitoring obligations the audit explicitly demands. Each has an owner-lane and a binary gate.

### 3.1 SEC-SHARE-06 digest delivery — **observability follow-up**
- **Owner-lane:** receiver-route owner.
- **Action:** capture delivery evidence for the fixed public-route digest path and keep send failures observable. Acceptance — *Given* a public comment/decision POST triggers `maybeTriggerSharedLinkActivityDigest`, *Then* the helper runs without `digest-auth-required`, and any email-send failure emits one structured warning with publication identity redacted/hashed.
- **Verification:** `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`; hosted smoke/evidence should record one public comment/decision digest attempt and no `digest-auth-required` logs.
- **Gate:** FAIL if `digest-auth-required` appears or digest delivery errors exceed §2.5 thresholds. Tracks D9.

### 3.2 PERF-12 rotate O(recipients) growth
- **Owner-lane:** manager-workflow owner.
- **Action:** record rotate p95 + recipient-count-at-rotate (§2.7) into the evidence index so the credential-version refactor decision is data-backed.
- **Verification:** capture 5 rotate latencies at varying recipient counts; store under `evidence/` per `90`/`91`.
- **Gate:** WATCH (no launch block); FAIL only on the 5s single-rotate hang in §2.7.

### 3.3 Rate-limit table growth (`security_rate_limit_events`)
- **Owner-lane:** DB/infra owner.
- **Action:** monitor row count + GC (§2.4); confirm whether the scheduled GC (AC-MOD-T4-P7) is applied or the lazy delete is the live control.
- **Verification:** `execute_sql` row count; `rg -n "security_rate_limit_events" src/lib/ai/rate-limit.ts` confirms the lazy delete fallback exists.
- **Gate:** FAIL on the 250k / missed-GC condition in §2.4.

### 3.4 Stale-409 spikes → republish UX friction (D1)
- **Owner-lane:** product owner.
- **Action:** track the §2.2 409 rate as the empirical input to **D1** (content-only republish forcing recipient reload). A spike means the republish model is costing recipients their drafted comments.
- **Verification:** weekly 409-share query over `POST comment`/`decision`.
- **Gate:** WATCH; feeds D1 in `71`. FAIL the beta only past the 15% hostile threshold.

---

## 4. Dashboard ownership & review cadence (beta)

- **Dashboard owner:** **Philip (product owner)** holds the launch verdict; **receiver-route owner** owns the day-to-day operational board. No metrics backend is wired yet — beta dashboard = a saved Supabase SQL view (sink B) + the host log-search saved queries (sink A) + the Vercel/Supabase provider boards (sink C). Wiring a single board is an explicit owner action; until then each sink is queried manually.
- **Review cadence:**
  - **Daily (first 14 days of beta):** §2.1 error rate, §2.5 digest, §2.8 circuit-breaker — the three that page.
  - **Weekly:** §2.2 409 share (D1 input), §2.3 password failures, §2.4 rate-limit rows, §2.6 snapshot size, §2.7 rotate latency.
  - **At GA gate:** re-baseline every threshold from real traffic; promote any WATCH gate that breached to a hard gate or close it. Sign-off recorded in [`99`](99_QUALITY_SCORECARD_AND_SIGNOFF.md).
- **Durability caveat (D4 / SHF-03):** the digest throttle now reserves a durable slot through
  `reserve_security_rate_limit_slot(...)`, and password attempts use `security_rate_limit_events`.
  GA/multi-node still needs topology/perf proof for those shared-store paths; it no longer requires an
  in-memory-to-durable rewrite for the owner digest throttle.

---

## 5. Threshold re-baselining protocol

Every §2 threshold is a beta placeholder. After 7 days of real traffic:
1. Pull the 7-day distribution for each signal from its sink.
2. Set warn = p95, page = p99 (or the explicit safety bound where one exists, e.g. ANY `CIRCUIT_OPEN`, ANY `digest-auth-required`).
3. Record the new values + the query that produced them under `evidence/` (per `90`/`91`).
4. Update this doc's §2 cells and note the as-of date in the status banner.

**Gate:** `99` may not record an unqualified "ready" until §2.1/2.5/2.8 (the paging signals) have at least one re-baseline cycle, OR the owner explicitly accepts placeholder thresholds for beta.

---

## 6. Tie-back to success metrics (`05`) — make the metric capturable

[`05_PRODUCT_STRATEGY_BRIEF.md`](05_PRODUCT_STRATEGY_BRIEF.md) (NEW, authored by lead) defines the
beta success metrics. For each, the instrumentation that makes it measurable already exists in a sink —
otherwise the metric is **UNVERIFIED** and 05 must either add an emitter or drop the metric.

| 05 success metric (expected) | Capturable from | Definition | Status |
|---|---|---|---|
| **Open / view rate** (recipients who open the link) | B: `project_publication_events.event_type='open'` (`public-repository.ts:786`) | distinct opener ÷ recipients invited | **Capturable** |
| **Response rate** (recipients who comment or decide) | B (open denom) + write events; comment/decision POST success in sink A | recipients with ≥1 comment/decision ÷ recipients opened | **Capturable** — needs a per-recipient join on the recipient-session identity; confirm a recipient id is on the write event (else **UNVERIFIED**: `rg -n "recipient" src/lib/publication/public-repository.ts`) |
| **Time-to-decision** (open → first decision) | B: timestamp delta `open` → first `submit_client_response`/decision event | median/p90 hours between first open and first decision per publication | **Capturable** iff decision events carry `created_at` (they do via the event row); cross-publication aggregate is a SQL window |
| **Owner awareness** (owner sees activity) | A: digest emit (§2.5) | digests successfully delivered ÷ activity events that should trigger one | **BLOCKED by SEC-SHARE-06** — until §3.1 lands, this metric is unmeasurable; do not claim it in 05 |

**Instrumentation contract for `05`:** any success metric 05 lists MUST resolve to a row in this table.
If 05 adds a metric with no sink here, that metric is **UNVERIFIED — no emitter**; resolve before the
beta gate. Verification that the open/response/time-to-decision events fire end-to-end:
`bunx vitest run src/lib/publication/__tests__ src/app/api/share --maxWorkers=1` (asserts event inserts
on open/comment/decision); plus a manual `execute_sql` count after a seeded beta link.

---

## 7. Owner-lane summary

| Lane | Signals owned | Pages on |
|---|---|---|
| Receiver-route on-call | §2.1, §2.5, §2.8 | circuit-open, sustained error rate, any `digest-auth-required` |
| Security on-call | §2.3 | password-failure burst w/o limiter fire |
| DB/infra owner | §2.4 | 250k rows / missed GC |
| Performance owner | §2.6 | snapshot-fetch latency regression |
| Manager-workflow owner | §2.7 | rotate > 5s |
| Product owner (Philip) | §2.2, §6 | (no page) D1 input + metric capturability; holds dashboard + GA verdict |

All severities/statuses above are bound to [`75`](75_FINDING_ID_REGISTRY.md). No conflict with 75 was
found while authoring; current 75 status is SEC-SHARE-06 P3/Fixed, PERF-06 P2/Fixed,
PERF-12 P3/Open-measure, SEC-SHARE-01 P1/Fixed, QA-G05 P1/Fixed.
