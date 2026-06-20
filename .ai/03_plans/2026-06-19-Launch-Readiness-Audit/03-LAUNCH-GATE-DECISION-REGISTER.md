# Launch Gate Decision Register

Date: 2026-06-19. This is the canonical implementation handoff for the consolidated
Launch-Readiness Audit. If a pack-level table disagrees with this file, use this
file and then update the pack.

## Launch definitions

| Term | Meaning |
|---|---|
| Owner-only closed beta | Current production posture: Philip/owner-controlled access, trusted users only, manual oversight acceptable. |
| Wider/external beta | Users beyond the owner/trusted internal circle can access public, invite, share, collaboration, or workspace flows. B1-B9 and V1-V2 must be closed or explicitly owner-accepted. |
| Public/self-serve launch | Anonymous/public acquisition and self-serve onboarding. Requires reviewed legal copy, provider evidence, support/monitoring, CI, and owner go/no-go beyond this audit. |

## Canonical gate register

| Gate | Classification | Owner pack | Required close path | Proof artifact | Current go/no-go |
|---|---|---|---|---|---|
| B1 TESTING-01 | Hard blocker | `Testing-CI-Quality-Gates` | Enable CI, add timeouts, require one green PR/main run. | GitHub Actions run URL + branch protection/required-check evidence. | No-go for wider launch. |
| B2 TESTING-02 / FE-PERF | Hard blocker | `Testing-CI-Quality-Gates` + `Frontend-Rendering-Performance` | Make `bun run validate` pass or explicitly scope advisory design lint. | Fresh local validate output + targeted tests for changed source. | No-go for wider launch. |
| B3 OPS-01 | Hard blocker | `Observability-Reliability-Ops` | Add root `global-error`, `error`, and `not-found` boundaries. | Build/typecheck + forced-error or source-level route proof. | No-go for wider launch. |
| B4 OPS-03 | Hard blocker | `Observability-Reliability-Ops` | Choose durable error/log sink or recorded accept-risk + log drain. | Provider config/readback or decision record + sink smoke proof. | No-go for wider launch. |
| B5 AUTH-01 | Hard blocker | `Auth-And-Session-Security` | Verify prod env and add fail-loud assertion. | Vercel env screenshot/readback + build/runtime assertion proof. | No-go for wider launch. |
| B6 RLS-01 | Hard blocker | `RLS-RPC-And-DB-Security` | Reconcile migration tree/ledger and prove scratch reset parity. | Scratch `db reset`/branch diff, ledger repair proof, advisor output. | No-go for wider launch. |
| B7 OPS-04 | Hard operational gate | `Observability-Reliability-Ops` | Stand up uptime/error alerts and name incident owner. | `launch:check-support-monitoring` pass because real flags are true + runbook owner. | No-go for wider launch until owned. |
| B8 DSAR-01 | Hard blocker | `DSAR-Account-Deletion-Data-Export` | Build/test owner-run erasure RPC or runbook. | DB test + count-only dry run + optional outer-transaction rehearsal. | No-go for wider launch. |
| B9 DSAR-03 | Hard blocker | `DSAR-Account-Deletion-Data-Export` | Make legal/settings copy match manual DSAR capability and SLA. | Build + copy review + owner/counsel decision if needed. | No-go for wider launch. |
| V1 REALTIME-01 | Verify-gate | `Realtime-Collaboration-Presence` | Read or set Supabase realtime limits. | Dashboard screenshot or management API read. | No-go until verified or owner-accepted. |
| V2 CONSENT-01 | Verify-gate | `Analytics-Consent-Privacy` | Consent-gate Vercel Analytics or document legitimate interest and fix copy. | Network capture or owner/legal decision + copy/build proof. | No-go until decided/proven. |
| C1 OPS-02/API-01 | Conditional hard blocker | `Observability-Reliability-Ops` + `API-Routes-And-Server-Actions` | Add package-builder quota before AI routes are enabled. | Targeted tests + env proof that AI is enabled only after quota lands. | Not blocking while AI routes remain off. |

## Cohort hardening gates

These do not replace B/V/C gates. They prevent a plan from entering a broader cohort while a
known abuse or UX surface remains unowned.

| Gate | Required before | Owner | Required close path |
|---|---|---|---|
| H1 public-route security headers | Collaborator/client-recipient beta | NextJS/Vercel + Auth | Verify/fix headers for `/login`, `/invite/*`, `/share/*`, `/privacy`, and `/terms`. |
| H2 email recipient cap/rate | Broad share/email sends | Email + Share | Cap recipient additions/sends and prove bounced/rate-limited UX copy. |
| H3 storage quota/spend monitor | External uploads beyond owner-supervised workspaces | Storage + Ops | Add quota or owner-approved spend/storage alert and cleanup path. |
| H4 readiness endpoint abuse control | DB-touching readiness monitor | Ops | TTL/cache, timeout, low-rate monitor, generic errors, no leaked provider details. |

## Owner/provider decisions required

| Decision | Scope | Owner | Minimum record |
|---|---|---|---|
| CI re-enable and required-check posture | GitHub provider | Philip / release owner | Workflow URL + required checks or explicit beta accept-risk. |
| Observability sink | Vercel/log provider or Sentry | Philip / ops owner | Decision record naming sink, PII policy, and watcher. |
| Support monitoring owner | Operational runbook | Philip | Named human, alert path, escalation window. |
| Consent path A/B | Legal/product | Philip + legal reviewer if Path B | Decision record, public copy, Network proof if Path A. |
| Realtime rate-limit ceiling | Supabase provider | Philip / DB owner | Screenshot/API read with values. |
| High-blast DB actions B6/B8 | Supabase/Postgres | Implementation lead + reviewer | Dated plan pack, migration proof, rollback/dry-run evidence. |

## Dependency order

0. Execute through `22-IMPLEMENTATION-EXECUTION-CONTROL-PLAN.md` and coordinate
   active lanes in `23-IMPLEMENTATION-COORDINATION-LEDGER.md`; do not implement
   from this register alone.
1. B2 before B1 required-check enforcement, so CI can turn green.
2. B3 can land before B4, but B4 is required before B7 alerts are meaningful.
3. B6 and B8 must each run their own high-blast DB plan loop and review gate.
4. V1 and V2 are provider/live-proof gates; do not claim closure from repo reads alone.
5. C1 must be checked again before any deploy that enables AI routes.
