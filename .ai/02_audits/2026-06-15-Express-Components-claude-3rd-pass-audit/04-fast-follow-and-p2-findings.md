---
title: Fast-Follow P1 & P2 Findings
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The promotion-gate contradiction (fast-follow P1) and all 14 P2 findings, with evidence and fixes.
---

# Fast-Follow P1 & P2 Findings

## SEC-N1 (= DB-N3 = CO-N4) — Promotion-gate predicate is self-contradictory · P1, fast-follow (U7)

Surfaced independently by the DB, security, and coherence lanes — strong signal.

**The contradiction:** doc 11:70 and doc 07:123 offer two **mutually exclusive** instructions:
"use a strict admin/editor predicate (reject plain members)" XOR "match the current library write
policy exactly."

**Ground truth:** the current library-write policy *is* `is_workspace_editor` for both
`cost_library_items` (`20260614144136:13-40`) and `library_folders` (`20260603235355:194-205`), and
`is_workspace_editor` returns true for role `member` (`20260613192344:29`, owner/admin/member). **No
stricter library-write predicate exists** (zero policies use `is_workspace_admin`). So "match the
policy exactly" resolves to the very function the same sentence forbids. An implementer cannot
satisfy both.

**Worse, the permission matrix is wrong about existing state:** doc 11:61 / doc 10:34 say "Estimate
editor, not workspace editor → Promote: No." But via the SECURITY DEFINER `create_cost_library_component`
RPC, whose only gate is bare membership (`validate_cost_library_component_refs:318-325`), even a
**viewer** can already create a library item today. The real cut line for library writes is
**member-vs-viewer**, not editor-vs-member.

**Fix:** pick one concrete gate and own the trade-off — (a) promotion uses
`is_workspace_editor(folder_workspace_id)` for parity with existing library writes (accept that a
"member" can promote, matching that a member can already create library items), OR (b) deliberately
tighten to `is_workspace_admin` and add a one-line rationale that promotion is intentionally stricter
than direct library creation. Remove the "use a stricter predicate" language. Fix the permission-matrix
rows to reflect member-vs-viewer. This is fast-follow (U7), so not a day-0 blocker — but resolve it
before promotion coding, and it is also a doc-coherence fix worth landing now since it spans 5 docs
(doc 07:123, doc 11:61-70, doc 04:127/R14, doc 06 RSK12, doc 05 Q28/Q46).

---

## P2 findings

### DB-N2 — `replace` RPC wholesale-overwrite undocumented in JSON Semantics · doc 07 + doc 10
`replace_estimate_row_item_with_history` (`20260524050746:653,667`) **always** sets
`source_snapshot = payload->'sourceSnapshot'` (NULL when omitted) and `metadata = coalesce(payload->'metadata','{}')`
— unlike the update RPC's omit-preserve. doc 07 JSON Semantics (`:57-68`) documents only the update
RPC. **Fix:** add a JSON-semantics note that the `replace` RPC always replaces both blobs (and NULLs
source_snapshot on omit); any replace touching an express row must carry/merge `expressComponent` or
be blocked. (Same root as BR-N1; converge the mitigation.)

