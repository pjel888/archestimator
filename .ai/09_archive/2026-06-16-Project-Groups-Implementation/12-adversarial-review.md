# Project Groups — Adversarial Review Record

**Plan pack:** `2026-06-16-Project-Groups-Implementation`
**Date:** 2026-06-16
**Reviewed:** `00-synthesis-and-decisions.md`, `07-implementation-plan-overview-and-contracts.md`, `08`–`11` (the four build-phase TDD plans). Lane docs `01`–`06` were context.
**Method:** 6 specialized reviewers ran in parallel against the full plan pack, each returning a structured verdict + findings. The blocker and all six high-severity findings were **integrated into the plan files** (`07`/`08`/`09`/`11`) before this record was written; each fix below was re-verified against the actual plan text. The medium/low findings are recorded here with dispositions; the actionable ones were consolidated in §4 and, during the 2026-06-16 improvement campaign, **integrated into the phase plans** (see §4 and the Round-2 record in §6).

> **Provenance note.** The finalizer agent that integrated the high-severity fixes over-ran on careful edits to the large plan files. The orchestrator stopped it after confirming all blocker/high fixes were applied and saved, then authored this record and the README directly from the reviewers' structured outputs. No high-severity fix was lost.

---

## 1. Verdicts

| Reviewer (lens) | Verdict | Findings (B/H/M/L) |
|---|---|---|
| Feasibility | ship-with-fixes | 0 / 1 / 1 / 2 |
| Data-integrity (migration/RLS/cascade) | ship-with-fixes | 0 / 1 / 3 / 4 |
| Adversarial (premise/assumption) | ship-with-fixes | 0 / 1 / 3 / 3 |
| Scope-guardian | ship-with-fixes | 0 / 1 / 3 / 1 |
| Security-lens | ship-with-fixes | 0 / 1 / 3 / 1 |
| User-flow & edge-case completeness | ship-with-fixes | 1 / 0 / 2 / 3 |
| **Totals** | **unanimous ship-with-fixes** | **1 / 6 / 15 / 14 = 35** |

**Bottom line:** No reviewer asked for rework. The architecture is sound; the findings are integration-level. The blocker and all six highs are resolved in the plan. The remaining items are polish/correctness nits documented below.

---

## 2. Blocker + High findings — ALL FIXED (verified in plan text)

