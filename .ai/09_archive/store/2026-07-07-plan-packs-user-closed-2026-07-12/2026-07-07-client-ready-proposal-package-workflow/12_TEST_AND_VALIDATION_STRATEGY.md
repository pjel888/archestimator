# 12 — Test and Validation Strategy

## Proof policy (proportional, per AGENTS.md)

This feature has runtime behavior, user-facing workflow, data mutation, integrations (email), and auth/security surface → adversarial QA matrix applies. Browser/Playwright proof is **opt-in**; most claims are provable via unit + DOM tests. Browser proof is required only for: focus management across drawer↔dialog transitions, and the no-JS progressive-enhancement path of the Send Server Action (if any doubt). Those are explicitly scoped in the matrix below.

## Test execution matrix

Test-ID column maps the `TEST-NN` aliases used in `04`/`11`/`16`/`19` to the requirement row.

| Test-ID | Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|---|
| TEST-01 | FR-01 readiness model | `tests/vitest/proposal-readiness/compute-proposal-readiness.test.ts` | unit | new | crafted project/estimate/recipient fixtures | `bunx vitest run tests/vitest/proposal-readiness/compute-proposal-readiness.test.ts --maxWorkers=1` | blockers+warnings per case | none | backend |
| TEST-02 | FR-02 each blocker | (same file) | unit | new | one fixture per blocker id | (same) | each id returned with message | none | backend |
| TEST-03 | FR-03 each warning | (same file) | unit | new | one fixture per warning id | (same) | each id returned, non-blocking | none | backend |
| TEST-04 | FR-04 gate | `tests/vitest/publication/readiness-gate.test.ts` | action/integration | new | project+estimate+recipient fixture; stub readiness | `bunx vitest run tests/vitest/publication/readiness-gate.test.ts --maxWorkers=1` | `readiness_blocked` error + no write | none | backend |
| TEST-07 | FR-05 message | `tests/vitest/publication/owner-message.test.ts` | action/unit | new | recipient + message fixture; render to HTML | `bunx vitest run tests/vitest/publication/owner-message.test.ts --maxWorkers=1` | over-limit rejected; HTML escaped; default fallback; resend reuses | none | backend |
| TEST-09 | FR-06 honest labels | `tests/vitest/dom/recipient-composer-delivery-labels.test.tsx` | DOM | new | rendered composer with each status | `bunx vitest run tests/vitest/dom/recipient-composer-delivery-labels.test.tsx --maxWorkers=1` | tooltip + responded chip present | none | frontend |
| TEST-10 | FR-07 responded | `tests/vitest/publication/responded-status.test.ts` | action/integration | new | recipient + decision submit (local D1 or stub) | `bunx vitest run tests/vitest/publication/responded-status.test.ts --maxWorkers=1` | `delivery_status='responded'` post-decision | none | backend |
| TEST-11 | FR-08 notifications | `tests/vitest/notifications/dispatch.test.ts` | action/unit | new | workspace members + event | `bunx vitest run tests/vitest/notifications/dispatch.test.ts --maxWorkers=1` | unread bumps; cross-workspace unaffected; non-blocking | DATA-04 (skip if absent) | backend |
| TEST-12 | FR-09 resend/revoke gating | `tests/vitest/dom/publisher-drawer-resend-revoke-gating.test.tsx` | DOM | new | drawer with blocker | (same) | buttons disabled | none | frontend |
| TEST-14 | SEC-02 redaction | `tests/vitest/proposal-readiness/redaction.test.ts` | unit | new | fixture with internal-only fields | `bunx vitest run tests/vitest/proposal-readiness/redaction.test.ts --maxWorkers=1` | DTO has no internal fields | none | backend |
| TEST-15 | SEC-05/SEC-06 cross-pub `responded` | `tests/vitest/publication/responded-status.test.ts` (cross-pub case) | action/integration | new | recipient from pub A, token from pub B | (same) | no flip on pub B | none | backend |
| TEST-05 | UX-01 preflight | `tests/vitest/dom/publisher-drawer-preflight.test.tsx` | DOM | new | drawer with blockers/warnings | `bunx vitest run tests/vitest/dom/publisher-drawer-preflight.test.tsx --maxWorkers=1` | blockers disable Send; a11y roles | none | frontend |
| TEST-06 | UX-02 export hints | `tests/vitest/dom/proposal-export-preview-readiness.test.tsx` | DOM | new | dialog with warnings | `bunx vitest run tests/vitest/dom/proposal-export-preview-readiness.test.tsx --maxWorkers=1` | warnings subset rendered | none | frontend |
| TEST-08 | UX-03 message UI | `tests/vitest/dom/recipient-composer-message.test.tsx` | DOM | new | composer with inputs | `bunx vitest run tests/vitest/dom/recipient-composer-message.test.tsx --maxWorkers=1` | inputs + char counts + validation | none | frontend |
| TEST-13 | UX-04 terms note | `tests/vitest/dom/publisher-drawer-terms-note.test.tsx` | DOM | new | drawer | (same) | note + link render | none | frontend |
| PERF-01 | PERF-01 evaluator | `tests/vitest/perf/proposal-readiness.bench.test.ts` | bench | new | 1200-node/3000-row fixture + small fixture | `bunx vitest run tests/vitest/perf/proposal-readiness.bench.test.ts --maxWorkers=1` | p95 ≤ 50 ms | none | backend |
| Regression (publish) | existing `tests/vitest/publication/*` | integration | existing | existing | `bunx vitest run tests/vitest/publication --maxWorkers=1` | green | none | backend |
| Regression (publisher) | existing `tests/vitest/publisher/*` + `tests/vitest/component-library-*` adjacent | DOM/unit | existing | existing | `bunx vitest run tests/vitest/publisher --maxWorkers=1` | green | none | frontend |
| Regression (export) | existing export tests | unit | existing | existing | `bunx vitest run tests/vitest/proposal-export --maxWorkers=1` (if exists) else targeted | green | none | backend |
| Broad validate | `bun run validate` | mixed | existing | n/a | `bun run validate` | green | none | integration |
| Build | `bun run build` | build | existing | n/a | `bun run build` | green | none | integration |

