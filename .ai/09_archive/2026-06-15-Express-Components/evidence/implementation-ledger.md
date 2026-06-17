---
title: Express Components Implementation Ledger
type: evidence
date: 2026-06-15
status: implementation-complete-browser-auth-proof-blocked
---

# Express Components Implementation Ledger

This ledger maps the implemented Express Components work to U1-U9 and records the verification evidence gathered on branch `codex/express-components` in `/Users/philiplewis/Documents/archestimator.omx-worktrees/launch-codex-express-components`.

## Scope Boundary

- Execution target: full plan pack U1-U9, including the formerly fast-follow U6 Project projection and U7 promotion slice.
- Data-shape decision preserved: no new express table was created; express rows are estimate rows with `metadata.expressComponent` plus existing row/source fields.
- Provider scope preserved: only Archestimator Supabase project `ebxxqidacheyapmmzavr` was mutated; archestimator was not touched.
- Remaining proof boundary: authenticated browser editing proof could not be captured because this worktree has no local `.env*`, service-role/dev-auth values, or `PLAYWRIGHT_STORAGE_STATE`. The captured browser proof is an auth-gate smoke only; do not claim authenticated desktop/mobile editing proof from this run.

## Unit Ledger

| Unit | Status | Evidence | QA rows |
| --- | --- | --- | --- |
| U1 helpers/read path | Implemented | Express/blank/source-less classifiers, estimate/workspace repository metadata mapping, source-less projection exclusion tests | Q12, Q34, Q53 |
| U2 Add row insert | Implemented | Express insert template, persisted row reconciliation, draft buffering/retry/delete recovery, provider insert RPC migration and rollback probe | Q1, Q17, Q18, Q32, Q39, Q45, Q53 |
| U3 update contract | Implemented | Express field patch widening, canonical `unitCost`, partial editable-row fallback totals, stale/error recovery tests | Q2, Q5, Q7, Q19, Q30 |
| U4 editor | Implemented | Inline editor selected after spike; row-table disables virtualization while an express editor is active; keyboard/focus/state tests cover the jsdom path | Q2-Q7, Q22-Q26, Q49, Q55 |
| U5 duplicate icon | Verified / normalized | Non-repro evidence retained; duplicate/detach eligibility covered by component/library row tests without claiming a production duplicate bug fix | Q8, Q9, Q43 |
| U6 Project projection | Implemented | Project-scoped `/workshop/projects/[projectId]/components` route, project projection repository, unauthorized/no-project negative tests | Q10-Q12, Q20, Q34, Q41, Q53 |
| U7 promotion | Implemented | Atomic `promote_express_row_to_library_component` RPC, typed action, idempotent provider rollback probe, permission/folder-boundary tests | Q13, Q21, Q28, Q33, Q46, Q48, Q54 |
| U8 downstream safety | Implemented | Activity/history copy, AI package-builder preservation/blocking, export/proposal/charts/publication regression coverage, replace/move clobber blocks | Q14-Q16, Q35-Q37, Q40, Q42, Q44, Q50, Q51 |
| U9 shipability | Implemented with browser auth proof gap recorded | Feature flags, viewer/server-action blocks, telemetry sink, rollback behavior, no-realtime honesty, UltraQA report, provider evidence, full local validation/build | Q27-Q31, Q38, Q45, Q47, Q48, Q52, Q54, Q56 |

## Supabase / Provider Evidence

Provider mutations were applied through Supabase MCP to project `ebxxqidacheyapmmzavr`:

- `20260615093524` / `express_components_foundation`
- `20260615093648` / `harden_express_trigger_execute`

Post-apply proof in `evidence/live-supabase-evidence.md` includes function/trigger presence, execute grants, insert/idempotency rollback, copy-rekey rollback, promotion/idempotency rollback, non-member denial, rollback cleanliness, and successful type generation.

## Browser Evidence

`vercel:agent-browser` was unavailable on PATH, so Playwright fallback captured the protected-route auth gate:

- `evidence/browser/2026-06-15-express-components-auth-gate.json`
- `evidence/browser/2026-06-15-express-components-auth-gate.png`

Result: target estimate route redirects to `/login?next=...`; the login heading, email field, and sign-in affordance are visible; no page crash/page error was observed. Authenticated editing/mobile/browser stress remains a release-proof follow-up requiring real auth state or dev-auth secrets that were not present in this worktree.

## Verification Commands

Fresh verification after implementation and test repair:

| Command | Result |
| --- | --- |
| Focused Express/project suite: `bunx vitest run ... --maxWorkers=1` (32 files) | Pass — 421 tests |
| Archive/doc compatibility suite (8 files) | Pass — 37 tests |
| `bun run test:dom` | Pass — 324 files passed / 1 skipped; 2386 tests passed / 3 skipped / 5 todo |
| `bun run test` | Pass — 22 tests |
| `bun run type-check` | Pass |
| Changed-file ESLint (`git diff ... | xargs bunx eslint`) | Pass |
| `bun run lint` | Pass — 0 errors, 14 pre-existing warnings |
| `bun run lint:design-system` | Pass |
| `bun run lint:design` | Pass |
| `bun run build` | Pass — Next.js 16.2.6 / Turbopack, 35 static pages generated |
| `git diff --check` | Pass |

