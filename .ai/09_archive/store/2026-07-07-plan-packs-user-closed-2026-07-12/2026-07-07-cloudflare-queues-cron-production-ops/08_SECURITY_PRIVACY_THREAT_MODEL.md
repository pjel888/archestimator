# 08 — Security, Privacy, and Threat Model

## Scope

Queue producer/consumer, cron dispatch, internal job routes, retention pass,
proof scripts, and the secrets that authorize them. No user-facing surface.

## Trust boundaries & actors

| Actor | Trust | Boundary |
|---|---|---|
| Cloudflare Cron Trigger | platform-trusted | invokes `scheduled()` with a `controller.cron` string only |
| Cloudflare Queue infra | platform-trusted | delivers batches to `queue()`; performs DLQ move |
| Worker scheduled/queue handlers | privileged (has env bindings) | in-process; no inbound auth needed |
| Internal job route caller | **semi-trusted** — must present Bearer | the only network-reachable surface in this scope |
| Operator | privileged (has wrangler/secrets access) | runs scripts, drains DLQ, rotates secrets |
| External attacker | untrusted | may attempt to reach `/api/internal/*` |

## Attack surface

1. **`/api/internal/upload-cleanup` and `/api/internal/upload-scan`** — the only
   network-reachable surfaces in scope. Protected by Bearer secret. Direct POST
   reachability must be treated as attacker-reachable.
2. **Queue message body** — if an attacker could inject a message (they cannot
   without the queue binding, which is Worker-only), the consumer validates via
   `isUploadJobQueueMessage` and acks invalid as `"invalid-message"`.
3. **DLQ pull-consumer (new, optional)** — if D-DLQDRAIN is taken (pull consumer
   over HTTP to drain `archestimator-upload-jobs-dlq`), that HTTP pull endpoint
   becomes a new network surface requiring its own auth/scoping. See `13` §9.
4. **Proof receipts in R2** — sanitized, no secrets; `safeProviderProofId`
   regex-gates the key.
5. **Logs** — `console.log(JSON.stringify(summary))` in `worker.ts`; summaries
   contain no secrets (verified by route code: summaries are counts/paths/status).

## Attack Surface Inventory (required format)

