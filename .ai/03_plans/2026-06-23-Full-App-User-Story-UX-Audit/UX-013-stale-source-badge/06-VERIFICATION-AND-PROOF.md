# UX-013 — Verification And Proof

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
tests/vitest/stale-source-badge.test.ts
```

**Required test ids**:

- `UX-013-happy-path`
- `UX-013-edge-case`
- `UX-013-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/stale-source-badge.test.ts 2>&1 | tee /tmp/UX-013-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/stale-source-badge.test.ts 2>&1 | tee /tmp/UX-013-GREEN.log`
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
