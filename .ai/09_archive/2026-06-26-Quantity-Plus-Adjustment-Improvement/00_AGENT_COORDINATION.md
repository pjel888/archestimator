# 00 — Agent Coordination

## Master `/goal`

**Outcome.** A separate implementation AI must be able to read this plan pack and ship the QTY + Adjustment Improvement without rediscovering requirements, file paths, contracts, or validation procedures.

**Problem.** The Archestimator estimate sheet currently has a per-row percentage-based `adjustment` column bound to SUBTOTAL. The business reality is that field crews and estimators think of contingency on a quantity basis first ("I need 100 m², plus 20 m² of waste") and only second as a money percentage on the subtotal. The current column conflates the two and offers no inline expression surface.

**Intended feature behavior.**

1. Re-order the per-row columns to `Qty → Contingency → Subtotal → Misc Cost → Total Item Cost`. Rename the old `adjustment` column header to `Contingency`. Re-bind its meaning to QTY: it expresses the contingency portion of a quantity expression `base + contingency`.
2. Introduce an inline `QTY + N` parser so a user can type `100 + 20` in the QTY cell. The cell renders the total (`120`), shows a small editable breakdown chip in its upper-right (`100 + 20`), and the adjacent Contingency column reflects the contingency as a percentage (`20%`).
3. Preserve opt-in: a plain numeric entry (no `+`) leaves the row in single-quantity mode with no chip and no contingency percentage.
4. Add a NEW totals-area percentage-based **Adjustment** row (mode `contingency | discount`, math bound to SUBTOTAL) that mirrors the legacy per-row percentage adjustment behavior at estimate level.
5. Update persistence, server actions, Excel export, and Realtime broadcast accordingly.

**Planning scope.** Documentation only. No code, tests, migrations, schemas, Storybook stories, or provider state may be modified by this plan pack.

**Non-goals.**

- Do not introduce row reordering (covered by sister plan `2026-06-26-Reorganize-Existing-Estimate-Row-Items`).
- Do not redesign the Materials cell, Misc Cost cell, or Total Item Cost cell rendering.
- Do not change the project-level contingency/VAT model in `proposal-export` beyond what is required to keep exports consistent with the new column meaning.
- Do not introduce a new tax engine, currency engine, or multi-currency support.
- Do not redesign authentication or sharing. The new `estimate_sheet_adjustments` table still requires explicit RLS and action-level edit checks.
- Do not implement the surplus row itself. Treat it as a separate workstream; this plan resolves placement by rendering the new Adjustment row in the totals area until a surplus row exists.

**Required codebase analysis.** Column model, editable-row model, row-table rendering, server actions, RPC layer, estimate row repository, proposal export, Realtime broadcast, Supabase schema for `estimate_row_items`. All verified in `03_SOURCE_AND_CODEBASE_AUDIT.md`.

**Required specialist workstreams.** Product/scope, frontend/UX, accessibility, architecture, data/DB/API, security, performance, testing, rollout, blast-radius, adversarial review. All addressed in the numbered documents.

**Implementation-readiness criteria.** Every requirement traces to a task, a test, a file path, and an acceptance criterion. Every architectural decision lists considered alternatives. Every risk has a mitigation. No unresolved critical contradiction.

**Validation criteria.** Scenario contract S1–S12 in `02_FEATURE_BRIEF_AND_SCOPE.md`, each with binary observable, real surface, and test ID.

**Final deliverables.** This plan pack (20 documents).

## Agent ledger

