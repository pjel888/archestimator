# UltraQA Report — Projects Page Access Tabs

## Goal and success criteria

- **Goal:** Verify that `/workshop/projects` implements exactly two access tabs with correct owned/shared partitioning and no regressions to search, view mode, pending invites, favorite safety, or bulk delete safety.
- **Stop condition:** Baseline verification and adversarial DOM scenarios pass; no temporary harness debris remains; any blocked visual/browser proof is documented as release proof rather than hidden.
- **Safety bounds applied:** No provider writes, no Supabase migrations, no schema changes, no secrets, no production/browser-auth mutation, no destructive git operations before commit/merge checkpoints.

## Scenario matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|----|---------------------|----------|-----------------|-----------------|---------------|--------|----------|---------|
| QA-001 | Normal owner with mixed access | Exactly two tabs render; old `All / Owned / Shared` filter absent | `bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx` | Two tab roles named `Your Projects` and `Projects shared to you`; old labels absent | Passed | PASS | Access-tabs test 1 | No temp harness |
| QA-002 | Owner with shared memberships | Owned tab shows only `accessKind === "owned"` | Same targeted DOM suite | Owned card visible; shared/pending cards hidden in active panel | Passed | PASS | Access-tabs test 2 | No temp harness |
| QA-003 | Collaborator / invitee | Shared tab shows every non-owned access kind including pending invite | Same targeted DOM suite | Project-member, sheet-member, pending-invite visible; Accept invite present | Passed | PASS | Access-tabs test 3 | No temp harness |
| QA-004 | Shared-only user | User has no owned projects | Same targeted DOM suite | Shared tab selected by default; Your Projects still visible | Passed | PASS | Access-tabs test 4 | No temp harness |
| QA-005 | Misleading search state | Search term matches hidden tab only | Same targeted DOM suite | Active tab shows tab-specific empty copy; switching tabs preserves query and reveals match | Passed | PASS | Access-tabs test 5 | No temp harness |
| QA-006 | Broken-action adversary | User tries to favorite a shared external project | Same targeted DOM suite | Owned favorite button remains; non-owned shared favorite button absent | Passed | PASS | Access-tabs test 7 | No temp harness |
| QA-007 | Bulk delete edge case | Selection crosses tab boundaries | Same targeted DOM suite plus mass-deletion static contract | Toolbar count scoped to active visible cards; hidden selection preserved; preview authorization still uses full project list | Passed | PASS | Access-tabs bulk test; `mass-deletion-ui-contract` static assertions | No temp harness |
| QA-008 | Keyboard/a11y user | Roving tab navigation | Same targeted DOM suite | ArrowRight/ArrowLeft/Home/End update focus, selected tab, and panel contents | Passed | PASS | Access-tabs keyboard/view-mode test | No temp harness |
| QA-009 | Regression surface | Existing shared-access and view-mode tests after IA change | Focused 4-file Projects suite | Existing badges, pending invite, density/view-mode behavior still pass | Passed | PASS | 4 files / 23 tests passed | No temp harness |
| QA-010 | Full repo misleading success guard | Full unit/DOM validation and build | `bun run test`, `bun run test:dom`, `bun run validate`, `bun run build` | Zero failing tests/build exit 0; skipped tests reported explicitly | Passed | PASS | Unit passed; DOM 173 files / 1327 passed / 2 skipped; validate passed; build passed | No temp harness |
| QA-011 | Visual QA safe substitute | UI visual fidelity without approved screenshot reference | `bun run lint:design-system`; designer sidecar review; DOM a11y tests | Design system rules pass; reviewer finds no visual/system blocker | Passed as substitute | PASS_WITH_LIMIT | Design lint passed; designer noted toolbarPanel/compact token alignment | No screenshot artifact |
| QA-012 | Browser/manual shared account proof | Real authenticated browser state with owned/shared data | Not run; would require seeded/auth/provider state | If run later: tab switching visible in browser with real shared records | Blocked by scope/env; covered by DOM harness locally | BLOCKED_SAFE_SUBSTITUTE | Hosted/manual shared-user smoke remains release proof | No side effects |

## Commands run

- `[0] npx gitnexus impact -r archestimator ProjectsPageClient --include-tests` — LOW blast radius before editing.
- `[0] npx gitnexus impact -r archestimator LiveProjectCard --include-tests` — LOW blast radius before editing.
- `[0] bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx` — focused access-tabs DOM suite passed.
- `[0] bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-view-mode.test.tsx tests/vitest/mass-deletion-ui-contract.test.ts` — focused regression suite passed, 4 files / 23 tests.
- `[0] bun run type-check` — passed.
- `[0] bun run lint:design-system` — passed.
- `[0] bun run lint` — passed with existing warnings / 0 errors.
- `[0] bun run test` — passed.
- `[0] bun run test:dom` — passed, 173 files / 1327 passed / 2 skipped.
- `[0] bun run validate` — passed.
- `[0] bun run build` — passed under Next.js 16.2.6 / Turbopack.

## Failures found

- Initial red targeted DOM test proved the old `All / Owned / Shared` filter and visible shared favorite action were still present before implementation.
- A duplicated `--maxWorkers` command form failed because the repository script already supplies `--maxWorkers=1`; reruns used the repo-native command shape and passed. This was a command invocation issue, not a product failure.

## Fixes applied

- Replaced the old access filter with two always-visible tabs and active tab state.
- Moved tabs to `WorkshopCollectionLayout.toolbarPanel`.
- Scoped filtering/search/empty states/bulk visible selection to the active tab.
- Kept delete-preview authorization against the full project list.
- Gated favorite controls on owned access only.
- Added focused DOM tests and updated existing project-page tests.

## Cleanup and rollback

- No temporary harness files were created.
- Generated `next-env.d.ts` build-type drift was reverted and left out of the feature diff.
- Plan package archived to `.ai/09_archive/store/2026-06-03-projects-page-access-tabs-complete/`.

## Residual risks

- No approved raster reference image existed, so strict `$visual-verdict` screenshot comparison could not be run. Safe substitutes: DESIGN.md-constrained implementation, `bun run lint:design-system`, designer review, and DOM a11y/behavior tests.
- Hosted/manual real-account smoke with actual shared records remains a release evidence task, not local implementation proof.
- Shared favorites remain intentionally unsupported until product/data-model semantics are approved.

## Post-review accessibility fix

A verifier sidecar flagged that inactive tabs had `aria-controls` values pointing at tabpanel IDs that were not mounted while only the active panel rendered. The implementation now renders hidden inactive `<section role="tabpanel">` targets so every tab's `aria-controls` references an existing DOM element. `tests/vitest/projects-page-access-tabs.test.tsx` now asserts that every rendered tab has an existing controlled panel target. Fresh verification after this fix: `bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx` passed 9/9, `bun run type-check` passed, `bun run lint:design-system` passed, final `bun run validate` passed, and final `bun run build` passed.
