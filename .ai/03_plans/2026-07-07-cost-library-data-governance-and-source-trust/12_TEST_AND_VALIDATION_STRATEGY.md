# 12 — Test and Validation Strategy

## Testing philosophy (lightest proof that proves the claim)

- Pure domain logic (trust model, validation, import parse) → unit tests.
- React component interaction (chips, gate modal, inspector toolbar, import dialog) → DOM tests (React Testing Library).
- Server Actions / repository / D1 behavior → action/handler tests + D1 apply/constraint/transaction proof.
- Authz / security → role-matrix denial tests.
- Performance → evaluator harness + EXPLAIN + hosted perf.
- Accessibility → semantic DOM + keyboard/focus tests; targeted Playwright only for complex focus/drag-drop.
- Provider proof → D1 readback via `cf:*` scripts.

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-1/FR-1 provenance | `tests/vitest/quick-add-validation.test.ts` (extend) | unit | existing | field samples | `bun run test -- quick-add-validation` | rejects future date, non-https, formula | none | impl |
| REQ-2/FR-2 origin | `tests/vitest/origin-defaults-and-admin-set.test.ts` | unit+authz | new | workspace+entry+roles | `bun vitest origin-defaults` | defaults, admin-only setter | none | impl |
| REQ-3/FR-3 review state machine | `tests/vitest/component-library-review-schema.test.ts` | migration/constraint | new | temp SQLite + migration | `bun vitest component-library-review-schema` | CHECKs reject invalid | none | impl |
| REQ-3 backfill | same | migration | new | seeded entries | same | idempotent backfill | none | impl |
| REQ-4/FR-4 assign | `tests/vitest/review-assign-cost-entry.test.ts` | action+denial | new | workspace+entry+users | `bun vitest review-assign` | sets fields + event; cross-WS denied | none | impl |
| REQ-5/FR-5 accept/reject/lock/supersede | `tests/vitest/accept-cost-entry.test.ts`, `reject-cost-entry.test.ts`, `lock-cost-entry.test.ts`, `supersede-cost-entry.test.ts` | action+concurrency+denial | new | entries+revisions | `bun vitest cost-entry` | state transitions, conflicts, terminal guards | none | impl |
| REQ-6/FR-6 audit | `tests/vitest/review-event-append-only.test.ts` | constraint | new | events | same | append-only, no update/delete | none | impl |
| REQ-7/FR-7 chips | `tests/vitest/library-source-trust.test.ts` (extend) | unit | existing | item samples | `bun vitest library-source-trust` | review chip variants | none | impl |
| REQ-8/FR-8 gate | same (extend) | unit | existing | row samples | same | block rejected/superseded; warn proposed/needs_review | none | impl |
| REQ-9/SEC-1 authz | `tests/vitest/authz-cost-library-governance-admin.test.ts` | denial matrix | new | roles | `bun vitest authz-cost-library` | admin/platform allow; editor/cross-WS deny | none | impl |
| REQ-10/FR-9 stale propagation | `tests/vitest/stale-propagation.test.ts` | integration | new | library+estimate rows | `bun vitest stale-propagation` | update→read sees source-changed | none | impl |
| REQ-11/FR-10 region/version | `tests/vitest/region-version-labels.test.ts` | unit+DOM | new | entries | `bun vitest region-version` | round-trip + facet | none | impl (gated OPEN-2) |
| REQ-12/FR-11 freshness consistency | `tests/vitest/library-source-trust.test.ts` (extend) + export test | unit | existing/new | samples | same | single source | none | impl |
| REQ-13/FR-12 import | `tests/vitest/library-import.test.ts` | action+denial+injection | new | CSV fixtures | `bun vitest library-import` | dry-run/commit/formula/quota/deny | none | impl |
| REQ-14/FR-13 export | `tests/vitest/library-export.test.ts` | round-trip+denial | new | library | `bun vitest library-export` | round-trip parity | none | impl |
| REQ-15/FR-14 inspector | `tests/vitest/inspector-review-toolbar.test.tsx` | DOM | new | rendered inspector | `bun run test:dom -- inspector-review` | chip + toolbar render | none | impl |
| REQ-16/DATA-1 history preserved | `tests/vitest/component-library-versioning-schema.test.ts` (extend) | migration | existing | history rows | `bun vitest component-library-versioning-schema` | no data loss | none | impl |
| SEC denial (T1..T12) | `*-denied.test.ts` files above | denial | new | roles | various | denials enforced | none | impl |
| PERF evaluator 1 | `tests/vitest/perf/library-browse-with-review-state.test.ts` | perf | new | 10k seed | `bun vitest perf/library-browse` | p95 ≤ baseline+10% | none | impl |
| PERF evaluator 2 | `tests/vitest/perf/estimate-read-with-stale-propagation.test.tsx` | perf | new | 200-row estimate | `bun vitest perf/estimate-read` | p95 ≤ baseline+5% | none | impl |
| PERF evaluator 3 | EXPLAIN (script) | query plan | new | 100k seed | `wrangler d1 execute ... EXPLAIN` | index seek | none | impl |
| a11y keyboard/focus | `tests/vitest/inspector-review-toolbar-a11y.test.tsx`, `library-import-dialog-a11y.test.tsx` | DOM | new | rendered | `bun run test:dom` | tab/esc/enter | none | impl |
| Browser (targeted) | `tests/e2e/review-flow-focus.spec.ts` (Playwright, optional) | e2e | new | running app | `bun run test:e2e -- review-flow` | focus restoration, drag-drop | none | impl (only if DOM insufficient) |
| D1 apply proof | script | provider (local) | new | local D1 | `wrangler d1 migrations apply archestimator-proof-db --local` | clean apply | none | impl |
| D1 transaction proof | `cf:d1-rpc-transaction-proof.ts` (extend) | provider | existing pattern | local D1 | `bun run cf:d1-rpc-proof` | accept/supersede atomic | none | impl |

## Commands (verified against `package.json`)

- `bun run type-check`
- `bun run lint` / `bun run lint:design-system`
- `bun run test` / `bun run test:dom`
- Focused `bun vitest <pattern>`
- `bun run build`
- `wrangler d1 migrations apply archestimator-proof-db --local`
- `wrangler d1 migrations apply archestimator-proof-db --remote` (after preview gate)
- `bun run cf:verify-preview-routes`, `bun run cf:check-readiness`, `bun run cf:provider-proof`, `bun run cf:d1-rpc-proof`
- Targeted Playwright only for browser-only claims.

(Implementation AI must verify these scripts exist and read known-red commands in `current-state.md` before relying on broad `validate`.)

## Adversarial scenario coverage (UltraQA matrix in `19`)

Covers: malformed/oversized/missing/invalid input; invalid roles; unauthorized + cross-workspace; stale cache; duplicate submissions; concurrent writes (revision conflict); offline/slow; third-party (n/a — no external API); rollback after partial success; misleading success; dirty-worktree/concurrent-agent safety.

## Known gaps / pre-existing reds

- The existing `component-library-cost-governance-actions.test.ts` asserts D1 actions do NOT use governance RPCs. After this plan, D1 actions implement equivalent behavior natively. The test must be updated (intentional, not a regression). Tracked in `TASK-*`.
- No known broad-red commands at planning time; implementation must re-check `current-state.md`.

## Browser-proof decision (proportional)

DOM tests prove: chip rendering, gate reasons, facet filtering, inspector states, import dry-run table, audit append-only, authz denials. Browser proof (Playwright) only for: review-action toolbar focus restoration across dialog/drawer, import drag-drop interaction. Named explicitly; not a default gate.
