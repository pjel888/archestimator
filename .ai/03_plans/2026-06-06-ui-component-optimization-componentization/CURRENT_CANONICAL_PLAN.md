# Current Canonical Plan

**Canonical name:** ArchEstimator UI Component Library + Storybook
**Updated:** 2026-06-06
**Mode:** Future implementation plan only. No implementation happened in this refinement.

## Canonical Thesis

ArchEstimator needs a formal, Storybook-first product UI library before app-wide UI migration. The library should turn existing shared primitives and workshop/domain patterns into an inspectable component system, adapted through `DESIGN.md`, not copied wholesale from external libraries. The previous tree optimization pack becomes a domain-component sub-plan.

## Canonical MVP

| Phase | Name | Planned output | Stop condition |
|---:|---|---|---|
| 0 | Repo and design-system audit | Re-verify current branch, package scripts, `src/components/ui`, domain UI, tests, graph impact, and `DESIGN.md`. | Evidence recorded before package edits. |
| 1 | Storybook installation/configuration plan | Future install/config of Storybook for Next.js App Router and Tailwind v4 after package approval. | Storybook starts and static build succeeds. |
| 2 | Design tokens/icon system/foundational primitives | Token gallery, icon gallery, typography, Button/IconButton, Field/Input, Badge/Pill, Tooltip, Dialog, Menu, Card/Panel, Empty/Loading/Error states. | P0 stories visible with static fixtures. |
| 3 | Form, overlay, navigation, data-display, layout components | P1 controls, table basics, tabs, sidebar/app shell basics, data display, layout primitives. | P1 stories visible with controls/a11y notes. |
| 4 | ArchEstimator domain components and stories | Project, estimate, component library, share, notification, release modal, and tree stories using static fixtures. | Domain stories render without live provider calls. |
| 5 | Selective microinteractions and motion wrappers | App/workshop-safe motion wrappers and landing-only Aceternity-inspired patterns after dependency/performance gates. | Reduced-motion fallbacks pass review. |
| 6 | Governance docs and future migration readiness | Component acceptance checklist, agent usage rules draft, future migration roadmap. | Philip can review Storybook and approve or reject app migration separately. |

## Explicit Non-Goal

Production app migration is out of scope for this MVP. The MVP ends with an inspectable Storybook UI library. App adoption requires Philip's Storybook approval and a future migration plan.

## Superseded Statements From Old Plan

- "Do not build a broad generic design system" is superseded for this plan. The new target is a product UI library, not generic SaaS filler.
- "Tree optimization/componentization is the whole plan" is superseded. Tree work is a domain-component sub-plan.
- Any single high implementation readiness score from the old plan is superseded by scoped readiness scores in `11_READINESS_SCORECARD.md`.

## Gating Decisions

| Gate | Required decision | Default posture until decided |
|---|---|---|
| Storybook package approval | Philip approves installing Storybook packages and scripts. | Do not install. |
| `@storybook/nextjs-vite` vs `@storybook/nextjs` | Use latest official Storybook Next guidance and repo compatibility. | Prefer `@storybook/nextjs-vite` unless Next 16/Turbopack/custom config evidence says otherwise. |
| Flowbite paid-source handling | Philip decides whether paid Flowbite Pro access can be used and under what license constraints. | Public docs only. No paid content recorded. |
| Motion/Framer dependency | Philip approves any `motion` or `framer-motion` style dependency. | Use CSS-only/reduced-motion-safe ideas; defer heavy effects. |
| Radix/shadcn dependency | Philip approves new Radix packages beyond current `@radix-ui/react-context-menu`. | Reuse existing primitives; plan dependencies only. |
| Visual/a11y QA gate | Storybook review and accessibility checks pass for P0/P1. | Required before app migration. |
| Philip Storybook review gate | Philip approves Storybook result. | App migration blocked. |

## Readiness Table By Scope

| Scope | Score | Status | Evidence |
|---|---:|---|---|
| Docs package readiness | 100/100 | READY_FOR_IMPLEMENTATION_HANDOFF | Required docs, traceability, source crosswalk, config skeletons, fixture contracts, API reference, backlog, owner review packet, and validation matrix are present; no source implementation claimed. |
| Storybook setup readiness | 100/100 | READY_AFTER_PACKAGE_APPROVAL | Official Storybook guidance, package plan, config skeletons, fixture/decorator contracts, and validation steps recorded. |
| Primitive component readiness | 100/100 | READY_FOR_STORYBOOK_MVP | Existing primitives audited; P0/P1 story coverage and API contracts defined. |
| Full component matrix readiness | 100/100 | READY_FOR_PHASED_BUILD | The inventory is expanded into 809 rows and the P0/P1 story manifest into 703 rows across foundations, icons, primitives, domain, motion, blocks, utility, and governance patterns. |
| ArchEstimator domain component readiness | 100/100 | READY_WITH_GRAPH_GATES | Domain evidence, static fixture contracts, story labels, and tree impact gates are documented. |
| Migration readiness | 20/100 | DEFERRED_BY_DESIGN | Migration is intentionally out of scope until Philip approves Storybook. |

Do not quote a single readiness score without scope.

## RALPLAN-DR Summary

**Principles**

1. Storybook first, production migration later.
2. `DESIGN.md` wins over external visual defaults.
3. Static fixtures only; no live provider data in stories.
4. Shared primitives before feature-local controls.
5. High-impact UI surfaces require graph-backed phased adoption.

**Decision drivers**

1. Philip needs an inspectable UI library before app migration.
2. Shared primitive blast radius is high.
3. External libraries are useful only after ArchEstimator adaptation.

**Viable options**

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Storybook-first library, no migration | Lowest production risk; supports review; aligns with prompt. | Requires owner package approval before build. | Chosen. |
| Incrementally migrate app while building library | Faster visible app adoption. | Violates no-migration boundary and increases regression risk. | Rejected. |
| Only refine tree component plan | Smaller. | Misses requested Storybook/UI-library scope. | Rejected. |

## ADR

**Decision:** Plan a Storybook-first ArchEstimator UI Component Library MVP and defer production app migration.

**Drivers:** Inspectability, design-system consistency, high shared UI blast radius, future agent governance, and explicit owner review gate.

**Alternatives considered:** App migration during library build; tree-only componentization; external-library drop-in.

**Why chosen:** The chosen path produces a reviewable component system without changing production behavior and gives future agents a precise library/governance target.

**Consequences:** Storybook/package decisions are required before implementation; existing app UI remains unchanged until later migration; the plan pack is larger but safer.

**Follow-ups:** Package approval, Storybook install/config, P0/P1 stories, Philip Storybook review, then a separate migration plan.
