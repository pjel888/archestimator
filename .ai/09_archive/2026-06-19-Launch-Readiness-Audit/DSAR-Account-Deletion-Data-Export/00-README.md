# Launch-Readiness — DSAR, Account Deletion & Data Export (Legal Readiness)

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

> **Phase-2 gap pack** of the 2026-06-19 Launch-Readiness Audit. The 13-domain
> pass did not own this surface; its COVERAGE CRITIC flagged it as un-audited.
> This pack closes that gap. The Auth pack historically deferred DSAR to the wrong
> legal/content target — which in practice only audited metadata/SEO
> and never touched deletion/export capability. So this surface had ZERO
> launch-readiness review before this pack.

## Owner job (exact)

Decide and document the **launch posture for data-subject rights** (erasure,
portability/export, correction) before exposing the app to wider/external users,
and close the gap between what `/privacy` + `/terms` promise and what the product
can actually do. Concretely:

1. Choose the launch posture: **manual owner-handled DSAR documented in policy +
   a working runbook** (minimum acceptable) vs **self-serve delete/export UI**
   (preferred later). Wider launch can ship on the manual posture IF the runbook
   exists, is tested once end-to-end, and the policy text matches it.
2. Build the **erasure runbook / RPC** that actually removes-or-anonymizes a
   data subject across the real schema (see PII inventory in 01-AUDIT-FINDINGS).
   The naive "delete the auth.users row" path is NOT sufficient (see DSAR-01).
3. Produce a **data export** for a requesting user (their profile + workspace +
   projects/estimates) — manual SQL/script is acceptable for launch.
4. Handle **third-party / recipient PII** (shared-link recipients, comment
   authors, invitation emails) that is not linked to any auth user and would
   never be erased by an account delete.

## Routes / screens in scope

- `/privacy` (`src/app/privacy/page.tsx`) — deletion/retention promise text.
- `/terms` (`src/app/terms/page.tsx`) + `src/lib/legal/terms-content.ts`.
- Workshop settings: `src/components/workshop/WorkshopSettingsModalContent.tsx`
  (the only in-app surface that mentions deletion/export — currently a static
  "email support@" line, no action).
- No new self-serve route is required for the minimum posture; if self-serve is
  chosen, a `/workshop/settings/account` danger-zone screen + server action.

## Non-goals

- Building immutable issued-proposal snapshots (separate roadmap item).
- PDF export (XLSX export already exists; not a DSAR portability blocker).
- Re-doing RLS hardening (RLS-RPC pack owns that).
- Cookie-consent / analytics-consent banner (separate; not erasure/export).
- Lawyer-reviewed final public Terms (owner + counsel, out of code lane).

## Files expected to change

- `supabase/migrations/<new>_dsar_erasure_rpc.sql` — service-role erasure/anonymize
  RPC (or a documented `psql` runbook if manual posture is chosen).
- `src/lib/auth/account-actions.ts` — IF self-serve: add `requestAccountDeletion` /
  `requestDataExport` server actions (today it only has onboarding/profile/workspace).
- `src/app/privacy/page.tsx`, `src/lib/legal/terms-content.ts` — reconcile promise
  text to actual capability + SLA.
- `src/components/workshop/WorkshopSettingsModalContent.tsx` — wire the existing
  "account deletion or data export" line to a real action OR keep it as a
  documented manual contact path (acceptable for launch).
- A runbook doc under this pack (`02-ERASURE-RUNBOOK.md`) for the manual posture.
- A user-facing/manual intake runbook under this pack
  (`04-DSAR-MANUAL-REQUEST-UX-RUNBOOK.md`) for support states, copy, SLA, and owner
  handoff until self-serve exists.

## Validation gate

`bun run validate` is known-red on main — gate on:
- `bun run build` green.
- Targeted tests for any new server action / RPC (Vitest + a DB-level test that
  proves the erasure RPC removes/anonymizes every PII row enumerated in the
  inventory, including the orphaned-workspace and recipient-PII cases).
- A one-time **manual end-to-end dry run** of the erasure runbook against a
  throwaway test user on the live project: first a count-only `p_dry_run=true`
  proof, then an optional outer-transaction mutating rehearsal (`BEGIN` / RPC false
  / `ROLLBACK`) before any committed erasure. Capture before/after row-count
  evidence.

## Deletion criteria (when this pack can be deleted)

- Launch posture decided and recorded in `.ai/10_state/decisions.md`.
- `/privacy` + `/terms` text matches the actual capability + SLA (no over-promise).
- Erasure path (RPC or runbook) exists AND has been dry-run once with evidence.
- Export path produces a complete per-subject bundle (manual script OK).
- Recipient/third-party PII handling decided (DSAR-04) and documented.
- Findings either fixed or explicitly owner-accepted for the beta→wider step.

## Loop surface

Lightweight in-session loop (not high-blast-radius for the *audit*; the eventual
erasure RPC IS high-blast-radius DB work and must run a dated loop + Codex review
when implemented). This pack is read-only audit + design.

## Durable-state path

`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/DSAR-Account-Deletion-Data-Export/`
Findings feed `.ai/10_state/decisions.md` (posture decision) and the roadmap
`08-legal-privacy-compliance-readiness.md` (DSAR row LEFT TO DO → posture).
