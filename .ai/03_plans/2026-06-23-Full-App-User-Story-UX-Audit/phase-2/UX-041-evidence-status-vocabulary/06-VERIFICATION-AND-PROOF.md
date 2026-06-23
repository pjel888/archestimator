# UX-041 — Verification And Proof

Date: 2026-06-23
Targeted Verification IDs: **TV-VALIDATE**

## Proof Surface Map

| TV ID | Surface | Proof command | Pass condition |
|---|---|---|---|
| TV-VALIDATE | per matrix | per matrix | artifact in proof folder |

---

## Local Test Proof

### Test File (to add)

```
tests/vitest/evidence-status-vocabulary.test.ts
```

**Required test ids**:

- `UX-041-happy-path`
- `UX-041-edge-case`
- `UX-041-regression`


---

## Provider-Proof Boundary

Touches provider boundaries — provider proof requires matching `bun run launch:*` artifact.

---

## RED → GREEN Proof Capture

1. **RED**: `bun run test:dom -- tests/vitest/evidence-status-vocabulary.test.ts 2>&1 | tee /tmp/UX-041-RED.log`
2. **GREEN**: `bun run test:dom -- tests/vitest/evidence-status-vocabulary.test.ts 2>&1 | tee /tmp/UX-041-GREEN.log`
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
