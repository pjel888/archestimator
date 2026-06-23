# UX-019 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-DATA-MAPS**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-DATA-MAPS | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/maps-location-fallback.test.ts
```

**Required test ids**:

- `UX-019-happy-path`
- `UX-019-edge-case`
- `UX-019-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/maps-location-fallback.test.ts 2>&1 | tee /tmp/UX-019-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/maps-location-fallback.test.ts 2>&1 | tee /tmp/UX-019-GREEN.log`
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
