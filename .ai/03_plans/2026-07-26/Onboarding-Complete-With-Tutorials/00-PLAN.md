# Onboarding Complete With Tutorials Plan

## Task Contract

Deliver a reliable authenticated onboarding journey from first workshop load through `/workshop/getting-started`, guided estimate practice, starter-content recovery, and activation. Preserve user data and concurrent work, keep passive orientation distinct from verified domain completion, and provide realistic fictional Philippine sample projects, estimate sheets, components, and templates.

## Current Evidence

- The focused onboarding baseline is green: 11 Vitest files, 85 tests, one worker.
- GitNexus is stale by 16 commits and is navigation evidence only; current source and focused tests remain authoritative.
- GitNexus reports critical upstream risk for `readStarterReadiness`, `restoreStarterContent`, and `startGuidedPractice`; changes to those symbols require dependency-ordered tests and SQLite evidence.
- `estimate.add_row` is a required guided target with no current DOM owner.
- Cross-route automatic tours lose continuity because automatic launch does not carry a resume query.
- Interactive Joyride handoffs remain focus-trapped inside an `aria-modal` tooltip and can be falsely advanced with Next.
- Starter restore receives the shared-membership revision instead of the starter workspace-state revision.
- Starter readiness treats historical inactive generations as restorable and applies user-scope requirements to viewers.
- Existing starter content is shallow and omits useful Philippine project context, provenance, regional labor references, and multi-row templates.
- Another active plan owns onboarding button-link styling. This plan must not edit `GettingStartedProgress.tsx` until that ownership is released or the files are explicitly sequenced.

## Requirements

### REQ-001 — Correct persisted onboarding state

Starter readiness and restore use the same workspace-state revision, evaluate only the latest claim generation, reconcile archived/deleted resources, and do not require user-scoped starter content from read-only collaborators.

### REQ-002 — Complete and truthful guided tours

All required targets exist, route changes retain the active flow, guided task progress is confirmed by domain events or persisted readback, and passive tour viewing is never reported as task completion.

### REQ-003 — Accessible interactive handoff

Keyboard, pointer, mobile, zoom, and reduced-motion users can leave the tour surface, focus and operate the real target, and return or resume without focus loss or modal misrepresentation.

### REQ-004 — Realistic Philippine starter workspace

New starter installations receive three fictional Philippine projects with useful estimate sheets, reusable assemblies, multi-row templates, Philippine peso pricing, region/as-of provenance, and explicit illustrative-data labels. Existing starter or user-created data is never overwritten or duplicated implicitly.

### REQ-005 — Q2 verification and recoverability

Fresh machine-readable focused, SQLite, type/lint/build, mutation, browser, accessibility, and independent-review evidence proves the critical onboarding journeys and recovery states.

## Decisions

### DEC-AUTO-001 — Domain truth, not tour navigation

Joyride step callbacks may record that help was viewed, but checklist and activation completion come only from persisted product state or explicit domain events.

Interactive completion mapping is closed as follows: `estimate.add_area` waits for the user-domain `first_area_created` milestone; `estimate.add_row` waits for `first_row_priced` on the intended estimate after the row exists and has a valid price; `estimate.price_input` waits for `first_valid_total` on that estimate. A pre-existing milestone may make the step ineligible before launch, but it may not complete a currently displayed step through Next, close, or route change.

### DEC-AUTO-002 — Nonmodal handoff

Interactive steps pause and dismiss the blocking tour layer, focus the product target, and resume after the product action or an explicit return. Do not disable focus trapping while retaining `aria-modal` semantics.

The handoff state machine is `TOOLTIP -> HANDOFF_PENDING -> TARGET_FOCUSED -> DOMAIN_CONFIRMED -> RESUMED`. “Try it” enters handoff and removes the modal/overlay before focus moves. Normal keyboard activation operates the real target. Persisted readback or the matching sanitized domain event advances. Escape or an explicit Return action resumes without completion. Next and Finish are not rendered during handoff steps, and close never confirms the domain predicate.

### DEC-AUTO-003 — Stable route continuity

