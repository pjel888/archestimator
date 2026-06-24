# 15 — Risk Register

**Author**: A5 (specialist, Wave 1)
**Scope contract**: `13-PLAN-AUDIT-AND-SCORECARD.md` §4 G-03
**Source authority**: `09-PRIORITIZED-FINDINGS.md` (severities, user impact),
`10-IMPLEMENTATION-PLAN.md` (phase mitigation), `13-PLAN-AUDIT-AND-SCORECARD.md` (traceability).
**Mode**: Documentation-only. No source, tests, migrations, or config changed.

---

## 1. Risk Model

Composite risk = **Severity × Probability**, scored 1–5 on each axis (range 1–25).

### 1.1 Severity (aligned to existing P-scale in `09`/`13`)

| Score | Meaning | Maps to |
|---|---|---|
| 5 | Legal / regulatory / data corruption | P0 |
| 4 | Data loss / security / a11y violation | P1 |
| 3 | Workflow disruption | P2 |
| 2 | Minor UX | P3 |
| 1 | Cosmetic | (below P3) |

Severities are taken verbatim from `09-PRIORITIZED-FINDINGS.md`. **No finding's
severity was changed** (P1 stays severity 4, P2 stays severity 3).

### 1.2 Probability (derived from the user-impact field of each finding)

| Score | Meaning | Trigger frequency |
|---|---|---|
| 1 | Theoretical | Cannot occur today; future-regression only |
| 2 | Rare | Requires uncommon concurrency or specific conflict |
| 3 | Occasional | Real users hit it on a recognizable flow |
| 4 | Frequent | Common operation exposes it |
| 5 | Certain | Deterministic on every applicable interaction |

When the source user-impact was ambiguous, the most defensible value was chosen
and the residual-risk column records the uncertainty.

### 1.3 Composite bands

| Composite | Band | Launch treatment |
|---|---|---|
| ≤ 5 | LOW | Ship; track as polish |
| 6–12 | MEDIUM | Ship behind phase gate; agent-acceptable per §5 |
| 13–20 | HIGH | **Philip acceptance required before the owning phase ships** |
| 21+ | CRITICAL | Block launch; Philip acceptance required |

---

## 2. Risk Register

Columns: `ID | Sev | Prob | Composite | Band | Owner role | Mitigation (phase + link) | Residual risk | Deadline`.

Sev/Prob on 1–5. Deadlines and owners transcribed from `09` §"Owner, Deadline,
and Acceptance Criteria Assignments". Mitigation phase IDs cite
`10-IMPLEMENTATION-PLAN.md`.

