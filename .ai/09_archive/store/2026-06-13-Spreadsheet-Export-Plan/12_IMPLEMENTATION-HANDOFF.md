# 12 — Implementation Handoff Prompt (Spreadsheet / XLSX Export)

> **What this is.** A **cold-start kickoff prompt** for a future implementation session. Paste the "Kickoff message" block (bottom) as your first message in a fresh session opened at the repo root, or just open this folder and follow it. It assumes **zero memory of the audit conversation** — everything you need is in this folder.
> **Companion skills:** drive planning/execution with `superpowers:writing-plans` + `superpowers:subagent-driven-development` (or `/ce-plan`, `/make-plan`). One task at a time, TDD, commit per task.

---

## 1. Mission

Make Archestimator's estimate-sheet **"Export to spreadsheet / XLSX"** feature (internally **"proposal export"**) *honest, safe, and industry-BOQ-compliant* — **without rebuilding** the (sound) architecture. The work is finishing wired-but-hollow features and reconciling the preview with the file. The full audit + phased plan already exists in this folder; **do not re-audit** — execute it.

Repo: `/Users/philiplewis/archestimator` · stack: Next.js App Router (`runtime=nodejs`), ExcelJS 4.4.0, Supabase/Postgres (RLS, cookie-session client), TanStack Query, Zustand, Vitest. Branch from `main`.

---

## 2. Required reading (in this order — ~20 min)

| Read | For |
|---|---|
| [00_INDEX.md](00_INDEX.md) | Verdict, scorecard, decision list, the second-pass section |
| [08_implementation-plan.md](08_implementation-plan.md) | **The plan you execute** — phases P1→P3, every task with files + acceptance criteria |
| [07_findings-register.md](07_findings-register.md) | The 35 findings each task maps to (F-IDs) |
| [09_target-format-spec.md](09_target-format-spec.md) | **Build P2 format work to this** cell/formula map (don't re-derive from prose) |
| [11_qa-and-decision-addendum.md](11_qa-and-decision-addendum.md) | The pre-start decisions (D0/D7/D8), the manual recalc QA gate, security preconditions |
| [10_data-model-and-migration-design.md](10_data-model-and-migration-design.md) | Only when you reach DB-gated tasks (D1/D4 + typed-column promotion of D3/D5) |
| 01–06 | Reference/context per lens (current-state, BOQ benchmark, UX, perf, security, tabs) — read the one matching the task you're on |

Code you will touch lives in: `src/lib/proposal-export/*`, `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/components/workshop/ProposalExportPreviewDialog.tsx` + wiring in `src/components/workshop/EstimateSheetContent.tsx`. Tests: `tests/vitest/proposal-*.test.ts(x)`.

---

## 3. Pre-flight — decisions to confirm BEFORE coding

Nine decisions (D0–D8) are in [00 §Decisions](00_INDEX.md#decisions-needed-from-the-owner) / [08 §Decision gate](08_implementation-plan.md#decision-gate-resolve-before-p2p3-data-tasks), each with a grounded recommended default. **Two block the very first P1 task and must be confirmed with the owner before P1-T2:**

- **D7 — Preview approach** *(BLOCKS P1-T2)*. Recommended: **Option B — "Contents summary"** (the modal names the sheets the file will contain) over rendering the full Bid Form. Cheaper, honest, no ongoing sync/jank tax.
- **D0 — Primary audience**. Recommended: **client/architect bid document is primary**; the internal Source Breakdown + supplier/confidence/source-IDs become opt-in (`audience=internal`). This makes the safe behavior the default and drives the P1-T9 redaction.

**D8 (multi-tab total)** — recommended **(a) hide the single-tab number** ("All N tabs — total in downloaded Summary"); needs no new infra. **D1–D6** gate P2/P3; their defaults let you proceed under stated assumptions. **Record the chosen answers in `.ai/10_state/decisions.md`** before starting the gated task. If the owner is unavailable, proceed on the recommended defaults and flag them as assumptions in the PR.

---

## 4. Hard constraints (do-not-break list)

1. **Do NOT change the signatures of the three shared repository functions** `getEstimateTabs` / `getEstimateTabTree` / `getProjectEstimateTreeByEstimate` (`src/lib/repositories/workspace-repository.ts`) — they're used well beyond export (workshop page, estimate actions, reusable sources). **Add** new functions instead (e.g. P2-T7's `getEstimateTreesForTabs`).
2. **Model fields are additive only.** Renaming/removing existing `ProposalExport*` fields breaks the preview and all 7 proposal tests. Add, don't rename.
3. **Keep all 7 existing `proposal-*` tests green.** Update an assertion only where behavior *intentionally* changed — and note each such change in the PR.
4. **DB channel is unavailable to agents** (Docker absent + hosted SQL denied). **P1 needs no DB.** For D3/D5, ship the **read-side via existing `metadata: Json` columns** (no migration); only typed-column promotion + D1/D4 are deferred — designs already in [10](10_data-model-and-migration-design.md), application deferred.
5. **Auth:** use `getCurrentUserContext()` (`src/lib/auth/session.ts:31`, nullable) + null-check + `NextResponse.json(401)` **in the handler**. Do NOT use `requireCurrentUserContext()` (it 307-redirects).
6. **Settings security (P2):** `audience` is **server-derived from role, never read from query/body**; numeric rates validated finite within 0–100 → 400; ship expose+enforce together. See [11 §C](11_qa-and-decision-addendum.md).
7. Verify changes in the browser via the **owner's Chrome session** (the workshop dev-auth bypass is disabled; a second `next dev` won't start).

