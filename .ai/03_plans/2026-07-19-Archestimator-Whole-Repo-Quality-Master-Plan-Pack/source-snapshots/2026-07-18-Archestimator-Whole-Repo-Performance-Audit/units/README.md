# Units — Performance Audit Plan Pack

Execution units for the Archestimator Whole-Repo Performance Audit. One unit
file per actionable finding in `../05-FINDINGS-REGISTER.md`, ordered by
priority then by dependency (Wave 0 → Wave 4, matching
`../07-OPTIMIZATION-ROADMAP.md`).

**Status convention:** each unit tracks two axes independently.
- `local_implementation` — `NOT_STARTED | IN_PROGRESS | ACHIEVED | TECH_BLOCKED`
- `external_lifecycle` — `NOT_STARTED | AUTH_BLOCKED (gate named) | ACHIEVED`
  (terminal units that need hosted/build/browser proof to confirm magnitude
  are marked `AUTH_BLOCKED` against the specific gate; the static change can
  still ship.)

**Cross-references:** several units extend or confirm items in the sibling
`/improve` pack (`2026-07-18-Codebase-Improve-Audit-Plan-Pack/`) and the
sibling consistency-audit pack (`2026-07-18-Whole-App-Consistency-Audit/`).
Where two packs cover the same defect, pick exactly one to execute.

## Unit index

| Unit | Slug | Finding | Priority | Wave | Dependencies | local_implementation | external_lifecycle |
|---|---|---|---|---|---|---|---|
| UNIT-001 | [`001-restore-ci-workflow`](001-restore-ci-workflow.md) | PERF-CI-001 | **P0** | 0 (W0-1) | — | NOT_STARTED | NOT_STARTED |
| UNIT-002 | [`002-web-vitals-batching-and-sampling`](002-web-vitals-batching-and-sampling.md) | PERF-OBS-001 | **P1** | 1 (W1-7) | — | NOT_STARTED | NOT_STARTED |
| UNIT-003 | [`003-virtualized-row-style-memo`](003-virtualized-row-style-memo.md) | PERF-FE-001 | P2 | 1 (W1-2) | extends `/improve` Plan 022 | NOT_STARTED | NOT_STARTED |
| UNIT-004 | [`004-restore-replay-batch`](004-restore-replay-batch.md) | PERF-D1-001 | P2 | 1 (W1-3) | extends `/improve` Plan 023 | NOT_STARTED | NOT_STARTED |
| UNIT-005 | [`005-cron-noop-insert-gate`](005-cron-noop-insert-gate.md) | PERF-CRON-001 | P2 | 1 (W1-4) | — | NOT_STARTED | NOT_STARTED |
| UNIT-006 | [`006-global-presence-broadcast-timer-cleanup`](006-global-presence-broadcast-timer-cleanup.md) | PERF-CRON-002 | P2 | 1 (W1-5) | overlaps consistency UNIT-026 | NOT_STARTED | NOT_STARTED |
| UNIT-007 | [`007-do-backpressure-buffered-amount`](007-do-backpressure-buffered-amount.md) | PERF-RT-001 | P2 | 1 (W1-6) | hosted load test to tune threshold | NOT_STARTED | AUTH_BLOCKED (hosted load test) |
| UNIT-008 | [`008-xlsx-export-buffer-and-compression`](008-xlsx-export-buffer-and-compression.md) | PERF-EXP-001 | P2 | 1 (W1-8) + 4 (W4-7) | phase 2: Workers DEFLATE validation | NOT_STARTED | NOT_STARTED |
| UNIT-009 | [`009-activity-outbox-batch`](009-activity-outbox-batch.md) | PERF-D1-002 | P2 | 1 (W1-9) | — | NOT_STARTED | NOT_STARTED |
| UNIT-010 | [`010-session-cookie-cache-reenable`](010-session-cookie-cache-reenable.md) | PERF-AUTH-001 | **P1** | 2 (W2-1) | commit archaeology; W0-5 to measure | NOT_STARTED | NOT_STARTED |
| UNIT-011 | [`011-async-recipient-invitation-emails`](011-async-recipient-invitation-emails.md) | PERF-PUB-001 | P2 | 2 (W2-2) | confirms `/improve` Plan 021 | NOT_STARTED | NOT_STARTED |
| UNIT-012 | [`012-split-appproviders-per-route`](012-split-appproviders-per-route.md) | PERF-FE-002 | P2 | 2 (W2-3) | W0-4 bundle baseline; characterization test | NOT_STARTED | NOT_STARTED |
| UNIT-013 | [`013-library-full-load-covering-index`](013-library-full-load-covering-index.md) | PERF-D1-003 | P2 | 3 (W3-7) | W0-6 EXPLAIN campaign | NOT_STARTED | AUTH_BLOCKED (hosted EXPLAIN) |
| UNIT-014 | [`014-component-source-guard-cte`](014-component-source-guard-cte.md) | PERF-D1-004 | P3 | 3 (W3-8) | W0-6 EXPLAIN; W3-2 fanout proof (K-10) | NOT_STARTED | AUTH_BLOCKED (hosted EXPLAIN + fanout) |
| UNIT-015 | [`015-replace-supabase-perf-scripts`](015-replace-supabase-perf-scripts.md) | PERF-DOC-001 | P3 | 4 (W4-3) | — | NOT_STARTED | NOT_STARTED |
| UNIT-016 | [`016-sweep-budget-doc-provider-language`](016-sweep-budget-doc-provider-language.md) | PERF-DOC-002 | P3 | 4 (W4-4) | — | NOT_STARTED | NOT_STARTED |
| UNIT-017 | [`017-dead-row-update-broadcast-hook`](017-dead-row-update-broadcast-hook.md) | PERF-FE-003 | P3 | Deferred | product-gated if completing | NOT_STARTED | NOT_STARTED |

