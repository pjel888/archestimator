# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for the test harness. (The
application stack — Next.js 16 / React 19 / Cloudflare / D1 / etc. — is not
changed by this pack; only the harness/tooling layer is in scope.)

## Test stack (verified from source)

| Layer | Version | Evidence |
|---|---|---|
| Runner (DOM/component) | Vitest 4.1.9 | `node_modules/vitest/package.json` |
| Runner (pure unit) | bun-test (Bun 1.3.14) | `package.json` `test`, `packageManager` |
| Runner (e2e) | `@playwright/test` 1.60.0 | `node_modules/@playwright/test/package.json` |
| Test env | jsdom 29.1.1 | `devDependencies` |
| React testing | `@testing-library/react` 16.3.2, `jest-dom` 6.9.1, `user-event` 14.6.1 | `devDependencies` |

**No version changes proposed.** The harness stack stays.

## Production standards for the harness (the bar the implementation must meet)

### Reliability
- The harness itself must be deterministic: flakewatch aborts on mid-scan edit;
  the validator rejects malformed ledger entries; scripts use safe spawning.
- `validate` exit semantics unchanged (green = 0).
- No "retry-to-green" anywhere (DEC/REL-2).

### Performance
- Every harness change that affects wall-clock has a flakewatch before/after.
- No over-wide timeouts (RISK-9): tier boundaries from measured p95.
- The perf suite's meaning is invariant across parallelism changes (parity gate).

### Security
- No new dependencies preferred (SEC-5); Bun built-ins + vitest JSON reporter.
- Safe process spawning (SEC-1); least-privilege CI permissions (SEC-4).
- No secrets in reports (SEC-3); ledger contains only paths/statuses.

### Data integrity
- Coverage-count invariant (REL-3): post ≥ pre, modulo recorded replacements.
- Quarantine ledger is committed (visible coverage loss), time-bounded.

### Observability
- Flakewatch JSON schema is stable (`19` §B).
- Non-color status cues for accessibility.
- Quarantine ledger is the durable policy artifact.

### Operations
- Per-phase rollback defined (`13`).
- Weekly pre-launch cadence; per-release evidence.
- CI re-enablement is owner-gated with a timing budget.

## Conformance to repo policies

- **AGENTS.md verification policy:** proportional verification — harness config
  changes get a full `validate`; per-test fixes get focused vitest. ✅
- **AGENTS.md shared-worktree:** flakewatch aborts on concurrent edit; ledger
  edits are append-mostly; no destructive git ops. ✅
- **AGENTS.md fast-iteration bias:** flakewatch is opt-in, not a mandatory
  pre-commit gate; does not slow routine work. ✅
- **"No hidden coverage loss" (PROMPT):** enforced by ledger + REL-3. ✅
