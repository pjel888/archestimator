# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the in-scope stack layers. This is a planning-only pack; the contract below binds the future implementation.

## Stack in scope

- **D1 (Cloudflare, binding `ARCH_DB`):** the relational store; 69 tables across 38 migrations. The audit's primary subject.
- **R2 (Cloudflare, binding `ARCH_UPLOADS_R2`, bucket `archestimator-proof-uploads`):** object store; 3 logical buckets as prefixes.
- **Cloudflare Workers / OpenNext:** runtime; the audit runs as a Node/Worker script + lib, not in the request path.
- **Queues/Cron:** existing crons unaffected; optional new audit cadence documented.
- **Better Auth (D1-backed):** tables read-only by the audit.
- **TypeScript:** strict; no `any` in the audit module.
- **Next.js 16 / React 19:** **not in scope** (no UI, no route in core). The audit does not touch the Next layer.

## Next.js / React gate

**Not applicable** — the audit has no Server Component, Client Component, route, Server Action, or mutation surface. It is a script + lib querying raw D1/R2. (Recorded with reason per the directive.)

## Cache / revalidation gate

**Not applicable** — no cache layer. Detection must read live D1/R2 state; caching would defeat the purpose.

## Server Action / mutation gate

**Not applicable** to detection. Repair mutates D1/R2 but is a script, not a Server Action; it has its own gate (`--from-report` + `--confirm` + token).

## TypeScript / validation / domain modeling

- Typed `OwnershipEdge`, `OrphanFinding`, `ReconciliationReport`, `RepairAction`.
- `ReadOnlyD1`/`ReadOnlyR2` interfaces (AD-1) — type-level read-only guarantee.
- No `any`, no unsafe casts in the audit module.
- Exhaustive handling of the 4 orphan classes (discriminated union).

## Cloudflare D1 / R2 / data integrity gate

- **Boundary:** only `ARCH_DB` and `ARCH_UPLOADS_R2` from `wrangler.jsonc`. Never `ebxxqidacheyapmmzavr` (legacy Supabase) or other accounts.
- **D1 as SQLite:** FK enforcement is off by default and unverified in-repo (headline finding). Track A (defense-in-depth) + Track B (enable + prove) address it.
- **R2 as object storage:** app-level authorization only (signed reads); the audit uses `list`/`head`/`delete` only.
- **Object-key design:** `{logicalBucket}/{workspaceId}/{userId}/...`. The reconciliation must respect this layout for prefix-bounding.
- **No KV:** not used for integrity (correctly — KV is eventually consistent).
- **Durable Objects:** `COLLAB_ROOMS` unaffected (room-local SQLite, not in the D1↔R2 graph).
- **Database change blueprints:** in `07` (DB-CHG-001…004). No migration in core scope.

## Security / privacy / abuse gate

- See `08`. Read-only-by-type, redaction gate, repair token, credential taxonomy.

## Performance / scalability gate

- See `09`. Bounded detection, R2 cost cap, perf evaluator, cardinality table.

## Reliability / observability gate

- See `09`/`13`. Partial reports, audit rows, exit-code alerts.

## Accessibility gate

- See `05`. CLI text; non-color severity cues. No browser-only claim.

## Testing gate

- See `12`. `node:sqlite` + fake R2 for logic; instrumentation for read-only proof; perf baseline; provider-backed dry-run for hosted.

## Tailwind v4 / design-system gate

**Not applicable** — no UI.

## Standing authorizations conformance

This pack conforms to AGENTS.md:
- Cloudflare-resource standing authorization respected (only `wrangler.jsonc` bindings; planning-only — no mutation).
- Shared-worktree branch policy respected (no branches/worktrees created).
- Free-tier cost posture respected (R2 cost cap + owner approval).
- Iteration bias respected (proportional verification; no broad `validate` mandated per change).
- Redaction rules respected (FR-004/SEC-002).
