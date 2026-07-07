# 16 — Requirements Traceability Matrix

Maps every requirement (`04`) → source → outcome → phase/task → code area → acceptance criteria → test → rollout check → status.

| Req ID | Source | User outcome | Phase / Task IDs | Code area | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| FR-LG-01 | brief | One command, one status | P5 / WP-5.1, WP-5.2 | `scripts/run-launch-evidence-gate.ts`, `package.json` | AC1-4 (04) | TEST-LG-01, integration | Ring 0 emits report | pending |
| FR-LG-02 | brief+repo | All domains covered | P0 / WP-0.1 | `scripts/launch-gate/domains.ts` | AC1-3 | domains.test.ts | Registry review | pending |
| FR-LG-03 | brief | Verdict classification | P0 / WP-0.2 | `scripts/launch-gate/classifier.ts` | AC1-3 | classifier.test.ts | n/a | pending |
| FR-LG-04 | brief+derived | 3-status model | P0 / WP-0.2 | classifier.ts | AC1-3 | classifier.test.ts | n/a | pending |
| FR-LG-05 | brief+repo | Evidence-class labels | P2 / WP-2.2 | extractors.ts | AC1-3 | extractors.test.ts | n/a | pending |
| FR-LG-06 | repo+derived | Freshness TTL | P0 / WP-0.3 | freshness.ts | AC1-3 | freshness.test.ts | n/a | pending |
| FR-LG-07 | brief+repo | Canonical reports | P4 / WP-4.1-4.3 | report-json/markdown/output.ts | AC1-4 | report-json/markdown snapshot | Report review | pending |
| FR-LG-08 | brief+derived | Staged modes | P3 / WP-3.2 | modes.ts | AC1-3 | modes.test.ts | n/a | pending |
| FR-LG-09 | derived | file:line citations + producer pin | P1 / WP-1.1, P2 | anchor-matrix.md, reader.ts | AC1-2 | extractors.test.ts | n/a | pending |
| OPS-LG-01 | repo | Read-only, no mutation | P3 / WP-3.1 | executor.ts | AC1-2 | executor.test.ts (grep) | Static assertion | pending |
| OPS-LG-02 | derived | Idempotent, parallel-safe | P4 / WP-4.3 | output.ts | AC1-2 | concurrent test | n/a | pending |
| OPS-LG-03 | repo | CI integration opt-in | P6 / WP-6.1 | `.github/workflows/launch-gate.yml` | AC1-3 | dry CI run | Ring 2 (owner) | pending |
| OPS-LG-04 | brief | Rollback criteria | (docs) | `13` §3 | defined | n/a | n/a | pending |
| SEC-LG-01 | repo | No secrets in reports | P4 | report emitters | AC1-2 | redaction.test.ts | n/a | pending |
| SEC-LG-02 | derived | Not bypassable | P0/P5 | classifier + CLI | AC1-2 | adversarial ADV-10/11 | n/a | pending |
| SEC-LG-03 | repo | Sanitized labels | P2 | extractors.ts | AC1-2 | extractors.test.ts | n/a | pending |
| REL-LG-01 | derived | Graceful missing/stale | P2 | reader.ts | AC1-3 | reader.test.ts adversarial | n/a | pending |
| REL-LG-02 | derived | Conflict resolution | P0 | classifier.ts | AC1-2 | classifier.test.ts | n/a | pending |
| TEST-LG-01 | derived | Aggregator unit tests | P0 / WP-0.4 | tests/unit/launch-gate/* | AC1-2 | self | n/a | pending |
| TEST-LG-02 | derived | Adversarial matrix | P0+ | `12` §3 | matrix complete | ADV-01..17 | n/a | pending |
| DOC-LG-01 | brief | Owner-visible status | P4/P7 | report-markdown.ts, OWNER_RUNBOOK | AC1-2 | snapshot + owner review | Ring 1 | pending |
| DOC-LG-02 | brief | Pack documents surface | (this pack) | `03`,`06`,`13` | AC-P-03..09 | this matrix | n/a | pending |
| ARCH-LG-01 | derived | Thin aggregator | P0-P5 | all gate files | AC1 | code review | n/a | pending |
| ARCH-LG-02 | derived | Anchor authority preserved | P0 | classifier.ts | AC1 | classifier.test.ts | n/a | pending |
| UX-LG-01 | brief | Single-decision signal | P4 | report-markdown.ts | AC1-2 | snapshot | Ring 1 | pending |

**No requirement untraced.** Every requirement maps to a phase/task, code area, AC, test, and rollout check.

## Performance-sensitive requirements — extra mapping

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-LG-01 AC4 (wall-clock) | TBD Ring 0 | ≤120s | `time bun run launch:gate --local` | >120s | Ring 0 fail |
| OPS-LG-02 (concurrent) | n/a | no corruption | concurrent test | corruption | investigate |
| (DOM-27 hosted perf — aggregated) | known misses | p95 budgets | `cf:verify-hosted-performance` | sibling pack | sibling pack rollback |
