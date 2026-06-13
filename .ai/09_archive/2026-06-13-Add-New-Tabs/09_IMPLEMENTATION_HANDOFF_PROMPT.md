# 09 — Implementation Handoff Prompt

> **This is the canonical entry point for implementing this plan.** When you (or
> a future agent) are ready to build the Add New Tabs feature, start here: paste
> the **Handoff prompt** block below to the implementing agent. It is
> self-contained — it names the ordered units, the execution skill, the hard
> constraints (the NOT-TO-DO list), the test posture, the validation gate, the
> per-unit definition-of-done, the file map, and the commit/rollback convention.
> The agent then reads the supporting docs it references and executes.
>
> Supporting detail: [07](07_IMPLEMENTATION_PLAN.md) (full unit specs + file
> lists — authoritative), [10](10_TEST_AND_QA_PLAN.md) (test matrix: which tests
> break vs. survive), [02](02_UX_UI_DESIGN.md) (design bar),
> [06](06_BLAST_RADIUS.md) (acceptance criteria),
> [mockups/target-strip.html](mockups/target-strip.html) (visual reference).

---

## Handoff prompt (copy from here)

> You are implementing the **Add New Tabs** feature for Archestimator. The full
> plan pack is at `.ai/03_plans/2026-06-13-Add-New-Tabs/`. **Read 07 (units), 10
> (tests), 02 (design), 06 (blast radius) before starting.**
>
> **Frame:** the "+" create flow already exists, hidden behind release gate D-15.
> You are lifting the gate, replacing the toolbar action row with a right-click
> context menu, permission-gating it, and polishing it to a browser-grade bar.
>
> **Execution skill:** use `superpowers:subagent-driven-development` (fresh
> subagent per unit) or `superpowers:executing-plans`. Work **test-first**
> against `tests/vitest/estimate-tab-strip.test.tsx`.
>
> **Order:** U1 ∥ U2 → U3 → then U4, U5, U6, U7.
> - **U1** — resolve `canEditEstimate` via the `can_edit_estimate` RPC **inside
>   the page's existing `Promise.all`** (there is NO route role to reuse); thread
>   the boolean page → EstimateWorkspaceClient → EstimateSheetContent →
>   EstimateTabStrip (default `false`).
> - **U2** — physically delete the toolbar action buttons (Duplicate, the
>   **flag-less Rename pencil**, Archive, Delete); add **one controlled**
>   `ContextMenu` for the strip (capture right-clicked `tabId` in state, mirror
>   `EstimateSheetTree`); refactor handlers to target that tab; implement the
>   **menu→Rename focus/blur contract** (suppress `onCloseAutoFocus`, guard the
>   input `onBlur`); keep "+", double-click rename, F2, and the cross-tab drag
>   rejection.
> - **U3** — pass `enableLifecycleActions={canEditEstimate}` +
>   `canCreateTabs={canEditEstimate}` at the mount; keep this an **isolated
>   single-file commit** (for instant revert). Leave the other `can*Tabs` flags
>   false.
> - **U4** — replace the blind `tabsQuery.refetch()` on create with
>   `setQueryData` from the returned array; optional optimistic `optimistic-`
>   temp tab + rollback.
> - **U5** — pin the "+", scroll active/new/rename-target into view, overflow
>   fade, "+" tooltip, restrained motion respecting `prefers-reduced-motion`.
> - **U6** — verify the "This tab is empty" state renders for "+"-created tabs;
>   gate its Add Group / Browse buttons on `canEditEstimate`.
> - **U7** — run the [06 §3a](06_BLAST_RADIUS.md) downstream acceptance checks;
>   record the D-15 lift in `.ai/10_state/decisions.md`; add the deploy +
>   rollback checklist.
>
> **DO NOT (hard constraints):**
> - ❌ Do **not** apply, patch, or `apply_migration` the hosted Supabase schema.
>   The migration is owner-gated; you have no DB channel (Docker absent / hosted
>   SQL denied). No DB/RPC/RLS change is needed.
> - ❌ Do **not** hand-edit `src/lib/supabase/types.ts` (generated; already
>   complete for tabs).
> - ❌ Do **not** widen or alter RLS / the tab RPCs. Server stays authoritative;
>   `canEditEstimate` is UX gating only.
> - ❌ Do **not** build cross-tab node move (D-7 stays rejected) — only verify the
>   rejection toast still fires.
> - ❌ Do **not** add a louder/larger "+" than surrounding chrome or introduce new
>   design tokens/colors. `bun run lint:design-system` must pass.
> - ❌ Do **not** wrap each tab in its own `ContextMenu` (one controlled menu).
> - ❌ Do **not** leave the Rename pencil in place hoping a false flag hides it —
>   it has no flag; remove it.
> - ❌ Do **not** `git push` or open a PR unless the owner asks.
>
> **Per-unit definition-of-done (evidence before claims):**
> - The unit's Vitest scenarios (07/10) are written first, fail, then pass.
> - `bun run validate` and `bun run build` pass; cite the output.
> - `gitnexus_impact` was run before editing `EstimateTabStrip` /
>   `EstimateSheetContent`; `gitnexus_detect_changes()` shows only expected
>   symbols/flows before committing.
> - UI units (U2/U5/U6): screenshot proof at default / overflow / menu-open /
>   empty-state / 375px, verified via the preview tools — never "looks done."
>
> **Commit/PR convention:** one branch `feat/add-new-tab-affordance`; commits
> scoped `feat(estimate-tabs): …`; end commit messages with the
> `Co-Authored-By: Claude …` trailer. Keep U3's mount change isolated.
>
> **Before flipping the gate in any deployed env:** confirm BOTH the
> `estimate_tabs` table AND the `create_estimate_tab_with_history` RPC exist
> there (partial drift fails open — see [07 U7](07_IMPLEMENTATION_PLAN.md)).
> Rollback path: Vercel instant rollback, or revert the single U3 commit.

