# 05 — Acceptance Criteria

Date: 2026-06-23

## Given/When/Then Scenarios

### Scenario 1: Operator runs Resend readiness check

**Given** the Email Delivery Owner is assigned
**And** the `launch:check-resend-readiness` script exists in `package.json`
**When** the owner runs `bun run launch:check-resend-readiness`
**Then** the script completes without error
**And** an artifact is written to `provider-proof/resend-2026-06-23.json`
**And** the artifact contains `result: "pass"` or a documented `missing` array
**And** the provider proof README shows Resend status as PASS, FAIL, or BLOCKED

### Scenario 2: Supabase migration drift is detected

**Given** the Database Owner is assigned
**And** 67 local migrations exist under `supabase/migrations/`
**When** the owner runs `bun run launch:check-supabase-migrations`
**Then** the script compares local and remote migration states
**And** an artifact is written to `provider-proof/supabase-migrations-2026-06-23.json`
**And** if drift is found, the artifact lists the missing migrations
**And** the status is FAIL with a note explaining the drift
**And** the escalation path points to the Database Owner

### Scenario 3: Monitoring check is blocked

**Given** the Incident Commander is assigned
**And** the monitoring alert channel is not yet configured
**When** the commander runs `bun run launch:check-support-monitoring`
**Then** the script completes
**And** an artifact is written to `provider-proof/monitoring-2026-06-23.json`
**And** the artifact shows at least one proof flag as `false`
**And** the status is BLOCKED
**And** the note explains the missing configuration
**And** the escalation path points to the Infrastructure Owner for channel setup

### Scenario 4: Legal owner confirms terms and privacy

**Given** the Product Owner is assigned
**And** the terms and privacy pages exist at `/terms` and `/privacy`
**When** the owner runs `bun run launch:check-legal-owner`
**Then** the script checks the 5 legal proof flags
**And** an artifact is written to `provider-proof/legal-2026-06-23.json`
**And** the artifact contains the approval date and reference
**And** the status is PASS only if all 5 flags are confirmed

### Scenario 5: Operator views the provider proof matrix

**Given** all assigned owners have run their scripts
**And** all artifacts are stored in `provider-proof/`
**When** a beta operator opens `provider-proof/README.md`
**Then** they see a table with all 14 providers
**And** each row shows owner, script, artifact path, last run date, and status
**And** they can identify which providers are proven, blocked, or failed
**And** they can see the fallback posture for each provider

### Scenario 6: Stale artifact is flagged

**Given** the re-run cadence is documented as weekly for critical providers
**And** the Resend artifact was last generated 10 days ago
**When** the Operations Lead reviews `provider-proof/README.md`
**Then** the Resend row is flagged as STALE
**And** the lead pings the Email Delivery Owner to re-run the check
**And** the new artifact replaces the old one

## Minimum Viable Proof

The issue is accepted as resolved when:

1. At least 10 of the 14 provider rows have assigned owners.
2. At least 10 of the 14 provider rows have generated artifacts.
3. The `provider-proof/README.md` matrix is complete and accurate.
4. The canonical CSV operational readiness rows reference the artifacts.
5. No provider is marked PASS without a matching artifact.

## Scenario 7: Provider matrix is reviewed by beta operator

**Given** all assigned owners have run their scripts
**And** all artifacts are stored in `provider-proof/`
**When** a beta operator opens `provider-proof/README.md`
**Then** they see a table with all 14 providers
**And** each row shows owner, script, artifact path, last run date, and status
**And** they can identify which providers are proven, blocked, or failed
**And** they can see the fallback posture for each provider
**And** they can see the escalation owner for each provider

## Scenario 8: Stale artifact triggers re-run request

**Given** the re-run cadence is documented as weekly for critical providers
**And** the Resend artifact was last generated 10 days ago
**When** the Operations Lead reviews `provider-proof/README.md`
**Then** the Resend row is flagged as STALE
**And** the lead pings the Email Delivery Owner to re-run the check
**And** the new artifact replaces the old one
**And** the matrix is updated with the new last-run date

## Minimum Viable Proof

The issue is accepted as resolved when:

1. At least 10 of the 14 provider rows have assigned owners.
2. At least 10 of the 14 provider rows have generated artifacts.
3. The `provider-proof/README.md` matrix is complete and accurate.
4. The canonical CSV operational readiness rows reference the artifacts.
5. No provider is marked PASS without a matching artifact.
6. Every critical provider (Resend, Supabase, Vercel) has a confirmed owner.

## Out of Scope

- Automated alerting when a check fails (this is monitoring infrastructure, not proof collection).
- UI dashboard for provider status (a markdown table is sufficient).
- Changing provider credentials or configuration (this plan is read-only).
- Running checks on a schedule (this plan documents manual execution).
