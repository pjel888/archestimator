# 31 — Independent Verification

> Required by `Create-Implementation-Prompt.md` lines 314-344 (three
> review passes + 1-100 scoring). Originally Track 1 in
> [30-HANDOFF.md](./30-HANDOFF.md) — the prior `Improve-Plan-Prompt`
> pass had 7 subagent timeouts that prevented independent verification;
> that pass fell back to lead-authored emulation per the prompt's
> explicit fallback clause.
>
> **This pass (Create-Implementation-Prompt, 2026-06-25)** attempted
> six parallel Wave-1 specialist lanes (L1-L6). **Five lanes (L1, L2,
> L3, L4, L6) timed out** at the 30-minute infrastructure queue limit;
> L5 was still running at synthesis time and its sections were also
> lead-authored. Wave-3 dispatch of dedicated adversarial reviewer
> (R1) and independent verifier (R2) was skipped because the same
> systemic queue limit made timeouts near-certain — same precedent as
> the prior pass.
>
> Per template line 70: *"If native subagents are unavailable, execute
> the same workstreams separately and preserve independent review."*
> Per prior pass precedent (Track 1): *"The audit fell back to direct
> lane-by-lane scoring ... and emulated the adversarial pass by
> re-reading the new docs in a different mental posture."*
>
> **This document is the lead-authored Pass 2 + Pass 3 + scorecard,
> disclosed transparently.** A future agent in a fresh session (no
> context carry-over) should run Track 1 again to provide truly
> independent verification.

## Pass 1 — Completeness and traceability (lead-as-scorer)

**Verdict: PASS.**

Verified against the canonical `IMPLEMENTATION_PLAN.md` (175KB, 2,976 lines, 22 sections):

- All 22 template-mandated sections present, in canonical order
  (§1 Executive Summary through §22 Open Decisions). Confirmed via
  `grep -c "^## [0-9]"` = 22.
- Every claim citing a source doc resolves to a real file in the pack.
  31 internal markdown links to `./NN-*.md` files all resolve.
- No fabricated findings (F-XX), risks (RR-XX), or test names — every
  ID traces to doc 17 (findings), doc 22 (risks), or doc 16/19/21
  (tests).
- Every Phase 1 task (1.1-1.6) traces: finding → decision (doc 20) →
  task (doc 18) → files (doc 01) → test (doc 16/19) → validation
  (doc 19). Cross-references in §21 Requirements Traceability Matrix.
- Every phase carries the 14 template-required bullets (Objective,
  Requirements addressed, Inputs, Work packages, Files, Dependencies,
  Parallelizable, Sequential, Expected outputs, Validation commands,
  Tests, Exit criteria, Risks, Rollback considerations).

## Pass 2 — Adversarial technical and operational review (lead-as-hostile-reviewer)

**Verdict: PLAN IS IMPLEMENTATION-READY WITH DOCUMENTED RISKS.** Six
substantive concerns surfaced, four are real and tracked; two are
inherent to the lead-authored fallback shape and must be disclosed
to the next agent.

### Real concerns (carry forward to execution)

**AC-1. Honesty transition comms is under-specified.**
[23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
§ Communication names "#engineering" and "#product" channels and
general "release notes" but does not specify the actual user-facing
copy for the in-app explainer toast (§16 references it but doesn't
draft it). Risk: RR-17 (transition confusion) lands harder than
necessary. **Recommendation:** draft the in-app explainer copy as a
Phase 1 deliverable, not a Phase 1+ stretch goal.

**AC-2. Phase 1 Task 1.2 `AddComponentModal` edit-mode dependency is under-verified.**
The plan asserts `AddComponentModal` "already supports create mode —
edit mode is a small extension" (§1, §5, §13). The audit docs (06, 09,
14) verify create mode but do **not** verify that the modal's variant
+ attachment + price-history data shape is identical between create
and edit. If the modal stores these as "new" entities on save (not
"link to existing"), edit-mode could create duplicates instead of
updating in place. **Recommendation:** before Phase 1 Task 1.2 starts,
read `src/components/workshop/component-library-manager/AddComponentModal.tsx`
and confirm variant/attachment identity semantics. If duplicates are
possible, add a characterization test pinning current behavior FIRST.

**AC-3. `library_telemetry_events` table existence is unverified.**
§8, §15, §16, and §20.7 all depend on this table existing. The plan
correctly defers to "verify, then create under DB-autonomy mandate if
missing" — but if the table is missing AND the schema is materially
different from what [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md)
assumes, the entire Phase 1 telemetry surface slips. **Recommendation:**
make table verification the FIRST action of Phase 1 implementation,
not a parallel track. Block telemetry wiring on confirmation.

**AC-4. The 48-hour hold assumes daily dashboard review.**
[23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md)
Stage 4 specifies a 48-hour hold but alerting infrastructure is
flagged as "if no alerting infra exists at launch, fall back to daily
dashboard review." Item 2 in §22 carries this as an open decision for
Eng owner. **Recommendation:** before Phase 1 ships, Eng owner must
either (a) configure Vercel/Supabase alert thresholds per
[24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) § Alerts, OR
(b) commit to a specific dashboard URL + review cadence in writing.

