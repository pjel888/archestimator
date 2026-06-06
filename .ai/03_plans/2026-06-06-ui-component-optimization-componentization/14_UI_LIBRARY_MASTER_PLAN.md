# UI Library Master Plan

## Purpose

Create an ArchEstimator-specific UI Component Library that future agents can inspect, reuse, test, and govern before changing production app screens.

## Product Definition

This is a product UI library, not a generic SaaS template kit. The components should encode:

- ArchEstimator app/workshop density.
- Estimating and proposal workflows.
- Shared tree and table patterns.
- Provider-free story fixtures.
- Accessibility and keyboard behavior.
- Migration guardrails for future agents.

## Library Layers

| Layer | Purpose | Example outputs |
|---|---|---|
| Foundations | Visual constants and usage rules. | color, radius, spacing, typography, shadows, z-index, focus. |
| Assets | Icon and media policy. | Phosphor gallery, asset placeholders, image rules. |
| Primitives | Low-level reusable controls. | Button, IconButton, Input, Badge, Tooltip, Modal. |
| Compositions | Multi-control product patterns. | Toolbar, filter row, field group, panel header, tabs. |
| Data display | Dense product data surfaces. | Table, row, cell, empty state, status strips. |
| Domain components | ArchEstimator-specific patterns. | Estimate tree row, component library card, share review panel. |
| Blocks | Larger inspectable sections. | Workshop shell block, estimate editor frame, proposal review frame. |
| Governance | Agent and human usage rules. | checklist, usage rules draft, migration matrix. |

## MVP Definition

MVP completes when:

1. Storybook runs locally.
2. Storybook static build succeeds.
3. Foundations and P0 primitives are visible.
4. P1 components and domain stories have representative static fixtures.
5. No production app migration is included.
6. Philip can inspect and approve or reject the library.

## Component Priority

| Priority | Meaning |
|---|---|
| P0 | Required for first Storybook MVP. |
| P1 | Required before serious app migration planning. |
| P2 | Useful after P0/P1 are stable. |
| P3 | Future enhancement or edge-case pattern. |
| DEFERRED | Not in MVP. |
| LANDING_ONLY | Allowed only outside app/workshop density. |

## Definition Of Done

A component is done when:

- It has a local API contract.
- It has Storybook stories for required states.
- It follows `DESIGN.md`.
- It has accessibility notes.
- It uses static fixtures only.
- It has tests if behavior is nontrivial or shared.
- It has migration status.
- It has rollback notes for future app adoption.
