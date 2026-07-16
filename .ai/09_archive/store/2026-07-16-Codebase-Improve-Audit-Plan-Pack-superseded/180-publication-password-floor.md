# Plan UNIT-009: Raise the publication password floor; add a server test; fix the stale BLK-01 note

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/publication/security.ts src/lib/publication/actions.ts`.

## Status
- **Priority:** P3 · **Effort:** S · **Risk:** LOW · **Depends on:** — · **Category:** security/doc
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (server test rejecting short passwords)

## Why this matters
`MIN_PUBLICATION_PASSWORD_LENGTH = 4` (`security.ts:134`) is below any entropy threshold; combined with the per-token rate limit it is defensible, but 4-char passwords on confidential client proposals remain brute-forceable within a large rate-limit window. Separately, the prior "BLK-01 server gap remains" note (`.ai/04_tasks/2026-07-16-publisher-audit-deferred-*.md`) is **stale**: the server-side gate exists (`validatePublicationPassword` at `actions.ts:896,969,1053`), and the server API has no `passwordRequired` concept (it acts only on `password?: string`), so the original threat is largely moot. This unit raises the floor, locks the server gate with a test, and corrects the note.

## Current state
- `src/lib/publication/security.ts:134` — `export const MIN_PUBLICATION_PASSWORD_LENGTH = 4;`; `:136-141` `validatePublicationPassword` (normalizes, checks `>= MIN`).
- `src/lib/publication/actions.ts:895-898` (create), `:968-971` (republish), `:1052-1055` (update password) — each calls `validatePublicationPassword(password)` before any DB write when a password is supplied.
- `verifyPublicationPassword` has **no** length gate → existing hashes verify unchanged when the floor rises.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| (TEST_PROPOSAL) server test | `bun run test:dom -- tests/vitest/publication-password-floor.test.ts` (if authorized) | pass |

## Scope
**In scope:** `src/lib/publication/security.ts` (the constant; optionally a character-class check); a new server-action test; the stale note in `.ai/04_tasks/2026-07-16-publisher-audit-deferred-blocked-skipped.md` (BLK-01 row).
**Out of scope:** existing password hashes (verify path unchanged). The client wizard (already ships a blank-password gate). The bearer-link model.

## Steps
### Step 1 — Raise the floor
In `security.ts`, set `MIN_PUBLICATION_PASSWORD_LENGTH = 8` (owner-confirmable; 8 is the pragmatic floor). Optionally add a minimal strength check (≥2 character classes) if the owner wants; keep it permissive to avoid blocking real partners.
### Step 2 — (TEST_PROPOSAL) server test
`tests/vitest/publication-password-floor.test.ts`: a 3-char (and 7-char) password is rejected on `createProjectPublication`, `republishProjectPublication`, and the update-password action; an 8-char password is accepted; an existing-hash verification still succeeds for a legacy 4-char-password-protected publication (prove `verifyPublicationPassword` is unaffected). Do not run without user test authorization.
### Step 3 — Correct the stale BLK-01 note
In `.ai/04_tasks/2026-07-16-publisher-audit-deferred-blocked-skipped.md`, update the BLK-01 row to record: server-side length gate **exists**; the residual hardening is the floor (now raised by UNIT-009) and the absence of a `passwordRequired` concept on the server API (the original "undefined sails through" threat is moot for the current API shape).
**Verify:** `bun run type-check` + `bun run lint` exit 0; server test (if authorized) passes.

## Done criteria
- [ ] `bun run type-check` exit 0 · [ ] `bun run lint` exit 0
- [ ] `MIN_PUBLICATION_PASSWORD_LENGTH >= 8`
- [ ] Server test rejects short passwords on all 3 actions (if authorized)
- [ ] Existing-hash verification unaffected (test or code confirmation)
- [ ] BLK-01 note corrected to reflect the implemented server gate
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- Raising the floor breaks an existing partner's in-flight password (they supplied a 5-char value) — confirm with owner before choosing 8; consider 6 as a softer step.
- `verifyPublicationPassword` is found to enforce the floor (it must not) — fix it to verify-only before landing.

## Maintenance notes
- If a strength/complexity requirement is added later, keep `verifyPublicationPassword` verify-only so legacy links keep working.
- The absence of a server `passwordRequired` concept is intentional (open link = omit password); document it so BLK-01 is not re-raised.
