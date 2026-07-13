# 02 — Feature Brief and Scope

Source: `.ai/03_plans/2026-07-07-publisher-owner-mobile-sender-readiness/PROMPT.md` (the authoritative FEATURE BRIEF), interpreted under `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md`.

---

## Feature brief (verbatim, condensed)

> Create a plan pack for proposal **publisher owner workflows on desktop and mobile**, with **reliable sender actions and recovery paths**.
>
> Evidence to start from: `PublisherRosterClient.tsx` (mobile width messaging that can block owner workflow); `PublisherEmptyState.tsx`, `PublisherDrawer.tsx`, `RecipientEmailComposer.tsx`; sender flow needs a clear checklist for **generate, copy, email, resend, revoke, confirm client access**.
>
> Required plan pack: desktop/mobile owner flows, sender states, email/copy/share actions, resend/revoke rules, mobile fallback, errors, audit/proof, accessibility checks, tests.
>
> Constraint: do **not** require full mobile parity for heavy estimating if a deliberate desktop guard is chosen; **document the product decision and proof**.
>
> Stop condition: the pack is complete when proposal sending can be planned as an **owner-operable workflow across expected devices**.

## Stakeholders
- **Owner / sender:** workspace or project `owner`/`admin` (rank ≥ 30 via `assertProjectPublicationManager`), incl. platform `ceo`/`admin` bypass.
- **Recipient (downstream):** the client who receives the emailed link — affected by rotate/revoke but owned by the recipient-inbox + share packs.
- **Reviewer/approver:** Philip (owner) — owns the mobile-parity product decision (DEC-MOBILE).
- **Implementation AI:** future executor of this pack.

## Success metrics (planning)
- Every sender action has a defined state matrix and is traced to code + test (count = 6 actions: generate, copy, email, resend, revoke, confirm-access).
- Mobile decision is resolved with a documented rationale and proof path.
- Zero scope overlap with the four sibling packs (file-scope ownership matrix in `00`).
- Planning package scores ≥ 90 overall readiness under the suite rubric (emulated cap applies).

## Failure metrics (planning)
- Any sender action left without a failure/recovery state.
- Mobile decision left as "TBD" without an owner/options/recommendation.
- Any duplication of the workflow pack's readiness/gating/Preflight work.
- Any `TODO`/`TBD` placeholder without owner + options + recommendation.

## Scope items (S1–S14)

| ID | Scope item | In/Out | Owner |
|---|---|---|---|
| S1 | Mobile owner reachability decision (guard vs. layout) for the publisher roster | IN | this pack (DEC-MOBILE) |
| S2 | Sender action clarity: per-action state matrix (generate/copy/email/resend/revoke/confirm-access) | IN | this pack |
| S3 | Owner-side error, pending, success, and recovery UI states for each sender action | IN | this pack |
| S4 | Resend/revoke rules surfaced honestly to the owner (rate limit, token-rotation invalidates emailed links, revoke blocks access) | IN | this pack (surfacing) — logic lives in `actions.ts` |
| S5 | Mobile fallback path (what the owner can/cannot do on mobile, and how they recover) | IN | this pack |
| S6 | Accessibility for owner sender actions (keyboard, focus, screen-reader, responsive) | IN | this pack |
| S7 | Audit/proof design for sender transitions (structured logs + activity feed) | IN | this pack |
| S8 | Test/validation strategy + adversarial QA matrix for owner sender behavior | IN | this pack |
| S9 | Owner-side delivery-honesty surface (e.g., "sent" vs. provider-confirmed) — **consume** the workflow pack's labels when landed | IN (consume) | this pack |
| S10 | Coordination boundary with `client-ready-proposal-package-workflow` (readiness/Preflight/gating) | IN (coordination) | this pack |
| S11 | Recipient inbox IA/recovery | OUT (N1) | recipient-inbox pack |
| S12 | Readiness/Preflight model + owner message + `responded` + notifications + honest delivery labels | OUT (N2) | workflow pack |
| S13 | Snapshot immutability / export integrity / SHA-256 content addressing | OUT (N3) | deliverable-trust pack |
| S14 | Public share activity minimization / `/api/share/[token]/activity` contract | OUT (N4) | activity-minimization pack |

## Assumptions (ASSUMP-*)

| ID | Assumption | Source strength | Validated? |
|---|---|---|---|
| ASSUMP-1 | The sender backend (`create/republish/rotate/revoke` + recipient `add/list/resend/remove`) is fully wired and not stubbed. | repo evidence (Explore lane, `actions.ts`) | YES — confirmed |
| ASSUMP-2 | The mobile block is purely CSS (`min-[768px]`) with no JS media-query hook anywhere in the publisher tree. | repo evidence (`PublisherRosterClient.tsx:224,228`; grep for `useMediaQuery`/`useIsMobile` = none) | YES — confirmed |
| ASSUMP-3 | Cloudflare Email is the only live outbound provider; the `resend_*` columns are legacy naming. | repo evidence (`cloudflare-email-client.ts`, empty `webhooks/resend/`) | YES — confirmed |
| ASSUMP-4 | `delivery_status` cannot transition to `bounced`/`opened`/`responded` from provider signals today (no webhook). | repo evidence | YES — confirmed; this is the workflow pack's REL-01, not duplicated here |
| ASSUMP-5 | Philip will accept a **documented desktop guard** for the *heavy* parts of the sender surface if it is paired with a mobile-capable critical path. | owner-intent inference (PROMPT constraint) | PARTIAL — captured as DEC-MOBILE, owner-delegated planning decision |
| ASSUMP-6 | The workflow pack's Phase-6 owner-UX gating changes will land (or be planned) before this pack's drawer/composer edits. | sibling README (CONDITIONALLY READY) | TREATED AS DEPENDENCY |

## Constraints (from PROMPT + repo)
- Planning-only: no app code, tests, migrations, provider state changes.
- `DESIGN.md:519-524`: mobile should prioritize dashboard/project list/proposal preview; dense editing becomes simplified flows, not a squeezed table.
- `DESIGN.md:547-548`: do not add page gradients to inner publisher content (only the canvas wash `.publisher-canvas-wash`).
- Shared live worktree: no branch/worktree actions; coordinate by file ownership (`AGENTS.md` Section 6).
- Free-tier Cloudflare cost posture: no new paid add-ons.

## Non-goals restated
See N1–N7 in `00_AGENT_COORDINATION.md`. The most important non-goal is **N2**: this pack does not build readiness/Preflight/gating/owner-message — it consumes and coordinates with them.
