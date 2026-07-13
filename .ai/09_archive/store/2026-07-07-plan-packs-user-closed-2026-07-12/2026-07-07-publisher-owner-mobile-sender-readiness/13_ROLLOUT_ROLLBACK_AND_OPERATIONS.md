# 13 — Rollout, Rollback, and Operations

---

## Release shape
- **Profile:** low-risk owner-UI surfacing (Option B). No schema, binding, provider, or authz change.
- **Feature flag:** not required for Option B (pure UI). An existing flag mechanism may be used if impl prefers; not mandated.
- **Staged rollout:** closed-beta only (pre-launch). No production rings yet.

## Gates

| Gate | Blocks | Criterion |
|---|---|---|
| Merge | merge | `bun run type-check` + `bun run lint` + focused vitest green; `git diff --check` clean |
| Closed-beta | beta exposure | manual owner smoke (generate/copy/email/resend/revoke/rotate) on desktop; 375px mobile message + copy-URL + deep-link verified; PERF-01 within threshold |
| Production | (future) | not applicable pre-launch; revisit at launch-readiness gate |

## Performance/rollout gates (PERF-01, from `09`)
- Baseline: publisher route chunk gzip + drawer-open Profiler median (pre-change).
- Target: ≤2% chunk growth; ≤50ms drawer-open regression.
- Observability source: `bun run build` output + React Profiler (local). No paid observability add-on (cost posture).
- Regression window: compare against pre-change build on the same commit baseline.
- Rollback trigger: any P0 owner-blocker regression on the publisher route, OR PERF-01 threshold breach.
- Known gap: no hosted RUM proof (planning-only); deferred to launch-readiness.

## Rollback procedure
1. Revert the UI diff (`PublisherRosterClient`, `PublisherEmptyState`, `PublisherRosterRow`, `PublisherDrawer`, `RecipientEmailComposer`, `PublisherActivityFeed`).
2. No schema/binding to roll back.
3. Re-run focused tests to confirm baseline restored.
4. If a sibling-pack dependency (workflow pack labels) caused the regression, coordinate revert/fix-forward with that pack.

## Rollforward / fix-forward
- Preferred over rollback for minor surfacing bugs (cheap, safe).
- For authz/crypto regressions: impossible from this pack (no such change); would indicate a different incident.

## Observability (proportional)
- No new sink mandated. Optional redacted structured log per `09` (event schema + redaction).
- Owner-facing proof: Activity tab (sanitized events).
- No new alerts/dashboards (no paid add-on; pre-launch).

## Operations / support
- Owner incident tools: rotate (revoke leaked link + invalidate recipients) and revoke (block access). This pack improves their discoverability.
- No new cron/queue/DO.

## Backward compatibility
- Fully compatible: no contract change. Existing deep links (`?drawer=&tab=`) continue to work.
- Existing tests remain valid; this pack extends them.

## Post-release verification
- Closed-beta watch: confirm no owner reports of being blocked on mobile without a recovery affordance; confirm resend rate-limit messages are understood.
- (Future) launch-readiness gate re-evaluates DEC-MOBILE (upgrade to Option A if beta signal demands).
