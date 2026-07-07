# Implementation Plan

> **Execution boundary:** This is the authoritative execution guide for the future implementation AI. `IMPLEMENTATION-READY` / `CONDITIONALLY READY` means **planning** is complete; it does not auto-authorize execution. The owner must approve implementation, and each phase has its own review/QA gate.

**Phase order:** **Phase 1** (origin + cookie-attr hardening — release-blocking, kill-switch-gated) → **Phase 2** (rate-limit fail-closed) → **Phase 3** (explicit revoke + migration `0037`) → **Phase 4** (direct-grant promotion-only) → **Phase 5** (pepper separation + `auth_trigger` cleanup — owner-gated) → **Phase 6** (non-regression + adversarial audit + hosted-proof extension).

Phases 1→2→3 are sequential (P2's disabled-flag short-circuit depends on P1's route changes being stable; P3's revoke UI depends on the route layer being hardened). P4 can run parallel to P3 (disjoint files in `actions.ts` but different functions — serialize on shared-file risk). P5 is owner-gated and independent. P6 follows all others.

## Phase 1 — Origin + cookie-attribute hardening (release-blocking, kill-switch-gated)

**Durable-goal contract:**
- **Goal ID:** P1-ORIGIN
- **Objective:** Close the fail-open origin guard and the cookie-attribute gap on the three mutating invite routes.
- **Scope:** `accept`, `sign-out`, `continue` routes; `invite-origin.ts`; `signOutForPendingInvite`; env examples.
- **Requirements covered:** SEC-01, SEC-02, SEC-04, ARCH-01, FR-03 (preserve).
- **Required evidence:** Updated `invite-accept-origin.test.ts`, `project-invite-sign-out-route.test.ts`; new `invite-continue-origin.test.ts`; green `bun run test -- invite-origin`; manual curl proof on preview.
- **Completion audit:** AC-SEC-01a-e, AC-SEC-02a-c, AC-SEC-04a-b all pass; FR-03 manual e2e on preview (signed-out invite → continue → accept).
- **Checkpoint artifacts:** `invite-origin.ts` diff, route diffs, test output.
- **Stop condition:** All Phase-1 ACs pass + FR-03 preview proof + 24h 403-rate monitoring plan in place.
- **Blocker condition:** If tightening blocks >1% of legitimate accept/continue traffic on preview → engage kill switch (`ARCHESTIMATOR_INVITE_ORIGIN_STRICT=false`) and replan.
- **Review gate:** Code review on `invite-origin.ts` rewrite + route edits.
- **QA gate:** Adversarial matrix AQ-01..AQ-05 (origin scenarios) pass.

### P1 Tasks

#### P1-T1 — Tighten `isAllowedInviteOrigin` to deny-on-missing in production
- **Task ID:** P1-T1
- **Req IDs:** SEC-01, ARCH-01
- **Objective:** Rewrite `isAllowedInviteOrigin` so that in production (`NODE_ENV==='production'` and host not localhost), a request with neither Origin nor Referer matching the app host is denied; the undeterminable-app-host branch also denies in production. In dev, preserve the allow path.
- **Why:** Closes the brief's confirmed permissive-origin finding (`invite-origin.ts:27,39`).
- **Target path (existing):** `src/lib/collaboration/invite-origin.ts` (rewrite `isAllowedInviteOrigin` L22-40; keep `readUrlHost`, `readAppHost`).
- **Target symbols:** `isAllowedInviteOrigin`, `readAppHost`.
- **Inputs/dependencies:** Optional env `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (default `true` in prod, ignored in dev). Read via `process.env`.
- **Detailed instructions:**
  1. Add a `isStrictInviteOriginEnabled()` helper reading `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (default true when `NODE_ENV==='production'`, false otherwise) — or read inline.
  2. In `isAllowedInviteOrigin`: derive `appHost`. If strict enabled: if `!appHost` → return `false`. If Origin present → return `originHost === appHost`. Elif Referer present → return `refererHost === appHost`. Else → return `false`. If strict disabled: preserve current behavior (the localhost/dev path).
  3. Add an inline comment documenting the production deny-on-missing policy and the kill switch.
- **Expected output:** A rewritten helper that denies on missing headers in prod.
- **Failure cases:** Over-blocking legitimate same-site POST (mitigated by Origin-on-form-POST); env-toggle relax.
- **Tests/val:** Extend `tests/vitest/invite-accept-origin.test.ts` with: no-header-POST-denied-in-prod, no-header-POST-allowed-in-dev, cross-host-denied, same-host-allowed, kill-switch-relaxes. Add a prod-vs-dev env switcher in the test.
- **Completion evidence:** Test output showing all cases pass.
- **Parallelization:** Sequential (single owner file).
- **Complexity:** Small.

#### P1-T2 — Add `isAllowedInviteOrigin` to `/invite/[token]/continue` (DISCOVERY-REQUIRED first)
- **Task ID:** P1-T2
- **Req IDs:** SEC-02
- **Objective:** Add the origin guard to the continue route on GET and POST, before the cookie is set.
- **Why:** `continue/route.ts` mints a state-changing cookie with no origin check today.
- **Target path (existing):** `src/app/invite/[token]/continue/route.ts`.
- **Target symbols:** `continueToAuth` (L39).
- **DISCOVERY-REQUIRED sub-step:** Confirm how the signed-out-preview "Continue" CTA navigates. Scope: read `src/app/invite/[token]/page.tsx` around the Continue CTA (L? signed-out-preview branch). Stop condition: confirm whether Continue is an `<a href>` (GET, no Origin, Referer subject to `Referrer-Policy: no-referrer`) or a form POST (Origin sent). If it's an `<a>` under `Referrer-Policy: no-referrer`, the origin guard would block it → switch the CTA to a form POST (same pattern as the Accept button) so Origin is sent. Expected evidence: the exact JSX of the Continue CTA + a one-line note on whether Referer is present.
- **Inputs/dependencies:** P1-T1 (the helper).
- **Detailed instructions:**
  1. Run the DISCOVERY sub-step; adjust the page CTA if needed (switch `<a>` → `<form method="post" action="/invite/<token>/continue">`).
  2. In `continueToAuth`, immediately after decoding the token, call `if (!isAllowedInviteOrigin(request)) return 403 no-store` — before `checkInviteContinueRateLimit` and before `createPendingInviteBridge`.
- **Expected output:** Continue route rejects no-header/cross-host POSTs in prod; allows legitimate same-site navigation.
- **Failure cases:** Blocking the Continue `<a>` if it relies on Referer under no-referrer (mitigated by DISCOVERY + form-POST switch).
- **Tests/val:** New `tests/vitest/invite-continue-origin.test.ts` (or extend `project-invite-entry-route.test.ts`) covering: no-header-denied-in-prod, cross-host-denied, same-site-form-POST-allowed, dev-allow.
- **Completion evidence:** Test output; DISCOVERY note in the task closeout.
- **Parallelization:** Sequential after P1-T1.
- **Complexity:** Small-Medium (DISCOVERY may require a page edit).

#### P1-T3 — (Already covered by P1-T1) sign-out route inherits the tightened guard
- **Task ID:** P1-T3
- **Req IDs:** SEC-01
- **Objective:** No code change beyond P1-T1 — `sign-out/route.ts:25` already calls `isAllowedInviteOrigin`. Verify the tightened behavior applies and the existing test covers the no-header case.
- **Why:** The route already calls the helper; P1-T1's rewrite flows through automatically.
- **Target path (existing):** `src/app/invite/[token]/sign-out/route.ts` (no edit expected).
- **Tests/val:** Extend `tests/vitest/project-invite-sign-out-route.test.ts` with a no-header-denied-in-prod case.
- **Complexity:** Small.

#### P1-T4 — Set full security attributes on the sign-out cookie clear
- **Task ID:** P1-T4
- **Req IDs:** SEC-04
- **Objective:** The sign-out route and `signOutForPendingInvite` clear session cookies with `{ httpOnly:true, secure: NODE_ENV==='production', sameSite:"lax", path:"/", maxAge:0 }`.
- **Why:** Today they use `{ maxAge:0, path:"/" }` only (hygiene gap).
- **Target paths (existing):** `src/app/invite/[token]/sign-out/route.ts:42-43`; `src/lib/collaboration/pending-invite-actions.ts:42-51`.
- **Target symbols:** `signOutAndReturn` cookie clear; `signOutForPendingInvite` cookie clear.
- **Detailed instructions:** Consider extracting a shared `clearBetterAuthSessionCookies(response)` helper (the pattern repeats in 3 places: sign-out route, pending-invite action, `set-cookie-forwarding.ts`). If extracted, place it in `src/lib/auth/` (e.g. `session-cookie-helpers.ts`) and reuse. Otherwise inline the attribute object in both places.
- **Tests/val:** Extend `project-invite-sign-out-route.test.ts` + `workshop-pending-invite.test.tsx` to assert Set-Cookie attributes.
- **Complexity:** Small.

#### P1-T5 — Document `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` in env examples
- **Task ID:** P1-T5
- **Req IDs:** SEC-01, DOC-01
- **Objective:** Add the new env var to `.env.example` and `.dev.vars.example` with a comment.
- **Target paths (existing):** `.env.example`, `.dev.vars.example`.
- **Complexity:** Trivial.

---

## Phase 2 — Rate-limit fail-closed when feature flag disabled

**Durable-goal contract:**
- **Goal ID:** P2-FAILCLOSED
- **Objective:** Invite resolve/continue/accept deny safely when `readInviteEntryConfig().enabled === false`, instead of bypassing rate limits.
- **Requirements covered:** SEC-05.
- **Required evidence:** Extended `project-invite-feature-flag.test.ts`; route-level disabled-state short-circuit visible.
- **Completion audit:** AC-SEC-05a/b pass; OPEN-SEC-02 confirmed.
- **Stop condition:** Disabled flag → resolve/continue/accept deny (not silent allow).
- **Blocker condition:** OPEN-SEC-02 unresolved → defer Phase 2.
- **Review gate:** Code review on the disabled-flag branch change.
- **QA gate:** AQ-09 (disabled-flag-bypass) passes.

### P2 Tasks

#### P2-T1 — Fail-closed rate limits + route disabled-state short-circuit
- **Task ID:** P2-T1
- **Req IDs:** SEC-05
- **Objective:** When the invite feature is disabled, resolve/continue/accept either (a) return the disabled state at the route level before consulting the limiter, or (b) the limiter returns deny. Preferred: route-level short-circuit (clearer, no rate-limit DB writes when disabled).
- **Why:** `invite-entry.ts:184-185` returns `{ allowed: true }` when disabled → all abuse protection vanishes.
- **Target paths (existing):** `src/lib/collaboration/invite-entry.ts` (the disabled branch); `src/app/invite/[token]/page.tsx` (resolve disabled state — already exists), `src/app/invite/[token]/continue/route.ts`, `src/app/invite/[token]/accept/route.ts` (add `if (!config.enabled) return <disabled>` short-circuits).
- **Detailed instructions:**
  1. In each of the three routes, after reading `readInviteEntryConfig()`, if `!config.enabled` return the appropriate disabled response (resolve: existing disabled state on the page; continue: redirect to invite with no cookie; accept: redirect to `/workshop` — already done at `accept/route.ts:100`).
  2. In `checkInviteRateLimit`, change the disabled branch to return a deny result **or** document that callers must short-circuit before calling it. Preferred: keep the helper's disabled-allow (it's only reachable if a caller forgets to short-circuit) AND add the route short-circuits. Belt-and-suspenders.
