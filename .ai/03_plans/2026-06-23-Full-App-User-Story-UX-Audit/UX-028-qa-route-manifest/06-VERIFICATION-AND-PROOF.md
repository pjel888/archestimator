# UX-028 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-OPS-SUPPORT, TV-VALIDATE**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-OPS-SUPPORT | per matrix | per matrix | artifact in proof folder |
| TV-VALIDATE | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/qa-route-manifest.test.ts
```

**Required test ids**:

- `UX-028-happy-path`
- `UX-028-edge-case`
- `UX-028-regression`


---

## Provider-Proof Boundary

Touches provider boundaries — provider proof requires matching `bun run launch:*` artifact.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/qa-route-manifest.test.ts 2>&1 | tee /tmp/UX-028-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/qa-route-manifest.test.ts 2>&1 | tee /tmp/UX-028-GREEN.log`
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
