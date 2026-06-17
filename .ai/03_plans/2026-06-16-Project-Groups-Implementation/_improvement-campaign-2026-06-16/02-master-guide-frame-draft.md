<!-- SCRATCH: frame for 16-MASTER-IMPLEMENTATION-GUIDE.md. Orchestrator-authored from 00/01/02/03/07/12.
     Phase sections come from Wave 3.5 phase-draft agents; orchestrator assembles 16 = this frame + phase sections + self-review. -->

# Project Groups — Master Implementation Guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended)
> or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
> This guide is the single executable entry point; it **binds to the contracts in `07` verbatim** and
> **references `08`–`11` for full step-level TDD code** (do not duplicate — read the phase doc for each task).

**Goal:** Add a per-user "Project Groups" organization layer to `/workshop/projects` — named, ordered,
color-accented buckets rendered through the existing horizontal-flag treatment — as a third "Organize by"
mode (None / Date / Group), without breaking the date/client-flag DOM contract or rippling the shared
`WorkshopProjectListItem` type, and shipped with 0 errors and full test coverage.

**Architecture:** Next.js (App Router, SSR-prop-driven) + Bun + Supabase/Postgres with RLS. Two new
per-user tables cloned from `project_favorites` and hardened with a membership IDOR `exists()` backstop.
Server actions mirror `setProjectFavorite`. The repository read is strictly additive. The client uses
local `useState` + the `useSyncExternalStore` localStorage machinery (NO TanStack Query for this list).
One reusable `ProjectGroupSection` renders date, client, and user grouping; date/client modes stay
byte-identical via legacy-data-attr props. Optimistic assignment diverges from favorites: the override
encodes *which* group and is cleared by a reconciliation `useEffect` once SSR is authoritative (because
`router.refresh()` is non-awaitable).

**Tech Stack:** TypeScript, React 19, Next.js App Router, Supabase JS v2, Postgres 15 RLS, Vitest + React
Testing Library; `bunx vitest run <path>`, `bun run type-check`.

---

## 0. How to use this guide & the document map

This guide orchestrates execution. For any task it lists, the **full TDD step code lives in the cited
phase doc**. Read in this order: this guide → the phase doc for the phase you are on → `07` for any
contract → `15` for the phase's definition-of-done and rollback.

| Doc | Use it for |
|---|---|
| `00-synthesis-and-decisions.md` | The canonical decisions D1–D16 and owner Q1–Q4. The "why". |
| `01-product-spec-and-ux-flows.md` | Product behavior, UX flows, 9 edge cases, acceptance criteria. |
| `02-database-supabase-analysis.md` | DB analysis (subordinate to `07` on contract shape). |
| `03-blast-radius-impact-analysis.md` | Per-file impact, the 29-importer hub, test surfaces. |
| `04-state-data-flow-analysis.md` | SSR-not-Query model, optimistic template, the D14 divergence. |
| `05-ui-reuse-and-design.md` | `ProjectGroupSection`, toolbar control, popover, palette, DESIGN.md compliance. |
| `06-prior-art-and-concurrency-watch.md` | Favorites/date+client prior art, in-flight-plan map, rebase discipline. |
| `07-…contracts.md` | **THE binding spine** — every shared name, type, signature, DOM anchor, storage key, DDL. |
| `08`–`11` | The four TDD build-phase plans (full step code). |
| `12-adversarial-review.md` | The review record + the integrated-FIX@IMPL index. |
| `13-…traceability-and-qa-matrix.md` | Requirement→task→test proof + security-control matrix + scorecard. |
| `14-…handoff-and-runbook.md` | One-page orientation + contract index + validation block. |
| `15-…rollback-recovery-and-dod.md` | Per-phase DOWN/revert, the RLS-proof runbook, per-phase definition-of-done. |
| **`16` (this doc)** | The executable master plan that sequences and binds them all. |

---

## 1. Executive overview & value

[ASSEMBLE: condense 01 §1 + 00 §1. Project Groups turns a flat project wall into a personal workspace
board — pipeline stages, client portfolios, priority tiers — reusing the proven date-flag treatment.
Per-user/private; Your Projects only in v1; not a new route; not destructive. Primary user: the project
owner managing a growing portfolio.]

---

## 2. Architecture & key-decision digest (bound to `07`)

[ASSEMBLE: a tight table of D1–D16 each in one line with its binding contract anchor in `07`. Pull from
00 §2. Emphasize: D1 one-to-many (`unique(user_id, project_id)`); D2 per-user RLS; D3 two tables, no
`projects.group_id`; D4 explicit `organizeBy`; D5 localStorage view pref; D6 one `ProjectGroupSection`;
D7 favorites-cloned migration + IDOR backstop; D9 assignment gate = repository owned predicate (LD-2);
D10 delete-group→Ungrouped; D13 accents in v1 (LD-4 palette); D14 corrected non-awaitable-refresh clear.]

---

## 3. SWOT analysis

### Strengths
- **Maximal reuse of proven primitives.** The feature is an end-to-end clone of the just-shipped Favorites
  data/optimistic pattern + the date-flag renderer; almost no novel mechanism. This is the single biggest
  de-risker: the team has already shipped and tested every primitive Groups depends on.
