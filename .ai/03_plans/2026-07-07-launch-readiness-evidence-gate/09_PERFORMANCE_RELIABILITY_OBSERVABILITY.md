# 09 — Performance, Reliability & Observability

## §1. Performance budgets (the gate itself)

| Metric | Target | Rationale |
|---|---|---|
| Local-mode wall-clock (Stages 0–1) | ≤120s | Owner/CI patience; must be runnable pre-merge |
| Report emit latency (after verdicts) | <5s | Negligible vs. anchor time |
| CI job duration (Option A) | <5min | GitHub Actions budget |
| Provider stage (Stage 2) | owner-gated, out of MVP budget | requires CF auth |
| Hosted stage (Stage 3) | owner-gated, out of MVP budget | requires live deploy |

**Evaluator:** `tests/perf/launch-gate-budget.test.ts` (3 runs, max ≤120s). See `12` §4.

**Baseline:** TBD at implementation Ring 0 (`/usr/bin/time -p bun run launch:gate --local`).

**Regression threshold:** >120s = fail. **Rollback trigger:** consistent >120s.

## §2. Reliability

- **Failure modes:** anchor crash, anchor timeout, missing artifact, stale artifact, malformed JSON, network down (stage 2/3), auth missing (stage 2/3), concurrent write race.
- **Handling:** each → `missing-evidence`/`stale-evidence`/`skipped(reason)`, never silent pass, never uncaught exception (REL-LG-01).
- **Recovery:** operator re-runs the affected anchor to regenerate the artifact; gate re-reads.
- **Availability:** the gate is a local tool; availability = "runs when invoked." No SLA.

## §3. Hot paths & bottlenecks

- **Hot path:** reading 13+ JSON artifacts + spawning ~10 local anchors (Stage 1). Bottleneck = slowest anchor (likely `validate` or `build`).
- **Mitigation:** parallel anchor execution in Stage 1 (anchors are independent); per-anchor timeout.
- **Memory:** negligible (small JSON files).

## §4. Observability (gate's own operation)

- **Logs:** stdout summary JSON (single object) — CI-scrapable.
- **Metrics:** report `summary` block (counts).
- **Dashboard:** the Markdown report.
- **Alerts:** Ring 3 CI failure on `main`.
- **Tracing:** per-anchor `durationMs` in the report (recommended field).

## §5. App-level performance (aggregated, not owned)

The gate surfaces — from sibling packs — the app-level performance posture:
- DOM-27 hosted perf p95 (`cf:verify-hosted-performance`) — currently known misses on cached public routes per `current-state.md:3052`.
- DOM-28/29/54 route/bundle perf (`perf:check-routes`, `check-performance-budgets.mjs`).
- DOM-53 RUM/CWV (sibling pack, missing-evidence today).

The gate does not define these budgets; the sibling packs do. The gate reports their verdicts.

## §6. Scalability

- The gate is O(domains) = O(67) reads/spawns. Trivially scalable.
- Adding a domain = one registry entry. Domain drift mitigated by a CI check (FR-LG-02 risk).

## §7. Cold start

- Bun script cold start: <1s typically. Negligible vs. anchor time.

## §8. Cache staleness

- The gate's freshness TTL (FR-LG-06) is the cache-staleness control for artifacts.
- The gate does not cache its own report (always re-derives).
