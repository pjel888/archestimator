# 12 — Test and Validation Strategy

**Principle (AGENTS.md):** proportional verification. UI surfacing changes lean on DOM/unit tests + targeted Playwright for browser-only viewport claims; broad `validate`/`build` reserved for shared-logic/auth/a11y risk. No test-framework change.

---

## Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| REQ-PS-01 (mobile reach) | `tests/vitest/publisher-roster-client.test.tsx` (+ new mobile empty-state test) | DOM + Playwright @375px | extend/new | mock roster | `bun run test:dom`; `playwright` targeted | mobile variant renders copy-URL + "copied" | none known | impl |
| REQ-PS-02 (no duplication) | (cross-doc check) | review | n/a | n/a | manual | file-scope matrix consistent | n/a | lead |
| REQ-FR-01 (generate) | `tests/vitest/project-publication-actions.test.ts` | unit (action) | extend | D1 mock project | `vitest` focused | empty-snapshot guard + success/failure surfaces | none | impl |
| REQ-FR-02 (copy) | `tests/vitest/publisher-roster-client.test.tsx` | DOM | extend | mock row | `bun run test:dom` | copied/failed/live-region; disabled when redacted | none | impl |
| REQ-FR-03 (email add) | `tests/vitest/recipient-email-composer.test.tsx` | DOM + `tests/vitest/project-publication-actions.test.ts` unit | extend | mock publication/recipients | `bun run test:dom`; `vitest` | invalid/self/dedup/50-cap/not-configured/batch-abort | none | impl |
| REQ-FR-04 (resend) | `tests/vitest/project-publication-rotate-resend.test.ts` (+ composer DOM) | unit + DOM | extend | mock recipient + rate-limit clock | `vitest` focused; `bun run test:dom` | rate-limit window msg; send-before-persist prior-link-intact; unsubscribed block | none | impl |
| REQ-FR-05 (revoke) | `tests/vitest/project-publication-actions.test.ts` (+ drawer DOM) | unit + DOM | extend | mock published row | `vitest`; `bun run test:dom` | confirm-gated; revoked badge; copy/open disabled; recovery note | none | impl |
| REQ-FR-06 (confirm access view) | `tests/vitest/publisher-activity-feed.test.tsx` | DOM | extend | mock events | `bun run test:dom` | honest labels; empty state | none | impl |
| REQ-FR-07 (rotate) | `tests/vitest/project-publication-rotate-resend.test.ts` (+ drawer DOM) | unit + DOM | extend | mock publication | `vitest`; `bun run test:dom` | confirm-gated; new link; recipients "needs resend" | none | impl |
| REQ-A11Y-01 (keyboard/focus) | `tests/vitest/publisher-drawer-actions.test.ts` (+ DOM) | DOM + targeted Playwright | extend | mock drawer | `bun run test:dom`; `playwright` | keyboard reaches actions; focus restore on close | none | impl |
| REQ-A11Y-02 (responsive/motion) | Playwright @320/375/768px | browser | new | live route | `playwright` targeted | no clipped actions; reduced-motion honored | none | impl |
| PERF-01 | build chunk + Profiler | build + manual | new | n/a | `bun run build`; React Profiler | ≤2% chunk / ≤50ms drawer regression | none | impl |
| REQ-SEC-01 (authz unchanged) | `tests/vitest/publisher-rbac.test.ts` | unit | existing | mock roles | `vitest` | manager gate enforced; viewer redacted | none | impl |

## Commands (verified against `package.json` scripts; impl should confirm before running)
- `bun run type-check`
- `bun run lint` (and `bun run lint:design-system` if UI tokens touched — Option B does not)
- `bun run test` / `bun run test:dom`
- Focused `vitest run <file>`
- `bun run build` (proportional broad — shared logic + a11y)
- Targeted Playwright only for viewport/focus browser-only claims (not a default gate per AGENTS.md Codex speed guardrail)

## Proof-contract rows (required by Improve-Plan §11)

