# Rollout Rollback And Operations

## Rollout Strategy

| Stage | Action | Gate |
|---|---|---|
| Local flag-off | Land tests and implementation behind default-off flag if broad. | Existing behavior remains available. |
| Local flag-on | Run targeted DOM/unit/perf tests and target-route manual smoke. | No data loss, no row move regression, no global routine save toasts. |
| Provider proof | Apply DB/RLS/RPC changes to Archestimator project only when implementation reaches that phase. | Direct RPC/RLS/security tests pass. |
| Staging/preview | Enable flag for internal authenticated users. | Browser DnD/offline/perf evidence green. |
| First-user controlled rollout | Enable for selected users/projects only if feature flag exists. | Monitoring and rollback path documented. |
| General MVP readiness | Remove or keep flag only after evidence is stable. | Final release checklist green. |

## Feature Flag

Recommended flag if the coordinator is broad:

- `NEXT_PUBLIC_ESTIMATE_MUTATION_QUEUE_ENABLED=false` by default.

Flag rules:

- document in `.ai/00_corpus/feature-flag-and-env-inventory.md`,
- flag must not hide security fixes,
- flag-off path must remain tested until removal,
- flag-on/off smoke must include row edit, insert, delete/undo, same-node move, content-to-tree move, component replace/move.

## Rollback

| Change Type | Rollback |
|---|---|
| Client-only status/queue flag | Flip flag off, redeploy/restart, smoke core row CRUD and move. |
| Client-only bug fix without flag | Revert commit if no user data shape changed; otherwise fix forward. |
| DB/RPC migration | Prefer forward migration to restore old behavior or add compatibility wrapper; do not drop user history/events without explicit owner recovery approval. |
| RLS hardening | Fix forward if it blocks legitimate access; never relax below known secure baseline without owner decision. |
| Benchmark/test-only changes | Revert or disable flaky benchmark only with documented replacement evidence. |

## Operations Runbook

Manual smoke for target route:

1. Load the target route.
2. Edit quantity, misc cost, row adjustment, material/description.
3. Add blank row and type immediately while insert persists.
4. Insert library row.
5. Replace component, detach component, promote component, move component between rows.
6. Delete one row and restore it.
7. Bulk delete rows and restore them.
8. Move row within same node.
9. Drag row from content to tree target node, then reorder moved row and sibling rows in the target area.
10. Use Move row dialog for keyboard/touch path.
11. Reload route and verify row order/totals persist.
12. Test viewer/read-only access denial for mutation controls.
13. Test load-limited state disables row movement and explains why.

## Monitoring

Required before first-user release:

- mutation success/failure/conflict/retry counters,
- pending queue age escalation,
- drag/drop timing sample,
- cache refetch reason,
- security denial counts for direct RPC/API attempts,
- no sensitive row/source/image payloads in logs.

Known current gap: repo docs indicate production monitoring/APM is not strong enough to claim production sheet readiness. Do not claim production proof until monitoring artifacts exist.

## Owned Operational Gaps

These gaps are intentionally not hidden behind the generic monitoring note. Each gap has a responsible future lane, options, recommendation, and blocking impact.

| Gap ID | Gap | Owner Lane | Options | Recommendation | Blocking Impact | Evidence Required To Close |
|---|---|---|---|---|---|---|
| OPS-001 | No documented APM/error-tracking path for estimate-sheet mutation failures. | Operations/reliability lane | Use existing app error capture if present; add lightweight server/client event logging; add external APM only with owner approval. | Start with structured mutation/error events and documented log queries; evaluate external APM only if current logging cannot answer release questions. | Blocks production-readiness and first-user release claims, but not local implementation. | Dashboard, log query, or error-report artifact covering mutation kind, route, failure class, and user-safe identifiers. |
| OPS-002 | No documented queue-age escalation monitor. | Reliability lane | Client-only warning; server event counter; dashboard query. | Emit user-safe metric/event when local pending age exceeds 5s or degraded age exceeds 15s. | Blocks "non-blocking persistence is observable" claim. | Test artifact plus query/dashboard sample showing escalation event. |
| OPS-003 | No documented drag/drop timing telemetry. | Performance lane | Browser-only benchmark artifacts; sampled client metric in internal rollout; manual timing evidence. | Use pass/fail browser benchmark before rollout; add internal sampled metric only if first-user rollout needs field evidence. | Blocks "lag-free in production" claim, but not local benchmark completion. | Benchmark JSON with environment metadata; optional field metric report. |
| OPS-004 | No release runbook for mutation-queue flag ownership. | Operations/documentation lane | No flag; default-off flag; default-on with rollback commit. | Use default-off flag for broad coordinator changes, with explicit owner and rollback in feature-flag inventory. | Blocks controlled rollout if coordinator change is broad. | Feature flag inventory row and flag-on/off smoke proof. |
| OPS-005 | No documented provider/prod separation for DB/RPC proof. | Data/security lane | Local SQL only; provider project proof; production smoke. | Use local SQL for development, Archestimator provider proof before first-user release, and production proof only after owner-approved deploy. | Blocks provider/production claims if absent. | Evidence ledger labels each DB/RPC artifact as local, provider, or production. |
| OPS-006 | No documented abuse/rate-limit thresholds for mutation/upload/export/comment/public surfaces. | Security/operations lane | App-level limiter, provider limits, route-specific caps, alert-only monitoring. | Define route/action-specific caps with safe denial metrics before first-user exposure; do not rely on provider limits alone. | Blocks security/ops readiness for public/export/upload and high-write paths. | TEST-SEC-ABUSE-001 plus monitoring/log query showing threshold fields without sensitive payloads. |

## Deployment Authority

Production deployment remains owner-gated. Local/provider planning or DB standing authorization for Archestimator does not imply permission to deploy production UI.
