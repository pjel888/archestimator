# 00 — Executive Direction

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->

**Pack:** Admin Shadcn UI Migration · **Date:** 2026-07-16  
**Machine status:** `CONDITIONALLY_READY` / `PLAN_ONLY` / `ACTIVE`  
**Progress:** UNIT-001 (Table primitives) VERIFIED · UNIT-002 (Estimate System IA) VERIFIED · UNIT-003/005 READY pending human unpark · UNIT-006 pending  
**Human coordination:** **PARKED** (yield to Founder Homebase on shared `/admin` files; Founder F0–F8 complete / quiescent)  
**Canonical entrypoint:** `03-IMPLEMENTATION-TASKS.md` · **Manifest:** `plan-pack.json`

---

## 1. Outcome

Migrate `/admin` UX/UI to Archestimator-adapted shadcn primitives plus TanStack Table, reorganize `/admin/estimate-system` information architecture without losing documentation data, and harden performance, network, and security only on files this pack owns when surfaces are touched.

Founders and platform admins get denser, consistent admin chrome: shared table pattern, predictable filters/actions, clearer estimate-system hierarchy, and no authz regression.

## 2. Scope

- Shared UI: `src/components/ui/table.tsx` (shadcn-adapted) and `src/components/admin/AdminDataTable.tsx` (TanStack)
- Admin list chrome (after Founder lease): Users, Accounts, Audit, Projects, Members, Workspaces
- Estimate System guide presentation only (`estimate-system-map/*`, view constants) — not data modules
- Co-located perf (dynamic-import heavy graphs), network (server-first data), security (preserve layout gates + `requireAdminContext` + audit redaction)

## 3. Non-goals

- Do not replace the workshop design system wholesale
- Do not delete estimate-system documentation content, inventory IDs, sources, or integrity assertions
- Do not invent billing, CRM, or dashboard-builder abstractions
- Do not mutate D1 schemas for this UI pack
- Do not run automated tests/browser/builds as gates without explicit `TEST_TASK`
- Do not clobber concurrent Founder Homebase edits; do not reopen F0–F8 product/ops semantics
- Do not implement while human coordination is PARKED

## 4. Authority

1. Current user intent (this pack, PARKED plan-only improvement)
2. Current source + `DESIGN.md` / product register (SF Pro, ≤12px, `rounded-xs`, Phosphor)
3. Founder Homebase pack for product/ops semantics and shared admin files
4. Planning suite (`suite_version` 2026-07-12) for pack shape and validation
5. shadcn CLI as a source of primitives to **adapt**, not visual law

## 5. Design contract

- Restrained neutral admin density; no marketing hero metrics or decorative glass
- Adapt shadcn New York into existing tokens; Phosphor; no Lucide/CVA unless unavoidable
- Reuse Button/Card/SearchInput/Sheet/Badge; `shadcn-*` only on name collisions
- TanStack density modeled on workshop `ProjectEstimatesTable` (sort; virtualize ≥75)
- Motion ≤150–250ms for state only

## 6. Acceptance (pack planning)

- AC-PACK-01: Core REQ-001..REQ-008 map to units with dependencies, owned paths, evidence, and test decisions
- AC-PACK-02: Unit DAG is acyclic; exact `next_unit` named while ACTIVE with ready work
- AC-PACK-03: File leases document Founder vs Shadcn ownership and unpark criteria
- AC-PACK-04: `bun run validate:plan-pack -- <folder>` passes; no orphan IDs

## 7. Stop condition

Planning stops when AC-PACK-01..04 hold. Implementation stops per unit acceptance in `03-IMPLEMENTATION-TASKS.md` after unpark. Terminal `ACHIEVED` only after every core requirement has fresh evidence.