- **Tests/val:** Extend `project-invite-feature-flag.test.ts`: with flag off, resolve renders disabled (not active); continue sets no cookie; accept redirects to `/workshop` without calling the RPC.
- **Complexity:** Small-Medium.

---

## Phase 3 — Explicit revoke + migration `0037`

**Durable-goal contract:**
- **Goal ID:** P3-REVOKE
- **Objective:** Managers can explicitly revoke a pending invitation; schema gains `revoked_reason`.
- **Requirements covered:** SEC-07, SEC-15, FR-01, DATA-01, UX-03, A11Y-01, ARCH-03.
- **Required evidence:** New `project-collaboration-revoke-invitation.test.ts`; migration test; revoke UI component test; hosted proof harness extended for revoke.
- **Completion audit:** AC-SEC-07a-e, AC-DATA-01a/b, AC-UX-03a-c, AC-A11Y-01a-d pass.
- **Stop condition:** Manager revoke works end-to-end; revoked invitation resolves to terminal revoked with nulled details.
- **Blocker condition:** UI placement conflict in publisher panel → DISCOVERY sub-step.
- **Review gate:** Code review on revoke action + RPC + UI; migration review.
- **QA gate:** AQ-06 (revoke), AQ-11 (IDOR on revoke).

### P3 Tasks

