# 27 — Engineering Guardrails and PR Checklist

> **Authoring agent:** W-GUARD. **Status:** Authoritative for the STANDING, ENFORCEABLE guardrail set every refactor PR in this program (and after) is checked against. Adopted as **D-023** (see §5).
>
> **Why this doc exists.** The rest of the pack diagnoses every underlying problem and plans the fixes phase-by-phase. It does *not* assemble the Bible's durable, reusable enforcement artifacts in one place. This document is that assembly: the two human-review merge gates (Pattern Law §2), the six static checks (Bible §15.4), the 10-question PR checklist (Bible §17), and the 12-item Do-Not-Do banned-pattern list (Bible §18). It is meant to outlive the program and govern every future hot-path PR.
>
> **Source of truth.** All gates below trace to `/.ai/13_research/2026-06-17-Master-Performance/Archestimator_React_Next_Performance_Engineering_Bible_Repo_Tailored_Update.md` (the "Bible"). Repo facts are pinned in `_research/_SYNTHESIS.md`. Decision IDs live in `17_DECISION_LOG.md`, risks in `16_RISK_REGISTER.md`, open questions in `19_OPEN_QUESTIONS.md`.
>
> **How this differs from neighbouring docs.**
> - `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md §2.3` is the **seam-file PRE-EDIT** checklist (run before you touch a RISK-22 seam file — impact analysis, drift check, guard-preservation). This doc's §3 is the **MERGE-TIME** checklist (run before the PR lands, on any hot-path change). They are complementary, not duplicates.
> - `12_PHASE_6_UI_PRIMITIVES_PLAN.md` (D-006) adds the design-system *duplication/reuse* lint rule to `scripts/enforce-app-design-system.mjs`. The static checks in §2 below are siblings of that work — they extend the same in-repo guardrail-script surface (`scripts/enforce-app-design-system.mjs` and new `scripts/*.mjs` grep gates) and the same ESLint config.
> - `18_EXECUTION_PROMPTS.md` and `24` reference §1 (the Law-2/Law-3 merge gates) and §3 (the PR checklist) as the human-review gates each execution agent must satisfy before claiming a phase done.

---

## 1. The Pattern Law merge gates (Bible §2)

These two are **human-review gates**, not scripts. A reviewer applies them at merge time to any PR touching a repeated data shape or hot client component. They cannot be fully automated because they are judgments about *data shape and ownership*, which is exactly why the Bible states them as laws.

### Gate A — Law 2: no derived data in state unless it is an indexed cache (Bible §2 Law 2)

**The rule.** State answers **"what did the user choose?"** or **"what is externally true?"** It must NOT duplicate a filtered list, a selected object, a full path, or a total — **unless** the value is an explicit *indexed cache* with a clear invalidation key. Derived values are computed during render or memoized as a pure calculation; they are never copied into state via `useEffect`.

**Canonical examples (Bible §2 Law 2, verbatim split).** Use these as the reviewer's mental model:

| Identifier | Classification | Why |
|---|---|---|
| `selectedNodeId` | **State** | A user choice — externally meaningful, not derivable. |
| `selectedNode` | **Derived** | `nodeById.get(selectedNodeId)` — pure projection of state + index. |
| `nodeById` | **Indexed cache** (allowed in a model layer) | Derived from server data; clear invalidation key (the server snapshot revision). |
| `visibleTreeRows` | **Derived (projection)** | `project(treeIndex, expandedSet, filter)` — never stored in state. |
| `nodeTotalsById` | **Derived (pure computed map)** | One DFS per revision over rows+nodes (Bible §4.2); not duplicated into state. |

**Reviewer question (must be answered "yes" to merge):** *For every new piece of React/Zustand state in this PR, is it a user choice or an externally-true fact — and is every filtered list / selected object / path / total computed or memoized rather than stored?* If a value is stored as a cache, the PR must name its invalidation key. A `useEffect` that copies derived data into state is an automatic fail (links to Do-Not-Do item 4, §4 below).

This gate is the human backstop for RISK-12/RISK-16-class fan-out problems (per-keystroke recompute, `editableRows` map-identity coupling) that the static checks cannot see.

### Gate B — Law 3: name your normalize / index / project / render(virtualize) layers (Bible §2 Law 3)

**The rule (Bible §2 Law 3, closing merge gate, verbatim):** *"If a new feature cannot name its normalize / index / project / render layers, it is not ready to merge."*

**Mandatory pre-merge question for any feature touching a repeated data shape** — trees, sheet rows, the component library, templates, project lists, charts, the command palette, sidebar panels:

