# 02 — Feature Brief and Scope

## Source brief (verbatim summary)

From `PROMPT.md` (the authoritative FEATURE BRIEF for this pack):

> **Goal.** Create a plan pack for production cost-library governance: source provenance, draft/review workflow, trust labels, stale data, import/export safety, and estimate impact.
>
> **Evidence to start from.**
> - `src/lib/component-library/` contains component/cost-library logic.
> - `migrations/0036_cost_library_component_drafts.sql` adds draft support.
> - Existing tests reference cost governance/source trust, but production ownership, source confidence, and update cadence need a dedicated plan.
> - `AGENTS.md` names cost library as a first-user priority.
>
> **Required plan pack.** Define data sources, provenance model, review states, role permissions, stale/region/version labels, import validation, estimate update behavior, audit trail, tests, and evidence for first-user trust.
>
> **Constraints.** Do not invent authoritative cost data. Explicitly mark owner decisions and unknown source commitments.
>
> **Stop condition.** The pack is complete when cost library data can be trusted, reviewed, and surfaced honestly in estimating workflows.

Authority: PROMPT.md is the FEATURE BRIEF. `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` are the planning + execution directives (they govern *how* to plan, not what the product is). Repo evidence is current-state truth. Supabase governance migration is parity reference, not the target runtime.

## Product and strategy

| Dimension | Decision |
|---|---|
| Problem | Cost library lacks durable, reviewable, honestly-surfaced trust governance on the active D1 runtime; estimate stale-propagation is dead; no safe import/export. |
| User value | Estimators trust the costs they commit; reviewers can accept/reject/lock/supersede; owners stand behind named sources; stale costs are visible, not hidden. |
| Business value | First-user trust precondition (AGENTS.md priority); reduces estimate error; audit trail for proposals. |
| Goals | (1) Provenance on every cost; (2) review workflow on D1; (3) trust labels from real state; (4) live stale propagation; (5) safe import/export; (6) honest owner decisions. |
| Non-goals | Invent authoritative cost data; FX engine; migrate off D1; rewrite versioning/lifecycle; new design system; broad estimate-sheet rework. |
| Scope boundaries | Library + its estimate integration + library import/export. Not: estimate pricing engine, proposal export format changes, auth system rework. |
| Success metrics | Every accepted cost has provenance+reviewer; `source-changed` reachable end-to-end; import dry-run blocks formula injection; review actions covered by denial tests; p95 library browse ≤ existing baseline + 10%. |
| Failure metrics | Silent overwrite of accepted costs; stale costs presented as fresh; cross-workspace review leak; import injection; gate dead-branch remains dead. |
| Stakeholders | Owner (Philip) = product + authority; estimators = primary users; reviewers = admin/editor role; first external users = trust consumers. |
| Assumptions | D1 remains active runtime; Better Auth identity used for `created_by/reviewed_by/assigned_to`; free-tier Cloudflare posture; no new paid add-ons. |
| Tradeoffs | Computed-on-read freshness (cheap, always honest) vs materialized (faster overview, write cost) — `DEC-4` picks computed-on-read + optional async. |
| Future extensibility | Multi-currency FX; region-specific libraries; supplier-fed price refresh; public/shared library marketplace. |

## In-scope requirement families (detailed in `04`)

| Family | Summary |
|---|---|
| Provenance | Source, pricing date, structured confidence, currency, region/version, source URL, supplier recorded + validated + surfaced. |
| Review workflow | `proposed → needs_review → accepted | rejected | superseded` on D1 with assignment, due dates, lock/unlock, conflict guards, audit. |
| Trust labels | Chips + commit gate read review state + freshness + confidence (not just regex). |
| Stale propagation | Library update → consuming estimate rows `source-changed`; freshness windows honored. |
| Import/export safety | CSV/JSON dry-run, formula guards, row caps, provenance normalization, no silent overwrite. |
| Estimate impact | Insert/replace gates honest; template dependency health honest; row detail shows review state. |
| Audit trail | Append-only review events; version/state history extended; correlation ids. |
| Roles & permissions | Review/accept/lock/supersede admin/editor authz parity; denial tested. |
| Tests & evidence | Test execution matrix; adversarial matrix; rollout gates. |

## Out-of-scope (explicit)

- Authoritative cost data seeding (owner decision `OPEN-1`).
- FX/multi-currency conversion engine (`OPEN-2` — currency *recorded* only).
- Supabase reactivation or Postgres port-back (`DEC-1`).
- Replacing `cost_library_item_versions` / `cost_library_item_state_history` / `cost_library_item_price_history` (extended, `DEC-3`).
- New design-system primitives (reuse `src/components/ui/` + existing chips, `DEC-6`).
- Estimate pricing math, proposal `.xlsx` format, Better Auth rework, Cloudflare provider exit.

## Source authority map

| Source | Strength | Used for |
|---|---|---|
| `SRC-PROMPT` = `PROMPT.md` | brief | Product scope, constraints, stop condition |
| `SRC-AUDIT` = delegated codebase sweep + direct reads | repo evidence | Current architecture, files, symbols, gaps |
| `SRC-TRUST-MODEL` = `src/components/workshop/library/source-trust-model.ts` | repo evidence | Existing freshness/confidence/chip/gate logic |
| `SRC-VALIDATION` = `src/lib/component-library/quick-add-validation.ts` | repo evidence | Existing input validation, formula guards |
| `SRC-ACTIONS` = `src/lib/component-library/actions.ts` | repo evidence | Active D1 CRUD path, authz guards, lifecycle/versioning |
| `SRC-MIGRATIONS` = `migrations/0026,0028,0036,...` | repo evidence | D1 cost-library schema |
| `SRC-SUPABASE-GOV` = `supabase/migrations/20260622143000_library_trust_governance.sql` | repo evidence (reference) | Governance contract parity (review enum, RPCs, CHECKs, conflict guards) |
| `SRC-API` = `src/app/api/component-library/**` | repo evidence | Attachments route, authz |
| `SRC-AUTHZ` = `src/lib/authz/d1-access.ts` | repo evidence | App-level authz model |
| `SRC-TESTS` = `tests/vitest/*library*`, `*source-trust*`, `*governance*` | repo evidence | Existing coverage, gaps |
| `SRC-REPO` = `AGENTS.md`, `.ai/10_state/current-state.md` fast path | repo evidence | Stack baseline, project stage, constraints |
| `SRC-SPECS` = `.ai/06_specs/current-project-estimates-component-library-spec.md` | repo evidence | Domain model |
| Cloudflare D1 official docs | official docs (consulted by implementation) | D1 SQL/limits/migration behavior |
| Next.js 16 local docs `node_modules/next/dist/docs/` | official docs (consulted by implementation) | Server Actions, caching, revalidation |

No provider proof is claimed at planning time. Implementation phases that require D1 readback/preview proof name the exact `cf:*` scripts in `11`/`13`.
