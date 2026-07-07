# 06 — Architecture And Technical Design

## Current-state architecture (evidence: repo)

```mermaid
flowchart LR
  subgraph Workshop[workshop route layer]
    RP[Server Component / Server Action]
  end
  RP -->|"calls"| AUTH[auth floor: getSession + closed_beta + profiles]
  RP -->|"calls"| REPO[repository layer src/lib/repositories]
  REPO -->|"getCloudflareD1Database().prepare().bind()"| D1[(D1 ARCH_DB)]
  RP -.->|"lazy client actions"| ACTIONS[Server Actions src/lib/*/actions.ts]
  ACTIONS --> REPO
  PROOF[proof scripts scripts/generate-cloudflare-d1-*-proof.ts] -->|"local sqlite3"| LOCAL[(local sqlite3 fixture)]
  PROOFH[verify-cloudflare-d1-runtime-performance-proof.ts] -->|"CRON_SECRET fetch"| ROUTER[/__cloudflare/d1-performance-proof]
  ROUTER --> D1
```

- **Data access pattern:** repositories call `getCloudflareD1Database()` (binding `ARCH_DB`) then `database.prepare(sql).bind(...)`. No `Repository()` factory or `getRepository()` accessor exists (`rg` returned nothing). Each repository owns its own SQL.
- **Tenant boundary:** `getCurrentWorkspaceProject(projectId)` (`workspace-repository.ts:2526`) is the enforced gate; every project-scoped read flows through it.
- **Request dedup:** React `cache()` wraps `getProjectLocation`, the publication-access row, and several workspace lookups — same-request dedup only.
- **Proof split:** local SQLite proofs run synthetic SQL against a fixture DB; the hosted proof endpoint runs real SQL against D1. Today these two worlds use *different SQL* (synthetic `__archestimator_d1_proof_*` tables vs real schema) — Gap F4.

## Target-state architecture

```mermaid
flowchart LR
  RP[Server Component / Server Action] --> AUTH
  RP --> REPO[repository layer]
  REPO --> D1[(D1 ARCH_DB)]
  INVT[build-performance-query-inventory.ts] -->|"static scan"| REPO
  BUDGET[d1-query-budget.ts shared schema] -.shared.-> PROOF
  BUDGET -.shared.-> PROOFH
  PROOF --> LOCAL[(local sqlite3 + real repo SQL)]
  PROOFH --> ROUTER[/__cloudflare/d1-performance-proof extended]
  ROUTER -->|"real repository functions"| D1
  ROUTER -->|"EXPLAIN QUERY PLAN"| D1
  CI[CI gate] -->|"runs"| PROOF
  RELEASE[release gate] -->|"runs"| PROOFH
```

Key target-state decisions:

1. **One shared budget schema** (`scripts/lib/d1-query-budget.ts`) consumed by every proof script and the hosted router. Closes the "scattered budgets" finding.
2. **Local proofs use real repository SQL**, not synthetic `__archestimator_d1_proof_*` tables. This makes local and hosted proof comparable. (Local still runs against sqlite3 with a fixture, but the SQL string is the repository's actual query.)
3. **Hosted proof covers real repository functions** via the extended router. Each surface names the repository function it proves (e.g., `workspace_homebase → getWorkshopHomebaseData`).
4. **Hosted `EXPLAIN QUERY PLAN` gate** as a first-class proof output, so index-coverage claims are checked against the production planner, not the local one.
5. **CI gate = local proof; release gate = hosted proof.** Local proof runs on every PR (fast, no credentials). Hosted proof runs pre-release (needs `CRON_SECRET`).

## Component boundaries and contracts

| Boundary | Contract | Owner |
|---|---|---|
| Repository → D1 | unchanged SQL-via-`prepare().bind()` | each repository file |
| Proof script → budget schema | imports `QUERY_SURFACE_SPEC`, `BUDGET_RESULT` from `scripts/lib/d1-query-budget.ts` | P0 |
| Hosted router → repository fn | router calls the real repository function with a fixture-scoped workspace/project id | P4 |
| CI → local proof | `bun run cf:d1-*-proof` exit code + JSON budget assertion | P5 |
| Release → hosted proof | `bun run cf:d1-runtime-proof` JSON `hostedP95Ms ≤ budget` | P5 |

## Reusable abstractions (and where NOT to add them)

- **Do** extract `scripts/lib/d1-query-budget.ts` (P0). Five+ scripts duplicate `percentile()`/`runSqlite()`/`QUERY_SPECS`; consolidation is a clear win.
- **Do not** introduce a "budget middleware" in the Worker request path. Runtime enforcement is the observability pack's concern; this plan only measures and gates. Adding per-request query-counting middleware would change every hot path's latency and is out of scope.
- **Do not** abstract repository SQL behind a query-builder. The repositories' raw SQL is already EXPLAIN-friendly and readable; a builder would obscure index usage and harm the very budget work this plan does.

## State ownership (unchanged by this plan)

- D1 = durable source of truth (unchanged).
- React `cache()` = request-scoped dedup (unchanged).
- The P2 app-layer cache for global categories (`T-P2-03`) is the **only new state owner** — a process-local TTL cache for `component_category_nodes`. Rationale: it is static taxonomy (`using(true)` RLS, global); caching is safe and removes a FULL SCAN from HP-6. Invalidated on category write actions.

## Coupling and dependency direction

- `scripts/lib/d1-query-budget.ts` ← proof scripts (one-way import).
- `d1-performance-proof-router.ts` → repository functions (one-way call, read-only).
- No new coupling between repositories. P2's batched capability check in `T-P2-01` is local to `estimates/page.tsx` + `d1-access.ts`.

## Failure boundaries

- Local proof failure → CI red, blocks PR. Safe; no production impact.
- Hosted proof failure → release gate red, blocks rollout. Safe.
- P1 additive index migration failure → D1 migration rollback (`DROP INDEX IF EXISTS`); fix-forward safe.
- P2 N+1 fix changes authorization semantics → **highest-risk failure boundary**. Mitigation: denial-test parity proof in `08`/`12` before merge; the batched query is a single SQL `EXISTS` set-check authored to be semantically identical to the loop of individual checks.

## Architectural alternatives (rejected; full detail in `15`)

- **A1 rejected:** Runtime query-budget enforcement middleware. Out of scope (observability pack); adds latency to every hot path.
- **A2 rejected:** Denormalized `estimate_summary` table now. The 3-correlated-subquery cost in `listProjectEstimates` is index-covered and only hurts at high row volume; deferred to `T-P2-04` gated on measured hosted p95, not built blind.
- **A3 rejected:** Move all proof to hosted only. Violates "fast local iteration" and the CI gate needs local proof.
- **A4 rejected:** A generic query-builder for index-friendliness. Harms readability and EXPLAIN transparency.

## Server/client boundary impact

None. All changes are server-side (repositories, scripts, Worker route). No `"use client"` boundary moves. No bundle impact. No RSC payload change except potentially smaller payloads where P2 LIMITs trim unbounded reads (a net win).
