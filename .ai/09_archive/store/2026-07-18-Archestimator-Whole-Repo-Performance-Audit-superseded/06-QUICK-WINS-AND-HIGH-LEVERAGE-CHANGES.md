# 06 — Quick Wins and High-Leverage Changes

Ranked by `priority score = impact × frequency × confidence ÷ implementation cost` (1–5 each). Higher = do sooner. Wave assignment also respects dependencies and risk.

## Top quick wins (XS–S effort, high return)

### QW-1 — PERF-CI-001: Re-enable CI workflow (or correct README)
- **Effort**: XS · **Risk**: Low · **Score**: `5 × 5 × 5 ÷ 1 = 125`
- **Why fastest**: Pure git move. Either restore `.github/workflows/ci.yml` from `.github/workflows-disabled/` or update `README.md:380-385` to reflect "CI archived; local validation only". Re-enabling restores the existing (already-written) workflow that runs `bun install --frozen-lockfile → bun run validate → bun run build → bundle-budget advisory → impeccable design audit → Playwright smoke`. **This single change restores automated regression protection across type/lint/test/build/bundle.**
- **Dependency**: None.
- **Verification**: PR opens trigger workflow; `gh run list` shows runs.

### QW-2 — PERF-D1-001: Batch restore-replay row reads
- **Effort**: S · **Risk**: Low · **Score**: `4 × 3 × 5 ÷ 2 = 30`
- **Why fast**: Direct copy of the existing batched pattern from `rows.ts:3281-3285` into the idempotent replay path at `:3187-3191`. ~10 lines.
- **Dependency**: None.
- **Verification**: `EXPLAIN QUERY PLAN` for the new batched SELECT; instrument statement count.

### QW-3 — PERF-FE-001: Stabilize virtualized row `style` prop
- **Effort**: S · **Risk**: Low · **Score**: `4 × 5 × 4 ÷ 2 = 40`
- **Why fast**: Move inline object literal to `useMemo` keyed on `[virtualRow.start, scrollMargin, virtualEnabled]` (~5 lines). This is existing Plan 022.
- **Dependency**: None.
- **Verification**: React Profiler probe count (`reportEstimateRowItemRender`) during typing — needs browser gate (TEST_PROPOSAL).

### QW-4 — PERF-CRON-002: Fix GlobalPresence broadcastTimer hibernation leak
- **Effort**: S · **Risk**: Low · **Score**: `3 × 5 × 4 ÷ 2 = 30`
- **Why fast**: Add `clearTimeout(this.broadcastTimer); this.broadcastTimer = null;` in `webSocketClose`/`webSocketError` when `getWebSockets().length === 0`. ~4 lines.
- **Dependency**: None.
- **Verification**: Wrangler tail on staging — observe hibernation events.

### QW-5 — PERF-RT-001: Add `bufferedAmount` backpressure to DO `sendJson`
- **Effort**: S · **Risk**: Low · **Score**: `4 × 3 × 4 ÷ 2 = 24`
- **Why fast**: Add `if (ws.bufferedAmount > BACKPRESSURE_THRESHOLD) return;` in `sendJson` for cursor/presence messages (drop silently) and close with 1013 for row updates. ~10 lines per DO × 3 DOs.
- **Dependency**: Hosted load test to tune threshold (BLOCKED).

### QW-6 — PERF-OBS-001 (phase 1): Fix `pagehide` listener leak
- **Effort**: XS · **Risk**: Low · **Score**: `3 × 5 × 5 ÷ 1 = 75`
- **Why fastest**: Convert anonymous arrow to named function; remove in cleanup. ~3 lines. The larger web-vitals write-amplification fix (batching + sampling) is M effort and goes in Wave 1.
- **Dependency**: None.

### QW-7 — PERF-CRON-001: Skip `cron_run_events` INSERT on no-op
- **Effort**: S · **Risk**: Low · **Score**: `3 × 5 × 4 ÷ 2 = 30`
- **Why fast**: Gate `recordCronRunEvent` on a meaningful-work flag from each task; collapse the two `30 3 * * *` INSERTs into one. ~20 lines.
- **Dependency**: None.

## Quick-win ordering recommendation

If only quick wins are pursued before any larger work, do them in this order:

1. **QW-1** (CI) — unblocks every other measurable improvement by restoring the regression gate.
2. **QW-6** (pagehide leak) — XS, zero risk, immediate.
3. **QW-3** (style prop) — addresses the highest-frequency UI hot path.
4. **QW-2** (restore batch) — S, low risk, removes a 100× D1 read spike.
5. **QW-7** (cron no-op) — S, immediate D1 write reduction.
6. **QW-4** (GlobalPresence hibernation) — S, immediate DO duration cost reduction.
7. **QW-5** (backpressure) — S, reliability improvement under load.

## Larger high-leverage changes (M effort, higher impact)

### HL-1 — PERF-OBS-001 (full): Web-vitals batching + sampling
- **Effort**: M · **Risk**: Low · **Score**: `5 × 5 × 5 ÷ 3 = ~42`
- **Why high-leverage**: Cuts the largest client-driven D1 write amplifier by ~80-90% while preserving observability.

### HL-2 — PERF-AUTH-001: Re-enable session cookie cache
- **Effort**: M · **Risk**: Medium · **Score**: `5 × 5 × 4 ÷ 3 = ~33`
- **Why high-leverage**: Removes 1-3 D1 reads from every authenticated request. Must preserve revocation correctness.

### HL-3 — PERF-FE-002: Split AppProviders into Public + Workshop scopes
- **Effort**: M · **Risk**: Medium · **Score**: `4 × 5 × 4 ÷ 3 = ~27`
- **Why high-leverage**: Removes unnecessary provider JS from every public/auth/share route. Needs bundle baseline (Plan 001) to measure.

### HL-4 — PERF-PUB-001: Execute existing Plan 021 (async recipient emails)
- **Effort**: M · **Risk**: Medium · **Score**: `5 × 3 × 5 ÷ 3 = 25`
- **Why high-leverage**: Eliminates ~13 sequential email round-trips on publish; durable delivery.

### HL-5 — PERF-EXP-001: XLSX double-buffer copy
- **Effort**: S (buffer) · **Risk**: Low · **Score**: `3 × 2 × 5 ÷ 1 = 30`
- **Why high-leverage**: Halves peak memory at the documented 3,000-row ceiling. The compression piece is separate (M / Medium risk).

### HL-6 — PERF-D1-002: Batch `reconcileActivityOutbox`
- **Effort**: M · **Risk**: Low · **Score**: `4 × 2 × 5 ÷ 3 = ~13`
- **Why high-leverage**: 500× D1 statement reduction on daily retention cron.

## Items explicitly NOT quick wins (deferred — see `07-OPTIMIZATION-ROADMAP.md`)

- God component decomposition (existing Plan 026) — L effort, MED-HIGH risk.
- `workspace-repository.ts` split (existing Plan 025) — M effort but plan already exists.
- Action error consolidation (existing Plan 024) — L effort.
- Direction spikes (existing Plans 028-033) — research, not perf.
- Web-vitals sampling design — pairs with HL-1.
- D1 EXPLAIN proof campaign — Wave 0 prerequisite, BLOCKED on hosted credentials.
