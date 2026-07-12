# 02 — Current State Analysis

Date: 2026-06-23

## Current Operational Rows

The canonical spreadsheet (`canonical-feature-status.csv`) currently contains operational readiness rows under broad labels. The second-pass audit expanded these to 93 rows, but the operational rows remain compressed. The current state is:

- **Monitoring operator** — one row covers inbox confirmation, uptime alerts, error alerts, and incident escalation. No stop condition per sub-item.
- **Provider readiness operator** — one row covers Resend, Supabase, Vercel, and Maps. No per-provider owner.
- **Legal/privacy operator** — one row covers terms, privacy, beta copy, data retention, and support comms. No per-item proof flag.
- **Support operator** — one row covers feedback triage, user issue resolution, and repair actions. Triage and response are not separated.
- **Launch operator** — one row covers launch checklist, cohort management, and release campaigns. No go/no-go sub-criteria.

## Launch Script Inventory

The same 18 scripts from `package.json` are relevant to UX-038. They are currently run by whoever has access, not by a named persona:

| Script | Current runner | Persona gap |
|---|---|---|
| `launch:check-support-monitoring` | Anyone with Bun | Should be Incident Commander |
| `launch:check-resend-readiness` | Anyone with Bun | Should be Provider Owner |
| `launch:check-supabase-linked-readiness` | Anyone with Bun | Should be Provider Owner |
| `launch:check-vercel-env` | Anyone with Bun | Should be Provider Owner |
| `launch:check-legal-owner` | Anyone with Bun | Should be Privacy/Legal Owner |
| `launch:check-support-dns` | Anyone with Bun | Should be Provider Owner or Support Triage |
| `launch:verify-hosted-auth` | Anyone with Bun | Should be Provider Owner |
| `launch:verify-hosted-export` | Anyone with Bun | Should be Provider Owner |
| `launch:verify-hosted-sensitive-routes` | Anyone with Bun | Should be Provider Owner |

## Script Files and Persona Relevance

- `scripts/check-support-monitoring-readiness.ts` — checks 5 monitoring proof flags. Currently no owner role is enforced.
- `scripts/check-resend-readiness.ts` — checks Resend env vars. Currently no email delivery owner is assigned.
- `scripts/check-legal-owner-readiness.ts` — checks 5 legal proof flags. Currently no legal reviewer is assigned.
- `scripts/check-supabase-linked-readiness.ts` — checks Supabase project link. Currently no database owner is assigned.
- `scripts/check-vercel-env-readiness.ts` — checks Vercel env. Currently no infrastructure owner is assigned.
- `scripts/check-vercel-health-readiness.ts` — checks Vercel health. Currently no infrastructure owner is assigned.
- `scripts/check-vercel-production-readiness.ts` — checks production target. Currently no infrastructure owner is assigned.

## Supabase Migrations

67 local migrations under `supabase/migrations/`. Key migrations:
- `20260621120000_shared_link_d1_d11_hardening.sql`
- `20260601003000_security_rate_limit_events.sql`

The Provider Owner must prove migration parity, but no persona currently owns this.

## Persona Gaps

| Gap | Current state | Required state |
|---|---|---|
| Monitoring inbox | Checked by script, no owner | Incident Commander owns and proves |
| Uptime alerts | Checked by script, no owner | Incident Commander owns and proves |
| Error alerts | Checked by script, no owner | Incident Commander owns and proves |
| Incident escalation | Checked by script, no owner | Incident Commander owns and proves |
| Resend readiness | Checked by script, no owner | Provider Owner owns and proves |
| Supabase linked | Checked by script, no owner | Provider Owner owns and proves |
| Vercel env | Checked by script, no owner | Provider Owner owns and proves |
| Terms confirmed | Checked by script, no owner | Privacy/Legal Owner owns and proves |
| Privacy confirmed | Checked by script, no owner | Privacy/Legal Owner owns and proves |
| Beta copy confirmed | Checked by script, no owner | Privacy/Legal Owner owns and proves |
| Data retention confirmed | Checked by script, no owner | Privacy/Legal Owner owns and proves |
| Support comms confirmed | Checked by script, no owner | Privacy/Legal Owner owns and proves |
| Feedback triage | No script, manual process | Support Triage owns and documents |
| User issue resolution | No script, manual process | Support Response owns and documents |
| Launch checklist | No script, manual process | Launch Operations owns and documents |
| Cohort management | No script, manual process | Launch Operations owns and documents |
| Release campaign | No script, manual process | Launch Operations owns and documents |

## Honesty Boundary

- The `launch:*` scripts exist and are bound.
- The scripts check env presence, DNS, migration counts, and proof flags.
- No script enforces that the runner is the correct persona.
- No handoff mechanism exists between personas.
- No dashboard or view exists per persona.
- The canonical CSV does not currently split operational rows by persona.

## What Is Missing

1. Persona definitions with names, responsibilities, and stop conditions.
2. Per-persona proof obligations.
3. Handoff triggers between personas.
4. Per-persona views or dashboards.
5. Canonical CSV update to split operational rows.
6. Documentation of manual processes for Support Triage, Support Response, and Launch Operations.

## Key Path References

- `src/app/workshop/page.tsx` — homebase dashboard, potential location for operational status view.
- `src/lib/email/` — Resend client, relevant to Provider Owner.
- `src/lib/supabase/` — Supabase clients, relevant to Provider Owner.
- `src/lib/publication/` — share links, relevant to Privacy/Legal Owner.
- `src/lib/collaboration/` — invites, relevant to Support Triage.
- `src/components/workshop/` — 44+ core app components, potential UI surface for persona views.

## Readiness Check Script Inventory

Full list of 11 readiness check scripts in `scripts/`:
- `check-resend-readiness.ts`
- `check-vercel-env-readiness.ts`
- `check-vercel-health-readiness.ts`
- `check-vercel-production-readiness.ts`
- `check-support-email-dns.ts`
- `check-support-monitoring-readiness.ts`
- `check-legal-owner-readiness.ts`
- `check-supabase-linked-readiness.ts`
- `check-supabase-migration-readiness.ts`
- `check-supabase-backup-readiness.ts`
- `check-route-transition-readiness.ts`

Each script currently has no documented owner. The Provider Owner should own most of them; the Incident Commander should own monitoring; the Privacy/Legal Owner should own legal.
