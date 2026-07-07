# 08 — Security, Privacy, and Log Redaction Inventory

This document is the **log redaction inventory** the PROMPT explicitly requires, plus the threat
model for this plan's surfaces. Per the scope boundary (§`02`), the **enforcement fixes** for the
redaction gaps are owned by the sibling `2026-07-07-cloudflare-worker-production-observability-and-
budgets` pack (`SEC-01`/`SEC-02`). This pack **inventories** the gaps so that pack has a complete
input, and it **guarantees** its own new artifacts (receipts, incident rows, log events) are
redacted (SEC-02 here).

---

## 1. Log redaction inventory — every emit path

### 1.1 Emit paths and redaction coverage

| # | Emit path | Mechanism | Routes through `redactForLog`? | Coverage |
|---|---|---|---|---|
| E-1 | `consoleAppLogger.log` (structured app logs) | `logger.ts` → `buildDevRecord` calls `redactForLog` | ✅ yes | Full key-set + regex redaction; `tainted_fields` recorded |
| E-2 | `buildErrorLogRecord` / `logAppError` | `logger.ts` → calls `redactForLog` | ✅ yes | Same; error fields redacted |
| E-3 | Client error report POST | `client-error-report.ts` `sanitizeClientErrorText` + route calls `redactForLog` | ✅ yes | Client-side strips local paths; server redacts |
| E-4 | `route-error.ts` `errorResponse`/`problemDetailsResponse` | calls `logAppError` | ✅ yes (via E-2) | Redacted; test asserts no `"password leaked"` |
| E-5 | `with-action-errors.ts` | calls `logAppError` | ✅ yes (via E-2) | Redacted |
| E-6 | **~88 raw `console.*` calls across ~46 files** | direct `console.error/warn/log/info` | ❌ **NO** | **UNREDACTED** — what Workers Observability actually ingests at 0.1 sampling |
| E-7 | `[perf-json]`/`[perf]` lines | `src/lib/perf/server-timing.ts:80,94` direct | ❌ NO | Timing data (low PII risk but unredacted) |
| E-8 | Analytics Engine dims (future) | sibling OBS-01 `metrics.ts` | ⏳ pending sibling SEC-01 | Allowlist to be enforced by sibling |
| E-9 | `Server-Timing` header labels (future) | sibling FR-04 | ⏳ pending sibling SEC-01 | Label allowlist by sibling |
| E-10 | Proof scripts output (this plan, NEW) | `verify-*-alert-delivery.ts` | ✅ this plan SEC-02 | Must call `redactForLog` + be scanned |
| E-11 | Readiness output | `check-support-monitoring-readiness.ts` | ✅ already sanitized (`sanitizeOwnerLabel`) | Owner labels sanitized; extend to receipts |
| E-12 | Incident rows/events (this plan, NEW) | `incident-record.ts` | ✅ this plan SEC-02 | `related_request_ids`/`detail` redacted before insert |

### 1.2 Redaction coverage gaps (the inventory deliverable)

From `redact.ts` analysis (§`03` 1.3), the **P1 gaps** that the sibling pack's SEC-01 must close:

| Gap ID | Category | Current | Risk | Recommended owner |
|---|---|---|---|---|
| G-1 | **Credit cards** | no Luhn/`\d{4}[- ]?\d{4}...` pattern | estimate/payment-adjacent strings could leak card numbers | sibling SEC-01 |
| G-2 | **Phone numbers** | no pattern | support/feedback messages may contain phones | sibling SEC-01 |
| G-3 | **IP addresses** | no IPv4/IPv6 pattern | `cf-connecting-ip` handled in `client-identity.ts` separately, but IPs in free-text logs unredacted | sibling SEC-01 |
| G-4 | **Raw `Set-Cookie` / `Authorization` header strings** | only object *keys* redacted; raw header *values* as strings not regex-matched (except `Bearer`) | a logged header string leaks the cookie/session | sibling SEC-01 |
| G-5 | **Server stack traces (local paths)** | `serializeStack` (logger.ts:101) slices lines but does NOT call `redactMessage`; client-side strips `/Users/...`, server does not | absolute local paths leak in NDJSON + Workers Observability | sibling SEC-01 |
| G-6 | **Better Auth session cookie names** | only generic `cookie` key; `better-auth.*` names not matched | session cookie presence/rotation could be inferred | sibling SEC-01 |
| G-7 | **Password-reset URL paths** | only via generic `*token`/hex; no dedicated reset-path regex | reset links in logs could leak | sibling SEC-01 |
| G-8 | **~88 `console.*` bypass calls** | do not route through `redactForLog` | the actual Workers Observability ingestion path is unredacted | sibling SEC-01 (console migration) |
| G-9 | **Dual emission** (share/component-library routes call both `logAppError` AND raw `console.error`) | redacted + unredacted for the same error | unredacted copy reaches Workers Observability | sibling SEC-01 |

**This plan's obligation:** ensure E-10/E-12 (its own new paths) do not add to the gap list. SEC-02
(TEST-02 scan + `redactForLog` on every artifact) discharges it.

---

