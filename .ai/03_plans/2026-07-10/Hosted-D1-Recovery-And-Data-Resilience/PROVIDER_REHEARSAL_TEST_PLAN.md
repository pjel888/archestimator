# Provider Rehearsal Test Plan

## Authority And Proof Boundary

This artifact provides independently reviewable setup, denial, cleanup, and
failure-response detail for `TEST-001..007`. Stable IDs and scenario baselines
remain documented in `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; current live
status remains solely in `plan-pack.json`. All scenarios are planned until their
named producer writes current evidence.

## Applicability Review

| Frontier gate | Applicability | Required proof focus |
| --- | --- | --- |
| `GATE-UX-01` | `N/A` | This pack changes no page/component/form/navigation contract; operator CLI/runbook output is covered by contract and ops gates. |
| `GATE-NEXT-01` | `N/A` for the planned recovery surface | The disposable proof route is a Worker overlay, not an App Router change. Re-evaluate if implementation touches Next routes/RSC/cache. |
| `GATE-CONTRACT-01` | Applies | Receipt, runner, integrity, ingress, session, and strict consumer schemas. |
| `GATE-DATA-01` | Applies | D1 export/import/migrations/integrity/session lifecycle and provider boundary. |
| `GATE-SEC-01` | Applies | Export/session/proof-key taxonomy, authz denials, replay/body/rate controls, and redaction. |
| `GATE-VERIFY-01` | Applies | Fail-closed predicates, injected phase failures, deterministic cleanup, and exact evidence classes. |
| `GATE-PERF-01` | Applies | Source-size/limit checks, RTO/RPO evaluator, probe cardinality, 10x reasoning, and timeouts. |
| `GATE-OPS-01` | Applies | Provider mutation, release evidence, incident path, rollback, and cleanup. |
| `GATE-AGENT-01` | `N/A` | This pack does not change agent/prompt/skill/payload/routing/state contracts. A hosted operator and distinct verifier are ordinary roles; Program owns cross-pack orchestration. |
| `GATE-CLEAN-01` | Applies | Disposable D1/Worker/route/secret/table/export/key/data removal and reference proof. |

## Local And Dry-Run Matrix

| Test | Setup/procedure | Expected signal | Evidence/cleanup | Failure response |
| --- | --- | --- | --- | --- |
| `TEST-001` | Readiness/release fixtures: local-only, provider-false, stale, contradictory, missing check, wrong revision/identity | Local mechanics can remain green while provider/release gate is red; only complete provider fixture passes | Focused Vitest output; temp artifacts removed | Keep `AC-001` failed and repair predicate/consumer. |
| `TEST-002` | No-network dry run for missing/ambiguous identity, same target, bad name, count/storage/size/import/plan/feature limits, unsafe temp modes/filesystem, command and cleanup failure | Every unsafe case stops before create; clean fixture renders exact redacted plan | Deterministic fake CLI/control-plane and temp root cleanup | Any external call or paid fallback is a safety failure. |
| `TEST-003` | Temp D1 fixtures for missing/reordered migration, schema object drift (including a missing 0053 ownership trigger), count/digest mutation, FK/orphan, ownerless corporate account (missing `owner` member after a simulated pre-0053 restore or failed backfill), last-owner protection violation, corporate member/profile policy, corporate role/status drift, membership `CASCADE`, workspace-link `SET NULL`, invalid enum/tenant, and integer/timestamp precision | Each defect produces one stable failed label; clean fixture preserves all five ownership triggers, at least one owner per account, both corporate tables/linkage, and exact delete semantics | Temp D1 and keyed fixture digests removed | Keep integrity and receipt gates red. |
| `TEST-004` | Local Worker/probe contract fixtures for method/path/type, configured-run mismatch under constant-time comparison, missing/expired/mutated HMAC, concurrent nonce replay, chunked body cap, slow-body/arrival-deadline timeout, attempt/success caps, target binding, Worker-name collision refusal, route config | Denials occur before repository dispatch; one clean bounded request passes | Fake keys, nonce table, overlay, logs removed; secret scan clean | Treat any bypass, race, or leak as security blocker. |
| `TEST-005` | Offline restored-session fixture, old canary denial, fresh disposable auth, corporate-only role/link fixtures, and cross-workspace/protected/public matrix | Old session denied before/after ingress; fresh auth and authorized workspace reads work; corporate membership/link alone grants no platform-admin or foreign-workspace access | Temp sessions/users/corporate accounts/members/workspaces removed by run ID | Abort ingress on any invalidation or authz uncertainty. |
| `TEST-006` | Receipt/consumer fixtures covering every required field, status, identity, revision, timing, result, expiry, and cleanup | Complete current receipt accepted; every incomplete/stale/mismatched/dirty case rejected by both consumers | Generated fixture artifacts removed | Keep release/Operating red; producer owns repair. |

## Authorized Provider Matrix

`TEST-007` runs only inside the exact `AUTH-001` packet and also supplies the
provider phase of `TEST-002..006`. Record pre/post account inventory, source/
export/import sizes, Free limits/plan/backend, protected storage modes,
encryption/plaintext windows, D1/Worker/secret/route/binding/table/key/data
lifecycle, phase timings, integrity/app/authz/session results, controlled-write
rollback, and independent absence readback.

Inject or safely simulate failure at each phase before the provider run; during
the authorized run, any unexpected failure transitions directly to cleanup and
incident handling. The test passes only when the receipt result and every
cleanup surface are green. Provider operation success without cleanup is fail.

## Determinism, Redaction, And Freshness

Local fixtures control clock, IDs, randomness, CLI responses, filesystem, and
cleanup. Hosted evidence records stable labels/digests and timestamps, not raw
tail output, exports, rows, tokens, proof headers, nonces, emails, keys, or
private URLs. Migrations, bindings, app/auth/session code, provider constraints,
receipt schema, integrity queries, ingress contract, source size/features, or a
failed cleanup invalidate prior evidence.
