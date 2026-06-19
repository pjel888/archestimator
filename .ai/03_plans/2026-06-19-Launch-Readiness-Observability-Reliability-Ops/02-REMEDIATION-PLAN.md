# Observability, Reliability & Ops — Remediation Plan (2026-06-19)

Sequenced fix plan for the **confirmed/adjusted** findings only. Verdicts and proof
gates live in `03-EVIDENCE-AND-VERIFICATION.md`. Write-scope: this folder + (when Philip
authorizes implementation) the source files named below. READ-ONLY until then.

## Post-verification launch-blocker set

After adversarial verification, the launch-blocker count dropped from the prior auditor's
**4** (OPS-01/02/03/04) to **2**:

| ID | Title | Final severity | Blocker? | Why changed |
|---|---|---|---|---|
| OPS-01 | No `global-error.tsx` / root `error.tsx` / `not-found.tsx` | high | **YES** | confirmed |
| OPS-03 | No durable error/log sink (console-only) | high | **YES** | confirmed (interim posture is the gate) |
| OPS-04 | Support/alert/incident monitoring unproven | high→medium | NO | downgraded: this is an *operational checklist + decision*, not a code defect; it is gated on OPS-03/05 standing up first and on an owner action, and the proof harness already exists. It is a **launch checklist item**, not a code launch-blocker. |
| OPS-02 | `/api/ai/package-builder` has no rate limit | high→medium | NO | **adjusted**: both AI routes are gated by `isAiRoutesEnabled()` which defaults `false`; in the closed-beta config the route returns 404 before the handler runs. The cost/abuse exposure is **latent**, materializing only when AI is flipped on. Fix before enabling AI, not before closed-beta launch. |
| OPS-05 | `/api/health` is a static liveness stub | medium | NO | confirmed |
| OPS-06 | PITR/RPO recovery decision under-specified | medium→info | NO | downgraded: decisions.md:748 already records the PITR-off cost posture; residual is only the explicit RPO number + restore-drill status. |
| OPS-07 | rate-limit table has no scheduled GC | low | NO | confirmed |
| OPS-08 | email/error PII in ephemeral console logs | low | NO | confirmed |

---

## Phase 0 — Launch blockers (do before exposing closed-beta users)

### R-1 (OPS-01) — Add root error/crash boundaries

**Goal:** No raw unstyled Next crash screen on the externally-reachable, high-variability
paths (`/`, `/login`, `/invite/[token]`, `/share/[token]`, marketing pages).

**Steps:**
1. Create `src/app/global-error.tsx` — a Client Component (`"use client"`) that renders its
   own `<html><body>` (Next requirement: it replaces the root layout when the root layout
   itself throws). Branded minimal shell + a "Reload" button (`reset()` prop). Call
   `console.error({ level: "error", route: "global-error", digest: error.digest })` so
   Vercel function logs capture it (sink decided in R-2).
2. Create `src/app/error.tsx` — segment-level boundary for the non-workshop tree. Reuse the
   visual pattern from `src/components/workshop/WorkshopRouteErrorState.tsx` (extract a
   shared presentational component if cheap; otherwise duplicate — it is small). Log
   `error.digest` server-visibly. Gate any verbose `console.error` behind
   `process.env.NODE_ENV !== "production"` to match the existing workshop boundary hygiene.
3. Create `src/app/not-found.tsx` — branded 404 with a link home. Optional but cheap; closes
   the unbranded-404 gap for bad `/invite`/`/share` tokens that resolve to notFound().

**Files:** `src/app/global-error.tsx` (new), `src/app/error.tsx` (new),
`src/app/not-found.tsx` (new); optionally a small shared component under
`src/components/system/`.

**Migration/RLS:** none.
**Risk:** low. `global-error.tsx` must include its own `<html><body>` or it breaks the root
render path — verify with a forced throw. Keep it dependency-light (no providers, no Query)
so it cannot itself throw.
**Effort:** S. **Dependencies:** sink choice in R-2 (only for where `digest` lands; the
boundary can ship with `console.error` immediately and be upgraded later).

