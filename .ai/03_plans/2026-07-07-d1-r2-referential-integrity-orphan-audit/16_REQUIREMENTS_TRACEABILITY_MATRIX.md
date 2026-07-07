# 16 — Requirements Traceability Matrix

Every requirement maps to source, user outcome, implementation phase, task IDs, code areas, acceptance criteria, test coverage, and rollout check. No requirement is untraced.

The main matrix below uses the column vocabulary mandated by `Improve-Plan-Prompt.md:546-548`: `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`. Source-strength values are the sanctioned set: `brief` | `repo evidence` | `assumption` | `derived`.

| Requirement | Source evidence (Source ID) | Source strength | Plan section (Work item) | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|
| FR-001 | PROMPT.md "ownership relationship" (SRC-1) | `brief` + `repo evidence` | `06`/T1.2 | manifest count == 69 tables; 0014 `none`; derived not hand-maintained | `orphan-manifest.test.ts` (snapshot) | RISK-014 manifest drift | designed | none |
| FR-002 | PROMPT.md "orphan checks" (SRC-1) | `brief` + `repo evidence` | `06`/T2.2 | covers ORPH-001…015 (see ORPH matrix); zero writes; exit codes | TEST-001 + TEST-002 | RISK-008 full-scan | designed | none |
| FR-003 | PROMPT.md "object checks"; `03` §4 (SRC-1, SRC-2) | `brief` + `repo evidence` | `06`/T3.1 | paginated; 3 prefixes; set-diff; cost cap | reconcile test | RISK-007 R2 cost | designed | none |
| FR-004 | PROMPT.md "safe reporting"/"keep secrets out" (SRC-1) | `brief` | `05`/T4.1 | schema-locked; no secret fields; SHA prefixes | TEST-003 | RISK-006 leak | designed | none |
| FR-005 | PROMPT.md "owner-review gate" (SRC-1) | `brief` | `06`/T6.1 | `--from-report`+`--confirm`+token; before/after diff; per-class allowlist (see `06`) | repair test | RISK-005 false-positive delete | conditionally ready | OPEN: reviewer sign-off on allowlist |
| FR-006 | PROMPT.md "retention/DSAR interaction" (SRC-1) | `brief` + `derived` | `07`/T9.1 | `legal_hold_excluded` count; per-user query template | detect test variant | RISK-010 DSAR gap | designed | none |
| FR-007 | PROMPT.md "CI/operator cadence" (SRC-1) | `brief` | `13`/T5.1,T5.2 | script exists; runbook; P0>0 fails run | smoke test | RISK-015 CI disabled | designed | GitHub Actions disabled → manual cadence (known-red ledger `12`) |
| DATA-001 | `03` §6 (SRC-2) | `repo evidence` | `11` P1/T1.1 | 38 migrations apply; **69 tables**; FK check empty | `apply-all-migrations.test.ts` | ASSUMP-008 | designed | none |
| DATA-002 | `03` §0 (SRC-2) | `repo evidence` | `11` P2/T2.2 | `fk_enforcement` field | detection test | ORPH-015 | designed | none |
| DATA-003 | `03` §4.1 O-1 (SRC-2) | `repo evidence` | `11` P7/T7.1 | cascade-off → 0 survivors | cascade-off test | none | designed | none |
| DATA-004 | `03` §0 (SRC-2) + OPEN-DEC-001 | `repo evidence` + `derived` | `11` P8/T8.1,T8.2 | pragma on; cascade suite green | TEST-004 | RISK-009 pre-existing violations | **blocked** | **OPEN-DEC-001** (owner decision) |
| SEC-001 | PROMPT.md mode (SRC-1) | `brief` + `repo evidence` | `06` AD-1/T2.1,T2.3 | type-level ReadOnlyD1; projection denylist (`password_hash` etc.); zero writes | TEST-002 | none | designed | none |
| SEC-002 | FR-004 (SRC-1) | `derived` | `05`/T4.1 | alias of FR-004 | TEST-003 | none | designed | none |
| SEC-003 | AGENTS.md; PROMPT.md (SRC-1, SRC-3) | `repo evidence` | `08`/T6.1 | refuses without token; token never logged/persisted; destroyed after window | gate test + no-log assertion | none | designed | none |
| SEC-004 | `08` taxonomy; `actions.ts:1012-1026` (SRC-2) | `repo evidence` | `08`/`11` P6+prevent | revoke nulls `password_hash`/`encrypted_token`; ORPH-014 detection; denial test | revoke-clears-hash + denial test | RISK-002 | designed | none |
| SEC-005 | `08` residual risk; upload-cleanup pattern (SRC-2) | `repo evidence` + `derived` | `08`/optional route | cron route 401s without `CRON_SECRET`; gate test | gate test | none | conditional | applies only if route built |
| SEC-006 | `Improve-Plan-Prompt.md:218-222`; `security.ts:194-196` (SRC-4, SRC-2) | `repo evidence` + `derived` | `08`/new test | `credentialVersion` non-invertible + rotates on pw change | `publication-credential-version.test.ts` | none | designed | closes cap-rule exception |
| PERF-001 | `03` §1; `09` (SRC-2) | `repo evidence` + `assumption` (ASSUMP-007) | `09`/T2.2 | EXPLAIN artifacts; p95 ≤200ms @10x | perf baseline | RISK-008 index gap | designed | ASSUMP-007 unverified until Phase 2 |
| PERF-002 | `03` §3; `20` (SRC-2) | `repo evidence` + `derived` | `09`/T3.1 | paginated; cap aborts; reports cost | reconcile cap test | RISK-007 | designed | cost inputs TBD until first preview run (`20`) |
| REL-001 | `03` §4.1 O-2 (SRC-2) | `repo evidence` | `06`/T6.1 | per-action idempotent; re-run no-op; `head()` pre-delete confirmation | repair idempotency test | RISK-005 | designed | none |
| OPS-001 | PROMPT.md cadence (SRC-1) | `brief` | `13`/T5.2 | runbook; P0 threshold; escalation | runbook review | RISK-015 | designed | none |
| TEST-001 | `12` (SRC-2) | `derived` | `12`/T2.2 | planted orphans found | itself | none | designed | none |
| TEST-002 | SEC-001 (SRC-2) | `derived` | `12`/T2.3 | zero writes | itself | none | designed | none |
| TEST-003 | FR-004 (SRC-2) | `derived` | `12`/T4.1 | zero secret hits | itself | none | designed | none |
| TEST-004 | DATA-004 (SRC-2) + OPEN-DEC-001 | `derived` | `12`/T8.2 | each cascade edge | itself | none | **blocked** | **OPEN-DEC-001** |
| DOC-001 | FR-001 (SRC-2) | `derived` | `11`/T1.2 | manifest exists; referenced | snapshot | none | designed | none |
| ARCH-001 | repo conventions (SRC-3) | `derived` | `06`/T2.1 | path + port | structure review | RISK-013 coupling | designed | none |
| DB-CHG-004 | `retention-core.ts:41`; OPEN-DEC-003 (SRC-2) | `repo evidence` + `derived` | `07`/T9.2 | `uploads_orphaned` rule added (selectSql/applySql); TTL 90d | extend `compliance-retention-repository.test.ts` | none | designed | **OPEN-DEC-003** (promoted from blueprint to work item; traces to FR-006 + T9.2) |

