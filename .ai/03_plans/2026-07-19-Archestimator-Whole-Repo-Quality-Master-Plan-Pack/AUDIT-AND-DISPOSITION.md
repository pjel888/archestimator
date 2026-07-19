# Audit And Disposition

## Audit Basis

Three independent read-only agents reverified every predecessor item at HEAD
`7f9a484b42b0d951f219e3c4ce1bfbb4364e8847` using current source, history, and a
fresh GitNexus index. No product tests, builds, browser automation, screenshots,
or visual QA were run. External documentation was used only where runtime or
framework semantics affected a disposition.

Disposition meanings:

- `CURRENT` — survives as a canonical master unit.
- `NEEDS_EVIDENCE` — survives as an evidence-first unit with implement/reject
  terminal branches.
- `DUPLICATE` — absorbed into one named canonical unit.
- `ALREADY_IMPLEMENTED` — current source proves the requested outcome landed.
- `OUTDATED` — root concern may survive, but the old scope or solution is stale;
  only the rewritten successor is runnable.
- `INVALID` — current source refutes the defect or the proposed change would be
  unsafe/unreachable.
- `DEFERRED_OWNER` — retained with an existing owner/trigger, not runnable now.

Every original artifact remains byte-preserved under `source-snapshots/`, so a
rejection loses no claim, rationale, command log, raw artifact, or history.

## Performance Audit — 17/17 Units

| Source | Disposition | Successor | Current correction |
| --- | --- | --- | --- |
| `PERF-001` | CURRENT | `UNIT-002` | CI is absent; separate truthful local verification from external activation. |
| `PERF-002` | CURRENT/SPLIT | `UNIT-026`, `UNIT-027` | Listener cleanup is deterministic; batching/sampling remains unmeasured. |
| `PERF-003` | DUPLICATE | `UNIT-031` | Inline style remains, but `useMemo` inside a row loop would violate Hooks rules. |
| `PERF-004` | DUPLICATE | `UNIT-025` | Per-ID restore reads remain; merge with improve `023`. |
| `PERF-005` | CURRENT | `UNIT-028` | Five-minute cron creates 288 rows/day, not 1,152; no-op writes remain. |
| `PERF-006` | DUPLICATE/INVALID_SEVERITY | — | Same as consistency `026`; cleared one-second debounce is not a continuous-billing leak. |
| `PERF-007` | NEEDS_EVIDENCE | `UNIT-033` | Backpressure must be message-specific; global drops could discard auth/errors. |
| `PERF-008` | NEEDS_EVIDENCE/SPLIT | `UNIT-034` + `UNIT-067` | Body copy and compression are independent memory/CPU hypotheses. |
| `PERF-009` | CURRENT | `UNIT-029` | Current maximum is 1,001 statements at 500 rows, not 1,500. |
| `PERF-010` | NEEDS_EVIDENCE | `UNIT-035` | Cookie cache is deliberately disabled for revocation; evaluate request-local coalescing separately. |
| `PERF-011` | DUPLICATE/OUTDATED_SCOPE | `UNIT-024`, `UNIT-055`–`UNIT-057` | Inline delivery remains, but queue/token semantics differ from the existing Client Portal queue. |
| `PERF-012` | NEEDS_EVIDENCE | `UNIT-037` | Several providers are intentionally global; map consumers before splitting. |
| `PERF-013` | CURRENT/REWRITE | `UNIT-032` | Full loading remains; proposed `created_at` keyset would change category/name ordering. |
| `PERF-014` | NEEDS_EVIDENCE | `UNIT-038` | CTE benefit is unproved; GitNexus risk is HIGH across four modules. |
| `PERF-015` | CURRENT/SPLIT | `UNIT-018` | Repair active D1 tooling; preserve historical Postgres harnesses as history. |
| `PERF-016` | CURRENT | `UNIT-018` | Current budget docs retain Vercel/Supabase/Postgres-era assumptions. |
| `PERF-017` | CURRENT/TEST_GATED | `UNIT-051` | Preferred deletion is valid, but production knowledge data and two maintained tests still reference the module; test-file cleanup requires a user-authorized test task. |

