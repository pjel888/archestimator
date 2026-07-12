# Data Inventory and ROPA Plan

## Objective

Create a single authoritative Record of Processing Activities covering every processing
purpose and system. The current DRAFT lives at `.ai/10_state/compliance/ropa.md` (10
processing activities); it must be extended to cover all **81 live D1 tables + 4 Better Auth
runtime tables** inventoried in `25_D1_DATA_SYSTEM_INVENTORY.md`.

## Existing DRAFT baseline

`.ai/10_state/compliance/ropa.md` already defines PA-01 through PA-10:

- PA-01 Account authentication and session management
- PA-02 Estimate authoring and project data
- PA-03 Component library (reusable cost items)
- PA-04 Collaboration (team invites, realtime presence)
- PA-05 Publication / shared link
- PA-06 Account security audit
- PA-07 Privacy requests themselves
- PA-08 Email delivery (transactional)
- PA-09 File upload scanning
- PA-10 Observability (Worker logs and traces)

These are counsel-gated on OPEN-DEC-002 (controller identity) + OPEN-DEC-004 (retention).

## ROPA Required Fields

Each row must include: processing activity ID; business process; feature or route;
controller/processor role; data subject categories; personal-data categories; sensitive or
privileged-data flag; data source; purpose; lawful basis; legitimate-interest assessment
reference; collection interface and notice; recipients; subprocessors; storage system and
region; access roles; security measures; retention trigger and period; deletion or
anonymization method; backup handling; cross-border transfer; data-subject rights handling;
PIA reference; owner; approval status; review date.

## Required new / revised processing activities (from `25_D1_DATA_SYSTEM_INVENTORY.md`)

Map these to the table groups in the inventory and extend the DRAFT:

| New/Revised PA | Systems (table family) | Why new/revised |
|---|---|---|
| PA-11 Client portal (successor share surface) | `client_portal_*` (`0068`/`0069`) | 18 new tables; recipients, decisions, threads, analytics, brand profiles with `contact_json` |
| PA-12 Corporate accounts | `corporate_accounts`,`corporate_account_members` (`0052`) | Org-level identity, job titles |
| PA-13 AI assistance | `ai_action_runs`,`ai_tool_calls`,`ai_data_access_events`,`ai_package_*` | DeepSeek (CN processor); must be split out before AI ships |
| PA-14 Session replay & web analytics | Microsoft Clarity, GA4, Cloudflare Web Analytics | High-sensitivity; US processors; separate consent/transfer |
| PA-15 Support conversations | `support_conversations`,`support_messages` (`0042`) | Plaintext message bodies, requester identity |
| PA-16 Admin/support access audit | `admin_audit_events` (`0044`) | Cross-tenant; `actor_email` plaintext |
| PA-17 Notifications | `notification_deliveries` (`0009`) | User-bound delivery records |
| PA-18 Beta feedback & activation | `beta_feedback_*`,`beta_activation_*` (`0001`/`0067`) | `user_email` plaintext; activation funnel analytics |
| PA-19 Cost library & suppliers | `cost_library_*`,`component_suppliers/brands` | Supplier/brand names (third-party contact data) |
| PA-20 Legal acceptance records | `legal_terms_acceptances` (`0002`) | Terms/privacy acceptance evidence |
| PA-21 Incidents | `operational_incidents*` (`0040`) | Breach-adjacent; 2555d retention declared |
| PA-22 Error & performance telemetry | `client_error_events`,`web_vital_events` (`0047`/`0048`) | User-bound (FK profiles); `user_agent`, route |

## Implementation artifacts

Create/extend under `compliance/ropa/`:

- `processing-activities.csv` — extend the 10 DRAFT rows to the full set above;
- `data-system-inventory.csv` — seed directly from `25_D1_DATA_SYSTEM_INVENTORY.md`;
- `vendor-register.csv` — extend `.ai/10_state/compliance/processor-register.md` with DeepSeek
  and Microsoft Clarity;
- `notice-map.csv` — map each PA to the notice set in `08_PRIVACY_NOTICES_AND_TRANSPARENCY_PLAN.md`;
- `retention-map.csv` — map each PA to the schedule in `10_RETENTION_DELETION_AND_LEGAL_HOLDS.md`;
- a validation script that rejects incomplete mandatory fields;
- an annual review task and material-change trigger (change triggers in
  `11_DPO_AND_NPC_REGISTRATION_PLAN.md`).

## Acceptance Criteria

- every production table and external processor in `25_D1_DATA_SYSTEM_INVENTORY.md` maps to at
  least one ROPA activity;
- every ROPA activity maps to a notice, lawful basis, retention rule, and owner;
- no feature is released without ROPA and PIA screening;
- legacy systems (historical Supabase project `ebxxqidacheyapmmzavr`) are marked
  active/transitional/archived/destroyed;
- the DRAFT `ropa.md` status is upgraded from DRAFT only after OPEN-DEC-002 + OPEN-DEC-004 close.
