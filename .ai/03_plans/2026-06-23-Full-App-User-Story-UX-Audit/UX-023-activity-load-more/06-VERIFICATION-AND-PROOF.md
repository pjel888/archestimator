# UX-023 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-SHARE-RECIPIENT**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-SHARE-RECIPIENT | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/activity-load-more.test.ts
```

**Required test ids**:

- `UX-023-happy-path`
- `UX-023-edge-case`
- `UX-023-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/activity-load-more.test.ts 2>&1 | tee /tmp/UX-023-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/activity-load-more.test.ts 2>&1 | tee /tmp/UX-023-GREEN.log`
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