## Residual Boundaries

- Authenticated desktop/mobile/browser editing proof is not claimed from this run; see `evidence/ultraqa-report.md`.
- Production deployment, PR creation/push, and CI watching were not performed in this local implementation pass.
- Feature rollout should keep `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED`, `EXPRESS_COMPONENT_PROMOTION_ENABLED`, and `EXPRESS_COMPONENT_PROJECT_FOLDER_ENABLED` available as rollback levers.

## Continuation Correction — Add-row Defaults + Right-sidebar Projection

Owner QA on 2026-06-15 found a real implementation gap: with no local `.env*`, clicking Add row still created the legacy manual placeholder row because express authoring defaulted off, and the estimate right-sidebar Components tab was still loading the workspace-lite library rather than the project projection.

Correction applied in the same branch:

- `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED` now defaults on; explicit `false`/`off` remains a rollback lever.
- `EXPRESS_COMPONENT_PROJECT_FOLDER_ENABLED` now defaults on; explicit `false`/`off` remains a rollback lever.
- The estimate right sidebar now uses a project-scoped lazy loader that includes projected express/project rows plus templates.
- The project projection hierarchy now matches the product expectation: `<project name> → <estimate sheet name> → projected rows`.
- The right-sidebar component tree renders those project folders before the normal taxonomy instead of hiding them on the standalone Components page only.

Focused proof after the correction:

| Command | Result |
| --- | --- |
| `bun run type-check` | Pass |
| Changed-file ESLint on touched source/tests | Pass |
| `git diff --check` | Pass |
| `bun run test:dom -- tests/vitest/express-components.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/component-library-helpers.test.ts tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Pass — 4 files / 41 tests |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-insert.test.tsx -t "sends an unlinked manual\|sends an express row template\|buffers express field edits\|keeps failed express drafts\|persists express image\|makes a linked component project-specific"` | Pass — 6 tests / 13 skipped |

## Continuation Correction — Inline Empty Express Row Contract

Owner QA on 2026-06-15 clarified the missing product contract: Add row must immediately show an empty, normal component-shaped inline editor in the component cell. It must not show the legacy `Drag or add a component here` placeholder, and the user must be able to fill name, description, supplier, unit, unit cost, image/source URLs, and estimate-row costs directly in the sheet with no modal.

Correction applied in the same branch:

- Add row now always inserts an Express component template from the sheet action path; it no longer branches to the legacy manual placeholder based on `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED`.
- New Express templates start with empty component fields (`material` and `unit` blank) plus `metadata.expressComponent` so the row is projected under the project/estimate Components sidebar folder.
- Persisted legacy blank placeholders render through the same inline Express editor instead of the dashed placeholder card.
- First edit of a legacy blank row upgrades the persisted row with `metadata.expressComponent`, making it eligible for project projection.
- Clearing or moving a component into another row resets the source row's component editor fields to empty instead of retaining the old component name in editable state.

Focused proof after this correction:

