# 02 — Feature Brief and Scope

## Authoritative brief (from `PROMPT.md`)

> Create a product/UX plan pack for the first-user path from beta entry to first project, first estimate, first area/template, and first publishable proposal.
>
> Define activation success criteria, zero states, guided next actions, sample/demo data policy, onboarding milestones, analytics/evidence, tests, and connections to project/estimate/publishing plans.
>
> Do not create a marketing landing page. Keep the first screen/workshop path useful and concrete for actual estimating work.
>
> Stop condition: the pack is complete when an executor can implement a guided first-value path without inventing product decisions mid-build.

## Scope (in)

The plan must design and make implementation-ready:

1. **Beta-entry → first `/workshop` landing** experience for a user whose workspace has zero projects (the empty-workspace state).
2. **Zero/empty states** for every rung of the ladder:
   - Empty projects list (`/workshop/projects`)
   - Empty estimate tab (already shipped — extend, don't rebuild)
   - Empty cost library (`/workshop/library` and `/workshop/library/components`)
   - Empty templates (`/workshop/library/templates`)
   - Empty publisher roster (`/workshop/publisher`) — already has `PublisherEmptyState`; connect to ladder
   - Empty proposals inbox (`/workshop/proposals`) — already has `ProposalsEmptyState`; connect to ladder
3. **Guided next actions** at each rung (single primary CTA + optional secondary), implemented via the existing `EmptyState` primitive and small first-run surfaces — not a forced wizard.
4. **Durable activation milestones** (D1-backed) so the welcome surface knows when to dismiss and analytics can measure funnel completion.
5. **Sample/demo data policy** (owner decision recorded; recommendation given) and, if the recommendation is accepted, an opt-in starter sample project path.
6. **Activation analytics/evidence**: server-emitted structured events covering the funnel; consent-aware upgrade path; no paid add-on.
7. **Tests**: DOM/integration/e2e proving the empty states, the milestone dismissal, the opt-in sample flow, and the no-intake-gate invariant.
8. **Connections** to the sibling 2026-07-07 plan stubs: `projects-estimates-start-path-ia`, `public-to-beta-trust-onboarding-continuity`, `beta-support-feedback-operating-loop`, `client-ready-proposal-package-workflow`, `proposal-export-and-immutable-deliverable-trust`, and the superseded Joyride plan.

## Scope (out / non-goals)

- Implementing any code, test, migration, schema, infra, or config change (planning-only).
- Building or redesigning the public marketing landing page (explicit constraint).
- Replacing the bento homebase layout — the empty-workspace surface composes **inside** the existing dashboard, it does not replace it.
- Re-architecting auth, sessions, workspaces, or the closed-beta gate.
- Required onboarding/wizard intake (forbidden by owner decision `decisions.md` 2026-05-27).
- Immutable/PDF proposal packages — deferred to sibling stub `2026-07-07-proposal-export-and-immutable-deliverable-trust`. This pack only ensures the activation ladder **reaches** the existing mutable XLSX export + view-only shared-link publication rung.
- A/B testing framework for onboarding variants (future work; not beta-blocking).
- Paid analytics add-ons (forbidden by current cost posture unless owner approves).
- Re-introducing a global cost-library category taxonomy (deliberately removed by migration `0037`).
- Executing the stale Joyride plan as-is (its Supabase + `/workshop/onboarding` route assumptions are now wrong).

## Stakeholders

- **Owner (Philip):** product decisions (`OPEN-DEC-01` sample data, `OPEN-DEC-02` collaborator welcome), final acceptance of the `CONDITIONALLY READY` package.
- **First closed-beta users:** the primary audience; construction-style estimating is the wedge persona (`known-issues.md`).
- **Implementation AI:** the consumer of this pack; must be able to execute without inventing product decisions.
- **Future reviewers:** senior product/design/engineering/security/data/QA/ops.

## Assumptions

- `ASSUMP-01`: The owner-decided "no required intake gate" posture (`decisions.md` 2026-05-27) remains in force for closed beta. **Validated** by `auth-onboarding-guard.test.ts` (login lands on `/workshop`, `/workshop/onboarding` collapses to `/workshop`).
- `ASSUMP-02`: Closed-beta entry stays admin-invited allowlist only (`/signup` renders `ClosedBetaGate`); no open self-serve signup in scope. **Validated** by `src/app/signup/page.tsx`.
- `ASSUMP-03`: The terminal "publishable proposal" rung means the **existing** mutable XLSX export + view-only shared-link publication. Immutable/PDF is out of scope. **Validated** by `.ai/06_specs/proposal-package-system.md`.
- `ASSUMP-04`: The empty estimate-tab affordance ("Add an Area to start, or drag a template or project content here" + `Browse templates`) is the canonical "first area/template" surface and should be extended, not replaced. **Validated** by `estimate-empty-tab-state.test.tsx`.
- `ASSUMP-05`: Free-tier Cloudflare limits remain the cost ceiling; no paid analytics add-on. **Validated** by `AGENTS.md` cost posture.
- `ASSUMP-06`: A single new lightweight D1 table for milestones is acceptable under the standing Cloudflare-resource mandate. **Validated** by `AGENTS.md` standing authorization for D1 migrations in `./migrations/`.

## Constraints

- Planning-only: no app/test/migration/schema/infra/config/Git mutation.
- Shared live worktree: no branch/worktree creation; coordinate by file ownership.
- Stack baseline as in `AGENTS.md` (Next.js 16 + React 19 + Bun + Tailwind v4 + Cloudflare Workers/OpenNext + D1 + R2 + DO + Queues/Cron + Cloudflare Email + Better Auth + TanStack Query + Zustand + repository boundaries).
- Provider boundary strict: only resources bound in `wrangler.jsonc`.

## Success metrics (product)

These are the **planning** success metrics (does the pack let an executor build without inventing decisions?). Runtime activation metrics are defined in `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

- Every ladder rung has an explicit zero state with a single primary CTA. (planning-complete: yes)
- Every rung has a durable milestone + server-emitted activation event. (planning-complete: yes)
- No product decision is left for the executor to invent, except the two owner-isolated `OPEN-DEC`s. (planning-complete: yes)
- All requirements are traceable to source evidence, implementation tasks, acceptance criteria, and tests. (planning-complete: yes)

## Failure metrics (planning)

- An executor must invent sample-data, analytics-sink, or collaborator-welcome behavior mid-build → pack incomplete.
- A zero state is described vaguely ("show a nice message") instead of with exact copy, CTA, and target route → pack incomplete.
- A requirement is untraced → pack incomplete.