**Source register:**
- SRC-1 = PROMPT.md (the FEATURE BRIEF) — `brief`.
- SRC-2 = `03_SOURCE_AND_CODEBASE_AUDIT.md` and the repo files it cites — `repo evidence`.
- SRC-3 = AGENTS.md / repo conventions — `repo evidence`.
- SRC-4 = `Improve-Plan-Prompt.md` standard mandates — `derived` (the standard's requirements flow down).

**DB-CHG-004 traceability note:** DB-CHG-004 was previously a "Database change blueprint" in `07` with no requirement row. It is now traced here as a work item mapping to FR-006 (DSAR interaction needs the retention home) + OPEN-DEC-003, satisfying the standard's "any work item must trace to a source requirement or recorded decision" rule.

## Performance-sensitive requirements — extra mapping

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-001 | query plan index use | p95 ≤200ms @10x | EXPLAIN + perf fixture | >2x median | add index or document bounded scan |
| PERF-002 | list_calls on seeded set | est. cost ≤ cap | report `r2_reconciliation` | >2x at same key count | abort scan |
| FR-002 | detection wall-clock | ≤60s preview | timed dry-run | >2x | partial report |

## ORPH-target coverage matrix

Every orphan target defined in `03` §7 maps to a detection class, a requirement, a task, and a test. This closes the aggregate-vs-enumerated gap: FR-002's "covers ORPH-001…015" acceptance criterion is decomposed here.

| ORPH ID | Class | Detection surface | Requirement | Task | Test |
|---|---|---|---|---|---|
| ORPH-001 | A (D1→D1) | 0014 publication cluster (7 tables, no FK) | FR-002 | T2.2 | TEST-001 |
| ORPH-002 | B/C (R2↔D1) | user DELETE routes desync R2/D1 | FR-003 | T3.1 | reconcile test |
| ORPH-003 | D (cross-store drift) | bulk project delete two-phase | FR-003 | T3.1 | reconcile test |
| ORPH-004 | A | `estimate_sheet_events`/`adjustments` transitive cascade (O-1) | FR-002, DATA-003 | T2.2, T7.1 | TEST-001, cascade-off test |
| ORPH-005 | A | AI audit chain `workspace_id` plain | FR-002 | T2.2 | TEST-001 |
| ORPH-006 | A | `account_security_events` refs plain | FR-002 | T2.2 | TEST-001 |
| ORPH-007 | B/C | `upload_assets.project_id=NULL` ghost + R2 (O-3) | FR-003 | T3.1 | reconcile test |
| ORPH-008 | B/C | estimate-row image R2 never cleaned (O-3a) | FR-003 | T3.1 | reconcile test |
| ORPH-009 | A | `estimate_nodes.parent_id` self-ref plain | FR-002 | T2.2 | TEST-001 |
| ORPH-010 | A | `beta_feedback_submissions` refs plain | FR-002 | T2.2 | TEST-001 |
| ORPH-011 | A | `cost_library_item_variant_attachments` refs plain (+R2) | FR-002, FR-003 | T2.2, T3.1 | TEST-001, reconcile test |
| ORPH-012 | B/C | cleanup job leaves D1 tombstones | FR-003 | T3.1 | reconcile test |
| ORPH-013 | A | `mass_deletion_storage_cleanup_results` forward-ref plain | FR-002 | T2.2 | TEST-001 |
| ORPH-014 | A + **security** | revoked publication retains `password_hash` (public-route-accepted scrypt hash) + children (O-4) | **FR-002, SEC-004** | T2.2, T6.1, revoke patch | TEST-001, revoke-clears-hash, denial test |
| ORPH-015 | Engine (meta) | FK enforcement unverified (`PRAGMA foreign_keys`) | DATA-002, DATA-004 | T2.2, T8.1 | TEST-001 readback, TEST-004 (gated) |

All 15 ORPH targets are covered by at least one requirement, one task, and one test. ORPH-014 is reclassified P0 and now traces to SEC-004 (destroy-on-revoke) in addition to FR-002.

## Untraced items

None. Every requirement (27 IDs including SEC-004/005/006 and DB-CHG-004), every implementation task (T1.1–T9.2) maps to ≥1 requirement, and every ORPH-* target in `03` §7 maps to ≥1 detection query in FR-002/FR-003 (enumerated in the matrix above). Every requirement carries a source-strength tag.