| Command | Result |
| --- | --- |
| `bun run type-check` | Pass |
| Changed-file ESLint on touched source/tests | Pass |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-insert.test.tsx -t "editable express row\|express row template\|legacy blank rows\|buffers express field edits\|failed express drafts"` | Pass — 5 tests / 15 skipped |
| `bun run test:dom -- tests/vitest/estimate-sheet-cost-inputs.test.tsx -t "empty editable express component row\|keyboard-activated\|persisted legacy blank\|deletes only the component\|moves a component"` | Pass — 5 tests / 33 skipped |

## Continuation Correction — Normal Card UI + Project Projection Scope

Owner QA clarified two further contract details on 2026-06-15:

1. The Add row express component must use the existing component-card UI shape, not a new form block. The empty card has an image placeholder plus inline-editable component name, supplier, unit cost, description, and unit fields.
2. The `Project → Estimate Sheet` Components folder must include only explicit project components: Express rows and rows made project-specific/detached. It must not list every component merely used in the estimate.

Correction applied in the same branch:

- Replaced the separate Express form layout with a normal component-card-shaped inline editor.
- Removed the taller express-row footprint so the row keeps the normal component row height/shape.
- Narrowed `projectEstimateRowToLibraryItem()` to project only `classification === "express"` or `link_state === "detached"`; unlinked copied/used rows with source snapshots are excluded.
- Added regression coverage proving a used copied row returns `null` from project projection, while detached and express rows still project.
- Added regression coverage proving Add row renders `Express component replaceable estimate component` with inline Image URL, Component name, Supplier, Unit cost, Description, and Unit fields, and no legacy placeholder text.

Focused proof after this correction:

| Command | Result |
| --- | --- |
| `bun run test:dom -- tests/vitest/project-component-projection.test.ts tests/vitest/component-library-helpers.test.ts tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Pass — 3 files / 29 tests |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-insert.test.tsx -t "editable express row\|express row template\|legacy blank rows\|buffers express field edits\|failed express drafts\|image URLs"` | Pass — 6 tests / 14 skipped |
| `bun run test:dom -- tests/vitest/estimate-sheet-cost-inputs.test.tsx -t "empty editable express component row\|keyboard-activated\|persisted legacy blank\|deletes only the component\|moves a component"` | Pass — 5 tests / 33 skipped |
| `bun run type-check` | Pass |
| Changed-file ESLint on touched source/tests | Pass |
| `git diff --check` | Pass |

Runtime note: local port 3000 was previously serving `/Users/philiplewis/Documents/archestimator` (`main`). It has been restarted from `/Users/philiplewis/Documents/archestimator.omx-worktrees/launch-codex-express-components`; `ps` shows `node .../launch-codex-express-components/node_modules/.bin/next dev` on port 3000.

## Continuation Correction — Shared Component Card Frame

A final `$impeccable` pass removed the remaining UI mismatch: the empty Express row no longer duplicates a separate component-looking layout. `EstimateMaterialCardContent` and the Express inline editor now both render through one shared `EstimateMaterialCardFrame`, with the Express path filling the same image/name/supplier/cost/description/unit slots using editable controls.

Locked UI contract:

- Add row creates an empty Express row immediately.
- The component cell uses the same card frame as a normal component row.
- Empty card slots are inline editable: Image URL, Component name, Supplier, Unit cost, Component description, Unit.
- No dashed placeholder and no legacy `Drag or add a component here` card appears for Add row.
- Project component folders include only Express rows and explicit project-specific/detached rows; used copied rows remain ordinary estimate usage and are excluded.

Fresh proof after the shared-frame refactor:

| Command | Result |
| --- | --- |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-insert.test.tsx -t "editable express row\|express row template\|legacy blank rows\|buffers express field edits\|failed express drafts\|image URLs"` | Pass — 6 tests / 14 skipped |
| `bun run test:dom -- tests/vitest/estimate-sheet-cost-inputs.test.tsx -t "empty editable express component row\|keyboard-activated\|persisted legacy blank\|deletes only the component\|moves a component"` | Pass — 5 tests / 33 skipped |
| `bun run test:dom -- tests/vitest/project-component-projection.test.ts tests/vitest/component-library-helpers.test.ts tests/vitest/estimate-sheet-library-lazy-load.test.tsx` | Pass — 3 files / 29 tests |
| `bun run type-check` | Pass |
| Changed-file ESLint on touched source/tests | Pass |
| `git diff --check` | Pass |

## 2026-06-15 correction — strict project Components folder ownership

Owner QA found the Components tab still risked showing ordinary estimate-used components under the virtual project/estimate folder. The correction tightened the runtime contract beyond folder-id placement:

- Virtual `Project → Estimate Sheet` folders now render only rows that carry `metadata.projectComponentProjection` from the project projection layer.
- Ordinary workspace/library items, linked rows, copied/used rows, and malformed rows are ignored by the virtual folder even if they accidentally carry a `project-components-*` folder id.
- Project projection tests now explicitly exclude linked rows, used copied rows, and unlinked source-snapshot rows; express and detached rows still project.
- The Components manager folder tree and sheet selection path use the same projection-metadata guard as the estimate sidebar tree.
- Row details now identifies express rows as `Express component` and shows `No image yet` for empty express rows instead of treating them as manual/fallback-image rows.
- CRUD/detail regression coverage was added for project-specific rows, empty express row details, express inline saves, project-specific scalar edits, and row delete.

Fresh focused proof:

| Check | Result |
| --- | --- |
| `bun run test:dom -- tests/vitest/estimate-sheet-row-details-crud.test.tsx` | Pass — 1 file / 3 tests |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-insert.test.tsx -t "opens empty express row component details\|component details\|express row template\|legacy blank rows\|buffers express field edits\|failed express drafts\|image URLs\|project-specific"` | Pass — 1 file / 9 tests / 12 skipped |
| `bun run test:dom -- tests/vitest/estimate-sheet-library-lazy-load.test.tsx tests/vitest/project-component-projection.test.ts tests/vitest/component-library-helpers.test.ts` | Pass — 3 files / 29 tests |
| `bun run test:dom -- tests/vitest/estimate-sheet-cost-inputs.test.tsx -t "empty editable express component row\|keyboard-activated\|persisted legacy blank\|deletes only the component\|moves a component\|blocks express"` | Pass — 1 file / 6 tests / 32 skipped |
| `bun run type-check` | Pass |
| touched-file `bunx eslint ...` | Pass |
| `git diff --check` | Pass |
| localhost process check | Port 3000 is `next-server (v16.2.6)` from `/Users/philiplewis/Documents/archestimator.omx-worktrees/launch-codex-express-components`; `curl -I http://localhost:3000` returned `HTTP/1.1 200 OK`. |
