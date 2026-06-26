# Publisher Page Plan Pack — 2026-06-25

> **PASS-2 AUDIT APPLIED (2026-06-25).** See `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` for the authoritative errata sheet. Doc 18 supersedes any contradictory statement in docs 01–17. Eight CRITICAL corrections (fabricated action names, fabricated RPC name, fabricated migration timestamp, fabricated helper, false service-role claim, fabricated branch coordination, false current-branch claim, possibly-nonexistent Launch-Readiness-Audit paths) + 17 HIGH + 15 MEDIUM + 7 LOW findings, each with file:line evidence.
>
> **UX/UI RESEARCH ADDENDUM ADDED (2026-06-25).** See `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` for the source-backed Publisher roster, permission-change, accessibility, tablet, and privacy refinements. Doc 19 complements doc 18; it does not supersede doc 18's factual code corrections.

**Purpose.** A comprehensive, evidence-backed, codebase-specific planning package for the future `/workshop/publisher` route — the unified workspace surface for shared links, published projects, RBAC over projects + estimate sheets, and client-side access (view / comment / decision / edit-grant) to published estimate sheets.

**Status.** PLANNING / READINESS ONLY — no application code, schema, migration, test, infrastructure, or config was modified to produce this pack. No provider (Supabase, Vercel, GitHub, Resend) was mutated.

**Folder.** `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-25-Publisher-Page/`

**Repo root.** `/Users/philiplewis/Documents/archestimator` · branch `main` (verify with `git status --short --branch` before implementation).

**Owner.** Philip (Archestimator founder). Standing database authorization is ACTIVE for Supabase project `ebxxqidacheyapmmzavr` only.

---

## What this pack IS

A pre-implementation audit + design + work-breakdown for the Publisher page. It inventories what already exists (extensive: tokens, RLS, RBAC helpers, audit tables, share API, manager modals), identifies the gaps the Publisher page must fill, and sequences the implementation into safe, dependency-aware phases.

This pack is **agent-neutral** — the same DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE loop applies regardless of which coding agent runs it (Codex, Claude, OpenCode, etc.).

---

## What this pack IS NOT

- Not an implementation. No code was written.
- Not a release authorization. Launch readiness requires the separate `2026-06-19-Launch-Readiness-Audit/` gates to close.
- Not a spec. The canonical specs are `.ai/06_specs/shared-link-and-publication-spec.md`, `teamspaces-collaboration-spec.md`, and `proposal-package-system.md`. This pack *consumes* those specs and proposes a unified UI surface above them.
- Not a database change. No migrations were written. The plan identifies migrations that the future implementation may need and leaves them to the implementation phase.

---

## The headline

Archestimator already has a deep, security-hardened publication + collaboration + RLS substrate. **The Publisher page is not new infrastructure — it is the missing unified admin surface above it.** The hardest work (token hashing, AES-256-GCM recopy, scrypt passwords, lockout, CSRF, RLS, audit tables, snapshot locking) is done. The remaining work is mostly presentation, navigation, and a small set of capability extensions (granular per-recipient edit grants, "all-sheets" vs "some-sheets" editor scoping, consolidated activity feed).

---

## Document index (recommended reading order)

| # | Document | Purpose |
|---|---|---|
| 00 | `00_AGENT_COORDINATION.md` | Master `/goal`, agent ledger, skill inventory, concurrent-repo safety |
| 01 | `01_EXECUTIVE_SUMMARY.md` | One-page headline + the single most valuable next step |
| 02 | `02_FEATURE_BRIEF_AND_SCOPE.md` | User outcomes, scope boundaries, non-goals, target users |
| 03 | `03_SOURCE_AND_CODEBASE_AUDIT.md` | Evidence-backed inventory of what exists today (the main audit doc) |
| 04 | `04_REQUIREMENTS_SPECIFICATION.md` | Numbered requirements (FR/SEC/UX/ARCH/DATA/API/PERF/REL/OPS/TEST/DOC) |
| 05 | `05_UX_UI_ACCESSIBILITY_PLAN.md` | User journeys, states, IA, a11y contracts, design-system reuse |
| 06 | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Target architecture, component tree, data flow, contracts |
| 07 | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Schema, RLS, RPC, API, network contracts + likely gaps |
| 08 | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | OWASP Top 10 2025 mapping, capability tokens, privilege escalation |
| 09 | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Perf budgets, caching, failure modes, monitoring |
| 10 | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct + transitive impact, affected docs, concurrent-work risk |
| 11 | `11_IMPLEMENTATION_PLAN.md` | Phased work breakdown, parallelization, exit criteria |
| 12 | `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, scenarios, regression coverage |
| 13 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Feature flags, staged rollout, rollback, runbook |
| 14 | `14_RISK_REGISTER.md` | Risks with probability × impact × mitigation |
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | ADR-style decisions, assumptions, rejected alternatives |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Every requirement × implementation task × test × rollout check |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Readiness scoring, gaps, independent verifier result |
| 18 | `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` | Pass-2 audit errata (47 findings: 8 CRITICAL, 17 HIGH, 15 MEDIUM, 7 LOW) with file:line evidence — AUTHORITATIVE; supersedes contradictory statements in 01–17 |
| 19 | `19_UX_UI_RESEARCH_AND_REFINEMENT_2026-06-25.md` | Source-backed UX/UI refinement pass for roster IA, permission actions, accessibility, tablet behavior, copy-link privacy, and anti-slop design constraints |

---

## Relationship to existing packs

This pack complements — does not duplicate:

- **`2026-06-19-Launch-Readiness-Audit/Share-Routes-And-Proxy-Self-Gating/`** — release-blocking share/proxy findings. The Publisher page cannot ship to external users until those gates close. This pack references them; it does not re-audit them.
- **`2026-06-19-Launch-Readiness-Audit/RLS-RPC-And-DB-Security/`** — DB SECURITY DEFINER / FORCE RLS posture. Publisher's new RPCs must respect the same constraints.
- **`2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security/`** — auth/session hardening. Publisher rides on top of these guarantees.
- **`2026-06-21-Ponytail-Pass-Plan/`** — codebase over-engineering baseline. Publisher must not add to the Tier-2 mega-file list; prefer small, focused modules.

---

## Cross-references

- `.ai/06_specs/shared-link-and-publication-spec.md` — canonical publication spec
- `.ai/06_specs/teamspaces-collaboration-spec.md` — canonical RBAC/invite spec
- `.ai/06_specs/proposal-package-system.md` — canonical proposal/package spec
- `.ai/06_specs/walkthrough-shared-link-overhaul.md` — end-to-end share-link V2 walkthrough
- `.ai/06_specs/state-and-supabase-foundation.md` — TanStack + Zustand foundation
- `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` — the prompt that produced this pack

---

## Final readiness decision

See `17_FINAL_READINESS_REVIEW.md` for the scorecard. Headline: this pack is **planning-ready** (strategy, scope, requirements, architecture, security, blast radius, implementation phasing all documented with file:line evidence). It is **not implementation-ready** until the open decisions in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` (recipient edit-grant model, "all-sheets" vs "some-sheets" editor scope, sidebar placement) are resolved by Philip.