> Name this feature's four layers:
> 1. **Normalize** — what is the flat source of truth (flat `nodes[]`/`rows[]`/items, adjacency, not nested mutation)?
> 2. **Index** — what keyed maps make lookups O(1) (`*ById`, `childrenByParentId`, `rowsByNodeId`, search index)?
> 3. **Project** — what pure function derives the rendered shape (nested tree, visible flat rows, breadcrumb, totals, series)?
> 4. **Render / virtualize** — which canonical renderer + virtualizer draws it (`src/components/ui/tree.tsx`, row/branch virtualizer, lazy chart island)?

If any layer cannot be named, the PR is **not ready to merge.** A feature that reinvents the data kernel instead of customizing only presentation fails this gate (Bible §2 preamble: "A feature is allowed to customize presentation, not reinvent the data kernel.").

The Bible §2 Law 3 table is the worked reference for the seven shapes already in the repo (estimate tree, sheet rows, component library, templates, project lists, charts) — a new feature in any of those families must match the established layering, not fork it.

---

## 2. Static guardrails (Bible §15.4)

Six automated checks. Each lists its concrete enforcement mechanism, the `bun run` command that runs it, and its phase. **None exist today** — all are new and are wired in **Phase 0** (guardrail setup) and aggregated into the **Phase 9 `perf:gate`** / CI gated set. They extend the existing in-repo guardrail-script surface (`scripts/enforce-app-design-system.mjs`, the ESLint config) — the same surface `12_PHASE_6_UI_PRIMITIVES_PLAN.md` extends for the D-006 design-system duplication rule. Treat all six as siblings of D-006.

| # | Check (Bible §15.4) | Enforcement mechanism | `bun run` command | Phase | Notes / cross-ref |
|---|---|---|---|---|---|
| SC-1 | Forbid importing `react-complex-tree` in new app/workshop code | ESLint `no-restricted-imports` (pattern `react-complex-tree`), scoped to `src/app/**` + `src/components/**` | `bun run lint` (rule lives in eslint config) | **(new, Phase 0)** | **Blocked until the two residual imports are removed first:** the CSS + type-alias import in `src/app/workshop/layout.tsx:13-15` and the import in `src/lib/component-library/library-folder-reorder.ts:1`. Removal + analyzer proof is **gated on Q-10** (`19_OPEN_QUESTIONS.md` Q-10 — confirm absent from runtime bundle). Land the rule only after Q-10 clears, else CI breaks on existing code. Bible §15.4 bullet 1, §18 item 2. |
| SC-2 | Forbid broad Zustand store hooks called without a selector | ESLint `no-restricted-syntax` matching `useEstimateUiStore()` / `useEstimate*Store()` called with **no arguments** (the selector-less call form); also any whole-store hook in a hot component | `bun run lint` | **(new, Phase 0)** | Bible §8.1 (Selector law) + §15.4 bullet 2. Catches the RISK-class "subscribe to the whole store" fan-out. Pairs with Do-Not-Do item 3. |
| SC-3 | Forbid helper barrels / re-export surfaces in hot client files | `no-hot-barrel-imports` — a `scripts/*.mjs` grep gate (or ESLint `no-restricted-syntax` on `export *` / aggregating re-export in the named files); also forbids *importing from a barrel* into these files | `bun run lint:design-system` (extend `scripts/enforce-app-design-system.mjs`) or a new `bun run lint:hot-barrels` | **(new, Phase 0)** | Scope: `src/components/workshop/EstimateSheetContent.tsx` and `EstimateSheetTree.tsx` (the hot client entry files; Bible §9.1/§9.2). Bible §15.4 bullet 3, §18 item 8. Barrels defeat code-splitting and pull dead modules into the editor first-paint bundle. |
| SC-4 | Grep `select("*")` in repositories/actions except approved admin paths | `scripts/*.mjs` grep gate over `src/lib/repositories/**` + `src/app/**/actions.ts`, with an explicit allowlist of approved admin/full-column paths | new `bun run lint:select-star` (added to `validate`) | **(new, Phase 0)** | Bible §10.2 (Query law) + §15.4 bullet 4, §18 item 9. Directly guards the HIGH `.select("*")` findings (`component-library-repository.ts:530-746`, `workspace-repository.ts:837/908`). Allowlist must be reviewed, not auto-grown. RISK-tied via Phase 4/8 data plans (`10`, `14`). |
| SC-5 | Grep RLS migrations for unwrapped `auth.uid()` / `auth.jwt()` not wrapped by `(select …)` | `scripts/*.mjs` grep gate over `supabase/migrations/**` flagging `auth.uid()`/`auth.jwt()` not inside `(select auth.uid())` / `(select auth.jwt())` | **reuse the existing `bun run prove:rls-initplan`** (the active RLS-initplan remediation gate, migration `…162000`) — extend it to assert "no unwrapped occurrences" rather than adding a parallel gate | **(extend existing, Phase 0/8)** | Bible §10.1 (RLS law) + §15.4 bullet 5, §18 item 10. `prove:rls-initplan` already exists (`_SYNTHESIS.md §1 Data`); this check is its standing form. Cross-ref `22_SECURITY_AND_RLS_THREAT_PLAN.md`. |
| SC-6 | Enforce new tree UIs import `src/components/ui/tree` (no bespoke tree components) | ESLint `no-restricted-syntax` flagging new tree-shaped components that do not import `src/components/ui/tree`, plus a grep gate forbidding new `*Tree.tsx` files that re-implement DFS/find-by-id outside the canonical kernel | `bun run lint` + new `bun run lint:canonical-tree` | **(new, Phase 0; tightened Phase 2)** | Bible §3.3 (Rendering law: one tree renderer), §18 item 1, §15.4 bullet 6. Becomes fully enforceable after Phase 2 unifies the kernel (`08_PHASE_2_TREE_KERNEL_PLAN.md`) and `WorkshopTree`→`Tree` converges. |