| ID | Sev | Prob | Comp | Band | Owner | Mitigation | Residual risk | Deadline |
|---|---|---|---|---|---|---|---|---|
| F-01 | 4 | 3 | 12 | MEDIUM | Frontend Lead | P3.1 — snapshot capture at `handleAddTreeNode` entry; only remap if state matches optimistic id | Static-analysis inferred; runtime verification required per `11-VALIDATION-PLAN.md` (EC-006) | 2026-07-08 |
| F-02 | 4 | 5 | 20 | **HIGH** | Frontend Lead, Backend Lead | P2.1 — replace `getEstimateTreeContentSignature` with structure-only signature (id, parent_id, kind, name, sortOrder) | Row-edit cache-invalidation path must be re-verified; perf budget (`13` §7) must be measured post-fix | 2026-07-06 |
| F-03 | 3 | 5 | 15 | **HIGH** | Backend Lead | P2.3 — drop pre-delete `refreshInsertedEstimateTree` call | Latency claim (~2×) is inferred, not measured; needs P95 timing proof | 2026-07-06 |
| F-04 | 3 | 4 | 12 | MEDIUM | Backend Lead, DB/Migration Lead | P2.2 — fractional sortOrder (`sort_order: integer → numeric`) + incremental update | DB migration risk delegated to `16-DATA-MIGRATION-PLAN.md`; existing reorder tests assume integer sortOrder | 2026-07-06 |
| F-05 | 3 | 1 | 3 | LOW | Backend Lead | **No dedicated phase task (gap)** — recommend folding merge-shape inversion into P2.1 | Currently safe; only future-regression risk. Add server-kind-change propagation test | (no deadline set) |
| F-06 | 4 | 3 | 12 | MEDIUM | Backend Lead, DB/Migration Lead | P1.2 — modify `delete_estimate_node_with_history` RPC to OUTPUT `deleted_node_ids`; action returns server values | Cascade semantics (archive vs hard-delete) unconfirmed until RPC audit; depends on `16-DATA-MIGRATION-PLAN.md` | 2026-07-01 |
| F-07 | 3 | 2 | 6 | MEDIUM | Frontend Lead | P3.2 — change `pendingPropNodesRef` to FIFO array | Race is static-inferred; concurrency test (EC-013/014) required to prove the fix | 2026-07-08 |
| F-08 | 3 | 2 | 6 | MEDIUM | Frontend Lead | P3.3 — always reopen rename editor on failure, pre-filled with attempted name + error | Conflict-detection path is the prerequisite; rollback correctness needs runtime proof | 2026-07-08 |
| F-10 | 3 | 2 | 6 | MEDIUM | Backend Lead, DB/Migration Lead (+ Security/Review) | P1.3 + P1.5 — audit 4 RPCs × 5 invariants; define/enforce max-depth (100) | No migration audit possible without DB access (`13` §13.2). If any RPC lacks a guard, severity escalates to 4 and composite to 12+ | 2026-07-01 |
| F-11 | 4 | 5 | 20 | **HIGH** | A11y Specialist, Frontend Lead | P5.1 — keyboard DnD alternative (Ctrl+X/Ctrl+V or Shift+Arrow) | WCAG 2.5.7 / 2.1.1 legal exposure is deterministic until shipped; e2e (EC-040) must pass in prod for 7d | 2026-07-18 |
| F-12 | 3 | 4 | 12 | MEDIUM | A11y Specialist, Frontend Lead | P5.2 — F2→rename, Shift+F10→context menu, type-ahead→jump | No runtime proof yet; axe-core baseline (P0.5.3) must be captured pre-fix | 2026-07-18 |
| F-13 | 3 | 4 | 12 | MEDIUM | Frontend Lead | P6.1 — edge-proximity auto-scroll in `handleDragOver` (40px) | Touch/trackpad behavior unverified; visual QA required (`13` §13.4) | 2026-07-28 |
| F-14 | 3 | 4 | 12 | MEDIUM | Frontend Lead | P6.2 — hover-to-expand collapsed folder after 500ms | Timing tunable; user-testing gap noted in `13` §13.3 | 2026-07-28 |
| F-15 | 3 | 5 | 15 | **HIGH** | Frontend Lead | P4.1 — per-row pending state (`pendingNodeIds: Set<string>`) | State-shape change is MEDIUM risk; reducer regression coverage required | 2026-07-11 |
| F-17 | 3 | 4 | 12 | MEDIUM | Frontend Lead | P6.5 — validate stored selection exists in current tab tree on tab switch | URL-vs-store source-of-truth decision (Q-19 family) unresolved; revisit if store is demoted | 2026-07-28 |
| F-18 | 3 | 4 | 12 | MEDIUM | Backend Lead | P1.4 — server create uses `(maxSiblingSortOrder + 10)`, not `+1` | Depends on F-04 sort-order type decision; coordinate with `16-DATA-MIGRATION-PLAN.md` (A6) | 2026-07-01 |
| F-19 | 4 | 3 | 12 | MEDIUM | Backend Lead (+ Security/Review) | P1.1 — add `assertCanEditEstimate` to 5 tree-mutation actions | Confidence Medium; **if any RLS gap is confirmed, probability → 4–5 and composite → 16–20 (HIGH)**. Permission test EC-052 required | 2026-07-01 |
| F-20 | 3 | 5 | 15 | **HIGH** | Frontend Lead (+ QA) | P6.8 — mobile drawer / overlay for ≤1023px | New component, HIGH risk per `10`; static analysis cannot validate touch interaction (`13` §13.4) | 2026-07-28 |
| F-21 | 3 | 5 | 15 | **HIGH** | Frontend Lead | P0.2 — replace invisible empty state with visible CTA | Trivial; residual is copy/translation review only | 2026-06-26 |

