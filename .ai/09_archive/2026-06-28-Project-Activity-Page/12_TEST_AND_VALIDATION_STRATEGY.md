# 12 — Test and Validation Strategy

## Test pyramid for this feature

| Layer | Tool | Coverage |
|---|---|---|
| Unit (pure logic) | Vitest (jsdom) | URL state, action-class derivation |
| Repository (data access) | Vitest (jsdom) with Supabase stubs | All filter/scope/pagination branches |
| Component (DOM) | Vitest (jsdom) + React Testing Library | Filter row, timeline, states, a11y |
| Security (denial) | Vitest (jsdom) | Cross-project IDOR, PII leak, malformed params |
| Route Handler | Vitest (jsdom) | Authenticated Load more loader, malformed cursor, unauthorized project |
| Migration/RPC | Vitest/schema assertions + local/provider SQL proof | Collaboration-audit direct table denial and authorized RPC |
| Performance | Authenticated Playwright timing fixture + `withPerfTraceRequest` | TTFB p50/p95 |
| Adversarial QA | UltraQA matrix | See below |
| E2E | **None required for v1** | Per `02` non-goals + repo proportional policy |

## Test Execution Matrix

| Requirement | Test file path | Test type | New/existing | Fixture | Command | Expected evidence | Pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 | `tests/vitest/project-activity-page/route.test.tsx` | DOM | New | Seeded project + activity rows | `bun run test:dom -- project-activity-page/route` | 200 OK, chrome visible | None | Impl agent |
| FR-02 | `tests/vitest/project-activity-page/route.test.tsx` | DOM | New | Invalid `projectId`; spectator role | Same | `notFound()` / redirect / permission-denied panel | None | Impl agent |
| FR-03 (whole-project) | `tests/vitest/project-activity-page/repository.test.ts` | Unit | New | Seeded rows across all 6 sources | `bun run test:dom -- project-activity-page/repository` | Items from all 6 sources appear; sorted correctly | None | Impl agent |
| FR-04 (scope) | `tests/vitest/project-activity-page/repository.test.ts` | Unit | New | Three scope fixtures | Same | Scope filter changes item set | None | Impl agent |
| FR-05 (action filter) | `tests/vitest/project-activity-page/repository.test.ts` + `action-classes.test.ts` | Unit | New | Activity fixtures per bucket | Same | Action filter matches expected buckets | None | Impl agent |
| FR-06 (actor) | `tests/vitest/project-activity-page/repository.test.ts` + `client.test.tsx` | Unit + DOM | New | Two actor fixtures | Same | Actor filter restricts timeline | None | Impl agent |
| FR-07 (client/recipient) | `tests/vitest/project-activity-page/repository.test.ts` + `client.test.tsx` | Unit + DOM | New | Two recipient fixtures | Same | Recipient filter restricts timeline; no email leak | None | Impl agent |
| FR-08 (URL state) | `tests/vitest/project-activity-page/url-state.test.ts` | Unit | New | URL fixtures | Same | Round-trip parse/serialize preserves state | None | Impl agent |
| FR-09 (cursor) | `tests/vitest/project-activity-page/repository.test.ts` | Unit | New | 60 fixture rows | Same | "Load more" returns correct slice, no dupes | None | Impl agent |
| FR-10 (partial) | `tests/vitest/project-activity-page/repository.test.ts` | Unit | New | Stubbed failing source | Same | `partial=true`, `unavailableSources` surfaced | None | Impl agent |
| FR-11 (refresh) | `tests/vitest/project-activity-page/client.test.tsx` | DOM | New | n/a | Same | Refresh drops cursor | None | Impl agent |
| UX-02..UX-07 | `tests/vitest/project-activity-page/client.test.tsx` | DOM | New | State fixtures | Same | Each state renders correctly | None | Impl agent |
| UX-08 | `tests/vitest/project-activity-page/client.test.tsx` | DOM | New | `actor=me` URL | Same | Filter applied | None | Impl agent |
| A11Y-01..A11Y-03 | `tests/vitest/project-activity-page/client.test.tsx` (axe + keyboard) | DOM | New | Rendered timeline | Same | axe pass; Tab order correct | None | Impl agent |
| A11Y-04..A11Y-06 | Manual | Manual | New | n/a | Manual | Reduced motion respected; contrast pass | n/a | Impl agent |
| SEC-01 (ownership) | `tests/vitest/project-activity-page/security.test.ts` | DOM | New | Cross-project fixture | Same | Other project's actor returns zero rows | None | Impl agent |
| SEC-02 (PII) | `tests/vitest/project-activity-page/security.test.ts` | DOM | New | Comment with author_email | Same | Email not in rendered HTML | None | Impl agent |
| API-01 (loader) | `tests/vitest/project-activity-page/route-handler.test.ts` | Unit/DOM | New | Auth/unauth project fixtures | `bun run test:dom -- project-activity-page/route-handler` | Loader appends page, denies unauthorized, safe error body | None | Impl agent |
| SEC-04 (RLS / no service role / RPC) | Code review + migration proof | Manual + Unit | New | n/a | `rg "service_role\|supabaseAdmin" src/app/api/projects src/components/workshop/project-activity src/lib/repositories/project-activity-feed-repository.ts` | Zero matches; direct table read denied; RPC authz proof recorded | None | Impl agent |
| SEC-08 (URL injection) | `tests/vitest/project-activity-page/url-state.test.ts` | Unit | New | Malformed URLs | Same | Unknown values fall back to defaults | None | Impl agent |
| PERF-01..PERF-04 | Auth timing fixture + `bun run build` | Perf | New | Real seeded project + auth storage state | `bunx playwright test tests/perf/project-activity-auth-timing.spec.ts --project=chromium` | p50/p95 within budget; raw samples captured | None | Impl agent |
| DATA-01 (RPC migration) | Migration/schema tests + SQL proof | Unit + Provider/local | New | Authorized + unauthorized users | `bun run test:dom -- project-activity-page/migration` + SQL proof | RPC exists; direct table read denied; authorized RPC succeeds; unauthorized fails/no rows | None | Impl agent |
| DATA-04 (index usage) | Manual `EXPLAIN` | Manual | New | n/a | psql / Supabase dashboard | Index usage confirmed | None | Impl agent |
| ARCH-01..ARCH-05 | Code review | Manual | New | n/a | Manual | Server/client boundary clean; no client imports repository | None | Impl agent |

