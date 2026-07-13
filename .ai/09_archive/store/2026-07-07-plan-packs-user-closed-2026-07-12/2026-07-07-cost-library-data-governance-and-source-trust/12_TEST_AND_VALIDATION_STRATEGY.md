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
- **`validate` script is a broad aggregator** (`bun run validate` = type-check + lint + design-lint + design + test + test:dom). Per `AGENTS.md` proportional-verification policy, do NOT rely on broad `validate` for narrow claims — use focused commands (e.g. `bun vitest <pattern>`). If `validate` is run at release, capture any pre-existing unrelated failures separately rather than claiming a green gate. Known-red posture: implementation must re-confirm from `current-state.md` before invoking broad gates.

## Supabase governance test update spec (ADV-11)

`tests/vitest/component-library-cost-governance-actions.test.ts` currently asserts (line 81):
```ts
expect(actions).not.toMatch(/accept_cost_library_cost_entry|...|supabase\.rpc/);
```
After this plan, update it to:
1. **Keep** asserting no `supabase.rpc(...)` calls (D1 is the active runtime — `DEC-1`).
2. **Replace** the "actions do not reference governance RPC names" assertion with **positive assertions** that the new D1-native review actions exist and enforce the contract: `acceptCostEntry` exists; it requires `isCostLibraryGovernanceAdminInD1`; it enforces `expectedReviewRevision` conflict; it writes a review event; supersede is terminal; one accepted-current per price option.
3. **Keep** the Supabase-migration structural assertions (enum values, columns, RPC definitions, RLS) as the parity reference contract.
This is a deliberate contract evolution, recorded so a reviewer doesn't treat the test change as a regression. Owner: implementation.

## Proof-contract rows (per Improve-Plan directive §11)

