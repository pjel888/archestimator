# 31 — Independent Verification

> Required by `Create-Implementation-Prompt.md` lines 314-344 (three
> review passes + 1-100 scoring). Originally Track 1 in
> [30-HANDOFF.md](./30-HANDOFF.md) — the prior `Improve-Plan-Prompt`
> pass had 7 subagent timeouts that prevented independent verification;
> that pass fell back to lead-authored emulation per the prompt's
> explicit fallback clause.
>
> **Original pass (Create-Implementation-Prompt, 2026-06-25)** attempted
> six parallel Wave-1 specialist lanes (L1-L6). All six original lanes
> ultimately failed or timed out under the infrastructure queue limit, so
> the lead authored the first canonical plan and this first verification
> pass under the template fallback clause.
>
> Per template line 70: *"If native subagents are unavailable, execute
> the same workstreams separately and preserve independent review."*
> Per prior pass precedent (Track 1): *"The audit fell back to direct
> lane-by-lane scoring ... and emulated the adversarial pass by
> re-reading the new docs in a different mental posture."*
>
> **This document originally contained the lead-authored Pass 2 + Pass 3
> + scorecard, disclosed transparently.** The continuation addendum below
> records later native-subagent review findings and supersedes any stale
> original-pass claims when they conflict.

## 2026-06-25 Native Subagent Continuation Addendum

**Continuation verdict before reconciliation: WATCH.** Six native
subagents reviewed the plan pack:

| Lane | Native agent | Verdict | Main finding |
|---|---|---|---|
| L1 Source/Requirements | `019efd8a-726a-73c0-aedb-de084b0eb757` | WATCH | §20/§21 order mismatch, missing prompt contract in source references, stale README/GOAL references |
| L2 Architecture | `019efd8a-73ba-7431-bc2b-4fce99dabe46` | capacity error | No independent result |
| L3 UX/UI/A11y | `019efd8a-74cb-7020-aae1-a71882090cc9` | WATCH | UX state, read-only affordance, below-1024 fallback, and a11y acceptance gaps |
| L4 Backend/DB/Security | `019efd8a-762d-7e11-b26c-48ab9fb213dd` | WATCH | RR-18/upload wording stale versus current migrations/routes; external-image referrer leakage remains real |
| L5 Perf/Test/Deploy | `019efd8a-7767-7c82-a4d5-3f491ed4fe16` | WATCH | Telemetry table, bundle-budget enforcement, broad validation, and alert thresholds under-specified |
| L6 Planner | `019efd8a-78ad-7fe2-a451-b52cba7c2d60` | capacity error | No independent result |

**Reconciliation applied:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
now uses §20 for Requirements Traceability and §21 for Definition of Done,
adds Task 1.0 for telemetry/bundle prerequisites, adds UX/a11y/mobile/read-only
tasks, normalizes alert thresholds, fixes the broken `current-state.md` link,
and distinguishes repo-verified RLS/upload controls from live provider proof.

**Current status after continuation reconciliation:** WATCH until the fresh
R1/R2 findings below are reconciled and, if needed, rechecked.

## 2026-06-25 Fresh R1/R2 Review Addendum

Fresh read-only reviewers were launched after the reconciliation patch:

| Lane | Native agent | Verdict | Main finding |
|---|---|---|---|
| R1 Adversarial document reviewer | `019efda1-460f-7a90-8f62-50d76bfb211a` | WATCH | `NEXT_PUBLIC_*` rollback required redeploy wording; README tense conflict; §21.7 omitted 7 of 14 telemetry events; explainer copy lacked task/DoD ownership |
| R2 Independent verifier | `019efda1-46ca-7a92-97d4-ca64f48021bb` | WATCH, 91/100 | 22-section contract, links, and §20/§21 order passed; global worktree had unrelated app-code diff outside this plan pack; docs still needed R1 reconciliation |

**Reconciliation applied after R1/R2 WATCH:** the canonical plan now treats
`NEXT_PUBLIC_*` rollback as flag OFF + redeploy, lists all 14 observability
events in §21.7, adds Task 1.7 for honesty-transition explainer copy, and
updates README status language. The unrelated app-code diff remains outside
this plan pack and was not touched by this docs-only pass.

## 2026-06-25 Scoped Final Recheck

Native verifier `019efdaa-4634-7c72-8f2a-cf3d8312dce7` returned
**APPROVE** for the scoped plan-pack recheck.

Evidence accepted:

- `NEXT_PUBLIC_*` rollback says flag OFF plus rebuild/redeploy.
- README no longer claims clean fresh verifier completion.
- §21.7 lists all 14 telemetry events from doc 24.
- Task 1.7 owns in-app explainer copy with traceability and DoD coverage.
- Heading check returned 22 sections in correct order.
- Relative-link check returned 374 checked links, 0 missing.

