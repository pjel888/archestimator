# 01 — Pack (requirements, decisions, evidence)

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->

Machine IDs live in `plan-pack.json`. This file is the human-readable statement of those records.

## Evidence baseline (2026-07-16)

| Fact | Source |
|------|--------|
| Founder Homebase COMPLETE: F0–F8 (defects, shell/search, action inbox, notes, releases, data quality, project 360, financials); HEAD 100ede9c5; F4/F9/F10 deferred | Founder `LOOP_LEDGER.md` |
| Admin routes include `/admin/releases`, `/admin/today`, `/admin/financials`, `/admin/projects/[id]`, data quality | `src/app/admin/**` |
| `table.tsx` COMPLETE: 8 primitives, hairline/rounded-xs/10px, sticky header — no Lucide/CVA | `src/components/ui/table.tsx` source |
| `AdminDataTable.tsx` COMPLETE: TanStack sort + virtualizer ≥75, Phosphor carets, aria-sort, globalFilter, onRowClick | `src/components/admin/AdminDataTable.tsx` source |
| Estimate System IA COMPLETE: 4 views (Overview/Browse/Journeys/Knowledge), KnowledgeStatusBadge wired, Knowledge dynamic-imported | `EstimateSystemMap.tsx` + `EstimateSystemKnowledgeGraph.tsx` source |
| AdminUsersTable, AdminAccountsList, AdminAuditTable, AdminProjectsTable: AdminDataTable + SearchInput migrated | `src/components/admin/` source |
| F1 lease (shell/search/nav) released: AdminShell/Sidebar/Header F1-complete; UNIT-005 density now technically unblocked | Founder `LOOP_LEDGER.md` F1 entry |
| `components.json` new-york + RSC; TanStack in workshop | `components.json`, `ProjectEstimatesTable.tsx` |
| Layout gates session + platform admin + feature flag | `src/app/admin/layout.tsx` |

## Requirements (CORE)

| ID | Statement | Units | Test |
|----|-----------|-------|------|
| REQ-001 | Add Archestimator-token `Table` primitive (shadcn-adapted) | UNIT-001 | NOT_REQUIRED |
| REQ-002 | Shared `AdminDataTable` on TanStack (sort; virtualize ≥75) | UNIT-001 | NOT_REQUIRED |
| REQ-003 | Migrate Users → Accounts → Audit → Projects list chrome | UNIT-003 | NOT_REQUIRED |
| REQ-004 | Reorganize Estimate System to Overview/Browse/Journeys/Knowledge without data loss | UNIT-002 | TEST_TASK PASS (static reachability; browser skipped localhost down) |
| REQ-005 | Keep `KnowledgeStatusBadge` defined and wired | UNIT-002 | NOT_REQUIRED |
| REQ-006 | Preserve admin authz on layout/actions/APIs; no PII in audit UI | UNIT-003, UNIT-006 | NOT_REQUIRED |
| REQ-007 | Perf: dynamic-import heavy estimate-system Knowledge island | UNIT-002 | NOT_REQUIRED |
| REQ-008 | Shell density polish (F1 lease released; human PARKED until unpark) | UNIT-005 | NOT_REQUIRED |

**AUXILIARY:** REQ-009 Members/Workspaces TanStack after Accounts lease (UNIT-004).

## Decisions (DEC-AUTO-*)

| ID | Decision |
|----|----------|
| DEC-AUTO-001 | Adapt shadcn into `src/components/ui`; `shadcn-*` only on name collisions |
| DEC-AUTO-002 | Prefer existing Button/Card/Sheet/SearchInput/DropdownSelect over stock re-adds |
| DEC-AUTO-003 | Estimate System changes presentation only; never edit `estimate-system-*-data.ts` content |
| DEC-AUTO-004 | Top modes Overview/Browse/Journeys/Knowledge (not five equal Product/Features/Pages/UX/Knowledge tabs) |
| DEC-AUTO-005 | Tests default NOT_REQUIRED; TEST_PROPOSAL for estimate-system walk only |
| DEC-AUTO-006 | Machine status uses CONDITIONALLY_READY + PLAN_ONLY; human coordination label is PARKED |
| DEC-AUTO-007 | Subordinate to Founder Homebase on shell, customers, releases, migrations |

## Risks

| ID | Risk | Mitigation |
|----|------|------------|
| RISK-001 | Concurrent Founder edits on Users/Accounts/Shell | MITIGATED — Founder F0–F8 complete; list/shell migrations landed under unpark; no open lease conflict |
| RISK-002 | Estimate-system IA rewrite drops fields | UNIT-002 verified COMPLETE; data files untouchable |
| RISK-003 | Stock shadcn pulls Lucide/CVA | Token adapt; Phosphor only; UNIT-001 COMPLETE with zero Lucide/CVA |

## Unit DAG (summary)

```
UNIT-001 (VERIFIED) → UNIT-003 (VERIFIED) → UNIT-004 (VERIFIED)
UNIT-001 → UNIT-002 (VERIFIED)
UNIT-003 + UNIT-002 + UNIT-005 → UNIT-006 (VERIFIED closeout)
UNIT-005 (VERIFIED)
```

All units VERIFIED. Terminal: ACHIEVED.

## Remaining implementation surface

None. UNIT-001…UNIT-006 VERIFIED; pack terminal ACHIEVED (2026-07-16).

## Security / network / perf checklist (per unit on unpark)

- Keep `requireAdminContext` / `writeAdminAuditEvent` on mutations
- Server Components fetch; client only for interaction
- No new client fetches of privileged lists without existing action gates
- Dynamic import D3 knowledge graph
- Audit UI continues to omit `summary_json`
