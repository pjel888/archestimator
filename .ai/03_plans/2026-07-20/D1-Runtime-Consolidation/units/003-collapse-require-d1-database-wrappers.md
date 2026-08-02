# UNIT-003 — Collapse 20 `requireXD1Database` wrappers to one canonical

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation and refuted by successor `DEC-AUTO-007` in
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Replace the 20 private `async function requireXD1Database()` wrappers around
`getCloudflareD1Database()` with imports of the canonical
`requireCloudflareD1Database` from `src/lib/cloudflare/d1-runtime.ts`.

## Status

`SUPERSEDED` · historical dependency: `UNIT-001` · requirement: `DATA-002` · risks: `RISK-002`

## Why this matters

Each of the 20 wrappers is ~3 lines that throws if the binding is absent, with
a module-specific error message. Adding request-scoped tracing or a read-replica
switch means editing 20 files. The wrappers are shallow (deletion test: every
copy is a shallow wrapper — complexity does not concentrate when removed).
Collapsing them onto the canonical `requireCloudflareD1Database` makes the D1
acquisition layer a single touchpoint.

## Current state

Verified during the Improve-Plan reconcile: `rg "async function require[A-Za-z]*D1Database\(\)" src/lib/`
returns **21 sites** (the count is stable as of the reconcile; re-run the grep
at execution time to confirm, since files may drift):

1. `src/lib/ai/package-builder/apply.ts`
2. `src/lib/ai/package-builder/read-tools.ts`
3. `src/lib/ai/read-context.ts`
4. `src/lib/auth/account-actions.ts`
5. `src/lib/component-library/actions.ts`
6. `src/lib/component-library/project-component-projection.ts`
7. `src/lib/component-library/template-editor-actions.ts`
8. `src/lib/estimates/d1-intents/database.ts` (`requireEstimateD1Database` —
   already aliased to the canonical after UNIT-002; this unit confirms it)
9. `src/lib/estimates/express-promotion-actions.ts`
10. `src/lib/projects/actions.ts`
11. `src/lib/publisher/activity-repository.ts`
12. `src/lib/publisher/roster-repository.ts`
13. `src/lib/repositories/component-library-repository.ts`
14. `src/lib/repositories/project-activity-feed-repository.ts`
15. `src/lib/repositories/project-activity-repository.ts`
16. `src/lib/repositories/project-charts-repository.ts`
17. `src/lib/repositories/project-estimate-sheets-repository.ts`
18. `src/lib/repositories/workspace-repository.ts`
19. `src/lib/reusable-sources/actions.ts`
20. `src/lib/workshop/actions.ts`
21. `src/lib/workshop/group-actions.ts`

The canonical replacement: `requireCloudflareD1Database` from
`@/lib/cloudflare/d1-runtime` (created in UNIT-001).

Each wrapper's body is approximately:

```ts
async function requireXxxD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for <context>.");
  }
  return database;
}
```

## Owned paths / resources

The ~20 files listed above. One sub-step per file.

## Implementation boundary

1. Run `rg -n "async function require[A-Za-z]*D1Database\(\)" src/lib` to get the
   current authoritative list (the audit's list may be stale — verify against
   source).
2. For **each** wrapper, reread its body (RISK-002):
   - If the body is the trivial 3-line form (acquire + null-check + throw),
     delete it and replace call sites with `requireCloudflareD1Database()`
     imported from `@/lib/cloudflare/d1-runtime`.
   - If the body has extra logic (dev-auth-bypass integration, tracing, a
     non-standard error message that callers depend on), **migrate** the extra
     logic: either move it into the canonical helper (if it is broadly useful,
     like tracing) or keep a thin local wrapper that calls the canonical helper
     and adds the extra step. Do not delete a non-trivial wrapper blindly.
3. After each file, run `bun run type-check`. The change is mechanical but the
   call sites must be updated.
4. The error message changes from module-specific (`"... for package Apply."`)
   to the canonical (`"Cloudflare D1 ARCH_DB binding is required."`). Confirm
   via grep that no caller parses the error message string (none should, but
   verify: `rg "binding is required for" src`).

**Special cases:**
- `src/lib/estimates/d1-intents/database.ts`'s `requireEstimateD1Database` —
  already aliased to the canonical in UNIT-002; this unit confirms the alias is
  in place and optionally renames callers to `requireCloudflareD1Database`
  directly (optional cleanup; the alias is fine to keep).
- `src/lib/ai/package-builder/apply.ts` and `read-tools.ts` — these are Pack D's
  territory, but the wrapper collapse is mechanical and orthogonal to Pack D's
  write-path rewrite. Migrate them here (delete the wrapper, import the
  canonical); Pack D will preserve the import.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Enumerate | `rg -n "async function require[A-Za-z]*D1Database\(\)" src/lib` | full list of 20 sites |
| Type-check (per file) | `bun run type-check` | exit 0 after each |
| Lint (final) | `bun run lint` | exit 0 |
| Audit (final) | `rg "async function require[A-Za-z]*D1Database\(\)" src/lib` | returns ONLY the `requireEstimateD1Database` alias in `d1-intents/database.ts` (or zero matches if fully collapsed) |

## Scope

**In scope:** the ~20 files with private `requireXD1Database` wrappers.

**Out of scope:**
- Renaming all `requireEstimateD1Database` callers (optional; the alias is fine).
- `getCloudflareD1Database` itself (the underlying acquisition helper in `d1.ts`
  — unchanged; the canonical wrapper composes it).
- Any SQL or business logic.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `rg "async function require[A-Za-z]*D1Database\(\)" src/lib` returns at most one match (the `requireEstimateD1Database` alias in `d1-intents/database.ts`), or zero if fully collapsed
- [ ] Every deleted wrapper's call sites use `requireCloudflareD1Database` from `@/lib/cloudflare/d1-runtime`
- [ ] No error-message-string parsing broken (verified by grep)
- [ ] Non-trivial wrappers migrated, not deleted (RISK-002)

## Acceptance evidence

- The grep audit shows ≤1 wrapper remaining.
- `git diff --stat` shows ~20 files changed, each with a deleted wrapper + an
  added import + updated call sites.
- A spot-check: read 3 migrated files and confirm the wrapper is gone and the
  canonical is imported.

## STOP conditions

- A wrapper's body has logic beyond the trivial 3-line form (RISK-002). Do not
  delete it; migrate the extra logic or keep a thin local wrapper.
- A caller depends on a module-specific error message string (grep finds a
  parser). Preserve that caller's expectation or update it.
- The grep enumeration returns a different count than ~20 (the audit may be
  stale). Trust the grep, not the list.

## Recovery

Each wrapper collapse is independent. If a file breaks, revert just that file.

## Maintenance notes

- After this unit, `requireCloudflareD1Database` is the single acquisition
  touchpoint. Future request-scoped tracing lands here.
- A reviewer should confirm no non-trivial wrapper was deleted blindly. The
  RISK-002 audit (reread each body before deletion) is the load-bearing step.
- Pack D will preserve the `requireCloudflareD1Database` import in the
  `apply.ts`/`read-tools.ts` rewrite.
