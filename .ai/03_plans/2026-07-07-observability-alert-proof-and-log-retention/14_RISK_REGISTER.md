# 14 — Risk Register

| ID | Description | Trigger | Prob | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Provider-backed receipts cannot be gathered before launch (no live destination) | owner hasn't set webhook/email/poller | Med | High | **High** | GATE-02, launch | verifier missing-receipt | document external gate early | local-automated path now; owner action `OPEN-ALERT-01` | delay launch until hosted proofs | owner | launch blocked if unresolved | open |
| R-02 | `OPEN-DEC-004` (counsel) rejects a draft TTL | counsel review | Low | Med | Med | DATA-02 | schedule sign-off | interim values clearly labeled draft | re-issue rule with new TTL; dry-run safe | counsel | schedule corrected | open |
| R-03 | Retention rule double-deletes with upload-cleanup job | both target `upload_assets` | Low | Med | Med | DATA-02a | unit test + audit | document seam; cleanup runs first | code revert; restore Time Travel | implementer | low with seam doc | open |
| R-04 | Sibling observability pack stalls → S-02/S-05 imprecise | sibling not implemented | Med | Med | Med | FR-03 correlation, S-02 signal | sibling status | one-directional dep recorded | degrade to timestamp correlation | sibling owner | correlation weaker | open |
| R-05 | Redaction gap (G-1..G-9) leaks PII via logs the alerts reference | pre-sibling-fix incident | Med | High | **High** | SEC-01 inventory | incident review | sibling SEC-01 prioritized; runbook states honestly | manual redaction of incident artifacts | sibling owner | logs partially unredacted until sibling lands | open |
| R-06 | Migration `0040` collision | concurrent pack claims slot | Low | Low | Low | DATA-01 | apply fails | `LOOP_LEDGER` coordination | renumber to `0041` | implementer | low | open |
| R-07 | Better Auth `session` table shape differs from assumption | generated migration differs | Low | Low | Low | DATA-02b | discovery readback | DISCOVERY-REQUIRED task | adjust SELECT | implementer | low | open |
| R-08 | External poller (S-02) host is itself a SPOF | poller down | Med | Med | Med | S-02 | stale receipt | `OPEN-ALERT-01` redundant-host option | dashboard manual fallback | owner | single-host risk | open |
| R-09 | Alert spam / amplification | poller or webhook loops | Low | Med | Med | channels | idempotency test | idempotent receipts; retry caps | rate-limit poller | implementer | low | open |
| R-10 | Evidence artifacts become a PII/secret leak surface | unredacted artifact committed | Low | High | Med | SEC-02/DATA-04 | redaction scan | `.gitignore` + TEST-02 | prune artifact; rotate any leaked secret | implementer | low with scan | open |
| R-11 | Workers Logs ~3d free retention hides RCA evidence | incident RCA after 3d | Med | Med | Med | runbook | DATA-03 doc | capture logs in first-24h review | enable Logpush (`OPEN-RET-01`) | owner | RCA window tight on free tier | open |
| R-12 | Emulated verification overstates readiness | no independent reviewer | High | Med | **High** | package status | readiness cap | cap at 97; mark CONDITIONALLY READY | owner/independent reviewer accepts | owner | capped until independent review | open |
| R-13 | Scope overlap with sibling pack creates dual file ownership | two packs edit same file | Low | High | Med | redaction/console | boundary doc `02_…` | `16_…` records one-directional dep | `LOOP_LEDGER` arbitration | lead | low with boundary | open |
| R-14 | Incident table grows unbounded if close discipline slips | open incidents accumulate | Low | Low | Low | DATA-01 | stale-incident query (FR-05d) | readiness verifier flags `stale_incident` | periodic admin review | owner | low | open |

**Highest-severity open risks:** R-01 (hosted proof), R-05 (redaction gaps pre-sibling-fix), R-12
(emulated verification cap). These drive the `CONDITIONALLY READY` status.