## UltraQA adversarial scenario matrix

For implementation QA. Each row produces a captured artifact.

| ID | User/attacker model | Scenario | Setup | Command | Required assertion | Maps to Req/Risk | Artifact path | Status |
|---|---|---|---|---|---|---|---|---|
| QA-01 | Authenticated user on project A | Try to load `?actor=<project-B-user>` | Seed cross-project fixtures | DOM test | Zero rows for that actor | SEC-01/RISK-11 | `.ai/05_logs/project-activity/QA-01.txt` | Pending |
| QA-02 | Authenticated user | Try `?scope=estimate:<UUID-from-other-project>` | Seed cross-project estimate | DOM test | Empty result; no leakage | FR-04/SEC-01 | `.ai/05_logs/project-activity/QA-02.txt` | Pending |
| QA-03 | Attacker controls URL | `?scope=whole-project&action=<script>` | n/a | DOM test | Script value ignored; defaults applied | T-08 | `.ai/05_logs/project-activity/QA-03.txt` | Pending |
| QA-04 | Attacker controls loader cursor | `cursor=<invalid-base64>` | n/a | Route Handler + repo test | Reset safely or 400 safe error; no SQL text | T-09 | `.ai/05_logs/project-activity/QA-04.txt` | Pending |
| QA-05 | Authenticated user | Recipient comment body contains `<script>alert(1)</script>` | Seed comment | DOM test | Rendered as text; no execution | T-05 | `.ai/05_logs/project-activity/QA-05.txt` | Pending |
| QA-06 | Authenticated user | Two recipients with same display name | Seed two recipients | DOM test | Dropdown uses non-PII disambiguator; no email in DOM | SEC-02/RISK-02 | `.ai/05_logs/project-activity/QA-06.txt` | Pending |
| QA-07 | Authenticated user | All 6 sources return 0 rows | Empty fixtures | DOM test | Empty state copy "no activity yet"; counts `scopeTotalCount=0` | UX-04 | `.ai/05_logs/project-activity/QA-07.txt` | Pending |
| QA-08 | Authenticated user | All filters exclude everything | Seed + apply restrictive filter | DOM test | Empty state copy "no matches"; counts `scopeTotalCount>0`, `filteredTotalCount=0` | UX-04 | `.ai/05_logs/project-activity/QA-08.txt` | Pending |
| QA-09 | Authenticated user | One source fails (e.g. collab_audit RPC) | Stub failure | DOM test | Partial banner + other sources render; count is not misleading | FR-10/REL-01 | `.ai/05_logs/project-activity/QA-09.txt` | Pending |
| QA-10 | Authenticated user | Rapid scope change x5 | n/a | DOM test | Final state matches last URL; no leaks | RISK-03 | `.ai/05_logs/project-activity/QA-10.txt` | Pending |
| QA-11 | Authenticated user | Rapid "Load more" x3 | n/a | Route Handler + DOM test | No duplicate items; cursor stable; URL unchanged | FR-09 | `.ai/05_logs/project-activity/QA-11.txt` | Pending |
| QA-12 | Spectator role | Visit page | Spectator session | DOM test | Permission-denied panel | FR-02 | `.ai/05_logs/project-activity/QA-12.txt` | Pending |
| QA-13 | Unauthenticated | Visit page and loader | Sign out | Manual/route test | Proxy redirect or 401/403 safe response | SEC-01/API-01 | `.ai/05_logs/project-activity/QA-13.txt` | Pending |
| QA-14 | Authenticated user | Network offline on Load more | DevTools offline | Manual | Friendly error UI; retry works | REL-02 | `.ai/05_logs/project-activity/QA-14.txt` | Pending |
| QA-15 | Authenticated user | Comment body 1000 chars (max) | Seed long comment | DOM test | Renders with graceful truncation/expand | UX-03 | `.ai/05_logs/project-activity/QA-15.txt` | Pending |
| QA-16 | Authenticated user | Estimate event with 30 changed_fields | Seed large change | DOM test | Renders as collapsed list | UX-03 | `.ai/05_logs/project-activity/QA-16.txt` | Pending |

