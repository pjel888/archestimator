# UX-008 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-PROJECT-DASHBOARD**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-PROJECT-DASHBOARD | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/destructive-modal-tone.test.ts
```

**Required test ids**:

- `UX-008-happy-path`
- `UX-008-edge-case`
- `UX-008-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/destructive-modal-tone.test.ts 2>&1 | tee /tmp/UX-008-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/destructive-modal-tone.test.ts 2>&1 | tee /tmp/UX-008-GREEN.log`
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
