# 18 — Stack Contract and Production Standards

Cross-cutting production decisions for the beta support feedback operating loop. Active stack: Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, D1, R2, Durable Objects, Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand, repository boundaries.

## Next.js App Router & rendering

- Feedback page + review page remain **Server Components** (auth-gated, dynamic). No `use cache` boundary (would risk cross-user leakage).
- `"use client"` stays scoped to `BetaFeedbackForm` + `WorkshopFeedbackModal` (smallest interactive boundary). New libs are `"server-only"`.
- Loading/error: the review page is SSR (no client loading state needed); the inline form uses `useActionState` `pending`.
- Navigation: no new route; the modal stays the primary in-app entry.

## Cache, revalidation, freshness

- Cache owner: none for feedback (dynamic, auth-gated). Do not introduce `use cache`/`cacheTag`.
- Revalidation: `revalidatePath("/workshop/settings/feedback")` after status update (existing). SLA badge is derived server-side → no client invalidation.
- Read-your-writes: operator sees their status update immediately via `revalidatePath`; reporter ack is post-submit.

## Server Actions, forms, mutations

- Existing actions extended (not replaced). Each re-validates `requireAuth`/`isPlatformAdminRole`.
- Idempotency: status-event `UNIQUE`; timestamp `IS NULL` guards; `alerted_at` guard.
- Progressive enhancement: redirect-mode form works without JS (POST → redirect). Inline mode requires JS (modal).
- Cache invalidation: `revalidatePath` on status update.
- Audit: `beta_feedback_status_events` + structured logs.

## React component quality

- No new effects for render derivation. Focus move on inline state change is a legitimate effect (synchronization) with cleanup consideration.
- Stable keys: queue rows keyed by `id`.
- Typed props/events; no `any`.
- Design-system reuse: `Modal`, `DropdownSelect`, `Button`, tone classes. No new primitives unless `DropdownSelect` lacks label passthrough (then add the minimal prop).

## Tailwind v4 / design-system

- Reuse existing tone classes (accent/warning/danger) for badges/ack.
- SLA badge: icon + text (non-color cue). `DESIGN.md` is alpha — defer to Philip; no blocking design-system work.

## State management

- No new Zustand/TanStack Query. Server Actions own mutations; `useActionState` owns inline form state; URL owns redirect-mode ack params.
- No optimistic UI (ack is post-response).

## TypeScript, validation, domain modeling

- Typed boundaries; no `any`. Manual parse-union validation (DEC-06, no zod).
- Discriminated unions for send results (`SendEmailResult`, alert results).
- Worker Env: raw `process.env` for alert triplet (DEC-08); no `cf:typegen` needed.

## D1, R2, Durable Objects, data integrity

- D1 only (`ARCH_DB`). Migration `0039` additive + rollback. App-authz via `requireCurrentUserContext`/`isPlatformAdminRole` (no RLS on D1).
- No R2/DO changes.
- Transaction boundaries: save = single INSERT; status update = UPDATE + event INSERT (best-effort audit; `status` column is source of truth).
- Retention: 365d archived-only purge (DATA-02).

## Email (Cloudflare `EMAIL` binding)

- Reuse `sendEmail` (circuit breaker, graceful `ok:false`).
- Env required: `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, provider `cloudflare-email`, `CLOUDFLARE_EMAIL_FROM`, operator email (`FEEDBACK_OPERATOR_EMAIL` or `CLOUDFLARE_EMAIL_REPLY_TO`).
- Bodies: app-controlled templates; user `message` as plain text / HTML-escaped (T-01).

## Queues/Cron

- New cron branch in `worker.ts scheduled()` (in-process sweep). No queue job (DEC-03/ARCH-03).
- `wrangler.jsonc` crons list extended (4th entry). AGENTS.md "two crons" note is stale (3 exist today).

## Security, privacy, abuse

- Authz at server boundary on every operator action. Server Actions treated as directly-reachable POST endpoints.
- PII redaction in logs (SEC-DATA-01). Webhook payloads summary-only.
- No new secrets/credentials; existing env triplet pattern.
- Threat model in `08`.

## Performance, scalability, budgets

- Free-tier posture (no paid add-ons). Daily sweep (not hourly). Indexed queries.
- Perf evaluator for sweep only; submission/update are O(1).
- Notify bounded by 2s timeout.

## Reliability, observability, operations

- Feature flag `FEEDBACK_LOOP_ENABLED`. Rollback = flag off + cron branch removal + `DROP COLUMN`.
- Structured events (`feedback_*`). Redaction-aware.
- Readiness check (P4) + runbook (`13`).

## Accessibility

- Labels, live regions, focus, non-color cues, keyboard (via primitives). RTL/DOM tests sufficient; Playwright intentionally skipped.

## Testing

- Unit/DOM/action/denial/perf layers. Repository-native scripts. Shadow-path + UltraQA matrices complete.
