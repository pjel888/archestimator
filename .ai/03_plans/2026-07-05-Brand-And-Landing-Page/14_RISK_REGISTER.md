# 14 — Risk Register

**Source authority:** `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` (ASSUMP-*), `12_TEST_AND_VALIDATION_STRATEGY.md`.

---

## 1. Risk matrix

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| RISK-001 | Fabricate customer proof under pressure to "look legitimate" | Low | Critical | `08` §1 + `06` §5.2 + `company-proof-data.ts` gate; founder discipline; `MASTER §12.8` canon | Founder | Open (discipline) |
| RISK-002 | Founder rejects a safe default and the affected surface stalls | Low | Medium | Block only the affected surface; Phase 1A and other safe defaults proceed under `15` §0 | Founder | Open |
| RISK-003 | Voice recast reads as "less honest" to early fans of the brand | Medium | Medium | Founder signs off on each recast; the honesty principle stays as discipline, only the surfacing changes (`06` §2) | Founder | Open |
| RISK-004 | `/signup` ClosedBetaGate requires invite token and a "Start free" CTA dead-ends | Medium | High | Default to "Request access" until self-serve signup is verified | Implementation agent | Open |
| RISK-005 | Real screenshots would expose sensitive data | Low | High | Use seed/demo data only (`data/local/seed.json`); redact in image editor if needed | Implementation agent | Open |
| RISK-006 | Claims Ledger reorder breaks `claims-matrix-check.mjs` | Low | Medium | Phase 3B verifies gate still passes; update gate if reorder invalidates it | Implementation agent | Open |
| RISK-007 | A/B experiment variant B underperforms variant A | Medium | Low | Phase 6 stop conditions; rollback to variant A copy if needed | Founder | Open |
| RISK-008 | Voice drift after implementation — copy regressions creep back | Medium | Medium | Phase 1A lint rule (`bun run lint:landing-copy`) gates CI; ADV-009 adversarial test | Implementation agent | Open |
| RISK-009 | Lighthouse score regression from heavier screenshots | Medium | Medium | Phase 5 visual-QA + Lighthouse audit gate; `next/image` priority/lazy discipline | Implementation agent | Open |
| RISK-010 | Specialties expansion to 7 dilutes message | Low | Low | Each specialty has a one-line pain + one-line directed message; no padding | Founder | Open |
| RISK-011 | Removing the AI section makes buyers assume AI is shipped | Low | Medium | Claims Ledger NotUs row + `/trust` page continue to state the AI fact; FAQ answer for "How is this different from X?" mentions AI is on the roadmap if asked | Founder | Open |
| RISK-012 | Footer "Built in the Philippines" reads as offshore / lower-quality to non-PH buyers | Low | Low | Founder decision; alternative: "Built for the Philippines and SEA." | Founder | Open |
| RISK-013 | Plan age — landing copy drifts fast; audit line numbers in `03` become stale | High | Low | Implementation agent re-reads source files before each phase; audit re-validated at Phase 0 start | Implementation agent | Open |
| RISK-014 | Independent verifier never engaged → readiness stuck at `CONDITIONALLY READY` | Medium | Medium | Founder counts as the human verifier on brand voice recasts; only an independent reviewer can lift to `IMPLEMENTATION-READY` | Founder | Open |
| RISK-015 | Concurrent agent edits `landing-content.ts` during implementation | Low | High | `00` §6 concurrent safety discipline; coordination ledger; `git status` recheck | Implementation agent | Open |

---

## 2. Adversarial risk scenarios (already in `12` §3 + `17` §4)

| Scenario | Mitigation |
|---|---|
| Founder rejects a safe default | Block only that surface; Phase 1A and unrelated safe defaults proceed |
| Plan recasts a canon string | Plan does NOT recast canon; OPEN-DECs gate every recast |
| Plan invents customer proof | Explicitly banned; `company-proof-data.ts` gate preserved |
| Plan claims roadmap as shipped | Live/Building/Planned/NotUs taxonomy preserved; lint catches regressions |
| Plan touches authenticated app | Out of scope; `02` §2 explicit |
| Plan deletes Claims Ledger | Preserved; only rendering order changes |
| Plan adds new dependencies | None added; `09` extends DESIGN.md only |
| Plan commits to launch date | None; `02` §5 explicit |
| Plan changes pricing numbers | Numbers deferred to `MASTER §9` |
| Plan lint rule breaks CI | Lint rule is additive; can be merged independently |

---

## 3. Top 3 risks (founder attention)

1. **RISK-001 — Fabrication pressure.** When the page launches and there's pressure to "look legitimate", there will be temptation to invent customer logos or metrics. The plan holds the line via `MASTER §12.8` + the lint rule + the founder's own discipline. This is the brand's single most important boundary.

2. **RISK-003 — Voice recast feels "less honest."** The plan recasts "we have no logos, no metrics, no AI" off the conversion surface. Some early supporters of the brand may read this as a step toward hype. Mitigation: the honesty principle stays; only the surfacing changes. The `/trust` page + Claims Ledger footer carry the boundary lines.

3. **RISK-014 — Independent verifier.** This plan is `verification_mode: emulated`. Without an independent reviewer, readiness is capped at `CONDITIONALLY READY`. The founder counts as the human verifier for brand voice recasts; a separate reviewer (another agent or human) would be needed to lift to `IMPLEMENTATION-READY`.

---

## 4. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Risk matrix | `17` residual gates; `15` ASSUMP-* |
| §2 Adversarial scenarios | `12` §3 ADV-* matrix |
| §3 Top 3 risks | `01` executive summary "what this plan does NOT do" |
