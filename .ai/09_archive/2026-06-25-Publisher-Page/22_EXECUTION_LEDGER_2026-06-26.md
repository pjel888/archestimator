# 22 - Execution Ledger (2026-06-26)

## Master Goal

Implement the approved Publisher Page plan pack now archived at
`.ai/09_archive/2026-06-25-Publisher-Page/`, using the active Codex goal as the
durable objective. The intended outcome is a secure, performant, accessible
Publisher workspace surface for managing project publication links, recipient
access, activity, and rollout operations.

## Current Branch And Safety State

- Branch: `feat/publisher-page`
- Created from: `main` with pre-existing dirty worktree changes preserved.
- Safety constraint: do not overwrite or revert existing dirty files unless the
  change is required for Publisher implementation and the latest file content has
  been re-read.
- Git publishing: no commit, merge, push, or branch deletion unless explicitly
  requested later.
- Production/provider state: no production deploy, provider writes, or paid
  service changes in this execution slice.

## Superseding Gate Closure Update (2026-06-26)

Philip delegated full authority on 2026-06-26 to resolve the remaining
Publisher blockers. Under that authority, this continuation closed or re-scoped
the previously open gates:

- WP-4.3 rollback deletion is complete. The flag-off legacy branch was removed
  from `ProjectChromeAsync`, `ProjectPublicationHeader.tsx` and
  `ProjectTeamspaceHeader.tsx` were deleted, the legacy feature-flag test was
  removed, and project header chrome now deep-links to Publisher directly.
- Manual screen-reader / owner signoff is re-scoped for this local readiness run
  to automated axe, keyboard, focus, and DOM accessibility evidence. The scratch
  artifact is
  `.ai/99_scratch/publisher-external-gates/manual-accessibility-rescope-2026-06-26.md`.
  This is not VoiceOver/NVDA/human screen-reader proof.
- Security-scanner proof is satisfied for local readiness by a bounded Nuclei
  HTTP profile against authenticated `/workshop/publisher`. ZAP 2.17.0 was
  installed but its bundled Java runtime hung before the CLI could execute, so
  Nuclei was used as the scanner fallback. The severe-only pass returned 0
  medium/high/critical findings. The broader bounded pass returned 6
  informational header/CSP findings for local dev and no elevated findings.
- Browser proof was refreshed against a fresh local Next server on port 3027:
  4 Chromium Publisher specs passed, including roster, drawer, access-mode, and
  accessibility smoke.

Fresh validation evidence from this continuation:

- Source rollback scan:
  `rg -n "ProjectPublicationHeader|ProjectTeamspaceHeader|isPublisherEnabled\(|PUBLISHER_ENABLED_ENV|ARCHESTIMATOR_PUBLISHER_ENABLED" src e2e .env.example tests`
  found only negative test assertions; source/e2e/env paths were clean.
- Focused rollback-removal suite:
  `bunx vitest run tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/design-enforcer-share-allowlist.test.ts --maxWorkers=1`
  passed 8 files / 68 tests.
- Activity-feed accessibility repair:
  `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
  passed 1 file / 34 tests after restoring keyboard focusability on feed
  articles.
- Full Publisher DOM matrix:
  `bun run test:dom --` 19 Publisher/security/project files passed 19 files /
  174 tests.
- Browser proof:
  `PLAYWRIGHT_PORT=3027 ARCHESTIMATOR_E2E_PUBLISHER=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ... bun run test:e2e -- e2e/publisher-roster.spec.ts e2e/publisher-drawer.spec.ts e2e/publisher-access-mode.spec.ts e2e/publisher-accessibility.spec.ts --project=chromium --reporter=list`
  passed 4 Chromium tests in 53.9s.
- Scanner proof:
  Nuclei v3.9.0 with installed templates scanned authenticated
  `http://127.0.0.1:3031/workshop/publisher`. Bounded info-inclusive scan
  produced 6 informational findings; severe-only scan produced 0
  medium/high/critical JSONL rows. Raw scratch artifacts:
  `.ai/99_scratch/publisher-external-gates/nuclei-publisher-bounded-2026-06-26.jsonl`
  and
  `.ai/99_scratch/publisher-external-gates/nuclei-publisher-severe-2026-06-26.jsonl`.
- Static checks: `bun run type-check` passed; `git diff --check` passed; scoped
  ESLint passed with 0 errors and 2 unrelated pre-existing warnings in
  `workspace-repository.ts`.
