# 06 — Verification And Proof

Date: 2026-06-23

## Targeted Verification IDs

This issue is covered by `TV-OPS-SUPPORT` from `06-verification-matrix-and-proof-runbook.md`.

### TV-OPS-SUPPORT

| Field | Value |
|---|---|
| ID | TV-OPS-SUPPORT |
| Scope | Feedback, notifications, legal/privacy, monitoring, provider readiness, launch operations |
| Local command shape | `bun run launch:check-resend-readiness && bun run launch:check-vercel-env && bun run launch:check-vercel-health && bun run launch:check-support-dns && bun run launch:check-support-monitoring && bun run launch:check-legal-owner && bun run launch:check-supabase-linked-readiness && bun run launch:check-supabase-migrations && bun run launch:check-supabase-backup` |
| Browser/provider proof when required | Hosted/provider dashboards, inbox proof, monitoring alert/drain, legal owner review |
| Pass criteria | Each provider/operator row is pass/fail/blocked with owner and artifact |
| Evidence record | Provider proof run |

## Provider Proof Runbook

The Provider Proof Runbook from `06-verification-matrix-and-proof-runbook.md` applies directly to UX-029.

### Supabase linked readiness

- Command: `bun run launch:check-supabase-linked-readiness`
- Pass rule: Pass only if linked project is Archestimator `ebxxqidacheyapmmzavr` and checks succeed.
- Artifact: `provider-proof/supabase-linked-<date>.json`
- Owner: Database Owner

### Supabase migrations/backups

- Command: `bun run launch:check-supabase-migrations`; `bun run launch:check-supabase-backup`
- Pass rule: Pass if migrations/backups are current under beta cost policy; PITR remains disabled unless reapproved.
- Artifact: `provider-proof/supabase-migrations-<date>.json`, `provider-proof/supabase-backup-<date>.json`
- Owner: Database Owner

### Resend readiness

- Command: `bun run launch:check-resend-readiness`; `bun run launch:check-support-dns`; webhook tests
- Pass rule: Pass only with env/DNS/webhook evidence and inbox/manual proof where delivery is claimed.
- Artifact: `provider-proof/resend-<date>.json`, `provider-proof/support-dns-<date>.json`
- Owner: Email Delivery Owner

### Vercel runtime

- Command: `bun run launch:check-vercel-env`; `bun run launch:check-vercel-health`; `bun run launch:check-vercel-production`; `bun run launch:verify-hosted-sensitive-routes`
- Pass rule: Pass only against the intended hosted target, not local routes.
- Artifact: `provider-proof/vercel-env-<date>.json`, `provider-proof/vercel-health-<date>.json`, `provider-proof/vercel-production-<date>.json`, `provider-proof/vercel-routes-<date>.json`
- Owner: Infrastructure Owner

### Maps/Places

- Command: Local provider-missing tests plus manual/provider key/quota/billing evidence.
- Pass rule: Pass local fallback separately from live map provider behavior.
- Artifact: `provider-proof/maps-<date>.md`
- Owner: Maps Owner

### Monitoring

- Command: `bun run launch:check-support-monitoring` plus actual alert/drain proof if claiming live monitoring.
- Pass rule: Pass only when owner, channel, alert, and review window are known.
- Artifact: `provider-proof/monitoring-<date>.json`
- Owner: Incident Commander

### Export/share hosted

- Command: `bun run launch:verify-hosted-export`; shared-link hosted proof scripts when available.
- Pass rule: Pass only when hosted route and generated artifact are inspected.
- Artifact: `provider-proof/export-<date>.json`
- Owner: Infrastructure Owner

## Verification Steps

1. Run the full `TV-OPS-SUPPORT` command chain locally.
2. Confirm every script completes without throwing.
3. Collect stdout/stderr for each script.
4. Verify the output contains the expected shape (env check, migration count, proof flags, etc.).
5. Store the output as JSON or markdown in `provider-proof/`.
6. Update `provider-proof/README.md` with the status.
7. Update `canonical-feature-status.csv` with the evidence status.

## Evidence Status Mapping

| Script output | Evidence status | CSV status |
|---|---|---|
| All checks green | `Provider proof completed` | PASS |
| Some checks red, documented | `Provider proof completed with known issues` | FAIL |
| Cannot run (missing env/credential) | `Provider proof blocked` | BLOCKED |
| Not yet run | `Provider proof not run` | TBD |

## Cross-References

- `TV-OPS-SUPABASE` — Supabase-specific proof (subset of TV-OPS-SUPPORT)
- `TV-OPS-RESEND` — Resend-specific proof (subset of TV-OPS-SUPPORT)
- `TV-OPS-VERCEL` — Vercel-specific proof (subset of TV-OPS-SUPPORT)
- `TV-OPS-MONITORING` — Monitoring-specific proof (subset of TV-OPS-SUPPORT)
- `TV-OPS-LEGAL` — Legal owner proof (subset of TV-OPS-SUPPORT)
- `TV-OPS-MAPS` — Maps provider proof (subset of TV-OPS-SUPPORT)

## Honesty Boundary

The verification steps above prove that the scripts exist and can be run. They do not prove that the providers are healthy. Provider health is proven by the artifact content, not by the fact that the script ran. A script can run and report FAIL; that is still valid proof.
