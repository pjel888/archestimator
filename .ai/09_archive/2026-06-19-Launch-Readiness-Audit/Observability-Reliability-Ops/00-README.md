# Launch-Readiness Audit — Observability, Reliability & Ops Readiness

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

> Part of the 2026-06-19 Launch-Readiness Audit (sibling pack:
> `.ai/03_plans/2026-06-19-Launch-Readiness-Audit`). This is a **deletable plan-pack
> header**. If Philip rejects the direction, delete the entire
> `2026-06-19-Launch-Readiness-Audit/Observability-Reliability-Ops/` folder — nothing else
> imports it.

## Exact owner job

Decide which observability / reliability / ops gaps are **closed-beta launch blockers**
and which are deferrable, for Archestimator (Next.js 16 / Bun / Supabase, Vercel-hosted,
pre-launch closed beta, no external users yet). This pack is a **review + findings**
deliverable, not an implementation. No source files are edited by this pack; remediation
is a follow-up that Philip authorizes.

## Domain scope

Error tracking, structured logging, monitoring/alerting, rate limiting, error boundaries
(`error.tsx` / `global-error.tsx` / `not-found.tsx`), graceful degradation, backup/DR
(PITR posture), incident readiness, secret handling in logs, health-check depth.

## Routes / screens affected (if remediation proceeds)

- Global app shell: `src/app/layout.tsx`, `src/app/providers.tsx` (no `global-error.tsx`,
  no root `error.tsx`, no `not-found.tsx`).
- AI surface: `src/app/api/ai/package-builder/handler.ts` (rate-limit gap).
- Health surface: `src/app/api/health/route.ts` (shallow check).
- Ops scripts: `scripts/check-support-monitoring-readiness.ts`,
  `scripts/check-supabase-backup-readiness.ts` (proof-flag-only checks).

## Non-goals

- Auth/RLS/RPC correctness (domains 1–2), generic API-route hardening beyond ops/logging
  (domain 4), CSP/headers/deploy config (domain 7), email deliverability (domain 13).
  Cross-domain spillover is recorded in `cross_domain_notes`, not fixed here.
- Standing up a hosted error tracker (Sentry) — roadmap-deferred; this pack only states
  the launch-gate consequence and the minimum interim posture.
- Design/contrast enforcement (DESIGN.md is an alpha guide).

## Files expected to change during remediation (NOT in this pack)

`src/app/global-error.tsx` (new), `src/app/error.tsx` (new), `src/app/not-found.tsx`
(new, optional), `src/app/api/ai/package-builder/handler.ts`, `src/app/api/health/route.ts`,
optionally a shared structured-log helper under `src/lib/observability/`.

## Validation gate (for the eventual remediation, not this pack)

`bun run validate` (note: known-red on main per audit brief — fix must not add new reds),
plus targeted Vitest for any new error boundary / health-check / rate-limit logic, plus a
manual hosted smoke of `/api/health` and a forced render error to confirm
`global-error.tsx` renders. High-blast-radius items (health check touching DB, rate limit)
get a Codex review pass before merge.

## Deletion criteria

Delete this folder if Philip rejects the findings, or once every accepted finding is either
implemented (linked to a commit) or explicitly deferred with a recorded decision in
`.ai/10_state/decisions.md`.

## Loop-surface selection

Lightweight in-session loop (read → evidence → findings). No dated `LOOP_LEDGER.md` is
required for this **audit** pack: it is read-only on source/config and produces a findings
report. Any remediation that touches the health check (DB), rate limiting, or DR posture is
HIGH-BLAST-RADIUS and gets its own loop + Codex gate at implementation time.

## Durable-state path

Durable findings live in `01-AUDIT-FINDINGS.md` (this folder). Accept/defer decisions get
recorded in `.ai/10_state/decisions.md` when Philip rules.
