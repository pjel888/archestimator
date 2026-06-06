# Requirements And Acceptance Criteria

**Status:** READY_FOR_IMPLEMENTATION_HANDOFF
**Scope:** Future Storybook UI library MVP. Current pass is docs-only.

## Requirement Priority Legend

- MUST: required for MVP readiness.
- SHOULD: required unless implementation evidence proves a safer smaller slice.
- COULD: optional after P0/P1 completion.
- OUT_OF_SCOPE: explicitly deferred.

## Functional Requirements

| Priority | Requirement | Acceptance criterion |
|---|---|---|
| MUST | Future implementation installs and configures Storybook. | `bun run storybook` starts and `bun run build-storybook` builds after scripts exist. |
| MUST | Future implementation creates Storybook stories for all P0 and P1 components in `15_COMPONENT_INVENTORY_MATRIX.md`. | Storybook sidebar exposes every P0/P1 component category with stories and docs, matching the 703-row story manifest in `17_STORYBOOK_STORY_COVERAGE_MATRIX.md`. |
| MUST | Components follow `DESIGN.md`. | `bun run lint:design-system` passes and stories visually use SF Pro, 3px radius, neutral tokens, and Phosphor app icons. |
| MUST | Stories use local fixtures/mocks and never live Supabase/provider data. | Story files import static fixtures/builders only; no Supabase clients, server actions, provider env reads, or network calls. |
| MUST | Components expose typed, stable APIs. | Every exported component has TypeScript props, documented variants/states, and stable import path. |
| MUST | Existing source components are audited before new components are created. | Implementation notes cite current `src/components/ui`, `src/components/workshop`, `src/components/share`, and relevant tests. |
| MUST | Current app migration is not part of the MVP. | No production route/screen imports are changed for migration purposes. |
| SHOULD | New app/workshop UI should use library components after the library is approved. | Future agent usage rules point to the library after Philip signs off. |
| COULD | P2/P3 stories may be added after P0/P1 are stable. | Extra stories do not delay P0/P1 review. |

## Implementation-Grade Requirement Matrix

