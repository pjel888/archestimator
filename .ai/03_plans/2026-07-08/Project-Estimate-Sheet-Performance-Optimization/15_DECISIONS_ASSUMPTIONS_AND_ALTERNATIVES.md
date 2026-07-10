# 15 - Decisions, Assumptions, And Alternatives

The stable decision records are `DEC-AUTO-*`. No ordinary product or architecture choice remains owner-gated. `IMPLEMENTATION_PLAN.md` contains the canonical affected-unit mapping.

## Active Decisions

### DEC-AUTO-001 - Measure Before Optimizing

Decision: build deterministic fixtures and collect browser/D1/route/DOM evidence before any route, index, graph, derived-state, render, or mutation optimization.

Rejected: refactor `EstimateSheetContent` immediately. Reason: it may improve code shape without addressing the measured bottleneck.

### DEC-AUTO-002 - Loaded-Entity Search For MVP

Decision: search, facets, group, and sort operate on loaded entities and explicitly expose incomplete/truncated state.

Reopen trigger: first-user evidence or a failed requirement proves global server search is necessary.

### DEC-AUTO-003 - Semantic Move Placement

Decision: large-area moves offer top, bottom, before/after a visible row, or before/after a searched target. They do not render a 5,000-option picker.

Rejected: an arbitrary-position dropdown. Reason: it is unusable and inaccessible at the supported ceiling.

### DEC-AUTO-004 - Supported Scale Ceiling

Decision: 1,500 nodes / 5,000 loaded rows is the MVP ceiling. Larger payloads are server-windowed or truncated rather than silently loaded.

Reopen trigger: sanitized telemetry shows first-user estimates exceed the ceiling.

### DEC-AUTO-005 - Complete Proposal Materialization

Decision: proposal preview/export reads a complete server snapshot outside the interactive edit cache and records its own cost.

Rejected: export from the possibly truncated client cache. Reason: it can silently omit data.

### DEC-AUTO-006 - Preserve Component Edit Boundaries

Decision: library-master editing stays in the library drawer/workspace; estimate-row editing updates a projection. No new master-edit entry point is added to the sheet for MVP.

### DEC-AUTO-007 - Preserve Promote/Detach Flow

Decision: no new convert/link control is added. Current promote and detach flows remain authoritative.

### DEC-AUTO-008 - Tablet Edit, Mobile View

Decision: layouts >=1024 px remain editable. Smaller mobile layouts are view-only with explicit truncation/read-only state.

Reopen trigger: measured first-user demand justifies a mobile authoring interaction design.

### DEC-AUTO-009 - Graph Is Evidence-Activated

Decision: a normalized graph is a ready optimization branch, not an unconditional rewrite. `UNIT-004` activates it only when `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`. The three graph operands are durable `UNIT-001` jsdom outputs with the exact limit-fixture sampling, <=5 ms lookup thresholds, and zero duplicate-byte threshold defined in `IMPLEMENTATION_PLAN.md` and doc 20; missing or unclassifiable values fail closed. Otherwise the unit writes a supersession receipt.

Rejected: broad memoization as the only scale strategy. Reason: it does not remove full-tree derivation or snapshot costs.

### DEC-AUTO-010 - State Ownership

Decision: TanStack Query remains the transport/freshness cache. If activated, Zustand owns the interactive normalized graph and entity-level selectors.

Rejected: high-frequency cell edits directly in query cache. Reason: invalidation and rollback remain too coarse.

### DEC-AUTO-011 - No New Dependency

Decision: use the installed Next, React, TanStack Query/Virtual, Zustand, Vitest, Playwright, and Cloudflare/D1 tools. The existing bundle analyzer in `next.config.ts` is sufficient.

### DEC-AUTO-012 - Proven D1 Changes Only

Decision: active D1 migrations under `migrations/` are allowed only when `UNIT-003` captures the exact query plan and the candidate index improves the measured shape.

Rejected: speculative composite indexes and any new `supabase/migrations/` change.

### DEC-AUTO-013 - One Fan-Out Index Name

Decision: the normalized graph field is `componentInstanceRowIdsByIdentity` because it maps component identity to row IDs.

### DEC-AUTO-014 - Deployment-Scoped Rollback Modes

Decision: route, graph, incremental derivation, render boundary, and entity-patch paths use versioned server-resolved `off|shadow|on` deployment modes passed through route props. Each active unit proves explicit `off,shadow,on,rollback` phases, including an old client and in-flight read/write during restart. No `NEXT_PUBLIC_*` value is presented as a live per-estimate kill switch.

Rejected: enable one estimate and toggle off without a build/deploy. Reason: public environment values are inlined and frozen by Next.js.

### DEC-AUTO-015 - Exact-ID Hosted Cleanup

Decision: each hosted proof run uses a no-deploy Wrangler remote-D1 script, generates a UUID plus exact keys for the synthetic profile/membership/estimate hierarchy, deletes those keys in dependency order, and reconciles all eleven tables independently.

Rejected: date-static metadata-prefix cleanup. Reason: same-day collisions and heterogeneous `metadata`/`metadata_json` columns make it unsafe.

## Validated Assumptions

- Cloudflare D1 is the active provider and active migrations live in `migrations/`.
- The protected estimate route must retain current fail-closed D1 access checks.
- Current load limits are 1,500 nodes and 5,000 rows.
- The installed stack already contains the required test, browser, virtualizer, state, and bundle-analysis tools.
- Historical June route/provider artifacts are stale for current pass/fail claims.

## Active Measurement Hypotheses

These are not decisions or owner gates. Each is resolved by `UNIT-002`/`UNIT-003` and the deterministic `UNIT-004` decision receipt:

- Route/D1 reads may dominate cold and warm navigation.
- Full-tree edit derivation may dominate at the supported ceiling.
- Virtualization may bound DOM while leaving derivation and comparator scans unbounded.
- Client and server project-component fan-out may exceed the edit budget.

An unproven hypothesis cannot authorize source changes; a failed budget can.