## Validation commands

```bash
# Type-check
bun run type-check

# Lint
bun run lint
bun run lint:design-system
bun run lint:design

# Focused tests
bun run test:dom -- project-activity-page

# Full gate
bun run validate

# Build
bun run build
```

## Coverage

- Focused behavioral coverage is mandatory for every requirement row above.
- No numeric line-coverage gate is claimed unless the implementation agent adds and records an executable Vitest coverage command.
- If a numeric coverage command is added, record the exact command and artifact in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

## Full validation known-red handling

- Run `bun run validate` as a final broad check.
- If it exits 0, record the clean result.
- If it fails only in documented pre-existing unrelated DOM suites from `.ai/10_state/current-state.md` FAST PATH, record failing files/counts and require all project-activity focused tests, `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run lint:design`, and `bun run build` to pass.
- Do not claim a green validate gate when the command exits non-zero.

## Test-first / TDD

- WP-1: RED — write `tests/vitest/project-activity-page/repository.test.ts` first; run and capture the assertion failures. GREEN — implement the repository. REFACTOR — extract helpers.
- WP-3, WP-4: RED — write the helper tests first. GREEN — implement.
- WP-7: RED — write the DOM tests first. GREEN — implement the component.
- For WP-5, WP-6, WP-8, WP-9: characterization + smoke tests are sufficient.

## Cleanup

- After QA, delete any temporary fixtures (long comment body, etc.) from the seeded data.
- Remove any `console.log` debug prints.
- Remove any temporary scripts.
- Capture the cleanup receipts in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.
