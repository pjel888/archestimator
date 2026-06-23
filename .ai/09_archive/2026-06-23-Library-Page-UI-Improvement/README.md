# Library Page UI Improvement - Plan Pack

A planning-only UI improvement pack for the Library route family. It answers the brief: audit why the current Library UI feels older than Dashboard, Projects, Estimate Sheet, and Project Dashboard surfaces; study the liquid-glass system and `HeaderIconToolbar`; then define a safe, comprehensive implementation plan.

**Status:** VERIFIED - 100% planning-readiness after dimensional audit and reconciliation.
**Opened:** 2026-06-23.
**Surface:** `/workshop/library` overview, Components, Templates browse, Template Editor, and shared Library chrome.
**Code changes:** none in this pack.

## Read This First

1. `00-PLAN.md` - scope, non-goals, hard constraints, stop rule, and acceptance summary.
2. `03-LIBRARY-GAP-ANALYSIS.md` - ranked visual and interaction problems, with must-fix versus defer split.
3. `06-IMPLEMENTATION-ROADMAP.md` - ordered execution slices and what each phase must not touch.
4. `12-READINESS-SCORECARD-AND-GAP-CLOSURE.md` - subagent ratings, blocked dimensions, and closure evidence.
5. `13-SECURITY-DATA-NETWORK-RISK.md` - behavior, authz, cache, provider, and network boundaries.
6. `14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md` - exact phase commands, browser states, artifact schema, and Visual Ralph gate.

## Doc Map

| # | Doc | Purpose |
|---|---|---|
| 00 | [PLAN](00-PLAN.md) | Canonical task contract, scope, constraints, references, acceptance |
| 01 | [CURRENT-STATE-AUDIT](01-CURRENT-STATE-AUDIT.md) | Source-grounded inventory of the current Library route family |
| 02 | [TARGET-VISUAL-SYSTEM-AUDIT](02-TARGET-VISUAL-SYSTEM-AUDIT.md) | Dashboard, Projects, Estimate Sheet, Project Dashboard comparison |
| 03 | [LIBRARY-GAP-ANALYSIS](03-LIBRARY-GAP-ANALYSIS.md) | Ranked problems, user impact, files, must-fix/defer |
| 04 | [HEADER-ICON-TOOLBAR-STUDY](04-HEADER-ICON-TOOLBAR-STUDY.md) | `HeaderIconToolbar` usage, slot rules, action-label policy, risks |
| 05 | [TARGET-EXPERIENCE-AND-LAYOUT](05-TARGET-EXPERIENCE-AND-LAYOUT.md) | Target IA, pane grammar, states, mobile, focus |
| 06 | [IMPLEMENTATION-ROADMAP](06-IMPLEMENTATION-ROADMAP.md) | Phases, dependencies, ownership lanes, rollback points |
| 07 | [ACCEPTANCE-CRITERIA](07-ACCEPTANCE-CRITERIA.md) | Testable visual, behavior, a11y, responsive, scope criteria |
| 08 | [VERIFICATION-AND-VISUAL-QA-MATRIX](08-VERIFICATION-AND-VISUAL-QA-MATRIX.md) | Static, DOM, browser, screenshot, artifact, pass/fail gates |
| 09 | [BLAST-RADIUS-AND-ROLLBACK](09-BLAST-RADIUS-AND-ROLLBACK.md) | Shared-surface risk and rollback strategy |
| 10 | [DECISIONS-DEPENDENCIES-OPEN-QUESTIONS](10-DECISIONS-DEPENDENCIES-OPEN-QUESTIONS.md) | Decisions made, dependencies, resolved defaults, and phase gates |
| 11 | [ADVERSARIAL-QA-LEDGER](11-ADVERSARIAL-QA-LEDGER.md) | Independent review ledger and reconciliation |
| 12 | [READINESS-SCORECARD-AND-GAP-CLOSURE](12-READINESS-SCORECARD-AND-GAP-CLOSURE.md) | Ratings, closure of audit gaps, final planning-readiness claim |
| 13 | [SECURITY-DATA-NETWORK-RISK](13-SECURITY-DATA-NETWORK-RISK.md) | Security, database, cache, provider, network, and forbidden-diff inventory |
| 14 | [IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT](14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md) | Exact phase proof commands, browser matrix, artifacts, and visual verdict schema |
| - | [LOOP_LEDGER](LOOP_LEDGER.md) | Coordination log, agent lanes, evidence markers |

## Source Of Truth Notes

- `DESIGN.md` is the current design authority, but it explicitly marks the Dashboard language as path-scoped and exploratory. This pack treats Dashboard as visual inspiration, not as a global component contract.
- The primary implementation baseline is the Estimate Sheet's workspace grammar: liquid-glass rails/chrome, crisp paper for dense content, sticky 38px local headers, compact controls.
- Projects and Project Dashboard supply collection-card and dashboard-panel evidence. They do not authorize dashboard-scale type or decorative bento composition in the Library.
- The current Library has already passed functional, dense, provider, and browser matrices in earlier work. This new pack is a visual-unification plan, not a request to reopen data, authz, taxonomy, or performance architecture.

## The Core Decision

Unify the entire Library route family under one visual system, but execute it in narrow slices:

1. Surface foundation and Library slot contract.
2. Overview recomposition for the first-impression route.
3. Components visual pass.
4. Templates browse parity.
5. Template Editor polish.
6. Shared primitive cleanup only after Library-local surfaces prove the contract.

## Stop Condition

This pack is complete when the documents are internally consistent, source-grounded, independently reviewed, statically clean, and every review blocker has either a resolved default, a phase gate, or an explicit out-of-scope boundary. It does not claim browser visual proof because no UI implementation is changed here.
