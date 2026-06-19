# 2026-06-19 Launch-Readiness Audit — RLS, RPC & DB Security (Domain 2)

> Deletable plan-pack header per repo rules. Part of the **2026-06-19 Launch-Readiness Audit**
> (sibling pack: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`). This pack is a findings
> deliverable, not an approved remediation plan. If Philip rejects it, delete the whole folder.

## Exact user/owner job

Determine whether the Postgres tenant-isolation surface (RLS policies, table/sequence GRANTs,
and SECURITY DEFINER / INVOKER RPC functions) is safe to expose to closed-beta users on
Supabase project `ebxxqidacheyapmmzavr`. Hunt specifically for: missing UPDATE grant on
upsert/DO-UPDATE paths, over-broad grants (anon vs authenticated), SECURITY DEFINER without
pinned `search_path`, RLS `USING`/`WITH CHECK` gaps, and service-role key leakage to the client.

## Routes / screens affected (by the surface, not by remediation)

Indirect — every authenticated route that reads/writes tenant data through Supabase: `/workshop`,
`/workshop/projects`, estimate sheets, the component library, collaboration invites, and the
public `/share/*` publication surface (service-role read path).

## Non-goals

- Auth/session mechanics, CSP/headers, route protection middleware (Domain 1 / Domain 7).
- Index/query performance (Domain 3) — only flagged where it intersects a security object.
- API-route / server-action input validation (Domain 4) beyond service-role client provenance.
- DESIGN.md / a11y. Not in scope here.

## Files expected to change during remediation (if accepted)

- `supabase/migrations/` — new dated migrations ONLY (no edits to applied files).
- `supabase/migrations-pending-review/` — reconcile applied-but-out-of-tree files into the
  canonical tree, or formally record them in the migration ledger.
- Possibly `scripts/prove-*.mjs` + `package.json` `prove:*` entries for new regression proofs.
- No `src/**` change is anticipated; service-role provenance is already correct.

## Validation gate

- `node .gitnexus/run.cjs` not required.
- Re-run live advisors (`get_advisors type=security`) and the targeted SQL probes in
  `01-AUDIT-FINDINGS.md` after any change.
- Re-run the existing `prove:notification-rls`, `prove:estimate-tabs-rls`, `prove:rls-initplan`,
  `prove:membership-floor-triggers` scripts.
- For any drift-reconciliation work: `supabase db reset` against a scratch/branch DB must
  reproduce the live object set (RLS policies, the AC-MOD-06 unique index, P6 generated column,
  P3 events policy) with zero diff.

## Deletion criteria

Delete this folder if Philip decides (a) the migration-ledger drift is acceptable for closed
beta and will be reconciled post-launch, and (b) no other finding here warrants a tracked plan.
None of the findings are confirmed exploitable data-leaks, so rejection is low-risk.

## Loop-surface selection

Low blast radius for the audit itself (read-only). Remediation of RLS-01 (ledger/tree drift) is
**high-blast-radius DB work** and, if undertaken, requires a dated plan pack + LOOP_LEDGER +
Codex review gate per `AGENT_OPERATING_PROTOCOL.md`. The other findings are low/info.

## Durable-state path

`.ai/10_state/current-state.md` (FAST PATH) + `.ai/10_state/decisions.md` if RLS-01 is acted on.
