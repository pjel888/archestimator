# Data Subject Rights Operations

## Current-state grounding

The repository has the **building blocks but no execution path**:

- **Register + intake exist.** `privacy_requests` table (`migrations/0033`); kinds
  `access|rectification|erasure|restriction|portability|objection|other`
  (`src/lib/compliance/privacy-request-repository.ts:12`); anonymous-capable POST intake at
  `src/app/api/compliance/privacy-requests/route.ts` with D1 rate-limit reservations.
- **Per-system export/erase helpers exist but are uncalled dead code.**
  `exportPrivacyRequestSupportData` / `erasePrivacyRequestSupportData`
  (`privacy-request-repository.ts:224-229` → `support-conversations-repository`),
  `exportPrivacyRequestActivityData` / `erasePrivacyRequestActivityData`
  (`:240-265` → `estimate_sheet_events` / `anonymizeActivityActor`),
  `exportPrivacyRequestActivationData` / `erasePrivacyRequestActivationData`
  (`:267-285` → `activation-retention`). A repo-wide caller search returns **zero results**.
- **No orchestrator.** No admin triage endpoint, no `PATCH`/`PUT` route to advance status, no
  runner that executes export/erase when a request moves to `completed`. `listPrivacyRequests`
  reader is uncalled by any admin route.

## Rights Workflow (target: unified Privacy Request Orchestrator)

1. request intake (`POST /api/compliance/privacy-requests`, exists);
2. request classification;
3. identity verification;
4. controller or processor role determination;
5. scope discovery;
6. legal exception and hold evaluation (check `activity_event_legal_holds`,
   `beta_activation_retention_holds`);
7. system-by-system execution via adapters (below);
8. second-person review for destructive actions;
9. response package;
10. delivery verification;
11. closure record;
12. appeal or complaint handling.

## Required Request Types

`information, access, correction, deletion or blocking, objection, restriction, portability,
consent withdrawal, complaint, representative or estate request, customer-controller request.`
The enum in `PRIVACY_REQUEST_KINDS` covers the first six plus `other`; confirm whether the
remaining kinds need explicit enum values or are handled via `other` + metadata.

## System Adapters (map to `25_D1_DATA_SYSTEM_INVENTORY.md`)

Existing (3 systems, dead code):

| Adapter | Export fn | Erase fn | Status |
|---|---|---|---|
| Support conversations | `exportPrivacyRequestSupportData` | `erasePrivacyRequestSupportData` | exists, uncalled |
| Activity history | `exportPrivacyRequestActivityData` | `erasePrivacyRequestActivityData` (anonymize) | exists, uncalled |
| Beta activation | `exportPrivacyRequestActivationData` | `erasePrivacyRequestActivationData` | exists, uncalled |

Required new adapters (13+ systems with no coverage):

- **Better Auth core** — `user`, `session`, `account`, `verification` (runtime-provisioned;
  erasure must coordinate with BA, not raw SQL);
- **profiles** — main user profile table (`email`, `display_name`, `avatar_url`);
- **Account security events** — `account_security_events` (anonymize `user_id`);
- **Collaboration invitations + audit** — `collaboration_invitations`, `collaboration_audit_events`;
- **Publication recipients/comments/responses** — `shared_link_recipients`,
  `shared_link_comments`, `shared_link_responses`, `project_publications.snapshot_json`;
- **Client portal** — `client_portal_recipients`, `client_portal_messages`,
  `client_portal_decisions`, `client_portal_threads` actor fields;
- **Corporate accounts** — `corporate_account_members`;
- **Uploads** — `upload_sessions`, `upload_assets`, `upload_events` + R2 object purge;
- **AI records** — `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`,
  `ai_package_*` (actor fields; respect provider-side deletion);
- **Support** — (covered by existing helper, needs wiring);
- **Admin audit** — `admin_audit_events` (retain as evidence; anonymize `actor_email` on
  erasure where lawful);
- **Notifications** — `notification_deliveries`;
- **Beta feedback** — `beta_feedback_submissions` (`user_email` plaintext);
- **Observability** — `client_error_events`, `web_vital_events` (FK SET NULL on profile delete;
  confirm cascade), `component_library_telemetry_events`;
- **Processors** — propagate deletion to DeepSeek (when AI active), Resend delivery records,
  Cloudflare Images/R2;
- **Backups** — document backup-aging limitation; cannot guarantee immediate erasure from
  daily D1 backups.

## Identity Verification

Use proportionate verification. Do not collect government ID by default. Methods:
authenticated session plus reauthentication; verified email challenge; workspace-owner
confirmation for processor-managed data; signed authorization for representatives; additional
proof only where risk requires it.

## Processor Scenario

Where a request concerns customer-controlled project data: determine whether Archestimator may
respond directly; notify or route to the customer controller; preserve request timestamps;
provide tooling and evidence to the customer; avoid disclosing data controlled by another
organization without authority.

## Erasure Rules

Erasure must distinguish: deletion; anonymization; restriction; legal hold; contractual
retention; backup aging; records required to establish or defend legal claims. The retention
schedule at `.ai/10_state/compliance/retention-schedule.md` documents intended DSAR propagation
targets (`users`, `account_security_events`, `estimate_sheet_events`,
`collaboration_audit_events`, R2 uploads, `privacy_requests`) but states this is **NOT yet
implemented**.

## Export Requirements

Exports must be: complete within approved scope; machine-readable where portability applies;
human-readable; encrypted or access-controlled; time-limited; accompanied by a data-source and
recipient manifest; logged without exposing the exported contents.

## Implementation unit

Building the orchestrator + admin triage route + wiring existing helpers + adding the 13 new
adapters is the single largest engineering unit in this pack (see `IMPLEMENTATION_PLAN.md`
UNIT-DSAR).
