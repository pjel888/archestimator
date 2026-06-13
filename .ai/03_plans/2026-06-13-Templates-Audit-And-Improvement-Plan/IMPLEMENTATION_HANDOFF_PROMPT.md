# Implementation Handoff Prompt — Templates Feature

**Purpose:** Paste this into a fresh implementation agent (or a `/goal`) when you're ready to build. It is the execution contract for the audit + plan in this folder. It points into the plan docs — it does **not** duplicate them. Read the docs it names; they are authoritative.

> **The short pointer (for a `/goal` or a quick handoff):**
> *"Implement the Templates improvement plan at `.ai/03_plans/2026-06-13-Templates-Audit-And-Improvement-Plan/`. Read `IMPLEMENTATION_HANDOFF_PROMPT.md` first, then `16` (must-fix), `12/13/14` (specs), `08` (units), `06` (blast radius). Start with the first slice (U1 + U1b + U4 + U18/U19) — all local, no provider action. Honor the binding rules and the do-not-do list. Run the validation gates per unit; do not claim provider/manual proof from local checks."*

---

## 0. What you are implementing

The Templates feature audit found that the **"Projects Auto-Added To Templates"** capability is browse-only and partly broken in the live environment, plus a set of UX/perf/data-coherence issues. This plan fixes them in sequenced units. Custom templates already work; **do not regress them.**

**You are the implementation agent.** Produce working, validated, regression-free code — not more planning documents. The plan is dated 2026-06-13; **live code wins** over any drifted citation in the docs (the audit was honest about which line numbers are approximate).

---

## 1. Mandatory reading order (before any code)