## Commands (verified against repo scripts)

- `bun run type-check` — TypeScript.
- `bun run lint` — lint.
- `bun run lint:design-system` — design-lint (relevant for UI changes).
- `bun run test` — broad test.
- `bun run test:dom` — DOM tests.
- `bunx vitest run <path> --maxWorkers=1` — focused.
- `bun run cf:d1-apply-local <n>` — local D1 migration apply.
- `bun run validate` — broad (run for shared/auth/data surfaces; justified).
- `bun run build` — production build.
- Targeted Playwright only if a browser-only claim arises (focus across drawer↔dialog; no-JS Send). Default: skipped, static/DOM proof sufficient per AGENTS.md.

## Acceptance criteria objectivity

Every AC in `04` is phrased as an observable assertion (returned shape, rendered element, disabled state, status value). No "works correctly" / "performs well" / "is secure" placeholders. Subjective terms were replaced with measurable checks (e.g., "p95 ≤ 50 ms", "`delivery_status='responded'`", "Send button has `disabled` attribute").

## Coverage gaps (honest)

- **REL-01 (bounce)** — no automated test possible until the webhook exists; documented as BLOCKED-EXTERNAL.
- **Provider/hosted proof** — no live Cloudflare readback in the planning task; implementation must add a remote `PRAGMA table_info` proof after applying `0037` and a real send smoke under the standing mandate.
- **Cross-browser/a11y browser proof** — deferred unless a browser-only claim is contested; DOM a11y assertions cover the default bar.

## Failure handling for known-flaky commands

If `bun run validate` or `bun run build` is known-flaky/slow at implementation time, record the known-red command + date + failure class in the run log and substitute the focused vitest commands above as the narrower proof, per AGENTS.md. Do not claim green-validate without reading the exit code.