## 2. Threat model (this plan's surfaces)

### 2.1 Trust boundaries and actors

| Boundary | Actors | Trust |
|---|---|---|
| Worker edge → OpenNext | end users (untrusted), cron (CRON_SECRET), queue (internal) | end-user input untrusted; cron/queue internal |
| Admin Server Action (incident declare/close) | admin user (Better Auth admin) | authenticated + authorized |
| External alert poller (S-02) | the poller host with a Cloudflare read token | trusted ops infra (`OPEN-ALERT-01`) |
| Proof artifact store (`.ai/99_scratch/` or R2) | operator, verifier scripts | local/gitignored or R2 with redacted keys |

### 2.2 Attack surface and controls

| Threat | Surface | Control |
|---|---|---|
| Secret/PII leak via proof artifact | E-10 receipts | SEC-02: `redactForLog` + TEST-02 secret scan; `.gitignore` |
| Secret leak via incident row | E-12 `related_request_ids`/`detail` | SEC-02: redact before insert; admin-authz write |
| Alert-delivery SSRF | webhook URL env (`UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL`) | HTTPS-only enforced (existing); URL not operator-controllable from untrusted input |
| Alert spam / amplification DoS | external poller firing repeatedly | idempotent receipts keyed by time-bucket; retry cap; rate-limit the poller |
| Incident enumeration | admin read of incident table | admin-authz only; no public route |
| Token in alert event log | E-11 alert events | OPS-02: `targetMarker` host-only/hash; never raw email/url/token |
| Read-token exfiltration (S-02 poller) | Cloudflare GraphQL read token | stored in the poller host's secret store, not the repo; receipt records only `ackSignal` |
| Retention-rule bug deletes live data | DATA-02 rules | dry-run default; unit tests; per-tick row budget (sibling REL-02); audit row per delete |
| Migration collision (`0040`) | concurrent packs | `LOOP_LEDGER` coordination; `0040` is next free slot |

### 2.3 Credential material taxonomy (this plan's surfaces)

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Client-visible? | URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Cloudflare GraphQL read token (S-02) | raw (bearer) | owner (Cloudflare dashboard) | poller host secret store | poller only | ❌ | ❌ (header) | rotate via dashboard | receipt `ackSignal` only |
| Upload-ops webhook token | raw (bearer) | owner | wrangler secret | worker + verify script | ❌ | ❌ (Authorization header) | rotate wrangler secret | existing verify script redacts |
| EMAIL `CLOUDFLARE_EMAIL_FROM` | public (sender address) | owner | wrangler var | worker | n/a | n/a | n/a | readiness check records name only |
| `CRON_SECRET` / `UPLOAD_CLEANUP_JOB_SECRET` | raw | owner | wrangler secret | worker | ❌ | ❌ | rotate | not in artifacts |
| Incident `related_request_ids` | derived (UUID) | worker (sibling FR-01) | D1 incident row (redacted JSON) | admin | ❌ | ❌ | n/a | redaction attestation |

**No raw bearer value is ever written to an artifact, log event, or D1 row.** The receipt
`ackSignal` is a redacted marker (`webhook-200`, `inbox-token:<sha256-prefix>`), never the token.

---

## 3. Privacy and data minimization

- **No new collection of end-user PII.** Incidents reference request-ids (derived UUIDs) and
  redacted summaries, not user PII. Alert events use host-only/hash target markers.
- **Retention minimization:** evidence artifacts 90d; incidents 7y (compliance evidence — the
  minimum defensible for incident postmortem retention; gated counsel).
- **Subject access:** incidents are operational, not end-user records; DSAR scope is unchanged.
- **Cross-tenant isolation:** incidents are global operational records (no workspace_id) — by
  design, incidents are not tenant-scoped. Admin-authz gates access.

---

## 4. CSP / frame / referrer / download

Not affected — no new user-facing pages or public links. The operational email channel is outbound
only; no CSP change.

---

## 5. Incident-response implications (meta)

This plan *is* partly the incident-response readiness work: it defines the record format, the
declare/escalate/close runbook, and the alert scenarios that trigger response. The first real
incident is the first end-to-end test of GATE-03 (first-24h review).

---

## 6. Security testing

- **Denial tests:** TEST-02 asserts an artifact with a planted secret fails the verifier; an
  incident row with an unredacted request-id is rejected by the builder.
- **Role-matrix:** admin-only incident write (non-admin → 403); external poller cannot write.
- **Redaction regression:** extend `tests/vitest/redact.test.ts` only if this plan adds redaction
  helpers (it adds `redactForLog` *calls*, not new patterns — patterns are the sibling pack).

---

## 7. Dependencies and gaps recorded for the sibling pack

The sibling `SEC-01`/`SEC-02` owns closing G-1..G-9. This pack's `16_…` records the
one-directional dependency: this pack's alert receipts can claim `redactionAttestation:true` only
once the *receipt itself* is redacted (discharged here) — but the *underlying logs* the alerts
reference remain subject to G-1..G-9 until the sibling pack lands. The runbook states this honestly
so an operator does not over-trust log redaction pre-sibling-fix.
