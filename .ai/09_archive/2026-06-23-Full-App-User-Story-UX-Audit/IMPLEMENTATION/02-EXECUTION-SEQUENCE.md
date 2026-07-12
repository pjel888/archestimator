# Execution Sequence

**Binding for:** what to pick, in what order, with what exit gates.
**Source of truth:** [../PHASE-ANALYSIS.md](../PHASE-ANALYSIS.md) (canonical phase map). This doc operationalizes it.

---

## Next Pick

The canonical next pick is the lowest-numbered issue that is:

1. `planned` in [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md).
2. In the lowest incomplete phase.
3. Not in a conflict group with an in-progress issue (unless you are the named lead).
4. Not decision-gated without a fresh owner resolution.

If multiple candidates qualify, prefer:
- P0 over P1 over P2.
- Lower UX number (canonical audit order).
- Issue whose acceptance criteria are fully captured (some `05-ACCEPTANCE-CRITERIA.md` files need tightening at execution time; pick the tightest first).

**Concrete starting recommendation:** `UX-002` (Phase 1, P0, conflict group Auth/support boundary, no gate).

---

## Phase order (canonical)

| Phase | Focus | Issues | Exit gate |
|---|---|---|---|
| 1 | Auth & Shell (beta gate) | 6 | All Phase 1 P0s `verified`. Auth/support conflict group cleared. |
| 2 | Projects & QA | 7 | All Phase 2 P0s `verified`. QA infrastructure (UX-028, UX-041) usable by later phases. |
| 3 | Estimates Core | 7 | All Phase 3 P0s `verified`. Estimate sheet conflict group cleared. |
| 4 | Share & Export | 8 | All Phase 4 P0s `verified`. Share recipient recovery paths proven. |
| 5 | Collab, Maps, Feedback | 8 | All Phase 5 P0s `verified`. Maps fallback, invite email readiness proven. |
| 6 | Provider & New Foundations | 8 | All Phase 6 P0s `verified`. Provider proof owners assigned; operations persona split shipped. |

**Phases 1 → 2 → 3 → 4 → 5 → 6 is the canonical order.** Phase 1 is a hard beta gate. After Phase 1:

- Phases 2 + 3 may parallelize (different conflict groups).
- Phase 5 may parallelize with 2/3/4 (independent conflict groups).
- Phases 4 and 6 should be sequential (provider dependency).

---

## Within-phase wave structure

Each `UX-NNN` folder's `04-IMPLEMENTATION-PLAN.md` already defines waves:

- **Wave 0 — Discovery (no code change):** read cited paths, grep for callers, document drift.
- **Wave 1 — Test Scaffolding (RED):** failing test reproducing the canonical error.
- **Wave 2 — Implementation (GREEN):** file-by-file smallest change to flip RED → GREEN.
- **Wave 3 — Regression Sweep:** affected surface tests, lint, type-check.
- **Wave 4 — Acceptance Walk-through:** every scenario in `05-ACCEPTANCE-CRITERIA.md` passes with evidence.

**Do not skip waves.** Wave 0 drift findings feed Wave 1 test design. Wave 1 RED proof is the contract for Wave 2.

---

## Per-phase parallel safety

### Phase 1 — Auth/support conflict group

Issues: UX-002, UX-003, UX-040, UX-043 (and UX-004, UX-042 from related groups).

- **Single auth lead required.** Do NOT parallelize UX-002/UX-003/UX-040/UX-043 across agents.
- UX-004 (root recovery) and UX-042 (route inventory) are in adjacent groups; can parallelize with auth issues only if the auth lead confirms no shared files (e.g. `src/proxy.ts`).

### Phase 2 — Project/dashboard + Evidence/schema

Issues: UX-005–UX-009 (project/dashboard group); UX-028, UX-041 (evidence/schema group).

- UX-028 and UX-041 should ship FIRST in Phase 2 — they define the QA route manifest and evidence vocabulary that later phases depend on.
- UX-005–UX-009 share project/settings/dashboard surfaces; single project lead.
- UX-006 + UX-007 + UX-008 all touch modals; sequence them, don't parallelize.

### Phase 3 — Estimate sheet

Issues: UX-010–UX-014, UX-044, UX-018.

- All estimate-sheet issues share `EstimateSheetContent` / `EstimateSheetBranch` / row mutation hooks. Single estimate lead.
- UX-044 (numeric validation a11y) and UX-011 (visible save errors) are P0 — ship first.
- UX-018 (chart derived state lint) is in a different group; can parallelize with estimate work if charts lead coordinates.