**Row count: 19** = 5 P1 (F-01, F-02, F-06, F-11, F-19) + **14 P2**.

> **Source discrepancy (flagged, not silently resolved)**: `09-PRIORITIZED-FINDINGS.md`
> §"Severity Summary" states `P2 | 13` but its ID list and every per-finding
> severity tag enumerate **14** P2 IDs (F-03, F-04, F-05, F-07, F-08, F-10,
> F-12, F-13, F-14, F-15, F-17, F-18, F-20, F-21). This register keeps all 14
> rows (omitting a real finding would be fabrication). The task spec's expected
> "18 = 5 P1 + 13 P2" is off by one because it trusted the summary count.
> `13-PLAN-AUDIT-AND-SCORECARD.md` §9 already asserts the count reconciles to
> 13 — that assertion is wrong and should be corrected by Wave 3.

---

## 3. Top-5 Prioritization (composite, descending)

| Rank | ID | Composite | Band | Notes |
|---|---|---|---|---|
| 1 | **F-02** | 20 | HIGH | Over-eager signature; touches every row keystroke |
| 2 | **F-11** | 20 | HIGH | No keyboard DnD; WCAG 2.5.7 / 2.1.1 legal exposure |
| 3 | F-03 | 15 | HIGH | Double refresh on every delete (tie-break: only P2 that is also a per-operation tax) |
| 4 | F-15 | 15 | HIGH | Sidebar-wide block on every mutation (tie-break: user-facing friction on the common path) |
| 5 | F-20 / F-21 | 15 | HIGH | Mobile-hidden sidebar / invisible empty state (4-way tie at 15 with F-03, F-15; see note) |

**Four-way tie at composite 15** (F-03, F-15, F-20, F-21). Rank 3–5 above breaks
the tie by user-facing frequency on the primary (desktop, non-empty) journey,
which is the dominant pre-launch surface.

### 3.1 Divergence from `00-README.md` §5 / `09` §"Five Most Consequential Problems"

The canonical top-5 is **F-02, F-11, F-19, F-06, F-01** (consequence ranking,
P1-weighted). The pure-composite ranking above diverges:

| Canonical rank | ID | This register's composite rank | Reason for divergence |
|---|---|---|---|
| 1 | F-02 | 1 (20) | Agree |
| 2 | F-11 | 2 (20) | Agree |
| 3 | F-19 | 6–8 (12, MEDIUM) | Canonical weights P1 security/data-integrity above P2 UX even at equal-or-lower composite. **Pure scoring is wrong for launch gating here**: F-19 is a security surface (privilege escalation if RLS has gaps) and must stay in the launch-blocking set regardless of probability. |
| 4 | F-06 | 6–8 (12, MEDIUM) | Same: P1 data-integrity (selection desync after delete). Launch-blocking. |
| 5 | F-01 | 6–8 (12, MEDIUM) | Same: P1 data-integrity race. Launch-blocking. |

**Recommended policy**: launch acceptance uses the **canonical** top-5
(severity dominates), while the **composite score** governs *within-band*
ordering and Philip-acceptance triggers (§5). I.e. all P1 findings are
launch-blockers by `10` §"Minimum viable launch" (P0+P1+P2+P3) regardless of
their composite; the composite only decides sequencing and acceptance tier.

---

## 4. HIGH / CRITICAL Risks Requiring Philip's Acceptance

