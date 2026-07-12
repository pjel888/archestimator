# Implementation Plan — Philippine Data Privacy Compliance

> **Canonical execution artifact** for this plan pack. The machine-readable state is in
> `plan-pack.json`. This document holds the readable unit DAG, traceability, and resume point.
> Grounded in source inspection 2026-07-12 (HEAD `0365c8b6`).

## Outcome contract

- **Goal:** make Archestimator demonstrably compliant with Philippine DPA (RA 10173 + IRR + NPC
  issuances) before external beta, with evidence.
- **Success metrics:** all P0 controls implemented and evidenced; ROPA covers all 85 stores;
  DSAR orchestrator spans all personal-data systems; retention schedule approved and fully
  enforced; notices match reality; breach workflow rehearsed.
- **Non-goals:** P2 enterprise features (org privacy admins, audit exports, SOC 2); ISO 27001;
  payments/billing compliance (until payments launch).
- **Profile:** `high-blast-radius` (data privacy, security, auth, provider, release).
- **Scope boundary:** this is a planning pack. `package_action_ceiling: IMPLEMENT_LOCAL` — it
  authorizes repo-local planning and implementation only. External actions (signing DPAs, NPC
  submission, DPO appointment, hosted evidence) are `AUTH-*` boundaries.

## Status summary

- `package_status: IMPLEMENTATION_READY` — the plan is complete and grounded; execution has
  not started.
- `implementation_status: NOT_STARTED`.
- `release_status: NOT_READY` — P0 controls unimplemented.
- `terminal_status: ACTIVE`.

## Execution DAG (dependency-ordered units)

Legend: P0 = before external beta; P1 = before broad commercial release; P2 = enterprise.
`AUTH-*` = genuine external boundary. Units are the engineering work; governance/legal items
are AUTH boundaries that gate releases but do not block planning.

### Layer 0 — Authority and scope (gates everything)

| Unit | Goal | Depends on | Priority | Owner role |
|---|---|---|---|---|
| UNIT-AUTH0 | Collect AUTH boundaries: PIC entity (OPEN-DEC-002), DPO appointment, NPC registration assessment, counsel engagement | — | P0 | Founder + counsel (AUTH) |
| UNIT-ROPA0 | Extend DRAFT ROPA (10 PAs → full set) from `25_D1_DATA_SYSTEM_INVENTORY.md`; produce `compliance/ropa/*.csv` | UNIT-AUTH0 (controller identity) | P0 | DPO + engineering |

### Layer 1 — Transparency and contracts

| Unit | Goal | Depends on | Priority |
|---|---|---|---|
| UNIT-NOTICE | Publish the 11-notice set (`08_*`); version them; map each to ROPA activities and collection points; validate notice-to-system accuracy | UNIT-ROPA0 | P0 |
| UNIT-VENDOR | Complete processor register (add DeepSeek CN, Clarity/GA4 US, Resend); execute vendor DPAs (OPEN-DEC-003); publish subprocessor list + transfer records | UNIT-ROPA0 | P0 |

### Layer 2 — Technical P0 closure

| Unit | Goal | Depends on | Priority |
|---|---|---|---|
| UNIT-SEC11 | Remediate raw session tokens (`better-auth-cloudflare.ts:24,198`): hash tokens or migrate BA config; verify | UNIT-AUTH0 | P0 |
| UNIT-MFA | Add MFA/2FA for admin accounts (`src/lib/auth/` has none) | UNIT-SEC11 | P0 |
| UNIT-RETENTION | Add the 5 unenforced retention rules (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `operational_incidents`, `operational_incident_events`) to `DEFAULT_RETENTION_RULES`; assign classes to the ~13 uncovered tables; OPEN-DEC-004 sign-off | UNIT-ROPA0 | P0 |
| UNIT-DSAR | Build the Privacy Request Orchestrator: admin triage route, status-advance endpoint, runner that executes export/erase on `completed`; wire the 3 existing helpers; add 13+ new adapters (Better Auth core, profiles, recipients, portal, corporate, uploads+R2, AI, audit, notifications, beta feedback, observability) | UNIT-SEC11 | P0 |
| UNIT-AUTHZ | Authorization audit + matrix tests across tenant boundaries (`src/lib/authz/`, admin queries, share/portal) | UNIT-SEC11 | P0 |
| UNIT-ANON | Re-identification testing on `estimate_sheet_events` actor anonymization and other anonymization points | UNIT-RETENTION | P0 |

