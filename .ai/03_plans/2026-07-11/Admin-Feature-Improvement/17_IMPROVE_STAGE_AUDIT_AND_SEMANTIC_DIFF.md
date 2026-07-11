# Improve-Stage Audit and Semantic Diff

## Control Record

- mode: `PLAN_ONLY`; no application, test, migration, provider, browser, or hosted-resource file was changed by this lane;
- goal/run: Codex native goal `019f4f58-08ab-7050-b894-436d9839145e`;
- workflow substitution: OMX runtime workflows named by the user are unavailable directly in this Codex App session, so the lead used the native goal/plan ledger plus role-specialized `explore`, `architect`, and `critic` read-only lanes under AGENTS.md;
- mandatory preflight: `bun run supermemory:ensure` passed; relevant memory search returned no newer product truth, so current `.ai` and source governed;
- browser proof: intentionally not run because this is planning-only and no browser-only claim is being promoted;
- write ownership: lead only for this plan folder; child lanes were read-only; no source/migration/provider lease was acquired.

## Before-State Invalidation

The incoming manifest claimed `CONDITIONALLY_READY`, `NOT_STARTED`, `BOUNDARY`, `ACTIVE`, next `UNIT-001`, with HEAD `6069d87c271dc1509e97d1155da4d62c78d771cd`. Its scoped status/diff hashes and Activity/Corporate/Teamwork receipts no longer matched the live worktree. Structural validation still passed, demonstrating that stored hashes alone were insufficient semantic freshness evidence. Improve-stage work therefore treated the incoming ready claim and planning evidence as invalid until this audit, repairs, independent reviews, and final refreeze completed.

## Semantic Diff

| Area | Before | Improve-stage decision/repair | Affected IDs |
| --- | --- | --- | --- |
| notification scheduling | one scheduled occurrence; recurrence excluded | bounded recurring schedules, immutable revisions/occurrences, DST policy, series edit/cancel/retract, history and occurrence metrics are required | REQ-007, REQ-010, DATA-004, UNIT-007/009/010, DEC-AUTO-006/013 |
| templates | UI/unit mention without aggregate | versioned/archivable templates copied into campaign versions; never directly publishable | REQ-008, UNIT-007, DEC-AUTO-013 |
| future users | dynamic policy conflicted with frozen retries | append-only enrollment occurrences/windows, high-water marks, unique user/window identity; retry never expands | REQ-009/011/013, UNIT-008/009/010, DEC-AUTO-007 |
| preferences | policy prose only | `/settings/notifications`, typed actions/defaults, surface semantics, quiet-hour deferral, digest buckets/jobs, mandatory precedence | REQ-015, DATA-004, UNIT-008/009/010, DEC-AUTO-014 |
| identity targeting | mismatch states not closed over audience | explicit reconciliation-state eligibility matrix and canonical-to-inbox adapter; explicit IDs cannot bypass | REQ-009, SEC-004, UNIT-008 |
| fresh auth | requirement lacked a proofable primitive | version-matched Better Auth receipt; one-time actor/session/action-bound evidence; max 10 minutes; dependent actions disabled until proven | SEC-003, UNIT-003/006/007/010 |
| online presence | aggregate DO could leak if naively extended | v2 self-only writer versus admin sensitive-reader protocol; aggregate-only compatibility and denial matrix | REQ-005, DATA-002, UNIT-004 |
| account notices | inaccessible inbox could be mislabeled delivered | separate transactional security-notice outbox; provider-disabled truth; optional hosted email proof | REQ-006, UNIT-006/018 |
| cost | procedural estimate only | explicit D1/Queue/Worker formulas, 10k-user scenarios, 50% normal/70% peak quota headroom, guarded defaults | PERF-002/003, UNIT-009/017, AUTH-001 |
| ordinary choices | plugin/API/placeholder/tool/queue/approval choices deferred | closed by DEC-AUTO-015 through 019 with reversal triggers | DEC-AUTO-015..019 |
| execution ordering | publishing preceded kill switches; support retention preceded support schema | UNIT-007/009 depend on UNIT-012; UNIT-013 depends through UNIT-011 | UNIT-007/009/013 |
| source/overlap | live Activity path and producer hashes stale | archived Activity baseline plus source drift; Corporate/Teamwork remain in-progress blocks; Admin has no migration allocation | GATE-OVERLAP-001, UNIT-001/005/008/013/014/016 |

## Current Test Classification

The improve-stage combined admin/notification run produced 59/61 green with two known failures. The broader source-drift lane produced 66/69 green and exposed the third current failure. `UNIT-001` owns exactly these known reds before repair:

1. searched-user D1 placeholder/bind order;
2. stale exact flag-audit expectation after before/after audit enrichment;
3. Activity ownership test still pointing at the removed live-plan folder after archival.

Inbox-only notification suites remain green, but no focused test currently invokes the admin broadcast action/component. Any different/fourth failure invalidates this classification and stops UNIT-001.

## Readiness Matrix

| Dimension | Verdict | Evidence / required execution gate |
| --- | --- | --- |
| intent and comprehensive notification-manager scope | PASS | docs 02/04/06/07 and recurrence/template/preference repairs |
| current source grounding | PASS for planning snapshot | doc 03 and independent source-drift audit; exact baseline refrozen last |
| producer overlap readiness | FAIL | doc 13; Activity source drift and Corporate/Teamwork in-progress block named consumers only |
| requirements and traceability | PASS for plan | doc 15 plus this semantic diff; manifest reciprocity validated |
| ordinary decisions | PASS | DEC-AUTO-001..019; each has default, rejected path/evidence class, confidence group, and reversal trigger |
| authorization boundaries | BOUNDARY | AUTH-001..005 block only paid/provider/deploy/legal/new-queue side effects; safe local work continues |
| execution DAG | PASS with gated ready slice | only UNIT-001 is ready; kill switches precede publish; support schema precedes retention completion |
| unit evidence packets | PASS for planned execution | canonical unit rows plus unit-specific receipt fingerprints; execution replaces PLANNED fields with fresh evidence |
| security/privacy | PASS for plan; legal BOUNDARY | capability, reauth, presence, targeting, redaction, retention, transactional-notice contracts |
| performance/reliability/cost | PASS for plan; hosted proof pending | numeric budgets/formulas and fault matrices; UNIT-009/017 receipts required |
| UX/accessibility | PASS for plan | dense admin IA, complete manager screens/states, DOM/browser proof boundaries |
| operations/rollback | PASS for local plan; hosted BOUNDARY | kill switches, D1-authoritative recovery, scoped AUTH packets, hosted units |
| product implementation/release | NOT_STARTED / BOUNDARY | planning completion is not product proof |

## Promotion and Stop Rule

The pack may return to `CONDITIONALLY_READY` only after all artifacts and the exact scoped baseline are refreshed, `validate:plan-pack` and the planning-prompt validator pass, target-folder whitespace/path checks pass, and a fresh maker-separated review finds no unresolved P0/P1 readiness defect. This permits only `UNIT-001`. Producer drift after refreeze invalidates affected receipts but does not erase unrelated planning work; no downstream unit may be promoted until its dependency/receipt/migration-lease gates pass.