Every active flow navigation carries its flow key and resume mode, including automatically launched flows. Query consumption remains idempotent.

### DEC-AUTO-004 — Versioned, non-destructive starter expansion

The richer pack is a new manifest version with stable asset keys and explicit install/adoption behavior. New eligible workspaces receive the current version. Existing version-one claims and edited resources remain untouched; upgrades seed only absent version-two assets and never mutate claimed resources in place.

`beta_starter_pack_states.revision` is the sole workspace CAS token. Readiness exposes it as `workspaceRevision`; restore accepts that exact token and atomically compares it in the same transaction that writes claims/state. Shared-membership revision is never accepted as a restore token. A membership-only interleave does not stale restore; a workspace-state interleave returns a typed stale-CAS result and performs no writes.

### DEC-AUTO-005 — Philippine sample truth labels

All brands, clients, and sites are fictional. Rates are demo-illustrative, PHP-denominated, region/as-of annotated, and not quotations. Prices are ex-VAT unless a sample explicitly models a selected 12% tax treatment. Minimum wage references are floors, not skilled all-in labor rates.

### DEC-AUTO-006 — Activation-first information architecture

Orientation is at most three passive steps. The activation session shows one recommended path and no more than two primary choices. The first guided practice sequence is capped at seven steps; reuse, transfer, and recovery remain follow-on help.

## Starter Dataset

- **Casa Amihan** — fictional 160 m² two-storey Rizal residence with preliminaries, earthwork, reinforced concrete, masonry, roofing, finishes, MEP allowances, safety, and contingency.
- **Habi Studio** — fictional 82 m² Quezon City commercial fit-out with demolition, partitions, ceilings, finishes, joinery, electrical, lighting, HVAC coordination, fire-safety allowance, and preliminaries.
- **Silaw Learning Pavilion** — fictional 216 m² Cebu learning pavilion with sitework, concrete, structural framing, roofing, accessible circulation, finishes, electrical, plumbing, safety, and contingency.
- Reusable components use fictional brands such as Boyson, SikatSteel, AgilaPipe, KislapWire, and LuntianTile.
- Templates contain multiple groups and rows and are useful as starting structures, not decorative one-row placeholders.

Reference context comes from official DPWH bill-of-quantities patterns, BIR VAT instructions, NWPC regional wage sources, PSA construction price indices and permit statistics, DOLE construction safety guidance, and the National Building Code. Source links belong in seed metadata or documentation, never as claims that illustrative rates are official quotations.

## Units

## Ownership And Handoffs

- UNIT-001 owns `tests/vitest/onboarding-flow-actions.test.ts`, `tests/vitest/starter-pack-actions.test.ts`, `tests/vitest/onboarding-tour-client.test.tsx`, `tests/vitest/onboarding-route-coordinator.test.ts`, and a new target-ownership test. The lead is the only writer.
- UNIT-002 owns `src/lib/onboarding/flow-actions.ts`, `src/lib/onboarding/starter-pack-actions.ts`, and its UNIT-001 tests. The lead is the only writer.
- UNIT-003 owns `src/components/onboarding/OnboardingTourClient.tsx`, `src/components/onboarding/OnboardingTooltip.tsx`, `src/components/onboarding/onboarding-route-coordinator.ts`, `src/lib/onboarding/flow-catalog.ts`, `src/components/workshop/estimate-sheet/rows/drop-zones.tsx`, and its UNIT-001 tests. After UNIT-003 behavior tests pass, the lead records a handoff releasing `flow-catalog.ts` to UNIT-005 for copy-only changes.
- UNIT-004 owns `src/lib/onboarding/starter-pack.ts`, any new starter-data module, installer-focused tests, and optional seed media. The lead is the only writer.
- UNIT-005 is `BLOCKED` and may own `src/components/onboarding/GettingStartedProgress.tsx` only after `git status` plus direct coordination records that the Button Architecture plan has released the file and its in-flight diff has been integrated. It may accept the copy-only `flow-catalog.ts` handoff only after UNIT-003 passes. Until both named release signals exist, UNIT-005 files are read-only.
- Shared tests are written in their first owning unit and only extended by the lead after rereading the current file. No subagent writes production source.

