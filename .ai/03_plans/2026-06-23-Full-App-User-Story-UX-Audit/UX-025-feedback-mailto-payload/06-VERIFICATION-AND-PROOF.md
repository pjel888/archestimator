# UX-025 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-OPS-SUPPORT**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-OPS-SUPPORT | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/feedback-mailto-payload.test.ts
```

**Required test ids**:

- `UX-025-happy-path`
- `UX-025-edge-case`
- `UX-025-regression`


---

## Provider-Proof Boundary

Touches provider boundaries — provider proof requires matching `bun run launch:*` artifact.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/feedback-mailto-payload.test.ts 2>&1 | tee /tmp/UX-025-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/feedback-mailto-payload.test.ts 2>&1 | tee /tmp/UX-025-GREEN.log`
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
