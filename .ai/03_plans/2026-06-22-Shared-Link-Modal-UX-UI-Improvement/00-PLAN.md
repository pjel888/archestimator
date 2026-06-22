# 00 — PLAN · Shared-Link Modal UX/UI Improvement

**Status:** PLANNING (no code changes — this pack is an audit + target design + implementation plan only)
**Date opened:** 2026-06-22
**Owner (lead):** Claude (product judgment / planning / integration)
**Surface in focus:** the share modal that opens from the share icon — `src/components/workshop/ProjectPublicationHeader.tsx` (the `<Modal>` rendered on `open`) and its supporting surface (`RecipientEmailComposer`, `SharedLinkActivityFeed`, the `Modal` primitive, `control-input`).

---

## 1. Goal

Produce an exhaustive, code-grounded **UX/UI improvement plan** for the shared-link (publication) modal — the dialog that opens when a user presses the share icon in the workshop header. The current experience is overloaded: a single 1329-line modal performs ~7 jobs (create/republish/rotate/revoke publication, copy link, set password, set expiry, set location visibility, select estimates, view activity, invite recipients, confirm destructive actions). The plan must (a) audit what is bad and why, (b) design a better target experience, and (c) specify a low-risk implementation path — **without writing any code in this pass.**

## 2. Scope (in)

- The sender-side share modal: `ProjectPublicationHeader.tsx`, the `Modal` primitive, `control-input`, `RecipientEmailComposer`, `SharedLinkActivityFeed`.
- All states: unpublished → published → expired → revoked; loading/optimistic/success/error; empty; stale-snapshot warning; destructive confirm.
- Flows: open/close, publish, copy link, rotate link, revoke, set password, set expiry, set location visibility, select estimates, refresh snapshot, invite/resend/remove recipients, view activity.
- Visual hierarchy, information architecture, information density, progressive disclosure, responsive behavior.
- Accessibility: focus management, keyboard model, ARIA, labels, contrast, reduced motion.
- UX copy: labels, button text, helper/error text, empty states.
- Alignment to the live design direction (DESIGN.md): grey canvas, Paper modal surface, liquid-glass chrome, `#5D5D5D` (never `#7F7F7F` for load-bearing text), 3px/8px/12px radii.

## 3. Non-goals (out)

- Any code change. This pack is **planning only**. Implementation is a separate, later pass.
- The receiver-side experience redesign (only referenced as context for how modal settings land on the receiver page). `ShareContainer`/`ShareReviewWorkspace` are read for impact, not redesigned here.
- Backend/RPC/RLS/DB changes to the publication contract (only surfaced as constraints/risks).
- Other modals in the app (though shared patterns may be cited).

## 4. Deliverables (this pack)

| # | Doc | Owner | Phase |
|---|-----|-------|-------|
| 00 | PLAN (this) | lead | scaffold |
| — | LOOP_LEDGER.md | lead (append-only) | all |
| 01 | CURRENT-STATE-AUDIT | lead, from audit agents | A+B |
| 02 | PROBLEM-REGISTER (prioritized, root causes) | lead, from synthesis agent | B |
| 03 | TARGET-UX-AND-FLOWS | lead, from design agents | C+D |
| 04 | TARGET-UI-AND-LAYOUT (incl. glass/paper, responsive) | lead | C+D |
| 05 | A11Y-AND-INTERACTION (focus, keyboard, motion) | lead | C+D |
| 06 | UX-COPY (labels, errors, empty states) | lead | C+D |
| 07 | COMPONENT-AND-FILE-PLAN (what changes, contracts) | lead | D |
| 08 | IMPLEMENTATION-GUIDE (phased, lowest-risk-first) | lead | D |
| 09 | VERIFICATION-AND-QA-PLAN | lead | D |
| 10 | BLAST-RADIUS-AND-ROLLBACK | lead | D |
| 11 | ADVERSARIAL-QA-LEDGER (verdicts + reconciliations) | lead, from QA agents | E |
| — | README.md (index) | lead | F |

## 5. Orchestration (who owns what / disjoint scopes)

- **Lead (Claude)** is the sole file writer for every plan doc. Research/design/QA agents are **read-only** and return structured findings — this eliminates file-write races in a shared tree where multiple agents may operate.
- **Phase A — parallel audit (6 read-only agents):** code-structure, ux-flows, visual-ui, a11y, data-contract, receiver-context.
- **Phase B — synthesis (1 agent + lead):** dedupe + prioritize into the problem register; resolve cross-dimension conflicts.
- **Phase C — parallel design (5 read-only agents):** target-ux, target-ui, a11y-target, interaction-motion, ux-copy. Each receives the problem register.
- **Phase D — lead writes docs 03–10**, grounded in real code (file:line anchors).
- **Phase E — adversarial QA (5 reviewers):** coherence, feasibility/design-lens, a11y, scope-guard, code-anchoring. Reconcile into doc 11.
- **Phase F — lead finalizes** README index + LOOP_LEDGER COMPLETE.

## 6. Acceptance criteria (the plan is "done" when)

1. Every problem in the register is **anchored to real code** (file:line), severity-rated, and maps to a root cause.
2. The target design resolves every P0/P1 problem; nothing P0/P1 is dropped silently.
3. The file/component plan names **real, existing** files and respects the current data contract (`ProjectPublicationSummary`, the `publication/actions` API) — no invented APIs.
4. The a11y section is a concrete target spec (focus model, keyboard map, ARIA contract, contrast fixes), not platitudes.
5. The implementation guide is phased **lowest-risk-first** with a clear rollback story and explicit "what NOT to do" guardrails.
6. Adversarial QA (Phase E) is green on coherence, feasibility, a11y, scope, and anchoring — or residual risks are recorded honestly.
7. DESIGN.md direction is honored (Paper modal, `#5D5D5D` meta, 3/8/12 radii, no glass-as-decoration).

## 7. Stop condition

Stop when all acceptance criteria are met **or** an explicit blocker/owner decision is recorded with evidence. This is a planning task — "implemented" means "the plan is complete, verified, and code-grounded," not "code shipped."

## 8. Key constraints & hard contracts (carry into every doc)

- **Brand orange is clay `#AA412A` in product** (signal `#F24405` campaign-only). See `.ai/10_state/decisions.md` + memory.
- **Tertiary `#7F7F7F` is sanctioned by DESIGN.md but fails WCAG AA** — use secondary `#5D5D5D` for load-bearing meta text.
- **Modals are Paper surfaces** (white, `--hairline` border, soft floating shadow, 12px panel radius, 3px for dense inner controls). Liquid glass is for chrome/overlays-over-content, **not** as decoration on a content modal.
- **Only radii `3px` / `--glass-nav-radius` (8px) / `--glass-radius` (12px)** — no over-rounding.
- **DESIGN.md is an alpha guide, not law** — defer to Philip on design decisions; do not gate/block on design grounds. Surface options, recommend, proceed.
- **Server contract is fixed** for this plan: `createProjectPublication`, `republishProjectPublication`, `rotateProjectPublicationLink`, `revokeProjectPublication`, `refreshProjectPublicationSummary`, recipient CRUD (`list/add/resend/remove`), `loadSharedLinkActivity`, `readSharedLinkEmailDeliveryReadiness`. No new RPCs proposed without flagging as a follow-up.