### UNIT-001 — Characterize state and recovery defects

Owned paths: focused onboarding repository/action tests and only directly required fixtures.

Implementation: add failing tests for workspace revision identity, latest-generation lifecycle, viewer readiness, archived/deleted resource recovery, route continuity, missing target ownership, and domain-action completion.

Evidence: deterministic red tests that fail for the identified defects and pass only after the fixes.

Recovery: tests contain no external side effects.

### UNIT-002 — Repair persisted lifecycle and recovery

Depends on UNIT-001.

Owned paths: `src/lib/onboarding/flow-actions.ts`, `src/lib/onboarding/starter-pack-actions.ts`, and focused tests. Avoid `GettingStartedProgress.tsx` while the button plan owns it.

Implementation: align CAS revision fields, inspect latest asset generations only, reconcile resource lifecycle safely, exempt viewer/read-only roles from user-scope starter requirements, and expose precise recovery outcomes.

Evidence: focused Vitest plus temporary SQLite integration tests covering install, archive/delete, restore, edited-resource preservation, stale-CAS rejection, and role matrices.

Recovery: fix forward within local D1 logic; no destructive SQL or production mutation.

### UNIT-003 — Repair tour continuity and interaction

Depends on UNIT-001.

Owned paths: onboarding flow catalog/client/boundary, target-owning components, and focused tests.

Implementation: add the missing add-row target, persist flow resume across every route transition, populate safe route/viewport telemetry fields, split passive viewed state from domain-confirmed progress, and implement nonmodal target handoff with deterministic focus restoration.

Evidence: component tests plus Playwright keyboard, pointer, mobile, reduced-motion, 200% zoom, pause/resume, and route-transition journeys.

Recovery: revert the isolated client behavior while retaining characterization tests.

### UNIT-004 — Install Philippine starter version

Depends on UNIT-002.

Owned paths: starter manifest/data, installer mapping, starter-pack tests, and optional public-owned seed assets.

Implementation: add versioned fictional project graphs, components, and templates; persist client/location/provenance metadata; protect edited and legacy claims; expose an explicit upgrade path for existing workspaces.

Evidence: manifest invariants, exact cardinality tests, PHP math checks, provenance/fiction labels, idempotent install, no-overwrite upgrade, and SQLite resource graph assertions.

Recovery: new version-two rows can be deactivated by local fix-forward logic without changing version-one or user-authored resources.

### UNIT-005 — Simplify activation journey

Depends on UNIT-003 and UNIT-004.

Owned paths: getting-started presentation only after concurrent button-plan ownership is released, flow catalog copy, and focused UI tests.

Implementation: present one recommended activation action and at most two primary choices, reduce passive orientation, cap the initial practice flow, use “Viewed” versus “Completed” accurately, and keep role-specific reader guidance.

Evidence: content/behavior tests and authenticated desktop/mobile browser screenshots.

Recovery: UI-only fix forward; persisted domain completion remains authoritative.

### UNIT-006 — Q2 verification and review

Depends on UNIT-002, UNIT-003, UNIT-004, and UNIT-005.

Implementation: run the focused suite first, then typecheck/lint/build, changed-code coverage and critical mutation, authenticated browser journeys, accessibility checks, source/graph change detection, and independent architecture/security/quality reviews.

Evidence commands include:

