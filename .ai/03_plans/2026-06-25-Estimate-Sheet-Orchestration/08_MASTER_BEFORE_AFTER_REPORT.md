---
title: Master Before After Report
type: docs
date: 2026-06-25
---

# Master Before/After Report

This is the reporting template for the future implementation pass. Fill the "After" columns only with verified evidence.

## Executive Summary

| Field | Before | After |
|---|---|---|
| Overall estimate workspace readiness | Three source plans identify overlapping launch risks; implementation not coordinated. | TBD after implementation. |
| Center grid integrity | Atomic move, project-source revision gate, and bulk delete are known gaps. | TBD with SQL/action/DOM evidence. |
| Right sidebar honesty | Component edit/delete/duplicate and template groups include persistence-honesty gaps. | TBD with persisted refresh evidence. |
| Tree sidebar reliability | Signature/race/authz/keyboard/delete/sort issues remain. | TBD with unit/action/DOM/browser evidence. |
| UX/a11y/responsive | Static design/UX risks identified; no runtime/screen-reader proof. | TBD with DOM/a11y/browser/manual evidence. |
| Telemetry/rollback | Multiple source plans call for telemetry/rollback; sink and owner unverified. | TBD with event/dashboard/rollback evidence. |

## Before Baseline

| Area | Before Evidence | Risk |
|---|---|---|
| Center move | `moveRowComponent` performs separate source/target replacement writes. | Partial persistence/data corruption. |
| Center project-source insert | Returned full tree applied directly. | Stale response can overwrite visible local edits. |
| Center bulk row delete | Selected rows loop over single delete path. | Partial delete and misleading recovery. |
| Tree signature | Signature includes row-item fields. | Row-only edits can clobber tree optimistic state. |
| Tree mutations | Explicit edit checks are incomplete in source-plan analysis. | Viewer mutation escalation risk. |
| Right CRUD | Local-only or persistence-dishonest edit/delete/duplicate flows. | User trust and refresh inconsistency. |
| Project-source labels | Live/read-through language in right-side source flow. | Misleading mental model. |
| Responsive sidebars | Shared panel width becomes zero below 1024px. | Essential tools can disappear without replacement. |
| Validation | Broad validation may be noisy; runtime proof absent. | False confidence if only local static checks are claimed. |

## After Evidence Template

| Requirement | Implementation PR/Commit | Tests/Proof | Result | Gaps |
|---|---|---|---|---|
| `ESO-DATA-01` atomic move | TBD | SQL/RPC, action, DOM | TBD | TBD |
| `ESO-DATA-02` bulk delete | TBD | SQL/RPC, DOM failure injection | TBD | TBD |
| `ESO-DATA-03` project-source revision gate | TBD | Deferred response DOM | TBD | TBD |
| `ESO-AUTHZ-01` permission matrix | TBD | viewer/cross-workspace/action/DOM | TBD | TBD |
| `ESO-RIGHT-01/02` right persisted CRUD | TBD | refresh/DB row proof | TBD | TBD |
| `ESO-TREE-01` structure signature | TBD | unit/integration | TBD | TBD |
| `ESO-A11Y-01/02` keyboard/semantics | TBD | DOM/axe/browser/manual | TBD | TBD |
| `ESO-OPS-01` rollout/telemetry | TBD | event dashboard/alert/rollback | TBD | TBD |

## Final Claim Template

Use this wording only after evidence exists:

```text
The estimate workspace implementation completed phases MOP-0 through MOP-__.
Verified evidence:
- Data/RPC:
- Center:
- Tree:
- Right sidebar:
- UX/a11y:
- Performance/ops:
- Broad validation:

Known gaps:
- 

Release decision:
- GO / WATCH / NO-GO
```
