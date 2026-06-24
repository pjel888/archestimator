# 13 — Plan Audit and Scorecard

**Audit date**: 2026-06-24
**Auditor**: Sisyphus (lead planning architect)
**Scope**: Audit and improve every document in this plan pack per `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md`.
**Mode**: Documentation-only. Zero production code, tests, migrations, infrastructure, or config changes.

---

## 1. Purpose

This document is the **linchpin** of the improvement pass. It:

1. Inventories every document in the pack.
2. Scores each document on three categories (Strategy, Document Quality, Implementation Readiness) from 1–100.
3. Identifies major gaps, minor gaps, contradictions, and required decisions.
4. Maps each gap to a concrete improvement (revision of an existing doc or creation of a new doc).
5. Defines acceptance criteria for the improvement pass itself.
6. Carries the consolidated **requirements traceability matrix** (finding → phase → test → acceptance criterion).

Specialist agents use this document as their scope contract. Adversarial and final-verification agents use it as the baseline to challenge and re-score.

---

## 2. Document Inventory

Path prefix: `.ai/03_plans/2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis/`

| # | File | Size | Purpose | Authority |
|---|---|---|---|---|
| 00 | `00-README.md` | 10.8 KB | Executive summary, critical risks, finding counts, methodology, limitations | Executive summary; entry point |
| 01 | `01-SYSTEM-MAP.md` | 11.1 KB | Component hierarchy, data ownership, file inventory, Mermaid diagrams | Architectural map |
| 02 | `02-BEHAVIOR-INVENTORY.md` | 16.8 KB | Every CRUD + non-CRUD behavior with trigger/handler/state/network/persistence | Behavioral catalog |
| 03 | `03-CRUD-AUDIT.md` | 13.5 KB | Create/Read/Rename/Delete/Move lifecycle analysis | CRUD authority |
| 04 | `04-NON-CRUD-INTERACTION-AUDIT.md` | 10.9 KB | Selection, expand, keyboard, focus, context menu, scroll, DnD, routing, loading | Interaction catalog |
| 05 | `05-UX-UI-ACCESSIBILITY-AUDIT.md` | 8.1 KB | Visual consistency, edit-mode consistency, ARIA, keyboard, screen reader | UX/a11y authority |
| 06 | `06-STATE-NETWORK-DATA-AUDIT.md` | 9.5 KB | State model, state machine, query/mutation inventory, race conditions, persistence, data integrity, authorization | State/network authority |
| 07 | `07-PERFORMANCE-AUDIT.md` | 7.1 KB | Render analysis, algorithmic complexity, network, large-tree risks, drag perf, measurement plan | Performance authority |
| 08 | `08-EDGE-CASE-AND-TEST-MATRIX.md` | 13.6 KB | 60 edge-case scenarios with priority, current coverage, gaps | Test matrix authority |
| 09 | `09-PRIORITIZED-FINDINGS.md` | 30.9 KB | 27 formal findings with severity, evidence, root cause, recommended correction | Findings authority |
| 10 | `10-IMPLEMENTATION-PLAN.md` | 10.5 KB | 8 phases, dependency order, effort estimates, definition of done | Implementation authority |
| 11 | `11-VALIDATION-PLAN.md` | 8.8 KB | Static, unit, integration, e2e, a11y, visual, network, profile, large-data, failure, concurrency | Validation authority |
| 12 | `12-OPEN-QUESTIONS-AND-DECISIONS.md` | 13.4 KB | 25 product/UX decisions with recommendations | Decision authority |

**Inventory result**: 13 documents, ~175 KB total, no duplicates, no obsolete docs, no orphaned references. Methodology disclosed in `00-README.md` §8 (static source analysis only).

---

## 3. Initial Scoring (Phase 2)

Scoring rubric per `Improve-Plan-Prompt.md` §PHASE 2. Categories scored 1–100.

### 3.1 Per-document scores