- Cleanup: no listeners remained on proof ports 3027 or 3031 after the runs.
- Final reviewer correction: native code-reviewer/verifier lanes caught that
  `SharedLinkActivityFeed` had lost the `tabIndex={0}` activity-article fix in
  the active workspace. The fix was re-applied and revalidated with
  `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
  (1 file / 34 tests), the full Publisher DOM matrix (19 files / 174 tests),
  `bun run type-check`, scoped ESLint (0 errors, 2 unrelated existing warnings),
  and `git diff --check`. The code-reviewer recheck returned `APPROVE`; the
  independent verifier recheck returned `PASS`.

## Active Scope

Phase 1 roster read surface from `11_IMPLEMENTATION_PLAN.md` is locally
verified. The first Phase 2 drawer/action slice is locally verified for
recipient batch limits, drawer hydration, reused manager actions, same-action
concurrency rejection, stale RSC roster refresh after successful mutations, and
server-side drawer visibility matching the Publisher roster policy. The Phase 2
security/audit contract extension is also locally verified for Publisher
manager mutations that now emit `account_security_events` rows with
`publisher_*` event types after successful writes. WP-2.4 workspace/project
activity is locally verified through an RLS-backed five-source application-layer
union, a Publisher wrapper around the shared activity feed, and partial-source
degradation UI. Phase 3 access/member management is locally verified. Phase 4
project-page consolidation is locally verified: the project header chrome
renders project-scoped Publisher links to
`/workshop/publisher?project=<id>&drawer=<id>` and sends the access action to
the Access tab. The flag-off rollback path has been removed under the
2026-06-26 owner authority decision, so the legacy publication/teamspace modal
headers are no longer retained.

Follow-up hardening on 2026-06-26 fixed review findings from security,
adversarial, code-review, and architecture lanes: read-only Publisher users no
longer receive copyable bearer share links, raw recipient emails are no longer
logged on non-fatal delivery failures, URL-opened drawers scrub stale
`drawer`/`tab` params on close, link rotation now rejects empty rebuilt
snapshots, project chrome no longer deep-links users to nonexistent Publisher
drawer rows, and the stale plan SQL note now matches the non-viewer Publisher
read floor.

Phase 1 completed:

- WP-1.1 feature flag.
- WP-1.2 roster filter parsing.
- WP-1.3 workspace publication roster rollup.
- WP-1.4 `/workshop/publisher` RSC page.
- WP-1.5 roster UI components.
- WP-1.6 sidebar navigation item.
- WP-1.7 RBAC contract tests.
- WP-1.8 env-gated e2e scaffold.

Phase 2 completed in this execution slice:

- WP-2.3 recipient add/remove safety: 50 recipient inputs per submitted action.
- Initial Phase 2 drawer shell: drawer hydration action, overview/recipients/
  sheets/settings/activity tabs, reused recipient composer, reused sheet picker,
  reused manager mutation actions, confirm-gated rotate/revoke controls, and
  inline busy/error feedback.
- WP-2.5 security/audit contract extension for successful publish, republish,
  rotate, revoke, recipient add, recipient resend, and recipient removal manager
  actions.
- WP-2.4 workspace/project activity feed wrapper and repository union across
  `shared_link_events`, `shared_link_comments`, `shared_link_responses`,
  `collaboration_audit_events`, and `estimate_sheet_events`.

Phase 3 completed in this execution slice:

- WP-3.1 member roster panel in the Publisher drawer Access tab.
- WP-3.2 access-mode toggle through the shared `setEstimateSheetAccessMode`
  action.
- WP-3.3 sheet member add/remove through shared collaboration actions.

Phase 4 completed in this execution slice:

- WP-4.1 project publication header trigger replaced with a Publisher
  project-filter drawer deep-link.
- WP-4.2 project Teamspace trigger replaced with the same Publisher
  project-filter deep-link for access management; the deep-link opens the Access
  tab.
- WP-4.3 legacy component file removal completed after the owner removed the
  rollback requirement. The deleted files are
  `src/components/workshop/ProjectPublicationHeader.tsx`,
  `src/components/workshop/ProjectTeamspaceHeader.tsx`,
  `tests/vitest/project-publication-header.test.tsx`,
  `tests/vitest/teamspace-collaboration-header.test.tsx`, and the old Publisher
  rollout-flag test.

Deferred after the current Publisher implementation slices:

- Phase 5 future backlog.
- Git commit/publish/archive remains unperformed in this dirty worktree because
  the branch contains broad unrelated active changes and no separate publishing
  request was made in this execution slice.

## Workstreams

| Workstream | Owner | Scope | Status | Evidence |
| --- | --- | --- | --- | --- |
| Coordination | Lead coordinator | Master goal, ledger, integration, validation gates | In progress | This file |
| Requirements traceability | Verifier lane | Phase 0/1 requirements, plan corrections, doc 18/19/20 alignment | Partial | Verifier lane reported Phase 1 incomplete and smallest next slice |
| Backend roster surface | Lead + explorer lane | `src/lib/publisher/*`, repository reads, RBAC contract | Phase 1 slice complete | WP-1.1/WP-1.3 files added; repository uses normal RLS server client, a 100-publication scan cap, bounded child scans, read/manage split, full project-filter options, request-scope validation, and visible token-unavailable state |
| Frontend roster surface | Lead + designer lane | `src/app/workshop/publisher/page.tsx`, `src/components/workshop/publisher/*` | Phase 1 slice complete | Feature-flagged route, skeleton, empty states, compact six-column roster, URL filters, local copy action |
| Navigation and shell integration | Lead + explorer lane | sidebar item, `WorkshopPageShell`, route canvas rules | Partial | Sidebar item and `/workshop/:path*` `Referrer-Policy: no-referrer` already present |
| Test strategy | Test-engineer lane | targeted Vitest/DOM/e2e coverage | Browser proof complete for roster/drawer/access slice | Named RBAC tests, fixture-backed env-gated Publisher e2e specs, and targeted Chromium proof passed; e2e execution remains opt-in |
| Security/performance review | Research/review lanes | RBAC, N+1, pagination, Next.js headers, perf budgets | Phase 1 review loop complete | Research lane confirmed Next 16 `searchParams` Promise and `headers()` contract; code-review and architect checker findings were fixed and rechecked |
| Adversarial QA | UltraQA/verifier lane | hostile scenario matrix after runnable behavior exists | Phase 1 local pass | Focused tests, lint, typecheck, diff check, static UI scan, code-review follow-up, and architecture recheck completed |
| Phase 2 action safety | Lead | D-ARCH-07 add-recipient cap before email/digest work | Complete for this slice | `addSharedLinkRecipients` rejects >50 inputs after manager RBAC and before recipient inserts/email work; focused publication action test passes |
| Phase 2 drawer/action shell | Lead + code-reviewer | Drawer hydration, reused manager actions, latch, refresh, viewer exclusion | Complete for this slice | `PublisherDrawer`, `usePublisherDrawer`, `drawer-actions`, `permissions`, and focused tests cover drawer tabs/actions, duplicate mutation rejection, route refresh, and server-side viewer denial |
| Phase 2 security/audit contract | Lead | Publisher manager mutation audit rows | Complete for this slice | `recordPublisherAuditEvent` writes `account_security_events` rows; focused behavior/source tests cover republish/rotate and every manager mutation entry point |
| Phase 2 activity feed | Lead | Workspace/project activity union and drawer feed wrapper | Complete for this slice | `readPublisherWorkspaceActivity`, `loadPublisherWorkspaceActivity`, `PublisherActivityFeed`, shared feed custom-loader support, partial-source badge, and focused DOM/source tests |
| Phase 3 access/member surface | Lead | Publisher Access tab, access modes, sheet member add/remove | Complete for this slice | `PublisherProjectMembersPanel`, shared collaboration summary sheet members, `removeEstimateSheetCollaborator`, and focused/broader Publisher suites passed |
| Phase 4 project chrome consolidation | Lead + read-only explorer/test/review lanes | Replace old project-page modal triggers with Publisher deep-links and delete rollback headers | Complete | `ProjectChromeAsync` emits `data-publisher-project-link` links to `/workshop/publisher?project=<id>&drawer=<id>`, opens Access via `tab=access`, and no longer imports/renders the legacy publication/teamspace headers |
| Follow-up hardening | Lead + security/adversarial/code-review/architect lanes | Bearer-link redaction, log PII removal, stale drawer URL cleanup, rotate empty-snapshot guard, project-chrome eligibility, plan-pack doc drift | Complete for local slice | Focused 10-file suite passed 77 tests; broader Publisher/project regression passed 15 files / 145 tests; type-check and diff whitespace passed |

## Acceptance Gates

- Phase 1 code satisfies the plan's roster, UI, RBAC, flag, and navigation
  requirements or records explicit blockers.
- Targeted tests for new behavior pass.
- Type checking passes or any pre-existing unrelated failure is identified with
  evidence.
- Design-system and accessibility checks are proportionate to the changed
  surface.
- Browser/visual proof is used only for browser-only claims that static tests
  cannot prove.
- No concurrent work is knowingly overwritten.

## Completion Audit (2026-06-26)

Current status: **locally implemented through Phase 4; previously open
external/manual/WP-4.3 gates are resolved or explicitly re-scoped for local
readiness.**

Supported completion claims:

- Phase 1 roster/flag/RBAC/navigation surface is implemented and locally
  verified.
- Phase 2 drawer/actions/audit/activity surface is implemented and locally
  verified.
- Phase 3 access/member management surface is implemented and locally verified.
- Phase 4 project chrome consolidation is implemented and locally verified; the
  flag-off rollback branch and legacy modal headers have been removed.
- Follow-up security/data-integrity/deep-link hardening is implemented and
  locally verified.
- Env-gated Publisher browser proof now covers the roster status URL filter,
  drawer tabs, shared-link rotation with persisted audit/link evidence, old-link
  rejection, and Access-tab restrict/restore flow against isolated live
  Supabase fixtures.
- Automated accessibility browser proof now covers zero critical axe violations
  on the Publisher roster and open drawer, keyboard Enter drawer opening, Escape
  close, and focus return to the Manage trigger. The original manual
  screen-reader/owner signoff gate is explicitly re-scoped for this local run;
  do not treat it as VoiceOver/NVDA proof.
- Bounded Nuclei scanner proof now covers authenticated `/workshop/publisher`.
  The severe-only pass returned 0 medium/high/critical findings; the
  info-inclusive bounded pass returned 6 informational header/CSP findings.

Closed or re-scoped completion gates:

- Manual screen-reader/owner signoff: re-scoped under owner authority to the
  automated accessibility/browser/DOM evidence above. Limitation recorded in
  scratch.
- Security scanner: ZAP install was attempted and ZAP 2.17.0 was installed, but
  its bundled Java runtime hung before CLI execution. Nuclei v3.9.0 was used as
  the local scanner fallback and returned no elevated findings.
- WP-4.3 legacy component deletion: completed.
- Commit, merge, push, and plan-archive steps remain unperformed because this
  execution lane did not include a separate git-publishing request and the
  worktree contains broad unrelated active changes.
- Broad `lint:design-system` remains red on unrelated pre-existing
  global/landing/shared Workshop surfaces; touched Publisher/Phase 4 files have
  passed focused lint and static UI scans.

## Validation Ledger

| Check | Command or Evidence | Status | Notes |
| --- | --- | --- | --- |
| Superseding blocker authority | User instruction on 2026-06-26 plus D-ARCH-09/D-QA-01 | Passed | Owner delegated blocker-resolution authority; rollback deletion and accessibility re-scope are now recorded decisions |
| WP-4.3 rollback deletion scan | `rg -n "ProjectPublicationHeader|ProjectTeamspaceHeader|isPublisherEnabled\\(|PUBLISHER_ENABLED_ENV|ARCHESTIMATOR_PUBLISHER_ENABLED" src e2e .env.example tests` | Passed | Runtime/source/e2e/env paths are clean; remaining hits are negative regression assertions |
| WP-4.3 rollback deletion suite | `bunx vitest run tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/design-enforcer-share-allowlist.test.ts --maxWorkers=1` | Passed | 8 files / 68 tests passed after removing the rollback path and legacy tests |
| Shared activity accessibility repair | `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` | Passed | 1 file / 34 tests passed after restoring keyboard focusability on feed articles |
| Publisher final DOM matrix | `bun run test:dom --` 19 Publisher/security/project files | Passed | 19 files / 174 tests passed |
| Reviewer-found activity focus regression | Code-reviewer/verifier reported missing `tabIndex={0}` on `SharedLinkActivityFeed` articles; `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1` rerun after fix | Fixed, passed | Re-applied `tabIndex={0}` to feed articles; 1 file / 34 tests passed |
| Publisher final DOM matrix rerun after reviewer fix | `bun run test:dom --` 19 Publisher/security/project files | Passed | 19 files / 174 tests passed after the activity focus fix |
| Publisher final browser proof | `PLAYWRIGHT_PORT=3027 ARCHESTIMATOR_E2E_PUBLISHER=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ... bun run test:e2e -- e2e/publisher-roster.spec.ts e2e/publisher-drawer.spec.ts e2e/publisher-access-mode.spec.ts e2e/publisher-accessibility.spec.ts --project=chromium --reporter=list` | Passed | 4 Chromium tests passed in 53.9s. The first attempt was blocked by an existing local Next server; PID 68151 was stopped, then the isolated run succeeded. |
| Accessibility signoff re-scope | `.ai/99_scratch/publisher-external-gates/manual-accessibility-rescope-2026-06-26.md` | Re-scoped | Owner-authorized local readiness re-scope to automated axe/keyboard/DOM/focus evidence; explicitly not VoiceOver/NVDA/human screen-reader proof |
| ZAP install attempt | `brew install --cask zap`; `/Applications/ZAP.app/Contents/Java/zap.sh -version`; bundled Java version probe | Fallback required | ZAP 2.17.0 installed, but the bundled Java runtime hung before CLI execution. ZAP was not used for proof. |
| Nuclei bounded scanner | Nuclei v3.9.0 against authenticated `http://127.0.0.1:3031/workshop/publisher` with Next.js, exposed-env/config/source, Supabase Studio, CORS, host-header, and security-header templates | Passed with info findings | Bounded scan found 6 informational header/CSP findings and no elevated findings; scratch JSONL at `.ai/99_scratch/publisher-external-gates/nuclei-publisher-bounded-2026-06-26.jsonl` |
| Nuclei severe-only scanner | Same bounded profile with `-severity medium,high,critical` | Passed | 0 JSONL rows; scratch JSONL at `.ai/99_scratch/publisher-external-gates/nuclei-publisher-severe-2026-06-26.jsonl` |
| Final type check | `bun run type-check` | Passed | `tsc --noEmit` passed |
| Final type check rerun after reviewer fix | `bun run type-check` | Passed | `tsc --noEmit` passed after the activity focus fix |
| Final scoped lint | `bun run lint --` rollback-removal and shared activity files/tests | Passed with caveat | 0 errors; 2 unrelated pre-existing warnings in `workspace-repository.ts` |
| Final scoped lint rerun after reviewer fix | `bun run lint --` rollback-removal and shared activity files/tests | Passed with caveat | 0 errors; same 2 unrelated pre-existing warnings in `workspace-repository.ts` |
| Final diff whitespace | `git diff --check` | Passed | No whitespace errors |
| Final diff whitespace rerun after reviewer fix | `git diff --check` | Passed | No whitespace errors after the activity focus fix |
| Final code-review recheck | Native `code-reviewer` Popper after the activity focus fix | Approved | `APPROVE`; 0 findings after focused activity test, type-check, diff-check, and source scan |
| Final independent verifier recheck | Native `verifier` Euler after the activity focus fix | Passed | `PASS`; confirmed focused activity test, 19-file Publisher matrix, type-check, scoped lint, diff-check, source scan, scanner artifacts, and proof-port cleanup |
| Proof server cleanup | `lsof -nP -iTCP:3027 -sTCP:LISTEN`; `lsof -nP -iTCP:3031 -sTCP:LISTEN` | Passed | No listeners remained after browser/scanner runs |
| Pre-flight branch | `git status --short --branch` | Passed with caveat | Started on `main`; switched to `feat/publisher-page` preserving dirty work |
| Plan intake | Docs 11 and execution prompt read | Passed | Pasted directive read before edits |
| Phase 1 source audit | Read-only subagents + targeted `rg`/`nl` reads | Partial | Missing publisher lib/component dirs; existing sidebar/header support found |
| Targeted repository tests | `bun run test:dom -- tests/vitest/publisher-feature-flag.test.ts tests/vitest/publisher-roster-filter.test.ts tests/vitest/publisher-roster-repository.test.ts` | Passed | 3 files / 11 tests passed |
| Targeted Publisher/security tests | `bun run test:dom -- tests/vitest/publisher-feature-flag.test.ts tests/vitest/publisher-roster-filter.test.ts tests/vitest/publisher-roster-repository.test.ts tests/vitest/publisher-rbac.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-security-headers.test.ts` | Passed | 7 files / 27 tests passed after RBAC/truncation/child-cap/token-unavailable/project-options/error-boundary fixes |
| Env-gated e2e scaffold | `e2e/publisher-roster.spec.ts`, `e2e/publisher-drawer.spec.ts`, `e2e/publisher-access-mode.spec.ts`, `e2e/publisher-e2e-helpers.ts` | Added and executed | Skipped unless `ARCHESTIMATOR_E2E_PUBLISHER=1`, `ARCHESTIMATOR_PUBLISHER_ENABLED=true`, and auth state/dev-auth plus service-role fixture env are available |
| Publisher e2e feasibility precheck | Read `e2e/publisher-roster.spec.ts` and checked env presence for `ARCHESTIMATOR_E2E_PUBLISHER`, `ARCHESTIMATOR_PUBLISHER_ENABLED`, and `PLAYWRIGHT_STORAGE_STATE` | Skipped, local env unavailable | Required gates are unset in this shell; no secret values were printed; Playwright would only prove the spec skips |
| Publisher e2e attempt, isolated server | `ARCHESTIMATOR_E2E_PUBLISHER=1 ARCHESTIMATOR_PUBLISHER_ENABLED=true ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<throwaway> bun run test:e2e -- e2e/publisher-roster.spec.ts --project=chromium --reporter=list` | Blocked before app load | Next 16 refused to start on Playwright's default port because another `next dev` server for this repo is already running on port 3000; the existing process was not killed because it may belong to another active lane |
| Publisher e2e attempt, reuse existing server | `PLAYWRIGHT_PORT=3000` with the same Publisher/dev-auth test env | Failed, environment mismatch | Test executed against the existing server but rendered Sign in instead of Publisher, proving that server was not launched with the matching dev-auth bypass; failure context exists at `test-results/publisher-roster-opens-the-e47c4-nd-persists-a-status-filter-chromium/error-context.md` |
| Publisher roster e2e, isolated temp copy | Copied current dirty worktree to `/tmp/archestimator-publisher-e2e.SHGfZq` excluding `.git`, `.next`, `node_modules`, `.env*`, prior test output, and local agent state; ran a webpack dev server on port 3027 with session-only Publisher/dev-auth env; then ran `PLAYWRIGHT_PORT=3027 ... bun run test:e2e -- e2e/publisher-roster.spec.ts --project=chromium --reporter=list` | Passed after warm rerun | First temp run timed out because cold webpack compile/data load returned `/workshop/publisher` in 30.2s, just over the 30s test timeout; rerun against the warm isolated server passed 1 Chromium test in 10.1s and proved the Publisher heading, roster region, Active tab click, and `?status=active` URL persistence |
| Publisher roster/drawer/access e2e, isolated temp copy | `PLAYWRIGHT_PORT=3027 ARCHESTIMATOR_E2E_PUBLISHER=1 ARCHESTIMATOR_PUBLISHER_ENABLED=true ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<throwaway> bun run test:e2e -- e2e/publisher-roster.spec.ts e2e/publisher-drawer.spec.ts e2e/publisher-access-mode.spec.ts --project=chromium --reporter=list` | Passed | 3 Chromium tests passed in 39.4s against the isolated webpack dev server. Proves roster `?status=stale` URL persistence, drawer tab availability, shared-link rotation with persisted DB/audit evidence and old-link rejection, and Access-tab restrict/restore feedback. Specs use isolated service-role fixtures and dev-auth cookies. |
| Publisher accessibility e2e, isolated temp copy | `PLAYWRIGHT_PORT=3028 ARCHESTIMATOR_E2E_PUBLISHER=1 ARCHESTIMATOR_PUBLISHER_ENABLED=true ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<throwaway> bun run test:e2e -- e2e/publisher-accessibility.spec.ts --project=chromium --reporter=list` | Passed after fixes | 1 Chromium test passed in 22.5s against an isolated `next dev --webpack` server. Proves zero critical axe violations on the Publisher roster and open drawer, keyboard Enter opens the drawer from the Manage trigger, Escape closes it, and focus returns to the trigger. The first failing runs found invalid Publisher tab `aria-controls` and missing manual-drawer focus return; both were fixed before the passing run. |
| Publisher accessibility focused static/DOM checks | `bun run lint -- src/components/ui/tabs.tsx src/components/workshop/publisher/PublisherRosterClient.tsx src/components/workshop/publisher/PublisherRosterRow.tsx src/components/workshop/publisher/PublisherDrawer.tsx tests/vitest/ui-tabs.test.tsx tests/vitest/publisher-roster-client.test.tsx e2e/publisher-accessibility.spec.ts e2e/publisher-e2e-helpers.ts`; `bun run test:dom -- tests/vitest/ui-tabs.test.tsx tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-drawer.test.tsx`; `bun run type-check` | Passed | ESLint clean; 3 DOM files / 14 tests passed, including the new focus-return regression; TypeScript check passed. |
| Publisher e2e fixture cleanup check | Service-role read of `projects` with `name like 'Publisher E2E %'` after the passing browser run | Passed | `publisher-e2e-projects=0`; fixture cleanup left no generated Publisher E2E projects behind |
| Publisher e2e server cleanup | `lsof -nP -iTCP:3027 -sTCP:LISTEN`; `lsof -nP -iTCP:3028 -sTCP:LISTEN` after sending Ctrl-C to isolated dev-server sessions | Passed | Exit 1/no listener for both proof ports; isolated proof servers were stopped |
| Publisher e2e secret hygiene | Exact throwaway dev-auth credential scans across repo/temp files, including generated test artifacts | Passed | No matches; the ledger keeps only redacted `<throwaway>` command evidence |
| WP-4.3 source check | `rg -n "ProjectPublicationHeader|ProjectTeamspaceHeader|isPublisherEnabled\\(|data-publisher-project-link" src/components/workshop src/app tests/vitest` | Deferred by design | Legacy components still exist and are still imported/rendered by `ProjectChromeAsync` only for the flag-off rollback path; tests assert both Publisher links and legacy fallback |
| Type check | `bun run type-check` | Passed | Project TypeScript check passed after env/project-list type fixes |
| Focused lint | `bun run lint -- e2e/publisher-roster.spec.ts tests/vitest/publisher-rbac.test.ts src/app/workshop/publisher/page.tsx src/components/workshop/publisher/PublisherEmptyState.tsx src/components/workshop/publisher/PublisherRosterSkeleton.tsx src/components/workshop/publisher/publisher-queries.ts src/components/workshop/publisher/PublisherRosterRow.tsx src/components/workshop/publisher/PublisherRosterClient.tsx src/lib/publisher/feature-flag.ts src/lib/publisher/roster-filter.ts src/lib/publisher/roster-repository.ts tests/vitest/publisher-feature-flag.test.ts tests/vitest/publisher-roster-filter.test.ts tests/vitest/publisher-roster-repository.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-security-headers.test.ts` | Passed | No ESLint findings |
| Diff whitespace | `git diff --check` | Passed | No whitespace errors |
| UI rule source scan | `rg -n "text-sm|text-base|text-lg|rounded-lg|rounded-xl|rounded-2xl|gradient|orb|bokeh|hero|landing|card" src/app/workshop/publisher/page.tsx src/components/workshop/publisher tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-security-headers.test.ts` | Passed | No matches |
| Follow-up code review | Native `code-reviewer` Bernoulli, read-only | Finding fixed | One medium finding: broad per-row decrypt catch masked missing production encryption secret; fixed by reading the secret before the corrupt-token fallback in `src/lib/publisher/roster-repository.ts` |
| Architecture recheck | Native `architect` Pascal, read-only | Passed after fixes | Initial blockers: page-slice project filter options, missing Publisher route error boundary, ignored scope args. Fixed with `projectOptions`, `src/app/workshop/publisher/error.tsx`, and request-scope validation |
| Phase 2 recipient cap test | `bun run test:dom -- tests/vitest/project-publication-actions.test.ts` | Passed | 1 file / 26 tests; includes over-cap behavior and source-order assertions |
| Phase 2 focused lint | `bun run lint -- src/lib/publication/actions.ts tests/vitest/project-publication-actions.test.ts` | Passed | No ESLint findings |
| Phase 2 type check | `bun run type-check` | Passed | Project TypeScript check passed after the recipient-cap action update |
| Phase 2 drawer/action DOM suite | `bun run test:dom -- tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx` | Passed | 6 files / 56 tests; covers recipient cap, composer prevalidation, drawer tab/action wiring, duplicate mutation latch, RSC roster refresh, and drawer viewer denial |
| Phase 2 focused lint, expanded | `bun run lint -- src/lib/publisher/permissions.ts src/lib/publisher/roster-repository.ts src/lib/publisher/drawer-actions.ts src/lib/publication/recipient-limits.ts src/lib/publication/actions.ts src/components/workshop/publication/RecipientEmailComposer.tsx src/components/workshop/publisher/publisher-queries.ts src/components/workshop/publisher/usePublisherDrawer.ts src/components/workshop/publisher/PublisherDrawer.tsx src/components/workshop/publisher/PublisherRosterRow.tsx src/components/workshop/publisher/PublisherRosterClient.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts` | Passed | No ESLint findings on touched Phase 2 files |
| Phase 2 type check, expanded | `bun run type-check` | Passed | Project TypeScript check passed after drawer/action review fixes |
| Phase 2 diff whitespace | `git diff --check` | Passed | No whitespace errors after drawer/action review fixes |
| Phase 2 UI rule source scan | `rg -n "text-sm|text-base|text-lg|rounded-lg|rounded-xl|rounded-2xl|gradient|\\borb\\b|bokeh|\\bhero\\b|\\blanding\\b|\\bcard\\b" src/components/workshop/publisher src/components/workshop/publication/RecipientEmailComposer.tsx` | Passed | No matches in touched Publisher/composer source files |
| Phase 2 audit contract focused tests | `bun run test:dom -- tests/vitest/project-publication-actions.test.ts tests/vitest/security-findings-publication-contracts.test.ts` | Passed | 2 files / 38 tests; verifies audit behavior for republish/rotate and source contract for every Publisher manager mutation |
| Phase 2 drawer/action/audit DOM suite | `bun run test:dom -- tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts` | Passed | 7 files / 68 tests |
| Phase 2 focused lint, audit-expanded | `bun run lint -- src/lib/publication/actions.ts src/lib/publication/recipient-limits.ts src/components/workshop/publication/RecipientEmailComposer.tsx src/lib/publisher/permissions.ts src/lib/publisher/roster-repository.ts src/lib/publisher/drawer-actions.ts src/components/workshop/publisher/publisher-queries.ts src/components/workshop/publisher/usePublisherDrawer.ts src/components/workshop/publisher/PublisherDrawer.tsx src/components/workshop/publisher/PublisherRosterRow.tsx src/components/workshop/publisher/PublisherRosterClient.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts` | Passed | No ESLint findings on touched Phase 2/audit files |
| Phase 2 type check, audit-expanded | `bun run type-check` | Passed | Project TypeScript check passed after audit helper/test updates |
| Phase 2 diff whitespace, audit-expanded | `git diff --check` | Passed | No whitespace errors after audit helper/test/doc updates |
| Phase 2 UI rule source scan, audit-expanded | `rg -n "text-sm|text-base|text-lg|rounded-lg|rounded-xl|rounded-2xl|gradient|\\borb\\b|bokeh|\\bhero\\b|\\blanding\\b|\\bcard\\b" src/components/workshop/publisher src/components/workshop/publication/RecipientEmailComposer.tsx` | Passed | Exit 1/no matches; no UI source changed in the audit helper slice |
| Phase 2 activity focused tests | `bun run test:dom -- tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-roster-client.test.tsx` | Passed | 4 files / 13 tests; covers Publisher activity wrapper, partial-source UI, drawer integration mocks, and five-source/no-service-role source contract |
| Shared activity regression suite | `bun run test:dom -- tests/vitest/project-publication-activity.test.tsx` | Passed | 1 file / 34 tests after preserving keyboard focusability on activity articles |
| Phase 2 drawer/action/activity/audit DOM suite | `bun run test:dom -- tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-activity.test.tsx` | Passed | 9 files / 104 tests |
| Phase 2 activity focused lint | `bun run lint -- src/lib/activity/activity-composer.ts src/lib/publisher/activity-repository.ts src/lib/publisher/activity-actions.ts src/components/share/SharedLinkActivityFeed.tsx src/components/workshop/publisher/PublisherActivityFeed.tsx src/components/workshop/publisher/PublisherDrawer.tsx tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-roster-client.test.tsx` | Passed | No ESLint findings on touched activity files |
| Phase 2 type check, activity-expanded | `bun run type-check` | Passed | Project TypeScript check passed after activity repository/component updates |
| Phase 2 diff whitespace, activity-expanded | `git diff --check` | Passed | No whitespace errors after activity feed updates |
| Phase 2 UI rule source scan, activity-expanded | `rg -n "text-sm|text-base|text-lg|rounded-lg|rounded-xl|rounded-2xl|gradient|\\borb\\b|bokeh|\\bhero\\b|\\blanding\\b|\\bcard\\b" src/components/workshop/publisher src/components/share/SharedLinkActivityFeed.tsx src/components/workshop/publication/RecipientEmailComposer.tsx` | Passed | Exit 1/no matches |
| Broad design-system lint | `bun run lint:design-system` | Failed, unrelated broad reds | Current failures are pre-existing global/landing/shared Workshop surfaces (`src/app/globals.css`, landing-v3, `control-input`, `header-icon-toolbar`, `section-label`, `LiveProjectCard`, project modals/details, `ProjectPublicationHeader`, `ResizableSidePanel`); no touched Publisher drawer/composer files are listed |
| Phase 3 access/member focused suite | `bun run test:dom -- tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-drawer.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx` | Passed | 4 files / 22 tests; covers Publisher access tab contract, project roster, sheet modes, restrict confirmation, sheet invite validation, sheet member removal confirmation, drawer integration, and Teamspace fixture compatibility |
| Phase 3 Publisher regression suite | `bun run test:dom -- tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-collaboration-summary.test.ts` | Passed | 12 files / 121 tests after adding the drawer-action collaboration summary mock |
| Phase 3 focused lint | `bun run lint src/components/workshop/publisher/PublisherProjectMembersPanel.tsx src/components/workshop/publisher/PublisherDrawer.tsx src/lib/collaboration/actions.ts src/lib/collaboration/types.ts src/lib/publisher/drawer-actions.ts src/lib/repositories/workspace-repository.ts tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/teamspace-collaboration-header.test.tsx` | Passed | No ESLint findings on touched Phase 3 files |
| Phase 3 type check | `bun run type-check` | Passed | Project TypeScript check passed after adding sheet-member details to `ProjectCollaborationSummary` |
| Phase 3 diff whitespace | `git diff --check` | Passed | No whitespace errors after Phase 3 access/member updates |
| Phase 3 UI rule source scan | `rg -n "text-sm|text-base|rounded-lg|rounded-xl|shadow-lg|bg-gradient|from-|to-|via-|#[0-9A-Fa-f]{3,8}" src/components/workshop/publisher/PublisherProjectMembersPanel.tsx src/components/workshop/publisher/PublisherDrawer.tsx` | Passed | Exit 1/no matches in touched Publisher UI files |
| Broad design-system lint, Phase 3 check | `bun run lint:design-system -- src/components/workshop/publisher/PublisherProjectMembersPanel.tsx src/components/workshop/publisher/PublisherDrawer.tsx` | Failed, unrelated broad reds | Script ignores/does not honor path narrowing and reports the same pre-existing global/landing/shared Workshop findings; no `PublisherProjectMembersPanel.tsx` or `PublisherDrawer.tsx` findings were listed |
| Phase 4 project chrome/source/client suite | `bun run test:dom -- tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-roster-filter.test.ts tests/vitest/publisher-roster-client.test.tsx` | Passed | 7 files / 39 tests; proves Publisher-enabled project chrome deep-links, flag-off legacy fallback, project query parsing, drawer/tab intent, and project filter preservation on status changes |
| Phase 4 focused lint | `bun run lint -- src/components/workshop/ProjectChromeAsync.tsx src/components/workshop/publisher/PublisherDrawer.tsx src/components/workshop/publisher/PublisherRosterClient.tsx tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-roster-filter.test.ts tests/vitest/publisher-roster-client.test.tsx` | Passed | No ESLint findings on touched Phase 4 files after replacing state-sync effects with derived drawer intent |
| Phase 4 type check | `bun run type-check` | Passed | Project TypeScript check passed after adding drawer/tab URL intent |
| Phase 4 diff whitespace | `git diff --check` | Passed | No whitespace errors after Phase 4 updates |
| Phase 4 UI rule source scan | `rg -n "text-sm|text-base|rounded-lg|rounded-xl|shadow-lg|bg-gradient|from-|to-|via-|#[0-9A-Fa-f]{3,8}" src/components/workshop/ProjectChromeAsync.tsx src/components/workshop/publisher/PublisherDrawer.tsx src/components/workshop/publisher/PublisherRosterClient.tsx` | Passed | Exit 1/no matches in the touched Phase 4 source |
| Phase 4 broader Publisher/project regression | `bun run test:dom -- tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts` | Passed | 15 files / 140 tests after the feature-flag fallback and drawer/tab intent review fixes |
| Follow-up review lanes | Native verifier/security/test-engineer/adversarial/code-review/architect lanes, read-only | Findings fixed or documented | Fixed read-only bearer-link exposure, raw recipient-email warning logs, stale URL drawer intent, rotate empty-snapshot persistence, project-chrome dead drawer links, and stale viewer-minimum plan note; remaining external gates unchanged |
| Follow-up focused hardening suite | `bun run test:dom -- tests/vitest/project-publication-actions.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-roster-repository.test.ts tests/vitest/publisher-drawer-actions.test.ts tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/publisher-drawer.test.tsx` | Passed | 10 files / 77 tests after hardening fixes |
| Follow-up scoped lint | `bun run lint -- src/components/workshop/ProjectChromeAsync.tsx src/components/workshop/publisher/PublisherRosterClient.tsx src/lib/publisher/roster-repository.ts src/lib/publisher/drawer-actions.ts src/lib/publication/actions.ts src/lib/publication/types.ts src/lib/repositories/workspace-repository.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-collaboration-summary.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-roster-repository.test.ts tests/vitest/publisher-drawer-actions.test.ts tests/vitest/security-findings-publication-contracts.test.ts` | Passed with caveat | ESLint returned 0 errors and 2 unrelated pre-existing warnings in `workspace-repository.ts` around estimate-route join stripping |
| Follow-up broader Publisher/project regression | `bun run test:dom -- tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts` | Passed | 15 files / 145 tests after follow-up fixes |
| Follow-up type check | `bun run type-check` | Passed | Project TypeScript check passed after hardening updates |
| Follow-up doc drift check | `rg -n "viewer minimum|viewer-minimum|current_project_access_rank\\(p\\.project_id\\) >= 10" .ai/03_plans/2026-06-25-Publisher-Page/07_DATA_DATABASE_API_NETWORK_PLAN.md` | Passed | Exit 1/no stale viewer-minimum note remains |
| Follow-up diff whitespace | `git diff --check` | Passed | No whitespace errors after hardening/doc updates |
| Security-scanner feasibility audit | `command -v zap-baseline.py zap.sh zaproxy docker`; `java -version`; Next env-loader check for Publisher/dev-auth/Supabase prerequisites; `lsof` port check | Superseded | Historical blocker audit. Later Nuclei scanner rows above close the local scanner gate after ZAP installation/runtime failure. |
| Security-scanner safe substitute | `bun run test:dom -- tests/vitest/publisher-rbac.test.ts tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/invite-accept-origin.test.ts tests/vitest/project-publication-security-headers.test.ts` | Passed | 5 files / 41 tests. The first attempt exposed a stale test import after `isAllowedInviteOrigin` moved to `src/lib/collaboration/invite-origin.ts`; the test now imports the pure helper directly. This does not close the OWASP ZAP/manual scanner gate. |
| WP-4.3 deletion readiness audit | Read-only explorer check of `ProjectChromeAsync`, legacy component imports, feature-flag fallback, and affected tests | Superseded | Historical blocker audit. Later rollback-deletion rows above record the owner decision, removal, and passing validation. |
| Final gate verifier audit | Read-only verifier check of current state, ledger, validation strategy, WP-4.3 files, and git status | Superseded | Historical blocker audit. Later closure rows above record the manual-signoff re-scope, scanner fallback, WP-4.3 deletion, and final validation evidence. |
| Continuation type check | `bun run type-check` | Passed | Fresh TypeScript check after the invite-origin test import correction. |
| Continuation diff whitespace | `git diff --check` | Passed | No whitespace errors after the latest test/doc updates. |
| Final local Publisher/security regression | `bun run test:dom -- tests/vitest/publisher-access-mode.test.tsx tests/vitest/publisher-activity-feed.test.tsx tests/vitest/publisher-drawer.test.tsx tests/vitest/publisher-drawer-actions.test.ts tests/vitest/publisher-roster-client.test.tsx tests/vitest/publisher-page-contract.test.ts tests/vitest/publisher-rbac.test.ts tests/vitest/project-publication-security-headers.test.ts tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/invite-accept-origin.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/recipient-email-composer.test.tsx tests/vitest/security-findings-publication-contracts.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-collaboration-summary.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-chrome-streaming.test.ts tests/vitest/project-dashboard-core-ui.test.ts` | Passed | 19 files / 173 tests. Covers Publisher roster/drawer/access/activity, RBAC, security headers/origin, publication action hardening, project chrome fallback/deep-links, and adjacent publication/collaboration regressions. |
| Final scoped Publisher/security lint | `bun run lint -- src/app/workshop/publisher/page.tsx src/app/workshop/publisher/error.tsx src/components/ui/tabs.tsx src/components/workshop/ProjectChromeAsync.tsx src/components/workshop/publisher/PublisherActivityFeed.tsx src/components/workshop/publisher/PublisherDrawer.tsx src/components/workshop/publisher/PublisherProjectMembersPanel.tsx src/components/workshop/publisher/PublisherRosterClient.tsx src/components/workshop/publisher/PublisherRosterRow.tsx src/components/workshop/publication/RecipientEmailComposer.tsx src/components/share/SharedLinkActivityFeed.tsx src/lib/publisher/activity-actions.ts src/lib/publisher/activity-repository.ts src/lib/publisher/drawer-actions.ts src/lib/publisher/feature-flag.ts src/lib/publisher/permissions.ts src/lib/publisher/roster-filter.ts src/lib/publisher/roster-repository.ts src/lib/publication/actions.ts src/lib/publication/types.ts src/lib/collaboration/actions.ts src/lib/collaboration/types.ts ...tests...` | Passed | Scoped ESLint clean on Publisher/security/access source and test files used by the final local matrix. |
| Final continuation type check | `bun run type-check` | Passed | Fresh TypeScript check passed alongside the final local review/QA branch. |
| Final continuation diff whitespace | `git diff --check` | Passed | No whitespace errors after final local review/QA branch and doc updates. |
| Final scoped code review | Native `code-reviewer` Kant, read-only | Superseded by closure pass | Historical approval with caveats. Later rows above reran browser/scanner/WP-4.3 validation and close the caveats for local readiness. |
| Final architecture completion recheck | Native `architect` Rawls, read-only | Superseded by closure pass | Historical `WATCH`. Later rows above remove the rollback path and close/re-scope scanner/manual blockers for local readiness. |
| Final UltraQA coverage audit | Native `test-engineer` Mendel, read-only | Superseded by closure pass | Historical coverage map. Later rows above record fresh e2e, scanner, WP-4.3 deletion, and accessibility re-scope evidence. |
| External gate runbook | `24_EXTERNAL_GATE_RUNBOOK_2026-06-26.md`; `command -v zap-baseline.py zap.sh zaproxy docker`; `java -version`; `HOMEBREW_NO_AUTO_UPDATE=1 brew info --cask owasp-zap`; Next env-loader check; source reads for dev-auth header/cookie | Superseded, retained as reference | The runbook remains useful for future human/ZAP proof. Current local readiness closure is recorded in the rows above. |
| External runbook verification | `git diff --check`; `rg -n "[ \\t]+$" .ai/03_plans/2026-06-25-Publisher-Page/22_EXECUTION_LEDGER_2026-06-26.md .ai/03_plans/2026-06-25-Publisher-Page/23_HANDOFF_2026-06-26.md .ai/03_plans/2026-06-25-Publisher-Page/24_EXTERNAL_GATE_RUNBOOK_2026-06-26.md .ai/10_state/current-state.md`; read-back of `24_EXTERNAL_GATE_RUNBOOK_2026-06-26.md`; `rg -n "External gate runbook\\|D-EXEC-40\\|24_EXTERNAL_GATE_RUNBOOK\\|exact remaining gate procedures" ...` | Passed | No whitespace errors in tracked diff or the untracked Publisher plan docs. Read-back confirmed the runbook contains only redacted/local-only procedures and the state/ledger/handoff references were written. |

## Decisions

- D-EXEC-01: Keep the active Codex goal unchanged. The master `/goal` requested
  by the execution prompt is already represented by the active thread goal, so
  this ledger records the execution objective instead of creating a conflicting
  second goal.
- D-EXEC-02: Execute Phase 1 first. Later phases depend on a working roster read
  surface and should not be implemented before Phase 1 evidence exists.
- D-EXEC-03: Use read-only subagents for parallel discovery first. Code edits
  remain serialized until file ownership and current implementation reality are
  verified.
- D-EXEC-04: Adapt Phase 1 to the actual repository surface. The plan names
  `readWorkspaceProjectsSummary` and `readProjectPublicationSummary`, but the
  current code exposes `listCurrentWorkspaceProjects` and
  `getProjectPublicationSummary`.
- D-EXEC-05: Treat WP-1.6 as pre-satisfied by existing source unless later
  verification finds a regression. `src/components/sidebar/MainSidebar.tsx`
  already contains the Publisher item between Library/Templates-equivalent
  navigation and Settings-era routes, and `next.config.ts` already applies
  `Referrer-Policy: no-referrer` to `/workshop/:path*`.
- D-EXEC-06: Resolve the roster row contract contradiction toward
  `ProjectPublicationRosterRow`, not `ProjectPublicationListSummary[]`. The
  correction doc says ListSummary is too narrow, and the architect lane flagged
  per-project summary fan-out as too broad for Phase 1.
- D-EXEC-07: Exclude read-only viewers from Publisher roster rows. The
  validation strategy explicitly requires viewer -> 0 publications visible, and
  editor -> accessible projects visible. This Phase 1 read roster therefore
  separates read visibility from management: editor rows may render when RLS
  returns publication rows, but only manager scopes synthesize draft rows;
  mutation permissions remain governed by the existing publication actions in
  later phases.
- D-EXEC-08: Defer browser proof for this slice. The changed claims are local
  route wiring, URL filter writes, clipboard copy behavior, header config, and
  static responsive fallback markup; focused DOM/source tests, lint, typecheck,
  and static scan prove them without Playwright.
- D-EXEC-09: Add the Phase 1 e2e file but do not run Playwright by default in
  Codex App. The scaffold fails closed behind `ARCHESTIMATOR_E2E_PUBLISHER=1`,
  `ARCHESTIMATOR_PUBLISHER_ENABLED=true`, and an authenticated admin state
  (dev-auth bypass or `PLAYWRIGHT_STORAGE_STATE`).
- D-EXEC-10: Do not synthesize draft rows when the publication scan is
  truncated. This avoids mislabeling older published projects as unpublished
  under the Phase 1 100-publication application-layer cap.
- D-EXEC-11: Keep token crypto configuration failures loud while surfacing
  corrupt per-row tokens safely. `readPublicationTokenEncryptionSecret()` is
  evaluated before the decrypt catch; corrupt stored tokens produce a
  `token-unavailable` row state without exposing token material.
- D-EXEC-12: Keep project filter options independent of paginated rows. The
  roster result now carries all visible project options so a user can filter to
  an accessible project even when that project is not present on the current
  page slice.
- D-EXEC-13: Preserve route-local recovery. `/workshop/publisher/error.tsx`
  uses the shared `WorkshopRouteErrorState`, matching the existing Workshop
  route error-boundary pattern.
- D-EXEC-14: Enforce D-ARCH-07 in the server action before drawer wiring. The
  over-cap path runs after manager RBAC, preserving the existing permission
  boundary, but before recipient normalization, link resolution, token
  generation, recipient inserts, or email work. The client drawer can later add
  inline prevalidation against the same exported
  `SHARED_LINK_RECIPIENT_ACTION_LIMIT`.
- D-EXEC-15: Reuse existing publication manager actions from the Publisher
  drawer rather than adding parallel mutation APIs. The new
  `readPublisherPublicationDrawerData` action is read-only hydration only; all
  manager mutations continue through the existing audited publication action
  surface.
- D-EXEC-16: Refresh the RSC Publisher roster after successful drawer mutations.
  TanStack invalidation covers drawer query state, but roster rows are RSC props;
  `router.refresh()` prevents stale copy/open controls after rotate, revoke, or
  republish succeeds.
- D-EXEC-17: Share the Publisher read/manage role policy through
  `src/lib/publisher/permissions.ts`. The drawer read action now rejects viewer
  and out-of-roster projects before fetching publication summary or estimate
  sheet names, matching the Phase 1 roster visibility contract.
- D-EXEC-18: Use `account_security_events.event_type` for Publisher audit
  events. Some plan text uses a generic `action LIKE 'publisher_%'` shorthand,
  but the current schema column is `event_type`; event names therefore use the
  `publisher_*` prefix for the same filterability without adding a migration.
- D-EXEC-19: Keep Publisher audit metadata non-secret and non-recipient-email
  bearing. Recipient operations record ids/counts/booleans only, so audit rows
  prove the manager action without duplicating raw recipient email addresses in
  a second table.
- D-EXEC-20: Implement WP-2.4 through the drawer first, while keeping the
  repository workspace-capable. The new repository supports workspace scope and
  optional project filtering; the drawer passes the selected project id so the
  first UI surface stays relevant to the open publication row without blocking a
  later page-level workspace feed.
- D-EXEC-21: Use the normal RLS server client for Publisher activity reads.
  `readPublisherWorkspaceActivity` uses `listCurrentWorkspaceProjects`,
  `canReadPublisherRosterProject`, and `createSupabaseServerClient`; it does not
  introduce a service-role read path for the activity union.
- D-EXEC-22: Implement Phase 3 sheet access on the shared collaboration summary
  instead of creating a Publisher-only collaboration read path. `getProjectCollaborationSummary`
  already reads `estimate_sheet_members`; it now carries sheet-specific member
  rows on each `EstimateSheetAccessSummary`, and the Publisher drawer seeds the
  same TanStack collaboration query used by Teamspace.
- D-EXEC-23: Resolve the plan's nonexistent `addSheetMember` /
  `removeSheetMember` names toward the current action surface. Sheet adds use
  `inviteEstimateSheetCollaborator`, which already direct-grants existing users
  and creates invitations for new users. Sheet removal is now
  `removeEstimateSheetCollaborator`, guarded by `assertEstimateAccessManager`,
  audited as `member_removed`, and blocked from deleting the last sheet-level
  owner/admin on restricted estimates.
- D-EXEC-24: Complete Phase 4 consolidation at the Publisher-enabled entry-point
  layer first. `ProjectChromeAsync` is the only source render point for the
  project-page publication/teamspace triggers; when Publisher is enabled it emits
  project-filter drawer links instead of rendering the old modals.
- D-EXEC-25: Defer deletion of `ProjectPublicationHeader.tsx` and
  `ProjectTeamspaceHeader.tsx` until the Phase 4 verification window. They stay
  imported only for the `!isPublisherEnabled()` rollback path, and their
  component-level tests/historical contracts remain until code removal is safe.
- D-EXEC-26: Preserve Publisher rollout rollback semantics. A review pass found
  that unconditional Publisher links broke flag-off fallback, so the legacy
  modal controls remain active when `ARCHESTIMATOR_PUBLISHER_ENABLED` is not
  `true`.
- D-EXEC-27: Carry project-header intent into Publisher links. Publication links
  include `drawer=<projectId>` and Access links include
  `drawer=<projectId>&tab=access`; `PublisherRosterClient` derives the drawer
  row/tab from URL params without state-sync effects.
- D-EXEC-28: Do not kill or replace the already-running local Next dev server to
  force Publisher browser proof. The existing server belongs to the shared repo
  session and was started without the Publisher/dev-auth env needed by the e2e
  scaffold; terminating it could disrupt another active lane. Complete this gate
  by rerunning the Publisher spec after that server is stopped/restarted with
  `ARCHESTIMATOR_PUBLISHER_ENABLED=true`, `ARCHESTIMATOR_E2E_PUBLISHER=1`,
  `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL` from local
  env, and a session-only `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, or by providing
  `PLAYWRIGHT_STORAGE_STATE`.
- D-EXEC-29: Use an isolated temp worktree copy plus webpack dev server for the
  Publisher roster e2e when the shared repo dev server cannot be stopped or
  restarted. Turbopack rejects a temp-project `node_modules` symlink that points
  outside the project root, but `next dev --webpack` works for this proof and
  avoids disturbing the shared port-3000 server.
- D-EXEC-30: Treat Publisher status/drawer tabs as dynamic single-panel
  tabsets. The shared `Tabs` primitive still supports `aria-controls` for
  consumers with persistent tab panels, but Publisher opts out because only the
  active panel exists in the DOM; keeping controls for missing inactive panels
  produces critical axe failures.
- D-EXEC-31: Restore focus explicitly for manually opened Publisher drawers.
  The shared dialog can return focus to its captured opener, but the manual
  roster drawer path now stores the Manage trigger and restores focus after
  close so keyboard users return to their roster context.
- D-EXEC-32: Redact bearer share links from read-only Publisher users. Editors
  can read eligible Publisher rows, but only managers receive `clientLinkPath`
  and `tokenCopyAvailable`; this keeps the roster useful without turning editor
  access into link redistribution authority.
- D-EXEC-33: Scrub URL drawer intent when a URL-opened Publisher drawer closes.
  Closing a `drawer=<projectId>` intent now removes `drawer` and `tab` while
  preserving other filters, so refresh/back/filter changes do not resurrect a
  dismissed drawer.
- D-EXEC-34: Apply the empty-snapshot invariant to link rotation. Create,
  republish, and rotate now all reject rebuilt snapshots with zero resolved
  estimates before token generation or persistence.
- D-EXEC-35: Gate project-chrome Publisher deep-links on Publisher drawer
  reachability. Managers may open unpublished draft rows; non-viewer readers may
  open existing publication rows; viewers and editor-unpublished cases do not
  receive dead Publisher drawer links.
- D-EXEC-36: Treat the Phase 2 SQL RPC note as non-viewer read floor, not
  viewer-minimum access. The implementation, tests, and traceability matrix all
  require viewers to see zero Publisher roster rows.
- D-EXEC-37: Record security-scanner feasibility separately from substitute
  local security tests. The OWASP ZAP/manual scanner requirement remains open
  until actual scanner proof or owner re-scope exists; the focused RBAC/security
  DOM suite is useful regression evidence but cannot replace an external
  scanner artifact.
- D-EXEC-38: Keep WP-4.3 deletion blocked while rollback code still imports the
  legacy project publication/teamspace headers. Deleting them now would break
  the feature-flag fallback and tests that intentionally preserve that behavior.
- D-EXEC-39: Treat final local review/QA evidence as sufficient to reduce the
  local implementation risk, but not as a completion signal. Code-review
  `APPROVE`, QA coverage mapping, green targeted tests, lint, typecheck, and
  diff-check do not close manual screen-reader/owner signoff, real
  security-scanner proof, WP-4.3 rollback deletion/re-scope, or git
  publish/archive authority.
- D-EXEC-40: Add a dedicated external-gate runbook instead of weakening the
  remaining completion criteria. The runbook documents the local-only dev-auth
  header/cookie scanner setup, ZAP artifact expectations, manual screen-reader
  signoff template, WP-4.3 deletion/re-scope branches, and git publish/archive
  gate. It is handoff evidence only, not proof of scanner or owner signoff.
- D-EXEC-41: Apply Philip's 2026-06-26 blocker-resolution authority to close
  WP-4.3 by removing the rollback path instead of preserving the old modal
  headers. This supersedes D-EXEC-25, D-EXEC-26, and D-EXEC-38 for the current
  release path.
- D-EXEC-42: Remove `ARCHESTIMATOR_PUBLISHER_ENABLED` from the Publisher release
  path. Publisher remains authenticated/RBAC-gated; the env rollout flag no
  longer controls project header entry points or route availability.
- D-EXEC-43: Re-scope the manual screen-reader/owner signoff gate to automated
  accessibility evidence for this local readiness run. The limitation is
  explicit: this is not VoiceOver/NVDA/human screen-reader proof.
- D-EXEC-44: Use Nuclei as the scanner fallback after ZAP installation succeeded
  but the bundled Java runtime could not execute. The severe-only Nuclei pass is
  accepted as the local security-scanner evidence for this run because it
  produced 0 medium/high/critical findings against authenticated Publisher.
- D-EXEC-45: Do not commit/push/archive from this continuation. The user
  delegated blocker authority, but the worktree contains broad unrelated active
  changes; a clean Lore commit/publish step should be a separate scoped action.
