# 08 — Decisions And Dependencies

Date: 2026-06-23

## Decision Gates

### DEC-UX-029-OWNER-ASSIGNMENTS

**Status:** Decision required before proof collection.

**Question:** Who are the named owners for each provider?

**Required answer:**
- Email Delivery Owner: named person with Resend dashboard access.
- Database Owner: named person with Supabase project access.
- Infrastructure Owner: named person with Vercel project access.
- Incident Commander: named person with monitoring channel access.
- Product Owner: named person with legal review authority.
- Support Owner: named person with support inbox access.
- Maps Owner: named person with Google Cloud project access.

**Guardrail:** Every owner must have a backup. No owner can be "TBD" at launch.

### DEC-UX-029-ARTIFACT-LOCATION

**Status:** Lightweight decision.

**Question:** Where do artifacts live?

**Options:**
1. `provider-proof/` in the repo (versioned, easy to find).
2. `.ai/provider-proof/` (separated from code).
3. External storage (Notion, S3, etc.).

**Recommended:** Option 1 (`provider-proof/` in repo) for closed beta. Easy to version, easy to review, no extra infrastructure.

### DEC-UX-029-CADENCE

**Status:** Lightweight decision.

**Question:** How often must checks be re-run?

**Recommended:**
- Weekly: Resend, Supabase linked, Vercel health.
- Monthly: all others.
- On demand: after incidents, env changes, migrations.

## Dependencies

| Dependency | Blocks | Resolution |
|---|---|---|
| Owner assignment | All script runs | DEC-UX-029-OWNER-ASSIGNMENTS |
| Artifact directory creation | Artifact storage | Lightweight; mkdir |
| `launch:*` script existence | Script execution | Already bound in `package.json` per Keystone |
| Supabase linked project health | Supabase checks | Requires `ebxxqidacheyapmmzavr` to be healthy |
| Resend env vars | Resend check | Requires `.env` or Vercel env to be configured |
| Monitoring channel config | Monitoring check | Requires alert channel to be set up |
| Legal review completion | Legal check | Requires Product Owner to review terms/privacy |

## Conflict Group

UX-029 belongs to the **Operations/provider** conflict group alongside `UX-028`, `UX-038`, and `UX-039`.

**Rule:** Do not implement UX-029 concurrently with UX-038 or UX-039 without the Operations Lead coordinating. UX-029 and UX-038 are both IU-19 and can be planned in parallel, but their artifacts should not conflict (UX-029 writes to `provider-proof/`; UX-038 writes to `operator-personas/`).

## Sequencing

Per `03-sequencing-dependencies-and-conflicts.md`, UX-029 is in **Phase 3: Provider and operation proof**. It must follow:

- Phase 1 (IU-01 to IU-06): local behavior stabilization.
- Phase 2 (IU-08, IU-14): validation signal repair.

It can run in parallel with:
- IU-10 (collaboration provider proof).
- IU-12 (AI provider proof).
- IU-18 (notification campaign operations).

## Stop Conditions

Stop and escalate if:

1. A critical provider (Resend, Supabase, Vercel) is BLOCKED and the owner cannot unblock within 48 hours.
2. The `launch:*` script for a provider does not exist (Keystone drift).
3. The owner assignment decision is rejected by the team.
4. The artifact schema cannot be standardized across scripts.

## Escalation Path

- Provider check FAIL → Owner re-runs → If still FAIL → Escalate to Operations Lead → If critical → Escalate to Product Owner for launch hold.
- Provider check BLOCKED → Owner documents blocker → Escalate to Infrastructure Owner for config → If unresolved in 48h → Escalate to Product Owner.
- Script missing or broken → Report to QA lead → File as `UX-042` route/API inventory issue → Fix before provider proof.

## External Dependencies

- Resend dashboard access.
- Supabase project `ebxxqidacheyapmmzavr` access.
- Vercel project access.
- Google Cloud Console access (for Maps).
- Support inbox access (for monitoring proof flags).

These are credential and access dependencies, not code dependencies.