| Doc | Strategy | Doc Quality | Impl Readiness | Notes |
|---|---|---|---|---|
| 00-README | 80 | 88 | 75 | Strong exec summary; missing user/persona/success-metric framing |
| 01-SYSTEM-MAP | 72 | 86 | 80 | Current-state architecture excellent; no explicit target-state diagram |
| 02-BEHAVIOR-INVENTORY | 76 | 88 | 82 | Comprehensive behavior coverage; no failure-mode annotations per behavior |
| 03-CRUD-AUDIT | 76 | 90 | 85 | Lifecycle analysis excellent; missing per-CRUD acceptance criteria |
| 04-NON-CRUD-INTERACTION | 76 | 88 | 82 | Strong on interaction catalog; keyboard a11y covered; mobile interactions absent |
| 05-UX-UI-ACCESSIBILITY | 78 | 85 | 76 | A11y coverage solid; mobile strategy (F-20) thin; no visual QA bar defined |
| 06-STATE-NETWORK-DATA | 76 | 88 | 80 | Race conditions well-mapped; network retries/timeouts/idempotency not covered |
| 07-PERFORMANCE | 78 | 85 | 74 | Good analysis; no explicit performance budget; no measurement baseline |
| 08-EDGE-CASE-TEST-MATRIX | 80 | 90 | 85 | 60 scenarios; gaps mapped to findings; no test owner assignment |
| 09-PRIORITIZED-FINDINGS | 82 | 92 | 76 | Excellent evidence + repro; **no owner / deadline / acceptance per finding** |
| 10-IMPLEMENTATION-PLAN | 78 | 84 | 70 | Phased plan solid; **no feature flags, no staged rollout, no migration plan, no per-phase exit criteria** |
| 11-VALIDATION-PLAN | 78 | 85 | 80 | Coverage solid; network/idempotency/concurrency test coverage light |
| 12-OPEN-QUESTIONS | 82 | 90 | 74 | Recommendations strong; **no decision deadlines, no default-if-no-answer** |

### 3.2 Pack-level weighted score

Weights: Strategy 30%, Document Quality 35%, Implementation Readiness 35%.

| Category | Weighted | Ceiling rationale |
|---|---|---|
| Strategy | **78** | Lacking user/persona definitions, success metrics, business framing |
| Document Quality | **88** | Excellent evidence; minor cross-ref gaps |
| Implementation Readiness | **77** | Missing migration plan, rollout plan, threat model, owner assignments |
| **Overall** | **~81** | Self-assessed "B+" in 00-README is consistent |

**Score is not 100 because** (per `Improve-Plan-Prompt.md` line 119): unresolved critical assumptions remain (Q-06, Q-11, Q-14, Q-19, Q-20, Q-22 decisions), migration plan absent, rollout plan absent, threat model absent, no runtime verification, no migration audit.

---

## 4. Major Gaps

Each gap is mapped to a concrete improvement (Revise existing doc / Create new doc).

| ID | Gap | Improvement | Owner agent | Target doc |
|---|---|---|---|---|
| G-01 | Findings lack owners, deadlines, acceptance criteria | Revise: append `Owner / Decision deadline / Acceptance criterion` per finding | Wave 1 · A1 | `09-PRIORITIZED-FINDINGS.md` (append-only) |
| G-02 | No threat model for auth surface (F-19), share-token publication, viewer-role escalation | Create new | Wave 1 · A4 | `14-THREAT-MODEL.md` |
| G-03 | No risk register with severity × probability × owner × mitigation × deadline | Create new | Wave 1 · A5 | `15-RISK-REGISTER.md` |
| G-04 | No data migration plan for F-06 (RPC output change) + F-04 (sort_order integer → numeric) + F-18 (server sort scheme) | Create new | Wave 1 · A6 | `16-DATA-MIGRATION-PLAN.md` |
| G-05 | No rollout / feature-flag / kill-switch / rollback runbook | Revise: append Phase 0.5 (release gates) + new rollout section | Wave 1 · A2 | `10-IMPLEMENTATION-PLAN.md` (append) |
| G-06 | No decision deadlines on 6 open questions needing Philip | Revise: append `Decision deadline / Default if no answer` per question | Wave 1 · A3 | `12-OPEN-QUESTIONS-AND-DECISIONS.md` (append) |
| G-07 | No requirements traceability matrix (finding → phase → test → acceptance) | Inline in this doc (§8 below) | Lead (this doc) | `13-PLAN-AUDIT-AND-SCORECARD.md` §8 |
| G-08 | No independent adversarial review | Create new | Wave 2 · B1 | `17-ADVERSARIAL-REVIEW.md` |
| G-09 | No independent final verification + rescoring | Create new | Wave 2 · B2 | `18-FINAL-VERIFICATION-AND-RESCORING.md` |
| G-10 | No explicit users / roles / personas | Inline in this doc (§5 below) | Lead (this doc) | `13-PLAN-AUDIT-AND-SCORECARD.md` §5 |
| G-11 | No success metrics for the feature | Inline in this doc (§6 below) | Lead (this doc) | `13-PLAN-AUDIT-AND-SCORECARD.md` §6 |
| G-12 | No performance budget | Inline in this doc (§7 below) | Lead (this doc) | `13-PLAN-AUDIT-AND-SCORECARD.md` §7 |