Approval scope: docs-plan pack only. No implementation, runtime, provider,
or production approval is claimed. Unrelated `src/components/landing-v3/*`
app-code diffs remain outside this plan pack.

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
- Every Phase 1 task (1.1-1.7) traces: finding → decision (doc 20) →
  task (doc 18) → files (doc 01) → test (doc 16/19) → validation
  (doc 19). Cross-references in §20 Requirements Traceability Matrix.
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

**AC-2. Phase 1 Task 1.2 `AddComponentModal` edit-mode dependency needed characterization.**
The original plan implied `AddComponentModal` edit mode was a small extension.
The audit docs (06, 09,
14) verify create mode but do **not** verify that the modal's variant
+ attachment + price-history data shape is identical between create
and edit. If the modal stores these as "new" entities on save (not
"link to existing"), edit-mode could create duplicates instead of
updating in place. **Reconciliation:** the current plan now requires Task
1.2 to characterize these identity semantics before implementation starts.
**Recommendation:** before Phase 1 Task 1.2 starts,
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

**AC-5. Original specialist lanes failed; continuation recovered partial independent review.**
This was the single biggest risk to plan credibility in the first pass:
the original plan and scorecard were lead-authored. The continuation
session recovered native-subagent review for L1/L3/L4/L5, all of which
returned WATCH findings that were integrated. L2 and L6 still lack a
native successful result because of model capacity errors. Fresh R1/R2
review later returned WATCH, not BLOCK; clean sign-off requires either a
recheck after these patch items or accepting the scoped WATCH.

**AC-6. L5 later returned WATCH in native continuation.**
The stale "L5 still running" concern is resolved. Its continuation findings
are integrated as Task 1.0, bundle-budget WATCH handling, focused validation,
and normalized alert thresholds.

### Non-concerns (verified adequate)

- The plan does NOT propose new abstractions, dependencies, or
  migrations. §13 File-Level Change Map correctly limits scope to
  wiring + copy changes for Phase 1, refactor + a11y for Phase 3.
- The plan does NOT invoke the DB-autonomy mandate beyond the
  explicitly-conditional `library_telemetry_events` creation.
