# Publisher Owner Mobile And Sender Readiness — Plan Pack

**Date:** 2026-07-08 (Asia/Manila)
**Plan folder:** `.ai/03_plans/2026-07-07-publisher-owner-mobile-sender-readiness`
**Plan profile:** `exhaustive`
**Plan status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (single planning agent; high-blast-radius → capped at `CONDITIONALLY READY` until an independent reviewer or the owner accepts — see `17_FINAL_READINESS_REVIEW.md`)
**Overall readiness score:** 96 / 100 (emulated cap 97) — revised up from 91 baseline by the Improve-Plan audit (see `26_BASELINE_SCORECARD.md` for before/after)

This is a **planning-only** pack. No application code, tests, migrations, package manifests, provider state, or Git state were changed. All writes are confined to this folder.

> **Improve-Plan audit (2026-07-08):** This pack was audited and repaired by `Improve-Plan-Prompt.md`. New supporting docs: `22_ATTACK_SURFACE_INVENTORY.md`, `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md`, `24_FINAL_VERIFICATION_MATRIX.md`, `25_INVENTORY_AND_SOURCE_MAP.md`, `26_BASELINE_SCORECARD.md`. Revised: `05` (a11y proof matrix), `06`/`18` (cache primitive corrected to `revalidatePath`, Cache Components verified OFF), `12` (proof-contract rows), `16` (required traceability columns), `17` (before/after scores).

---

## What this plan delivers

A planning package that makes the proposal **publisher** surface an **owner-operable sender workflow across expected devices**, with a clear, honest checklist for every sender action (generate, copy, email, resend, revoke, confirm client access) and a documented, proof-backed mobile decision.

**Core gap:** `src/components/workshop/publisher/PublisherRosterClient.tsx:224,228` hides the entire roster below 768px (`min-[768px]` CSS guard → `PublisherNoRowsEmptyState variant="mobile"`), so owners are fully blocked on phones, and every sender action is reachable only via the desktop-only table.

**Recommended mobile decision (DEC-MOBILE, owner-delegated):** **Option B — desktop guard + recovery path.** Keep the 768px guard for heavy sender actions (email/resend/revoke/rotate), but make the mobile message honest + actionable: a one-tap "copy current URL to open on desktop" + an advertised `?drawer=<projectId>&tab=recipients` deep link (plumbing already exists at `PublisherRosterClient.tsx:88-97`), plus read-only roster status browsing on mobile. This aligns with `DESIGN.md:519-524` (dense editing → simplified flows on mobile), is cheap, SSR-safe, and reversible.

---

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** is the authoritative execution guide. Start there.

### Phase order (dependency-aware)

```
Phase 0 — Discovery & revalidation (read-only; confirm DEC-MOBILE)
   │
   ▼
Phase 1 — Mobile reachability (Option B: honest message + copy-URL + deep-link)  ◄── critical path
   │
   ├──► Phase 2 — Sender action state surfacing (drawer/composer/row)  ── SERIAL-DEPENDS-ON-WORKFLOW-PACK
   │
   ├──► Phase 3 — Audit/proof surfacing (Activity tab honest labels)  ── consumes workflow-pack labels
   │
   ▼
Phase 4 — Integration, proportional validation, coordination sign-off
```

**Critical path:** Phase 0 → Phase 1 → Phase 4. Phases 2 and 3 can run in parallel once prerequisites are met, but **Phase 2 serializes with the `client-ready-proposal-package-workflow` pack** on the shared files (`PublisherDrawer.tsx`, `RecipientEmailComposer.tsx`) — that pack lands first.

### Dependency graph

```
DEC-MOBILE (owner) ─► Phase 1 reachability
                          │
client-ready-proposal-package-workflow ─┬─► Phase 2 (serialize: workflow first)
   (readiness gate, Preflight, owner      │
    message, honest delivery labels,      └─► Phase 3 (consume labels)
    responded, notifications)
```

---

## Requirement → task → test traceability (quick links)