---

## 5. Users, Roles, Personas (closes G-10)

The Estimate Sheet Tree Sidebar serves four user archetypes. CRUD affordances and validation gates differ per role.

| Role | Source of truth | Can edit tree? | Can view? | Primary journey |
|---|---|---|---|---|
| **Owner** | `project_members.role = 'owner'` | Yes | Yes | Build estimate, publish proposal, approve revisions |
| **Editor** | `project_members.role = 'editor'` | Yes (gated by `assertCanEditEstimate`) | Yes | Build/mutate estimate structure |
| **Viewer** | `project_members.role = 'viewer'` | No | Yes | Review proposal, leave comments |
| **Public recipient** | `project_publications` + `shared_link_recipients` (hashed token) | No | Yes (publication snapshot) | Receive proposal, comment, decide |

**Role-mutation enforcement point**: server action `assertCanEditEstimate(supabase, estimateId)` in `src/lib/estimates/permissions.ts`. F-19 flags that 5 of 6 tree-mutation actions skip this assertion.

**Implications for plan**:
- All CRUD affordances in the sidebar must respect `canEditEstimate === false` (currently does not — Q-19).
- Public share variant (`disableRouteSync === true`) must hide CRUD entirely (Q-19, F-20 fix scope).
- Viewer-role users must receive clean 403, not raw RLS errors (F-19 fix scope).

---

## 6. Success Metrics (closes G-11)

The feature ships when these objective, measurable gates pass.

| Category | Metric | Target | Source |
|---|---|---|---|
| **Correctness** | P1 findings fixed | 5/5 (F-01, F-02, F-06, F-11, F-19) | `09-PRIORITIZED-FINDINGS.md` |
| **Correctness** | P2 findings fixed | ≥10/13 | `09-PRIORITIZED-FINDINGS.md` |
| **A11y** | WCAG 2.1 SC 2.5.7 (Drag Movements) compliance | Keyboard DnD alt shipped + axe-core clean | F-11, F-12 |
| **Performance** | Sidebar render budget on P50 tree (50 nodes) | ≤16 ms per prop change | New (§7 below) |
| **Performance** | Sidebar render budget on P95 tree (1000 nodes) | ≤100 ms initial, ≤16 ms per prop change | New (§7 below) |
| **Performance** | Reorder payload size, 30-sibling move | ≤2 UPDATE rows (not 30) | F-04 |
| **Reliability** | Race-condition scenarios (EC-006, EC-007, EC-013, EC-014) | All pass with RED→GREEN proof | `08-EDGE-CASE-AND-TEST-MATRIX.md` |
| **Security** | Tree-mutation actions calling `assertCanEditEstimate` | 6/6 (currently 1/6) | F-19 |
| **Regression** | Pre-existing vitest + bun test + Playwright suites | 100% green, zero skips added | `bun run validate` |
| **Launch gate** | Phase 0+1+2+3 shipped | All tasks complete, DoD met per phase | `10-IMPLEMENTATION-PLAN.md` |

---

## 7. Performance Budget (closes G-12)

| Operation | P50 (50 nodes, 5 row items/node) | P95 (1000 nodes, 10 row items/node) | Notes |
|---|---|---|---|
| Initial render (SSR-seeded) | ≤30 ms | ≤100 ms | `localNodes` initialization |
| Prop diff → `syncLocalNodesFromProps` | ≤16 ms | ≤16 ms | After F-02 fix: structure-only signature |
| Reorder payload (single move, 30 siblings) | ≤2 rows | ≤2 rows | After F-04 fix: fractional sortOrder |
| Optimistic create → UI echo | ≤16 ms | ≤16 ms | Includes scrollIntoView (F-25) |
| Rename commit round-trip (local) | ≤200 ms | ≤200 ms | Server latency not in budget |
| Delete cascade round-trip (local, 10-child tree) | ≤400 ms | ≤800 ms | After F-03 fix: single refresh |

**Measurement baseline required before Phase 2 ships**: capture current-state numbers via the plan in `07-PERFORMANCE-AUDIT.md` to prove the budget is met (or violated) by each fix.

---

## 8. Requirements Traceability Matrix (closes G-07)

Every P1 finding maps to: implementation phase → required tests → acceptance criterion.

