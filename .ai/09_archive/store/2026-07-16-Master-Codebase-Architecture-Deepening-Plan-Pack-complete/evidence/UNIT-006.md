# UNIT-006 Verification Receipt

- Recorded: `2026-07-16T19:22:08+08:00`
- Baseline HEAD: `0a2667db998607917932ad7832e9a6a5bd7e066a`
- Scoped file-set SHA-256: `a767543a4fa0f873b14ba7b3f1b5f13cda80bd0fe8e4c1ece3b3d0891331b935`
- Result: `VERIFIED`

## Implemented boundary

Durable public rate-limit D1 operations now live in `security/durable-rate-limit-d1.ts`; key hashing, cleanup scheduling, count/check/record/clear behavior, and shared result/window types live in `security/durable-rate-limits.ts`. Publication and Client Portal policies remain domain-owned in their respective `public-rate-limits.ts` modules. The old rate-limit engine and policy block is absent from `publication/public-repository.ts`, and the old rate-limit store methods are absent from `publication/d1-store.ts`.

All direct route, page, Client Portal, and proposal-export callers import their owning policy module. Public telemetry HMAC ownership is singular in `publication/security.ts`. The separate `publication_digest` reservation path remains outside the extracted engine.

## Evidence

- Focused `TEST-006` engine/policy/lockout gate: 6 files and 60 tests passed.
- Focused `TEST-006` caller-loading gate: 9 files and 11 selected tests passed; 185 unrelated tests were skipped by the exact name filter.
- The dedicated contract proves exact D1 SQL and bind order, separate occurrence/expiry clocks, optional active-expiry count filtering, normalized SHA-256 base64url keys, record-before-count denial, existing-count denial, ordered windows, cleanup debounce/single-flight/failure retry, clear-without-cleanup, and password check/record/clear semantics.
- Adversarial review found an initial proof gap for the full policy matrix. The contract was hardened to exercise all 18 scopes, exact key parts, metadata routes, windows, limits, messages, consumption modes, and all Client Portal public-read route variants. The patched focused file passed 12 tests, the complete first gate passed 60 tests, and re-review returned `CLEAN`.
- TypeScript: `bun run type-check` passed after the final test hardening.
- Scoped ESLint across all 37 owned files passed with no output.
- Scoped `git diff --check` passed.
- Residue scans found no legacy engine/store implementation, no Client Portal limiter import from the publication repository or publication policy, one telemetry-pepper definition, one `hashPublicTelemetryValue` export, 11 publication scopes, seven Client Portal scopes, and no `publication_digest` consumer in the extracted modules.
- GitNexus `detect_changes` completed against the shared worktree. Its repository-wide `HIGH` summary includes the preceding completed units; UNIT-006 direct callers were separately reconciled by exact import and wrapper scans.
- GitNexus cycle check remains exactly four pre-existing unrelated cycles: project-group UI, closed-beta auth, upload cleanup telemetry, and beta-feedback review. No extracted rate-limit module participates in a cycle.

## Key file hashes

- `src/lib/security/durable-rate-limit-d1.ts`: `40b8dfc66970a2c83729a19a69bd53e84e2ee07a4a86d786ea90ef59969f8697`
- `src/lib/security/durable-rate-limits.ts`: `7275962f774d75727747a90a13fc2189c02371fa408842806aa81e464c3afbab`
- `src/lib/publication/public-rate-limits.ts`: `faf33979f0bd3acf8f1fccb9a7efb047b80918cb098247fbea030ac0eb04d974`
- `src/lib/client-portal/public-rate-limits.ts`: `9b6ad7382d69f2f156a2dc241c5f251621fcac67281810daabec28b5e8d6f3fa`
- `src/lib/publication/public-repository.ts`: `fa43e548706a27cf0c12bfd06434466ae6781b7af99f35a82c130abe5d7fee96`
- `src/lib/publication/d1-store.ts`: `f274b62726fd44548bc6f1315fc9f4366498c8305d4c78f5ece06584312d139b`
- `src/lib/publication/security.ts`: `5f984dc9e087a7368ba1b994e83d81f808628a7a7908f61acf7c2f7fa5571fdc`
- `tests/vitest/durable-public-rate-limit-contract.test.ts`: `ff96043d11f86ca39d026f6593e421533da9fbf4640deac45a5e2858e40eae56`

## Remaining risk

No known UNIT-006 defect remains. The shared-worktree GitNexus summary is intentionally broader than this unit, so the scoped receipt relies on exact caller, residue, policy-matrix, test, and cycle evidence in addition to graph detection.