| # | Sev | Lens | Issue (condensed) | Fix applied — verified location |
|---|---|---|---|---|
| F1 | 🔴 Blocker | flow | The live page also groups by **Client** (not only dates). The plan's `defaultOrganizeByForSortField` returned `none` for a `client_name` sort, so the grouping gate never fired → the live `projects-page-sort-controls` client-flags test would fail, contradicting the byte-identical promise. | ✅ `11` Step 4.1: `defaultOrganizeByForSortField(field) = isDateSortField(field) \|\| field === "client_name" ? "date" : "none"`. Client sort now groups; gate `organizeBy === "date" && (isDateSortField(sortField) \|\| sortField === "client_name")` fires. |
| F2 | 🟠 High | feasibility | `ProjectGroupSection` rendered the label inside a `<span>` unconditionally, so `getByText(label).toHaveClass("bg-surfaceMuted",…)` in the sort-controls suite would resolve to the span (no classes) and fail — breaking date-mode byte-identity. | ✅ `11` Task 3: label text renders directly on the header element in date/client mode; the truncating `<span>` wrapper is gated on `isGroupMode`. `legacyHeaderDataAttr="data-project-date-group-label"` preserved. |
| F3 | 🟠 High | adversarial | New failure-path tests assert toast copy, but `ToastProvider` is mounted only in `app/providers.tsx`; bare-rendered `ProjectsPageClient` gets `noopToastContext` → toast renders nothing → assertions fail. | ✅ `11` Task 4/6: a `renderClient()` helper wraps the component in a real `<ToastProvider>`; all toast-asserting cases use it. Production path confirmed (route renders under `app/providers.tsx`). |
| F4 | 🟠 High | scope | Header-menu prose mentioned "Remove all from group" but the code stub shipped two items and there is no backing server action. | ✅ `11` Step 5.6: explicitly **two items only** (Manage groups + Delete group); rationale added (removal goes via `moveProjectToGroup({groupId:null})` / `bulkAssignProjectsToGroup({groupId:null})`). |
| F5 | 🟠 High | security | `moveProjectToGroup`/`bulkAssign` verified workspace **membership**, not ownership. RLS on `projects` permits reading shared/collaborator rows, so a collaborator could file someone else's project into their own private group — contradicting D9/D11 "owned only." | ✅ `09` Task 6/7 (per LD-2): the gate verifies the project is in the user's workspace **and** owned under the **same `owned` predicate the repository uses** to populate "Your Projects" — `workspace_id === workspace.id && (Boolean(workspaceRole) \|\| created_by === profile.id)` (`workspace-repository.ts` ~L236) — NOT a bare `.eq("created_by", profile.id)`. `created_by` is **nullable** (`ON DELETE SET NULL`), so the gate handles `created_by IS NULL` and admits owned-via-workspace-role projects. Negative test "rejects a project the user can READ but does not OWN" plus positive tests for (a) an owned-via-workspace-role project and (b) an owned project with `created_by IS NULL` — both assignable. (The prior "verify is `…eq("created_by", profile.id)`, matches the client owned gate" claim was false and is removed; the bare-`created_by` gate was stricter than the repo's `owned` derivation and broke on the nullable column.) |
| F6 | 🟠 High | data-integrity | Group/membership `workspace_id` was stamped from `ensureDefaultWorkspace()`, but a user can own projects in non-default workspaces; the composite FK `(project_id, workspace_id)` would then reject the upsert (silent "not found"). | ✅ `09`: membership `workspace_id` is stamped from the **verified `project.workspace_id`**, not the default workspace, so the composite FK is satisfiable in any workspace. |

---

## 3. Medium / Low findings — dispositions

Legend: **FIXED** (resolved by a high-severity fix above) · **FIX@IMPL → INTEGRATED** (was "do at implementation start"; during the 2026-06-16 campaign it was integrated into the phase plans — see §4 for the per-item pointer) · **RESOLVED** (mechanism corrected / gate realized during the campaign) · **NOTE** (documented caution/clarification, no change required) · **DEFER** (out of v1 / covered by rebase discipline).

### Data-integrity
- **M — RLS isolation proof doesn't actually `SET ROLE authenticated`** (`08` Task 2 Step 6): `set_config('role',…)` is not role-switching, so the cross-user RLS proof may run as a privileged role and prove nothing. → **FIX@IMPL → INTEGRATED** (real RLS-enforcing role + sanity-control abort gate + transactional rollback; runbook in `15`, referenced from `08` — §4 / LD-9).
- **M — Soft-cap is non-atomic; `accent_id` has no DB backstop** (`08`/`09`): two concurrent `createProjectGroup` calls can both pass a count check and exceed 50. → **NOTE** (soft cap by design; exceeding by 1 is benign) + **FIX@IMPL → INTEGRATED** (`accent_id` validated against the allowlist in the action; optional partial unique/exclusion if a hard cap is ever needed — §4 / LD-8).
- **M — D9 gate "readable in workspace" not "owned"** (`09`): → **FIXED** (same as F5; the action gate now applies the repository's `owned` predicate — workspace-role membership **OR** `created_by = profile.id`, handling nullable `created_by` — per LD-2).
- **L — Unindexed-FK advisor risk on `user_id`** (`08`): composite index leads with `workspace_id`. → **FIX@IMPL → INTEGRATED** (`user_id`-leading index added if `get_advisors` flags it — §4 / LD-8).
- **L — `project_groups.workspace_id` lacks `references workspaces(id)`** unlike `projects` (`08`): → **FIX@IMPL → INTEGRATED** (`references public.workspaces(id) on delete cascade` added to **both** new tables — §4 / LD-7).
- **L — Phase-1 RLS test seeds COMMITTED rows into the LIVE project** (`08` Task 2 Step 6): cross-session leakage + prod pollution risk. → **FIX@IMPL → INTEGRATED** (fixtures wrapped in a transaction with rollback / disposable namespaced rows with guaranteed cleanup so nothing commits to `ebxxqidacheyapmmzavr` — §4 / LD-9).
- **L — Repository stamps `groupId` on shared items too** (`10`): shared/non-owned items should resolve to `null`. → **NOTE** (per-user memberships exist only over owned projects, so shared items naturally map to `null`; make it explicit in the projection + a test).

### Adversarial
- **M — Implicit date *ordering* residue** (`11` Task 4.4 / synthesis risk #12): live `displayProjects` applies a `!sortTouched && isDateSortField` ordering independent of grouping; the `organizeBy` refactor must preserve it. → **NOTE** (call out and keep the ordering path; covered by date-regression tests).
- **M — D14 clear-after-refresh interleaving** (`11` Task 6.1): clearing the optimistic override too early can flicker to the stale SSR value. → **RESOLVED — mechanism corrected** (per LD-6): the original "clear inside the refresh `.then()` continuation" was **mechanically impossible** — `router.refresh()` returns `void`, not a thenable. Canonical pattern (mirrors favorites' real implementation): wrap the action call + `router.refresh()` in `startTransition` from `useTransition`, and clear the per-project group override in a `useEffect` that fires only once SSR is authoritative for that id (the transition has settled — `isPending` is `false` — and the incoming SSR `item.groupId` reflects the move). Invariant: the override clears only when SSR is authoritative, with no early-clear flicker. Interleaving test added (rapid re-assign during a pending refresh must not flicker to stale SSR). Updated in `11` Task 6.1, `04` §6.2/D-8, `07` §5.5, `00` D14.
- **M — Bulk-move test clicks the delete checkbox** (`11` Task 6.5): the select checkbox only renders when delete-selection is active, conflating D9's broader assign gate with the delete gate. → **RESOLVED** (per LD-5): the assignment-specific selection source and its own selected-set decouple bulk-assign from the delete gate; the test exercises an owned-but-delete-blocked project being bulk-assigned (see the D9 Flow item below).
- **L — `bulkAssignProjectsToGroup` throws on zero-verify even for the remove (`groupId:null`) path** (`09`): → **FIX@IMPL → INTEGRATED** (remove-path is a no-op, not a throw, on zero verify — §4 / LD-8).
- **L — RLS fixtures via `execute_sql` run as service role** (`08`): → **NOTE** (same root as the `SET ROLE` item).
- **L — `23505` dup-name vs membership-unique indistinguishable** (`09`): → **FIX@IMPL → INTEGRATED** (distinguished by constraint name in the error handler — §4 / LD-8).

### Scope
- **M — `reorderProjectGroups` fully built in Phase 2, but Manage-groups popover defers reorder UI** (`09`/`11`): → **NOTE** (action is built-ahead; UI reorder is a documented fast-follow per D16 — leave the action, it's harmless and N≤50).
- **M — `ManageGroupsPopover` re-declares `MAX_PROJECT_GROUPS`/`MAX_PROJECT_GROUP_NAME_LENGTH`** (`11`): drift risk. → **FIX@IMPL → INTEGRATED** (the single authoritative constants are imported from the constants module; duplicates removed — §4 / LD-8).
- **M — `DEFAULT_GROUP_ACCENT` id `'slate'` collides with the first palette swatch `'slate'`** (`11` Task 1): → **FIX@IMPL → INTEGRATED** (`DEFAULT_GROUP_ACCENT` id is `neutral`, distinct from the `slate` swatch — §4 / LD-4).
- **L — Manage-popover and section-header menu are two overlapping CRUD surfaces** (`11`): → **NOTE** (acceptable; document the division of duties).

### Security
- **M — Duplicated cap constants** (`11`): → **FIX@IMPL → INTEGRATED** (same as the scope DRY item — §4 / LD-8).
- **M — `reorderProjectGroups` has no upper bound on `orderedGroupIds.length`** (`09`): → **FIX@IMPL → INTEGRATED** (fan-out capped at `MAX_PROJECT_GROUPS` — §4 / LD-8).
- **M — Cross-user membership IDOR over another user's group** (`07`): a membership row could in principle be written referencing a `group_id` the caller does not own. → **RESOLVED — two-layer** (per LD-1): (1) the migration's membership RLS `with check` includes the IDOR backstop `exists(select 1 from project_groups g where g.id = group_id and g.user_id = (select auth.uid()))` (`07` §2.3), so the database rejects a membership over a group the caller does not own; and (2) the **action layer** enforces project ownership under the repository's `owned` predicate (F5 / LD-2). The earlier "NOTE/ACCEPTED — RLS doesn't enforce" disposition is **corrected**: the `exists()` RLS backstop **is in the migration** and the action gate is the second layer — RLS is the backstop, the action is the gate.
- **L — Shared-tab `organizeBy` coercion not persisted** (`11`): → **NOTE** (transient view state; acceptable — no persistence needed).

### Flow
- **M — Toast tests lack provider** → **FIXED** (F3).
- **M — Edge case 1 (Group mode with zero groups) has no implementing task** (`11`): the empty-state "create your first group" flow isn't built, but the spec (`01` §5/§7) requires it. → **FIX@IMPL → INTEGRATED** (P0-1: a Group-mode zero-groups empty-state task + create-from-empty entry point + test is built into `11` — §4 / LD-8).
- **L — D9 broader assign gate not actually realized for bulk** (`11` Step 6.2): bulk draws from `selectedVisibleProjectIds`, which is delete-gated. → **RESOLVED** (per LD-5): Phase 4 adds an assignment-specific selection source (e.g. `selectableForAssignmentProjectIds = displayLiveProjects.filter(canAssignProjectToGroup).map(p => p.project.id)` with a parallel selected-set the bulk "Move to group" affordance reads — NOT `selectedVisibleProjectIds`), where `canAssignProjectToGroup` uses the LD-2 ownership definition. Test added: an owned project blocked from delete by an active shared link is selectable for and successfully bulk-assigned. The "v1 accepts the delete-gated selection" waiver is removed.
- **L — Searchable assignment picker past ~8 groups unimplemented** (`11`): → **DEFER** (spec marks it a recommended enhancement; fast-follow).
- **L — Lane 04 "Date organize coerces sortField" cross-lane note** (`04`): → **NOTE** (the plan's Organize-control note already handles the sort↔organize coupling).

---

## 4. Former pre-implementation checklist — now INTEGRATED into the phase plans

These were originally recorded as "do at the start of the relevant phase." During the
2026-06-16 improvement campaign (Round 2, below) every item was **moved into the relevant
phase plan as a built task/step** — none remain as a pre-phase checkbox. Blocker F1 and highs
F2–F6 were already in the plan; the items below are now likewise integrated, each with a
pointer. (See `13-requirements-traceability-and-qa-matrix.md` for the requirement→test map.)

**Phase 1 (DB) — `08`:**
- ✅ INTEGRATED — RLS isolation proof runs under a genuine RLS-enforcing role (`SET ROLE authenticated` + JWT claims, two real authenticated clients, or a disposable branch DB) with a sanity-control abort gate, fixtures wrapped in a transaction/rollback so nothing commits to live project `ebxxqidacheyapmmzavr`. Deterministic procedure: `15-deploy-rollback-recovery-and-dod.md` (RLS-proof runbook), referenced from `08` (LD-9).
- ✅ INTEGRATED — `references public.workspaces(id) on delete cascade` added to **both** `project_groups.workspace_id` and `project_group_memberships.workspace_id` → `08` migration / `07` §2.1–§2.2 (LD-7).
- ✅ INTEGRATED — `user_id`-leading index added if `get_advisors` flags an unindexed FK → `08` (LD-8).
- ✅ INTEGRATED — no DB name-length `check` constraint shipped (caps are app-layer soft-cap per `07` §2.5; the `02` `project_groups_name_check` is not shipped) → `08` (LD-8).
- ✅ INTEGRATED — Phase-1 DOWN/rollback step → `08` + `15` (LD-8/LD-14).

**Phase 2 (actions) — `09`:**
- ✅ INTEGRATED — `reorderProjectGroups` input capped at `MAX_PROJECT_GROUPS` → `09` Task (LD-8).
- ✅ INTEGRATED — `bulkAssignProjectsToGroup` remove-path (`groupId: null`) is a no-op (not a throw) on zero verify → `09` Task (LD-8).
- ✅ INTEGRATED — dup-name (`23505` on the name index) distinguished from membership-unique by constraint name → `09` error handler (LD-8).
- ✅ INTEGRATED — LD-2 ownership predicate (repository `owned` derivation, nullable `created_by`) → `09` Task 6/7 (LD-2).
- ✅ INTEGRATED — `bulkAssignProjectsToGroup` typed return `{ movedProjectIds; skippedProjectIds }` → `07` §4.7 / `09` Task (LD-11).

**Phase 3 (repository) — `10`:**
- ✅ INTEGRATED — `groupId` asserted `null` for shared/non-owned list items, with a test → `10` (LD-8); additive revert note → `10`/`15`.

**Phase 4 (client) — `11`:**
- ✅ INTEGRATED — `MAX_PROJECT_GROUPS` / `MAX_PROJECT_GROUP_NAME_LENGTH` imported from the single constants module (duplicate declarations in `ManageGroupsPopover` removed) → `11` (LD-8).
- ✅ INTEGRATED — `DEFAULT_GROUP_ACCENT` id is `neutral` (distinct from the `slate` swatch) → `11` Task 1 / `07` §5.4 (LD-4).
- ✅ INTEGRATED — **Group-mode zero-groups empty state** + "create your first group" entry point built as a task + test (spec `01` §5/§7; P0-1) → `11` (LD-8).
- ✅ INTEGRATED — D9 assignment selection gate realized for bulk-assign via an assignment-specific selection source (no delete-gate reuse) → `11` Step 6.2 (LD-5); the v1 waiver is removed.
- ✅ INTEGRATED — D14 optimistic override cleared via the `useTransition`/`isPending` + SSR-authoritative `useEffect` pattern (the `.then()` continuation was impossible), with an interleaving test → `11` Task 6.1 (LD-6).
- ✅ INTEGRATED — `DropdownPopupPanel` popover, `rounded-xs` (not `rounded-full`), current-group "checked" indicator, `ui/` primitive buttons, all-groups-empty-during-search fallback → `11` (LD-10).

---

## 5. Residual risk after this review

- **Concurrency (unchanged, HIGH):** the dominant risk remains landing Groups against the dirty tree — sequence after the three in-flight branches (sidebar-favorites, delete-modal, card-links) and follow the rebase-before-edit discipline in `00` §6.
- **Live-DB test hygiene (MEDIUM):** the Phase-1 RLS proof must not pollute the production project (now integrated into `08` + the `15` RLS-proof runbook — §4).
- **No data-loss / cross-tenant path** provided the per-user membership table + cloned-favorites RLS **plus the IDOR `exists()` backstop** + the LD-2 ownership action gate (F5) ship together.

All findings are recorded; nothing is silently dropped.

---

## 6. Round 2 — campaign integration (2026-06-16)

This record was revised during the Project Groups plan-to-100% improvement campaign so that
it no longer contradicts the canonical contracts doc (`07`) and accurately reflects that its
own findings are now integrated rather than pending. Changes in this round:

- **§4 is no longer a "do at impl start" checklist** — every former FIX@IMPL item is marked
  **INTEGRATED** with a per-item pointer to the phase plan / new doc that now carries it; §3
  dispositions were updated to `FIX@IMPL → INTEGRATED` / `RESOLVED` to match (LD-8).
- **§3 Security IDOR (was "NOTE/ACCEPTED, RLS doesn't enforce") corrected to RESOLVED —
  two-layer:** the migration's membership RLS `with check` carries the `exists()` IDOR
  backstop (`07` §2.3) **and** the action layer enforces ownership; the prior claim that RLS
  doesn't enforce is removed (LD-1).
- **F5 disposition corrected:** the action gate matches the repository's `owned` predicate
  (workspace-role membership **OR** nullable-safe `created_by = profile.id`), not a bare
  `.eq("created_by", …)`; the false "matches the client owned gate" claim is deleted (LD-2).
- **D9 bulk-assign gate reclassified to RESOLVED:** Phase 4 adds an assignment-specific
  selection source so a delete-blocked owned project is still bulk-groupable; the "v1 reuses
  the delete-eligible selection" waiver is removed (LD-5).
- **D14 disposition corrected:** the impossible `router.refresh().then()` clear is replaced
  with the `useTransition`/`isPending` + SSR-authoritative `useEffect` pattern (LD-6).

**New companion docs now exist** (authored in the campaign's Wave 3), which this review's
findings feed into:
- `13-requirements-traceability-and-qa-matrix.md` — requirement → phase/task → test mapping,
  folding in these adversarial scenarios and a security-control sub-matrix.
- `14-implementer-handoff-and-runbook.md` — single-worker entry point, ordering, validation
  command block, STOP/escalate conditions, contract index.
- `15-deploy-rollback-recovery-and-dod.md` — migration/apply order, per-phase DOWN/revert,
  the LD-9 RLS-proof runbook, and per-phase Definition-of-Done gates.