**Totals:** 17 actionable units (1 P0, 2 P1, 9 P2, 4 P3) — wait, register
reports 16 actionable; PERF-CRON-003 is a tracking-only duplicate of
PERF-D1-002 (rolled in, not separately unitized). The 17 IDs in the prompt
include PERF-CRON-003; this pack maps it to UNIT-009 (PERF-D1-002) per the
register's "rolled into" note. See "Source contradictions" below.

## Priority / wave summary

| Wave | Units | Theme |
|---|---|---|
| 0 | UNIT-001 | Measurement and correctness prerequisites (CI gate) |
| 1 | UNIT-002, UNIT-003, UNIT-004, UNIT-005, UNIT-006, UNIT-007, UNIT-008 (phase 1), UNIT-009 | Immediate high-confidence quick wins |
| 2 | UNIT-010, UNIT-011, UNIT-012 | Critical user-flow performance (auth, publication, navigation) |
| 3 | UNIT-013, UNIT-014 | D1 / realtime / scale architecture |
| 4 | UNIT-008 (phase 2), UNIT-015, UNIT-016 | Build, CI, observability, cost controls |
| Deferred | UNIT-017 | Not justified yet (product-gated) |

## Source contradictions found while deepening

Recorded for the lead's attention; no source code was changed.

1. **PERF-CRON-003 vs PERF-D1-002.** The register lists PERF-CRON-003 as a
   separate ID but its body says "rolled into PERF-D1-002 above; separate ID
   for tracking." The prompt enumerated 17 IDs including PERF-CRON-003, but
   the register's own count is **16 actionable findings** (PERF-CRON-003 is a
   tracking alias). This pack unitizes PERF-CRON-003 as UNIT-009 (PERF-D1-002)
   per the register's "rolled into" note. No separate UNIT file is created
   for PERF-CRON-003 — it has no independent recommendation, surface, or
   verification beyond PERF-D1-002. The 17-unit count in the prompt appears
   to count the duplicate ID; the actionable count is 16 (matching
   `05-FINDINGS-REGISTER.md` Summary).

2. **`/improve` Plan 023 line drift.** The existing
   `2026-07-18-Codebase-Improve-Audit-Plan-Pack/023-batch-restore-row-reads.md`
   cites `rows.ts:3069-3073` for the per-row loop and `:3163-3167` for the
   correct batched branch. The current HEAD code (verified in UNIT-004) puts
   the per-row loop at `:3187-3191` and the fresh-restore re-read at
   `:3281-3285`. The mechanism is unchanged; only the line numbers drifted
   (~120 lines added above). Plan 023's drift-check instruction
   (`git diff --stat 0a2667db9..HEAD -- src/lib/estimates/d1-intents/rows.ts`)
   will catch this; executor should re-anchor on the current line numbers.

3. **Wave assignment for UNIT-007 / PERF-RT-001.** The finding's "Dependencies"
   field says "Hosted load test to validate threshold (BLOCKED without
   credentials)." The roadmap places it in Wave 1 (W1-6) with the dependency
   "W0 (hosted load test to tune threshold)". This is a soft contradiction:
   the static code change is Wave-1 low-risk, but the threshold *cannot be
   tuned* without the hosted gate. UNIT-007 reflects this by marking
   `external_lifecycle` `AUTH_BLOCKED` against the load-test gate while
   keeping `local_implementation` shippable with a conservative default.

4. **`external_lifecycle` for measurement-gated units.** Units where the
   finding's improvement magnitude is HYPOTHESIS until a hosted/build/browser
   gate opens (UNIT-002, UNIT-003, UNIT-008, UNIT-010, UNIT-011, UNIT-012,
   UNIT-013, UNIT-014) are marked `external_lifecycle: NOT_STARTED`, not
   `AUTH_BLOCKED`, where the static change itself does not require the gate.
   `AUTH_BLOCKED` is reserved for units where the change *cannot be safely
   completed* without the gate (UNIT-007 threshold tuning, UNIT-013/UNIT-014
   EXPLAIN-gated decisions). This matches the Plan-Pack Schema §8: terminal
   status is tracked separately from implementation; auxiliary gaps cannot
   manufacture or prevent implementation completion.

5. **Variants accommodation (memory-note verification).** The memory note
   "the variants should be accommodated as well" was checked against
   PERF-D1-001 (restore-replay batch). Verified: `estimate_row_items` stores
   variant data inline in `source_snapshot_json` / `metadata_json` JSON
   columns (no separate variant child table exists — `grep "CREATE TABLE
   .*variant" migrations/` returns only library/attachment tables). The
   batched `SELECT *` via `serializeRow` therefore captures full rows
   including all variant JSON transparently; the PERF-D1-001 fix needs no
   additional variant handling. Multi-variant propagation logic lives in
   `template-propagation-d1.ts` / `templates.ts` and is covered by UNIT-014
   (PERF-D1-004) plus the sibling pack's variant-deletion-fallback unit.
   UNIT-004 records this verification in its "Variants" subsection; UNIT-014
   records the variant-predicate preservation note in its own.
