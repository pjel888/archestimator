# UX-043 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-AUTH, TV-INVITE**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-AUTH | per matrix | per matrix | artifact in proof folder |
| TV-INVITE | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/auth-invite-workspace-recovery.test.ts
```

**Required test ids**:

- `UX-043-happy-path`
- `UX-043-edge-case`
- `UX-043-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/auth-invite-workspace-recovery.test.ts 2>&1 | tee /tmp/UX-043-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/auth-invite-workspace-recovery.test.ts 2>&1 | tee /tmp/UX-043-GREEN.log`
3. **Real surface**: capture artifact path.

---

## Evidence Log

| Date | Scenario | Artifact | Status |
|---|---|---|---|
| (pending) | (pending) | (pending) | (pending) |

---

## Linkage

- [05-ACCEPTANCE-CRITERIA.md](05-ACCEPTANCE-CRITERIA.md)
- [07-BLAST-RADIUS-AND-ROLLBACK.md](07-BLAST-RADIUS-AND-ROLLBACK.md)
