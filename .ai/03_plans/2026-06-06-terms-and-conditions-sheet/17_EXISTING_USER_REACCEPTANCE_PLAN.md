# Existing User Re-Acceptance Plan

## Problem

No current persisted Terms acceptance exists. Existing closed-beta users cannot be treated as having accepted a specific Terms version merely because `/login` included passive copy.

## Recommended rollout

1. Deploy DB/content infrastructure with gate off.
2. Verify acceptance save/read with internal owner/test user.
3. Enable soft prompt for known beta users if desired.
4. Enable hard gate for current Terms after legal/product approval.
5. Communicate to beta users before hard gate if cohort is active.

## Existing-user options

| Option | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Immediate hard gate on next protected access | Strongest proof, simple. | Can surprise/block users if bug or unclear copy. | Recommended after owner/internal smoke. |
| Grace period banner | Lower disruption. | Weaker proof until deadline. | Acceptable if Philip prioritizes beta continuity. |
| Silent backfill | No disruption. | Weak/unreliable legal evidence unless separately justified. | Reject unless counsel explicitly approves. |

## Old-version behavior

- Required version constant changes only after approved material Terms update.
- User with old accepted version sees re-acceptance UI.
- Old acceptance remains in history.
- New row records context `reacceptance`.

## Edge cases

- User opens app in two tabs: idempotent insert returns success.
- User accepts old version after version bump: server rejects stale version and prompts reload/current version.
- User has account but deleted profile: acceptance tied to Auth user; profile bootstrap should remain independent.
- User is revoked from closed beta: closed-beta access denial takes precedence over Terms gate.

## Tests

- Existing user missing row is prompted.
- Existing user accepts and proceeds.
- Old version prompts after version bump.
- Current version does not prompt repeatedly.
- Revoked/non-allowlisted user does not see protected app via Terms gate bypass.