**Wiring summary.** All six are authored in **Phase 0** (the guardrail-setup phase). Where a check would break existing code (SC-1 on the residual `react-complex-tree` imports; SC-6 before the kernel unification), it is staged: land the rule only after the blocking cleanup (Q-10 for SC-1; Phase 2 for SC-6 full strictness). Every check is then composed into the **Phase 9 `perf:gate`** aggregate and the CI gated set (`15_VALIDATION_MATRIX.md §3`). Per Q-13 (`19_OPEN_QUESTIONS.md`), CI today runs `build`, `lint:design`, Playwright install, `test:e2e`, `test:e2e:perf` — but **not** these six. They need new CI wiring in Phase 9 (see §5).

---

## 3. The 10-question PR checklist (Bible §17)

A standing **merge-time** checklist. Any PR that touches hot React/Next.js code must answer all ten before it lands. This is the durable form of Bible §17 and is referenced from `18_EXECUTION_PROMPTS.md` and `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` as the per-phase human-review gate.

> **Distinct from `24 §2.3`.** That is the seam-file *pre-edit* checklist (impact analysis + drift check **before** you start editing a RISK-22 seam file). This is the *merge-time* checklist (before the PR lands). Run §24's first if your change touches a seam file; run this one on every hot-path PR regardless.

1. **State ownership** — Is each new value server state (TanStack Query), UI state (Zustand, atomic selector), local edit state (component/hook), or ref-only transient state (`useRef`)? (Bible §2 Law 1.) *Backed by Gate A, §1.*
2. **Data shape** — Is the data normalized? Is there an index? Is the projection pure? *Backed by Gate B, §1.*
3. **Render fan-out** — What re-renders when the user types, expands, selects, drags, or saves? Are the existing `memo` comparators (`branch.tsx:111-156`, `row-table.tsx:86-116`) preserved?
4. **Bundle impact** — Did this add imports to a `"use client"` route/entry file? Did the bundle analyzer (`ANALYZE=true bun run build`) change? *Backed by SC-3.*
5. **Mutation path** — Is the optimistic update scoped? Is rollback safe? Is a full refetch actually necessary, or can it be a scoped reconcile?
6. **DB impact** — Are queries filtered, indexed, explicit-column, RLS-safe, and measured if hot? *Backed by SC-4, SC-5.*
7. **Loading UX** — Is the skeleton shaped like the content? Is the overlay delayed and not masking slow code? (Cross-ref `20_UX_UI_AND_INTERACTION_PLAN.md`.)
8. **Design system** — Did it reuse shared primitives and preserve the design lint rules? *Backed by D-006 duplication lint + SC-6.*
9. **Measurement** — What script / test / profile proves this is not slower? (A named `perf:*` gate or jsdom render-count test; cross-ref `15_VALIDATION_MATRIX.md`, `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md`.)
10. **Rollback** — Can this be reverted without corrupting data or UX state? (Cross-ref the feature-flag/kill-switch rollout in `24 §`.)

---

## 4. The Do-Not-Do banned-patterns list (Bible §18)

All twelve items as one enforceable list. Each is banned unless the PR explicitly documents why the exception is necessary. Where a §2 static check enforces it, the check is named; the relevant risk ID is linked.

