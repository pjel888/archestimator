# 10 — Blast Radius And Dependencies

## Direct impact

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| `migrations/0037_*.sql`, `0038_*.sql` | new additive indexes | Required change | P1 |
| `src/lib/authz/d1-access.ts` | batched capability query added alongside `canEditEstimateInD1` | Required change (security-sensitive) | P2 `T-P2-01` |
| `src/app/workshop/projects/[projectId]/estimates/page.tsx` | N+1 loop replaced by batched call | Required change | P2 `T-P2-01` |
| `src/lib/repositories/workspace-repository.ts` | LIMITs added to unbounded reads; favorites indexes assumed | Required change (read paths HP-1/HP-2/HP-5) | P2 `T-P2-02` |
| `src/lib/repositories/component-library-repository.ts` | LIMITs; category TTL cache | Required change (HP-6) | P2 `T-P2-02`, `T-P2-03` |
| `src/lib/repositories/project-activity-feed-repository.ts`, `project-estimate-sheets-repository.ts`, `project-activity-repository.ts`, `project-charts-repository.ts`, `project-location-repository.ts`, `recipient-proposals-repository.ts`, `estimate-favorites-repository.ts` | LIMITs on unbounded reads | Probable change (read paths) | P2 `T-P2-02` |
| `scripts/lib/d1-query-budget.ts` | new shared helper | Required change | P0 |
| `scripts/build-performance-query-inventory.ts` | bucket rules extended; wired to package.json | Required change | P0 |
| `scripts/generate-cloudflare-d1-{8 repos}-proof.ts` | 8 new proof scripts | Required change | P3 |
| `scripts/seed-performance-test-data.ts` | fixture tiers extended | Required change | P3 (`T-P3-00`) |
| `src/lib/cloudflare/d1-performance-proof-router.ts` | extended to real repository fns + EXPLAIN + subrequest | Required change | P4 |
| `scripts/verify-cloudflare-d1-runtime-performance-proof.ts` | consumes extended output | Required change | P4 |
| `package.json` | new `cf:d1-*-proof` + `cf:verify-hosted-*-proof` scripts | Required change | P3, P4, P5 |
| `.github/workflows/ci.yml` | local proof gate wired | Required change | P5 |
| `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` | D1 query-count section added or cross-linked | Probable change (doc) | P5 |

## Transitive impact

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| Every `/workshop/*` route | faster reads (indexes), no behavior change | Verification only | P1/P2 |
| `/share/[token]` recipients | faster HP-7 (G3 index) | Verification only | P1 |
| Better Auth session handling | *no change* (DEC-AUTH-01 is a recommendation, not implemented here) | Explicitly unaffected | `08` |
| Durable Objects / Queues / Email / R2 | none | Explicitly unaffected | scope boundary |
| Bundle size | none (server-only changes) | Explicitly unaffected | `06` |
| Other active plan packs | reads this pack's budget table; does not edit their scope | Verification only | `02` non-goals |

## Compatibility / backward compatibility

- **Migration compatibility:** additive indexes only; no rewrite. Existing rows unaffected. No generated-type change (no binding change).
- **API compatibility:** no user-facing API change. The proof route extension is additive (new surfaces; old surfaces still work).
- **Behavioral compatibility:** HP-5 returns the same visible list (the N+1 fix computes the same accessible subset). P2 LIMITs could truncate a list beyond 10× volume — guarded in `05`.

## Affected tests

| Test area | Impact |
|---|---|
| Existing `tests/vitest/*` repository tests | Verification only (read behavior unchanged); may need new fixture rows for LIMIT boundary |
| New `tests/vitest/d1-access-batch-parity.test.ts` | New (TEST-SEC-01) |
| New proof-script smoke tests | New (P3) |

## Dependencies (external)

- Cloudflare D1 (binding `ARCH_DB`) — already active.
- `CRON_SECRET` — already required for hosted proof; P4 reuses, does not add.
- No new npm dependency. `scripts/lib/d1-query-budget.ts` uses only stdlib + existing `bun` APIs.

## Dependencies on sibling plan packs

- Reads (does not consume): `2026-07-07-d1-migration-state-and-schema-integrity` (confirms migration numbering is free for 0037/0038).
- Reads: `2026-07-07-cloudflare-worker-production-observability-and-budgets` (owns runtime enforcement; this plan measures only).
- Does **not** depend on: bundle/route perf, R2, DO, OWASP, Queue/Cron, provider-exit packs.