| Finding | Phase | Required tests (file + id) | Acceptance criterion |
|---|---|---|---|
| **F-01** Optimistic+Zustand race | P3.1 | `tests/vitest/estimate-sheet-tree-create-race.test.tsx` (EC-006) | "Create then change selection → server responds → selection preserved" passes |
| **F-02** Signature over-eager | P2.1 | `tests/vitest/estimate-tree-content-signature.test.ts` (NEW) | Row-only field edit does NOT trigger `syncLocalNodesFromProps` |
| **F-06** Client-projected delete IDs | P1.2 | `tests/vitest/estimate-tree-delete-cascade.test.ts` (EC-022) + `supabase/migrations/*` SQL test | Server RPC returns authoritative `deletedNodeIds`; client uses server values |
| **F-11** No keyboard DnD | P5.1 | `e2e/estimate-tree-keyboard-dnd.spec.ts` (EC-040) | Keyboard-only user can move a node via Ctrl+X / Ctrl+V or Shift+Arrow |
| **F-19** Missing assertCanEditEstimate | P1.1 | `tests/vitest/estimate-tree-permission-gate.test.ts` (EC-052) | All 5 actions reject viewer-role with clean 403 before RPC call |

**P2 traceability** is inlined into each finding in `09-PRIORITIZED-FINDINGS.md` (revised by Wave 1 · A1).

---

## 9. Contradictions and Conflicts Audit

| Conflict | Location | Resolution |
|---|---|---|
| Client appends optimistic node at end (`insertLocalEstimateTreeNode`); server uses `maxSiblingSortOrder + 1` (also end). Both consistent. | F-18 evidence | No contradiction in placement; **contradiction is in sort scheme** (client multiples-of-10 vs server consecutive +1). F-18 fix resolves. |
| `validateEstimateTreeHierarchy` exists but is a no-op since P6 unification. | F-10 evidence | Intentional: invariants moved to DB RPCs. **Audit required** (P1.3) to confirm each RPC enforces them. Not a doc contradiction; a code-coverage gap. |
| Q-12 recommendation says "drag-hover expand YES, 500ms" but F-14 reports current behavior as NO hover-expand. | Q-12 vs F-14 | Consistent: Q-12 is the *target*, F-14 is the *current-state gap*. No doc fix needed; P6.2 closes the gap. |
| 00-README §3 says "5 P1-severity issues" and §4 says "P1 count = 5" with matching IDs. Consistent. | — | No contradiction. |
| 09 §"Severity Summary" lists 13 P2 IDs but `00-README` §4 also lists 13 with the same IDs. Consistent. | — | No contradiction. |

**No unresolved cross-document contradictions found.** All numeric and ID references reconcile across `00-README`, `09-PRIORITIZED-FINDINGS`, and `12-OPEN-QUESTIONS`.

---

## 10. Required Decisions (Philip-owned)

Six questions block specific implementation phases. Each needs a decision deadline and a default-if-no-answer so implementation is not gated indefinitely.

| Question | Blocks phase | Default if no answer by deadline | Recommended deadline |
|---|---|---|---|
| Q-06 Escape on new unsaved row | P3 (race) | Cancel rename AND rollback optimistic node | 2026-06-27 (3 days) |
| Q-11 Delete undo | Post-launch | Defer to post-launch (no v1 undo) | 2026-06-30 (6 days) |
| Q-14 Expansion persists in localStorage | P6.6 | YES, persist per estimate/tab | 2026-06-27 (3 days) |
| Q-19 `disableRouteSync` hides CRUD | P6.10 | YES, hide CRUD when `canEditEstimate === false` | 2026-06-27 (3 days) |
| Q-20 Max tree depth | P1.5 | 100 | 2026-06-27 (3 days) |
| Q-22 Char count in rename input | P0.7 | Only if max-length (200) is enforced; defer UI to post-launch | 2026-06-30 (6 days) |

Wave 1 · A3 will inline this table into `12-OPEN-QUESTIONS-AND-DECISIONS.md`.

---

## 11. Improvement Acceptance Criteria

The improvement pass itself is complete only when:

