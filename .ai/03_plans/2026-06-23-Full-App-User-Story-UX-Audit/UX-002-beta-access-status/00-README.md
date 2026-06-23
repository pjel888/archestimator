# UX-002: Beta Access Status Tracker

## Issue Overview

Denied or revoked beta users have no in-app status tracker beyond email and manual support. When a user's closed-beta access is revoked or denied, the only signal they receive is a redirect to `/beta/access-required` with a minimal copy block. There is no queue visibility, no explicit state naming beyond a query parameter, and no structured support workflow that lets the user understand what happened or what to do next.

## Canonical Source

This plan is derived from the Full App User Story UX Audit:
- [ux-logistical-errors-and-fixes.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/ux-logistical-errors-and-fixes.md) row UX-002
- [02-implementation-decomposition.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/02-implementation-decomposition.md) IU-02
- [03-sequencing-dependencies-and-conflicts.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/03-sequencing-dependencies-and-conflicts.md) Auth/support boundary conflict group
- [04-ux-state-accessibility-and-content-contracts.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md) Priority State Contracts
- [06-verification-matrix-and-proof-runbook.md](../../16_user-experience/2026-06-22-full-app-user-story-ux-audit/06-verification-matrix-and-proof-runbook.md) TV-AUTH

## Priority And Severity

- **Priority:** P0
- **Severity:** Medium
- **Beta-blocking:** Yes
- **Area:** Closed beta / Auth
- **Implementation Unit:** IU-02 (Auth/support lane)
- **Scope Posture:** Existing-surface UX improvement
- **Conflict Group:** Auth/support boundary (lead: Auth/support lead)
- **Target Verification:** TV-AUTH

## Status

`planned`

## File Index

| # | File | Purpose |
|---|---|---|
| 01 | [01-ISSUE-DEFINITION.md](01-ISSUE-DEFINITION.md) | Full problem statement, evidence, severity rationale |
| 02 | [02-CURRENT-STATE-ANALYSIS.md](02-CURRENT-STATE-ANALYSIS.md) | Codebase current state with real file paths and line numbers |
| 03 | [03-TARGET-EXPERIENCE.md](03-TARGET-EXPERIENCE.md) | Target UX, state matrix, copy strings, recovery flows |
| 04 | [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | Concrete wave-ordered task list with checkboxes |
| 05 | [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md) | Given/When/Then scenarios (3+) |
| 06 | [06-VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md) | TV-AUTH mapping, test files, real-surface proof |
| 07 | [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md) | Auth risks, rollback, fallback UI |
| 08 | [08-DECISIONS-AND-DEPENDENCIES.md](08-DECISIONS-AND-DEPENDENCIES.md) | Conflict group coordination, dependencies, decision gates |

## User Story Golden Path

**As a** denied or revoked beta user,
**When I** sign in with an email that is not on the closed-beta allowlist or has been revoked,
**I want to** see a named state (pending, denied, revoked, or unsupported) with a clear next action and support path,
**So that** I understand why I cannot access the app and what I can do about it, instead of landing on a generic page with only a mailto link.

## Expected Outcome

After implementation, every beta access denial surface names the exact state, shows context-aware copy, provides a support contact path with pre-filled context, and exposes admin queue visibility for operators. The existing `/beta/access-required` page becomes a rich status surface rather than a dead end.

## Stop Condition

Do not mark this issue complete until:
1. `TV-AUTH` tests pass for all beta access status states.
2. Browser proof shows the `/beta/access-required` page with named states for revoked, missing, and error conditions.
3. Admin queue visibility is verified for operators with `ceo` or `admin` role.
4. No unsafe redirect or token leakage is introduced.
5. The conflict group lead (Auth/support lead) signs off on coordination with UX-003, UX-040, and UX-043.
