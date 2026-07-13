# 15 — Decisions, Assumptions, and Alternatives

## 15.1 Major decisions (load-bearing)

### DEC-01 — Product-led activation; no required intake gate
- **Problem:** How does a first user reach first value?
- **Options:** (A) required onboarding wizard; (B) product-led empty states + durable milestones; (C) full Joyride tour library.
- **Recommended/selected:** **B**.
- **Rationale:** Owner decision `decisions.md` 2026-05-27 forbids a required intake; `auth-onboarding-guard.test.ts` enforces it. Joyride is a heavyweight dependency for closed beta. Empty states + milestones are cheaper, match the no-gate posture, and reuse the existing `EmptyState` primitive.
- **Rejected alternatives:** A (forbidden), C (over-engineered + stale Supabase assumptions).
- **Conditions that would change it:** Owner reopens a required-intake decision → reassess.

### DEC-02 — Durable milestones via one row per workspace (not per-tour)
- **Problem:** How does the system know which rung a user reached?
- **Options:** (A) per-user onboarding profile table (Joyride plan's `user_onboarding_tours`); (B) one `workspace_activation_milestones` row per workspace with timestamp columns; (C) client-side localStorage only.
- **Selected:** **B**.
- **Rationale:** One row per workspace is enough ("did this workspace reach rung N?"); server-authoritative (survives device switches); cheap (single-row PK); compatible with the workspace-scoped D1 authz model. A is Supabase-stale and over-engineered. C is lossy and can't drive server-side decisions.
- **Rejected alternatives:** A, C.

### DEC-03 — Server-emitted structured events; no third-party SDK in `/workshop` for closed beta
- **Problem:** How do we measure the funnel without a paid analytics add-on?
- **Options:** (A) third-party SDK (Posthog/Segment/etc.) in `/workshop`; (B) server-emitted structured events to the observability log; (C) no analytics.
- **Selected:** **B**.
- **Rationale:** Free-tier posture; no client bundle cost; no consent surface needed for first-party operational telemetry; mirrors the existing `estimate-mutation-telemetry.ts` pattern. A is deferred to OPEN-DEC-02 (consent-gated, separate review). C fails the roadmap's Required Analytics Events.
- **Rejected alternatives:** A (now), C.

### DEC-04 — Reuse `EmptyState` primitive; add no tour library; `/workshop/onboarding` stays a redirect
- **Rationale:** ARCH-001; avoids dependency sprawl; honors owner's compatibility-redirect decision.

### DEC-05 — Keep the empty estimate-creation path; offer seeded only via explicit template choice
- **Rationale:** `estimate-sheet-create-empty-tree.test.ts` + `estimate-empty-tab-state.test.tsx` encode the contract; silently switching to `createEstimateWithDefaultTree` would regress both. The empty-tab affordance already routes users to templates.

## 15.2 Open decisions (owner-isolated)

### OPEN-DEC-01 — Sample/demo data policy (BLOCKS Phase 7)
- **Problem:** Should a first user have starter content?
- **Options:**
  - **(a) None** — pure empty workspace; user creates everything. Simplest; matches current state; lowest risk of "fake" data confusion.
  - **(b) Opt-in starter sample project** — welcome panel offers "Or explore a sample project"; inserting it creates real rows under the caller's workspace (SEC-002). Recommended: gives first users a concrete estimating example without forcing it.
  - **(c) Templated demo only** — surface the existing in-code `estimateTemplates` ("Condo Fit-Out Starter") more prominently via the empty-tab "Browse templates" affordance, without a full sample project. Lowest-data option.
- **Recommendation:** **(b)** opt-in sample project, defaulting to off, because the wedge persona is construction-style estimating and a concrete sample accelerates first value. But (c) is a safe minimum if the owner prefers zero seeding.
- **Decision owner:** Philip.
- **Implementation impact:** Phase 7 is `BLOCKED-EXTERNAL` until resolved. Phases 0–6 + 8 are implementation-ready regardless.

### OPEN-DEC-02 — Collaborator welcome + analytics SDK upgrade
- **Problem:** (i) Do invited collaborators who adopt an empty workspace see the welcome panel? (ii) When does the project move from server logs to a consent-gated analytics SDK?
- **Options (i):** show panel to any workspace member when `projectCount===0` (simplest) vs collaborator-specific copy vs hide for collaborators. Recommendation: show to any member when empty (simplest, consistent).
- **Options (ii):** defer SDK to post-beta (recommended for free-tier posture) vs add consent-gated SDK now. Recommendation: defer.
- **Decision owner:** Philip.
- **Implementation impact:** (i) minor copy/visibility decision (does not block). (ii) Phase 9 `BLOCKED-EXTERNAL` (optional).

## 15.3 Assumptions register

(Validated unless marked.)

- ASSUMP-01 — No required intake gate (validated: `auth-onboarding-guard.test.ts`).
- ASSUMP-02 — Closed-beta = admin-invited allowlist only (validated: `src/app/signup/page.tsx`).
- ASSUMP-03 — Terminal rung = existing mutable XLSX + shared-link publication (validated: `proposal-package-system.md`).
- ASSUMP-04 — Empty-tab affordance is canonical first-area surface (validated: `estimate-empty-tab-state.test.tsx`).
- ASSUMP-05 — Free-tier cost ceiling (validated: `AGENTS.md`).
- ASSUMP-06 — New D1 milestones table acceptable under standing mandate (validated: `AGENTS.md`).
- ASSUMP-07 — Homebase summary RPC is the right place to add `activationMilestones` (validated: `workshop-homebase-summary-rpc-contract.test.ts` + `WorkshopPage` already batches it).
- ASSUMP-08 — `ensureDefaultWorkspace` is the right hook to seed row 0 (validated: it runs on first protected-route access).

## 15.4 Conditions that would change major decisions

- Owner reopens required-intake → DEC-01 changes → plan rework.
- Owner wants immutable/PDF packages now → terminal rung expands → sibling stub pulled in.
- Owner approves a paid analytics add-on → DEC-03 changes → consent-gated SDK added (Phase 9).
- D1 free-tier limits hit by the table → not realistic at 1 row/workspace, but if so, fall back to client localStorage (lossy) + server reconciliation.

## 15.5 Rejected alternatives (summary)

- Joyride/tour library (DEC-01).
- Per-tour Supabase table (DEC-02).
- Third-party analytics SDK in `/workshop` now (DEC-03).
- Required onboarding wizard at `/workshop/onboarding` (DEC-01, owner-forbidden).
- Re-adding cleared library overview content (owner-intent conflict).
- Silently switching to `createEstimateWithDefaultTree` (regresses tests).