| Agent / goal | Scope | Dependencies | Current work | Findings | Decisions | Conflicts | Validation | Status |
|---|---|---|---|---|---|---|---|---|
| Lead coordinator (Sisyphus) | Synthesize plan pack; coordinate specialist passes | None | Plan pack authoring + improvement integration | See audit doc + Loop 6 | See decisions doc | None | Self-review + native review lanes | Complete |
| Explore agent `bg_bae73cf1` | Column model + types | None | (timed out 30m) | — | — | — | — | Failed (timeout) — lead re-read files directly |
| Explore agent `bg_e4db0612` | Surplus row + adjustment math + persistence | None | (timed out 30m) | — | — | — | — | Failed (timeout) — lead re-read files directly |
| Explore agent `bg_c332c0b5` | Editable cell patterns + number parsing | None | (timed out 30m) | — | — | — | — | Failed (timeout) — lead re-read files directly |
| Adversarial reviewer (simulated) | Critique plan for gaps, contradictions, vague tasks | Plan v1 | Two critique cycles | See `17_FINAL_READINESS_REVIEW.md` | — | — | — | Inline passes captured in `17_FINAL_READINESS_REVIEW.md` |
| Independent verifier (simulated) | Compare plan vs FEATURE BRIEF and codebase | Final plan | Final pass | See `17_FINAL_READINESS_REVIEW.md` | — | — | — | Inline |
| Native product reviewer | Product strategy, scope, owner blockers | Plan v2 | Read-only review | Found owner-blocker and storage contradictions | Use per-estimate first pass | None | Integrated in Loop 6 | Complete |
| Native design reviewer | UX, UI, accessibility | Plan v2 | Read-only review | Found chip behavior/editability/focus gaps | Chip-active Contingency read-only | None | Integrated in Loop 6 | Complete |
| Native feasibility reviewer | Architecture/data/implementation readiness | Plan v2 | Read-only review | Found RPC/history, selector, export, rollback gaps | Add persistence plumbing phase | None | Integrated in Loop 6 | Complete |
| Native security reviewer | Validation, auth, RLS, rollback safety | Plan v2 | Read-only review | Found server-validation and adjustment RLS gaps | Strict parser; write RLS + auth tasks | None | Integrated in Loop 6 | Complete |
| Native coherence reviewer | Cross-document consistency | Plan v2 | Read-only review | Found stale counts and contradictions | Normalize phase/count/readiness language | None | Integrated in Loop 6 | Complete |
| Native verifier | Independent final check | Corrected plan pack | Read-only verification | Confirmed core decisions; PARTIAL only because `17_FINAL_READINESS_REVIEW.md` was stale before rewrite | Rewrite final readiness and rerun mechanical stale checks | None | Integrated in Loop 7 | Complete |

**Native vs simulated.** The initial authoring pass had failed explore agents and simulated review. The continuation improvement pass used six native read-only review lanes (product, design, feasibility, security, coherence, verifier). Their findings are recorded in Loop 6 and integrated into the revised plan pack.

## Skills discovered and used

| Skill | Source | Why relevant | Used? |
|---|---|---|---|
| `archestimator-plan-pack` | `.agents/skills/archestimator-plan-pack/SKILL.md` | Canonical structure for dated `.ai/03_plans/` plan packs with LOOP_LEDGER | Yes (folder + ledger) |
| `ce-plan` | `.claude/skills/ce-plan/SKILL.md` | Structured plan synthesis | Yes (lightweight, in-session) |
| `Explore Codebase` | `.agents/skills/explore-codebase/SKILL.md` | Codebase discovery | Attempted; explore agents timed out, lead reverted to direct reads |
| `gitnexus-exploring` | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` | Optional graph exploration | Not used (proportional policy; narrow scope served by direct reads) |
| `ce-doc-review` | `.agents/skills/ce-doc-review/SKILL.md` | Plan-document adversarial review | Used as the framing for the simulated adversarial pass |
| `supabase-postgres-best-practices` | `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Migration safety patterns | Consulted for migration plan |
| `verification-before-completion` | `.agents/skills/verification-before-completion/SKILL.md` | Plan must specify exact verification commands | Used in `12_TEST_AND_VALIDATION_STRATEGY.md` |
| `tdd` / `tdd-workflow` | user skills | Tests must be RED → GREEN | Used in implementation plan + test strategy |
| `frontend` / `react-patterns` | builtin / user skills | UI discipline for the chip and column changes | Consulted for `05_UX_UI_ACCESSIBILITY_PLAN.md` and `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |

No skill was fabricated. No new reusable skill was created (existing skills cover the planning surface).

## Concurrent-repository safety

- Branch at authoring: `feat/publisher-page`. Many files in `.ai/03_plans/2026-06-25-Publisher-Page/` are modified by another concurrent effort.
- This plan pack writes **only** inside `.ai/03_plans/2026-06-26-Quantity-Plus-Adjustment-Improvement/`. The folder existed as an empty placeholder before this run.
- No files outside the folder were created, modified, or deleted.
- No Git operations (commit, push, branch, reset, checkout, history rewrite) were performed.
- No destructive commands were run.

## Stop conditions

- Plan pack complete: all 20 documents written.
- Two simulated adversarial review cycles complete with all internally resolvable findings addressed.
- Native read-only review lanes complete with findings integrated.
- Fresh native verifier pass complete; stale readiness findings resolved by rewriting `17_FINAL_READINESS_REVIEW.md`.
- Owner-delegated decisions resolved in the improvement pass: totals-area placement before surplus row exists, strict QTY grammar, chip positioning, chip edit semantics, display precision, Contingency editability, and estimate-level Adjustment storage. No owner-answer blocker remains.
