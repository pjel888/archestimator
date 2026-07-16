# 02 — File Leases And Coordination

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->

**Human coordination:** PARKED  
**Peer pack:** Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack  
**Rule:** one writer per shared file; formal lease only under actual contention (now: yes).

## Unpark criteria (any one)

1. Founder lead records a quiet window for named paths in their LOOP_LEDGER, **or**
2. Fresh `git status --short` shows no concurrent edits on the target paths and Philip explicitly unparks this pack (or a narrow Task 1–2 lease), **or**
3. Work is strictly estimate-system presentation / `table.tsx` / `AdminDataTable.tsx` with status proving those files are idle (UNIT-001/002 already COMPLETE — no further expansion needed), **or**
4. UNIT-005 specifically: F1 lease released as of 2026-07-16 (F1 COMPLETE in Founder ledger). Shell density polish on `AdminShell.tsx` (layout/spacing only) is technically obtainable when Philip unparks.

Until then: **docs-only** for this pack; never revert Founder commits.

> **2026-07-16 status:** Founder Homebase F0–F8 COMPLETE; Founder agent in quiescent state. F4 (support), F9 (email), F10 (AI) deferred/provider-blocked. List table paths (AdminUsersTable, AdminAccountsList, AdminAuditTable) are idle from Founder perspective but human PARKED for this pack remains until Philip explicitly unparks.

## Founder-owned (do not touch while Founder agent active)

| Surface | Paths |
|---------|--------|
| Shell / nav / search | `AdminShell.tsx` (density-only: UNIT-005 unblocked; F1 complete) · `AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminCommandPalette.tsx`, `search-*.ts` (F1 complete — leave as-is unless UNIT-005 unparked) |
| Today / inbox | `src/app/admin/today/**`, `AdminActionInbox.tsx`, `action-inbox-*` |
| Releases / financials | `src/app/admin/releases/**`, `AdminReleaseCenter.tsx`, `src/app/admin/financials/**` |
| Customer domain | `user-actions.ts`, `users-repository.ts`, accounts repos/actions, notes, support |
| Migrations / schema | `migrations/00*.sql` for admin product tables |
| F3–F8 feature pages | Customer 360, ops, analytics expansions as Founder lands them (F0–F8 shipped; treat as Founder-owned product surface) |

## Shadcn-owned (safe when leased / narrow-unpark)

| Surface | Paths |
|---------|--------|
| Table primitive | `src/components/ui/table.tsx` (COMPLETE — do not expand) |
| Admin TanStack wrapper | `src/components/admin/AdminDataTable.tsx` (COMPLETE — do not expand) |
| Estimate System UI | `src/components/admin/estimate-system-map/**`, `src/lib/admin/estimate-system-map.ts` (views/types only; UNIT-002 COMPLETE) |
| List chrome (after lease) | `AdminUsersTable.tsx`, `AdminAccountsList.tsx`, `AdminAuditTable.tsx`, projects list page markup only |
| Shell density (after unpark) | `AdminShell.tsx` layout/spacing only |
| Closeout | typecheck/lint on owned files only |

**Never edit:** `estimate-system-map-data.ts`, `estimate-system-knowledge-data.ts` content.

## Preserve unfamiliar changes checklist

Before any unparked edit:

1. `git status --short --branch`
2. Re-read each target file immediately before patch
3. If unfamiliar diff present → stop; do not overwrite
4. Scope diff to lease; no drive-by formatting
5. `git diff --check` on owned paths after edits

## Ready slice while PARKED

Machine `ready_slices` advertise **UNIT-003** and **UNIT-005** as READY (with VERIFIED UNIT-001 dependency) when Philip unparks. Executors must still honor human PARKED: no product implementation until unpark. Machine `CONDITIONALLY_READY` / `PLAN_ONLY` + human PARKED tell the same story.
