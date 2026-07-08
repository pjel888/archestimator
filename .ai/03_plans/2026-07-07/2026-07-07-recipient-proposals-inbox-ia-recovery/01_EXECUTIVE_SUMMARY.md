# 01 — Executive Summary

## What this plan delivers

A complete planning package for the **recipient proposal inbox information architecture, email-link continuity, wrong-account recovery, expired/revoked link states, and review decision states** — the surface a proposal *recipient* uses to find, open, review, and decide on proposals sent to their email.

This is **planning only**. No application code, tests, migrations, or config are changed by this pack.

## The problem

Archestimator's recipient experience currently works for the happy path but collapses many failure states into ambiguous or missing recovery paths:

1. **Single generic "unavailable" wall.** Invalid, expired, and revoked tokens all render the identical `not-found.tsx` copy ("This shared proposal is unavailable — Ask the sender for a fresh link.") with no differentiation. The richer `/invite/[token]` flow already differentiates these states — the share flow does not.
2. **Wrong-account is an inline error, not a recovery flow.** When a recipient is signed in as a different email than the one a proposal was sent to, they see a per-row inline message ("This proposal is not assigned to your signed-in email."). There is no "sign in as the right account" continuation, unlike the invite flow's `archestimator_pending_invite` bridge cookie.
3. **No decision history.** The `shared_link_responses` unique partial index makes a decision immutable (one row per recipient per publication), but the UI does not surface finality clearly and there is no history view. The copy-contract test even asserts the dialog does *not* warn that decisions are final.
4. **No email-link → inbox continuity.** A recipient who clicks the email link lands on the public share page (session-cookie-bound), not the signed-in inbox. There is no bridge from "I just acted on a public link" to "show me my inbox of all proposals."
5. **No-proposal empty state is email-bound.** The empty state says "Proposals sent to your signed-in email address will appear here" — correct, but there is no recovery when the recipient is signed in as the wrong email (the empty state is indistinguishable from "you have no proposals" vs "you are signed in as the wrong account").
6. **Test coverage is thin on recovery states.** The only receiver E2E spec (`e2e/shared-link-receiver.spec.ts`) is entirely skipped without `ARCHESTIMATOR_E2E_SHARED_LINK=1` and missing fixtures, and covers none of the recovery states.

## The target state

A recipient can, without product ambiguity:

- **Find** proposals sent to them via the signed-in `/workshop/proposals` inbox, with a clear empty state that distinguishes "no proposals" from "you may be signed in as the wrong email."
- **Open** a proposal from the inbox or from an email link, with the two entry points reconciled into one coherent session.
- **Recover** from wrong-account, expired, revoked, invalid, no-session, and already-decided states via differentiated, actionable copy and continuation paths — modeled on the existing invite-flow recovery patterns.
- **Decide** on a proposal with clear finality, and see their recorded decision in both the inbox (decision chip + history) and the share page (locked badge).
- **Trust** that owner/internal estimate data is never exposed to them and that link tokens are treated as security-sensitive credentials.

## Major findings

- **Architecture:** The inbox (`/workshop/proposals`, signed-in, email-keyed) and the share page (`/share/[token]`, session-cookie-bound) are two distinct auth surfaces that currently do not coordinate identity. The `openRecipientProposalAction` bridges them by minting a session cookie for passwordless publications, but there is no reverse bridge (share → inbox) and no wrong-account interstitial.
- **Data:** `shared_link_responses` has a partial unique index `(recipient_id, publication_id) WHERE recipient_id IS NOT NULL` → one immutable decision per recipient per publication. No schema change is required for V1; the IA work is primarily UI/copy/routing.
- **Security:** Recipient listing uses lowercased-email matching in SQL (`lower(recipient.email) = ?`), which is weaker than the token-bound `recipientId` available in the P5 session cookie. The credential model (HMAC token hash + AES-GCM encrypted token + signed session cookies) is sound; the gap is in *identity coordination*, not crypto.
- **Blast radius:** Touches the proposals-page-client, the proposals-page sub-components, the share-page not-found/error/session-alert surfaces, the recipient-proposals repository, and the openRecipientProposalAction. Does **not** touch the publication token crypto, the decision API contract, the owner-side publisher UI, or the data model (V1).
- **Coordination:** Six sibling plan packs touch overlapping surfaces (`invite-token-flow-hardening`, `public-share-activity-minimization`, `public-to-beta-trust-onboarding-continuity`, `owasp-api-authz-matrix-refresh`, `client-ready-proposal-package-workflow`, `proposal-export-and-immutable-deliverable-trust`). All are `CONDITIONALLY READY` with `emulated` verification. This pack must stay within its fenced file scope and reference sibling decisions, not duplicate them.

## Critical decisions (summary)

- **DEC-IA-01:** Keep email-based listing for V1 (low churn, matches current D1 index) but make the acting path session-aware. See OPEN-IA-01.
- **DEC-IA-02:** Differentiate expired/revoked copy but keep unknown-token copy generic (anti-enumeration). See OPEN-IA-02.
- **DEC-IA-03:** Keep decisions immutable for V1; surface finality clearly. See OPEN-IA-03.
- **DEC-IA-04:** Email-only notifications for this pack. See OPEN-IA-04.

## Readiness scores (initial → final)

Initial scores are recorded after the first synthesis; final scores after the emulated adversarial + verifier passes. See `17_FINAL_READINESS_REVIEW.md`.

| Category | Initial | Final |
|---|---|---|
| Product strategy | 92 | 95 |
| Scope clarity | 94 | 97 |
| Requirements completeness | 90 | 96 |
| UX and UI readiness | 88 | 94 |
| Accessibility readiness | 86 | 93 |
| Architecture readiness | 90 | 95 |
| Data and database readiness | 92 | 96 |
| API and network readiness | 90 | 95 |
| Security and privacy readiness | 88 | 94 |
| Performance and scalability readiness | 92 | 95 |
| Reliability and operational readiness | 90 | 94 |
| Blast-radius coverage | 92 | 97 |
| Testing and validation readiness | 88 | 95 |
| Rollout and rollback readiness | 90 | 95 |
| Requirements traceability | 90 | 97 |
| Overall implementation readiness | 90 | 95 |

Overall readiness is capped at **95** by the `emulated` verification mode (which caps at 97) combined with the four owner-gated open decisions, each of which has a recommended path but is not owner-resolved. The package is `CONDITIONALLY READY`: implementation can proceed on the recommended path of each open decision, or pause on a named slice pending owner sign-off.

## Stack-contract summary (one line)

Next.js 16 App Router (Server Components + a single `"use client"` boundary per surface) + React 19 + TanStack Query (recipient-proposals list) + D1 `ARCH_DB` (read-only listing query, no V1 migration) + signed `shared_link_session_*` cookies (P5 session) + Better Auth session (app identity) + Cloudflare Email (invitation + owner digest, both currently delivery-gated).

## Next step for an implementer

Read `README.md` (entrypoint), then `11_IMPLEMENTATION_PLAN.md` (execution guide). Phases are dependency-ordered. The first implementer must run the stale-plan revalidation checklist in `README.md` before editing, because six sibling packs are concurrently evolving the publication surface.
