# UX-032 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-PROJECT-DASHBOARD, TV-SHARE-RECIPIENT**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-PROJECT-DASHBOARD | per matrix | per matrix | artifact in proof folder |
| TV-SHARE-RECIPIENT | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/pm-readiness-governance.test.ts
```

**Required test ids**:

- `UX-032-happy-path`
- `UX-032-edge-case`
- `UX-032-regression`
- `UX-032-decision-gate-compliance`

---

## Provider-Proof Boundary

Local/browser test artifacts suffice.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/pm-readiness-governance.test.ts 2>&1 | tee /tmp/UX-032-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/pm-readiness-governance.test.ts 2>&1 | tee /tmp/UX-032-GREEN.log`
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
