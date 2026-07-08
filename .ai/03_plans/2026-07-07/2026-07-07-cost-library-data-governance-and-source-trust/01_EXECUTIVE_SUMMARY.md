# 01 — Executive Summary

## What this plan delivers

A production-grade, evidence-based plan to make Archestimator's cost library **trustworthy, reviewable, and honestly surfaced** in estimating workflows before first users. It governs source provenance, draft/review workflow, trust labels, stale data, import/export safety, and estimate impact.

## The core problem (one paragraph)

The repository contains a complete, durable cost-library trust-governance model in **legacy Supabase/Postgres** (`supabase/migrations/20260622143000_library_trust_governance.sql`: review enums `proposed|needs_review|accepted|rejected|superseded`, assignment, lock/unlock, supersede, attachment approval, 9 admin-only RPCs behind `require_cost_library_governance_admin`, 7 CHECK constraints, optimistic-revision conflict guards, RLS). But the **active Cloudflare D1 + Next.js Server Action write path mirrors only a schema subset and calls none of those RPCs** (verified: `src/lib/component-library/actions.ts` has 0 references to `accept_cost_library_cost_entry`/`supersede_*`/`require_cost_library_governance_admin`; the test `tests/vitest/component-library-cost-governance-actions.test.ts` asserts this). The D1 variant cost entries lack `review_status / assigned_to / review_due_at / locked_by`. The estimate trust gate (`getLibraryCommitTrustGate`) **reads** `linkState === "source-changed"` but **nothing writes it** when a library item changes (verified: the only `link_state =` write sites are promotion to `linked-clean` and explicit detach). So the gate's stale-warning branch is effectively dead, and reviewers have no durable place to accept/reject/lock/supersede on the active runtime.

## Target state (concise)

1. **Provenance on every cost entry:** source, pricing date, structured confidence, currency, region/version labels, source URL, supplier — recorded, validated, and surfaced.
2. **Durable review workflow on D1:** `proposed → needs_review → accepted | rejected | superseded`, with assignment, due dates, optimistic-revision conflict guards, lock/unlock, and append-only review events — ported from the Supabase governance model to the active D1 + app-authz path.
3. **Trust labels that reflect reality:** chips and commit gates read review state + freshness + confidence, not just regex over free text.
4. **Live stale propagation:** updating an accepted library cost flips consuming estimate rows to `source-changed` so the gate is honest (mechanism decided in `DEC-4`).
5. **Safe import/export:** CSV/JSON with formula-injection guards, row caps, dry-run preview, provenance normalization — no silent overwrite of accepted costs.
6. **Honest owner decisions:** explicit "owner-accepted" provenance distinct from "imported"/"unverified"; no invented authoritative data.

## Plan profile and approach

- **Profile: `exhaustive`.** Touches D1 schema, app authorization, data integrity, multi-source provenance, and first-user trust — all high-blast-radius triggers per `AGENTS.md` and the plan-pack skill.
- **Strategy:** port the *contract* (not the runtime) of the Supabase governance model onto D1 + app-level authz + Next.js Server Actions; wire the existing trust-model/chips/gate to the new state; add the missing stale-propagation write; add safe import/export. Reuse the existing versioning/lifecycle/price-history tables — extend, do not replace.
- **Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, TanStack Query, Zustand, repository boundaries. Supabase/Postgres is **reference evidence only**, never the target runtime.

## Major findings

- **Architecture:** dual persistence drift is the central risk. The active write path (`src/lib/component-library/actions.ts`, 107 KB) is the source of truth for D1 CRUD; the Supabase governance RPCs are unreachable from it. Decision `DEC-1`: converge on D1 as the single active governance runtime; treat Supabase migration as parity reference and provider-exit archaeology.
- **Data:** D1 `cost_library_item_variant_cost_entries` needs governance columns + a new review-event table (or reuse the existing `cost_library_item_state_history` shape extended). Migration must be additive, ordered, reversible, with backfill = default `accepted` for existing current entries (owner-gated, `OPEN-1`).
- **Estimate integration:** stale propagation is dead. `DEC-4` recommends computed-on-read at estimate load (cheap, always honest) plus optional async materialization for overview counts.
- **Security:** review/accept/lock/supersede actions are new privileged surfaces — need workspace-admin/editor authz parity with `require_cost_library_governance_admin`, denial tests, and optimistic-revision conflict handling.
- **Performance:** stale-propagation fan-out and overview aggregation are the hot paths; evaluator contract in `09`.
- **UX/a11y:** existing chips/filters/gates are the reuse base; review-state UI (accept/reject/lock badges, assignee picker, due-date) and import/export flow are new surfaces — keyboard/focus/ARIA proof required.

## Critical decisions (summary — full in `15`)

| ID | Decision |
|---|---|
| `DEC-1` | D1 is the single active governance runtime; Supabase migration is parity reference + exit archaeology only. |
| `DEC-2` | Port the review enum and conflict-guard *contract* from Supabase to D1 + app-authz; do not call Supabase RPCs from the app. |
| `DEC-3` | Extend existing `cost_library_item_versions` / `cost_library_item_state_history` audit tables for review events rather than a parallel silo. |
| `DEC-4` | Stale propagation: computed-on-read at estimate load (always honest) + optional async materialization for overview. |
| `DEC-5` | Import = CSV first + JSON round-trip; Excel later; dry-run preview mandatory; never overwrite `accepted` costs without explicit re-review. |
| `DEC-6` | Reuse existing `SourceTrustChips` + `getLibraryCommitTrustGate` + `getTemplateDependencyHealth`; extend inputs, do not fork the model. |

## Remaining external decisions (blockers for full readiness, not for schema/authz work)

- `OPEN-1` Seed/import authoritative cost data source(s) — owner only.
- `OPEN-2` Currency/region model scope.
- `OPEN-3` Confidence taxonomy (enum vs free text).
- `OPEN-5` Reviewer role boundary (admin vs editor-with-override).

## Phases at a glance (full in `11`)

| Phase | Objective | Key tasks | Unblocks |
|---|---|---|---|
| P0 | Discovery + migration scaffolding + authz parity proof | `TASK-001..004` | P1 |
| P1 | D1 governance schema migration (additive, reversible) | `TASK-005..008` | P2, P3 |
| P2 | Server Actions + app-authz for review/accept/lock/supersede/assign | `TASK-009..014` | P3, P4 |
| P3 | Trust model + chips + commit gate wiring + template health | `TASK-015..019` | P4 |
| P4 | Stale propagation (computed-on-read + optional materialization) | `TASK-020..023` | P5 |
| P5 | Import/export safety | `TASK-024..028` | P6 |
| P6 | UX surfaces (review UI, import/export flow, overview) + a11y | `TASK-029..033` | P7 |
| P7 | Tests, adversarial QA, observability, rollout gates | `TASK-034..038` | release |

## Initial readiness scores (post-first-draft, pre-final-verification)

Recorded in `17`. Headline: the *planning package* targets 95+ on scope, requirements, architecture, data, security, traceability. Capped by `verification_mode: emulated` → max 97 overall; with `OPEN-1/2/3/5` unresolved, package status is `CONDITIONALLY READY` (named slices in P0–P4 can proceed; P5 import data and full accept-state depend on owner decisions).

## No application code changed

This is a planning-only deliverable. No source, tests, migrations, schemas, provider state, or runtime data were modified. Confirmation in `17`.
