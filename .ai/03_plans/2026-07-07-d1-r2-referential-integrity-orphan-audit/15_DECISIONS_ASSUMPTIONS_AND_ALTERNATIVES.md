# 15 — Decisions, Assumptions, and Alternatives

## Architectural decisions

### DEC-001 — Read-only-by-type (AD-1)
- **Problem:** guarantee detection never mutates D1/R2.
- **Constraints:** must be provable in a test.
- **Options:** (A) type-level `ReadOnlyD1` interface; (B) runtime flag in a wrapper; (C) convention + review.
- **Advantages/disadvantages:** A — compile-time guarantee, slight verbosity; B — easy to bypass; C — weak.
- **Security/perf/ops implications:** A has no perf cost; strongest security.
- **Recommended:** A. **Reason:** the read-only guarantee is a core security property (SEC-001); type-level is the only option that cannot be bypassed by a refactor accident. **Conditions to change:** if the type constraint blocks a legitimate read pattern (none anticipated).

### DEC-002 — Manifest derived from migrations (AD-2)
- **Problem:** keep the ownership edge list in sync with schema.
- **Options:** (A) parse migrations; (B) hand-written JSON; (C) introspect live D1 `sqlite_master`.
- **Recommended:** A + C fallback. **Reason:** A prevents drift from migrations; C can validate against a live DB. Rejected B (rots). **Conditions to change:** if migration SQL parsing proves brittle, lean harder on C.

### DEC-003 — Local-first via `node:sqlite` (AD-3)
- **Problem:** run the same audit logic in tests and against hosted D1.
- **Options:** (A) `node:sqlite` + port; (B) miniflare only; (C) hosted only.
- **Recommended:** A. **Reason:** proven in-repo (2 tests); fast; no miniflare weight. **Conditions to change:** if a detection query behaves differently in `node:sqlite` vs D1 (track via the hosted dry-run diff).

### DEC-004 — Repair is a separate path (AD-4)
- **Problem:** prevent accidental writes from detection.
- **Options:** (A) separate module + port method; (B) `--write` flag on one tool.
- **Recommended:** A. **Reason:** module-boundary enforcement of SEC-001.

### DEC-005 — Track A before Track B (AD-6)
- **Problem:** close the FK-enforcement gap safely.
- **Options:** (A) Track A first; (B) Track B first; (C) both together.
- **Recommended:** A. **Reason:** Track A is correct regardless of enforcement; Track B can surface pre-existing orphans as hard errors, so it must come after a clean dry-run repair. **Conditions to change:** if the owner decides the codebase should rely on DB-level enforcement only (rejected — too brittle for a multi-store app).

### DEC-006 — R2 reconciliation paginated + cost-capped (AD-5)
- **Problem:** bound R2 `list()` cost.
- **Recommended:** paginate + prefix-bound + cap. **Reason:** AGENTS.md free-tier posture.

## Open decisions

### OPEN-DEC-001 — Enable `PRAGMA foreign_keys = ON`? (Track B)
- **Problem:** enabling FKs makes declared cascades enforce, but turns pre-existing violations into hard errors.
- **Why codebase evidence cannot resolve:** this is a runtime-policy + risk-acceptance decision, not a code fact.
- **Options:** (A) enable per-connection after a clean dry-run repair (Track B); (B) rely on Track A only; (C) add real FKs to the 0014 cluster first, then enable.
- **Recommendation:** A, sequenced after Track A + clean preview dry-run. **Effect:** strongest integrity guarantee; risk of write failures mitigated by dry-run-first.
- **Decision owner:** Philip.
- **Impact if unresolved:** Track B blocked; package status capped at CONDITIONALLY READY for that slice.

### OPEN-DEC-002 — Workspace/user hard-delete (DSAR closure)
- **Problem:** no production path deletes workspaces or Better Auth users; full DSAR erasure cannot complete.
- **Why out of scope:** larger feature; this pack detects the resulting orphans but does not build the delete feature.
- **Recommendation:** separate pack. **Effect:** DSAR erasure remains intake-only until then.
- **Decision owner:** Philip.

### OPEN-DEC-003 — Implement `uploads_orphaned` retention class here?
- **Problem:** the enum exists (`retention-core.ts:41`) but has no rule.
- **Options:** (A) add the rule in Phase 9; (B) defer.
- **Recommendation:** A. **Reason:** the repair audit row needs a retention home; the class was clearly intended for this.
- **Decision owner:** Philip (lightweight; reversible).

## Assumptions (validated)

| ID | Assumption | Validation | Status |
|---|---|---|---|
| ASSUMP-001 | `database.batch()` is atomic | `actions.ts:294` + D1 docs | validated |
| ASSUMP-002 | no `PRAGMA foreign_keys=ON` in repo | `rg` empty | validated |
| ASSUMP-003 | no prod workspace/user delete | `rg` finds only proof routers | validated |
| ASSUMP-004 | `IMAGES` is transform-only | source audit | validated |
| ASSUMP-005 | crons at 0/15/30 3:* | `wrangler.jsonc` + `worker.ts` | validated |
| ASSUMP-006 | R2 `list()` is metered | Cloudflare pricing model | validated |
| ASSUMP-007 | `0031_performance_indexes_additive.sql` covers most ref columns | to verify in PERF-001 | **unverified — Phase 2 must confirm** |
| ASSUMP-008 | `node:sqlite` `DatabaseSync` applies all 38 migrations cleanly | proven for 1 migration; 38 is Phase 1 work | **unverified — Phase 1 confirms** |

ASSUMP-007 and ASSUMP-008 are the two assumptions that future implementation must validate (not silently inherit). Both have explicit Phase 1/Phase 2 tasks.

## Alternatives considered and rejected

- **Trigger-based cascade repair at the DB layer:** rejected — hides logic, brittle, hard to review. Audit + repair is reviewable. (Could be revisited later.)
- **A full workspaces/users hard-delete feature as the "fix":** rejected as in-scope — larger effort (OPEN-DEC-002), does not address R2 orphans or the 0014 cluster.
- **Periodic SQL-only cron without R2 reconciliation:** rejected — misses Class B/C (the highest-severity gaps).
- **Hand-maintained manifest:** rejected — rots.
- **Miniflare-only testing:** rejected — heavier than `node:sqlite`, which is proven.
- **A new reusable skill for "orphan audits":** rejected — no genuine capability gap; existing skills + patterns suffice.
