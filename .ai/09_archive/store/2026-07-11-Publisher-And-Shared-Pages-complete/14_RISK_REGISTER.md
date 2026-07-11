# 14 - Risk Register

Only the four canonical `RISK-*` records in `plan-pack.json` appear here. Other
implementation watch conditions are mitigations inside their owning units, not
untracked risk IDs.

| ID | Status | Exact units | Exact criteria | Risk | Mitigation / stop condition |
|---|---|---|---|---|---|
| RISK-001 | OPEN | UNIT-001, UNIT-002, UNIT-003, UNIT-005, UNIT-006, UNIT-007 | AC-040, AC-041, AC-042, AC-045, AC-046, AC-047 | Shared security route/repository files can conflict or weaken fail-closed order | Single writer, re-read before each edit, preserve auth/rate-limit ordering, focused tests; stop on unresolved concurrent change |
| RISK-002 | OPEN | UNIT-008 | AC-048 | A table rebuild can lose data or accept orphans | One transaction; no orphan deletion; explicit columns; count/digest/FK/index/trigger parity; failure injection; reverse rebuild or D1 restore |
| RISK-003 | OPEN | UNIT-010 | AC-009 | User-facing terminology can become inconsistent | One bounded string audit, internal identifiers unchanged, component/contract tests updated in same unit |
| RISK-015 | OPEN | UNIT-011, UNIT-012, UNIT-015, UNIT-016, UNIT-017 | AC-001, AC-011, AC-020, AC-021, AC-024 | Redesigned entry, roster, status, sticky, and row controls can regress accessibility | Semantic controls, labeled actions, stable focus, roving tabindex, responsive DOM tests, targeted keyboard/browser proof |

## Implementation Watch Conditions

- Cursor pagination must preserve the first-page response contract.
- Native Web Share is progressive enhancement; Copy remains available. No QR or
  new package is permitted by this pack.
- The manager preview route must rerun RBAC on every read and create no preview
  credential.
- Recipient repository normalization remains all-or-nothing and returns no
  partial metadata.
- Browser print quality is not pre-proven; server PDF remains out of scope.
- Performance numbers are local evaluator evidence, not hosted guarantees.

Risk statuses remain `OPEN` until their mapped unit evidence is verified. An
implementation-ready plan does not close implementation risks.
