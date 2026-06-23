# UX-002 — Acceptance Criteria

Date: 2026-06-23

## Scenario 1 — Happy Path

**Given** a user on the closed beta surface affected by UX-002.

**When** the user performs the canonical action.

**Then** the surface renders the target state from 03-TARGET-EXPERIENCE.

### Pass Condition (binary)

- [ ] Target state's explicit copy string is rendered verbatim.
- [ ] No console errors.
- [ ] Action completes within response budget.

### Real-Surface Proof

| Surface | How |
|---|---|
| Test runner | Test id `UX-002-happy-path` in `tests/vitest/beta-access-status.test.ts` |
| Browser (if UI) | Playwright spec asserting rendered copy |
| API (if backend) | `curl` log asserting response shape |

---

## Scenario 2 — Edge Case

**Given** user on the closed beta surface in a non-default state (empty / malformed / max-length / concurrent).

**When** user performs the same action.

**Then** surface handles edge gracefully.

### Pass Condition

- [ ] Edge state renders matching recovery copy from 03-TARGET-EXPERIENCE.
- [ ] No uncaught exception.
- [ ] User can recover without refresh.

### Real-Surface Proof

| Surface | How |
|---|---|
| Test runner | Test id `UX-002-edge-case` |

---

## Scenario 3 — Adjacent-Surface Regression

**Given** the fix for UX-002 shipped.

**When** a caller or sibling endpoint that depends on the same shared primitive runs.

**Then** no regression.

### Pass Condition

- [ ] All existing tests in affected surface pass.
- [ ] No new lint / type errors.
- [ ] Conflict group **Auth/support boundary** has no parallel-change hazard.

### Real-Surface Proof

| Surface | How |
|---|---|
| Test runner | Full surface suite passes |
| `bun run validate` | Passes or quarantined per UX-028 |

---

## Scenario 5 — Conflict-Group Coordination

**Given** UX-002 is in the Auth/support boundary conflict group.

**Pass condition:** no merge race; the Auth/support lead signs off in `../LOOP_LEDGER.md`.

---

## Scenario Runbook

```sh
bun run test:dom -- tests/vitest/beta-access-status.test.ts
```

---

## Linkage

- [04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md)
- [06-VERIFICATION-AND-PROOF.md](06-VERIFICATION-AND-PROOF.md)
