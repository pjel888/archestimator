# 16 — Requirements Traceability Matrix

Every requirement is traced: source → user outcome → implementation phase/task → code area →
acceptance criterion → validation → rollout check → status. No requirement is untraced.

| Req ID | Source | User outcome | Phase / Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-FR-01 | PROMPT.md "local-vs-remote migration ledger"; `current-state.md:271` | Operator can diff local dir ↔ remote tracker in minutes | Phase 1 / T-03; Phase 3 / T-05 (remote) | new `scripts/audit-d1-migration-state.ts` | AC-FR-01a/b/c | `tests/unit/scripts/audit-d1-migration-state.test.ts`; hosted `--remote` (owner) | First-users gate: remote ledger known | pending (local impl-ready); remote BLOCKED-EXTERNAL |
| REQ-FR-02 | PROMPT.md "migration application order" | Unambiguous apply order + dependency map | (this plan) / n/a | `07_…` §7.2 | AC-FR-02a/b | doc-review cross-check vs `rg` | n/a | proven |
| REQ-FR-03 | PROMPT.md "rollback/rehearsal limits"; `generate-cloudflare-d1-restore-rehearsal.ts:75,77,81` | Restore options + limits + real-schema rehearsal | Phase 5 / T-07, T-08 | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (extend) | AC-FR-03a/b/c | extended restore-rehearsal unit test; hosted (owner) | Hosted restore rehearsal (recommended) | proven (docs); pending (local extension); hosted BLOCKED-EXTERNAL |
| REQ-DATA-01 | PROMPT.md "schema verification SQL"; `migrations/` | All 69 app tables verified | Phase 2 / T-04 | new `scripts/verify-d1-schema-integrity.ts` | AC-DATA-01a/b | `tests/unit/scripts/verify-d1-schema-integrity.test.ts`; local + remote run | Remote schema verified (first-users gate) | pending (local impl-ready); remote BLOCKED-EXTERNAL |
| REQ-DATA-02 | PROMPT.md "schema verification SQL"; `migrations/` | All 134 indexes + 4 triggers verified | Phase 2 / T-04 | (same) | AC-DATA-02a/b | (same) | (same) | pending (local impl-ready); remote BLOCKED-EXTERNAL |
| REQ-DATA-03 | `better-auth-proof-router.ts:63-69` | Auth tables (4+3) verified; out-of-band nature documented | Phase 2 / T-04; Phase 3 / T-05 | (same) | AC-DATA-03a/b/c | (same) + doc review | (same) | pending; remote BLOCKED-EXTERNAL |
| REQ-DATA-04 | PROMPT.md "fix-forward policy"; `migrations/` | Every non-idempotent migration has a fix-forward action | (this plan) / n/a | `07_…` §7.3 | AC-DATA-04a/b/c | doc-review | Operator follows §7.3 | proven |
| REQ-DATA-05 | PROMPT.md "destructive-change review" | All 38 classified | (this plan) / n/a | `07_…` §7.2 | AC-DATA-05a | doc-review | n/a | proven |
| REQ-ARCH-01 | `package.json`, `README.md:66` | No custom runner; Wrangler stays canonical | (this plan) / n/a | none introduced | AC-ARCH-01a | `rg 'd1 migrations apply' scripts/` (expect only Wrangler) | n/a | proven |
| REQ-ARCH-02 | `better-auth-proof-router.ts:120-128`; `verify-cloudflare-hosted-upload-ui-proof.ts:241-266` | Verifier reuses existing patterns | Phase 2 / T-04 | (same as DATA-01) | AC-ARCH-02a | doc-review (task cites both sources) | n/a | proven |
| REQ-SEC-01 | `migrations/0033,0034,0035` | Compliance tables + HMAC gate verified | Phase 2 / T-04; Phase 3 / T-05 | (same) | AC-SEC-01a | verifier compliance-gate unit test; remote (owner) | Remote compliance gate (first-users gate) | pending; remote BLOCKED-EXTERNAL |
| REQ-REL-01 | `generate-cloudflare-d1-restore-rehearsal.ts:92-154` | Restore rehearsal covers real schema | Phase 5 / T-07 | `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | AC-REL-01a | extended rehearsal unit test; hosted (owner) | Hosted restore rehearsal (recommended) | pending (local impl-ready); hosted BLOCKED-EXTERNAL |
| REQ-OPS-01 | PROMPT.md "CI/release checks"; `README.md:36,39,211`, `AGENTS.md:40` | Recurring doc drift caught automatically | Phase 4 / T-06 | new `scripts/check-doc-migration-counts.mjs` | AC-OPS-01a/b/c | `tests/unit/scripts/check-doc-migration-counts.test.ts` | CI gate (when GH Actions restored) | pending (impl-ready) |
| REQ-TEST-01 | Creating-Plan-Prompt §12 | Every req mapped to evidence | (this plan) / n/a | `12_…` matrix | AC-TEST-01a | doc-review | n/a | proven |
| REQ-DOC-01 | `README.md:36,39,211` drift | README matches reality | Phase 0 / T-01 | `README.md` | AC-DOC-01a | T-06 guard passes | n/a | pending (impl-ready) |
| REQ-DOC-02 | `AGENTS.md:40` drift | AGENTS matches reality | Phase 0 / T-00 | `AGENTS.md` | AC-DOC-02a | T-06 guard passes | n/a | pending (impl-ready) |
| REQ-DOC-03 | PROMPT.md premise staleness | Future reader not misled | Phase 0 / T-02 | `PROMPT.md` (this folder) | AC-DOC-03a | doc-review | n/a | proven (recorded in `02_…`) |

## Performance-sensitive requirements

None of the requirements are performance-sensitive (no runtime/user-facing perf claim).
Therefore the per-requirement perf fields (baseline/target/measurement/regression/rollback)
are n/a with the reason recorded in `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` §9.1.

## Coverage summary

- **Total requirements:** 16 (FR: 3, DATA: 5, ARCH: 2, SEC: 1, REL: 1, OPS: 1, TEST: 1, DOC: 3).
- **Proven (satisfied by this plan):** 8 (REQ-FR-02, REQ-FR-03-docs, REQ-DATA-04, REQ-DATA-05, REQ-ARCH-01, REQ-ARCH-02, REQ-TEST-01, REQ-DOC-03).
- **Pending implementation (local, impl-ready):** 7 (REQ-FR-01-local, REQ-DATA-01, REQ-DATA-02, REQ-DATA-03-local, REQ-SEC-01-local, REQ-REL-01-local, REQ-OPS-01, REQ-DOC-01, REQ-DOC-02).
- **Pending hosted proof (BLOCKED-EXTERNAL):** 5 remote sub-slices (REQ-FR-01-remote, REQ-DATA-03-remote, REQ-SEC-01-remote, REQ-REL-01-hosted, plus REQ-FR-03-hosted).
- **Untraced:** 0.
- **Internally blocked:** 0 (all internal work has exact paths).

Every requirement maps to source evidence, an implementation task or a proven doc, an
acceptance criterion, a validation method, and (where applicable) a rollout check.