#### P3-T1 — Migration `0037_collaboration_invitation_revoke_reason.sql`
- **Task ID:** P3-T1
- **Req IDs:** DATA-01
- **Objective:** Add nullable `revoked_reason TEXT` to `collaboration_invitations`.
- **Target path (new):** `migrations/0037_collaboration_invitation_revoke_reason.sql`.
- **DISCOVERY-REQUIRED sub-step:** Confirm D1's SQLite version supports `ALTER TABLE ... DROP COLUMN` (3.35.0+) via `bun run cf:d1:read "SELECT sqlite_version();"` against `ARCH_DB`. Stop condition: version string recorded; rollback path confirmed.
- **SQL sketch:** see `21_DATABASE_CHANGE_BLUEPRINTS.md`.
- **Tests/val:** New `tests/vitest/migration-0037-revoke-reason.test.ts` or extend `infosec-db-pending-review-contract.test.ts`.
- **Complexity:** Small.

#### P3-T2 — `revokeInvitationInD1` RPC
- **Task ID:** P3-T2
- **Req IDs:** SEC-07, SEC-15, ARCH-03
- **Objective:** New RPC in `invitation-d1-store.ts` that revokes a pending invitation + active tokens + audit.
- **Target path (existing):** `src/lib/collaboration/invitation-d1-store.ts` (new function).
- **Target symbols:** new `revokeInvitationInD1`, wrappers `revokeCollaborationInvitationInCloudflareD1`.
- **Detailed instructions:**
  1. `revokeInvitationInD1({ invitationId, revokedBy, revokedReason })`: load invitation; if `lifecycle_state !== 'pending'` return `{ ok:false, reason:'already-terminal', lifecycle_state }`; else `db.batch([UPDATE invitations SET lifecycle_state='revoked', revoked_at=now, revoked_reason=?, updated_at=now WHERE id=?, UPDATE tokens SET revoked_at=now, revoked_by=? WHERE invitation_id=? AND used_at IS NULL AND revoked_at IS NULL, INSERT audit event])`.
  2. Audit event `collaboration_invite_revoked` with metadata `{ revoked_reason?, scope, project_id?, estimate_id? }`. No raw token.
