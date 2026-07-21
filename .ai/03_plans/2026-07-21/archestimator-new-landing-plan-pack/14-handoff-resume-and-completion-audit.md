# Handoff, Resume, and Completion Audit

## Exact starting state

```text
Package: PLAN-2026-07-21-new-landing-page
Implementation: NOT_STARTED
Terminal status: ACTIVE
Exact next unit: UNIT-001
Ready slice: SLICE-001
Release: NOT_EVALUATED
```

## First implementation session

Run:

```bash
bun run supermemory:ensure
git status --short --branch
```

Read:

```text
AGENTS.md
.ai/10_state/current-state.md  # FAST PATH only
README.md
00-executive-brief.md
01-evidence-and-source-of-truth.md
02-current-codebase-audit.md
09-implementation-units.md
```

Then execute `UNIT-001`.

Do not start by coding the hero. The truth/baseline lock is intentionally first.

## Progress record template

Maintain a short local progress block in the canonical execution document or a repository-approved progress file:

```md
## Execution progress

- Package: PLAN-2026-07-21-new-landing-page
- Baseline HEAD:
- Branch:
- Pre-existing scoped changes:
- Current unit:
- Unit status:
- Files changed:
- Evidence collected:
- Decisions changed:
- Risks realized:
- Tests authorized:
- Tests run:
- Exact next action:
- Updated at:
```

Do not rewrite the historical plan text to make completed work look preplanned. Append execution evidence and update machine record states.

## Unit completion template

```md
### UNIT-00X completion

- Outcome:
- Files created:
- Files modified:
- Shared-file impact:
- Requirements addressed:
- Acceptance criteria addressed:
- Static checks:
- Test proposals left unrun:
- Known uncertainty:
- Rollback:
- Next unit:
```

## Resume protocol

After interruption:

1. read the progress block;
2. run `git status --short --branch`;
3. compare current paths with recorded paths;
4. read only the active unit and its direct source files;
5. verify no stale trigger fired;
6. continue the exact next action;
7. do not rerun completed discovery unless source changed;
8. do not reset or overwrite pre-existing owner work.

If state does not match the record, stop and reconcile before editing.

## Stale triggers

This plan must be revalidated when any of these occur:

- owner changes `/new` objective;
- `/new` no longer blank;
- current `/` landing changes materially;
- hero demo changes or is removed;
- Notion approved hero, CTA, category, or stage changes;
- `beta-request` contact behavior changes;
- a public sample proposal appears;
- public pricing is approved;
- package dependencies add/remove an animation runtime;
- `PublicPageShell` or analytics consent behavior changes;
- `AGENTS.md` test/branch/design authority changes;
- Velora licensing changes;
- another active plan claims the same route.

## Conflict protocol

If implementation source conflicts with this pack:

1. identify the exact contradiction;
2. identify higher-authority source;
3. mark affected source/assumption/decision stale;
4. update copy, unit, criterion, and risk records;
5. refresh hashes;
6. continue from the earliest affected unit.

Do not solve conflict by quietly deviating.

## Final file audit

Expected created source:

```text
src/components/landing-new/ArchestimatorNewLandingPage.tsx
src/components/landing-new/NewLandingHeroDemo.tsx
src/components/landing-new/NewLandingMotionController.tsx
src/components/landing-new/NewLandingPrimitives.tsx
src/components/landing-new/new-landing-content.ts
src/components/landing-new/new-landing.module.css
```

Expected modified source:

```text
src/app/new/page.tsx
```

Potential modified shared source:

```text
src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx
```

Unexpected without explicit justification:

```text
src/app/page.tsx
src/components/landing-v3/ArchestimatorLandingPage.tsx
src/components/landing-v3/landing-content.ts
src/components/landing/sections/LandingCTAs.tsx
src/app/sitemap.ts
src/app/globals.css
src/app/layout.tsx
src/app/providers.tsx
src/components/landing/ContactForm.tsx
src/components/landing/LandingAnalyticsLoader.tsx
package.json
bun.lock
supabase/**
```

## Requirement-to-evidence audit template

| Requirement | Criterion | Status | Evidence | Remaining boundary |
|---|---|---|---|---|
| `REQ-001` | `AC-001` |  |  |  |
| `UX-001` | `AC-002` |  |  |  |
| `UX-002` | `AC-003` |  |  |  |
| `REQ-002` | `AC-004` |  |  |  |
| `UX-003` | `AC-005` |  |  |  |
| `UX-004` | `AC-006` |  |  |  |
| `PERF-001` | `AC-007` |  |  |  |
| `SEC-001` | `AC-008` |  |  |  |
| `OPS-001` | `AC-009` |  |  |  |
| `REQ-003` | `AC-010` |  |  |  |

## Completion-report template

```md
# `/new` Landing Implementation Report

## Outcome
...

## Scope
- Created:
- Modified:
- Shared:
- Explicitly unchanged:

## Product and copy truth
- Canonical hero:
- CTA:
- Stage:
- Prohibited-proof scan:
- Demo sanitization:

## Architecture
- Server-owned:
- Client islands:
- Hero playback:
- Motion runtime:
- Dependencies:

## Responsive and accessibility
- Source-level invariants:
- Reduced motion:
- Product mobile behavior:
- Browser evidence status:

## Verification
| Command | Result | Scope |
|---|---|---|

## Unrun TEST_PROPOSAL items
- TP-001:
- TP-002:
...

## Requirement audit
...

## Known limitations
...

## Repository state
- HEAD:
- Branch:
- `git status --short`:

## External actions
- Commit: not performed
- Push/PR: not performed
- Deploy: not performed
- Promotion/indexing: not performed
```

## Completion states

### Local implementation complete

May be used when:

- source is implemented;
- static checks pass or unrelated failures are documented;
- core code-provable criteria pass;
- test-proposal boundaries are explicit;
- no unauthorized action occurred.

Set only after the manifest’s terminal semantics are satisfied:

```text
implementation_status: COMPLETE
terminal_status: ACHIEVED
plan_lifecycle: N/A
release_status: BOUNDARY or NOT_EVALUATED
```

All core units must be verified, core risks must be mitigated/accepted/closed, and each core criterion must be `PASS` or an authorized `BOUNDARY`. Use `BOUNDARY` only when the manifest also contains an active authorization-boundary record linked reciprocally to the boundary criterion or gate.

### Implementation incomplete

Use when:

- a code defect remains;
- a required section or behavior is missing;
- shared hero cannot be safely adapted;
- static checks reveal implementation errors.

Do not label an unrun visual test alone as an implementation defect; label it a release-evidence boundary.

### Release ready

Not attainable in this task unless the owner separately authorizes and the required build/browser/accessibility/performance evidence is actually collected.

## Promotion handoff

If the owner later wants `/new` to become the main landing, create a separate promotion plan. That plan must decide:

- `/` replacement or redirect;
- old landing rollback route;
- A/B provider;
- indexability and sitemap;
- canonical and OG;
- sample proposal;
- analytics baseline;
- legal and brand review;
- build/browser/accessibility/performance proof;
- deployment and rollback.

Do not append promotion implementation to this package.

## Package closeout

When the implementation is genuinely complete:

1. update source revisions;
2. update unit and criterion states;
3. attach evidence records;
4. refresh artifact hashes;
5. validate the plan pack;
6. write final report;
7. leave exact repository state;
8. stop before commit/push/deploy unless requested.

The final message to the owner must distinguish what was implemented from what was verified.
