# 10 — Blast Radius And Dependencies

> The planning pass itself has zero code blast radius (no app files modified). This section analyzes the **future implementation phases**.

## Phase-by-phase blast radius

| Phase | Touches | Files/systems affected | Risk | Classification |
|---|---|---|---|---|
| P0 | repo lifecycle, identity, intake hardening, rate limit, migration `0037` | `privacy-request-repository.ts`, `route.ts`, new migration, new verify route, rate-limit helper | Medium (auth/data) | Required change |
| P1 | operator queue + actions + email + events | new routes + new UI page + Server Actions + email templates | Medium | Required change |
| P2 | export fulfillment | new action + R2 namespace + evidence | Medium (data) | Required change |
| P3 | erasure dry-run/confirm | new action + retention-event writes | **High (destructive)** | Required change (gated) |
| P4 | SLA breach + escalation | cron slice + alert + runbook | Medium | Probable change (gated) |

## Direct impact map

- **Users:** requesters gain verification + status; operators gain a queue.
- **Routes:** new `GET`/`[id]`/transition/verify/lookup/export/erasure surfaces; existing intake modified additively.
- **Components:** new queue/detail UI; reuse `src/components/ui/`.
- **APIs:** new contracts in `07`.
- **DB:** `privacy_requests` additive cols + new `privacy_request_events` + `privacy_request_verification_tokens` tables.
- **Provider:** D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`), Email (`EMAIL`) — all within bound resources.
- **Tests:** new suite under `tests/vitest/` + route tests.
- **CI:** no new pipeline; focused `vitest` + `type-check`.
- **Docs:** `src/app/privacy/page.tsx` (gated, `OPEN-LEGAL-01`); `.ai/10_state/current-state.md` at closeout.
- **Backward compat:** intake response adds a field (additive); retention cron unchanged.
- **Other active work:** none coupled (compliance surface is isolated).

## Dependency graph

```mermaid
flowchart LR
  M[migration 0037] --> P0
  P0[P0: repo lifecycle + identity + rate limit] --> P1
  P1[P1: queue + actions + email + events] --> P2
  P1 --> P3
  P2 --> P3
  P1 --> P4
  OD1[OPEN-ERASE-01] -. gates .-> P3
  OD2[OPEN-LEGAL-02] -. gates .-> P4
  OD3[OPEN-LEGAL-01] -. gates .-> P0-T4 + P1 email copy
  OD4[OPEN-OPS-01] -. gates .-> P1 gate
```

## Compatibility / migration

- `0037` is additive; safe to apply without a backfill. Down-migration is safe (drops new cols/tables).
- No generated-type regeneration needed (no Env binding change).

## Affected documentation

- `src/app/privacy/page.tsx` (gated).
- `.ai/10_state/current-state.md` (closeout).
- No AGENTS.md / CLAUDE.md change.

## Concurrent-agent safety

- Future implementation should declare file ownership in a coordination ledger (`00_COORDINATION_LEDGER.md` or run-log) before editing `privacy-request-repository.ts` (shared by P0–P3).
- The repository is the integration point; serialize its edits.
- Per `AGENTS.md` high-concurrency rules: re-read files immediately before edit; `git diff --check` after each edit.