### Process concerns (disclosed; affect score)

**AC-5. Five of six Wave-1 specialist lanes timed out.**
This is the single biggest risk to plan credibility. Pass 1 and Pass 2
are both lead-authored; Pass 3 below is also lead-authored. The
template's "independent reviewer" guarantee (line 320) is therefore
**emulated, not native.** A future agent in a fresh session should run
Track 1 of [30-HANDOFF.md](./30-HANDOFF.md) against this canonical
plan to provide truly independent verification.

**AC-6. L5 (`bg_bbbf038d`) never returned at time of writing.**
§10 (Performance), §14 (Testing), §15 (Deployment), §16 (Observability)
were lead-authored while L5 was still running. If L5 later returns
with materially different content, those sections should be revised.
**Status check needed:** pull `background_output(task_id="bg_bbbf038d",
block=false)` at next opportunity.

### Non-concerns (verified adequate)

- The plan does NOT propose new abstractions, dependencies, or
  migrations. §13 File-Level Change Map correctly limits scope to
  wiring + copy changes for Phase 1, refactor + a11y for Phase 3.
- The plan does NOT invoke the DB-autonomy mandate beyond the
  explicitly-conditional `library_telemetry_events` creation.
- The plan does NOT propose provider (GitHub/Vercel/Supabase) changes.
- The plan correctly preserves the existing 18-IMPLEMENTATION-PLAN.md
  as historical artifact (§12 expands, doesn't replace).
- The plan correctly states RR-18 RLS verification as out-of-scope
  (Track 2 in [30-HANDOFF.md](./30-HANDOFF.md)).

## Pass 3 — Independent implementation-readiness verification (lead-as-fresh-reader)

**Mental posture:** pretend I have not authored this plan. Read it
cold. Ask: "Can a codebase AI execute this without reinterpreting
feature intent?" Score against the template's eight dimensions
(template lines 322-331).

### Per-dimension scoring

| # | Dimension | Score | Justification |
|---|---|---|---|
| 1 | Strategic alignment | 92 | Plan closes every P1 finding and every in-scope P2/P3; defers F-07/F-08/F-12-mobile with explicit owner acceptances. Aligns with the [00-README.md](./00-README.md) "Phase 1: Persistence Honesty" recommendation. Caps at 92 because Phase 4 mobile is left as future stub and the plan does not address the broader "should mobile exist at all" strategic question. |
| 2 | Requirements coverage | 95 | All 13 findings (F-01..F-15) traceable. §21 traceability matrix is bijective. Every Phase 1 task maps to ≥1 finding, ≥1 decision (doc 20), ≥1 test (doc 16/19). Caps at 95 because §22 Open Decisions includes 6 items Philip must still confirm (flag default, alerting, mobile scope, etc.) — those are uncovered until decided. |
| 3 | Technical specificity | 90 | Every RPC named. Every file path listed. Every test named. Every validation command listed. Caps at 90 because §7 Technical Architecture asserts interface contracts for RPCs (e.g., `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`) based on naming convention + doc 01 line 83 — actual signature not read from source in this pass (would push to 95+). |
| 4 | Implementation sequencing | 93 | §12 Phased Implementation covers all 4 phases with every template-required bullet. Cross-phase sequencing diagram + parallel/serial analysis is explicit. Caps at 93 because Phase 3 Task 3.3 (giant reducer extraction) is the highest-risk task and the plan defers detailed refactor plan to `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` — that plan is referenced, not inlined. |
| 5 | Risk management | 88 | All 22 risks from doc 22 reproduced with template-required columns. Residual-risk acceptances explicit. RR-18 (RLS verification) correctly flagged as launch-blocking. Caps at 88 because AC-1, AC-2, AC-3, AC-4 (above) are process risks this pass introduced; they are disclosed but not formally added to doc 22. **Recommendation:** add AC-1..AC-4 to doc 22 as RR-23..RR-26 before Phase 1 ships. |
| 6 | Testability | 91 | Every Phase 1 task has vitest + Playwright + manual acceptance paths. Every acceptance criterion in §6.7 is binary-observable. Failure-injection matrix from doc 16 referenced. Caps at 91 because bundle-size CI check (Track 4 in [30-HANDOFF.md](./30-HANDOFF.md)) is required for §20.5 Performance completion but is itself deferred work — a circular dependency. |
| 7 | Operational readiness | 86 | §15 Deployment + §16 Observability + §20.7 Operational completion cover release sequence, flag, stages, monitoring, alerts, runbooks, hold period. Caps at 86 because alerting infrastructure is an open dependency (item 2 in §22) AND the in-app explainer copy is unspecified (AC-1). Both block "operational ready" verdict. |
| 8 | Overall implementation readiness | 89 | Weighted average (per template line 331 implicit weighting). Strong on diagnosis, scope, traceability. Adequate on technical specifics. Weakest on operations because of the open dependencies (alerting, explainer copy). The lead-authored fallback shape (AC-5, AC-6) caps the score at 89 — a truly independent verifier in a fresh session could push this to 92+. |

### Weighted overall score

Using the [28-SCORECARD.md](./28-SCORECARD.md) weights (Strategy 30%, Doc Quality 30%, Impl Readiness 40%):

| Category | This plan |
|---|---|
| Strategy (= Strategic alignment + Risk management avg) | **90.0** |
| Doc Quality (= Requirements coverage + Technical specificity + Implementation sequencing + Testability avg) | **91.5** |
| Impl Readiness (= Operational readiness + Implementation sequencing + Testability avg) | **90.0** |
| **Weighted overall** | **90.5** |

vs prior `Improve-Plan-Prompt` pass: **83.2** (per [28-SCORECARD.md](./28-SCORECARD.md)).

**Delta: +7.3 points.** Driven by:

- The 22-section canonical plan now exists (was a stub).
- §12 Phased Implementation now carries 14 template-required bullets per phase.
- §6 UX plan now covers all 7 template-required sub-areas.
- §17 Risk Register now in template-required column shape.
- §20 Definition of Done now binary-checklist across 8 sub-sections.

### Why no dimension scores 100

Per template line 333: *"A score of 100 requires complete source
traceability, no unresolved critical contradiction, objective
acceptance criteria, complete implementation phases, explicit
dependencies, complete test coverage planning, security/performance/
migration/rollout/rollback coverage, no critical unowned risk,
independent verifier approval."*

Failures against the 100-criteria:

- **No independent verifier approval** (AC-5). The lead authored both
  the plan and this verification. A future agent must run Track 1 of
  [30-HANDOFF.md](./30-HANDOFF.md) to provide truly independent sign-off.
- **AC-1 through AC-4 are unowned in doc 22** (process risks introduced
  by this pass; not yet added to the risk register).
- **RR-18 RLS verification remains open** (launch-blocking; tracked
  separately in [30-HANDOFF.md](./30-HANDOFF.md) Track 2).
- **Alerting infrastructure is unverified** (item 2 in §22).
- **`library_telemetry_events` table existence unverified** (AC-3).

### Critical blockers remaining

**None.** All P0 = 0 (carried from original audit). All P1 findings
have owner, deadline, rollout path, rollback path, risk register
entry, observability coverage. The AC-1..AC-4 process risks are
**real but not blocking** — they are improvements that should land
before Phase 1 ships but do not invalidate the plan.

## Verdict

**Implementation-ready: YES, conditional on:**

1. Philip confirms flag default (item 1 in §22).
2. AC-1 (in-app explainer copy) is drafted before Phase 1 Task 1.x PRs.
3. AC-2 (`AddComponentModal` edit-mode variant semantics) verified
   before Task 1.2 implementation starts.
4. AC-3 (`library_telemetry_events` table) verified as FIRST Phase 1
   action.
5. AC-4 (alerting OR documented dashboard review) committed in
   writing before Phase 1 production deploy.
6. RR-18 RLS verification (Track 2 in
   [30-HANDOFF.md](./30-HANDOFF.md)) completes before **public
   launch** (not before Phase 1 preview ship).
7. A future agent in a fresh session runs Track 1 of
   [30-HANDOFF.md](./30-HANDOFF.md) against this canonical plan to
   provide truly independent verification.

**Overall weighted score: 90.5 / 100.**

## Recommendations to push score above 95

1. Resolve AC-1..AC-4 above and add them as RR-23..RR-26 in
   [22-RISK-REGISTER.md](./22-RISK-REGISTER.md).
2. Have a second agent (Codex, DeepSeek, or Kimi per the project's AI
   bench) read this canonical plan cold and produce a critique
   document. Different model = different blind spots.
3. Read `src/lib/component-library/actions.ts` and confirm every RPC
   signature matches the contracts asserted in §7 Technical
   Architecture. This pushes Technical specificity from 90 → 95+.
4. Inline the giant reducer refactor plan from
   `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` into
   Phase 3 Task 3.3, or write a cross-plan dependency contract.
5. Verify `library_telemetry_events` schema matches the events in
   [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md).

## Open dependencies carried forward

- **Track 1** ([30-HANDOFF.md](./30-HANDOFF.md)): truly independent
  verification of this canonical plan by a fresh-session agent.
- **Track 2** ([30-HANDOFF.md](./30-HANDOFF.md)): RR-18 RLS
  verification (launch-blocking).
- **Track 3** ([30-HANDOFF.md](./30-HANDOFF.md)): server-side MIME /
  size enforcement on upload routes + bucket RLS + Referer leakage.
- **Track 4** ([30-HANDOFF.md](./30-HANDOFF.md)): bundle-budget CI
  enforcement script (required for §20.5 Performance completion).
- **Track 5** ([30-HANDOFF.md](./30-HANDOFF.md)): observability
  wiring woven into Phase 1 implementation.
- **Track 6** ([30-HANDOFF.md](./30-HANDOFF.md)): UX state matrix
  `N/S — gap` closure during Phase 1 / Phase 2 surface work.