### Phase 4 — Publication/share + Export

Issues: UX-022, UX-023, UX-035–UX-037 (publication/share); UX-016, UX-017 (export/charts); UX-015 (gated).

- UX-022 + UX-035 + UX-036 are P0 recovery-path issues; ship first as a coordinated set.
- UX-016 (export preflight) and UX-017 (preview design lint) can parallelize with publication work (different files).
- UX-015 is dormant — do not start.

### Phase 5 — Collaboration + Maps + Feedback

Issues: UX-019 (maps); UX-020, UX-021 (collab/access); UX-001, UX-024–UX-027 (copy/settings/feedback).

- UX-019 (maps fallback) is solo — parallelize freely.
- UX-020 + UX-021 share collaboration surfaces; sequence them.
- UX-001, UX-024, UX-025, UX-026, UX-027 are mostly independent copy/state work; parallelize within the conflict-group rule.
- UX-027 (toast scoped IDs) may be touched by every other Phase 5 issue — do it FIRST or coordinate a single lead.

### Phase 6 — Provider + Foundations

Issues: UX-029, UX-038 (operations/provider); UX-030, UX-031 (estimate sheet extension — UX-031 gated); UX-032 (PM governance — scope locked); UX-033, UX-034 (library/cost); UX-039 (gated).

- UX-038 (operations persona split) and UX-029 (provider proof owners) are P0 — ship first.
- UX-032, UX-033, UX-034 are scope-locked lightweight slices; respect locks in [01-AGENT-OPERATING-CONTRACT.md §5](01-AGENT-OPERATING-CONTRACT.md#5-decision-gates-and-scope-locks).
- UX-031 dormant. UX-039 dormant without owner re-approval.

---

## Exit gates per phase

A phase is "exited" when:

1. Every P0 issue in the phase is `verified` (not just `implemented`).
2. Every P1 issue is at least `implemented`, with a `planned` verification date.
3. Every P2 issue is either `planned` (with explicit deferral note) or `implemented`.
4. No blockers in [03-EXECUTION-LEDGER.md](03-EXECUTION-LEDGER.md) reference this phase.
5. The conflict group lead for each in-phase group has signed off in the ledger.

**Phase 1 is special:** it is the beta gate. No wider-beta activity (Phase 4 recipient UX, Phase 6 field foundations) should start until Phase 1 is `verified` complete.

---

## Cross-phase dependencies (the hard edges)

- **UX-028 + UX-041 (Phase 2) → all later phases.** QA route manifest and evidence vocabulary are infrastructure. If you skip Phase 2 and start Phase 3, you'll have inconsistent evidence tagging.
- **UX-027 (Phase 5) → every issue that adds transient feedback.** If you ship UX-011 (visible save errors) before UX-027 lands the toast scoped-ID pattern, you'll have to refactor. Either land UX-027 first or align with the toast contract from [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md).
- **UX-042 (Phase 1, route inventory) → UX-028 (Phase 2, QA manifest).** UX-028 consumes the route inventory UX-042 produces.
- **UX-002 (Phase 1, beta access) → UX-040 (Phase 1, admin repair).** Admin repair workflow consumes the beta access states UX-002 defines.

---

## Parallelization cheat sheet

| Can run in parallel | Cannot run in parallel |
|---|---|
| Phase 2 issues + Phase 3 issues (different groups) | UX-002 + UX-003 (same auth conflict group) |
| Phase 5 maps (UX-019) + any Phase 2/3/4 issue | UX-006 + UX-007 + UX-008 (all modals, same group) |
| UX-016 + UX-017 (export/charts) + UX-022 family (publication) | UX-010 + UX-011 (estimate sheet conflict group) |
| Any two issues with no shared files AND different conflict groups | Any two issues sharing `src/proxy.ts`, `src/lib/auth/*`, or estimate sheet components |

When in doubt: do not parallelize. Sequence.

---

## Estimated effort posture (rough)

Based on canonical audit severity ratings:

- **P0 issues:** S–M effort each. Phase 1 (6 issues) ≈ 1–2 sessions if serial, less if Phase 1 is the only focus.
- **P1 issues:** S–M effort each. Most phases have 3–6 P1 issues.
- **P2 issues:** S effort each. Mostly defer-able.

Total pack: ~44 issues, mostly S–M individual effort. Realistic closed-beta completion: phased over multiple sessions, Phase 1 first as a coherent beta-gate push.

These are planning estimates, not commitments. Actual effort surfaces during Wave 0 discovery.
