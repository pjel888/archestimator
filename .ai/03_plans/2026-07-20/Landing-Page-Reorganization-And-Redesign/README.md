# Landing Page Reorganization and Redesign

Implementation-ready plan pack for a from-scratch redesign of `/new`.

## Canonical Entry

Start with [`00-PLAN.md`](./00-PLAN.md), then execute the ready units in numerical order. The plan is local-only and does not authorize deployment, promotion to `/`, or paid/external services.

## Design Authority

- **Primary reference:** the live 2026-07-20 [Attio homepage](https://attio.com/) for page order, 24-column geometry, type hierarchy, product-stage proportions, sticky workflow mechanics, and restrained motion.
- **Secondary references only:** [Comand AI](https://www.comand.ai/) for technical precision and [Intercom](https://www.intercom.com/) for responsive disclosure and commercial closure.
- **Archestimator truth:** [`CONTEXT/README.md`](./CONTEXT/README.md) defines precedence and [`CONTEXT/claim-reconciliation.md`](./CONTEXT/claim-reconciliation.md) resolves every material directive/product claim to exact current source. Product facts, approved messaging, claim boundaries, the canonical logo/wordmark, and Signal orange remain Archestimator-owned.

## Non-Negotiable Reset

The current `/new` implementation is not a source. Do not import, copy, adapt, or preserve `src/components/landing-new/**`, `PublicPageShell`, `buildLandingMetadata`, current route copy, information architecture, CSS, GSAP/Three scene, motion state, or assets. The only approved existing implementation carryovers are the canonical logo/wordmark exports and Signal tokens. Build the replacement beside the live route; verify the fresh import while rollback files still exist, then delete the old tree.

## Pack Map

- [`architecture/section-system.md`](./architecture/section-system.md): exact 18-band one-to-one Attio mapping, type, grid, motion, responsive, accessibility, and product-proof contract.
- [`references/reference-grammar-synthesis.md`](./references/reference-grammar-synthesis.md): reference hierarchy and what must or must not transfer.
- [`evidence/reference-studies/`](./evidence/reference-studies/): current-run source studies and Attio captures.
- [`units/`](./units/): seven bounded implementation units.
- [`plan-pack.json`](./plan-pack.json): machine-readable traceability, status, risks, evidence, and DAG.

## Validation State

This task is plan-only. Product tests, builds, browser QA, and visual QA were not run against an implementation because no redesigned page exists yet. The pack itself must pass `bun run validate:plan-pack -- <this-folder>` after every plan edit.
