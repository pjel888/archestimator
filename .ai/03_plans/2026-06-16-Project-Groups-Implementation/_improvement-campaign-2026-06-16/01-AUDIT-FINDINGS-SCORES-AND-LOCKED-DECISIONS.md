# Project Groups — Audit Findings, Scores & Locked Decisions (Wave 1 synthesis)

**Date:** 2026-06-16. **Author:** orchestrator. **Inputs:** 10-lens codebase-grounded
audit (3 P0 / 27 P1 / 26 P2 / 12 P3 = 68 blockers; 1.68M analysis tokens) + the
orchestrator's K1–K15 pre-audit findings.

> This is the binding work order for the improvement campaign. §3 **Locked Decisions**
> resolve every cross-cutting conflict ONCE so that parallel reconciliation agents apply
> the same answer to their owned files. Agents implement these decisions; they do not
> re-decide them. Conflicts → escalate to the orchestrator (see coordination doc §5).

---

## 1. Scores at campaign start (consensus across 10 lenses)

| Axis | Min | Mean | Max | Drivers |
|---|---|---|---|---|
| **Strategy** | 84 | **89** | 92 | Strong architecture; dinged for invisible existing-Client mode, accent-override coherence, Q1 contradiction. |
| **Quality** | 78 | **83** | 90 | Stale §7 package map (5 lenses), lane-vs-spine contradictions (02, 01, 05), 12↔07 RLS contradiction. |
| **Implementation-readiness** | 72* | **~78** | 86 | Unintegrated FIX@IMPL, unrealized D9 bulk gate, broken D14, no traceability/handoff/rollback docs, zero-groups task missing. |

*The scope-guardian lens emitted `readiness=0`, an artifact (its own blockers are all
P1–P3); the real readiness consensus floor is 72. Target after campaign: **every axis ≥ 100,
zero P0/P1**, verified by a fresh re-audit.

---

## 2. Consolidated blocker map (what each doc must absorb)

### P0 (3)
- **P0-1** Zero-groups Group-mode empty state has no implementing task/test → `11` (build it), `12` (mark integrated).
- **P0-2** Two conflicting "canonical" membership schemas (`02` vs `07`/`08`) → reconcile per **LD-1**.
- **P0-3** Server `created_by` ownership gate is stricter than the repo's `owned` derivation AND keys on a nullable column → reconcile per **LD-2**.

### P1 clusters (27, grouped)
- **C-STALEMAP** (5 lenses): `00` §7 lists superseded filenames; `02` §7 too. → **LD-3**. Owners: `00`, `02`.
- **C-ACCENT** : `01`/`05` say colorless-first; palettes diverge (`05` moss/rust vs `07` sage/rose); no concrete hexes. → **LD-4**. Owners: `01`, `05`, `07`.
- **C-D9BULK** (4 lenses): bulk-assign reuses the delete-gated selection, violating D9. → **LD-5**. Owners: `11`, `09`, `07`, `00`.
- **C-D14** (c100): `router.refresh()` is non-awaitable; the "clear-after-refresh in `.then()`" is mechanically impossible. → **LD-6**. Owners: `04`, `07`, `11`.
- **C-OWNERSHIP**: created_by nullable + ON DELETE SET NULL + role-ownership. → **LD-2**. Owners: `09`, `07`, `12`.
- **C-WSFK** (c100): `project_groups`/`memberships` `workspace_id` lacks FK to `workspaces(id)`. → **LD-7**. Owners: `07`, `08` (`02` already has it).
- **C-FIXIMPL**: ~13 FIX@IMPL items unintegrated; README/00 "100% ready" overstated. → **LD-8**. Owners: `08`,`09`,`10`,`11`,`12`,`README`,`00`.
- **C-RLSPROOF**: Phase-1 RLS isolation proof seeds COMMITTED rows into live prod + not guaranteed to run under an RLS-enforcing role. → **LD-9**. Owners: `08`, new `15`.
- **C-12RLS**: `12` §3 says membership IDOR is "NOTE/ACCEPTED, RLS doesn't enforce" but `07` RLS DOES add an `exists()` backstop. → **LD-1** (state the backstop is canonical). Owner: `12`.
- **C-UIREUSE**: `11` hand-rolls the Manage-groups popover (loses Escape/focus-trap) vs `05`'s mandated `DropdownPopupPanel`; uses `rounded-full` vs DESIGN.md `xs`-only; "current group checked" indicator unimplemented; raw glyph buttons. → **LD-10**. Owner: `11`.
- **C-BULKRET**: `bulkAssignProjectsToGroup` returns `void` + silently drops unverified ids → client can't detect partial failure. → **LD-11**. Owners: `09`, `07`, `11`.
- **C-CLIENTMODE**: the existing implicit **Client** organize mode is invisible in the product/strategy framing. → **LD-12**. Owners: `01`, `00`, `06`.
- **C-Q1**: Q1 default-organize wording differs between README and `00`. → **LD-13**. Owners: `README`, `00`, `01`.
- **C-DOCS**: no traceability matrix / handoff / rollback docs. → **LD-14** (new docs 13/14/15). 
- **C-04DRIFT**: `04` `ProjectGroupSummary {id,name,position}` missing `accentId`; action-name + membership-`position`-column drift. → conform to `07` (**LD-4/LD-15**). Owner: `04`.