`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Requirement IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-01 | REQ-PS-01, REQ-A11Y-02 | 1.1 | DOM + browser | mock roster; viewport 375px | mobile variant renders "copy URL" button; click → "copied" | `tests/vitest/publisher-roster-client.test.tsx` (+ new mobile test) | `bun run test:dom`; Playwright @375px | green: button+state present | none (mock) |
| PROOF-02 | REQ-PS-01 | 1.2 | DOM | mobile message | help text references deep-link behavior | same file | `bun run test:dom` | green | none |
| PROOF-03 | REQ-FR-01 | 2.1 | unit (action) | D1 mock project, empty snapshot | empty-snapshot guard returns error; success returns link | `tests/vitest/project-publication-actions.test.ts` | `vitest run tests/vitest/project-publication-actions.test.ts` | green | mock D1 |
| PROOF-04 | REQ-FR-02 | 2.1, 2.3 | DOM | mock row; clipboard throw | "copied"/"failed"+URL fallback; disabled when redacted | `tests/vitest/publisher-roster-client.test.tsx` | `bun run test:dom` | green | mock clipboard |
| PROOF-05 | REQ-FR-03 | 2.2 | DOM + unit | mock pub/recipients; 50+; self; invalid | invalid→reject; self→block; dedup; 50-cap; not-configured; batch-abort | `tests/vitest/recipient-email-composer.test.tsx` + action unit | `bun run test:dom`; `vitest run tests/vitest/project-publication-actions.test.ts` | green | mock |
| PROOF-06 | REQ-FR-04 | 2.2 | unit + DOM | mock recipient; rate-limit clock t=0,t=4min | 2nd within 5min → denied w/ window; send-fail → prior link intact | `tests/vitest/project-publication-rotate-resend.test.ts` + composer DOM | `vitest run tests/vitest/project-publication-rotate-resend.test.ts`; `bun run test:dom` | green | mock clock |
| PROOF-07 | REQ-FR-05 | 2.1 | unit + DOM | mock published row; double revoke | confirm-gated; revoked badge; copy/open disabled; idempotent | `tests/vitest/project-publication-actions.test.ts` + drawer DOM | `vitest`; `bun run test:dom` | green | mock |
| PROOF-08 | REQ-FR-06 | 3.1 | DOM | mock events | honest labels; `sent`≠"opened"; empty state | `tests/vitest/publisher-activity-feed.test.tsx` | `bun run test:dom` | green | mock |
| PROOF-09 | REQ-FR-07 | 2.1 | unit + DOM | mock pub; rotate | confirm-gated; new link; recipients "needs resend" | `tests/vitest/project-publication-rotate-resend.test.ts` + drawer DOM | `vitest`; `bun run test:dom` | green | mock |
| PROOF-10 | REQ-A11Y-01 | 2.1,2.3,4.1 | DOM + browser | mock drawer; keyboard | Tab reaches actions; focus restore on close; live-region | `tests/vitest/publisher-drawer-actions.test.ts` (+ DOM) | `bun run test:dom`; Playwright | green | mock |
| PROOF-11 | REQ-A11Y-02 | 4.1 | browser | live route @320/375/768 | no clipped actions; reduced-motion honored | (new playwright) | `playwright` targeted | green | none |
| PROOF-12 | PERF-01 | 4.1 | build + manual | 1 project + 25-row roster | ≤2% chunk / ≤50ms drawer-open regression | build output + Profiler | `bun run build`; React Profiler | green within threshold | none |
| PROOF-13 | REQ-SEC-01 | (audit) | unit | mock roles | manager gate enforced; viewer redacted | `tests/vitest/publisher-rbac.test.ts` | `vitest run tests/vitest/publisher-rbac.test.ts` | green | mock |
| PROOF-14 | REQ-PS-02 | 0.1, 4.2 | review | n/a | file-scope matrix consistent; no duplicate tasks | (cross-doc) | manual review | green | n/a |
| PROOF-15 | AQ-9 (rotate-invalidates-recipient) | 2.1 | integration | mock rotate then recipient open | old recipient link blocked | `tests/vitest/project-publication-rotate-resend.test.ts` (+ share-pack evidence) | `vitest`; cross-pack evidence | green | relies on share-pack evidence |

## Known-red broad-validation posture (Improve-Plan §11)
- The default proof path is **targeted** (`type-check`, `lint`, focused `vitest`, `test:dom`, targeted Playwright), per AGENTS.md proportional verification and the Codex speed guardrail.
- Broad `bun run validate` / `bun run build` is reserved for when the change touches shared logic (publisher/publication) + a11y — it will be run in Phase 4 (`11` Task 4.1) because this pack touches shared files. If `validate` is known-red/flaky at impl time (e.g., unrelated concurrent-agent breakage), the impl must: record the known-red command + failure excerpt, require the **targeted** proofs above to pass, and capture (not ignore) unrelated pre-existing failures rather than claiming a green broad gate.
- Numeric coverage gates: not claimed (no executable coverage command/artifact named in repo scripts) — coverage is proven by the proof-contract rows above, not a % threshold.



| ID | User/attacker model | Scenario | Setup | Harness | Expected signal | Status | Evidence |
|---|---|---|---|---|---|---|---|
| AQ-1 | owner on phone | viewport 375px, tries to send | Playwright @375px | mobile message + copy-URL present | recovery affordance visible | planned | impl |
| AQ-2 | read-only viewer | attempts copy/manage | mock viewer role | DOM | actions disabled/redacted | planned | impl |
| AQ-3 | abusive owner | resend twice in 5min | mock clock | vitest | second denied w/ window | planned | impl |
| AQ-4 | owner, email down | circuit breaker open | mock `sendEmail` !ok | vitest | chip `failed` + message | planned | impl |
| AQ-5 | owner, link unresolvable | batch add abort | mock base link null | vitest | batch-abort message | planned | impl |
| AQ-6 | owner, clipboard blocked | insecure context | mock clipboard throw | DOM | "failed" + URL fallback | planned | impl |
| AQ-7 | owner, stale drawer | query stale 10s+ | mock stale | DOM | refetch on open | planned | impl |
| AQ-8 | owner, revoke race | two concurrent revokes | mock | vitest | idempotent (status check) | planned | impl |
| AQ-9 | owner, rotate then recipient opens old link | rotate invalidates hash | mock | integration (cross-pack) | old recipient link blocked | planned | impl + share pack evidence |
| AQ-10 | owner, malformed email chip | unicode/oversized | DOM | composer | rejected w/ validation | planned | impl |

## Validation gaps / honest limits
- **Provider proof:** this pack's tests assert owner-side surfacing, **not** real email delivery (covered by standing Cloudflare mandate + workflow pack smoke).
- **Hosted/production:** not claimed from local checks.
- **Cross-pack revoked-link recipient behavior:** relies on the share/activity packs' evidence (AQ-9 marks it integration, not re-proven here).
