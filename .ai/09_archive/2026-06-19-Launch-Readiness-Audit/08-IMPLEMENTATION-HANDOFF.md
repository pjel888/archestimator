# Implementation Handoff

Date: 2026-06-20. Scope: executable planning handoff for B/V/C gates and hardening gates.

## Close artifact schema

Every gate closure needs a durable artifact with these fields:

| Field | Required content |
|---|---|
| Gate id | `B1`..`B9`, `V1`, `V2`, `C1`, or `H*`. |
| Date/time | ISO date, time, and timezone. |
| Actor | Human/agent and role. |
| Authority | Local source, live provider read, live provider mutation, owner/legal decision, or DB authority. |
| Project/account | Exact provider project/account; Supabase must be `ebxxqidacheyapmmzavr`. |
| Branch/commit | Git branch and commit or "docs-only/no source mutation". |
| Evidence | Command output, provider URL/screenshot path, SQL query/result, test path, or decision record. |
| Before/after | What changed or what was verified. |
| Rollback/recovery | Required for source, provider, DB, and high-blast changes. |
| Residual risk | Explicit remaining uncertainty or "none known". |

Before closing any score 4-5 gate from `19-BLAST-RADIUS-AND-ROLLBACK-MATRIX.md`, attach
the matching residual-risk row from `21-RESIDUAL-UNCERTAINTY-AND-CONFIDENCE-REGISTER.md`.
Every implementation lane must also be claimed, looped, and closed through
`22-IMPLEMENTATION-EXECUTION-CONTROL-PLAN.md` and
`23-IMPLEMENTATION-COORDINATION-LEDGER.md`.

## Gate handoff table

| Gate | Handoff state | Canonical owner | May start when | Must not close until |
|---|---|---|---|---|
| B1 CI dark | Ready after B2 policy is settled. | Testing-CI. | B2 has a clear hard-gate definition. | GitHub Actions run and required-check posture are proven live or owner-accepted. |
| B2 validate red | Ready-to-implement with owner choice on advisory checks. | Testing-CI with Frontend. | Implementer reads `14-B2-CANONICAL-CI-GATE.md`. | `bun run validate` exits 0, or package scripts split advisory checks with owner-approved CI semantics. |
| B3 root error boundaries | Ready-to-implement. | Observability-Ops. | None. | Root/global/not-found states are built and verified without provider overclaiming. |
| B4 durable error/log sink | Needs owner/provider decision. | Observability-Ops. | Owner chooses sink or accept-risk log-drain posture. | Provider readback or decision record proves a durable signal and PII policy. |
| B5 beta gate fail-open | Ready-to-implement plus provider proof. | Auth-Session. | None. | Vercel env and fail-loud runtime/build assertion are proven. |
| B6 migration drift | Needs high-blast implementation plan. | RLS-RPC-DB with DB reviewer. | `16-HIGH-BLAST-DB-AND-DSAR-IMPLEMENTATION-PLANS.md` is followed. | Live-vs-migration re-audit, scratch reset, ledger repair, advisor output, and rollback/recovery evidence exist. |
| B7 support monitoring | Needs owner/operator decision. | Observability-Ops. | B4 sink and readiness probe are chosen. | Alerts route to a named owner and `launch:check-support-monitoring` passes truthfully. |
| B8 erasure capability | Needs high-blast implementation plan. | DSAR pack with DB reviewer. | PII matrix, dry-run contract, and owner/legal posture are accepted. | Count-only dry run, transaction rehearsal, grant revokes, and runbook signoff exist. |
| B9 DSAR/legal copy | Needs owner/legal copy decision. | DSAR pack. | Manual vs self-serve DSAR posture chosen. | `/privacy`, `/terms`, and settings copy match actual capability and runbook. |
| V1 realtime limits | Provider-proof-only gate. | Realtime pack. | Supabase dashboard/API access available. | Hosted project limits are read or set and recorded. |
| V2 consent analytics | Owner/legal or source implementation decision. | Analytics-Consent. | Path A or Path B chosen. | Network proof or owner/legal decision plus copy/build evidence exists. |
| C1 AI package-builder quota | Conditional pre-AI hard gate. | API implements; Ops gates the flip. | Any plan proposes `ARCHESTIMATOR_AI_ENABLED=1`. | Package-builder quota tests pass and env proof shows AI is enabled only after quota lands. |

## Additional hardening gates before broader cohorts

| Gate | Trigger | Close path |
|---|---|---|
| H1 public-route security headers | Before collaborator/client-recipient beta. | Verify `/login`, `/invite/*`, `/share/*`, `/privacy`, and `/terms` headers; fix public route gaps or record explicit accept-risk. |
| H2 email recipient cap/rate | Before broad share/email sends. | Cap recipient additions/sends per workspace/time window; prove Resend bounce/error states are handled. |
| H3 storage quota/spend monitor | Before external uploads beyond owner-supervised workspaces. | Add workspace storage ceiling or owner-approved monitor/alert; document cleanup path. |
| H4 readiness endpoint abuse control | Before exposing a DB-touching readiness endpoint. | TTL/cache, method restriction, timeout, generic errors, and monitor rate are specified in the ops runbook. |

## Stop condition for implementers

Stop and escalate only when the next action is destructive, provider-production-mutating without the named authority, or materially changes the cohort strategy. Otherwise follow the gate owner, proof class, verification rows above, and the lane loop in `22`.