```powershell
bunx vitest run tests/vitest/onboarding-tour-client.test.tsx tests/vitest/onboarding-client-boundary.test.tsx tests/vitest/onboarding-route-coordinator.test.ts tests/vitest/onboarding-target-resolver.test.ts tests/vitest/onboarding-flow-actions.test.ts tests/vitest/onboarding-flow-repository.test.ts tests/vitest/starter-workspace-pack.test.ts tests/vitest/starter-pack-actions.test.ts tests/vitest/guided-estimate-sample.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/onboarding-focused.json
bunx vitest run tests/vitest/starter-pack-actions.test.ts tests/vitest/guided-estimate-sample.test.ts tests/vitest/beta-onboarding-flow-migration.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/onboarding-sqlite.json
bun run type-check
bun run lint
bun run build
bun run quality:diff-coverage
bun run test:mutation:critical
bun run quality:critical
bunx playwright test e2e/onboarding-settings.spec.ts e2e/onboarding-first-value.spec.ts --workers=1 --reporter=json > artifacts/quality/onboarding-playwright.json
bunx playwright test e2e/onboarding-first-value.spec.ts --grep "@a11y" --workers=1 --reporter=json > artifacts/quality/onboarding-a11y.json
bun run graph:reindex
```

Focused/SQLite JSON receipts live at `artifacts/quality/onboarding-focused.json` and `artifacts/quality/onboarding-sqlite.json`; browser and accessibility JSON live at `artifacts/quality/onboarding-playwright.json` and `artifacts/quality/onboarding-a11y.json`; the Q2 runner owns its canonical receipts under `artifacts/quality/`. Architecture, security, and quality reviewers each write a separate verdict under this pack's `evidence/reviews/` folder. Every required evidence class and review must report PASS with zero skipped, flaky, malformed, or weakened critical checks.

Run GitNexus reindex as one isolated heavy command after source edits and before `detect_changes`. Verify its indexed source fingerprint against the current worktree. If reindex materially fails, current-source caller enumeration plus focused tests are degraded navigation evidence, but GitNexus output is not claimed fresh and the Q2 gate remains QUALITY_BLOCKED until the required `detect_changes` contract can run.

After the reindex, run `mcp__gitnexus__detect_changes({repo:"archestimator",scope:"all",worktree:"C:\\Users\\phili\\OneDrive\\Documents\\archestimator"})` and record its machine-readable result at `evidence/gitnexus-detect-changes.json`. PASS requires only expected onboarding, estimate-target, and starter-install symbols/flows with no unexplained high-risk path.

## Acceptance Criteria

### AC-001

Starter readiness, install, restore, and recovery use consistent revisions and latest-generation truth across owner, member, viewer, archived, deleted, stale-CAS, and edited-resource states.

### AC-002

Every flow can launch, navigate, pause, resume, dismiss, recover, and finish without a dead required target or losing automatic-tour continuity.

### AC-003

Interactive handoff is operable with keyboard and pointer at desktop and mobile sizes, 200% zoom, and reduced motion; domain actions, not Next clicks, satisfy guided tasks.

### AC-004

The current starter version installs three useful fictional Philippine project estimates, reusable components, and multi-row templates with valid math and provenance, while preserving every legacy or user-edited resource.

### AC-005

The first-value journey is role-appropriate, presents no more than two primary choices, and reports passive viewing separately from confirmed completion.

### AC-006

Fresh Q2 automation, browser evidence, independent reviews, and `detect_changes` report no unresolved critical issue and only the expected onboarding/data flows.

## Risks

### RISK-001 — Persisted data corruption

Mitigate with versioned keys, CAS, no in-place overwrite, temporary SQLite fixtures, and edited-resource assertions.

### RISK-002 — Focus or accessibility regression

Mitigate with explicit modal/nonmodal semantics, focus assertions, keyboard journeys, 200% zoom, reduced motion, and mobile browser checks.

### RISK-003 — False completion

Mitigate by separating viewed telemetry from domain-confirmed progress and testing that Next or close cannot satisfy activation.

### RISK-004 — Shared-file collision

Mitigate with one writer per file and sequence `GettingStartedProgress.tsx` after the active button plan releases it.

### RISK-005 — Stale graph evidence

Mitigate by confirming current callers in source and focused tests; do not treat the stale GitNexus index as implementation truth.

## Stop Condition

Stop only when every requirement maps to fresh Q2 evidence, all three Philippine starter projects are installed and recoverable without overwriting user data, the full authenticated activation journey passes browser and accessibility checks, independent reviewers report no unresolved critical finding, and GitNexus `detect_changes` shows only expected symbols and flows. No deployment or hosted-state claim is required.