P2/P3 (38) are polish — addressed opportunistically by each file's owner during its edit
(e.g. terminology tidy, residual count drift). They are not individually gating but the
owner should sweep their file for the P2/P3 items the audit attributed to it.

---

## 3. LOCKED DECISIONS (binding — implement verbatim)

### LD-1 — Membership IDOR mechanism = single-column FK + RLS `exists()` backstop (07/08 canonical)
The canonical membership schema is **`07`/`08`'s**: `group_id uuid not null references
public.project_groups(id) on delete cascade`, single-membership `unique(user_id,
project_id)`, project composite FK `(project_id, workspace_id) → projects(id, workspace_id)
on delete cascade`, and the **RLS `with check` `exists(select 1 from project_groups g where
g.id = group_id and g.user_id = (select auth.uid()))` IDOR backstop** that `07` §2.3
already specifies. Rationale: respects the contracts spine and the ship-this migration;
the `exists()` backstop closes the cross-user-group IDOR; minimal churn to the reviewed
migration. **`02`'s composite `(group_id, workspace_id, user_id)` FK + `project_groups
unique(id, workspace_id, user_id)` is SUPERSEDED** — `02` is reconciled down to the single
column form. Consequence for `12`: its §3 security disposition MUST be corrected to state
the `exists()` RLS backstop **is in the migration** (two-layer: RLS backstop + action-layer
ownership gate), not "NOTE/ACCEPTED, RLS doesn't enforce."

### LD-2 — Server ownership gate matches the repository's `owned` derivation, not bare `created_by`
The Phase-2 actions MUST NOT gate assignment on `.eq("created_by", profile.id)` alone.
The repository defines owned as (workspace-repository.ts ~L236):
`workspace_id === workspace.id && (Boolean(workspaceRole) || created_by === profileId)`,
and `created_by` is **nullable** (`ON DELETE SET NULL`). The action gate MUST verify the
project is in the user's workspace **and** owned-by-this-user under the *same* definition
the repository uses to populate the "Your Projects" list — i.e. workspace-role membership
**OR** `created_by = profile.id` — handling `created_by IS NULL`. The Phase-2 owner reads
the live `workspace-repository.ts` to copy the exact predicate, and adds **negative tests**
for (a) an owned-via-workspace-role project and (b) an owned project with `created_by IS
NULL` — both must be assignable. `07` §4.6/4.7, `09` Task 6/7, and `12` F5 are corrected to
this predicate (delete the false "created_by matches the client owned gate" claim).

### LD-3 — `00` §7 package map + `02` §7 fixed to the real filenames
`00` §7 "Package map" rows for `07/08/09` MUST be replaced with the real current pack:
`07-implementation-plan-overview-and-contracts.md`, `08-plan-phase-1-db-and-types.md`,
`09-plan-phase-2-server-actions.md`, `10-plan-phase-3-repository-and-page.md`,
`11-plan-phase-4-client-ui-and-tests.md`, `12-adversarial-review.md`, **plus** the three
new docs (`13`,`14`,`15` — LD-14), matching the README table. `02` §7 item 5's reference to
`08-traceability-and-qa-matrix.md` becomes `13-requirements-traceability-and-qa-matrix.md`.

### LD-4 — Accents ship in v1; one canonical palette; concrete hexes locked
Accents **ship in v1** (Q3/D13). Every "colorless-first / fast-follow / v1 renders
colorless" framing in `01` (§3, §7 acceptance, §11) and `05` (§0, §5.2, §11) is replaced
with the v1 framing (selection UI in Manage-groups + rendering in `ProjectGroupSection`).
The canonical API is **`07` §5.4**: `GroupAccentSwatch { id; label; ruleColor; dotColor }`,
`GROUP_ACCENT_SWATCHES`, `DEFAULT_GROUP_ACCENT`, `resolveAccent`, `isGroupAccentColor`,
ids `slate · stone · sage · teal · indigo · plum · rose · clay`. `05`'s `GROUP_ACCENTS`/
`getGroupAccentHex`/`moss`/`rust` variant is superseded. The **concrete palette** (decorative
only — never on text; labels stay `text-secondary` #5D5D5D for AA; non-brand-orange;
inline-style only) is locked here and placed verbatim in `07` §5.4:

| id | label | ruleColor (3px rule) | dotColor (6px dot) |
|---|---|---|---|
| slate | Slate | `#6B7785` | `#5A6573` |
| stone | Stone | `#8A8279` | `#756E66` |
| sage | Sage | `#6E8267` | `#5C6E56` |
| teal | Teal | `#4E8A86` | `#3F7470` |
| indigo | Indigo | `#6471A6` | `#515D90` |
| plum | Plum | `#8A6B8C` | `#74577A` |
| rose | Rose | `#B07089` | `#9A5E78` |
| clay | Clay | `#9C7A66` | `#87664F` |

