---
name: archestimator-design
description: "Design or review Archestimator workshop, public, proposal-review, and proposal-document interfaces using current source, shared primitives, compact typography, precise spacing, and restrained Apple-informed product sensibilities. Use for Archestimator-specific UI direction, implementation, critique, or design research; do not use as a generic style generator, copy native Apple chrome, or run browser and visual evidence without an explicit TEST_TASK."
---

# Archestimator Design

Design Archestimator as a precise work instrument: compact, calm, architectural,
and trustworthy. Favor hierarchy, alignment, state clarity, and task continuity
over oversized type, decorative cards, or fashionable SaaS chrome.

## Authority Order

Resolve conflicts in this order:

1. The current user direction and applicable `AGENTS.md` policy.
2. The mounted route entrypoint, active source, imported shared primitives, and
   current worktree diff.
3. `PRODUCT.md` for durable users, product purpose, and accessibility intent.
4. `DESIGN.md` for alpha defaults and named exceptions, not proof of current
   implementation.
5. [`references/design-doctrine.md`](references/design-doctrine.md) for the
   project-specific synthesis.
6. [`claude-design-reference`](../../../claude-design-reference/readme.md) for
   tracked assets and reusable patterns only. Its stack notes and large display
   examples can be stale.
7. Prototypes, alternate routes, historical plans, and screenshots last.

Never infer the active surface from a similarly named directory. Resolve the
mounted route and its real imports first.

## Classify The Surface

Choose one register before proposing or changing UI:

- **Workshop instrument** — authenticated estimating, library, admin, project,
  and operator surfaces. Compact, keyboard-friendly, grid-led, and state-rich.
- **Public editorial** — landing and brand surfaces. More breathing room and
  narrative hierarchy, but no giant-font theater or generic marketing blocks.
- **Interactive proposal review** — responsive client review with navigation,
  discussion, charts, decisions, security, and touch-safe actions.
- **Formal proposal document** — printable or exportable document hierarchy,
  paper surfaces, durable reading order, and restrained document typography.

Do not export one register's type, radii, density, or surface effects into
another without an explicit reason.

## Workflow

1. State the target result, register, constraints, available evidence, and stop
   condition.
2. Inspect `git status --short --branch`, the mounted route, the target source,
   shared components, and relevant semantic tokens. Preserve unfamiliar work.
3. Read only the needed doctrine sections. Use the external research references
   for provenance or unresolved tradeoffs, not as automatic token replacements.
4. Reuse the existing primitive or asset before inventing markup, local chrome,
   a new visual system, or a dependency.
5. Design the complete state matrix: default, hover, focus, active or selected,
   disabled or read-only, loading, empty, error, success, and reduced-motion or
   responsive behavior as applicable.
6. Apply the smallest coherent change at the owning boundary. Fix shared
   geometry through shared primitives rather than field-local transforms.
7. Review against
   [`references/review-rubric.md`](references/review-rubric.md), then verify the
   source, focused diff, links, metadata, and authorized static contracts.

## Selective References

- Read [`references/design-doctrine.md`](references/design-doctrine.md) for any
  product direction, implementation, or critique.
- Read
  [`references/apple-human-interface-research.md`](references/apple-human-interface-research.md)
  when the request invokes Apple sensibilities, desktop productivity, focus,
  motion, or platform-transfer questions.
- Read
  [`references/professional-saas-design-standards.md`](references/professional-saas-design-standards.md)
  when accessibility, data density, forms, tables, responsive behavior, or
  external professional-SaaS conventions materially affect the decision.
- Read [`references/review-rubric.md`](references/review-rubric.md) before a
  design review, audit, or completion claim.

## Workflow Routing

- Use `$archestimator-form-alignment` whenever labels, inputs, helpers, errors,
  paired fields, selects, chevrons, or clear buttons are involved.
- Use `$impeccable` for product-UI critique or refinement after loading the
  Archestimator register; its product pass cannot replace project authority.
- Use `$hallmark` for public or brand anti-slop critique. Hallmark themes never
  override the authenticated product system or the restrained type ceiling.
  Do not generate theme rotations, token files, logs, stamps, previews, or
  mandatory viewport proof unless the current task explicitly asks for them.
- Use `$product-design:research` or `$research` for external evidence. Prefer
  primary sources and separate normative requirements from conventions.
- Use `$product-design:audit` only for a specified current flow with current
  screenshots captured under an authorized `TEST_TASK`. Otherwise describe the
  work accurately as a source or artifact audit.
- Use `$product-design:design-qa` only when both a source visual and a rendered
  implementation of the same state and viewport exist under an authorized
  `TEST_TASK`. Do not manufacture visual parity evidence.
- Use `$product-design` when the user wants the broader Product Design workflow;
  keep this skill as the project-specific authority inside that workflow.

## Boundaries

- Apple-like means purposeful, familiar, consistent, content-first, reversible,
  precisely aligned, and calm. It does not mean copied macOS controls, Apple
  assets, glass everywhere, giant SF-style headings, or platform dimensions.
- The user dislikes large typography. Preserve compact product hierarchy and
  the public display ceiling in the doctrine; do not enlarge type merely to
  imitate generic SaaS or Apple examples.
- Compact visuals do not excuse tiny hit targets, hidden focus, clipped text,
  color-only state, or failure at browser zoom and responsive reflow.
- Default to `NOT_REQUIRED`. Do not create or run product tests, builds, browser
  automation, screenshots, Storybook, or visual QA without an explicit current
  `TEST_TASK`. When testing would materially reduce risk, provide a precise
  `TEST_PROPOSAL` instead.
- Stay on the current branch and worktree. Do not reset, clean, stash, revert,
  commit, push, or overwrite unrelated changes.

## Evidence And Stop

Report the register, changed artifacts, decisive source or static evidence, and
any honest visual-proof gap. Stop when the requested artifact uses the correct
authority and register, reuses the owning primitives, satisfies the review
rubric, and introduces no parallel design authority or duplicated asset set.
