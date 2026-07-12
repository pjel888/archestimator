# UX-004 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-ROUTE-ALIASES**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-ROUTE-ALIASES | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/root-recovery-boundaries.test.ts
```

**Required test ids**:

- `UX-004-happy-path`
- `UX-004-edge-case`
- `UX-004-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/root-recovery-boundaries.test.ts 2>&1 | tee /tmp/UX-004-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/root-recovery-boundaries.test.ts 2>&1 | tee /tmp/UX-004-GREEN.log`
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