---

## Files by unit (quick reference — 07 is authoritative)

| Unit | Primary files |
|---|---|
| U1 | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `EstimateWorkspaceClient.tsx`, `EstimateSheetContent.tsx`, `src/lib/repositories/workspace-repository.ts`; RPC `can_edit_estimate` |
| U2 | `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx` (+ optional `EstimateTabContextMenu.tsx`), `src/components/ui/context-menu.tsx`, mirror `src/components/workshop/EstimateSheetTree.tsx` |
| U3 | `src/components/workshop/EstimateSheetContent.tsx` (mount ~:1719) — **isolated single-file commit** |
| U4 | `EstimateWorkspaceClient.tsx`, `EstimateTabStrip.tsx`, `src/hooks/use-estimate-query.ts` |
| U5 | `EstimateTabStrip.tsx`, `src/components/ui/toolbar-tooltip.tsx` |
| U6 | `EstimateSheetContent.tsx` (empty state ~:1833) |
| U7 | `.ai/10_state/decisions.md`, `.ai/10_state/current-state.md`; verify (no code): export route, activity-composer, publication, read-context |
| Tests | `tests/vitest/estimate-tab-strip.test.tsx` (3 rewrites: lines ~83/134/186; 6 survive) |

**Validation gate (per unit + at close):** `bun run validate` · `bun run build` ·
`bun run lint:design-system` · `gitnexus_detect_changes()` · screenshot proof for
UI units. No DB apply.

---

## Open questions to resolve with the owner first

- **OQ1** — Do view-only members reach `/workshop/...`, or only `/share/[token]`?
  If only the latter, U1 can be deferred (server already enforces edits). If
  unresolved, implement U1 anyway (cheap, default-safe).
- **OQ2** — Archive in the context menu, or Delete only? Default: Rename +
  Duplicate + Delete; Archive optional.
- **OQ4** — Delete confirmation dialog? Default: no modal (menu + danger styling +
  last-tab guard).