1. This file.
2. `00_INDEX.md` — bottom line, decisions, remediation sequence.
3. **`16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md`** — the must-fix-before-implementation list. **This is binding** (it caught a P0 in the U2 design and a P0-test in U4). Read it before touching U1/U2/U4.
4. `12_FIRST_SLICE_IMPLEMENTATION_SPEC.md` — turnkey U1 + U1b + U4 (already corrected per doc 16).
5. `08_SOLUTIONS_AND_OPTIMIZATIONS.md` — all units U1–U22, phased, with files/approach/tests.
6. `06_BLAST_RADIUS_ANALYSIS.md` — the ⟳ 3rd-pass refresh (authoritative caller maps; U3/U4 safety verdicts).
7. The per-domain spec for the unit you're building: `13` (U2 insert path), `14` (D-A apply/rollback runbook), `17` (U12/U13/U3 frontend build spec).
8. `10_STRATEGY_AND_SUCCESS_METRICS.md` §4 — the Definition of Done metrics. `11` — the traceability matrix + dependency graph + phase gates.
9. Repo governance: `AGENTS.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `DESIGN.md`.

---

## 2. Binding decisions (do not re-open)

- **D-C — DECIDED:** project-derived sources appear **only** in the in-estimate Templates panel; the templates **library** route (`/workshop/library/templates`) shows custom templates only (+ future supplier templates). Implemented by removal in **U3**.
- **D-A — OWNER-GATED:** applying the `estimate_tabs` migration to live (`supabase/migrations/20260612094734_estimate_tabs_foundation.sql`) requires explicit owner authorization. The U1 fallback makes the app correct **without** it, so it is not a blocker. Follow `14` when authorized.
- **D-B — OWNER DECISION:** build the project-source insert path (U2) per `13`, **or** scope project sources to "browse + save-as-template only" and remove the dead seams. Do not build U2 until D-B = "build".
- **U22 before U2/U4:** if supplier templates are on the near roadmap, run the supplier-templates data-model spike (`08` U22 / `10` §2b) **before** U2's insert-RPC migration and U4's hardening — they currently assume `source_workspace_id = target_workspace_id`.

**Recommended first slice (start here — fully local, no provider action, no D-A/D-B dependency): U1 + U1b + U4 + U6/U23 + U18/U19.**
This fixes the live outline bug (U1), routes all transient errors through the **existing toast** so nothing leaks or shifts the layout (U1b/A4), closes the security gap (U4), and makes project-source exploration **spinner-free** (U6 cache + U23 prefetch/skeleton-in-place).

---

## 3. Binding correctness rules (from `16` — violating any is a failed iteration)

- **U2-1 (P0):** the new insert RPC's inner copy runs **RLS-exempt** (non-DEFINER inner under a SECURITY DEFINER wrapper runs as `postgres`). The source read MUST be guarded by an explicit `if not public.can_access_estimate(source_estimate_id) then raise`. **Never rely on RLS for source authorization in the DEFINER chain.**
- **U4-1 (P0-test):** adding `assertCanEditEstimate` makes `estimate-node-reorder-action.test.ts:830-913` fail — **update** those tests (mock `can_edit_estimate→{data:true}`, expect 2 ordered rpc calls). They do not "stay green."
- **U4-4 (P1):** the U4 hardening migration must `create or replace` the **live (no-tab) RPC body**, swapping only the gate line. **Do NOT copy the foundation migration's RPC body** — it references `estimate_tab_id` columns absent on live and will fail to apply.
- **U1-1 (P1):** do **not** add the missing-schema fallback to `getDefaultEstimateTab`; it breaks its caller's existing throw-based legacy fallback. Only `getEstimateTabs` + `getEstimateTabTree` get the fallback — and edit the `workspace-repository.ts:1731` `getEstimateTabTree`, not the dead duplicate at `estimate-repository.ts:186`.
- **U1-RO (P1):** the synthetic-"Main" fallback is **read-only**. `getEstimateTabs` has 6 tab-CRUD mutation callers; under schema-missing they must raise "tabs unavailable", not operate on a synthetic tab.
- **U4-2 / U2-5 (P1):** put `assertCanEditEstimate` at the **very top** of `wrapEstimateAreaAndInsertTemplate` (before the pre-insert create/reorder mutations), or a denied viewer leaves an orphan group.
- **U2-2 (P1):** bulk inserts must mint a **stable per-source-unit `correlation_id`** (idempotency).
- **U14-1/U14-2 (P1):** rollback order is load-bearing — drop tab-scoped constraints/FK first; re-adding the estimate-scoped unique constraint can be unsatisfiable once multi-tab data exists (see `14` §5).
- **U1b (P1):** the raw-error leak is in `component-library/index.tsx` (`:808/:982/:1747/:1776/:1110`), **not** `TemplatesBrowseManager` (which U3 deletes).
- **Transient feedback (owner directive):** surface errors through the **existing `useToast()`** (`src/components/ui/toast.tsx` — already used by `EstimateTabStrip`/`EstimateSheetTree`; do not build a new toaster), **never** inline banners and **never** raw `{code…}`; action confirmations → `toast.success`. **Loading = in-place skeleton, never a spinner/loading screen** — prefetch-on-hover makes the common path instant. Nothing may shift the panel layout. ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U1b/U6/U23, [17](17_FRONTEND_BUILD_SPEC.md) A4.)

---

## 4. Execution sequence (phases — `08`/`11` are authoritative)

| Phase | Units | Gate to exit |
|---|---|---|
| **0 — Stabilize (now, local)** | U1, U1b, U4 (app-layer) | live outline 0×500; no raw error; viewer-denied insert (app); integration test on unmocked outline path |
| **Perf (now, local)** | U18, U19 (+U20/U21 optional) | panel interactive < ~800ms p95 warm; lite-loader round-trips bounded |
| **Library scope (now, local)** | U3 (D-C) | library route shows custom only; in-estimate unchanged; `template-gallery.test.tsx` + `template-browse-project-sources.test.tsx` updated |
| **Owner-gated** | D-A apply (`14`); U4 RPC migration | P1–P5 verification SQL pass; coupled-surface regression green |
| **Complete capability (D-B)** | U22 spike → U2 → U3 parity | denials 4–7 proven (RPC-level); provenance recorded |
| **Coherence + polish** | U5–U11, U12–U15 (`17`) | cross-surface freshness; `lint:design-system` green |
| **Tests/tooling** | U16, U17 | denials 1–8 tested; e2e un-skipped; graph reliable |

Work the inner loop per unit: implement → run the unit's validation gates → read every failure fully → root-cause → fix → re-run. A failing gate is the next task, not a reason to move on.

---

## 5. Validation gates (exact commands)

- Per unit / per phase exit: `bun run validate` (type-check + lint + lint:design-system + lint:design + test + test:dom) and `bun run build`.
- RLS / denial proofs: `node scripts/prove-estimate-tabs-postgres.mjs` (Homebrew Postgres 16, no Docker) — extend it for the new denial scenarios (U2/U4).
- Perf tripwire: `bunx vitest run tests/vitest/perf --maxWorkers=1` (do not parallelize — the serial config is load-bearing).
- e2e (env-gated, seed via service-role fixtures): the templates/tabs Playwright specs.
- **Definition of green:** zero NEW failures vs the documented pre-existing baseline (`.ai/10_state/current-state.md` / `known-issues.md`); all new tests pass; log exit codes.

---

## 6. Provider / manual-proof boundary (owner-gated — pause points)

- **Linked migration apply + type regen:** `npx supabase@2.98.2 db push` · `migration list` · `gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts`. Owner-authorized only. Project boundary: **`ebxxqidacheyapmmzavr` only — never SlateCamp or any other provider project.**
- **`bun run launch:verify-hosted-export`** against production — owner-gated.
- **No service-role / admin client** for project-source reads or the new insert path — RLS-scoped user client only.
- **Workshop verification** runs through the user's authenticated Chrome session (dev-auth bypass is disabled; background tabs suspend the workshop; fresh worktrees need `.env.local` copied first).
- Label every claim `local-only` / `provider-proven` / `manual-proof-pending`. Do not claim provider/manual proof from local checks.

---

## 7. Do-not-do (hard rules)

- Do NOT rely on RLS for source authorization inside the SECURITY DEFINER chain (U2-1).
- Do NOT copy the foundation migration's RPC body onto the live schema (U4-4).
- Do NOT add the fallback to `getDefaultEstimateTab` or let mutation callers act on the synthetic tab (U1-1 / U1-RO).
- Do NOT re-introduce a Projects section into the library route (D-C).
- Do NOT use a service-role/admin client for project-source reads or the new insert path.
- Do NOT run provider-mutating commands (db push, type regen, deploy, hosted-export verify) without explicit owner authorization, and only against `ebxxqidacheyapmmzavr`.
- Do NOT parallelize the vitest perf suite, or weaken/delete an existing assertion to get green.
- Do NOT expose project-source insertion before its denial scenarios (4–7) are proven.
- Do NOT render inline error banners or raw `{code…}`/`error.message` in the panel, and do NOT use a spinner / centered loading screen for tree expansion — errors go to the existing toast; loading is in-place skeleton (no layout shift).

---

## 8. Definition of done & closeout

- Every unit you build meets its `08` Definition of Done with command-output evidence; the `10` §4 success metrics are met or honestly marked `manual-proof-pending`.
- Maintain a run ledger in `.ai/05_logs/2026-06-13-templates-implementation-ledger.md` (phase, iteration, changes, gates + exit codes, RTM rows flipped, next action). Commit in small, phase-scoped increments on a feature branch.
- On completion: update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` with the shipped reality, then archive this plan folder to `.ai/09_archive/store/2026-06-13-Templates-Audit-And-Improvement-Plan/` (the canonical archive home), per the project's plan-lifecycle convention. Do not archive until the stop conditions hold.
- If any stop-condition item is unmet, do not claim completion — state what's missing and continue the loop. Honesty about an incomplete state is acceptable; a false completion claim is not.
