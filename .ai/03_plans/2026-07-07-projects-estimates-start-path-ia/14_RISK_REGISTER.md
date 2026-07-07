# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Empty-state copy/visual rejected by owner | OPEN-DEC-01 unresolved | Medium | Low | Low | FR-01 copy | owner review | recommended defaults provided | swap copy (trivial) | proceed with default, update on confirm | owner | Low | open |
| RISK-02 | Template-chooser product direction undecided | OPEN-DEC-02 | Medium | Medium | Medium | FR-04 (P3) | owner decision | isolate P3 behind the decision | defer P3 | ship P1/P2/P4 without P3 | owner | Low | open |
| RISK-03 | Start-route landing disagreement (Dashboard vs Estimates) | OPEN-DEC-03 | Low | Low | Low | FR-05 | owner decision | recommended Dashboard | one-line href change either way | ship with Dashboard default | owner | Low | open |
| RISK-04 | Giant-component edit causes regression | editing `projects-page-client.tsx` / `ProjectEstimatesTable.tsx` | Medium | Medium | Medium | FR-01/03 | DOM tests + perf baselines | keep edits surgical; prefer new small components | revert slice | git revert | impl | Low | open |
| RISK-05 | Concurrent agent overwrites shared file | shared worktree | Medium | Medium | Medium | all P2 tasks | `git status` + `git diff --check` | file-ownership ledger; re-read before edit | re-apply cleanly | coordinate | impl | Low | open |
| RISK-06 | Performance baseline regression | new empty-state node adds render cost | Low | Medium | Low-Med | PERF-01/02 | perf tests | derive from existing props; lazy-load if needed | lazy-load + re-measure | revert | impl | Low | open |
| RISK-07 | Analytics PII leak | future event adds name field | Low | High | Med-High | SEC-02 | redaction test | redaction test gates merge | extend redaction test | revert + fix | impl | Low | open |
| RISK-08 | Sibling-plan conflict on shared files | `first-user-activation` edits same files | Medium | Medium | Medium | FR-01/02/04 | coordination ledger | reconcile before edit | merge both designs | owner adjudicates | owner+impl | Low | open |
| RISK-09 | Auto-seed regression | refactor breaks `NewProjectForm:335` seed | Low | High | Med | FR-07 | new-project-form tests | verification task P2-T4 | restore seed | fix-forward | impl | Low | open |
| RISK-10 | Over-decoration creeps in | empty states become marketing-hero | Low | Low | Low | UX-01 | design-system lint + review | reuse `EmptyState` primitive; dense type | tone down | revert | impl+design | Low | open |
| RISK-11 | Browser-only claims unproven at impl | focus/responsive issues slip | Medium | Medium | Medium | A11Y-01/02/03 | impl Playwright pass | plan names the deferred scope | run targeted Playwright | fix-forward | impl | Med until impl QA | open |
| RISK-12 | Base DDL missing from migrations surfaces later | schema archaeology | Low | Low | Low | DATA-01 (precondition) | flagged in plan | none needed (no schema change) | document | n/a | — | Low | noted |

No unmitigated critical/high risk. RISK-11 is the main residual until implementation runs the deferred browser proof.
