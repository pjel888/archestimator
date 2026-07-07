# 10 — Blast Radius and Dependencies

This pack changes no application source, test, migration, schema, config, or
infrastructure. Its "blast radius" is therefore the **set of artifacts and
operational conventions** it touches, plus the **runtime surfaces** the proofs
exercise read-only.

## Direct impact (artifacts and operator conventions)

| Affected item | Classification | Why |
|---|---|---|
| 8 production-proof artifacts in `evidence/` | Required change (re-produced) | 5 of 8 move from skipped to passed |
| `upload-production-proof-evidence-check.json` | Required change (regenerated) | bundle verdict moves to `productionProofReady=true` |
| `upload-release-gates.json` upload dimension | Required change (updated) | reflects closed bundle |
| Evidence-dir override convention | Required (operator) | fixes H1 |
| Direct-invocation convention for 2 scripts | Required (operator) | fixes H2 |
| Filename/boundary naming documentation | Required (doc) | fixes H3 |

## Transitive / runtime impact (read-only proof — no behavior change)

| Surface | Classification | Why affected |
|---|---|---|
| `/api/internal/upload-{cleanup,scan,runtime,lifecycle-proof}` | Verification only | probed read-only with dry-run + auth |
| `worker.ts` queue consumer + cron (`0 3`, `15 3`) | Verification only | observed via runbook (PROOF-REQ-008) |
| `src/lib/uploads/admission-control.ts` | Verification only | 429 exercise (PROOF-REQ-007) hits it on an existing route |
| `UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL` endpoint | Verification only | one sanitized POST (PROOF-REQ-005) |
| Operations dashboard page | Verification only | operator observes (PROOF-REQ-006) |
| External ClamD service | Verification only | two fixture scans (PROOF-REQ-004) |

## Explicitly unaffected

| Item | Why unaffected |
|---|---|
| Upload application logic (routes, queue, scanner, storage policy) | No code change |
| D1 schema, migrations, indexes, app-authz | No data-layer change |
| R2 object policy, object-key builder | No storage change |
| Better Auth, sessions, OAuth | Not exercised by upload proof |
| Durable Objects / collaboration | Not upload-related |
| Email binding | Not upload-related |
| Other 2026-07-07 sibling packs | Each owns its own scope; this pack only references |
| Historical Supabase project | Out of scope entirely |
| Frontend components / UI | No UI change |

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Production deployment current + aliased | External | already met (PROOF-REQ-001 passes) |
| `CRON_SECRET` / `UPLOAD_*_JOB_SECRET` available to executor | External | required for PROOF-REQ-002/003 |
| Reachable ClamD service with prod-equivalent signatures | External | required for PROOF-REQ-004 (`ASSUMP-004`) |
| HTTPS alert webhook + bearer token | External | required for PROOF-REQ-005 (`ASSUMP-005`) |
| Operator with dashboard + route access | External | required for PROOF-REQ-006/007/008 |
| Bundle gate + producer scripts unchanged | Internal | re-validate before execution (stale-plan checklist) |

## Compatibility

- No API contract change → no backward-compatibility risk.
- No artifact schema change → existing committed artifacts remain valid (the
  bundle gate version is stable).
- No dependency version change.

## Documentation impact

- This pack *supersedes* the command lists in the parent pack's
  `UPLOAD_PRODUCTION_PROOF_RUNBOOK.md` and
  `UPLOAD_PRODUCTION_OBSERVATIONS_RUNBOOK.md` where they hardcode the broken
  short evidence path. It does not delete those files.
- No README, AGENTS.md, CLAUDE.md, or DESIGN.md change is in scope.