### R-2 (OPS-03) — Decide and stand up the interim error/log posture

**Goal:** Production user-facing failures produce a signal an operator can act on. This is a
**decision + minimal wiring**, not necessarily a full Sentry install.

**Pick ONE (owner decision, record in `.ai/10_state/decisions.md`):**
- **Option A — minimal hosted tracker:** add `@sentry/nextjs`, wire `instrumentation.ts` +
  `beforeSend` PII scrub that reuses the existing IP-hash/redaction idioms (see
  `src/app/api/share/[token]/decision/route.ts:34` `logStructured` and the
  `vercel-web-analytics.ts` redaction). Capture `error.digest` from R-1 boundaries. This is
  roadmap-deferred, so treat as optional-but-recommended.
- **Option B — accept-risk + log drain:** attach a Vercel log drain (Logtail/Datadog/etc.)
  so `console` output is queryable/alertable, record the accept-risk in decisions.md, and
  name a human to watch it for the beta window.

**Do NOT launch with neither.** The deliverable of R-2 is a recorded decision + the chosen
wiring, plus a shared structured-log helper under `src/lib/observability/` that the
telemetry stubs (`realtime-telemetry.ts:7`, `express-components-telemetry.ts:28`, which both
already say "swap in a real sink") can call.

**Files:** `instrumentation.ts` (new, if Option A) / Vercel project config (Option B);
`src/lib/observability/log.ts` (new helper); decisions.md entry.
**Migration/RLS:** none.
**Risk:** medium — PII scrub must be verified (see OPS-08); a misconfigured `beforeSend` can
leak emails into a now-durable store. **Effort:** M. **Dependencies:** OPS-08 redaction
helper should land *with* this, not after, because the drain makes logs durable.
**Cross-domain:** overlaps Domain 7 (deploy/headers) for Vercel config and Domain 4 (API
hardening) for the log shape.

---

## Phase 1 — Launch-checklist items (operator actions, gated on Phase 0)

### R-3 (OPS-04) — Stand up + prove live monitoring, then satisfy the proof flags truthfully

**Goal:** Someone is *notified* when the beta breaks.

**Steps:**
1. Wire an uptime monitor against the **deep** health endpoint from R-4 (not the liveness
   stub) — e.g. an external pinger or Vercel monitor.
2. Wire an error-rate alert against the R-2 sink.
3. Name an incident-escalation owner; write it in the runbook.
4. Set the five `SUPPORT_MONITORING_*_CONFIRMED` flags + four owner labels so
   `bun run launch:check-support-monitoring` passes **because the thing is real**, not
   flag-flipped. The script is an honest parser (it says so at
   `scripts/check-support-monitoring-readiness.ts:84`); do not game it.

**Files:** none in repo except possibly the runbook under `.ai/`; the rest is provider/env.
**Risk:** low (operational). **Effort:** M. **Dependencies:** R-2 (error alert needs a
sink), R-4 (uptime alert should hit a *meaningful* probe).

### R-4 (OPS-05) — Add a dependency-aware readiness probe

**Goal:** The uptime monitor can actually detect a Supabase/data outage.

**Steps:**
1. Keep `src/app/api/health/route.ts` as the cheap liveness stub (always `{ ok: true }`).
2. Add a readiness probe — either `GET /api/health/ready` (new route) or a `?deep=1` branch.
   It runs a time-boxed (~1–2s) cheap Supabase call (`select 1` or a trivial RPC) and an
   env-presence assertion (service-role key, project URL present).
3. **Leak-free contract:** on failure return `{ ok: false }` with a generic reason code and
   a 503; never echo the error detail. Keep it unauthenticated-safe (no row data, no PII).
4. Point the R-3 uptime monitor at the readiness probe.

**Files:** `src/app/api/health/ready/route.ts` (new) or edit
`src/app/api/health/route.ts`.
**Migration/RLS:** none (read-only `select 1`; use the existing server client).
**Risk:** medium — a DB-touching public endpoint is a small DoS/cost surface; keep the query
trivial, time-boxed, and consider a light cache (e.g. 10s) so a monitor can't hammer
Supabase. **Effort:** S. **Dependencies:** none.

