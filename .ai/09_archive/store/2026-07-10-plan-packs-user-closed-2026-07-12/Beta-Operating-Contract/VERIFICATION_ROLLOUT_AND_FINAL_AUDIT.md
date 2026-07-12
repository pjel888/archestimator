# Verification, Rollout, And Final Audit

## Proof Matrix

| Test | Criterion | Command/surface and expected signal |
| --- | --- | --- |
| `TEST-001` | `AC-001` | Metric registry/query fixtures cover bots, anonymous, tests, duplicates, missing denominator, stale source, deletion; invalid definitions fail. |
| `TEST-002` | `AC-002` | Focused DOM/source/provider-network tests prove no global/no-consent/forbidden-route analytics and allowed post-consent behavior. |
| `TEST-003` | `AC-003` | Admin repository/DOM tests independently assert searched/unsearched SQL placeholder order, pagination/session aggregation, versioned flag-audit before/after shape, and real/zero/partial/error/stale/denied states; only actual values or `Unavailable` render. |
| `TEST-004` | `AC-004` | Local policy/schema tests assert every proposed sev1/sev2/sev3 deadline, backup escalation, primary/failover channel, support acknowledgment, message field/redaction rule, rollback decision, 24/72-hour review, and owner-confirmation field. Concurrent same-`clientMessageId` retry and injected post-email status-write failure prove one outbound attempt, no stale-row success, and blocked resend until reconciliation; local scenarios/tabletops claim neither approval nor hosted delivery. |
| `TEST-005` | `AC-005` | Installed Better Auth storage/config assertions separately exercise sign-out/current, specific-session, other-session, and all-session operations; D1 readback proves exact targeted-row absence, deleted-token replay is denied, and injected deletion failures propagate with rows preserved. D1 access and strict `D1-RECOVERY-RECEIPT-v1` fixtures reject missing/stale/mismatched/dirty-cleanup recovery proof without executing restore. |
| `TEST-006` | `AC-006` | Legal readiness schema fixtures reject missing/expired/version-mismatched/wrong-scope records and prevent limited-cohort fields from satisfying the broader/paid gate. |
| `TEST-007` | `AC-007` | Operating artifact fixture suite and strict release consumer reject stale/missing/unknown/contradictory evidence. |
| `TEST-008` | `AC-008` | Under `AUTH-001`, hosted consent/provider routing, current owner-confirmed-policy alert/support/incident delivery and acknowledgment, primary/backup failover, rollback, and synthetic revoke/access canary produce redacted exact-release evidence; no recovery resource or restore command runs. |
| `TEST-009` | `AC-009` | Under `AUTH-002`, owner records time-bounded auth-risk acceptance or mitigation with expiry/triggers and exact local/hosted/recovery evidence identities. |
| `TEST-010` | `AC-010` | Under `AUTH-003`, owner records the exact incident-policy digest, support primary/backup/window, and limited-cohort approval while qualified-counsel scope for broader/public/paid launch remains separately approved or explicit boundary; the decision does not depend on hosted proof. |

## Gates

### `GATE-001` — Local operating implementation (`FAIL`)

Run targeted telemetry/Admin/incident/support/auth/legal tests, `bun run validate:error-handling`, `bun run type-check`, alert catalog, observability drill, support-monitoring and legal/auth readiness in non-mutating mode, plan validator, and diff check. Local output must distinguish local proof from hosted/human gaps.

### `GATE-002` — Hosted operations (`BOUNDARY`, `AUTH-001`)

Requires production consent/provider proof, Workers Logs/alert delivery,
incident/support acknowledgment against the current owner-confirmed deadlines, named primary/
backup failover, optional packet-scoped synthetic auth canary, rollback, and review
artifacts for the exact release. It never authorizes D1 recovery execution.

### `GATE-003` — Human auth-risk decision (`BOUNDARY`, `AUTH-002`)

Requires `TEST-009` time-bounded owner auth-risk decision consuming current
local, hosted, and recovery evidence. Its receipt cannot satisfy itself, and
source text or agent judgment cannot satisfy the criterion.

### `GATE-004` — Limited-cohort and legal-scope decision (`BOUNDARY`, `AUTH-003`)

Requires `TEST-010` owner confirmation of the current incident-policy digest,
support primary/backup/window, and limited cohort plus explicit qualified-counsel
status for broader/public/paid scope. It evaluates the Unit 003 policy and Unit
005 legal artifacts independently of hosted proof. Source text, hosted readiness, auth-risk
acceptance, or agent judgment cannot satisfy the criterion.

## Adversarial Matrix

`TEST_AND_ADVERSARIAL_QA.md` is the detailed setup/denial/cleanup matrix. At
minimum, the final checker must challenge consent withdrawal and forbidden
routes, population/dedupe/tenant drift, truthful unavailable UX, missing human
acknowledgment/failover, revocation deletion illusion and replay, stale or dirty
Recovery receipts, limited-versus-broader legal substitution, exact release
identity/freshness, and cleanup residue. A passing happy path cannot override
any failed denial or evidence-boundary case.

## Rollout

`ROLLOUT_ROLLBACK_AND_OPERATIONS.md` owns the detailed go/no-go and handback
matrix. The fixed order remains local privacy/metrics, operator truth, local
incident/auth/legal contracts, local receipt composition, the independent
owner policy/cohort/legal decision, authorized hosted proof against that policy,
the independent auth-risk decision, then exact-release composition. No stage
may infer or mutate a later stage's receipt.

## Rollback And Fix-forward

The full matrix is in `ROLLOUT_ROLLBACK_AND_OPERATIONS.md`. Safety invariants are
unchanged: disable/remove bad analytics, render unavailable rather than sample
truth, keep release red on missing coverage/delivery, revoke and incident-handle
auth failures, stop cohort expansion on legal mismatch, and treat any synthetic
resource or credential cleanup failure as an incident/blocker.

## Completion Audit

- [ ] `BETA-P0-06`: metric definitions, consent, bot/test/anonymous separation, retention/deletion, production flag, and hosted proof are current.
- [ ] `BETA-P0-07`: current owner-confirmed sev1/sev2/sev3 policy version, named primary/backup,
  support, incident, failover, rollback, redacted communication templates, and
  24/72-hour review drills pass locally and in authorized hosted proof.
- [ ] `BETA-P0-08`: raw session-token taxonomy, D1/backup access, separate sign-out/
  current/specific/other/all row-deletion and replay-denial proof, injected deletion-
  failure proof, current matching `D1-RECOVERY-RECEIPT-v1`, synthetic canary, and mitigation or
  time-boxed acceptance are recorded; Operating ran no restore.
- [ ] `BETA-P0-09`: limited cohort is explicitly approved and broader/public/paid launch remains counsel-gated until approved.
- [ ] `BETA-P1-07`: every operator metric is real or `Unavailable`; no stub/sample fallback remains.
- [ ] `BETA-P1-10`: `UNIT-006` emits a REQUIRED maintainability receipt with
  caller map, pre-change characterization, extraction/retention decision,
  changed files, regression owner, exact tests, and distinct-verifier result.
- [ ] No raw sensitive telemetry, token, webhook, owner-label value, or private URL appears in evidence.
- [ ] `AC-001..007` local status is distinct from `AC-008` hosted and
  `AC-009` auth-risk and `AC-010` legal/cohort status; every receipt matches
  release ID/SHA/environment, and the release consumer composes them without a
  hidden shared mutation.
- [ ] Distinct verifier reran the final gates and confirmed cleanup.

Stop only on a current, scoped operating decision. A rich local script inventory is not production readiness.
