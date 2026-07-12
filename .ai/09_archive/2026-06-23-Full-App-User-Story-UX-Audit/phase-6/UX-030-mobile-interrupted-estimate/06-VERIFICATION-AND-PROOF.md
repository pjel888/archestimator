# UX-030 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-ESTIMATE-SHEET**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-ESTIMATE-SHEET | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/mobile-interrupted-estimate.test.ts
```

**Required test ids**:

- `UX-030-happy-path`
- `UX-030-edge-case`
- `UX-030-regression`
- `UX-030-decision-gate-compliance`

---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/mobile-interrupted-estimate.test.ts 2>&1 | tee /tmp/UX-030-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/mobile-interrupted-estimate.test.ts 2>&1 | tee /tmp/UX-030-GREEN.log`
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