- [ ] G-01 closed: `09-PRIORITIZED-FINDINGS.md` has owner / deadline / acceptance per finding
- [ ] G-02 closed: `14-THREAT-MODEL.md` covers auth surface, share-token publication, viewer-role escalation
- [ ] G-03 closed: `15-RISK-REGISTER.md` rates every P1+P2 finding on severity × probability × owner × mitigation
- [ ] G-04 closed: `16-DATA-MIGRATION-PLAN.md` covers F-06 RPC change, F-04 sort_order type change, F-18 server sort scheme
- [ ] G-05 closed: `10-IMPLEMENTATION-PLAN.md` has rollout / feature-flag / kill-switch / rollback runbook
- [ ] G-06 closed: `12-OPEN-QUESTIONS-AND-DECISIONS.md` has decision deadline + default per question
- [ ] G-07 closed: this doc §8 traceability matrix covers every P1 finding
- [ ] G-08 closed: `17-ADVERSARIAL-REVIEW.md` exists and is independent (not authored by revision agents)
- [ ] G-09 closed: `18-FINAL-VERIFICATION-AND-RESCORING.md` exists and was not authored by the revision agents or the adversarial reviewer
- [ ] Final weighted score ≥ 90 in all three categories (Strategy, Doc Quality, Impl Readiness) per independent verifier
- [ ] No score is 100 (honest about residual risk: no runtime verification, no migration audit, no user testing)

---

## 12. Improvement Wave Plan

Specialist agents are dispatched in three waves. Each agent gets a dedicated scope (no file collisions).

### Wave 1 — Specialist improvements (6 agents, parallel)

| Agent | Scope | Target file | Mode |
|---|---|---|---|
| A1 | Per-finding owner/deadline/acceptance | `09-PRIORITIZED-FINDINGS.md` | Append-only revision |
| A2 | Rollout/feature-flag/exit-criteria sections | `10-IMPLEMENTATION-PLAN.md` | Append-only revision |
| A3 | Decision deadlines + defaults | `12-OPEN-QUESTIONS-AND-DECISIONS.md` | Append-only revision |
| A4 | Threat model (auth, share-token, viewer-role) | `14-THREAT-MODEL.md` | New doc |
| A5 | Risk register (severity × probability × owner × mitigation × deadline) | `15-RISK-REGISTER.md` | New doc |
| A6 | Data migration plan (F-06, F-04, F-18) | `16-DATA-MIGRATION-PLAN.md` | New doc |

### Wave 2 — Independent review (2 agents, parallel, after Wave 1)

| Agent | Scope | Target file | Mode |
|---|---|---|---|
| B1 | Adversarial review — challenge assumptions, hunt omissions | `17-ADVERSARIAL-REVIEW.md` | New doc |
| B2 | Final independent verification + rescoring | `18-FINAL-VERIFICATION-AND-RESCORING.md` | New doc |

B1 and B2 must not be authored by any Wave 1 agent. They read the revised/new docs and re-score against this scorecard.

### Wave 3 — Lead synthesis (lead, after Wave 2)

- Resolve any conflicts surfaced by B1.
- Apply B2's recommended score adjustments.
- Update §3.2 weighted score with before/after comparison.
- Mark `13-PLAN-AUDIT-AND-SCORECARD.md` final.

---

## 13. Residual Risk and Limitations

These are documented up front so no score reaches 100:

1. **No runtime verification**: All findings are static-source-analysis. Race conditions (F-01, F-07) and performance numbers (F-02, F-27) are inferred from code, not measured. The implementation phase must close this with real-surface evidence per `11-VALIDATION-PLAN.md`.
2. **No migration audit**: DB RPCs (`create_estimate_node_with_history`, `reorder_estimate_nodes_with_history`, `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`) were not read in the original audit. F-10 flags this. `16-DATA-MIGRATION-PLAN.md` will specify the audit but cannot itself perform it without DB access.
3. **No user testing**: All UX findings (F-13, F-14, F-15, F-20, F-21) are based on standard patterns and WCAG guidelines, not real-user research.
4. **No mobile testing**: F-20 (mobile drawer) is a major new component with HIGH risk; static analysis cannot validate touch interaction, responsive layout, or viewport-edge cases.
5. **Sibling plan-packs exist**: `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/` and `.ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/` are untracked sibling plan-packs. They are out of scope for this audit but may share findings (e.g., shared design-system tokens, shared event-bus, shared Zustand store). Cross-pack consistency is deferred to a future integration review.

These limitations do not block marking the pack implementation-ready; they bound the confidence of that readiness.

---

## 14. Final Score (to be filled by Wave 2 · B2)

| Category | Initial (§3.2) | Final (post-improvement) | Delta |
|---|---|---|---|
| Strategy | 78 | _pending B2_ | — |
| Document Quality | 88 | _pending B2_ | — |
| Implementation Readiness | 77 | _pending B2_ | — |
| **Overall** | **~81** | _pending B2_ | — |

**Readiness determination** (filled by B2): _pending_

---

**Document status**: Wave 0 complete. Dispatching Wave 1.
