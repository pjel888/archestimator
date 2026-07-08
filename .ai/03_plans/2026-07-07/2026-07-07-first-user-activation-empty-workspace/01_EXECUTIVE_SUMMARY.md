# 01 — Executive Summary

## What this plan delivers

A product/UX plan pack for the **first-user activation ladder**: the path a brand-new closed-beta user takes from beta entry → first project → first estimate → first area/template/line item → first publishable proposal. The deliverable is the plan pack itself, not running code.

The pack defines activation success criteria, every zero/empty state on the path, guided next-action affordances, sample/demo data policy, durable onboarding milestones, analytics/evidence, tests, and explicit connections to the sibling 2026-07-07 plan stubs.

## Current state (one paragraph)

A beta user is admin-invited into `closed_beta_allowed_emails`, signs in via Better Auth magic-link or Google OAuth, passes the closed-beta gate and the legal terms clickwrap gate, and is lazily provisioned a personal workspace via `ensureDefaultWorkspace()` on first protected-route access. They land on `/workshop` — the bento homebase — with **zero projects, zero estimates, zero cost-library items, zero templates, zero publications**. The dashboard renders counts of `0` / `—` and empty ledgers with no welcome panel or guided next action. The only enabled first action is the small "New project" button inside `LibraryHubCard.tsx`; the "New estimate sheet" quick action is disabled until a project exists (tooltip "Create a project first"). Creating a project auto-seeds one empty first estimate sheet (`NewProjectForm.tsx:333`), whose editor shows an actionable empty-tab affordance ("Add an Area to start, or drag a template or project content here"). There is **no tour library, no in-workshop product analytics, no per-user sample/starter data**, and the reusable `EmptyState` primitive exists but is wired only into publisher/proposals — not the dashboard, projects list, or library overview.

## Target state (one paragraph)

The same beta user lands on `/workshop` and, when the workspace has zero projects, sees a **first-run welcome surface** that names the activation ladder and offers one primary CTA ("Create your first project") plus optional next steps (browse starter templates, take a guided tour). Each subsequent surface (empty projects list, empty estimate tab, empty cost library, empty publisher roster) shows a **purposeful zero state** with a single clear next action tied to the ladder. The system records **durable activation milestones** in D1 (first project, first estimate, first area, first line item, first publication) so the welcome surface dismisses once value is reached and so analytics can measure funnel completion. A **consent-respecting, server-emitted activation event stream** proves the funnel. An **opt-in starter sample project** (off by default) is available for users who want to explore before creating their own. The terminal rung — first publishable proposal — connects to the existing mutable XLSX export + view-only shared-link publication path, with the immutable/PDF package work explicitly deferred to the sibling `2026-07-07-proposal-export-and-immutable-deliverable-trust` stub.

## Major findings

- **Architecture:** the ladder already exists as data entities (`projects → estimates → estimate_nodes/estimate_row_items → cost_library_items/estimate_templates → project_publications`); the gap is purely UX surfacing + durable milestone tracking + analytics. No schema redesign is needed beyond one new lightweight milestones table.
- **UX:** the biggest gap is the `/workshop` empty-workspace state. The owner has decided **no required intake gate**, so the answer is product-led empty states, not a wizard. The existing `EmptyState` primitive and the shipped empty-tab affordance are the right primitives to extend.
- **Data/seeding:** no starter content exists today; the seed taxonomy was deliberately removed in migration `0037`. The sample/demo data policy is the single most consequential owner decision (`OPEN-DEC-02`).
- **Analytics:** zero in-workshop instrumentation exists; the roadmap lists unimplemented Required Analytics Events per phase. This pack proposes server-emitted structured events to start (no paid add-on), with a consent-aware path to a richer sink later.
- **Security:** activation surfaces sit behind the existing closed-beta allowlist, terms gate, session, and D1 app-authorization. New attack surface is small: milestone rows must be workspace-scoped and authorized; activation events must not leak cross-workspace or PII; the opt-in sample project must respect the same D1 authz as real projects.

## Critical decisions

- **DEC-01:** product-led activation, no required intake gate (inherits owner decision).
- **DEC-02:** durable milestones via a new `workspace_activation_milestones` table (workspace-scoped, one row per workspace), not a per-tour table. Replaces the stale Joyride approach.
- **DEC-03:** activation events are server-emitted and structured (no third-party SDK in `/workshop` initially); sink is the existing observability logger with a typed schema, upgradeable to a consent-gated analytics SDK later.
- **OPEN-DEC-01:** exact sample/demo data policy (none vs opt-in starter project vs templated demo) — owner decision, options + recommendation in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.
- **OPEN-DEC-02:** whether invited collaborators (who adopt an existing workspace) see the same welcome surface — owner decision.

## Readiness verdict

`CONDITIONALLY READY`. The empty-workspace welcome surface, all zero-state extensions, durable milestone tracking, and their DOM/integration/e2e tests are implementation-ready and internally resolvable. Two phases are isolated behind owner decisions: sample/demo data policy (`OPEN-DEC-01`) and the analytics sink upgrade path (`OPEN-DEC-02` partially). Verification was emulated (single agent, no native independent verifier), which caps overall readiness at 97 and, per the suite contract, caps a high-blast-radius package at `CONDITIONALLY READY` until an independent reviewer or the owner accepts the final package.

## Cost / operations posture

Stays on free-tier Cloudflare limits (per `AGENTS.md`). The milestones table is one row per workspace with a handful of timestamp columns — negligible D1 cost. Activation events are structured logs through the existing observability layer; no paid analytics add-on is introduced. Sample data, if adopted, is opt-in and workspace-scoped (no global taxonomy re-seed).

## Confirmation

No application code, tests, migrations, schemas, infrastructure, configuration, or Git state was modified by this planning task. All writes are confined to this plan folder.
