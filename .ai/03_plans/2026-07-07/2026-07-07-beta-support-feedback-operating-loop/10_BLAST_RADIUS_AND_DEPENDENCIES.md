# 10 — Blast Radius and Dependencies

## Direct impact

| Area | File / surface | Change type | Classification | Note |
|---|---|---|---|---|
| D1 schema | `migrations/0039_beta_feedback_sla_columns.sql` | new migration (additive columns) | Required change | nullable; zero downtime |
| D1 store | `src/lib/workshop/beta-feedback-d1-store.ts` | extend (pagination, timestamp setters, alerted_at update) | Required change | |
| Server actions | `src/lib/workshop/beta-feedback-actions.ts` | extend (notify hook, payload mailto) | Required change | |
| Server actions | `src/lib/workshop/beta-feedback-review-actions.ts` | extend (follow-up email) | Required change | |
| Review lib | `src/lib/workshop/beta-feedback-review.ts` | extend (pagination, breach filter) | Required change | |
| Shared lib | `src/lib/workshop/beta-feedback.ts` | extend (copy constants, SLA config) | Required change | |
| New lib | `src/lib/workshop/beta-feedback-notify.ts` | new | Required change | operator notify + reporter follow-up |
| New lib | `src/lib/workshop/beta-feedback-sla.ts` | new | Required change | SLA math |
| New lib | `src/lib/workshop/beta-feedback-sla-sweep.ts` | new | Required change | cron handler |
| New lib | `src/lib/workshop/beta-feedback-alert.ts` | new | Required change | webhook alert (clone of operational-telemetry pattern) |
| UI | `src/components/workshop/BetaFeedbackForm.tsx` | extend (a11y, ack copy) | Required change | |
| Route | `src/app/workshop/feedback/page.tsx` | extend (ack copy) | Required change | |
| Route | `src/app/workshop/settings/feedback/page.tsx` | extend (pagination, badge, filter) | Required change | |
| Worker | `worker.ts` | extend (new scheduled() cron branch) | Required change | |
| Config | `wrangler.jsonc` | extend (new cron trigger + optional vars/secrets) | Required change | |
| Script | `scripts/check-beta-feedback-loop-readiness.ts` | new | Required change (P4) | readiness gate |
| Script | `scripts/verify-feedback-alert-delivery.ts` | new | Probable change (P4) | model on upload-alert proof |
| Retention | retention registry (`retention-core.ts` or equivalent) | extend (feedback TTL rule) | Required change (P3) | couples to `OPEN-DEC-004` |
| Retention sweep | `runRetentionPassInD1` rule list | extend | Required change (P3) | |

## Transitive / probable impact

| Area | Why | Classification |
|---|---|---|
| Tests `tests/vitest/beta-feedback-*.test.ts`, `feedback-admin-*.test.ts`, `beta-admin-action-boundaries.test.ts` | new behaviors must be covered; existing assertions may need updates for pagination/timestamps | Required change |
| `.ai/10_state/compliance/retention-schedule.md` | add feedback retention row | Probable change (P3) |
| `.ai/10_state/current-state.md` FAST PATH | record the new loop as shipped (post-impl) | Probable change (post-impl) |
| `.ai/06_specs/feature-inventory.md` | update feedback surface status (operator notify/SLA) | Probable change (post-impl) |
| Operator runbook (if any) | document SLA + breach response | Possible change |

## Explicitly unaffected

| Area | Why unaffected |
|---|---|
| `/contact` public form + `ContactForm` | stays mailto; not unified into D1 (`OPEN-FUNNEL-01` deferred) |
| Better Auth / roles / session | reused as-is (`isPlatformAdminRole`, `requireCurrentUserContext`) |
| Durable Objects / `COLLAB_ROOMS` | no realtime need |
| Queue `UPLOAD_JOBS_QUEUE` | not used (ARCH-03: cron is simpler) |
| `EMAIL` binding config | reused; no binding change (only new call sites + env) |
| Publication / share / collaboration flows | untouched |
| Cost library / components / estimates | untouched |
| Landing pages | untouched |
| Legacy `supabase/migrations/*` | archaeology only; never run/extend |

## Cross-pack dependencies

| Pack | Coupling | Direction |
|---|---|---|
| `2026-07-07-launch-readiness-evidence-gate` | this loop's readiness check feeds the go/no-go gate | this → that |
| `2026-07-07-observability-alert-proof-and-log-retention` | hosted alert-delivery proof (`OPEN-MON-01`) is owned there | that → this (P4 blocker) |
| `2026-07-07-privacy-request-operations-and-erasure-workflow` | DSAR/erasure must reach feedback rows (P3) | bi-directional |

## Concurrency-safe file ownership

All new files are net-new (no collision risk). Extended files (`beta-feedback-*.ts`, `worker.ts`, `wrangler.jsonc`, the two pages) are owned by this pack's implementation. If a sibling pack edits `worker.ts` or `wrangler.jsonc` concurrently (e.g. observability-alert-proof), coordinate via the ledger — `wrangler.jsonc` cron list and `worker.ts scheduled()` are shared-file surfaces.

## Backward compatibility

- Additive columns → existing reads tolerate null.
- New cron → additive; removal is safe.
- Notify/follow-up hooks → additive; removing restores prior behavior.
- Pagination → default page 1 returns the same first-50 ordering as today (no visible regression for the common case).
- No API contract changes (Server Actions are internal; no external consumers).