- **Contracts-first.** `07` fixes every shared name, type, signature, DOM anchor, and storage key, so the
  four phases bind to one interface and cannot drift. Cross-doc contradictions were audited out.
- **Strictly additive data + repository changes.** No `projects.group_id`; `Tables<"projects">` is
  untouched; the repository read only extends a `Promise.all`. The 29-importer hub is not rippled.
- **Byte-identical legacy path.** Date *and* client grouping render through the generalized component with
  legacy data-attrs preserved, so the 5 fragile `projects-page-*` suites stay green.
- **Defense in depth on isolation.** Per-user RLS + a membership IDOR `exists()` backstop + an action-layer
  ownership gate (the repository `owned` predicate) — three independent layers.
- **Full traceability.** Every requirement maps to a test (`13`); every review finding is integrated
  (`12` §4); rollback + DoD are defined per phase (`15`).

### Weaknesses
- **Phase 4 is a large, fragile client refactor.** Decoupling grouping from the sort field while keeping
  the date/client DOM byte-identical is the integration linchpin; it touches the most-contended file
  (`projects-page-client.tsx`).
- **Soft caps are app-layer only** (50 groups / 40 chars). A direct DB insert can bypass them; concurrent
  `createProjectGroup` can exceed 50 by one. Accepted for a private layer, but it is a real non-atomicity.
- **Optimistic group override is stateful** (encodes *which* group, not a boolean) and depends on a
  reconciliation `useEffect` keyed to non-awaitable `router.refresh()` — the most subtle client mechanism.
- **Two CRUD surfaces** (Manage-groups popover + per-flag header menu) add minor surface to keep coherent.

### Opportunities
- **Foundation for fast-follows.** The membership model + `organizeBy` axis + reusable section cleanly
  enable later: details-modal assignment, drag-to-flag, group reorder UI, collapse persistence, sidebar
  groups, shared-project groups, and a future many-to-many **Tags** feature — none of which require
  reworking the v1 schema.
- **Re-tunable accents.** Storing `accent_id` tokens (not hex) lets the palette be re-tuned for AA/brand
  without a data migration.
- **Generalized renderer.** `ProjectGroupSection` + `project-grid-layout.ts` reduce duplication and become
  the canonical flag renderer for any future bucket dimension.

### Threats
- **Concurrency (the dominant risk).** Three in-flight branches (C1 sidebar-favorites, C2 delete-modal,
  C3 card-links) are mid-edit in the exact files Groups needs. Building on the dirty tree guarantees merge
  conflicts and risks silently breaking the date-flag suites. **Mitigation: land C1/C2/C3 first; rebase
  and re-read live before any shared-file edit; prefer new files; DB-action-first, then a single client PR.**
- **Ownership-gate subtlety.** `created_by` is nullable and ownership can come via workspace role; a naive
  `created_by = uid` gate silently rejects legitimately-owned projects. **Mitigation: LD-2 — gate on the
  repository `owned` predicate; negative tests for role-owned and null-`created_by`.**
- **`router.refresh()` semantics.** It is non-awaitable; a `.then()`-based override clear flickers to stale
  SSR. **Mitigation: LD-6 — `startTransition` + reconciliation `useEffect`; interleaving test.**
- **Live-DB test hygiene.** The Phase-1 RLS proof must not pollute the production project. **Mitigation:
  LD-9 — real authenticated role / disposable branch, sanity hard-abort gate, guaranteed teardown (`15`).**

---

## 4. Preconditions & sequencing gate (READ BEFORE STARTING)

[ASSEMBLE from 00 §6 + 06. Hard gate: C1/C2/C3 merged. Rebase-before-edit discipline. Strict
7a→7b→7c→7d order. Prefer new files. One owner of the shared `WorkshopProjectListItem` type edit.]

---

## 5. Phases [ASSEMBLE FROM WAVE-3.5 PHASE-DRAFT AGENTS]

[Phase 1 — DB + types (from 08)]
[Phase 2 — Server actions (from 09)]
[Phase 3 — Repository + page (from 10)]
[Phase 4 — Client UI + tests (from 11)]
Each phase section: Objective · Depends-on · Files (create/modify/test) · Contracts bound (07 §refs) ·
**Pros / Cons of the phase approach** · Risks + mitigations · Task list (referencing the phase doc's full
TDD steps) · **Definition-of-Done** (from 15).

---

## 6. Cross-cutting concerns

[ASSEMBLE: (a) Concurrency & rebase discipline; (b) Optimistic assignment + D14 reconciliation (LD-6);
(c) Security — per-user RLS + IDOR exists() backstop + LD-2 ownership gate + provider proof requirements;
(d) Accents — inline-style-only containment, LD-4 palette, AA labels; (e) DOM byte-identity — the
preserved anchors from 07 §5.6; (f) Caps — app-layer soft-cap semantics.]

---

## 7. Validation, STOP conditions & non-goals

[ASSEMBLE from 14: the consolidated `bunx vitest run …` block + `bun run type-check` + `git diff --check`;
STOP/escalate conditions; v1 non-goals (drag, details-modal field, reorder UI, collapse persistence,
sidebar groups, shared-project groups, tags).]

---

## 8. Readiness statement

[ASSEMBLE: bind to 13's 100% scorecard; state the integrated-FIX@IMPL basis for readiness; reiterate the
concurrency precondition as the one gating external dependency.]
