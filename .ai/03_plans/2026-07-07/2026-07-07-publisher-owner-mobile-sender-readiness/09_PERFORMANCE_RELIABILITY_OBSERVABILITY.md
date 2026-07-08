# 09 — Performance, Reliability, and Observability

---

## Performance relevance
The in-scope changes are **owner-side UI surfacing** (mobile message, state toasts, confirm-dialog text, honest labels, activity tab). None adds a new hot path, new fetch, new query, or new bundle chunk of consequence. The performance risk is therefore **low**, but a proportional evaluator is still defined.

## Performance evaluator contract (PERF-01)

| Field | Value |
|---|---|
| Baseline metric | Publisher roster client bundle size (gzip) + drawer open→first-paint at 1280px and 375px |
| Target metric | No regression > 2% gzip JS for the publisher route chunk; drawer first-paint ≤ baseline + 50ms |
| Measurement command | `bun run build` then inspect the publisher route chunk via Next build output; React Profiler for drawer open (manual/cycle-count) |
| Fixture/data size | 1 project (baseline) and 25-row roster (roster page size default) |
| Number of runs | build: 1 (deterministic); Profiler: 5 runs, report median |
| Regression threshold | > 2% chunk growth OR > 50ms drawer-open median regression |
| Related functional tests | `publisher-roster-client.test.tsx`, `publisher-drawer-actions.test.ts`, `recipient-email-composer.test.tsx` |
| Evidence artifact location | `.ai/03_plans/2026-07-07-publisher-owner-mobile-sender-readiness/` (impl adds a `perf/` note) |

Passing ordinary tests is **not** the performance evaluator; the build-chunk comparison + Profiler median is.

## Budgets
- **Client JS:** the publisher route chunk should not grow materially. Option B adds ~a button + string (negligible). Option A (not recommended) would add a mobile layout (flagged, not budgeted here).
- **RSC payload:** unchanged (roster fetched server-side, same shape).
- **Query count:** unchanged — no new server query.
- **Render count:** no new effect-driven renders (DEC-ARCH-1: no new hook/store).

## Reliability / failure modes (owner-side)

| Failure mode | Detection | Owner-visible | Recovery |
|---|---|---|---|
| D1 RPC error on generate/rotate/revoke | action throws | error toast + retry | retry; prior state intact (idempotent guards) |
| Email send failure (circuit breaker open) | `sendEmail` returns !ok | recipient chip `failed` + "Email delivery temporarily unavailable" | retry after breaker cooldown |
| Resend rate-limited | `checkSharedLinkRecipientResendRateLimit` | "try again in N min" | wait window |
| Clipboard API unavailable | `handleCopyLink` catch | "Copy failed" + visible URL fallback | manual copy |
| Drawer query stale/fail | TanStack Query error | drawer error state | refetch (`staleTime 10s`) |
| Link unresolvable on batch add | `addSharedLinkRecipients` batch-abort | clear owner message | resolve link config, retry |

## Observability (proportional; optional)
This pack does **not** mandate a new telemetry sink (planning-only; no provider mutation). If implementation adds structured logs for sender transitions (recommended for audit/proof, REQ-OPS-optional), they must:
- Event schema: `{action: "generate"\|"copy"\|"email"\|"resend"\|"revoke"\|"rotate", outcome: "success"\|"failure"\|"rate_limited", projectId, publicationId, recipientCount?, reason?}`.
- Redaction: **no raw tokens, no full emails, no raw IPs**. Use `publicationId` (not token), email hash/prefix, existing peppered IP hash.
- Sink: existing structured-log path; threshold/dashboard/runbook = deferred (no paid observability add-on per cost posture).
- Owner-facing proof: Activity tab surfaces sanitized events.

## Operations
- No flag required for Option B (pure UI). If implementation prefers a flag, reuse an existing feature-flag mechanism (not mandated).
- Rollback: revert the UI diff; no schema/binding to roll back.
- No new cron, queue, or DO interaction.

## Rollout/perf gates (see `13`)
- Merge gate: `bun run type-check` + `bun run lint` + focused vitest + `git diff --check`.
- Closed-beta gate: manual owner smoke (send/resend/revoke) on desktop + a 375px viewport check of the mobile message + copy-URL.
- Rollback trigger: any P0 owner-blocker regression on the publisher route.
