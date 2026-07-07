# Test and Validation Strategy

## Testing philosophy (proportional)

Per `AGENTS.md` verification policy: targeted tests that prove the changed behavior. Broad `bun run validate` is reserved for shared-logic/auth/data-integrity/release. This plan's minimization work is security/privacy-bearing on a public surface → **targeted route-level + composer-level + repository-level tests are the right size**, plus provider readback for the over-fetch proof. Browser/Playwright proof is **intentionally skipped** for Phases 1-2/4-5 (no interaction/routing/auth-state change; the claim is provable by static + unit + DOM tests) and is required only for Phase 6 (Turnstile) and optionally Phase 7 (session revocation re-session flow).

## Test layers

| Layer | Tool | When used |
|---|---|---|
| Unit (composer/repository pure logic) | vitest | SEC-03 facts allow-list; repository row-type narrowing |
| DOM (component) | vitest + RTL | SharePageComments dead-field cleanup regression |
| Route-handler (integration) | vitest + fake D1 | TEST-01 activity GET; comment/decision/event shadow paths |
| String-contract | vitest | existing `security-findings-publication-contracts.test.ts` (update if route text changes) |
| Benchmark | vitest (`shared-link-activity-benchmark.test.ts`) | PERF-01 |
| Provider readback | `wrangler` D1 query / hosted curl | Phase 4 over-fetch proof |
| Browser | Playwright | Phase 6 Turnstile only |

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 (DTO allow-list, no meta) | `tests/vitest/share/share-activity-route.test.ts` | Route-handler | New | seed publication + comments | `bun test tests/vitest/share/share-activity-route.test.ts` | response keys == allow-list, no `meta`/`email` | none | executor |
| FR-02 (comments w/o session) | same | Route-handler | New | seed + public comment | same | anonymous call returns comment items | none | executor |
| FR-03 (decisions/events recipient-scoped) | same | Route-handler | New | seed + 2 recipients + decisions/events | same | recipient-A sees only A; anonymous sees none | none | executor |
| FR-04 (internal excluded) | same | Route-handler | New | seed + internal comment | same | internal item absent | none | executor |
| FR-05 (pagination) | same | Route-handler | New | seed + >limit comments | same | limit/hasMore/nextCursor; tampered cursor → 400 | none | executor |
| FR-06 (revoked/expired 404) | same | Route-handler | New | seed + revoked pub | same | 404 + no-store | none | executor |
| FR-07 (password 423) | same | Route-handler | New | seed + password_hash | same | 423 then 200 | none | executor |
| SEC-01 (no author_email over-fetch) | `tests/vitest/share/share-activity-route-repo.test.ts` (or extend existing repo test) | Unit/Repository | New | fake D1 | focused vitest | returned row type omits `author_email` | none | executor |
| SEC-02 (no recipient email over-fetch) | same | Unit/Repository | New | fake D1 | focused vitest | returned row type omits `email` | none | executor |
| SEC-03 (facts allow-list) | `tests/vitest/activity-security.test.ts` | Unit (composer) | Extend | metadata object | `bun test tests/vitest/activity-security.test.ts` | off-list key not in facts | none | executor |
| SEC-04 (redactor routing) | `tests/vitest/share/share-route-logging.test.ts` | Unit/Integration | New | log sink + error fixture | focused vitest | token-bearing message redacted | none | executor |
| SEC-05 (IDs re-hashed) | `tests/vitest/share/share-activity-route.test.ts` | Route-handler | New | seed | same | ids match `/^act_[0-9a-f]{16}$/` | none | executor |
| SEC-06 (cross-pub scoping) | `tests/vitest/project-publication-public-repository.test.ts` | Existing | Extend if needed | two publications | existing vitest | cross-pub recipient rejected | none | executor |
| SEC-10 (rate limit 429) | `tests/vitest/share/share-activity-route.test.ts` | Route-handler | New | seed | same | 61st → 429 + Retry-After | none | executor |
| API-01 (no-store) | `tests/vitest/share-no-store-invariants.test.ts` | Existing | Extend | n/a | existing vitest | activity route all-branches no-store | none | executor |
| API-02 (uniform error) | `tests/vitest/share/share-activity-route.test.ts` | Route-handler | New | seed | same | 404/423/429/400/500 shapes correct | none | executor |
| REL-01 (D1 failure → 500 uniform) | same | Route-handler | New | fake D1 throwing | same | 500 uniform, no partial body | none | executor |
| DATA-01 (retention rules) | `tests/vitest/compliance/retention-rules.test.ts` (or extend) | Unit | New/Extend | fake D1 + past-TTL rows | focused vitest | rows purged + `data_retention_events` written | none | executor |
| DATA-02 (no-soft-delete invariant) | static (comment + grep) | Static | New | n/a | `rg "deleted_at" migrations/0014*` | no `deleted_at` on share tables | none | executor |
| PERF-01 (p95 budget) | `tests/vitest/shared-link-activity-benchmark.test.ts` | Benchmark | Extend | 1000 comments + 50 recipients + 50 responses + 200 events | `bun test tests/vitest/shared-link-activity-benchmark.test.ts` | p95 ≤ 300ms (std) / ≤ 500ms (1000-fixture) | none | executor |
| TEST-02 (facts allow-list — composer) | `tests/vitest/activity-security.test.ts` | Unit | Extend | metadata | same as SEC-03 | off-list key absent | none | executor |
| TEST-03 (retention dry-run) | same as DATA-01 | Unit | New | fake D1 | focused vitest | purged + audited | none | executor |
| TEST-04 (redactor) | same as SEC-04 | Unit | New | log sink | focused vitest | redacted | none | executor |

## Commands

- `bun run type-check` — type narrowing (SEC-01/02, FR-01).
- `bun run lint` / `bun run lint:design-system` — only if UI touched (WP-1.7).
- `bun test tests/vitest/share/share-activity-route.test.ts` — Phase 2 primary.
- `bun test tests/vitest/activity-security.test.ts` — composer.
- `bun test tests/vitest/shared-link-activity-benchmark.test.ts` — PERF-01.
- Focused vitest for repository/retention/logging.
- `git diff --check` — before commit.
- (Phase 4) `wrangler d1 execute ARCH_DB --local --command "EXPLAIN …"` or hosted equivalent.
- (Phase 6) Playwright for Turnstile.

## Known-red ledger

- (None specific to this plan.) The repo's known default-heap `bun run type-check` red (per the transition plan's `22_…md`) is unrelated; use focused vitest/type-check for this plan's claims. If a broad command is needed, document the known-red and use the narrower proof.

## Acceptance criteria objectivity

Every acceptance criterion above is observable: response keys, HTTP status, row-type field absence, p95 number, grep result. No "works correctly" / "is secure".

## Manual QA

Only where named: Phase 6 Turnstile browser proof; Phase 7 re-session flow (optional browser). Phases 1-2/4-5 have no manual-QA-only criteria.