| # | Banned pattern (Bible §18) | Static check (§2) | Risk |
|---|---|---|---|
| 1 | Create a new tree component instead of using `src/components/ui/tree.tsx` | **SC-6** | RISK-14 (seam cluster), tree-family duplication |
| 2 | Import `react-complex-tree` in new app/workshop code | **SC-1** (gated on Q-10) | RISK-14; Q-10 |
| 3 | Subscribe to an entire Zustand store in a hot component | **SC-2** | RISK-18 (memory/listener fan-out), render fan-out |
| 4 | Put derived lists/totals/selected objects into React state via `useEffect` | *Human gate — Gate A (§1)* | RISK-12, RISK-16 (per-keystroke recompute / `editableRows` fan-out) |
| 5 | Full-route-refresh for selection-only UI changes | *Human gate — PR Q5/Q10; grep `router.refresh()` (12 files, `_SYNTHESIS.md` correction 3) as advisory* | RISK (router.refresh over-invalidation) |
| 6 | Full-tree-refetch after every scalar row edit unless conflict/security requires it | *Human gate — PR Q5* | RISK-16; Phase 5 (`11`) |
| 7 | Put D3, Three, ExcelJS, proposal export, or inactive AI panels into first-paint editor bundles | *Human gate — PR Q4; analyzer (`ANALYZE=true bun run build`)* | RISK (bundle/first-paint); Phase 7 (`13`) |
| 8 | Add helper barrels / re-export surfaces to hot client entry files | **SC-3** | RISK (bundle bloat); Bible §9.1 |
| 9 | Use `select("*")` in hot repositories/actions | **SC-4** | RISK-20 (cross-tenant leak via over-fetch); Phase 4/8 (`10`,`14`) |
| 10 | Use unwrapped `auth.uid()` / `auth.jwt()` in RLS policies | **SC-5** (extends `prove:rls-initplan`) | RISK-20/RISK-21; `22` |
| 11 | Add root context providers with high-frequency values | *Human gate — PR Q1/Q4; Gate A* | RISK-19 (provider topology), RISK-17 (realtime cost); Phase 7 (`13`) |
| 12 | Treat `useMemo` as architecture (memo over fixing data shape) | *Human gate — Gate A + Gate B (§1)* | RISK-12/RISK-16; "fix data shape first" |

Items 4, 5, 6, 7, 11, 12 have **no clean static check** and are enforced by the §1 human gates and the §3 PR checklist — they are judgments about intent and data shape. Items 1, 2, 3, 8, 9, 10 are statically enforceable via SC-1…SC-6.

---

## 5. How this is enforced

**Adopted as D-023.** Add to `17_DECISION_LOG.md`:

> ## D-023 — Adopt the standing engineering guardrails + PR checklist
> Decision: Adopt the two Pattern-Law merge gates (Law 2 / Law 3, §1), the six static checks SC-1…SC-6 (§2), the 10-question merge-time PR checklist (§3), and the 12-item Do-Not-Do banned-pattern list (§4) as defined in `27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md`. The static checks are authored in Phase 0 and become CI gates in Phase 9; the Law-2/Law-3 gates and the PR checklist are human-review gates referenced from `18_EXECUTION_PROMPTS.md` and `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`.

**Two enforcement classes.**

1. **Static checks → CI gates (Phase 9).** SC-1…SC-6 are authored in **Phase 0** (guardrail setup) and aggregated into the **Phase 9 `perf:gate`** + the CI gated set (`15_VALIDATION_MATRIX.md §3`). Per Q-13, CI presently runs `build`, `lint:design`, Playwright install, `test:e2e`, and `test:e2e:perf` — it does **NOT** run these six. They require **new CI wiring** in Phase 9 (add to `validate` and/or the workflow). SC-5 reuses/extends the existing `prove:rls-initplan`; SC-3/SC-4/SC-6 extend the in-repo guardrail-script surface (`scripts/enforce-app-design-system.mjs` + new `scripts/*.mjs`), siblings of the D-006 duplication lint.

2. **Law-2 / Law-3 gates + PR checklist → human-review gates.** The §1 merge gates and the §3 checklist are answered by the author and verified by the reviewer at merge time. They are referenced as the per-phase completion gate from `18_EXECUTION_PROMPTS.md` (each execution prompt must satisfy them before claiming done) and from `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` (which adds the seam-file pre-edit checklist, §24 §2.3, as the complementary pre-edit gate).

**Note for the register fixer:** add **D-023 (adopt guardrails + PR checklist)** to `17_DECISION_LOG.md` (next free ID after D-020/D-021/D-022).

---

## 6. Cross-reference map

| This doc | Pairs with |
|---|---|
| §1 Gate A/B (Law 2/Law 3) | Bible §2; referenced by `18`, `24` |
| §2 SC-1…SC-6 | Bible §15.4; siblings of D-006 (`12`); aggregated in `15 §3` + Phase 9 `perf:gate` |
| §3 PR checklist | Bible §17; complementary to `24 §2.3` (seam pre-edit) |
| §4 Do-Not-Do | Bible §18; risk IDs in `16`; phase plans `10`/`11`/`13`/`14` |
| §5 D-023 | `17_DECISION_LOG.md`; Q-10, Q-13 (`19`) |