### Layer 3 — Breach and operations

| Unit | Goal | Depends on | Priority |
|---|---|---|---|
| UNIT-BREACH | Implement breach workflow (`15_*`): incident command, 72-hour clock, notification templates, processor contact registry, affected-subject query, immutable decision log; run tabletops | UNIT-DSAR | P0 |
| UNIT-ADMIN | Support-access session logging / break-glass record; periodic access-review cadence with evidence | UNIT-MFA | P0 |

### Layer 4 — Beta release gate

| Unit | Goal | Depends on | Priority |
|---|---|---|---|
| UNIT-PIA | Complete platform PIA + high-risk feature PIAs (public share analytics, client activity history, AI, admin access, uploads, cross-customer analytics) | UNIT-ROPA0 | P0 |
| UNIT-EVIDENCE | Assemble beta compliance evidence pack (`23_*`): signed DPO appointment, NPC assessment, approved PIA/ROPA, lawful-basis matrix, retention schedule, notice screenshots, vendor register + DPAs, authz-test report, token-security report, DSAR drill, retention run evidence, breach tabletop, admin access review, release approval | all P0 units | P0 |

### Layer 5 — Commercial / enterprise (P1/P2, not blocking beta)

| Unit | Goal | Priority |
|---|---|---|
| UNIT-PRIVACY-CENTER | Self-service privacy center (download/correct/delete/objection/preferences/status) | P1 |
| UNIT-CONSENT-GRANULAR | Separate session-replay (Clarity) consent from measurement; cookie preference controls | P1 |
| UNIT-DELETION-PROP | Deletion propagation + processor confirmation | P1 |
| UNIT-ENTERPRISE | Org privacy admins, audit exports, tenant retention, enterprise DPA, external pentest | P2 |

## Critical path

UNIT-AUTH0 → UNIT-ROPA0 → {UNIT-NOTICE, UNIT-VENDOR, UNIT-RETENTION, UNIT-PIA} →
UNIT-SEC11 → {UNIT-MFA, UNIT-DSAR, UNIT-AUTHZ} → UNIT-BREACH / UNIT-ADMIN / UNIT-ANON →
UNIT-EVIDENCE.

## Authorization boundaries (AUTH-*, genuine external gates)

- **AUTH-001** PIC legal entity (OPEN-DEC-002). Blocks notice publication, ROPA finalization, DPA
  execution. Safe fallback: draft notices with entity placeholder; do not publish.
- **AUTH-002** DPO appointment. Blocks PIA approval, registration, rights-request ownership.
  Fallback: founder serves initially with documented conflict management.
- **AUTH-003** NPC registration determination. Blocks beta only if registration is mandatory and
  unresolved. Fallback: complete the assessment; maintain it even if not mandatory.
- **AUTH-004** Vendor DPAs signed (OPEN-DEC-003), esp. DeepSeek/Cloudflare. Blocks AI ship and
  beta for unsigned processors. Fallback: do not enable unsigned processors.
- **AUTH-005** Retention schedule sign-off (OPEN-DEC-004). Blocks enforcement at approved TTLs.
  Fallback: keep current TTLs as interim counsel-input drafts.
- **AUTH-006** AI data-use policy (DeepSeek terms). Blocks AI feature ship. Fallback: keep AI off.

These are release-scoped. They do not block repo-local planning, schema work, orchestrator
implementation, dry runs, or evidence assembly. Each has a complete fallback/continuation packet.

## Resume point

- `next_unit`: UNIT-AUTH0 (no engineering units have started; AUTH-001 is the first action).
- Resume context: read `00_INDEX.md`, `25_D1_DATA_SYSTEM_INVENTORY.md`, this file, then
  `plan-pack.json`.

## Verification (proportional; tests user-gated)

Per the User Test Authorization Gate, no tests run unless Philip explicitly requests testing for
this task. The criteria here default to `NOT_REQUIRED` (source inspection, dry runs, static
evidence). Named MVP-critical invariants (authz matrix, DSAR completeness, retention idempotency,
token-security) record `TEST_PROPOSAL`s only. See `21_TESTING_AND_VERIFICATION_PLAN.md`.
