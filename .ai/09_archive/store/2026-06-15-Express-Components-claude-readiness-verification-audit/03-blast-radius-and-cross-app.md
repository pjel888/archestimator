---
title: Blast Radius & Cross-App Impact
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Verified complete blast radius for Express Components — every downstream surface that reads or writes estimate_row_items fields/source/metadata/link_state, what the plan covers, and the one surface it misses.
---

# Blast Radius & Cross-App Impact

Verified against the real call graph at `72628d46`. **Blast-radius completeness: 84/100** (up
from the prior audit's 58). The remediation correctly pulled in clear/move/apply, charts,
publication, export, AI read-context, dashboard, and the project-source rekey. One real
mutation surface is still missing.

## 1. Surface-by-surface verification

| Surface | In plan? | Real behavior (file:line) | Express impact | Severity |
|---|---|---|---|---|
| Live estimate read SELECT | yes (U1) | `estimate-repository.ts:45` omits `metadata` | **Express identity never loads on the primary read path** unless added | **CRITICAL — the load-bearing U1 edit** |
| Domain mapper | yes (U1) | `estimate-repository.ts:71-92` maps no metadata | must add `expressComponent` | HIGH |
| Domain type | yes (U1) | `estimate-tree.ts:25-44` no metadata field | must add | HIGH |
| UI type | yes (U1) | `estimates/types.ts:81-136` no metadata/expressComponent | must add | HIGH |
| workspace-repository mapper | yes (U1) | `workspace-repository.ts:1541` **already SELECTs metadata**; `:1637-1648` reads only tags/laborUnitCost/scopeStatus | **U1's "add to SELECT" here is a no-op** (V11) | LOW |
| `isBlankEstimateRowItem` classifier | yes (U1) | `activity-history.tsx:120-134` | empty-name express row could match `isPersistedPlaceholder` (`:122-127`) → express helper must win; cite this predicate | HIGH |
| Blank-slot renderer | yes | `cells.tsx:179` gates on `isBlankEstimateRowItem` | misclassified express renders as blank slot | HIGH |
| `clearRowComponent` | yes (U8/Q35) | `EstimateSheetContent.tsx:2064-2066` → replace with blank template | clearing express reverts to blank, losing metadata silently | MEDIUM |
| `moveRowComponent` | yes (U8/Q35) | `:2093-2097` replace target + clear source | move = replace+clear; identity survives via spread | MEDIUM |
| `applyEditableValuesToLibraryItem` | yes (U8/Q35) | `:398-416` carries only qty/contingency/misc | doc 10 invariant misdescribes it (V12) | LOW |
| Proposal export | yes (U8) | `build-proposal-export-model.ts:130,144` | express defaults → Uncategorized (intended) | LOW |
| Publication snapshot image | yes (U8) | `snapshot.ts:26-27,82` reads `source_snapshot.imageUrl` | works if express image in source_snapshot | LOW |
| Charts cost-mix | yes (U8) | `project-charts-repository.ts:176,192` | row-field driven; OK | LOW |
| Dashboard | yes (U8) | `project-dashboard-repository.ts:149,164` | row fields + source_snapshot; OK | LOW |
| AI read-context | yes (U8) | `read-context.ts:484` | needs express not summarized as blank (covered by reclassification) | LOW |
| Project-source reuse rekey | yes (U8) | server-side `gen_random_uuid()` `20260613134852_insert_estimate_subtree_rpc.sql:189-195` | row ids rekeyed; **but express stable-id is NOT** (V6) | LOW→see V6 |
| **AI package-builder WRITE path** | **NO** | `ai/package-builder/apply.ts:469-590, :852, :1272` inserts/replaces rows, writes full `metadata` | **clobbers `metadata.expressComponent`** on replace | **MEDIUM (V2)** |

## 2. The surface the plan misses — AI package-builder writes (V2)

U8 enumerates the AI *read*-context but never the AI **write** path. `apply.ts` is a real
`estimate_row_items` mutator that builds row-replacement payloads with a wholesale `metadata`
object (`buildRowReplacementPayload:590`). This is the **same KTD7 JSON-replace hazard** the plan
warns about for routine edits — but on a surface no unit owns. If an AI package apply replaces an
express row (it selects rows by material/identity), `expressComponent` is destroyed.

**Action:** add `apply.ts` to U8's blast radius; add a doc-10 edge case ("AI replacement
targeting an express row must server-merge `metadata` or skip express rows"); add a QA row.

## 3. Surfaces the plan correctly does NOT touch (don't invent work)

- **No standalone CSV/PDF export, no estimate duplication/templating UI, no comparison/diff
  view** exists today (only `proposal.xlsx`). The plan's silence here is *correct*. Don't add
  phantom blast radius for surfaces that don't exist.

## 4. Correction to U1's edit list (V11)

U1 should be re-pointed:
- **Load-bearing edit:** `estimate-repository.ts` `ESTIMATE_ROW_ITEM_SELECT:45` + mapper `:71-92`
  + domain type `estimate-tree.ts:25` + UI type `estimates/types.ts:81` — these genuinely lack
  metadata.
- **Reduce to a read-only change:** `workspace-repository.ts` already SELECTs metadata; only the
  `mapWorkspaceRow` read of `expressComponent` (~`:1637`) is new.
- **Add the concrete predicate to defeat:** `isPersistedPlaceholder` (`activity-history.tsx:122-127`)
  matches empty-name / zero-cost / project-source rows — exactly the shape a fresh express row
  has. The express helper must short-circuit it.

## 5. Working-tree diff assessment (branch.tsx / expansion.ts)

The uncommitted changes flip every node to `hasCollapsibleBody = true` (`branch.tsx:158`) and add
a collapsed `border-b`. This is **benign and mildly helpful** for express rows (empty areas that
host Add-row are now always expandable) and **does not touch** virtualization measurement or
express editor focus. No plan impact; no action.
