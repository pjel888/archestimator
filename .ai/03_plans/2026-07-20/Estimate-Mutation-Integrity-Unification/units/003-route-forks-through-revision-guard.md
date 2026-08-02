# UNIT-003 — Route forks through buildProjectPublicationRevisionFor*

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation here. Its landed current-source behavior is revalidated
> by successor `UNIT-028` in `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Route the forks that bump `publication_source_revision` inline
(`component-mutation-d1.ts`, `component-permanent-delete.ts`,
`reusable-sources/actions.ts`) through the existing
`buildProjectPublicationRevisionForEstimate` / `…ForProject` primitives, so the
revision bump becomes a separate, atomic guard statement rather than a
side-effect of the UPDATE.

## Status

`SUPERSEDED` · historical dependency: `UNIT-001` · requirement: `DATA-003` · risks: `RISK-003`

## Why this matters

`publication_source_revision` is the version counter publications read to detect
"the estimate changed since this publication was issued." When a fork bumps it
inline as `publication_source_revision = publication_source_revision + 1`
inside an UPDATE, two problems arise:

1. The bump is coupled to the mutation's success rather than composed as a
   guard. If the mutation's WHERE clause fails to match (e.g. a concurrent edit
   changed the row), the revision may or may not bump depending on the UPDATE
   semantics — non-atomic.
2. The canonical primitive `buildProjectPublicationRevisionForEstimate`
   (`intent-context.ts:179`) produces a guard statement that the canonical
   paths compose as a separate statement in the batch. Forks that inline the
   bump diverge from this shape.

Three forks inline the bump:

| Fork | Inline bump site |
|------|-------------------|
| `src/lib/component-library/component-mutation-d1.ts` | `:1856` (`UPDATE projects SET publication_source_revision = …`) |
| `src/lib/component-library/component-permanent-delete.ts` | `:1043` (`publication_source_revision = publication_source_revision + 1`) |
| `src/lib/reusable-sources/actions.ts` | `:607` (`publication_source_revision = publication_source_revision + 1`) |

## Current state

The primitives (from `src/lib/estimates/d1-intents/intent-context.ts`):

```ts
export function buildProjectPublicationRevisionForEstimate(
  projectId, workspaceId, estimateId
): D1IntentStatement  // line 179

export function buildProjectPublicationRevisionForProject(
  projectId, workspaceId
): D1IntentStatement  // line 201
```

Each returns a `{ sql, values }` that bumps `publication_source_revision` on the
`projects` row scoped by `(id, workspace_id)`. The canonical paths compose this
as a separate statement in the batch (see `rows.ts:2059`, `nodes.ts`, `tabs.ts`).

## Owned paths / resources

The 3 fork files above.

## Implementation boundary

For **each** fork:

1. Identify the inline `publication_source_revision = … + 1` site.
2. Remove the bump from the UPDATE statement.
3. Compose `buildProjectPublicationRevisionForEstimate` (if the mutation is
   estimate-scoped) or `buildProjectPublicationRevisionForProject` (if
   project-scoped) as a separate statement in the same `runD1Batch`.
4. The fork must supply `projectId` and `workspaceId` (both in scope at every
   identified site — confirm per site).
5. RISK-003: the SQL shape changes (the UPDATE no longer carries the bump; a
   separate guard statement does). The observable revision-number result is
   identical; the batch composition differs.

**Special case — `reusable-sources/actions.ts`:** this fork already consumes
most primitives (it was the closest-to-canonical fork in the trace). The
revision-guard adoption is the last gap. Likely the smallest change.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization | `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` | passes |
| Bump audit | `rg -n "publication_source_revision = publication_source_revision \+ 1" src/lib/component-library src/lib/reusable-sources` | the 3 sites now use the primitive; raw bumps only in `intent-context.ts` |

## Scope

**In scope:** the 3 forks above.

**Out of scope:**
- Forks that already consume the primitive (`template-propagation-d1.ts`,
  `template-instance-actions.ts` — confirmed in trace).
- The canonical paths.
- `template-linked-mutation-d1.ts` (self-contained snapshot path; doesn't bump
  the project revision).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The 3 forks import and call `buildProjectPublicationRevisionForEstimate` / `…ForProject`
- [ ] The bump audit shows no raw `publication_source_revision = … + 1` in the 3 forks
- [ ] The characterization suite passes
- [ ] No observable revision-number change (the bump still happens, just via the guard statement)

## Acceptance evidence

- The bump audit returns matches only in `intent-context.ts`.
- `git diff` shows the inline bumps removed and the primitive calls added.

## STOP conditions

- A fork's mutation is project-scoped but the primitive estimate-scoped (or
  vice versa). Pick the matching primitive (`…ForProject` vs `…ForEstimate`).
- A fork bumps the revision conditionally (e.g. only on certain event types).
  The primitive bumps unconditionally — surface it; the fork may need to keep
  the conditional in caller code and only call the primitive when the bump
  should happen.
- The characterization suite fails — reconcile.

## Recovery

Each fork is independent. Revert and reconcile.

## Maintenance notes

- After this unit, all estimate-affecting mutations bump the publication
  revision via the same guard shape.
- A reviewer should confirm the batch ordering: the guard statement can go
  anywhere in the batch (D1 batches are atomic), but conventionally it sits
  with the history statements after the mutation.
- This unit is a prerequisite for reliable publication-staleness detection —
  once all forks use the guard, the publication snapshot's revision check is
  trustworthy.