`DEFAULT_GROUP_ACCENT` = `{ id: "neutral", label: "Neutral", ruleColor: "#C7CAD1",
dotColor: "#9AA0A6" }` — id **`neutral`** (distinct from the `slate` swatch, per the
FIX@IMPL DRY fix). All 8 hues are desaturated and explicitly distinct from brand orange
(`rgb(170,65,42)` / `#AA412A`).

### LD-5 — D9 bulk-assign gate is REALIZED (not waived)
Phase 4 MUST add an assignment-specific selection source so a delete-blocked **owned**
project is still bulk-groupable: e.g. `selectableForAssignmentProjectIds =
displayLiveProjects.filter(canAssignProjectToGroup).map(p => p.project.id)` and a parallel
selected-set the bulk "Move to group" affordance reads (NOT `selectedVisibleProjectIds`,
which is `canSelectProjectForDeletion`-gated). Add a test: an owned project blocked from
delete by an active shared link is selectable for and successfully bulk-assigned.
`canAssignProjectToGroup` uses the LD-2 ownership definition. `00` D9, `07`, `09`, `11`,
`12` are aligned; remove any "v1 accepts the delete-gated selection" waiver.

### LD-6 — D14 optimistic reconciliation corrected for non-awaitable `router.refresh()`
`router.refresh()` returns `void` (not a thenable), so "clear the override in the refresh
`.then()`" is impossible. Canonical pattern (mirror favorites' real implementation): wrap
the action call + `router.refresh()` in `startTransition` from `useTransition`; the
transition's `isPending` tracks the RSC refresh completion. Clear the per-project group
override(s) in a `useEffect` that fires when **either** the transition settles (`isPending`
goes `false`) **and** the incoming SSR `item.groupId` equals the override value, **or**
simply when the SSR prop for that id reflects the move — whichever the Phase-4 owner
verifies against live code. The invariant: the override is cleared only once SSR is
authoritative for that id, with no early-clear flicker. Update `04` §6.2/D-8, `07` §5.5,
`11` Task 6.1, `00` D14, and `12`'s D14 disposition to this corrected mechanism, and add an
interleaving test (rapid re-assign during a pending refresh must not flicker to stale SSR).