- **Tests/val:** New `tests/vitest/collaboration-invitation-d1-store.test.ts` cases (or a focused new file): revoke pending → revoked + tokens revoked + audit; revoke already-accepted → no-op; revoke already-revoked → no-op.
- **Complexity:** Medium.

#### P3-T3 — `revokeProjectInvitation` / `revokeEstimateSheetInvitation` Server Actions
- **Task ID:** P3-T3
- **Req IDs:** SEC-07, SEC-15, ARCH-03
- **Objective:** New `"use server"` actions in `actions.ts` wrapping the RPC behind manager access.
- **Target path (existing):** `src/lib/collaboration/actions.ts` (new functions).
- **Detailed instructions:** Mirror `removeProjectCollaborator`/`removeEstimateSheetCollaborator` shape: `assertProjectAccessManager`/`assertEstimateAccessManager` → `revokeCollaborationInvitationInCloudflareD1` → `revalidatePath`. Return `{ ok }` shape for the UI.
- **Tests/val:** New `tests/vitest/project-collaboration-revoke-invitation.test.ts`: manager success; non-manager deny (SEC-15); cross-workspace deny; already-terminal no-op; audit event.
- **Complexity:** Medium.

#### P3-T4 — Revoke UI in publisher members panel (DISCOVERY-REQUIRED first)
- **Task ID:** P3-T4
- **Req IDs:** SEC-07, UX-03, A11Y-01
- **Objective:** Revoke button + confirmation dialog in the pending-invitations list.
- **Target path (existing):** `src/components/workshop/publisher/*` (DISCOVERY to find the exact members-panel component — likely `PublisherProjectMembersPanel.tsx`).
- **DISCOVERY-REQUIRED sub-step:** Locate the pending-invitations render in the publisher panel; confirm the existing Resend/Copy/Remove controls' component structure. Stop condition: exact file + JSX region identified for the revoke button placement.
- **Detailed instructions:**
  1. Add a `Button` (ghost or destructive variant) "Revoke" next to existing controls on pending rows only.
  2. Wire to an `AlertDialog` confirmation ("Revoke invitation for <email>?" / Cancel + Revoke).
  3. On confirm, call the Server Action via TanStack Query mutation (existing pattern); show toast; `revalidatePath`.
  4. Keyboard: Tab-reachable, Enter/Space activate, dialog focus-trap + restore, Esc cancel.
  5. Accessible name "Revoke invitation for <email>"; live-region success announcement.
