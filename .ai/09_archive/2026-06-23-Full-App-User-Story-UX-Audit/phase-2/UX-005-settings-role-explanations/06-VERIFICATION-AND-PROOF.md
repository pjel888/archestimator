# UX-005 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-WORKSHOP-ADMIN**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-WORKSHOP-ADMIN | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/settings-role-explanations.test.ts
```

**Required test ids**:

- `UX-005-happy-path`
- `UX-005-edge-case`
- `UX-005-regression`


---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/settings-role-explanations.test.ts 2>&1 | tee /tmp/UX-005-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/settings-role-explanations.test.ts 2>&1 | tee /tmp/UX-005-GREEN.log`
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