### LD-7 — Add `workspaces(id)` FK to both new tables (additive)
Both `project_groups.workspace_id` and `project_group_memberships.workspace_id` get
`references public.workspaces(id) on delete cascade` (cleanup on workspace delete; closes
the orphan-on-workspace-delete finding). Add to `07` §2.1/§2.2 DDL and `08`'s migration.
(`02` already has this on `project_groups`; extend to memberships too.)

### LD-8 — Integrate ALL FIX@IMPL items into the phase plans; correct the "100%" claims
Every item in `12` §4 is **moved into the relevant phase plan as a built task/step**, not a
pre-phase checkbox. Specifically:
- **Phase 1 (`08`)**: workspaces FK (LD-7); `user_id`-leading index if advisors flag it;
  RLS proof under a real authenticated role + transactional/rollback fixtures (LD-9);
  remove any DB name-length `check` constraint to match `07` §2.5 app-layer soft-cap (the
  `02` `project_groups_name_check` is NOT shipped — caps are app-layer only). Add a
  down/rollback step (LD-14/`15`).
- **Phase 2 (`09`)**: cap `reorderProjectGroups` input at `MAX_PROJECT_GROUPS`;
  `bulkAssignProjectsToGroup` remove-path (`groupId:null`) is a no-op (not throw) on zero
  verify; distinguish dup-name `23505` (name index) from membership-unique by constraint
  name; LD-2 ownership predicate; LD-11 return shape.
- **Phase 3 (`10`)**: assert `groupId` is `null` for shared/non-owned list items + test;
  rollback note.
- **Phase 4 (`11`)**: import `MAX_PROJECT_GROUPS`/`MAX_PROJECT_GROUP_NAME_LENGTH` from the
  single constants module; `DEFAULT_GROUP_ACCENT` id `neutral` (LD-4); **build** the
  zero-groups empty state task + test (P0-1); realize D9 bulk selection (LD-5); D14
  corrected clear (LD-6); `rounded-xs` not `rounded-full` (LD-10); `DropdownPopupPanel`
  popover (LD-10); current-group-checked indicator (LD-10); all-empty-search fallback.
- **`README` + `00`**: change "100% implementation-ready" to an accurate readiness
  statement that points to the now-integrated fixes + the new traceability/handoff/rollback
  docs as the basis for readiness (no unqualified "100%" that the FIX@IMPL backlog
  contradicts). After integration, the README may state readiness with the traceability
  matrix as evidence.
- **`12`**: change the §4 checklist from "do at impl start" to "INTEGRATED into <doc/task>",
  with a per-item pointer; add a round-2 record noting the integration.

### LD-9 — RLS isolation proof: real role + no live-prod pollution
The Phase-1 cross-user RLS proof MUST run under a genuine RLS-enforcing path (`SET ROLE
authenticated` + JWT claims, two real authenticated clients, or a disposable Supabase
branch DB), with a **sanity control** (a query that MUST fail if RLS is off) as a hard
abort gate, and fixtures wrapped in a transaction with rollback (or namespaced disposable
rows with guaranteed cleanup) so nothing commits to project `ebxxqidacheyapmmzavr`. The
deterministic, repo-runnable procedure lives in new doc `15` and is referenced from `08`.

### LD-10 — `11` UI reuse + DESIGN.md compliance fixes
- Manage-groups popover is built on the shared `DropdownPopupPanel`/`useDropdownPopup`
  (Escape, outside-click, focus-trap) per `05` §4.1 — not hand-rolled.
- All accent dots/rules and swatches use `rounded-xs` (DESIGN.md xs-only), never
  `rounded-full`.
- Implement the current-group "checked" indicator: extend `DropdownMenu.Item` with
  `selected?: boolean` → trailing `Check` (per `05` §8 reuse table), and use it.
- Use `ui/` primitive buttons (icon-xs/ghost), not raw glyph buttons.
- Add the all-groups-empty-during-search fallback to `renderTabEmptyState()`.

