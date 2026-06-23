# Issue Definition: UX-002 Beta Access Status Tracker

## Problem Statement

Denied or revoked beta users have no in-app status tracker beyond email and manual support. When a user attempts to access the Archestimator closed beta and their email is not on the allowlist, or their access has been revoked, the system redirects them to `/beta/access-required` with minimal copy. The page does not name the specific state (missing vs revoked vs error), does not show queue visibility, and does not provide an explicit support workflow beyond a generic mailto link.

This creates ambiguity for the user and increases support burden. A denied user cannot tell whether their access is pending review, permanently unsupported, or temporarily revoked. A revoked user receives only a single sentence about paused access with no context about why or how to appeal.

## Evidence From Audit

### Audit Source: ux-logistical-errors-and-fixes.md

Row UX-002 (Medium, Closed beta):
- **Current Error:** Denied or revoked beta users have no in-app status tracker beyond email/manual support.
- **Evidence:** AUTH-002, AUTH-003 report.
- **Best Fix:** Add an access-request status, admin queue visibility, or explicit support workflow.
- **Post-Fix Scenario:** A denied user sees whether access is pending, revoked, or unsupported and what happens next.

### Audit Source: 02-implementation-decomposition.md

Issue UX-002 is mapped to IU-02 (Auth, beta, terms, invite recovery) with:
- **Class:** Existing-surface UX, support workflow
- **Primary owner lane:** Auth/support
- **Implementation boundary:** Login callback, beta access required, terms persistence, invite repair, workspace/account recovery
- **Verification:** TV-AUTH, TV-INVITE, TV-WORKSHOP-ADMIN

### Audit Source: 04-ux-state-accessibility-and-content-contracts.md

The Priority State Contracts section lists required states for Auth/beta/terms:
- Signed out, signed in denied, revoked, pending, unsafe `next` dropped, terms persistence failed, broken invite, wrong account, missing workspace, permission forbidden.

The current `/beta/access-required` page only covers two of these: a generic denied state and a revoked state via query parameter. Missing states include: pending, error, unsupported, and explicit support workflow.

### Audit Source: 05-security-data-and-provider-blast-radius.md

The abuse case for beta access states:
- **Abuse scenario:** Enumerating or repeatedly requesting access
- **Planning mitigation:** Queue/allowlist state isolation; avoid exposing private allowlist state. Quota is planned, not enforced.
- **Bound implementation:** No rate-limit primitive bound today

This means any status tracker must not expose the full allowlist or enable enumeration attacks.

## Severity Rationale

**Why Medium and not Low:**
- The closed beta is the primary entry path for all users. A confusing denial experience directly undermines trust in the product before the user ever sees the workspace.
- Support burden scales linearly with beta cohort size. Without self-service status, every denial becomes a manual support ticket.
- The fix is bounded: it does not require new data models, only richer copy, state-aware rendering, and a support contact path.

**Why not High:**
- The beta gate itself works correctly (users are denied when they should be). The defect is in the user-facing explanation and recovery path, not in the security control.
- No data loss or security breach occurs from the current behavior; it is a UX gap, not a trust-boundary failure.

## Current Error In Detail

### Error 1: State is under-named
The `BetaAccessStatusCopy` component in `src/app/beta/access-required/page.tsx` (lines 44-61) only distinguishes `revoked` from everything else:
```tsx
const isRevoked = params.status === "revoked";
```
All other statuses (missing, error, no-email) receive the same generic copy about manual beta access.

### Error 2: No support context
The support mailto is hardcoded with only a subject line. It does not pre-fill the user's email, status, or any context that would help support triage the request.

### Error 3: No admin queue visibility
Operators with `ceo` or `admin` role who land on this page (if they somehow lose access, or when testing) see the same generic copy as regular users. There is no admin-only repair link or queue status.

### Error 4: Unsafe `next` handling is silent
If a user was redirected to `/beta/access-required` from a protected route, the `next` path is dropped silently. The user does not know they were trying to reach a specific page.

## Desired Fix Direction

Per the audit's best fix: Add access-request status, admin queue visibility, or explicit support workflow. The implementation should:

1. Name every `ClosedBetaAccessStatus` explicitly on the `/beta/access-required` page.
2. Provide state-specific copy and next actions.
3. Add a support contact path with pre-filled context (email + status).
4. Add an admin-only visibility block that links to `/workshop/settings/beta-users` for repair.
5. Preserve and optionally display the attempted `next` path so the user knows where they were headed.

## Cross-References

- UX-003: Terms persistence failure shares the same auth/support lane and may reuse support-contact components.
- UX-040: Admin repair workflow will build on the admin queue visibility added here.
- UX-043: Auth/account/invite recovery shares the support workflow pattern.
- TV-AUTH: Targeted verification for auth states.

## Risk If Not Fixed

- Support ticket volume increases as beta cohort widens.
- Users assume the product is broken rather than understanding their access state.
- Revoked users have no clear appeal path, potentially creating legal/reputation risk.
- Admin operators waste time manually looking up allowlist status for user inquiries.
