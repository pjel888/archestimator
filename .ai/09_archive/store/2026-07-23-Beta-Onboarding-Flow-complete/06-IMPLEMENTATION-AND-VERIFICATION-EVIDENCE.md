# Beta Onboarding Implementation And Verification Evidence

## Result

- **Implementation result:** complete for the local repository scope.
- **Source revision inspected:** `31943957c42f090c09bca383501358ee2391df11`.
- **Execution scope:** `IMPLEMENT_LOCAL`.
- **Release scope:** not evaluated.
- **Product-test decision:** `TEST_PROPOSAL`; no automated product tests,
  build-as-test gate, browser automation, screenshots, Storybook, visual QA,
  local/remote D1 migration apply, deployment, or provider mutation was run.
- **Stop condition:** every core requirement and acceptance criterion is mapped
  to current source plus fresh authorized static evidence, with the remaining
  runtime and external proof boundaries recorded below.

## Implemented Surface

- Exact `react-joyride` `3.2.0` dependency and an authenticated-only,
  eligibility-gated dynamic client boundary.
- Versioned flow, step, target, route, audience, capability, launch, recovery,
  and persistence contracts.
- Optional first-run orientation, domain-driven Getting started checklist,
  guided Estimate Sheet practice, Library reuse learning, manager-only Client
  links learning, Settings replay/restart/reset, and support handoff.
- Fix-forward D1 onboarding, starter-claim, activation-origin, event, retention,
  and support-context schema.
- Exact starter workspace manifest, per-user grouping, idempotent/resumable
  installation, inactive-key restore, access-loss cleanup, privacy export/erase,
  legal-hold evidence retention, and account-deletion ordering.
- Server-derived authorization, exact active-run continuation binding,
  optimistic state revision, domain-proof completion, semantic idempotency, and
  privacy-safe event payloads.
- Short-lived HMAC Client links receipt bound to the current user, workspace,
  project, publication revision, active run, flow version, and state revision.
- Modal lifecycle coordination, reduced-motion handling, target recovery,
  mobile navigation targets, and focus-owner handoff.

## Acceptance Audit

| Criterion | Status | Current implementation evidence | Remaining limitation |
| --- | --- | --- | --- |
| `AC-001` | PASS | Current route, overlay, auth, activation, migration, retention, deletion, and publication surfaces were reconciled against the pack; implementation is scoped to the recorded beta-v1 dispositions. | No deployment or remote D1 proof. |
| `AC-002` | PASS | `flow-catalog.ts`, `flow-eligibility.ts`, `flow-actions.ts`, `AuthenticatedOnboardingHost.tsx`, and `OnboardingClientBoundary.tsx` implement optional first-session selection by audience, capability, route, data, and viewport. | Browser lifecycle matrix remains `TEST-003`/`TEST-005`. |
| `AC-003` | PASS | `first-estimate-checklist.ts`, activation producers/repository/outbox, `estimate-practice.ts`, and Estimate/Project actions derive progress from authoritative user-domain facts and qualifying successful mutations; seed/view/open events do not earn credit. | D1 and UI behavior execution remains `TEST-001`/`TEST-002`. |
| `AC-004` | PASS | Typed catalog predicates, server-derived capabilities/routes, rendering-owned semantic targets, and route-local learning rails exclude unavailable or unauthorized steps. | Responsive and negative-permission execution remains `TEST-003`/`TEST-005`. |
| `AC-005` | PASS | `OnboardingTourClient.tsx`, modal lifecycle helpers, custom tooltip/portal/recovery, Settings controls, reduced-motion state, and mobile navigation implement pause, resume, dismiss, replay, restart, reset, and single-focus ownership. | Keyboard, zoom, reflow, and focus restoration remain `TEST-003`/`TEST-005`/`TEST-009`. |
| `AC-006` | PASS | `flow-repository.ts` enforces idempotency fingerprints, exact active `runId`, allowed successor steps, optimistic revisions, final-step completion, atomic reset, and domain-only completion. | Race and retry execution remains `TEST-001`. |
| `AC-007` | PASS | `0101_beta_onboarding_flow_state.sql`, retention/privacy/account-deletion integration, row-count preflight assertions, activation-origin rebuild, legal-hold evidence handling, starter cleanup, and purge ordering implement the lifecycle contract. | Clean temporary D1 migration apply remains `TEST-001`; remote apply was not run. |
| `AC-008` | PASS | `flow-actions.ts` re-derives actor scope, eligibility, capabilities, routes, and launch authorization server-side; repositories assert tenant/resource chains; support context is allowlisted; instructional persistence excludes raw URLs, tokens, selectors, and tenant content. | Negative authorization/serialization execution remains `TEST-004`/`TEST-007`/`TEST-009`. |
| `AC-009` | PASS | `WorkshopShell.tsx` mounts `AuthenticatedOnboardingHost` only inside authenticated Workshop chrome; the host returns null for no eligible flow; `OnboardingClientBoundary.tsx` dynamically imports the Joyride module with `ssr: false`; no public app route imports the host or Joyride; the Client links runtime event was extracted so publisher code does not statically import the Joyride module. | Emitted-chunk and measured bundle proof remains `TEST-005`/`TEST-006`; no build ran. |
| `AC-010` | PASS | Exact Joyride v3.2.0 dependency, `useJoyride`, uncontrolled state, semantic resume, typed event handling, dynamic client boundary, route recovery, and no `stepIndex`, `callback`, or `getHelpers` usage match the implementation contract. | Executed controller/bundle behavior remains `TEST-003`/`TEST-006`. |
| `AC-011` | PASS | Auth redirects, login/callback/setup/terms actions, and `request-proxy.ts` preserve sanitized protected return intent while rejecting unsafe or looping destinations and re-running destination authorization. | End-to-end return-chain execution remains `TEST-007`. |
| `AC-012` | PASS | `EstimateSheetLearningRail.tsx`, the guided-practice flow, row/column targets, user-origin price/save and add/source receipts, read-only variant, recovery lesson, Library reuse, and non-starter transfer implement the closed curriculum. | User comprehension and transfer execution remains `TEST-005`/`TEST-008`. |
| `AC-013` | PASS | `starter-pack.ts` fixes the 3 Project / 4 Estimate Sheet / 6 Component / 3 Template manifest; `starter-pack-actions.ts` implements exact eligibility, claims, per-user membership reconciliation, bounded resume, inactive-key restore, guarded completion, cleanup, and origin separation. | D1 concurrency/cardinality execution remains `TEST-001`/`TEST-002`/`TEST-008`. |
| `AC-014` | PASS | The manager-only Client links rail uses normal create/republish actions, authoritative readback, a five-minute constant-time-verified HMAC receipt, exact publication/run/revision binding, replay/replacement rejection, and domain-only atomic completion; no public `/share` route mounts Joyride or persists publication secrets. | Clipboard/preview/mobile/negative authorization execution remains `TEST-001`/`TEST-003`/`TEST-005`/`TEST-007`/`TEST-009`. |