### LD-11 — `bulkAssignProjectsToGroup` returns a typed result
Signature becomes `Promise<{ movedProjectIds: string[]; skippedProjectIds: string[] }>`
(or equivalent) so the client can keep optimistic state for moved ids, roll back skipped
ids, and toast a partial-failure message. Update `07` §4.7, `09` Task, and `11` §5.5
optimistic handling + a partial-failure test.

### LD-12 — Surface the existing implicit Client organize mode in the framing
`01` and `00` (and the prior-art note in `06`) must acknowledge that the live page already
groups by **Client** (not only dates) — `defaultOrganizeByForSortField` maps `client_name`
→ grouped (the F1 blocker fix depends on it). The product/strategy framing must state that
"Organize by Date" mode actually means "group by the active grouping sort dimension (date
**or** client)", so the third explicit mode generalizes both. (This is already correct in
`07` §5.1 and `11`; the gap is only in the narrative docs.)

### LD-13 — Q1 default wording reconciled
README, `00` §4, and `01` state Q1 identically: default `organizeBy` = `'date'` when the
**current/initial in-memory sort field** is a grouping sort (a date field `updated_at`/
`created_at` **or** `client_name`), else `'none'`; there is no persisted sort, so first
load computes `'date'`. Use `07` §1.1's precise wording as the canonical phrasing; delete
any "persisted sort" phrasing that implies stored sort state.

### LD-14 — New documents to author (Wave 3)
- **`13-requirements-traceability-and-qa-matrix.md`** — maps every D1–D16 + Q1–Q4 + `01`
  §7 acceptance criterion → implementing phase/task → exact test file + `it(...)` name +
  key assertion; folds in the `12` adversarial scenarios; a security-control sub-matrix
  (per-user RLS, IDOR `exists()` backstop, LD-2 ownership gate, accent_id allowlist, 23505
  handling, reorder fan-out bound, anon deny, shared-tab deferral) → enforcing layer +
  verifying test; flags any untested requirement; ends with a 100% scorecard.
- **`14-implementer-handoff-and-runbook.md`** — single-worker handoff: entry point, strict
  `7a→7b→7c→7d` order (after C1/C2/C3 land), the consolidated validation command block,
  explicit STOP/escalate conditions, v1 non-goals, and a contract index (where each shared
  name/type/signature/DOM anchor lives).
- **`15-deploy-rollback-recovery-and-dod.md`** — migration apply order vs pending
  `20260616*` files, types-regen, advisor gate; per-phase **DOWN/revert** path (Phase 1
  drop tables/policies/grants + types revert + advisor-regression abort; Phase 3 additive
  revert w/ 29-importer blast radius; Phase 4 `organizeBy`-gated revert); the LD-9 RLS-proof
  runbook; a per-phase **Definition-of-Done** gate.

### LD-15 — Lane-doc supersession stamps
`01`, `02`, `04`, `05` each get a short top-of-file banner: "LANE/ANALYSIS DOC — subordinate
to `00` (decisions) and `07` (contracts). Where this doc conflicts, 00/07 win. Reconciled
2026-06-16 for: <list>." This preserves provenance while removing the "source of truth for
product behavior" contradiction the audit flagged.

---

## 4. Decisions taken (audit trail)
- **IDOR mechanism:** single-column FK + RLS `exists()` backstop (LD-1) over `02`'s
  composite FK — respects the spine/ship-migration; backstop is sufficient. *(Both are
  secure; chose minimal-churn-to-reviewed-migration.)*
- **created_by gate:** match the repository `owned` predicate (LD-2) over either the bare
  `created_by` gate or restricting the client — preserves the D9/D11 "Your Projects = owned"
  product contract and handles nullable `created_by`.
- **Palette hexes:** locked in LD-4 (orchestrator-authored; decorative, non-orange, AA-safe
  labels). Re-tunable later via the `accent_id` token without a data migration.

## 5. Wave plan
- **Wave 2 (reconcile, parallel, disjoint owners):** README, 00, 01, 02, 04, 05, 06, 07,
  08, 09, 10, 11, 12 — each implements its LD slice.
- **Wave 3 (author, parallel):** 13, 14, 15 — after Wave 2, citing final content.
- **Wave 4 (verify):** fresh 10-lens re-audit; loop 2–4 until every axis ≥ 100, zero P0/P1.
