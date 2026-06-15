---
title: Verification Lane Scores & Method
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: The 6 parallel verification lanes, their scores, and the raw finding index behind this audit.
---

# Verification Lane Scores & Method

## Method

Six parallel agents each took one angle and verified the **remediated** plan against ground
truth at `72628d46` (real migration SQL in `supabase/migrations/`, real source, the prior
archived audit, and `DESIGN.md`). Each was instructed to NOT trust the plan's self-reported
line numbers — every claim was re-checked. Findings were synthesized into docs `00`–`07`.

## Lane scores

| Lane | Scope | Score (1–100) | Headline finding |
|---|---|---:|---|
| A — DB / RPC / migration | update/insert/unlink/promotion RPC bodies, JSON merge, columns, permission helpers | **88** | Foundation verified sound; promotion under-specs (V4); sort_order concurrency (V5). NOTE: this lane's `contingencyPercentage`-dropped finding (V1) was **retracted** — it read a superseded migration; the live RPC persists contingency. |
| B — Blast radius / cross-app | every consumer of estimate_row_items fields/source/metadata/link_state | **84** | AI package-builder **write** path missed (V2); U1 read-path correction (V11) |
| C — UX / a11y / virtualization | row-table virtualizer, keyboard, focus, contrast, DESIGN.md | **71** | `content-visibility` breaks measureElement plan (V3); `#7F7F7F` AA failure survives (V9) |
| D — Coherence / traceability / absorption | prior-audit closure, doc 08 matrix, contradictions | **86** (coherence) / **91** (absorption) | line-140 contradiction (V8); orphaned QA rows (V10); express-id gap (V6) |
| E — Strategy / premise (adversarial) | no-new-table, day-0 scope, inline-vs-modal | **58** | Builds 80% of a catalog without the table; 9-unit bundle mislabeled day-0; inline assumption underlies both Criticals |
| F — Security / permissions / concurrency | RLS, promotion privilege boundary, realtime drafts, optimistic lock | **82** | draft-id broadcast claim factually wrong (V13); stale-revision UX net-new (V7); `is_workspace_editor` includes member (V4b) |

**Aggregate = 80.8/100** (range 58–91). Synthesized overall rating: **78**. Strategy (E) is the
outlier-low and the highest-leverage intervention point; absorption (D) is the outlier-high and
confirms the remediation was real.

## Finding ID → lane map

| ID | Severity | Lane(s) |
|---|---|---|
| ~~V1 contingencyPercentage dropped~~ | RETRACTED (false positive) | A |
| V2 AI package-builder write clobber | P1 | B |
| V3 content-visibility breaks measureElement | P1 | C |
| V4 promotion RPC under-specs (a–d) | P1 | A, F |
| V5 sort_order concurrency | P1 | A |
| V6 express stable-id collision | P1 | D |
| V7 stale-revision UX net-new | P1 | F |
| V8 doc 04 line 140 contradiction | P2 | D |
| V9 #7F7F7F AA failure | P2 | C |
| V10 orphaned QA rows | P2 | D |
| V11 U1 workspace-repo SELECT no-op | P2 | B |
| V12 applyEditableValuesToLibraryItem misdescription | P2 | B |
| V13 draft-id broadcast claim wrong | P2 | F |
| V14 telemetry/draft-abandon/static-gate | P2 | D |

## Confirmed-sound foundations (the plan's verified strengths — do not re-litigate)

- update RPC accepts the full express field set; JSON merge omit-preserve/send-replace
- insert RPC returns rowRevision + correlation-idempotent + classifies source-null
- all four permission helpers exist; column model needs no schema change
- promotion RPC genuinely feasible; collaboration subsystem + optimistic lock real
- prior audit's 5 criticals + 6 docs genuinely absorbed

Full evidence with `file:line` in docs `01`–`06`.