All six HIGH-band findings (composite 13–20) require Philip's explicit
acceptance before their owning phase ships (none are CRITICAL; no score reached 21+).

| ID | Composite | Phase | Why Philip must accept | Before which phase |
|---|---|---|---|---|
| F-02 | 20 | P2 | Row-edit cache-invalidation re-verification + perf-budget measurement risk | Phase 2 ship |
| F-11 | 20 | P5 | WCAG 2.5.7 / 2.1.1 — **a11y/legal, not agent-acceptable** | Phase 5 ship (also a launch blocker) |
| F-03 | 15 | P2 | Latency regression risk on every delete | Phase 2 ship |
| F-15 | 15 | P4 | State-shape change; whole-sidebar UX regression risk | Phase 4 ship |
| F-20 | 15 | P6 | New mobile component, HIGH risk per `10`; touch untested | Phase 6 ship |
| F-21 | 15 | P0 | Trivial code, but first-run experience — owner direction | Phase 0 ship (low effort, can defer acceptance to batch) |

**Before Phase 1 (data-integrity) specifically ships**: no HIGH-band finding
lives in Phase 1. The Phase-1 blockers (F-19, F-06, F-18, F-10) are all
MEDIUM-band (composite 12, 12, 12, 6) and are agent-acceptable for the DB
mutations under AGENTS.md's standing Archestimator authorization — **except**
F-19 and F-10's security/invariant dimension, which is not waivable by agents.
Recommend Philip explicitly accept F-19 and F-10 before Phase 1 merge despite
their MEDIUM composite, because they touch the auth/invariant surface.

---

## 5. Risk Acceptance and Escalation Policy

| Band | Who can accept | Conditions |
|---|---|---|
| LOW (≤5) | Any assigned owner role | Track in `09`; no sign-off artifact required |
| MEDIUM (6–12) | **Agent-acceptable** for DB mutations on project `ebxxqidacheyapmmzavr` per AGENTS.md standing authorization | Does **not** extend to security, a11y, or legal dimensions — those escalate to Philip |
| HIGH (13–20) | **Philip only** | Recorded as a dated decision in `.ai/10_state/decisions.md`; kill-switch (`10` §"Rollout") must be documented in the same entry |
| CRITICAL (21+) | **Philip only** | Blocks launch until reduced to HIGH-or-below via mitigation |

**Non-waivable dimensions** (always escalate to Philip regardless of composite):
security (F-19, F-10 invariant surface), accessibility / WCAG legal exposure
(F-11, F-12), and any regulatory/legal path. AGENTS.md's standing DB mandate
covers Archestimator schema/RLS/RPC work; it does **not** cover security
acceptance, a11y conformance, or legal risk.

**Escalation path**: owner raises in `.ai/10_state/current-state.md` FAST PATH
block + requests Philip decision; default-if-no-answer follows
`12-OPEN-QUESTIONS-AND-DECISIONS.md` (A3's deadlines/defaults table).

---

## 6. References

- `09-PRIORITIZED-FINDINGS.md` — finding severities, user impact, owner/deadline table
- `10-IMPLEMENTATION-PLAN.md` — phase IDs (P0.x–P8.x), rollout/kill-switch
- `13-PLAN-AUDIT-AND-SCORECARD.md` — §4 G-03 (this doc's scope), §7 perf budget, §8 traceability, §13 residual limitations
- `11-VALIDATION-PLAN.md` — runtime verification that residual risks depend on (cited per row)
- `12-OPEN-QUESTIONS-AND-DECISIONS.md` — decision deadlines/defaults for escalations
- `14-THREAT-MODEL.md` (A4, parallel) — auth/share-token/viewer-role surface for F-19, F-10
- `16-DATA-MIGRATION-PLAN.md` (A6, parallel) — F-06, F-04, F-18 migration risk detail
- `AGENTS.md` — standing DB authorization boundary (project `ebxxqidacheyapmmzavr` only; not security/a11y/legal)