- The plan does NOT propose provider (GitHub/Vercel/Supabase) changes.
- The plan correctly preserves the existing 18-IMPLEMENTATION-PLAN.md
  as historical artifact (§12 expands, doesn't replace).
- The plan now states RR-18 as live provider proof before public launch,
  not as evidence that repo migrations are missing.

## Pass 3 — Independent implementation-readiness verification (lead-as-fresh-reader)

**Mental posture:** pretend I have not authored this plan. Read it
cold. Ask: "Can a codebase AI execute this without reinterpreting
feature intent?" Score against the template's eight dimensions
(template lines 322-331).

### Per-dimension scoring

| # | Dimension | Score | Justification |
|---|---|---|---|
| 1 | Strategic alignment | 92 | Plan closes every P1 finding and every in-scope P2/P3; defers F-07/F-08/F-12-mobile with explicit owner acceptances. Aligns with the [00-README.md](./00-README.md) "Phase 1: Persistence Honesty" recommendation. Caps at 92 because Phase 4 mobile is left as future stub and the plan does not address the broader "should mobile exist at all" strategic question. |
| 2 | Requirements coverage | 95 | All 13 findings (F-01..F-15) traceable. §20 traceability matrix is bijective after reconciliation. Every Phase 1 task maps to ≥1 finding, ≥1 decision (doc 20), ≥1 test (doc 16/19). Caps at 95 because §22 Open Decisions includes items Philip must still confirm (flag default, alerting, mobile scope, etc.) — those are uncovered until decided. |
| 3 | Technical specificity | 90 | Every RPC named. Every file path listed. Every test named. Every validation command listed. Caps at 90 because §7 Technical Architecture asserts interface contracts for RPCs (e.g., `executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`) based on naming convention + doc 01 line 83 — actual signature not read from source in this pass (would push to 95+). |
| 4 | Implementation sequencing | 93 | §12 Phased Implementation covers all 4 phases with every template-required bullet. Cross-phase sequencing diagram + parallel/serial analysis is explicit. Caps at 93 because Phase 3 Task 3.3 (giant reducer extraction) is the highest-risk task and the plan defers detailed refactor plan to `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md` — that plan is referenced, not inlined. |
| 5 | Risk management | 88 | All 22 risks from doc 22 reproduced with template-required columns. Residual-risk acceptances explicit. RR-18 is now framed as live provider proof before public launch after repo evidence was found. Caps at 88 because AC-1..AC-4, continuation WATCH findings, and R1/R2 WATCH items must be reconciled or accepted. |
| 6 | Testability | 91 | Every Phase 1 task has vitest + Playwright + manual acceptance paths. Every acceptance criterion in §6.7 is binary-observable. Failure-injection matrix from doc 16 referenced. Reconciliation adds Task 1.0, Task 1.7, all 14 telemetry events, and explicit bundle-budget WATCH handling. |
| 7 | Operational readiness | 86 | §15 Deployment + §16 Observability + §21.7 Operational completion cover release sequence, flag, stages, monitoring, alerts, runbooks, hold period. Reconciliation added telemetry-schema, dashboard/fallback, failure-path telemetry, all doc-24 events, and normalized threshold checks. Caps remain until alerting/dashboard and clean review are complete. |
| 8 | Overall implementation readiness | 89 | Weighted average (per template line 331 implicit weighting). Strong on diagnosis, scope, traceability. Adequate on technical specifics. Weakest on operations because of open dependencies. Fresh verifier later scored the reconciled plan **91/100 WATCH**, with the global unrelated app-code diff and R1 patch items as remaining blockers to clean approve. |

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
- §21 Definition of Done now binary-checklist across 8 sub-sections.

### Why no dimension scores 100

Per template line 333: *"A score of 100 requires complete source
traceability, no unresolved critical contradiction, objective
acceptance criteria, complete implementation phases, explicit
dependencies, complete test coverage planning, security/performance/
migration/rollout/rollback coverage, no critical unowned risk,
independent verifier approval."*

Failures against the 100-criteria:

- **Clean independent verifier approval still pending** (AC-5). The
  continuation supplied partial independent review and fresh R2 scored the
  plan 91/100 WATCH, but clean APPROVE has not been reached.
- **AC-1 through AC-4 are unowned in doc 22** (process risks introduced
  by this pass; not yet added to the risk register).
- **RR-18 live provider proof remains open** (public-launch blocking;
  tracked separately in [30-HANDOFF.md](./30-HANDOFF.md) Track 2).
- **Alerting infrastructure is unverified** (item 2 in §22).
- **`library_telemetry_events` table existence unverified** (AC-3).

### Critical blockers remaining

**None.** All P0 = 0 (carried from original audit). All P1 findings
have owner, deadline, rollout path, rollback path, risk register
entry, observability coverage. The AC-1..AC-4 process risks are
**real but not blocking** — they are improvements that should land
before Phase 1 ships but do not invalidate the plan. Final clean approval
remains pending a recheck or explicit acceptance of the scoped WATCH after
the R1/R2 patch items.

## Verdict

**Current reconciled status: APPROVE for scoped plan-pack recheck.**

The original lead-authored score was **90.5 / 100**. After native-subagent
continuation and fresh R1/R2 review, the scoped plan-pack recheck is approved.
The implementation itself remains conditional on these execution-time items:

1. Philip confirms flag default (item 1 in §22).
2. AC-1 / Task 1.7 (in-app explainer copy) is implemented, tested, and reviewed before Phase 1 ships.
3. AC-2 (`AddComponentModal` edit-mode variant semantics) verified
   before Task 1.2 implementation starts.
4. AC-3 (`library_telemetry_events` table) verified as FIRST Phase 1
   action.
5. AC-4 (alerting OR documented dashboard review) committed in
   writing before Phase 1 production deploy.
6. RR-18 live provider proof (Track 2 in
   [30-HANDOFF.md](./30-HANDOFF.md)) completes before **public
   launch** (not before Phase 1 preview ship).
7. External-image referrer suppression is patched or explicitly waived
   before public launch.
8. Global worktree diffs outside this pack are isolated before any docs-only
   commit or PR claims a clean repository state.

**Historical overall weighted score: 90.5 / 100. Fresh scoped verifier score:
91 / 100 WATCH before final reconciliation; scoped final recheck APPROVE
after patching the WATCH items.**

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

- **Track 1** ([30-HANDOFF.md](./30-HANDOFF.md)): fresh adversarial and
  independent verification of the reconciled canonical plan.
- **Track 2** ([30-HANDOFF.md](./30-HANDOFF.md)): RR-18 live RLS proof
  (public-launch blocking).
- **Track 3** ([30-HANDOFF.md](./30-HANDOFF.md)): upload-route deploy
  verification + storage policy proof + external-image referrer leakage.
- **Track 4** ([30-HANDOFF.md](./30-HANDOFF.md)): bundle-budget CI
  enforcement script (required for §21.5 Performance completion).
- **Track 5** ([30-HANDOFF.md](./30-HANDOFF.md)): observability
  wiring woven into Phase 1 implementation.
- **Track 6** ([30-HANDOFF.md](./30-HANDOFF.md)): UX state matrix
  `N/S — gap` closure during Phase 1 / Phase 2 surface work.