- **Tests/val:** Component test (`tests/vitest/publisher-revoke-invite.test.tsx` or similar): button present on pending rows only; confirmation flow; keyboard path; accessible name.
- **Complexity:** Medium.

#### P3-T5 — Extend hosted proof harness for revoke
- **Task ID:** P3-T5
- **Req IDs:** SEC-07
- **Objective:** The `/api/internal/collaboration-invitation-proof` harness exercises revoke: revoke → resolve returns terminal revoked with nulled details.
- **Target paths (existing):** `src/lib/cloudflare/collaboration-invitation-proof-router.ts`; tests `cloudflare-d1-collaboration-invitation-proof-script.test.ts`, `cloudflare-hosted-collaboration-invitation-proof-script.test.ts`.
- **Complexity:** Small-Medium.

---

## Phase 4 — Direct-grant promotion-only role writes

**Durable-goal contract:**
- **Goal ID:** P4-PROMOTE
- **Objective:** Direct-grant upserts use highest-role-wins, matching accept.
- **Requirements covered:** SEC-10.
- **Stop condition:** AC-SEC-10a/b pass.
- **Review gate:** Code review on the CASE change.

### P4 Tasks

#### P4-T1 — Align `upsertProjectMemberInD1` / `upsertEstimateSheetMemberInD1` to promotion-only
- **Task ID:** P4-T1
- **Req IDs:** SEC-10
- **Objective:** Reuse the `acceptProjectInvitation`/`acceptEstimateInvitation` `ON CONFLICT` promotion CASE in the direct-grant helpers (or extract a shared `resolveMembershipRoleConflict` helper).
- **Target path (existing):** `src/lib/collaboration/actions.ts:785-852`.
- **DISCOVERY-REQUIRED sub-step:** Confirm no caller relies on overwrite semantics (grep callers of `upsertProjectMemberInD1`/`upsertEstimateSheetMemberInD1`). Stop condition: caller list recorded; confirm all use it for first-grant or promotion, never for explicit downgrade (which is `updateProjectCollaboratorRole`'s job).
- **Tests/val:** Extend `project-collaboration-actions.test.ts`: direct-grant a lower role than existing → existing role unchanged; direct-grant a higher role → promoted.
- **Complexity:** Small-Medium.

---

## Phase 5 — Pepper separation + `auth_trigger` cleanup (owner-gated)

**Durable-goal contract:**
- **Goal ID:** P5-PEPPER
- **Objective:** Separate realtime identity signing from the invite pepper; resolve the dead `auth_trigger` enum.
- **Requirements covered:** SEC-09, SEC-11.
- **Stop condition:** AC-SEC-09a-c, AC-SEC-11a pass.
- **Blocker condition:** OPEN-REL-02 (realtime key rotation) and OPEN-SEC-01 (`auth_trigger`) unresolved → defer.

### P5 Tasks

#### P5-T1 — Require `REALTIME_IDENTITY_SIGNING_KEY`
- **Task ID:** P5-T1
- **Req IDs:** SEC-09, DOC-01
- **Objective:** `realtime-identity-server.ts` requires its own key; no fallback to invite pepper.
- **Target paths (existing):** `src/lib/collaboration/realtime-identity-server.ts:41-55`; `src/lib/collaboration/realtime-room-token.ts:7`; `.env.example`, `.dev.vars.example`.
- **Detailed instructions:** Replace the fallback with a required-read (throw/disable if unset, matching the pepper-required pattern). Document the new var. **Rollout:** rotate the realtime key; existing sessions re-handshake on next connection (coordinate with owner — OPEN-REL-02).
- **Tests/val:** Update `project-collaboration-realtime.test.ts`, `cloudflare-collaboration-room-auth.test.ts`; add missing-key denial test.
- **Complexity:** Medium (rollout coordination).

#### P5-T2 — Resolve `auth_trigger` enum (OPEN-SEC-01-gated)
- **Task ID:** P5-T2
- **Req IDs:** SEC-11
- **Objective:** Per owner decision: (a) wire login-time grant in `account-actions.ts`/`account-setup.ts`, or (b) remove the enum value via migration `0038` (table rebuild for CHECK change).
- **Blocker:** OPEN-SEC-01.
- **Recommended:** (b) remove, unless a product need exists.
- **Complexity:** Small (remove) / Medium (wire).

---

## Phase 6 — Non-regression audit + adversarial pass + hosted-proof extension

**Durable-goal contract:**
- **Goal ID:** P6-AUDIT
- **Objective:** Confirm all non-regression gates (SEC-03/06, FR-02/03/04/05/06, UX-01/02, A11Y-02, PERF-01/02, REL-02, DATA-02) hold after Phases 1-5.
- **Stop condition:** All non-regression tests green; `rg` scan confirms no raw tokens in changed source or this plan folder; hosted proof harness green.

### P6 Tasks

#### P6-T1 — Run the full invite test suite + proof harness
- **Task ID:** P6-T1
- **Req IDs:** SEC-03, SEC-06, FR-02, FR-03, FR-04, FR-05, FR-06, PERF-01, DATA-02
- **Objective:** `bun run test -- invite` + `bun run test -- collaboration` + proof-script tests all green.
- **Complexity:** Small.

#### P6-T2 — Raw-token leak scan
- **Task ID:** P6-T2
- **Req IDs:** SEC-06
- **Objective:** `rg` changed source + this plan folder for base64url-shaped 32+ char strings; confirm only structural descriptions, no live tokens. Confirm audit events use `token_hint`.
- **Complexity:** Trivial.

#### P6-T3 — Adversarial matrix execution
- **Task ID:** P6-T3
- **Req IDs:** TEST-02
- **Objective:** Execute AQ-01..AQ-14 from `19` §5 (or document which are static-review-only).
- **Complexity:** Medium.

---

## Parallelization classification

- **Parallel-safe:** P3-T1 (migration) ∥ P3-T2 (RPC) ∥ P3-T5 (proof harness) — disjoint files. P1-T4 (cookie attrs) ∥ P1-T5 (env docs).
- **Sequential (dependency):** P1-T1 → P1-T2/P1-T3 (helper before routes). P2-T1 after P1 stable. P3-T3 after P3-T2. P3-T4 after P3-T3.
- **Sequential (shared-file risk):** P3-T2, P3-T3, P4-T1 all edit `actions.ts` / `invitation-d1-store.ts` — serialize or carefully partition.
- **Not worth delegating:** P1-T5, P6-T2 (trivial).

## Risks / rollback (per phase — full in `13` + `14`)
- P1: env kill switch `ARCHESTIMATOR_INVITE_ORIGIN_STRICT=false` (no redeploy).
- P2: revert route short-circuits (fail-open returns — known lower-risk posture).
- P3: revert action + UI; migration column harmless if left.
- P4: revert CASE (overwrite returns).
- P5: restore realtime fallback.

## Documentation updates
- `.env.example`, `.dev.vars.example` (P1-T5, P5-T1).
- `.ai/10_state/decisions.md` + `current-state.md` at closeout (DOC-02).
- This plan pack (authoritative for the work).

## Dependency graph

```mermaid
flowchart LR
  P1[Phase 1: Origin+cookie attrs<br/>kill-switch-gated] --> P2[Phase 2: Fail-closed rate limits]
  P1 --> P6[Phase 6: Non-regression + adversarial]
  P2 --> P3[Phase 3: Revoke + migration 0037]
  P3 --> P4[Phase 4: Promotion-only direct-grant]
  P4 --> P6
  P3 --> P6
  P5[Phase 5: Pepper sep + auth_trigger<br/>owner-gated] -.-> P6
  P5 -.OPEN-REL-02.-> RT[(Future: realtime key rotation)]
```