### Performance Pack Integrity Corrections

- `artifacts/findings.json` contains 17 findings but declares 16, and contains 10
  P2 findings but declares nine.
- `plan-pack.json` uses a stale `24b15e` baseline while evidence mixes
  `a41a07`, `0b983f`, `24b15e`, and current HEAD.
- Old authorization/test inventories omit real external CI, browser, security,
  hosted-load, and EXPLAIN boundaries.
- The snapshot preserves these inconsistencies; the master manifest replaces
  them as current authority.

## Codebase Improve Audit — 33/33 Units

| Source | Disposition | Successor | Current correction |
| --- | --- | --- | --- |
| `IMPROVE-001` | DUPLICATE | `UNIT-002` | Merge with CI truth; strip branch/test mandates. |
| `IMPROVE-002` | CURRENT | `UNIT-015` | Sequential fallback remains after the July-16 typed-intent split; GitNexus CRITICAL. |
| `IMPROVE-003` | CURRENT/AMEND | `UNIT-016` | Reuse the July-16 durable public-rate-limit engine, not a new engine. |
| `IMPROVE-004` | CURRENT | `UNIT-008` | Raw CSRF/control comparisons remain; reuse existing timing-safe pattern. |
| `IMPROVE-005` | CURRENT/LOW | `UNIT-009` | Production already fails closed; remove only personal dev/test fallback. |
| `IMPROVE-006` | OUTDATED/SPLIT | `UNIT-021`, `UNIT-022`, `UNIT-052`–`UNIT-054` | Old plan omitted scanner-provider topology and combined four independently receiptable state-machine stages. |
| `IMPROVE-007` | CURRENT | `UNIT-003` | Insert success lacks the latest-operation guard already used by replace. |
| `IMPROVE-008` | CURRENT | `UNIT-014` | General floating-point wrapper remains; labor-only claim was already resolved. |
| `IMPROVE-009` | OUTDATED | `UNIT-019` | Resolve reachable queue producer topology before any idempotency migration. |
| `IMPROVE-010` | CURRENT/DEPENDENT | `UNIT-020` | Scope job secrets only after topology is decided. |
| `IMPROVE-011` | CURRENT | `UNIT-012` | Checksum remains optional and ETag is still accepted as substitute. |
| `IMPROVE-012` | CURRENT | `UNIT-013` | Overrides validate only future expiry, not maximum TTL. |
| `IMPROVE-013` | ALREADY_IMPLEMENTED | — | Shared resolver denies passworded brand assets without an authenticated session. |
| `IMPROVE-014` | OUTDATED | `UNIT-010` | Three live routes now have local decoders; canonicalize all of them. |
| `IMPROVE-015` | OUTDATED/PARTIAL | `UNIT-011` | Publication and AI secrets already fail closed; only telemetry domain separation survives. |
| `IMPROVE-016` | OUTDATED/CONDITIONAL | `UNIT-048` | Old `headers()` nonce design conflicts with Next.js 16 per-request requirements and prior defer. |
| `IMPROVE-017` | INVALID | `UNIT-002` | Adds unrequested dependencies, unsafe reset instructions, and unsound scoped TypeScript. |
| `IMPROVE-018` | OUTDATED/SPLIT | `UNIT-042`, `UNIT-058`–`UNIT-060` | Existing reporter API differs; inventory first, then migrate bounded domains instead of blanket `no-console`. |
| `IMPROVE-019` | OUTDATED/SPLIT | `UNIT-016`, `UNIT-023` | Split fixed-window convergence from atomic active-concurrency admission. |
| `IMPROVE-020` | CURRENT | `UNIT-017` | Adapter policy drift remains and validator coverage is incomplete. |
| `IMPROVE-021` | DUPLICATE/SPLIT | `UNIT-024`, `UNIT-055`–`UNIT-057` | Same live inline recipient-delivery path as performance `011`; contract, producer, consumer, and outcome reconciliation close separately. |
| `IMPROVE-022` | DUPLICATE | `UNIT-031` | Same virtual-row style claim as performance `003`. |
| `IMPROVE-023` | DUPLICATE | `UNIT-025` | Same restore replay reads as performance `004`. |
| `IMPROVE-024` | CURRENT/AMEND/SPLIT | `UNIT-043`, `UNIT-061`–`UNIT-064` | Define compatibility once, then migrate publication, library, estimate/workshop, and admin/support with independent receipts. |
| `IMPROVE-025` | CURRENT/AMEND/SPLIT | `UNIT-044`, `UNIT-065`, `UNIT-066` | Exclude estimate-tree reads already extracted by the July-16 master and serialize the remaining shared-file domain extractions. |
| `IMPROVE-026` | OUTDATED/DEBT_CURRENT | `UNIT-045` | Preserve July-16 `EditableRowStore`; split remaining orchestration/JSX instead. |
| `IMPROVE-027` | CURRENT/LOW | `UNIT-046` | Sole patched dependency remains; bundle benefit is unmeasured. |
| `IMPROVE-028` | ALREADY_IMPLEMENTED/RESOLVED | — | Legacy migration/cutover exists; future consolidation already belongs to MVP Stage C. |
| `IMPROVE-029` | NEEDS_EVIDENCE/DEFERRED_OWNER | `UNIT-049` | Existing immutable issue carry-forward works; only partial source-estimate handoff remains at Stage C. |
| `IMPROVE-030` | NEEDS_EVIDENCE/DEFERRED_OWNER | `UNIT-050` | No workspace aggregate exists; MVP explicitly defers this outside Stage A/B. |
| `IMPROVE-031` | DUPLICATE/EXTERNAL_OWNER | — | MVP `UNIT-005` and `UNIT-006` already own import and variant grouping. |
| `IMPROVE-032` | INVALID/REFUTED | — | Toy classifier has zero production callers; persisted discipline values do not come from it. |
| `IMPROVE-033` | ALREADY_IMPLEMENTED | — | Package-capable prompts already route to package builder; feature flags intentionally remain off. |

