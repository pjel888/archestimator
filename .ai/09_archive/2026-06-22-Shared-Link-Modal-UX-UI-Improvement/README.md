# Shared-Link Modal UX/UI Improvement — Plan Pack

A planning-only UX/UI improvement plan for the **shared-link modal** (the dialog that opens on the share-icon press — `src/components/workshop/ProjectPublicationHeader.tsx`). Built via a multi-agent loop (audit → synthesis → target design → implementation spec → adversarial QA → implementation-handoff hardening). **No code is changed by this pack** — it is an audit + target design + implementation plan for a later execution pass.

**Status:** ✅ **VERIFIED** — adversarial QA PASS (0 blockers; 25 findings reconciled into the docs) plus 2026-06-23 implementation-handoff hardening in `12-IMPLEMENTATION-PLAN.md`.
**Opened:** 2026-06-22 · **Surface:** the share modal + the shared modal primitives its bugs live in.

---

## Read this first

1. **`00-PLAN.md`** — goal, scope, non-goals, hard contracts, acceptance criteria, stop condition.
2. **`02-PROBLEM-REGISTER.md`** — the 32 problems, 11 root causes, 8 ranked top fixes, preserve list. (If you read only one doc, read this.)
3. **`12-IMPLEMENTATION-PLAN.md`** — canonical operator manual for future code implementation; includes phases, staffing, tests, UltraQA scenarios, and corrected Phase-4 scope.
4. **`11-ADVERSARIAL-QA-LEDGER.md`** — what the 5-reviewer adversarial pass found + how each finding was reconciled. Read before implementing.

## The two P0s (ship first)

- **PROB-01** — first-publish is the modal's *slowest* path (the headline job opens to an empty link field with Generate buried). → `03-TARGET-UX-AND-FLOWS.md`, implement via `12` Phase 5.2 `GeneratePanel`.
- **PROB-02** — WCAG-AA contrast failure (`#7F7F7F` load-bearing text). → `05-A11Y-AND-INTERACTION.md` A4, implement via `12` Phase 0 (mechanical token swap).

## Doc index

| # | Doc | What it is |
|---|-----|-----------|
| 00 | [PLAN](00-PLAN.md) | Goal, scope, orchestration, acceptance, hard contracts |
| 01 | [CURRENT-STATE-AUDIT](01-CURRENT-STATE-AUDIT.md) | Descriptive audit of the modal (anatomy, flows, visual, a11y, data, receiver) — file:line anchored |
| 02 | [PROBLEM-REGISTER](02-PROBLEM-REGISTER.md) | 32 problems · 11 root causes · 8 top fixes · conflicts · preserve list |
| 03 | [TARGET-UX-AND-FLOWS](03-TARGET-UX-AND-FLOWS.md) | 5→3-tab IA, primary "share" flow, 5-state machine, progressive disclosure |
| 04 | [TARGET-UI-AND-LAYOUT](04-TARGET-UI-AND-LAYOUT.md) | Type scale (link dominates), one-Paper surface, Option A/B sidebar, ASCII wireframes, component inventory |
| 05 | [A11Y-AND-INTERACTION](05-A11Y-AND-INTERACTION.md) | Focus model, keyboard map, ControlField ARIA contract, contrast fixes, nested-modal fix, motion |
| 06 | [UX-COPY](06-UX-COPY.md) | Voice principles, 22-row copy table (current→proposed), empty/error states, per-action success guidance |
| 07 | [COMPONENT-AND-FILE-PLAN](07-COMPONENT-AND-FILE-PLAN.md) | New + modified files, the extracted draft machine, sync/busy contracts |
| 08 | [IMPLEMENTATION-GUIDE](08-IMPLEMENTATION-GUIDE.md) | 6 phases, lowest-risk-first, gates, guardrails |
| 09 | [VERIFICATION-AND-QA-PLAN](09-VERIFICATION-AND-QA-PLAN.md) | Per-phase verify gates, manual flow matrix, a11y/responsive checks |
| 10 | [BLAST-RADIUS-AND-ROLLBACK](10-BLAST-RADIUS-AND-ROLLBACK.md) | Blast map (shared primitives = the real risk), risk rank, per-phase rollback |
| 11 | [ADVERSARIAL-QA-LEDGER](11-ADVERSARIAL-QA-LEDGER.md) | 5-reviewer QA verdicts + reconciliation of all 25 findings |
| 12 | [IMPLEMENTATION-PLAN](12-IMPLEMENTATION-PLAN.md) | Canonical execution handoff: phases, source map, staffing, tests, UltraQA, DoD |
| — | [LOOP_LEDGER](LOOP_LEDGER.md) | Phase coordination log |

## How this pack was made (provenance)

5-phase loop, lead (Claude) sole writer; all research/design/QA agents read-only + structured output (no file-write races):
- **Phase A** — 6 parallel auditors (code/UX/visual/a11y/data/receiver) + 1 synthesis agent → the problem register.
- **Phase C** — 5 parallel designers (UX/UI/a11y/motion/copy) → the target specs.
- **Phase E** — 5 adversarial reviewers (coherence/feasibility/a11y/scope/code-anchoring) → the QA ledger; majors reconciled back into the docs.

## Hard contracts (carry into execution)

White Paper modal surface · `#5D5D5D` for load-bearing text (not `#7F7F7F`) · radii only 3/8/12 · **no new RPCs** (`actions.ts` is FIXED) · preserve the optimistic reconcile, dual live regions, focus management, `confirmInFlightRef`, destructive-confirm copy, server guards · **DESIGN.md is an alpha guide — defer design calls (the A/B sidebar) to Philip.**

## Canonical implementation note

`12-IMPLEMENTATION-PLAN.md` supersedes earlier broad Phase-4 wording in `07`/`08`/`09`: the in-pack scope is minimal rotate/recipient busy mitigation plus optional expiry countdown. Full client-sync convergence, full `usePublicationBusy`, and server-side `expected_encrypted_token` for recipient add are a separate data-convergence follow-up.