Every planned proof tied to a requirement + implementation unit + red/green expectation.

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-1 | REQ-1 | TASK-002,014,018 | unit | field samples (future date, non-https, formula prefix) | reject invalid, normalize valid | `tests/vitest/quick-add-validation.test.ts` (extend) | `bun vitest quick-add-validation` | red before fix: future date accepted; green after | none |
| PROOF-2 | REQ-2 | TASK-014 | unit+authz | workspace+entry+admin/editor | admin sets owner-accepted; editor denied | `tests/vitest/origin-defaults-and-admin-set.test.ts` (new) | `bun vitest origin-defaults` | red: editor can set; green: denied | none |
| PROOF-3 | REQ-3 | TASK-005,006 | migration/constraint | temp SQLite + `0038` migration | CHECKs reject invalid (accepted w/o reviewed_by; supersede w/o superseded_by; duplicate accepted-current) | `tests/vitest/component-library-review-schema.test.ts` (new) | `bun vitest component-library-review-schema` | red: bad insert succeeds pre-migration; green: rejected post-migration | temp DB in-memory |
| PROOF-4 | REQ-3 backfill | TASK-006 | migration | seeded `is_current` entries | idempotent backfill to accepted (Mode A) | same | same | re-run updates 0 rows | temp DB |
| PROOF-5 | REQ-4 | TASK-009 | action+denial | workspace+entry+users | sets fields + event; cross-WS denied | `tests/vitest/review-assign-cost-entry.test.ts` (new) | `bun vitest review-assign` | red: no field set; green: set + event | none |
| PROOF-6 | REQ-5 | TASK-010..013 | action+concurrency+denial | entries+revisions | transitions, conflicts, terminal guards | `tests/vitest/accept-cost-entry.test.ts` etc (new) | `bun vitest cost-entry` | red: stale revision overwrites; green: conflict | none |
| PROOF-7 | REQ-6 | TASK-005,009..013 | constraint | events | append-only; no UPDATE/DELETE path | `tests/vitest/review-event-append-only.test.ts` (new) | `bun vitest review-event-append-only` | red: UPDATE succeeds; green: no path | none |
| PROOF-8 | REQ-7,8 | TASK-015,016 | unit | item/row samples | chip variants; gate block/warn | `tests/vitest/library-source-trust.test.ts` (extend) | `bun vitest library-source-trust` | red: rejected not blocked; green: blocked | none |
| PROOF-9 | REQ-9 | TASK-004 | denial matrix | roles | admin/platform allow; editor/cross-WS deny | `tests/vitest/authz-cost-library-governance-admin.test.ts` (new) | `bun vitest authz-cost-library` | red: editor can accept; green: denied | none |
| PROOF-10 | REQ-10 | TASK-020..022 | integration | library+estimate rows | update→read sees source-changed; unchanged→no false positive | `tests/vitest/stale-propagation.test.ts` (new) | `bun vitest stale-propagation` | red: no source-changed after update; green: present | none |
| PROOF-11 | REQ-11 | TASK-018,030,033 | unit+DOM | entries w/ region | round-trip + facet | `tests/vitest/region-version-labels.test.ts` (new) | `bun vitest region-version` | red: region not persisted; green: persisted | none (gated OPEN-2) |
| PROOF-12 | REQ-12 | TASK-015,019 | unit | samples + export | single freshness source | `tests/vitest/library-source-trust.test.ts` + export test | `bun vitest library-source-trust` | red: export lacks tier; green: present | none |
| PROOF-13 | REQ-13 | TASK-024,025,028 | action+denial+injection | CSV fixtures (formula, oversized, over-quota) | neutralize/reject; quota; cross-WS deny; no overwrite accepted | `tests/vitest/library-import.test.ts` (new) | `bun vitest library-import` | red: formula passes; green: rejected | temp CSV fixtures |
| PROOF-14 | REQ-14 | TASK-026,027 | round-trip+denial | library | round-trip parity; non-member denied | `tests/vitest/library-export.test.ts` (new) | `bun vitest library-export` | red: lossy round-trip; green: parity | none |
| PROOF-15 | REQ-15 | TASK-029 | DOM | rendered inspector | chip + toolbar render for linked; detached shows label | `tests/vitest/inspector-review-toolbar.test.tsx` (new) | `bun run test:dom -- inspector-review` | red: no chip; green: chip present | none |
| PROOF-16 | REQ-16 | TASK-005,007 | migration | history rows | no data loss after migration | `tests/vitest/component-library-versioning-schema.test.ts` (extend) | `bun vitest component-library-versioning-schema` | red: history lost; green: preserved | temp DB |
| PROOF-17 | REQ-9 (SEC) | TASK-004 + review actions | denial (T1..T12) | roles | denials enforced | `*-denied.test.ts` files | various | red: privilege escalation succeeds; green: denied | none |
| PROOF-PERF-1 | perf | TASK-029 | perf | 10k seed | browse p95 ≤ baseline+10% | `tests/vitest/perf/library-browse-with-review-state.test.ts` (new) | `bun vitest perf/library-browse` | red: >+15%; green: within band | none |
| PROOF-PERF-2 | perf (REQ-10) | TASK-020 | perf | 200-row estimate | estimate read p95 ≤ baseline+5% | `tests/vitest/perf/estimate-read-with-stale-propagation.test.tsx` (new) | `bun vitest perf/estimate-read` | red: >+10%; green: within band | none |
| PROOF-PERF-3 | perf (REQ-3) | TASK-005 | query plan | 100k seed | index seek not scan | EXPLAIN script | `wrangler d1 execute ... --command "EXPLAIN ..."` | red: full scan; green: index seek | seed cleanup |
| PROOF-A11Y-1 | a11y (REQ-7,15) | TASK-029,031 | DOM | rendered toolbar/dialog | Tab/Esc/Enter; focus restoration; live-region | `inspector-review-toolbar-a11y.test.tsx`, `library-import-dialog-a11y.test.tsx` (new) | `bun run test:dom` | red: keyboard trap; green: operable | none |
| PROOF-BROWSER-1 | a11y focus | TASK-029 | e2e | running app | focus restoration across dock; drag-drop import | `tests/e2e/review-flow-focus.spec.ts` (optional Playwright) | `bun run test:e2e -- review-flow` | red: focus lost; green: restored | skip if DOM sufficient (proportional) |
| PROOF-DB-1 | REQ-3 migration | TASK-005 | provider (local D1) | local D1 | clean apply; `PRAGMA table_info` shows new columns | script | `wrangler d1 migrations apply archestimator-proof-db --local` | red: migration fails; green: applied | local DB |
| PROOF-DB-2 | REQ-5 transaction | TASK-010,013 | provider (local D1) | local D1 | accept/supersede atomic | `scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` (extend) | `bun run cf:d1-rpc-proof` | red: partial commit; green: atomic | local DB |

## Browser-proof decision (proportional)

DOM tests prove: chip rendering, gate reasons, facet filtering, inspector states, import dry-run table, audit append-only, authz denials. Browser proof (Playwright) only for: review-action toolbar focus restoration across dialog/drawer, import drag-drop interaction. Named explicitly; not a default gate.

