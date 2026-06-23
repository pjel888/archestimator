# 04 — Implementation Plan

Date: 2026-06-23

## Principle

This plan does not modify `src/` or `scripts/`. It defines the manual and semi-automated steps to collect provider proof, assign owners, and store artifacts. The only file creation is documentation and tracker updates.

## Wave 1: Owner Assignment (Day 1)

### Step 1: Identify candidate owners

Review the team roster and assign the following roles:

- Email Delivery Owner — the person who owns Resend account, DNS, and webhook configuration.
- Database Owner — the person who owns Supabase project `ebxxqidacheyapmmzavr`, migrations, and backups.
- Infrastructure Owner — the person who owns Vercel project, env vars, and deployment pipeline.
- Incident Commander — the person who owns monitoring, alerting, and incident response.
- Product Owner — the person who owns legal, privacy, terms, and beta copy.
- Support Owner — the person who owns support inbox, feedback triage, and user communication.
- Maps Owner — the person who owns Google Cloud project, Maps API key, and quota.

### Step 2: Confirm owner availability

Contact each candidate owner and confirm:

- They understand the provider boundary they own.
- They have access to the provider dashboard or credentials.
- They can run the assigned script or perform the manual check.
- They know who their backup is.

### Step 3: Record owners

Write the owner assignments into `provider-proof/OWNER-ASSIGNMENTS.md`:

```markdown
# Provider Proof Owner Assignments

Date: 2026-06-23

| Provider | Owner | Backup | Contact |
|---|---|---|---|
| Resend | TBD | TBD | TBD |
| Supabase | TBD | TBD | TBD |
| Vercel | TBD | TBD | TBD |
| Monitoring | TBD | TBD | TBD |
| Legal | TBD | TBD | TBD |
| Support DNS | TBD | TBD | TBD |
| Maps | TBD | TBD | TBD |
```

## Wave 2: Script Run and Artifact Collection (Day 2–3)

### Step 4: Create artifact directory

```bash
mkdir -p provider-proof
```

### Step 5: Run Resend check

```bash
bun run launch:check-resend-readiness
```

The script writes to `.ai/provider-proof/` if the directory exists. Copy the output to `provider-proof/resend-2026-06-23.json`. If the script does not write automatically, redirect stdout:

```bash
bun run launch:check-resend-readiness > provider-proof/resend-2026-06-23.json 2>&1
```

### Step 6: Run Supabase checks

```bash
bun run launch:check-supabase-linked-readiness > provider-proof/supabase-linked-2026-06-23.json 2>&1
bun run launch:check-supabase-migrations > provider-proof/supabase-migrations-2026-06-23.json 2>&1
bun run launch:check-supabase-backup > provider-proof/supabase-backup-2026-06-23.json 2>&1
bun run launch:supabase-readiness > provider-proof/supabase-db-2026-06-23.json 2>&1
```

### Step 7: Run Vercel checks

```bash
bun run launch:check-vercel-env > provider-proof/vercel-env-2026-06-23.json 2>&1
bun run launch:check-vercel-health > provider-proof/vercel-health-2026-06-23.json 2>&1
bun run launch:check-vercel-production > provider-proof/vercel-production-2026-06-23.json 2>&1
bun run launch:verify-hosted-sensitive-routes > provider-proof/vercel-routes-2026-06-23.json 2>&1
bun run launch:verify-hosted-export > provider-proof/export-2026-06-23.json 2>&1
```

### Step 8: Run monitoring check

```bash
bun run launch:check-support-monitoring > provider-proof/monitoring-2026-06-23.json 2>&1
```

### Step 9: Run legal check

```bash
bun run launch:check-legal-owner > provider-proof/legal-2026-06-23.json 2>&1
```

### Step 10: Run support DNS check

```bash
bun run launch:check-support-dns > provider-proof/support-dns-2026-06-23.json 2>&1
```

### Step 11: Manual Maps check

Maps does not have an automated readiness script. The Maps Owner must:

1. Open the Google Cloud Console.
2. Navigate to the project that owns the Maps/Places API key.
3. Confirm the key is active and restricted to Archestimator domains.
4. Check quota usage and billing status.
5. Test the address autocomplete in the app.
6. Confirm the address-only fallback works when the script is blocked.
7. Write findings to `provider-proof/maps-2026-06-23.md`.

## Wave 3: Status Tracking (Day 4)

### Step 12: Create provider proof README

Write `provider-proof/README.md` with the full matrix (provider, owner, script, artifact, last run, status).

### Step 13: Update canonical CSV

Add or update the operational readiness rows in `canonical-feature-status.csv` to reference the artifact paths and statuses. Use the evidence-status vocabulary from `08-csv-schema-and-validation-contract.md`:

- `Provider proof not run` → update to `Provider proof completed` with artifact path.
- `Known red or blocked broad validation; targeted proof required` → update to the specific status.

### Step 14: Record in LOOP_LEDGER.md

Add a completion entry to the plan pack `LOOP_LEDGER.md`:

```markdown
## 2026-06-23 — UX-029 Provider Proof Owners

- Status: COMPLETE
- Owner assignments: recorded in provider-proof/OWNER-ASSIGNMENTS.md
- Artifacts: 13 provider proof files in provider-proof/
- CSV updated: yes
- Blockers: none / listed
```

## Wave 4: Cadence and Maintenance (Ongoing)

### Step 15: Define re-run schedule

Document the re-run cadence in `provider-proof/CADENCE.md`:

- Weekly: Resend, Supabase linked, Vercel health
- Monthly: Supabase migrations, Supabase backup, Vercel env, Vercel production, monitoring, legal, support DNS, Maps
- On demand: after any provider incident, env var change, or migration

### Step 16: Assign stale-check owner

The Operations Lead is responsible for checking `provider-proof/README.md` weekly and flagging stale artifacts.

## Rollback

This plan is documentation-only. The only rollback is to delete the `provider-proof/` directory and the CSV updates. No code or data changes are made.

## Parallelization

Wave 1 (owner assignment) must complete before Wave 2 (script runs), because an owner must be assigned before their script is run. Within Wave 2, all provider checks are independent and can run in parallel.

## Files Created or Modified

Created:
- `provider-proof/OWNER-ASSIGNMENTS.md`
- `provider-proof/README.md`
- `provider-proof/CADENCE.md`
- `provider-proof/resend-2026-06-23.json`
- `provider-proof/supabase-linked-2026-06-23.json`
- `provider-proof/supabase-migrations-2026-06-23.json`
- `provider-proof/supabase-backup-2026-06-23.json`
- `provider-proof/supabase-db-2026-06-23.json`
- `provider-proof/vercel-env-2026-06-23.json`
- `provider-proof/vercel-health-2026-06-23.json`
- `provider-proof/vercel-production-2026-06-23.json`
- `provider-proof/vercel-routes-2026-06-23.json`
- `provider-proof/monitoring-2026-06-23.json`
- `provider-proof/legal-2026-06-23.json`
- `provider-proof/support-dns-2026-06-23.json`
- `provider-proof/maps-2026-06-23.md`
- `provider-proof/export-2026-06-23.json`

Modified:
- `canonical-feature-status.csv` — update operational readiness rows
- `LOOP_LEDGER.md` — record completion