### Improve Pack Integrity Corrections

- The source is 34 flat artifacts and 5,814 lines with no validator manifest.
- All 34 files remain byte-preserved. The master supplies lifecycle, traceability,
  dependency, risk, and test-gate state without rewriting the original unit files.
- July-16 completed work is treated as current evidence, not re-opened scope.

## Whole-App Consistency Audit — 35/35 IDs

`019` intentionally had no separate file; it was absorbed into source unit `018`.
The alias is still mapped below so coverage is explicit.

| Source | Disposition | Successor | Current correction |
| --- | --- | --- | --- |
| `CONSISTENCY-001` | ALREADY_IMPLEMENTED | — | Dead labor cost field and affected projections were removed. |
| `CONSISTENCY-002` | INVALID | — | Variant deletion is blocked upstream when referenced. |
| `CONSISTENCY-003` | INVALID | — | Rate is re-resolved per request; no stale zero cache exists. |
| `CONSISTENCY-004` | INVALID/DEAD | `UNIT-047` | Void function has zero callers; delete orphan service instead of adding recompute logic. |
| `CONSISTENCY-005` | INVALID | — | No client reads the alleged legacy password body field. |
| `CONSISTENCY-006` | CURRENT | `UNIT-006` | Admin reply leaves cosmetic unread state. |
| `CONSISTENCY-007` | OUTDATED | `UNIT-019` | Queue is proof-driven, not wholly dead; resolve producer topology. |
| `CONSISTENCY-008` | INVALID | — | Checklist is unmounted and milestone emits with project creation. |
| `CONSISTENCY-009` | CURRENT/LATENT | `UNIT-036` | Feature is OFF; enforcement must not add per-request middleware D1. |
| `CONSISTENCY-010` | INVALID | — | Selection helper has zero production callers. |
| `CONSISTENCY-011` | NEEDS_EVIDENCE | `UNIT-039` | Product meaning of reset scope is not defined. |
| `CONSISTENCY-012` | INVALID/UNSAFE_FIX | — | Proposed visible-row cursor can rescan/stall hidden rows. |
| `CONSISTENCY-013` | INVALID | — | All three section routes have live consumers; old guard premise was wrong. |
| `CONSISTENCY-014` | DUPLICATE | `UNIT-008` | Merge timing-safe comparison work with improve `004`. |
| `CONSISTENCY-015` | INVALID | — | Existing RPC guard makes the proposed route change unnecessary. |
| `CONSISTENCY-016` | CURRENT | `UNIT-007` | Missing Origin/Referer still fails open on a state-changing invite POST. |
| `CONSISTENCY-017` | NEEDS_EVIDENCE | `UNIT-040` | `invited_email` is not rendered; remaining disclosure is a privacy-policy decision. |
| `CONSISTENCY-018` | INVALID | — | Callers pass stable identity values; resubscription premise is false. |
| `CONSISTENCY-019` | INVALID/ALIAS | — | Identity cannot change mid-session without reload; alias preserved from source `018`. |
| `CONSISTENCY-020` | INVALID | — | Feed is single-page and has no next-page cursor contract. |
| `CONSISTENCY-021` | CURRENT | `UNIT-005` | Workspace reset exists but is unused on sign-out. |
| `CONSISTENCY-022` | INVALID | — | Rare admin propagation with 15-second cache is acceptable current behavior. |
| `CONSISTENCY-023` | CURRENT | `UNIT-004` | Preview identity omits editable contingency fields; labor portion is moot. |
| `CONSISTENCY-024` | NEEDS_EVIDENCE | `UNIT-041` | Root route has no in-repo consumer; external API semantics must be checked. |
| `CONSISTENCY-025` | INVALID | — | Two explicit opt-ins are a deliberate fail-safe; proposed default weakens safety. |
| `CONSISTENCY-026` | DUPLICATE/INVALID_SEVERITY | — | Same one-second cleared timer as performance `006`; material harm unproved. |
| `CONSISTENCY-027` | INVALID | — | Alleged mixed-locale adjacency is not present. |
| `CONSISTENCY-028` | INVALID | — | Current normalization is intentional; no harmful cursor flow was shown. |
| `CONSISTENCY-029` | CURRENT | `UNIT-006` | Admin inbox caps at 100 without total/has-more truth. |
| `CONSISTENCY-030` | INVALID/UNSAFE_FIX | — | Continuing all comparisons is constant-work; early break would leak match position. |
| `CONSISTENCY-031` | INVALID | — | Redirect display context is not a demonstrated authorization or integrity boundary. |
| `CONSISTENCY-032` | CURRENT/HIGHEST | `UNIT-001` | Mutation impact scans estimate rows but misses linked template rows. |
| `CONSISTENCY-033` | DUPLICATE | `UNIT-005` | Same shared-device sign-out leak as `021`; clear query cache in one owner. |
| `CONSISTENCY-034` | CURRENT/CLEANUP | `UNIT-047` | Decision-actions module has zero production importers. |
| `CONSISTENCY-035` | CURRENT/TEST_ONLY | `FOLLOWUP-TEST-001` | Test references removed UI; editing/running it requires a user `TEST_TASK`. |

### Consistency Pack Integrity Corrections

- `00-PLAN.md` and `LOOP_LEDGER.md` still claim `001` is next even though it was
  implemented, and still report the pre-`032`–`035` finding count.
- Several source dependencies point from refuted items into live items. The
  master removes `001→023`, `004→012`, `005→013`, and
  `009→015/016/017`.
- The source snapshot retains the stale lifecycle text as historical evidence;
  the master ledger and manifest are the only current state.

## Cross-Pack Coverage Totals

| Pack | IDs | Current | Needs evidence | Outdated/rewritten | Duplicate | Implemented | Invalid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Performance | 17 | 7 | 5 | 0 | 4 | 0 | 1 |
| Improve | 33 | 13 | 2 | 8 | 5 | 3 | 2 |
| Consistency | 35 | 9 | 3 | 1 | 3 | 1 | 18 |
| **Total** | **85** | **29** | **10** | **9** | **12** | **4** | **21** |

The 85 source IDs map onto 67 canonical atomic units because stale compound items were
split into atomic evidence/implementation units while exact overlaps converge on
one owner. Classification totals are mutually exclusive primary dispositions;
mixed qualifiers in the detailed tables explain rewrites and merges.