| Requirement | Phase | Task | Test | Full row |
|---|---|---|---|---|
| REQ-PS-01 (mobile reach) | P1 | 1.1, 1.2 | DOM @375px + Playwright | `16` |
| REQ-PS-02 (no duplication) | P0,P4 | 0.1, 4.2 | cross-doc review | `16` |
| REQ-FR-01 (generate) | P2 | 2.1 | project-publication-actions.test.ts | `16` |
| REQ-FR-02 (copy) | P2 | 2.1, 2.3 | publisher-roster-client.test.tsx | `16` |
| REQ-FR-03 (email add) | P2 | 2.2 | recipient-email-composer.test.tsx | `16` |
| REQ-FR-04 (resend) | P2 | 2.2 | project-publication-rotate-resend.test.ts | `16` |
| REQ-FR-05 (revoke) | P2 | 2.1 | project-publication-actions.test.ts | `16` |
| REQ-FR-06 (confirm access view) | P3 | 3.1 | publisher-activity-feed.test.tsx | `16` |
| REQ-FR-07 (rotate) | P2 | 2.1 | project-publication-rotate-resend.test.ts | `16` |
| REQ-A11Y-01/02 | P2,P4 | 2.1,2.3,4.1 | DOM + Playwright | `16` |

Full traceability (every requirement → task → test → rollout) is in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

---

## Blocked decisions table

| ID | Decision | Status | Owner | Recommendation | Unblock action |
|---|---|---|---|---|---|
| DEC-MOBILE | Mobile strategy: full layout (A) vs. guard+recovery (B) vs. hybrid (C) | owner-delegated (Option B default) | Philip (owner) | **Option B** | owner sign-off; if A, expand Task 1.3 |
| verification-cap | emulated verification → status cap | external | independent reviewer / owner | independent review or owner acceptance | second-native-agent or human review |
| PERF-01 | hosted/production RUM proof deferred | deferred-to-impl | impl | run PERF-01 evaluator at impl time | build-chunk + Profiler evidence |
| workflow-pack-dep | honest-delivery labels landing | external | sibling pack | consume labels; graceful fallback if delayed | coordinate via `10` serialization |

---

## Stale-plan revalidation checklist (run before first edit)

- [ ] `git status` clean / understand any concurrent-agent changes (`AGENTS.md` Section 6).
- [ ] `rg "min-\[768px\]" src/components/workshop/publisher/PublisherRosterClient.tsx` still shows the guard at ~`:224`/`:228`.
- [ ] `rg "assertProjectPublicationManager" src/lib/publication/actions.ts` still present.
- [ ] `rg "SHARED_LINK_RECIPIENT_RESEND_" src/lib/publication/actions.ts` — confirm resend rate-limit constants.
- [ ] `bun run type-check` green on main (baseline).
- [ ] Confirm DEC-MOBILE with Philip (Option B unless he picks A/C).
- [ ] Confirm sibling `client-ready-proposal-package-workflow` status — serialize Phase 2 if it has landed/landing.
- [ ] Re-read `03` (source audit) + `06` (architecture) + `07` (data) + `11` (this impl plan).

---

## Commands to run before the first edit

```
git status
git diff --check
rg "min-\[768px\]|assertProjectPublicationManager|SHARED_LINK_RECIPIENT_RESEND_" src/lib/publication/actions.ts src/components/workshop/publisher/PublisherRosterClient.tsx
bun run type-check
```

---

## Files explicitly off-limits (this pack's scope)

- `src/components/workshop/proposals-page/*` and `src/lib/recipient-proposals/*` — recipient inbox (sibling pack).
- `src/lib/proposal-export/*` — export integrity (sibling deliverable-trust pack).
- `src/app/api/share/[token]/*` contracts — public share/activity (sibling activity-minimization pack).
- Readiness/Preflight/gating/owner-message/`responded`/notifications logic in `src/lib/publication/actions.ts` — sibling workflow pack (this pack is **audit-only** on `actions.ts`).
- `src/lib/publication/security.ts` credential crypto — audit-only (no redesign).
- `migrations/*` — no migration in this pack (`0037` belongs to the workflow pack).

