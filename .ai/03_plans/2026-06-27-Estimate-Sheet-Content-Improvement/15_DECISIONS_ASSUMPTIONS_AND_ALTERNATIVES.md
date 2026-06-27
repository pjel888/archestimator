# Decisions Assumptions And Alternatives

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| DEC-001 | This pass is planning/readiness only. | User explicitly requested no coding; plan artifacts are the only write scope. |
| DEC-002 | Treat routine global save toasts as a defect. | Spreadsheet workflows need quiet background persistence; current toasts feel blocking. |
| DEC-003 | Preserve the row-move RPC as the durable persistence path. | Audit found the RPC strong; the likely bug is client coordination/reconciliation. |
| DEC-004 | Replace sheet-wide action blocking with scoped pending state. | One pending row/node should not freeze unrelated rows or target branches. |
| DEC-005 | Prefer local-first mutation coordinator before DB-backed queue. | Solves current UX/retry/ordering needs with lower schema/RLS risk. |
| DEC-006 | Security hardening is a release blocker, not polish. | Direct RPC/API paths can bypass app-layer UX fixes. |
| DEC-007 | Browser proof is required only for browser-only claims. | DnD/offline/frame timing need browser evidence; source/cache contracts can use faster tests. |
| DEC-008 | Stale docs must be corrected during implementation. | Conflicting specs will cause future agents to implement against stale assumptions. |
| DEC-009 | The active planning contract is `Improve-Plan-Prompt.md`. | The user named the improvement prompt; older plan-creation prompts are historical context only. |
| DEC-010 | App Router boundary/cache decisions must be route-specific. | The estimate route mixes server-owned auth/context, client cache, dynamic params/searchParams, and public/export cache implications. |
| DEC-011 | Phase 0.5 data/security hardening gates broad UX/mutation implementation. | Release-blocking authz, direct-write, public/export DTO, and abuse risks should not sit behind cosmetic or coordinator work. |
| DEC-012 | Server Action direct-POST and DTO minimization are first-class security controls. | Next Server Functions can be invoked outside the UI, and over-returned DTOs can leak private estimating data. |

## Assumptions

| ID | Assumption | Validation |
|---|---|---|
| ASM-001 | Users need same-session non-blocking reliability more urgently than cross-session offline queue persistence. | Confirm during implementation; choose DB-backed queue only if product requires reload/device persistence. |
| ASM-002 | The reported row-move bug is currently reproducible or can be captured with a targeted e2e. | Phase 0 regression proof. |
| ASM-003 | Current linked Supabase project boundary remains `ebxxqidacheyapmmzavr`. | Verify before any future provider migration/test. |
| ASM-004 | Project editors vs estimate-specific collaborators need a clear ACL precedence decision. | Security implementation decision. |
| ASM-005 | Existing dirty worktree changes are intentional current reality. | Preflight diff review; do not revert. |
| ASM-006 | The estimate sheet target route should be treated as dynamic unless a future source/doc audit proves otherwise. | Route-level contract in `06` plus Next local docs and route source. |

## Alternatives Considered

| Alternative | Rejected / Deferred Because |
|---|---|
| Keep global save state and only remove toasts. | Does not fix row-move freezing or unrelated action blocking. |
| Force active refetch after every row mutation. | Simpler freshness but risks lag, remounts, and clobbering active edits. Use targeted active refetch on conflict/missing result. |
| Rewrite entire estimate sheet state model immediately. | Too broad for first implementation slice; start with coordinator and source/target scoped patches. |
| Add DB-backed mutation queue first. | High schema/RLS/ops cost; local-first queue likely satisfies MVP unless offline reload persistence is explicitly required. |
| Treat row move as tree reorder only. | Row move touches row identity, row revisions, component content, drag state, and server event history; it needs its own coordinator. |
| Rely on path secrecy for private images. | Not an authorization boundary. |
| Defer all data/security hardening until after UX/mutation polish. | Contradicts release-blocking threat model and makes early UI work look safer than it is. |
| Use one generic cache invalidation rule for every mutation. | Over-invalidates routine edits and under-specifies route/public/export freshness. |

## Open Owner/Product Decisions

| ID | Decision Needed | Options | Recommendation | Blocking Impact |
|---|---|---|---|---|
| OPEN-001 | Durable undo design | Recently deleted panel, activity-history restore, longer toast plus history | Activity-history restore plus transient toast convenience | Blocks destructive-action UX completion. |
| OPEN-002 | Offline persistence scope | Same-session only, reload-persistent local storage, DB-backed queue | Same-session first; local storage if UX requires reload persistence | Blocks queue architecture if offline reload is required. |
| OPEN-003 | Project editor vs estimate ACL precedence | Project editor always overrides, estimate ACL restricts, hybrid | Require `can_edit_estimate` for row-attached actions unless policy says otherwise | Blocks security implementation. |
| OPEN-004 | Feature flag lifecycle | Default-off until staging, always-on after local proof, permanent kill switch | Default-off until browser/provider proof | Blocks rollout plan finalization. |
| OPEN-005 | Save status visual style | Row gutter, sheet footer, live-region only | Row/node local failure + subtle sheet footer pending | Blocks detailed UI implementation. |
| OPEN-006 | Public/export redaction boundary | Strict public DTO, role-dependent DTO, owner-configurable fields | Strict public DTO first; expand only with explicit product decision | Blocks public/share/proposal/export readiness. |
| OPEN-007 | Abuse/rate-limit thresholds | Per-user, per-project, per-route, provider-backed global caps | Per-user/project caps for mutation/upload/export/comment, with alerting for repeated denials | Blocks security/ops readiness. |