## Fresh Authorized Evidence

### Static and type evidence

- `bunx eslint` over every modified or untracked TypeScript/TSX file: exit `0`,
  zero errors, 20 warnings. The warnings are non-blocking existing hook,
  incompatible-library, unused-symbol, and Storybook image warnings.
- Focused ESLint after extracting the runtime-event contract from the Joyride
  module: exit `0`.
- `bun run type-check`: the onboarding implementation itself reports no
  diagnostics, but the repository command exits non-zero on eight pre-existing
  `TS18047` errors in untouched `src/lib/admin/user-actions.ts` at lines 157,
  176, 186-188, 199, 209, and 221. That file is absent from `git status`.
- `git diff --check`: clean for tracked changes.
- Per-file `git diff --no-index --check /dev/null <untracked-file>` sweep:
  clean for every untracked file.

### Import, route, privacy, and schema evidence

- The Joyride scan finds runtime imports only in
  `src/components/onboarding/OnboardingTourClient.tsx` and a type-only tooltip
  import; the only other `OnboardingTourClient` reference is the dynamic import
  inside `OnboardingClientBoundary.tsx`.
- No public app route imports `react-joyride`, `OnboardingTourClient`, or
  `AuthenticatedOnboardingHost`.
- The persistence scan finds no `rawUrl`, `raw_url`, `shareToken`,
  `share_token`, `publicUrl`, `public_url`, `publicationToken`, or
  `publication_token` field in onboarding source or the two migrations.
- Migration/source inspection confirms activation `origin_class`, onboarding
  state/event tables, exact `run_id` and `state_revision`, starter state/claim
  uniqueness, row-count assertions, indexes, support-context allowlists, and
  migration ordering after `0100_user_support_system.sql`.

## Explicitly Unrun Test Proposals

`TEST-001` through `TEST-009` remain unrun because the current task did not
authorize product testing. Their exact proposed files, assertions, and commands
remain in `03-ARCHITECTURE-DATA-AND-VERIFICATION.md`. This includes D1
migration/concurrency, activation/checklist, starter/practice/transfer, Client
links, Joyride controller, privacy/deletion, browser accessibility, bundle
inspection, and auth return-intent tests.

These unrun proposals limit runtime, browser, emitted-bundle, concurrency,
local-D1, hosted, and release claims. They do not leave a safe repository
implementation unit unfinished.

## Final Review

- Read-only acceptance and data-integrity passes inspected current source and
  identified no remaining core acceptance gap after their findings were
  repaired.
- The lead re-reviewed the final source/import boundary, reran invalidated
  static evidence, reconciled all fourteen acceptance criteria, and confirmed
  no active unit, ownership claim, or repository cleanup remains.