### BR-N3 — AI read-tools row read not enumerated · doc 04 U8
`read-tools.ts:719` selects `estimate_row_items` without metadata; U8 lists `read-context.ts` +
`apply.ts` but not this read surface. Lower severity (it surfaces raw material text, doesn't mislabel)
but an empty-material express row appears empty to AI search/tree reads. **Fix:** add `read-tools.ts`
to U8 read blast radius; decide whether express rows expose a placeholder label to the AI.

### UX-N1 — Reused Project-specific badge fails the V9 AA floor · doc 09 + doc 03 + Q25
doc 09:80 / doc 03:81 reuse the existing "Project-specific" badge, rendered `text-tertiary` (`#7F7F7F`,
~3.5:1, **fails AA**) at `cells.tsx:277` — but doc 09:129 mandates AA for "badges." Self-contradiction.
**Fix:** note that the existing Project-specific badge and any new Express/Project badge are
load-bearing state text and must be floored at `#5D5D5D`; retone `cells.tsx:277`; add the badge to Q25.

### UX-N2 — Two concurrent express drafts undefined for virtualization-disable · doc 09 + doc 10
The disable is gated on "exactly one express editor" (doc 03:103, doc 09:11), but doc 10 (Insert
failure, Draft abandon) + async insert allow two unsaved editors; `pendingFocusRowId` is a single
string (`EstimateSheetContent.tsx:1707`). **Fix:** disable while ≥1 editor is active (not "exactly
one") and define focus target = most-recent draft, OR constrain UX to one in-flight draft per node.
Add a doc-10 edge case.

### CO-N2 — Q35/Q40 unmapped in doc 08 Unit→Q half · doc 08
V10 fixed only the R→Q direction; Q35 and Q40 appear in no Unit Coverage row (they do map to R8).
**Fix:** add Q35 → U8 (or U4), Q40 → U4 (and/or U8).

### CO-N3 — R↔AE / R↔RSK cross-table asymmetry · doc 08
R2 lists AE2/AE12 but neither reciprocates; R6 lists AE10 but AE10 lists R3/R13/R14; R11 lists RSK12
but RSK12 lists R6/R14. The "bidirectional" claim (INDEX:29) is undercut. **Fix:** reciprocate the
links or drop the over-claims so the AE/RSK tables are exact inverses.

### CO-N5 — `category` (string) vs `categoryNodeId` (FK) conflation · doc 02
doc 02:59-61 contrasts express `categoryNodeId=null` against legacy `category="Unassigned"`, but these
are **different fields** (`EstimateSheetContent.tsx:235` sets the string label; `category_node_id` is
a separate FK). **Fix:** clarify they are distinct fields in doc 02/07.

### SEC-N3 — V13 suppression seam unspecified · doc 11 + U9
doc 11:13 requires suppressing draft cursor anchors, but the broadcast source
(`EstimateSheetContent.tsx:818-840`) reads `data-estimate-row-id` from the DOM with no draft signal,
and every row renders that attr identically (`row-table.tsx:191`). **Fix:** specify the seam — render
`data-row-persisted="false"` (or omit the attr) for unpersisted drafts and gate `handlePointerMove`
on it; add a U9 test asserting `rowId=null` is broadcast while the row is a local draft.

### SEC-N4 — Promotion idempotency key has no schema home · doc 07
doc 07:124,149 require correlation-id retry to return the prior item, but `cost_library_items` has no
correlation column and the id spans both estimate and library sides. **Fix:** persist
`promotion_correlation_id` on the created `cost_library_items` row (column or metadata path) with a
unique index per workspace; have the RPC SELECT for an existing item by `(workspace_id,
promotion_correlation_id)` under the source-row lock before insert; add a unique-violation fallback.
(Fast-follow with U7.)

### STRAT-N2 — Spike has no owner / no evidence artifact · doc 00
Asymmetry vs U5's `evidence/u5-duplicate-instance-repro-note.md`. **Fix:** name a decision owner
(product) in doc 00 and require `evidence/inline-vs-modal-spike-result.md` before U4 coding.

### STRAT-N4 — Net-new stale-revision UX kept inside "narrow" day-0 · doc 00
V7 is entirely net-new; keeping it in day-0 is defensible but the "narrow MVP" framing slightly
oversells risk reduction. **Fix:** either acknowledge in doc 00 that day-0 includes net-new
conflict-recovery effort (sizing honesty), or defer realtime-conflict recovery to fast-follow and
ship day-0 with last-write-wins + reload-on-conflict.

### OB-N1 — Observability defers to a non-existent analytics sink · doc 12
doc 12:77 "existing client/server logging or analytics surface" — the repo has
`realtime-telemetry.ts` (registrable sink, no prod wiring) and page-view analytics, but **no
product-event surface** for `express_insert_attempt`-style events. **Fix:** pin the sink — mirror
the `realtime-telemetry.ts` `setSink/report` pattern in a new express-telemetry module, OR state
beta uses structured logs with a named prefix and which file owns the call sites.

### DM-N2 — Read path loads neither `tags` nor `metadata`; `item.tags` ≠ `metadata.tags` · doc 04 U1 + doc 07
`ESTIMATE_ROW_ITEM_SELECT` (`estimate-repository.ts:45`) omits both; `isBlankEstimateRowItem`'s
tag branch is dead today; doc 04:74 mandates adding metadata but not `tags`, and `metadata.tags`
(DB) ≠ `item.tags` (app). **Fix:** document that the express helper must read `metadata.tags` from
the newly-SELECTed metadata blob (not `item.tags`), and that `toEstimateRowItem` must map metadata
(optionally surfacing `metadata.tags` into `item.tags`) so blank + express share one source. Add a
round-trip test.

### PERF-N2 — Worst-case non-virtual mount on long estimates unmodeled · doc 09 + doc 00
Disabling virtualization mounts all N rows the moment an editor opens (`row-table.tsx:568`); a
500-row estimate mounts 500 rows. The spike (doc 00:33) only tests 75. **Fix:** specify the
upper-bound behavior — cap the non-virtual fallback to a windowed render around the active editor,
or state the accepted mount cost and add a higher-row-count spike (300–500).
