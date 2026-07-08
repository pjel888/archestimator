# 02 — Feature Brief and Scope

## Source brief

Verbatim from `PROMPT.md` (the authoritative feature brief):

> **Goal:** Create a plan pack for recipient proposal inbox IA, email-link continuity, wrong-account recovery, expired/revoked links, and review decision states.
>
> **Evidence To Start From:**
> - `src/components/workshop/proposals-page/ProposalsEmptyState.tsx`, `ProposalRow.tsx`, and `proposals-page-client.tsx` define the signed-in proposal inbox.
> - `src/components/share/SharePageDecision.tsx` handles recipient decisions on shared links.
> - `e2e/shared-link-receiver.spec.ts` covers some browser proof but not all recovery states.
> - Public share activity and proposal package plans overlap but do not replace recipient IA work.
>
> **Required Plan Pack:** Map recipient personas, email matching, wrong-account states, no-proposal empty state, expired/revoked/error pages, decision history, notifications, tests, and privacy boundaries.
>
> **Constraints:** Avoid exposing owner/internal estimate data to recipients. Treat link token behavior as security-sensitive and coordinate with invite/share security plans.
>
> **Stop Condition:** The pack is complete when recipient review and recovery can be implemented without product ambiguity.

### Evidence-starting-point path corrections (from codebase audit)

The brief names three files under `src/components/workshop/proposals-page/`. The audit found:

- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` — exists. Pure presentational empty state.
- `src/components/workshop/proposals-page/ProposalRow.tsx` — exists. `"use client"`, server-action "Review" form.
- `src/components/workshop/proposals-page/proposals-page-client.tsx` — **does NOT exist at that path.** The signed-in client orchestrator lives one level up at `src/components/workshop/proposals-page-client.tsx`. The `proposals-page/` subdirectory contains only presentational sub-components (`ProposalRow`, `ProposalsList`, `ProposalsEmptyState`, `ProposalsErrorState`, `ProposalsListSkeleton`).

This is a documentation correction, not a scope change. The intended surfaces are all real.

## In-scope workstreams

This pack plans the following, each tied to a requirement cluster in `04_REQUIREMENTS_SPECIFICATION.md`:

| Workstream | In scope | Requirement cluster |
|---|---|---|
| Recipient personas & IA | Map the distinct recipient entry points and reconcile them into one coherent inbox experience | FR-01, UX-01 |
| Email matching | Decide and document how a recipient is matched to proposals (email-string vs session-bound) | FR-05, SEC-02, OPEN-IA-01 |
| Wrong-account recovery | A differentiated recovery flow when the signed-in email ≠ the proposal's recipient email | FR-06, UX-04, SEC-04 |
| No-proposal empty state | Distinguish "no proposals" from "you may be signed in as the wrong email" | FR-04, UX-03 |
| Email-link continuity | Bridge the public-share entry to the signed-in inbox and back | FR-02, FR-03, ARCH-02 |
| Expired/revoked/error pages | Differentiated, actionable recovery copy for each terminal link state | FR-09, FR-10, UX-06 |
| Decision states & history | Surface decision finality, recorded decision, and (V2) history clearly | FR-11, FR-12, UX-09 |
| Notifications | Document the email-only V1 path and the in-app dependency | FR-14, ARCH-06 |
| Privacy boundaries | Guarantee no owner/internal estimate data leaks to recipients | SEC-06, SEC-07 |
| Tests | Map existing coverage and required new coverage for every recovery state | TEST-01 … TEST-08 |

## Explicit non-goals

| Non-goal | Owned by / reason |
|---|---|
| Implementing any of the above | This is a planning-only pack. |
| Owner-side publisher workflow (publish, rotate, revoke, recipient management, owner digest) | `2026-07-07-client-ready-proposal-package-workflow` — explicitly fences `proposals-page/*` and `recipient-proposals/*` as off-limits to itself, deferring recipient read/unread to this pack. |
| Immutable-export trust properties (content hashing, staleness stamping, redaction) | `2026-07-07-proposal-export-and-immutable-deliverable-trust`. |
| Publication token credential hardening (HMAC/AES-GCM/pepper separation) | `2026-07-07-invite-token-flow-hardening` (publication crypto already sound; this pack coordinates, does not change it). |
| Public activity-route data minimization | `2026-07-07-public-share-activity-minimization`. |
| Authz matrix for all 33 API routes | `2026-07-07-owasp-api-authz-matrix-refresh`. |
| Landing→beta→login→terms→workshop trust onboarding | `2026-07-07-public-to-beta-trust-onboarding-continuity`. |
| Changing the decision immutability schema (allowing revision) | Out of V1 scope; OPEN-IA-03 defers to a future pack. |
| Enabling in-app notification dispatch for recipient events | Phase 5 of client-ready-proposal-workflow, DATA-04 discovery-gated; OPEN-IA-04. |
| Cloudflare Email inbound/bounce ingestion | BLOCKED-EXTERNAL per client-ready-proposal-workflow REL-01. |

## Constraints

1. **Privacy:** The recipient-visible DTO is the whitelisted snapshot, not live workspace data (decision `:793` in `decisions.md`). The recipient-proposals repository must never select token hashes, encrypted tokens, recipient tokens, or password hashes (already proven by `recipient-proposals-repository.test.ts`).
2. **Token sensitivity:** Publication and recipient raw tokens are credentials. They appear only in the URL and the `?recipient=` email link; they are never logged, rendered, or persisted raw. See `08_SECURITY_PRIVACY_THREAT_MODEL.md` credential taxonomy.
3. **Sibling coordination:** Six sibling packs touch overlapping surfaces. This pack stays within its fenced file scope (see `10_BLAST_RADIUS_AND_DEPENDENCIES.md`) and references sibling decisions rather than duplicating or contradicting them.
4. **Shared worktree:** Multiple agents/humans may be active. No branch/worktree operations; file-scope ownership and fresh `git status` checks before edits. Latest migration at planning time is `0039_project_status.sql` — any new migration must re-check `ls migrations/ | sort | tail -3`.
5. **Stack:** Next.js 16 + React 19 + TanStack Query + D1 `ARCH_DB` + signed `shared_link_session_*` cookies + Better Auth + Cloudflare Email. See `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`.

## Success metrics (planning-level, observable after implementation)

- A recipient in any terminal link state (expired, revoked, invalid, wrong-account, no-session, already-decided) sees copy that names the state and offers a recovery action or a clear "ask the sender" path — never a generic wall.
- The inbox empty state distinguishes "no proposals for this email" from "you may be signed in as the wrong email" with a sign-in-as-correct-email affordance.
- A recipient's recorded decision is visible in both the inbox row (chip + "Last activity") and the share page (locked badge), with finality communicated without contradicting the immutability constraint.
- Every recovery state has at least one automated test (unit/DOM) covering the user-visible copy and the recovery action; receiver E2E is documented as opt-in and its skip rationale recorded.
- No owner/internal estimate field appears in any recipient-visible DTO, confirmed by the existing repository credential-free assertion and (recommended) a new DTO-shape assertion.

## Failure metrics (what would make this plan a failure)

- The pack leaves any recovery state ambiguous (no copy, no recovery action).
- The pack exposes or recommends exposing owner/internal data or raw tokens to recipients.
- The pack duplicates or contradicts a sibling pack's fenced scope.
- The pack recommends a schema change that is not paired with a rollback/fix-forward strategy.