Format (per `Improve-Plan-Prompt.md` §PHASE 3.7):
`Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO | Cache/header | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `POST /api/internal/upload-cleanup` | Cron/queue (Worker-internal fetch) **or attacker (direct POST)** | Bearer ∈ {`CRON_SECRET`,`UPLOAD_CLEANUP_JOB_SECRET`}; 503 if unset, 401 if wrong; no per-user ownership (operator job) | `?limit=` clamped ≤1000; `?dryRun=` 1/true; `UPLOAD_JOBS_ENABLED=1` for live | planner/cleanup summary: runId, candidate/rejected counts, removed/failed/rejected, audit event counts, operationalSnapshot — **no raw storage paths, tokens, or PII** | `Cache-Control: private,no-cache,no-store` | no app rate limit (Worker-internal); Cloudflare WAF/edge rate-limit at the custom domain; once-daily cron bounded by `limit` | PROOF-CLEANUPAUTH (503/401); existing route tests |
| `POST /api/internal/upload-scan` | Cron/queue **or attacker** | Bearer ∈ {`CRON_SECRET`,`UPLOAD_SCAN_JOB_SECRET`}; same fail-closed | `?limit=` ≤500; `?dryRun=`; enabled-gate | scan result: scannedCount, downloadFailedCount, scannerFailedCount, writeFailedCount, outcomeCounts — **no raw bytes/paths** | same no-store | same; scanner provider has its own quota | PROOF-SCANAUTH (503/401); existing |
| `queue()` handler (Cloudflare Queue delivery) | Cloudflare Queues infra only | binding-gated (not network-reachable by external actors); consumer validates message via `isUploadJobQueueMessage` | message schema v1 validator; `matchingJobExists`; `safeProviderProofId` regex | batch summary logged; R2 receipt sanitized | n/a (in-process) | `max_batch_size:5` bounds batch; consumer concurrency managed by Cloudflare | PROOF-POISON, PROOF-IDVALID, PROOF-EXC |
| `scheduled()` handler (Cron Trigger) | Cloudflare Cron only | platform-invoked; retention branch in-process (no Bearer — trusted because not network-reachable) | cron string matched against registry; retention rules are static code | console.log summary (counts); `data_retention_events` audit row | n/a | 3 crons, once-daily, off-peak | PROOF-WORKERSCHED |
| (optional, D-DLQDRAIN) DLQ pull-consumer HTTP API | Operator only | **MUST** require a Bearer secret or Cloudflare Access token scoped to the operator; **not** open | pull batch size bounded | ack/retry per message; no PII echoed | n/a | visibility_timeout 30s default; operator-only | denial test if implemented (UQ matrix) |
| R2 `provider-proof/jobs/<id>.json` | Operator read | R2 object policy (Worker-bound; not public) | `safeProviderProofId` regex on key | sanitized receipt JSON | `Cache-Control: no-store` | none (write-once per proof id) | PROOF-NOLEAK |
| `console.log` summaries (Workers Observability) | Cloudflare platform | sampled 0.1 (logs); not a security control | n/a | counts/status only | n/a | n/a | SEC-002 (no-leak test on proof artifacts) |

**DTO minimization note:** all output DTOs are aggregate counts + status; raw
storage paths are hashed (cleanup) or absent (scan). No raw tokens, user IDs,
or PII cross into any DTO. This is verified by existing tests
(`rawStoragePathRecorded=false`) and the `markdown no secret leak` proof.

**Abuse posture:** these are operator-only, once-daily, Bearer-gated endpoints.
The primary abuse vector is a leaked bearer secret (T-1/T-3) → mitigated by
rotation (SEC-001). No per-user rate limiting is needed because there is no
per-user access. Edge WAF/rate-limiting at `archestimator.com` provides
platform-level protection against direct-POST flooding.

## Threat model

| ID | Threat | Vector | Impact | Control | Residual |
|---|---|---|---|---|---|
| T-1 | Unauthorized job invocation | direct POST to `/api/internal/*` | unauthorized R2 delete / scan | Bearer secret (503 if unset, 401 if wrong); fail-closed | low (depends on secret strength/rotation) |
| T-2 | Secret leakage | secret in log/error/proof artifact | job hijack | summaries sanitized; `markdown no secret leak` test; route never echoes secret | low |
| T-3 | Secret exhaustion/no rotation | long-lived shared `CRON_SECRET` | blast radius if leaked | SEC-001 rotation runbook with overlap | medium until rotation cadence set |
| T-4 | Poison queue message | malformed body injected | re-run / DLQ fill | `isUploadJobQueueMessage` validator; ack invalid | low |
| T-5 | Cross-batch duplicate execution | cron retry re-enqueues same minute | duplicate work (cleanup idempotent; scan D1-guarded) | documented per-batch dedup limit (FR-003) | low (idempotent downstream) |
| T-6 | Retention DELETE over-deletes | wrong TTL / wrong cutoff / rule bug | data loss | `LIMIT` per rule; `data_retention_events` audit; dryRun option; OPEN-DEC-004 counsel gate | medium (live by default at call site) |
| T-7 | Retention DELETE on wrong table | SQL rule typo | data loss | rule registry is code (reviewed); audit row per pass | low |
| T-8 | DLQ replay causes duplicate side effects | operator replays without checking idempotency | double delete/scan | runbook FR-005 emphasizes idempotency check before replay | medium (operator discipline) |
| T-9 | Internal origin spoofing | attacker sets `CLOUDflare_UPLOAD_JOBS_ORIGIN`? | route reached at wrong host | env var is Worker secret, not client-controlled; route auth is path+Bearer, not host | low |
| T-10 | Free-tier observability blind spot | analytics sampling (logs 0.1, traces 0.05) | miss a failure signal | REL-001 uses deterministic signals (DLQ count, audit rows) not sampled logs | medium |

## Credential material taxonomy

| Material | Type | Created by | Stored in | Read by | Client-visible? | URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `CRON_SECRET` | raw secret (operator-set) | operator | Worker secret (not in repo) | `scheduled-upload-jobs.ts`, route handlers | no | no (Bearer header, in-Worker) | `cf:sync-worker-secrets` replace | 503 when unset |
| `UPLOAD_CLEANUP_JOB_SECRET` | raw secret | operator | Worker secret | upload-cleanup route | no | no | same | 503 when unset |
| `UPLOAD_SCAN_JOB_SECRET` | raw secret | operator | Worker secret | upload-scan route | no | no | same | 503 when unset |
| Queue message `idempotencyKey` | derived (non-secret) | `buildIdempotencyKey` | in-message (ephemeral) | consumer | no | no | n/a (minute-scoped) | ack "duplicate" |
| R2 proof receipt | public marker (no secret) | consumer | R2 `provider-proof/jobs/` | operator read | no | no | object delete | `markdown no secret leak` test |

**Key point (per directive):** these are raw bearer secrets, **not** hashes.
The route compares `authorization === "Bearer <secret>"` directly. A stored hash
is NOT a substitute — the route must recover the raw value to compare. These
stay server-only (Worker env), never client-visible.

## Input validation

- Queue message: `isUploadJobQueueMessage` (version, jobName enum, string types,
  source marker). Invalid → ack `"invalid-message"`.
- Route `?limit=`: parsed, clamped to `MAX_ROUTE_LIMIT` (1000 cleanup / 500 scan).
- Route `?dryRun=`: `1`/`true` only.
- Proof id: `/^[a-zA-Z0-9-]{16,80}$/`.
- Retention: rules are static code; cutoff derived from TTL; `LIMIT` bounds.

## Privacy / data minimization

- Retention IS the privacy control (data minimization per GDPR Art. 5(1)(c) /
  PH DPA IRR §11(c), per `retention-schedule.md`).
- Audit rows store aggregate `rows_affected` + `metadata {selected_count}`, NOT
  purged row IDs (verified by test L153).
- No PII in queue messages, proof receipts, or worker logs.
- DSAR erasure propagation is out of scope (separate follow-up) but the runbook
  notes the retention cron does NOT perform DSAR propagation.

## Security testing

- Existing route tests assert fail-closed (503 no-secret, 401 wrong-secret).
- `markdown no secret leak` test guards proof artifacts.
- **Gap (TEST-001):** no denial test for a crafted queue message reaching a
  code path that skips `isUploadJobQueueMessage` — but the consumer calls the
  validator first on every message, so the path is structurally guarded. Add a
  test that asserts an invalid body is acked `"invalid-message"` and never
  reaches `runCloudflareScheduledUploadJobs`. (Partially covered by the poison
  message in the proof simulation; add a direct unit assertion.)
