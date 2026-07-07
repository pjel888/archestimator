# 12 — Test And Validation Strategy

> Lightest proof that proves the claim. Repository uses vitest (jsdom, `fileParallelism:false`, alias `@`→`./src`, `server-only` stubbed). The existing `FakeD1`/`FakeStatement` mock in `compliance-privacy-request-repository.test.ts` is the fixture template. Per `AGENTS.md`, browser proof is reserved for browser-only claims.

## Test Execution Matrix

| Requirement | Proof ID | Test file path | Test type | Fixture/data setup | Command | Expected evidence | Red/green | Known reds | Owner |
|---|---|---|---|---|---|---|---|---|---|
| FR-1 (anon intake) | PC-01 | `tests/vitest/compliance-privacy-request-route.test.ts` (new) | route-handler unit | FakeD1 | `bun run test -- <file>` | 201 + id + identityVerified=false | new green | none | executor |
| FR-1 (auth fast path) | PC-02 | same | route-handler | FakeD1 + session mock | same | 201 + identityVerified=true | new green | none | executor |
| ABUSE-1 (rate limit) | PC-03 | `tests/vitest/compliance-privacy-request-rate-limit.test.ts` (new) | unit | FakeD1 | same | 429 after threshold | new green | none | executor |
| IDENT-1 (verify loop) | PC-04 | `tests/vitest/compliance-privacy-verification.test.ts` (new) | unit | FakeD1 | same | verified=true; raw token not stored; reuse→409; expired→410 | new green | none | executor |
| FR-2 (transitions) | PC-05 | extend `compliance-privacy-request-repository.test.ts` | unit | FakeD1 | same | legal transition ok; illegal→409; terminal rejects | new green | none | executor |
| FR-2 (transition conflict) | PC-06 | same | unit | FakeD1 | same | concurrent legal race handled | new green | none | executor |
| OPS-1 (operator denial) | PC-07 | `tests/vitest/compliance-privacy-operator-gate.test.ts` (new) | unit | session mocks | same | non-operator→403 | new green | none | executor |
| UX-1 (status lookup) | PC-08 | `tests/vitest/compliance-privacy-status-lookup.test.ts` (new) | route-handler | FakeD1 + token | same | 200 valid; 404 unknown; 403 bad token | new green | none | executor |
| FR-4 (export) | PC-09 | `tests/vitest/compliance-privacy-export.test.ts` (new) | action unit | FakeD1 + R2 mock | same | evidence pointer; R2 key | new green | none | executor |
| FR-4 (no cross-user leak) | PC-10 | same | action unit | seeded two users | same | only requester data | new green | none | executor |
| FR-5 (dry-run) | PC-11 | `tests/vitest/compliance-privacy-erasure.test.ts` (new) | action unit | seeded rows | same | per-table counts; no mutation | new green (P3) | none | executor |
| FR-5 (confirm + scope) | PC-12 | same | action unit | seeded + scope fixture | same | retention event; scope assertion | new green (P3) | none | executor |
| EVID-2 (no raw data) | PC-13 | `tests/vitest/compliance-privacy-no-raw-data.test.ts` (new) | invariant | FakeD1 capture | same | no raw email/ip/ua/token in storage | new green | none | executor |
| EMAIL-1 (confirmation) | PC-14 | `tests/vitest/compliance-privacy-email.test.ts` (new) | unit | sendEmail mock | same | email invoked; circuit degrade ok | new green | none | executor |
| FR-3 (queue list) | PC-15 | `tests/vitest/compliance-privacy-operator-queue.test.ts` (new) | route-handler | FakeD1 rows | same | ordered redacted rows | new green | none | executor |
| OPS-2 (events) | PC-16 | extend repository test | unit | FakeD1 | same | event row per transition | new green | none | executor |
| SLA-2 (breach) | PC-17 | `tests/vitest/compliance-privacy-sla.test.ts` (new) | unit | past-due row | same | breached flag + notification event | new green (P4) | none | executor |
| A11Y-1 (DOM a11y) | PC-18 | `tests/vitest/compliance-privacy-queue-a11y.test.tsx` (new) | DOM (RTL) | rendered component | same | keyboard + aria-live + names | new green | none | executor |

## Adversarial scenario matrix

See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` (`AQ-01`…`AQ-15`). Key adversarial cases mirrored as tests: token replay (PC-04), operator denial (PC-07), enumeration (PC-08), cross-user leak (PC-10), erasure scope drift (PC-12), no-raw-data invariant (PC-13).

## Validation for THIS planning pass

- Static review of all 21 docs (done).
- `git diff --check` at close (will run).
- No code/test/migration changes → no `type-check`/`test`/`build` required for the planning pass itself (per `AGENTS.md` proportional verification; this is docs-only).

## Skipped / unavailable validation

- No native independent reviewer → adversarial + final verification are `emulated` (cap applied in `17`).
- No Cloudflare Email / R2 / remote-D1 proof at planning time → those are execution-time evidence (called out per phase).
- Browser proof deferred to execution for the two browser-only claims (`05` §11).