---

## Phase 2 — Pre-AI-enable gate (do before flipping `isAiRoutesEnabled` on, NOT before beta)

### R-5 (OPS-02) — Rate-limit `/api/ai/package-builder` before AI is enabled

**Goal:** When AI is turned on, package-builder cannot drive unbounded DeepSeek spend.

**Steps:**
1. Mirror the `ai/ask` quota wiring: add a `checkQuota`-style call in
   `handlePackageBuilderRequest` (`src/app/api/ai/package-builder/handler.ts`, after auth at
   line ~201, before any provider call). Use a `package_builder` scope on
   `security_rate_limit_events` via the existing durable rate-limit helper pattern in
   `src/lib/ai/rate-limit.ts`.
2. **Fail closed:** on quota-storage error return 503 (mirror `ask/handler.ts:130-134`); on
   denial return 429 with `Retry-After`.
3. Choose a tighter window than ask (a draft is heavier/costlier than a single ask).

**Files:** `src/app/api/ai/package-builder/handler.ts`; `src/lib/ai/rate-limit.ts` (add a
`checkPackageBuilderQuota` sibling).
**Migration/RLS:** none — reuses `security_rate_limit_events` (service-role-only, already
granted delete/insert). New `scope` value is data, not schema.
**Risk:** low. **Effort:** M. **Dependencies:** none. **Gate:** must land before any
deploy that sets the AI-routes-enabled env to true. Record this as a launch-checklist
precondition so it is not forgotten when AI is enabled.

---

## Phase 3 — Hygiene / debt (deferrable, record as known debt)

### R-6 (OPS-07) — Scheduled GC for `security_rate_limit_events`

Add an hourly/daily `delete from security_rate_limit_events where expires_at < now()` via
`pg_cron` (a new migration) or a Vercel cron hitting an admin route. The `_expiry_idx`
already exists so the sweep is cheap. **Files:** new `supabase/migrations/*_rate_limit_gc.sql`
(if pg_cron) or a cron route. **Risk:** low. **Effort:** S. Defer post-beta; record as debt.

### R-7 (OPS-08) — Redact email/error PII at the log boundary

When R-2 lands the durable sink, route the email-bearing warn-logs
(`src/lib/collaboration/actions.ts:582,724`; `src/lib/publication/actions.ts:1127,1217`)
through the `src/lib/observability/log.ts` helper that hashes/elides emails and maps provider
error objects to codes — same discipline as the share-route IP hashing. Until R-2, accept-risk
(logs are short-lived + access-controlled to the Vercel project). **Effort:** S.
**Dependencies:** R-2.

### R-8 (OPS-06) — Formalize the RPO/restore-drill record

decisions.md:748 already records PITR-off for closed beta. Add a one-line addendum stating
the explicit **RPO ≤ 24h** (daily backups) and that **restore is untested** (the
`daily-backup` mode's accepted-risk `blocked` drill), to be revisited before GA / first real
customer data. Optionally run one `daily-backup` restore drill into a throwaway project to
convert `blocked` → `passed`. **Files:** decisions.md. **Risk:** none. **Effort:** S.

---

## Sequencing summary

```
Phase 0 (BLOCKERS):   R-1 ──┐
                      R-2 ──┴─(R-2 lands with R-7 redaction)
Phase 1 (checklist):  R-4 ──> R-3   (R-3 needs R-2 sink + R-4 probe)
Phase 2 (pre-AI):     R-5         (only before AI-enable deploy)
Phase 3 (debt):       R-6, R-7, R-8
```

## Cross-domain dependencies
- R-2: Domain 7 (Vercel deploy/config for log drain), Domain 4 (log-shape consistency).
- R-4: Domain 1/2 (Supabase client/RLS) for the read probe — keep it `select 1`, no RLS surface.
- R-3: pure ops/owner action; not a code domain.
