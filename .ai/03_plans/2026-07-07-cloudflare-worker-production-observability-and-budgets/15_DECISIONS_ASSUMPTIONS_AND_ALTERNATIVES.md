# 15 — Decisions, Assumptions, and Alternatives

## 15.1 Load-bearing decisions

### DEC-01 — App-level request id at the Worker edge (UUIDv4), echo `x-request-id`
- **Problem:** `cf-ray` is read in 2 places, never echoed, and cron/queue/DO calls
  get fresh cf-ray — no end-to-end correlation.
- **Constraints:** free tier; must not cost a subrequest or D1 write.
- **Options:**
  1. Generate UUIDv4 at edge, echo header, propagate via ALS + header (recommended).
  2. Rely on `cf-ray` only — **rejected**: not shareable across cron/queue/DO; not echoed.
  3. W3C `traceparent` only — **rejected as primary**: traces disabled (quota);
     overkill for app correlation. Keep available when traces re-enabled.
  4. Store id in KV — **rejected**: KV eventually consistent; unnecessary.
- **Security:** validated regex; non-secret; fail-safe fresh-id.
- **Performance:** < 0.1 ms (uuid + regex).
- **Operational:** speeds incident triage; no quota cost.
- **Reason:** only an app-level id generated at the Worker can cover every
  request shape (HTTP/cron/queue/DO/short-circuit) on the free tier.
- **Conditions to change:** if we move to a paid tracing tool, switch primary to
  `traceparent`.

### DEC-02 — Disable traces pre-launch; logs near 100%
- **Problem:** traces share the logs quota since 2026-03-01; Open Beta.
- **Options:** (a) disable traces, logs 1.0 (recommended pre-launch); (b) keep
  0.05 traces (rejected: eats shared quota, beta schema); (c) logs 0.1 + traces
  0.01 (acceptable later).
- **Reason:** pre-launch traffic is low; full log fidelity > traces for triage.
- **Walk-down:** as traffic grows, logs 1.0 → 0.5 → 0.1 → 0.05, then consider
  traces at 0.01.

### DEC-03 — Analytics Engine for KPIs (not D1)
- **Options:** (a) AE binding (recommended; free 100k/day; separate quota);
  (b) self-host in D1 (rejected: costs rows-written/day quota); (c) external
  tool (deferred: adds dependency).
- **Reason:** AE is purpose-built, free, and doesn't compete with logs/D1 quotas.

### DEC-04 — try/catch at Worker dispatch boundary
- **Options:** (a) wrap fetch/scheduled/queue (recommended); (b) rely on
  Cloudflare invocation logs (rejected: no app context, no id).

### DEC-05 — Bound retention by time + rows per tick
- **Options:** (a) `maxDurationMs` + `maxRowsDeletedPerTick` (recommended);
  (b) leave unbounded (rejected: 15-min cron wall + 100k rows/day risk).

### DEC-06 — Keep domain `correlationId` separate from request `requestId`
- **Problem:** both exist; tempting to unify.
- **Options:** (a) keep separate (recommended); (b) unify (rejected: different
  lifecycles — `correlationId` is durable idempotency/activity grouping;
  `requestId` is ephemeral per-request trace).
- **Reason:** unifying would overload one id with two semantics.

### DEC-07 — AE binding name (owner-delegated)
- **Problem:** need a name; no strong product reason to prefer one.
- **Options:** `ARCH_METRICS` (recommended), `OBSERVABILITY`, `WORKER_ANALYTICS`.
- **Owner:** Philip. **Impact if undecided:** Phase 7/8 use a placeholder; trivial rename later.

### DEC-08 — Server-Timing default off, gated, label-allowlisted
- **Options:** (a) default off + env gate + allowlist + suppress on cacheable/auth
  (recommended); (b) default on (rejected: cache-pollution + leak risk); (c) not
  at all (rejected: useful for diagnosis).

### DEC-09 — No paid add-on enabled by this plan
- **Options:** stay free (recommended, per `AGENTS.md`); defer Logpush/Paid/traces
  until traffic justifies. **Upgrade triggers** documented in `13_…`.

### DEC-10 — `verification_mode: emulated`
- **Problem:** no independent verifier available in this session.
- **Decision:** label honestly; cap readiness at 97; mark `CONDITIONALLY READY`.
- **Rejected:** claim `independent` (would be fabricated).

## 15.2 Assumptions

| ID | Assumption | Strength | Validation |
|---|---|---|---|
| ASSUMP-01 | OpenNext runs in the same Worker isolate so ALS is visible | repo evidence (`@opennextjs/cloudflare` same-isolate) | verify in impl via test; header fallback covers gaps |
| ASSUMP-02 | `crypto.randomUUID()` available in Worker runtime | official docs + `worker.ts:111` already uses it | n/a (already used) |
| ASSUMP-03 | `AsyncLocalStorage` works under `nodejs_compat` | repo evidence (`server-timing.ts` already uses it) | type-check + test |
| ASSUMP-04 | Pre-launch traffic << 100k req/day and << 200k logs/day | repo evidence (no external users) | monitor; walk-down schedule |
| ASSUMP-05 | AE free-tier 100k/day sufficient for ≤1 KPI/req | official docs | monitor; sample if exceeded |
| ASSUMP-06 | DO Hibernation keeps memory bounded | official docs + `ctx.acceptWebSocket` already used | monitor `getWebSockets().length` |
| ASSUMP-07 | `Buffer.byteLength` / `TextEncoder.encodeInto` available in Worker | needs verification — fallback to single encode | test in T-6.1 |
| ASSUMP-08 | Retention `created_at` index exists for the SELECT | existing retention rules already run; assumed indexed | `EXPLAIN` in impl |
| ASSUMP-09 | The 5 `ARCH_UPLOAD_HOSTED_*` vars are intentionally advisory (not enforced) | repo evidence (only echoed) | confirm with owner if enforcement wanted (out of scope) |

## 15.3 Owner-delegated / external decisions (not blocking well-scoped slices)

| ID | Decision | Owner | Options | Recommendation | Impact if deferred |
|---|---|---|---|---|---|
| OPEN-01 | AE binding name | Philip | ARCH_METRICS / OBSERVABILITY / WORKER_ANALYTICS | ARCH_METRICS | Phase 7/2/8 use placeholder; rename trivial |
| OPEN-02 | Exact KPI set (beyond route/outcome/duration) | Philip | +upload count/size, +DO active rooms, +AI latency | start with route/outcome/duration; expand later | AE emits fewer points; no block |
| OPEN-03 | Alert-polling destination (GitHub Actions vs external service) | Philip | GH Actions / UptimeRobot / second Worker | GH Actions (free, in-repo) | alerting gap remains documented; not blocking |
| OPEN-04 | Whether to enforce the 5 `ARCH_UPLOAD_HOSTED_*` vars live | Philip | enforce / keep advisory | keep advisory (out of scope here) | none for this plan |
| OPEN-05 | Independent verifier / human review of this pack | Philip | independent agent / human / accept emulated | independent pass recommended | caps readiness at 97 until then |

These do not block implementation of the well-scoped slices (Phase 1-6, 9-10);
Phase 7-8 proceed with the recommended placeholder and can rename later.
