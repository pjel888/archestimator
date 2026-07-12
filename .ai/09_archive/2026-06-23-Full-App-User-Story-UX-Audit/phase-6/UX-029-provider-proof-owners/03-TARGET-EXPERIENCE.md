# 03 — Target Experience

Date: 2026-06-23

## Goal

A beta operator can open a single provider proof matrix and see, for every external provider, who owns the proof, which script to run, where the artifact lands, when it was last run, and whether it passed, failed, or is blocked.

## Provider Proof Matrix

The matrix is the canonical target artifact for UX-029. It maps every provider to an owner, a script, an artifact path, a last-run date, and a status.

| Provider | Owner | Script | Artifact path | Last run | Status | Stop condition |
|---|---|---|---|---|---|---|
| Resend email delivery | Email Delivery Owner | `bun run launch:check-resend-readiness` | `provider-proof/resend-<date>.json` | 2026-06-23 | TBD | All env vars present; DNS verified; webhook signature confirmed; at least one inbox delivery proof |
| Supabase linked readiness | Database Owner | `bun run launch:check-supabase-linked-readiness` | `provider-proof/supabase-linked-<date>.json` | 2026-06-23 | TBD | Linked project is `ebxxqidacheyapmmzavr`; local migrations match remote |
| Supabase migrations | Database Owner | `bun run launch:check-supabase-migrations` | `provider-proof/supabase-migrations-<date>.json` | 2026-06-23 | TBD | All 67 local migrations are applied; no unapplied remote migrations |
| Supabase backup | Database Owner | `bun run launch:check-supabase-backup` | `provider-proof/supabase-backup-<date>.json` | 2026-06-23 | TBD | Backup exists; PITR status known (disabled is acceptable for closed beta) |
| Supabase DB health | Database Owner | `bun run launch:supabase-readiness` | `provider-proof/supabase-db-<date>.json` | 2026-06-23 | TBD | `linked-supabase-launch-readiness.sql` query returns expected shape |
| Vercel env | Infrastructure Owner | `bun run launch:check-vercel-env` | `provider-proof/vercel-env-<date>.json` | 2026-06-23 | TBD | All required env vars present in Vercel runtime |
| Vercel health | Infrastructure Owner | `bun run launch:check-vercel-health` | `provider-proof/vercel-health-<date>.json` | 2026-06-23 | TBD | Hosted deployment responds 200 on root |
| Vercel production | Infrastructure Owner | `bun run launch:check-vercel-production` | `provider-proof/vercel-production-<date>.json` | 2026-06-23 | TBD | Production target confirmed; env var parity checked |
| Vercel sensitive routes | Infrastructure Owner | `bun run launch:verify-hosted-sensitive-routes` | `provider-proof/vercel-routes-<date>.json` | 2026-06-23 | TBD | Sensitive routes fail closed when unauthenticated |
| Monitoring | Incident Commander | `bun run launch:check-support-monitoring` | `provider-proof/monitoring-<date>.json` | 2026-06-23 | TBD | All 5 proof flags confirmed; alert owner assigned; escalation path documented |
| Legal / privacy | Product Owner | `bun run launch:check-legal-owner` | `provider-proof/legal-<date>.json` | 2026-06-23 | TBD | All 5 legal proof flags confirmed; terms and privacy pages reviewed |
| Support DNS | Support Owner | `bun run launch:check-support-dns` | `provider-proof/support-dns-<date>.json` | 2026-06-23 | TBD | DNS records resolve for support email domain |
| Maps / Places | Maps Owner | Manual / provider dashboard | `provider-proof/maps-<date>.md` | 2026-06-23 | TBD | Key present; quota not exceeded; billing active; address-only fallback confirmed |
| Export hosted | Infrastructure Owner | `bun run launch:verify-hosted-export` | `provider-proof/export-<date>.json` | 2026-06-23 | TBD | Hosted export route responds; generated artifact inspectable |

## Artifact Schema

Every artifact must contain:

```json
{
  "generatedAt": "2026-06-23T00:00:00Z",
  "mode": "<provider>-readiness",
  "owner": "<owner name or role>",
  "script": "bun run launch:<name>",
  "result": "pass" | "fail" | "blocked",
  "missing": [],
  "note": ""
}
```

The schema is already implemented by `check-resend-readiness.ts`, `check-support-monitoring-readiness.ts`, and `check-legal-owner-readiness.ts`. Other scripts should be updated to emit the same shape.

## Owner Assignment Rules

1. Every provider must have exactly one owner.
2. An owner can own multiple providers.
3. The owner must be a named role, not a generic "ops team."
4. If the owner is a person, record their name and backup.
5. If the owner is a role, record how to contact the current person in that role.

## Status Definitions

- `PASS` — the script succeeded and all required checks are green.
- `FAIL` — the script ran and at least one required check is red, but the failure is understood and documented.
- `BLOCKED` — the script cannot run because a prerequisite is missing (credential, configuration, owner assignment).
- `STALE` — the last run date is older than the required cadence.

## Cadence

- Pre-launch: every provider must be run at least once within 7 days of launch.
- Post-launch: weekly for critical providers (Resend, Supabase, Vercel); monthly for others.
- Incident: immediately after any provider incident.

## Fallback Posture

Every provider row must document what happens if the provider fails:

- Resend fail: email delivery stops; fallback is manual outreach or copy-link.
- Supabase fail: app stops; fallback is maintenance page.
- Vercel fail: app stops; fallback is status page.
- Monitoring fail: alerts may be missed; fallback is manual health checks.
- Legal fail: launch must not proceed; fallback is legal review.
- Maps fail: location editing degrades to address-only; no hard blocker.

## Dashboard Concept

If a dashboard is built later, it should display:

- Provider name
- Owner name with contact link
- Last run date with staleness indicator
- Status chip (green / amber / red / gray)
- Script name with copy-to-clipboard
- Artifact link
- Fallback note
- Escalation owner

For UX-029, a markdown table in `provider-proof/README.md` is sufficient. No UI code is required.

## Artifact Storage Rules

1. All artifacts are stored in `provider-proof/` at the repo root.
2. Artifact filenames follow the pattern `<provider>-<YYYY-MM-DD>.json`.
3. Old artifacts are preserved for history; the latest artifact is referenced in the matrix.
4. Artifacts must be committed to git so they are durable and versioned.
5. No external storage or cloud service is required for closed beta.

## Owner Contact Rules

1. Every owner must have a documented contact method (email, Slack, or phone).
2. Every owner must have a documented backup contact.
3. Contact information is stored in `.ai/10_state/operational-personas.md`.
4. If an owner is unresponsive for 24 hours, the backup is automatically escalated.