---

## 5. Execution protocol

1. Create a worktree/branch (`superpowers:using-git-worktrees`); copy `.env.local` into a fresh worktree or the dev server bounces to `/login`.
2. For **each task** in [08](08_implementation-plan.md): dispatch a fresh subagent via `superpowers:subagent-driven-development` — write the failing test first (TDD), implement minimally, run the test, commit. The task's "Accept" line + "Test" note are your spec.
3. **One task → one commit.** Run the proposal tests after each and keep them green:
   - **Proposal tests:** `bun run test:dom` (= `vitest run --maxWorkers=1`) — this is the runner for `tests/vitest/proposal-*`. ⚠️ **`bun run test` does NOT run them** (it's `bun test tests/unit`, a different runner/dir, and will look falsely green). Fast inner loop: `bunx vitest run tests/vitest/proposal-`.
   - **Compile/lint gate (run before calling any task/phase done):** `bun run type-check` (`tsc --noEmit`) + `bun run lint` (eslint); `bun run build` (`next build`) for a full check.
   - Route tests mock the repository layer (`tests/vitest/setup.ts`), so they run **without a live DB** — P1 truly needs no DB channel.
4. Before claiming a phase done, run that phase's **Exit criteria** (§6), the compile/lint gate above, and — for P1 — the **manual recalc QA gate** ([11 §A](11_qa-and-decision-addendum.md)).
5. Vercel instant rollback is available; ship P1 behind no flag (changes are strictly safer than current) — but flag the behavior-changers (VAT now in Grand Total, audience redaction) if released incrementally.

---

## 6. What to build, in order

### Phase 1 — Trust, Safety & Presentability *(no DB; ship before broad/client beta)*
Confirm **D7 + D0** first. Then execute (suggested order; see [08 Phase 1](08_implementation-plan.md) for full detail + acceptance):

- **P1-T5** in-handler 401 authz *(F-15)* → **P1-T4** route try/catch + logging + `allSettled` tabs *(F-13, F-25)* → **P1-T1** fetch-then-blob download with error UI *(F-05)* → **P1-T10** export rate limit *(security)* → **P1-T9** presentability: remove beta placeholder + F-01 LABOR disclaimer + minimal client redaction *(F-07/F-01/F-19)* → **P1-T7** CSV/formula-injection defang *(F-18)* → **P1-T6** fix single-tab Summary overflow *(F-16)* → **P1-T2** reconcile preview with file (Contents summary + hide multi-tab single-total + name sheets/F-35) *(F-03/F-04/F-20/F-35; needs D7/D8)* → **P1-T3** modal a11y + legible type *(F-06/F-26)*.
- **P1-T8** verify live RLS — **ops/DB-gated**, do when the DB channel is available.
- **Exit:** preview can't mislead; no corrupt download; 401 fail-closed; rate-limited; injection defanged; **file is client-presentable** (no placeholder, LABOR disclaimer, no default internal leak); a11y passes; **manual recalc QA gate green**; 7 tests + new tests green.

### Phase 2 — Format fidelity & control *(needs D0, D2; D3/D5 read-side via JSONB; D4 contractor-half DB-gated)*
Build to [09](09_target-format-spec.md). Tasks P2-T1 (VAT/contingency totals) · P2-T2+T3 (settings + audience gate, one atomic unit, with §C security) · P2-T4 (title block — Owner/Client DB-free, contractor identity gated) · P2-T5 (hierarchical numbering) · P2-T6 (Cost/SQM via metadata GFA) · P2-T7 (all-tabs DB de-dup via new additive fn + early 413) · P2-T8 (builder unification + formula-column derivation + UUID 400/nosniff/constants). **Exit:** file is numerically/visually comparable to the 10 reference BOQs; settings real; all-tabs efficient; builders unified.

### Phase 3 — Polish & scale *(DB-channel-gated + data)*
P3-T1 real Material/Labor split (D1) · P3-T2 real scope + EXCLUSIONS block (D5) · P3-T3 canonical division order (D6) · P3-T4 formal-bid extras (words/duration/branding/accounting format) · P3-T5 perf (preview worker, revision cache, `maxDuration`, `bench:proposal-workbook` gate, streaming if caps rise). **Exit:** fully formal industry BOQ; fast repeat/large exports; perf regression-guarded.

---

## 7. Verification gates (only a human / live env can close — confirm, don't assume)

1. **Live RLS** (F-17) — `relrowsecurity`, expected `pg_policies`, `FORCE ROW LEVEL SECURITY` on `projects/estimates/estimate_tabs/estimate_nodes/estimate_row_items`.
2. **DB indexes** — `estimate_nodes(estimate_tab_id)`, `estimate_row_items(node_id)`.
3. **Browser UX** — contrast, jank on a large estimate, error-state rendering (owner's Chrome).
4. **Cross-app recalc** — the [11 §A](11_qa-and-decision-addendum.md) checklist in Excel + Google Sheets + LibreOffice. **This is the only check of the feature's core promise; it is a release blocker.**
5. **Vercel runtime** — `maxDuration`/memory defaults; cold-start.

---

## 8. Definition of done (overall)
A P1-complete build is **safe and client-presentable**; a P2-complete build **reads like an industry BOQ and is user-configurable**; a P3-complete build is **fully formal and scale-ready**. Each phase's exit criteria + the manual QA gate are the gate. Don't claim done without running them (evidence before assertions).

---

## 9. Kickoff message (paste into a fresh session at repo root)

```
Implement Phase 1 of the spreadsheet/XLSX export plan.

Read .ai/03_plans/2026-06-13-Spreadsheet-Export-Plan/12_IMPLEMENTATION-HANDOFF.md and follow it.
Execute 08_implementation-plan.md Phase 1 only, task by task, using
superpowers:subagent-driven-development (TDD, one commit per task, keep the 7
proposal-* tests green via `bun run test:dom` — NOT `bun run test`). Gate each task
with `bun run type-check` + `bun run lint`. Build to 09_target-format-spec.md where
format is involved.

Before P1-T2, confirm decisions D7 (preview approach) and D0 (primary audience) with me —
use the recommended defaults (D7=Contents summary, D0=client-primary, D8=hide single-tab
total) if I don't respond, and note them as assumptions.

Hard constraints: don't change the three shared repository function signatures (add new
functions instead); model fields additive only; auth via getCurrentUserContext()+401 in
the handler (not requireCurrentUserContext); P1 needs no DB. Finish with the manual
cross-app recalc QA gate (11 §A) before calling P1 done.
```
