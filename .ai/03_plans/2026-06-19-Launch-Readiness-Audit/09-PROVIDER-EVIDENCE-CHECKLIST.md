# Provider Evidence Checklist

Date: 2026-06-20. Scope: provider/live proof needed by the launch-readiness gates.

Local source review cannot prove provider state. Use this checklist whenever a gate says
"hosted", "provider", "live DB", "CI", "Vercel", "Supabase", "Resend", or "owner accepted".

## Known provider boundaries

| Provider | Expected project/account | Gates |
|---|---|---|
| Supabase | `ebxxqidacheyapmmzavr` only | B6, B8, V1, readiness probe, RLS/RPC proof. |
| GitHub | `pjel888/archestimator` unless superseded by owner record | B1, B2 CI evidence. |
| Vercel | Archestimator production project for `www.archestimator.com` | B4, B5, V2, headers, env, deployment proof. |
| Resend | Owner-approved Archestimator sending domain/account | Email/share recipient proof, DSAR/support mail path. |
| Monitoring sink | Chosen in `15-OPERATIONS-RUNBOOK.md` | B4, B7. |

## Checklist by gate

| Gate | Required provider evidence | Not enough |
|---|---|---|
| B1 CI | Workflow enabled, recent green run URL, branch/required-check readback or accept-risk record. | Local `bun run` output alone. |
| B5 beta env | Vercel env readback for `CLOSED_BETA_ACCESS_ENABLED`, deployment scope, and fail-loud assertion proof. | `.env.example`, local `.env`, or source default. |
| B6 DB drift | Live schema/ledger read, committed migration comparison, scratch reset, advisor output. | Reading migration files only. |
| B7 support monitoring | Alert destination, owner, escalation path, support flags set because real systems exist. | Setting environment flags without monitors. |
| B8 erasure | Live or throwaway live-project dry-run against test subject, transaction rehearsal, audit manifest. | Unit tests only. |
| V1 realtime | Supabase dashboard/API read of limits and timestamp. | Source code or assumed defaults. |
| V2 consent | Hosted Network capture or owner/legal decision record plus deployed copy proof. | Local component review alone. |
| C1 AI quota | Env proof AI remains off, or quota tests plus deploy/env proof before enabling AI. | Handler source check alone. |

## Evidence file naming

Store closeout artifacts under the implementing plan pack, using:

`YYYY-MM-DD-gate-id-provider-proof.md`

Each file must include the close artifact schema from `08-IMPLEMENTATION-HANDOFF.md`.

## Provider mutation rule

This audit is docs-only. It does not mutate providers. A future implementation task may mutate
authorized Archestimator provider state only when the gate row names the authority and the action
stays inside the project/account boundary above.