## Files this pack owns (for implementation)

- `src/components/workshop/publisher/PublisherRosterClient.tsx` (mobile reachability)
- `src/components/workshop/publisher/PublisherEmptyState.tsx` (mobile message + copy-URL)
- `src/components/workshop/publisher/PublisherRosterRow.tsx` (action clarity)
- `src/components/workshop/publisher/PublisherDrawer.tsx` (state/a11y — **serialize with workflow pack**)
- `src/components/workshop/publication/RecipientEmailComposer.tsx` (clarity/states — **serialize with workflow pack**)
- `src/components/workshop/publisher/PublisherActivityFeed.tsx` (audit/proof surfacing)

## Files and systems intentionally unaffected

- R2, Durable Objects, Queues, Cron, Better Auth, Cloudflare WAF/DDoS, Turnstile, KV, Hyperdrive.
- `wrangler.jsonc`, `cloudflare-env.d.ts` (no binding changes → no `cf:typegen`).
- D1 schema (`migrations/*`) — no migration.
- Public share route contracts (`/share/[token]`, `/api/share/[token]/*`).
- Credential cryptography (`security.ts`).
- Authz (`assertProjectPublicationManager`) — audited, unchanged.

---

## External proof required before production rollout

- Closed-beta manual smoke: generate/copy/email/resend/revoke/rotate on desktop + the 375px mobile message + copy-URL + deep-link.
- PERF-01 evaluator evidence (build-chunk comparison + drawer-open Profiler median within threshold).
- (If independent review not obtained) owner acceptance of the emulated verification to lift the status cap.

## Archive policy

**Do not archive automatically.** Archive only after full implementation + closed-beta verification confirms the owner sender workflow is operable across devices. Named completed slices (e.g., Phase 1 mobile recovery) may be archived independently if the rest stalls on DEC-MOBILE Option A.

---

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master /goal, lanes, skills, ledger, file-scope ownership, verification mode |
| `01_EXECUTIVE_SUMMARY.md` | What/why, target-state, status, stop-condition check |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope (S1–S14), non-goals (N1–N7), assumptions |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source map + codebase inventory (file:line) + gaps |
| `04_REQUIREMENTS_SPECIFICATION.md` | Stable IDs (REQ-*), ACs, shadow-path matrices (S1–S6) |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, state matrix, DEC-MOBILE, a11y, design-system reuse |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture (Mermaid), reuse map, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | No-migration rationale, access-path matrix, credential taxonomy |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model for in-scope changes, "copy URL" no-new-exposure proof |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | PERF-01 evaluator, budgets, failure modes, observability |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Classified impact, parallelization, sibling-pack dependency map |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases, work packages, durable-goal ledger |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix, commands, AQ-1..10 adversarial matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Gates, PERF rollout gates, rollback, runbook |
| `14_RISK_REGISTER.md` | RISK-* with mitigation; no unmitigated High/Critical residual |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-MOBILE/ARCH-1/2/3/LABELS-1/SCOPE-1 + rejected alternatives |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement → task → test → rollout (no untraced REQ) |
| `17_FINAL_READINESS_REVIEW.md` | Scores, verification-mode cap, deficiencies, smallest actions to READY |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack production decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, critique cycles (2), AQ matrix, evidence gaps |
| `22_ATTACK_SURFACE_INVENTORY.md` | Server Action entry points, authz, DTO minimization, rate posture |
| `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md` | Per-route boundary/cache (Cache Components verified OFF; `revalidatePath`) |
| `24_FINAL_VERIFICATION_MATRIX.md` | Requirement-by-requirement audit + evidence-class table |
| `25_INVENTORY_AND_SOURCE_MAP.md` | Phase-1 inventory, source hierarchy, assumption/evidence/missing-source maps |
| `26_BASELINE_SCORECARD.md` | Per-document baseline scorecard + before/after (Improve-Plan) |
