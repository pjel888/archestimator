# Project Shared Link Overhaul Plan Pack

**Date:** 2026-05-28
**Status:** Planning phase — not approved for implementation.
**Owner:** Product + Engineering
**Related V1 baseline:** `.ai/09_archive/store/2026-05-27-project-client-publication-complete/` (the "Public link" V1 that shipped the current `/share/[token]` surface)

---

## 1. North Star Vision

The **Shared Link** is not a simple data export or a public dump of project worksheets. Its North Star is a secure, interactive **Client Review Portal** where:
- The contractor or estimator can curatively present specific pricing sheets (hiding internal calculations or raw materials sheets).
- The client receives a clean, document-like, tabbed proposal experience (fully responsive for mobile and desktop).
- The client can post clarifying comments and make formal, immutable decisions (Accept or Decline/Revise) directly on the proposal.
- Communication and sign-offs are archived directly alongside the estimate history for auditability and compliance.
- Project owners receive timely, unobtrusive notifications when clients view, comment on, or decide on proposals.

---

## 2. Key Gaps & Gaps Cleared

Our codebase audit revealed a major positive finding: **the database schema and server actions already natively support selective sheet publishing** (via the `selected_estimate_ids` column on the `project_publications` table and `buildSnapshotForProject` parameters in `actions.ts`).

The current limitations are primarily visual and client-side:
1. **No sheet selection controls in the UI modal**: The manager modal does not list estimate sheets or allow the user to filter before creating a link.
2. **Receiver UI stacks all estimates vertically**: Renders multiple sheets as a single vertical stack with no tabbed navigation.
3. **No email targeting or invite integration**: No way to share to specific emails or track recipient delivery status.
4. **No interactive features**: No comments or accept/decline action flows.
5. **No owner notification loop**: When a client acts, the project owner has no inbox or signal.
6. **No OpenGraph / social preview**: Shared links look generic when pasted into Slack, iMessage, or email clients.

---

## 3. Plan Pack Contents (Read in Order)

1. [00-readiness-assessment.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/00-readiness-assessment.md) — current infra (email, auth, storage, design system, RLS posture), data model gaps, team/process readiness.
2. [01-audit-of-current-public-link-implementation.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/01-audit-of-current-public-link-implementation.md) — exact current files, data shapes, UI flows, snapshot contract, security model, API routes.
3. [02-blast-radius-analysis.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/02-blast-radius-analysis.md) — quantitative impact, risk register, mitigation, and AI-route isolation requirements.
4. [03-ux-ui-spec.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/03-ux-ui-spec.md) — personas, happy/sad paths, screen states, copy matrix, mobile behaviors, accessibility requirements.
5. [04-data-model-and-schema-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/04-data-model-and-schema-plan.md) — proposed table extensions, indexes, RLS strategy, migration approach, cleanup policies.
6. [05-security-privacy-auth-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/05-security-privacy-auth-plan.md) — threat model, signed token-binding flow, rate-limiting, headers, CORS, audit logging.
7. [06-implementation-phased-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/06-implementation-phased-plan.md) — delivery phases, exit gates, dependencies, rollback triggers.
8. [07-validation-release-gates.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/07-validation-release-gates.md) — QA verification, browser matrices, accessibility, legal compliance, performance budgets.
9. [08-api-routes-and-server-actions-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/08-api-routes-and-server-actions-plan.md) — exact API contracts for comments, decisions, email delivery, and recipient verification.
10. [09-component-architecture-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/09-component-architecture-plan.md) — React component breakdown, prop interfaces, state boundaries, file placement.
11. [10-notification-system-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/10-notification-system-plan.md) — how owners learn about client activity: in-app, email digest, and activity log.
12. [11-error-handling-and-resilience-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/11-error-handling-and-resilience-plan.md) — failure modes, retry logic, fallback UX, circuit breakers.
13. [12-testing-strategy-plan.md](file:///Users/philiplewis/archestimator/.ai/03_plans/project-shared-link-overhaul/12-testing-strategy-plan.md) — unit, integration, E2E, security, and load-test requirements.

---

## 4. Explicitly Out of Scope (Prevent Scope Creep)

To keep delivery focused and predictable, the following are **explicitly deferred**:
- **Real-time collaboration** on the shared link (no live cursors or simultaneous editing).
- **Payment collection / e-signatures** (DocuSign, Stripe integration).
- **Multi-language localization** (all copy remains English for V2).
- **Advanced analytics dashboard** for owners (open counts are sufficient; no heatmaps or time-on-page analytics).
- **Custom branding / white-labeling** of the receiver page.
- **Threaded comments** (V2 is flat chronological; threading is a future enhancement).
- **In-app video/audio messaging** within comments.

---

## 5. References & Guardrails

- **V1 Complete Pack**: `.ai/09_archive/store/2026-05-27-project-client-publication-complete/` (authoritative baseline).
- **Design System**: `DESIGN.md` (manager modal must follow strict compact SF Pro rules; receiver uses `proposalPaper` theme but maintains high density).
- **Agent Protocol**: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` (mandatory code-review-graph checkpoints before any edit).
- **No Coding Yet**: The project remains in the planning phase. Task packets must be opened under `.ai/04_tasks/` and approved by the owner before any file modifications.