| ID | Requirement | Primary docs | Verification | Status for this handoff |
|---|---|---|---|---|
| RQ-001 | Establish Storybook as the MVP inspection surface before production migration. | `CURRENT_CANONICAL_PLAN.md`, `16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md`, `37_PHILIP_STORYBOOK_REVIEW_PACKET.md` | Future `bun run storybook` and Philip review packet. | READY |
| RQ-002 | Cover all prompt-required foundations, primitives, domain components, motion patterns, blocks, utilities, and governance artifacts. | `15_COMPONENT_INVENTORY_MATRIX.md`, `17_STORYBOOK_STORY_COVERAGE_MATRIX.md` | Inventory row count and story manifest coverage audit. | READY |
| RQ-003 | Keep shadcn, Flowbite, Aceternity, Storybook, and Tailwind v4 adoption decisions source-specific and gated. | `21_EXTERNAL_SOURCE_ADOPTION_PLAN_SHADCN_FLOWBITE_ACETERNITY.md`, `32_SOURCE_ADOPTION_CROSSWALK.md`, `29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md` | Owner package/license decisions before dependency or paid-source use. | READY |
| RQ-004 | Define future Storybook config without mutating the repo during this docs pass. | `33_STORYBOOK_CONFIG_SKELETONS.md` | Future `.storybook/*` files match skeleton intent after approval. | READY |
| RQ-005 | Use deterministic fixtures and decorators, with no live provider/env access. | `34_FIXTURE_AND_DECORATOR_CONTRACTS.md`, `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Story dependency scan plus local Storybook with provider env unset. | READY |
| RQ-006 | Provide typed component APIs before implementation starts. | `20_COMPONENT_API_AND_COMPOSITION_CONTRACTS.md`, `35_COMPONENT_API_REFERENCE_MATRIX.md` | Future TypeScript compile and Storybook controls/docs. | READY |
| RQ-007 | Sequence work into small, reversible P0/P1 slices. | `04_IMPLEMENTATION_SEQUENCE.md`, `36_P0_P1_IMPLEMENTATION_BACKLOG.md` | Future commit slicing and validation per slice. | READY |
| RQ-008 | Validate app/workshop design rules with the existing lint surface. | `18_DESIGN_TOKEN_AND_THEMING_PLAN.md`, `06_TESTING_AND_VERIFICATION_PLAN.md`, `38_VALIDATION_COMMAND_MATRIX.md` | `bun run lint:design-system`; `bun run validate`. | READY |
| RQ-009 | Keep production app migration out of scope. | `24_NO_MIGRATION_STORYBOOK_ONLY_MVP_SCOPE.md`, `25_FUTURE_APP_MIGRATION_ROADMAP_DEFERRED.md` | No production route/screen migration diff; migration score remains low. | READY |
| RQ-010 | Make the future owner review actionable. | `23_VISUAL_QA_AND_REVIEW_WORKFLOW.md`, `37_PHILIP_STORYBOOK_REVIEW_PACKET.md` | Review labels, pass/fail states, and feedback loop exist. | READY |

## Non-Functional Requirements

| Priority | Requirement | Acceptance criterion |
|---|---|---|
| MUST | Storybook must run locally without provider credentials. | Unset Supabase/provider envs do not break Storybook stories. |
| MUST | Build output must be local/dev documentation unless publishing is approved. | `storybook-static` is ignored or treated as generated artifact. |
| MUST | Dependency additions are approval-gated. | Package plan is accepted before editing `package.json` or lockfile. |
| MUST | P0/P1 stories must be deterministic. | Stories rely on static fixture data and stable viewport/content examples. |
| SHOULD | Storybook should support controls/docs/autodocs where useful. | Args and argTypes exist for variant-heavy components. |

## UI/UX Requirements

- MUST: Non-landing app/workshop UI follows `DESIGN.md`.
- MUST: App/workshop visible text stays at or below 12px unless explicitly approved.
- MUST: Normal controls/body/table/input/button text stays around 10px.
- MUST: Labels/meta/helper text stays around 8-9px.
- MUST: Letter spacing is zero.
- MUST: Radius is 3px / `rounded-xs`.
- MUST: Phosphor regular outline icon style is the app/workshop standard.
- MUST: Landing/marketing-only Aceternity-style effects are clearly marked and do not leak into workshop UI.

## Accessibility Requirements

Every interactive component MUST define:

- keyboard behavior;
- focus-visible behavior;
- disabled semantics;
- ARIA label/name expectations;
- error announcement behavior where relevant;
- reduced-motion behavior if animated;
- Storybook story or play-function candidate for keyboard/focus behavior.

## Performance Requirements

- MUST: Storybook stories avoid live data fetching and large provider payloads.
- MUST: Motion effects have reduced-motion fallbacks and dependency approval.
- MUST: Heavy virtualized tables/trees are deferred until measured and approved.
- SHOULD: Future Storybook build should not materially slow the default app build unless intentionally included in validation.

## Security And Privacy Requirements

- MUST: No secrets, API keys, tokens, raw provider payloads, raw customer data, private Flowbite content, or paid screenshots in docs/stories.
- MUST: Supabase project references remain ArchEstimator-only (`ebxxqidacheyapmmzavr`) and local/provider proof stays separated.
- MUST: Storybook stories do not call live Supabase, Vercel, Resend, or auth providers.

## Storybook Requirements

- MUST: Configure for Next.js App Router and Tailwind v4.
- MUST: Import global CSS in Storybook preview after package approval.
- MUST: Provide decorators/mocks for router/navigation, auth/session, QueryClient, and any UI stores needed by stories.
- MUST: Organize stories by Foundations, Icons, Primitives, Forms, Menus, Overlays, Navigation, Data Display, Layout, Feedback, Domain / Workshop, Domain / Share, Motion, and Blocks / Landing.
- SHOULD: Use controls, docs, a11y addon, and interaction testing where approved.

## Component Governance Requirements

- MUST: Future reusable components update `15_COMPONENT_INVENTORY_MATRIX.md`.
- MUST: New reusable components add or update Storybook stories.
- MUST: Feature-local one-off buttons, search inputs, cards, menus, form fields, chips, and panels are defects when a library component exists.
- MUST: Production app migration remains future-only until Philip approves Storybook.

## External Source Adoption Requirements

- MUST: shadcn/ui informs accessible APIs, registry/MCP, and local copy-in primitives.
- MUST: Flowbite informs breadth, tables/forms/sidebar/dashboard/block coverage, and paid-source handling rules.
- MUST: Aceternity informs selective microinteractions and landing/proposal motion only after dependency/performance gates.
- MUST: Tailwind v4 remains the styling substrate and must follow ArchEstimator token constraints.

## Assumptions

- The current stack remains Next.js 16.2.6, React 19.2.6, Bun, TypeScript, Tailwind v4, and Phosphor icons.
- Storybook 10.x official Next.js guidance remains compatible with Next >=14.1; future implementation must re-check before package edits.
- Philip will review Storybook before approving production migration.
- The current docs handoff is complete without package approval because package approval is an implementation gate, not a planning blocker.

## Explicit Non-Goals

- OUT_OF_SCOPE: production app screen migration.
- OUT_OF_SCOPE: Supabase/schema/provider changes.
- OUT_OF_SCOPE: Storybook publishing or Chromatic service.
- OUT_OF_SCOPE: broad dark mode.
- OUT_OF_SCOPE: replacing React Complex Tree.
- OUT_OF_SCOPE: virtualized trees/tables before measurement.
