# UX-001 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-PUBLIC, TV-OPS-SUPPORT**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-PUBLIC | per matrix | per matrix | artifact in proof folder |
| TV-OPS-SUPPORT | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/public-copy-readiness.test.ts
```

**Required test ids**:

- `UX-001-happy-path`
- `UX-001-edge-case`
- `UX-001-regression`


---

## Provider-Proof Boundary

Touches provider boundaries — provider proof requires matching `bun run launch:*` artifact.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/public-copy-readiness.test.ts 2>&1 | tee /tmp/UX-001-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/public-copy-readiness.test.ts 2>&1 | tee /tmp/UX-001-GREEN.log`
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
