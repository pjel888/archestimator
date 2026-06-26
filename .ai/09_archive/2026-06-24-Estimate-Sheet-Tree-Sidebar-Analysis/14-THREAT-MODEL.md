# 14 — Threat Model (STRIDE)

**Author**: A4 (Wave 1 specialist, security/threat-modeling lane)
**Date**: 2026-06-24
**Scope**: Estimate Sheet Tree Sidebar — `src/components/workshop/EstimateSheetTree.tsx` and every server action, RPC, and publication/collaboration surface it touches.
**Methodology**: STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege). Microsoft Threat Modeling methodology, scoped to data flows named in `01-SYSTEM-MAP.md` §10–11 and `06-STATE-NETWORK-DATA-AUDIT.md` §6.9.
**Mode**: Documentation-only. No code, migration, or config change.
**Cross-refs**: `09-PRIORITIZED-FINDINGS.md` (F-IDs), `13-PLAN-AUDIT-AND-SCORECARD.md` §5 (roles), `15-RISK-REGISTER.md` (sibling, scoring view — A5, parallel).

---

## 1. Scope and Trust Boundaries

### 1.1 In scope

- Tree-mutation server actions: `createEstimateNode`, `renameEstimateNode`, `deleteEstimateNode`, `deleteEstimateNodesBulk`, `reorderEstimateTreeNodes`, `insertEstimateTemplateIntoEstimate` (the comparison control).
- Public share surface reachable from the sidebar's read-only variant (`ShareEstimateTreePanel`): `project_publications.hashed_token`, optional password, publication access/view cookies.
- Invite surface: `collaboration_invitations` token redemption (indirect — controls who becomes a `project_members` row that the tree actions then authorize against).
- Optimistic-UI reconciliation paths in `EstimateSheetTree.tsx` that decide what the client treats as authoritative.

### 1.2 Out of scope

- Middle-sheet row editing, right-sidebar surfaces (separate plan-packs).
- Supabase Realtime channels (not wired to tree mutations — `01-SYSTEM-MAP.md` §11; Q-25).
- Email delivery spoofing (Resend DKIM/SPF — owned elsewhere).
- RLS policy body audit (called out as unverified in `13-PLAN-AUDIT-AND-SCORECARD.md` §13 item 2; deferred to `16-DATA-MIGRATION-PLAN.md`).

### 1.3 Trust boundaries

| # | Boundary | Crossing mechanism | Trust direction |
|---|---|---|---|
| B-1 | Anonymous internet → Next.js middleware | `src/proxy.ts:57` (`proxy()` middleware) | Untrusted → auth-checked |
| B-2 | Authenticated session → server action | `requireAuth()` + `getCurrentWorkspaceProject()` per action (`06` §6.9.1) | Authenticated → workspace-scoped |
| B-3 | Workspace member → estimate editor | `assertCanEditEstimate` → `can_edit_estimate` RPC (`actions.ts:414-418`) | Member → editor (role-aware) |
| B-4 | Server action → Postgres RPC | Supabase service-role client inside action; RLS still applies on user-data tables | App-trusted → DB-trusted |
| B-5 | Public share recipient → snapshot | `/share/[token]` route + `project_publications.hashed_token` lookup | Unauthenticated → snapshot-only |
| B-6 | Optimistic client state → server echo | TanStack cache write + Zustand store | Client-trusted → server-authoritative |

---

## 2. Assets and Entry Points

### 2.1 Assets

| Asset | Sensitivity | Owner |
|---|---|---|
| Estimate tree structure (nodes, parent_id, sort_order) | Confidential + Integrity | `estimate_nodes` table |
| Row-item pricing/supplier data attached to nodes | Confidential + Integrity | `estimate_row_items` |
| Audit trail of tree mutations | Integrity (non-repudiation) | `estimate_sheet_events` |
| Publication share token | Secret | `project_publications.hashed_token` |
| Publication password (optional) | Secret | `project_publications.password_hash` |
| Invite token | Secret | `collaboration_invitations.token_hash` |
| User selection/expansion state | Integrity (UX-correctness) | Zustand store, in-memory |
| User role (`owner`/`editor`/`viewer`) | Integrity | `project_members.role` |

### 2.2 Entry points (attack surface)

- **E-1**: Authenticated workshop route `/workshop/projects/[projectId]/estimates/[nodeId]` → renders sidebar → 5 mutation actions.
- **E-2**: Public share route `/share/[token]` → renders read-only tree variant. Crosses B-5.
- **E-3**: Publication API routes under `/api/share/[token]/...` (comments, decisions, password verify) — adjacent to tree but same token asset.
- **E-4**: Invite redemption `/invite/[token]` — converts a holder into a `project_members` row, which then authorizes against tree actions. Crosses B-3 indirectly.
- **E-5**: Next.js middleware `src/proxy.ts` — gate for E-1.

---

## 3. STRIDE Threat Catalog

Likelihood and Impact use Low/Med/High. Likelihood reflects "realistic attacker/actor and preconditions"; Impact reflects "blast radius if realized against current code". Mitigation cites the finding ID and (where known) the implementation phase from `10-IMPLEMENTATION-PLAN.md`.

| ID | STRIDE | Threat | Asset | Entry point | L | I | Mitigation | Residual |
|---|---|---|---|---|---|---|---|---|
| T-01 | Spoofing | Guess/brute-force `project_publications.hashed_token` to read a private estimate snapshot | Publication token | E-2 | Low | High | Token is 256 bits of CSPRNG entropy (`security.ts:61-69` `createPublicationToken`, 32 bytes); stored only as HMAC-SHA256 digest (`security.ts:71-74` `hashPublicationToken`). Search space ≈ 2^256. | Negligible |
| T-02 | Spoofing | Forge an invite token to redeem membership and gain editor role | Invite token / role | E-4 | Low | High | `hashInviteToken(rawToken, pepper)` (`src/lib/collaboration/invite-entry.ts:51`) — peppered hash; token looked up by digest, not plaintext. | Negligible (depends on pepper secrecy) |
| T-03 | Spoofing | Brute-force a password-protected share | Publication password | E-2/E-3 | Med→Low | High | P10 progressive lockout: 5 fails per IP+token → 15-min hard lock, 1-hr counting window (`security.ts:553-614`); scrypt password hash (`security.ts:135-148`). | Low (single-IP attacker blocked; distributed attacker still bound by scrypt KDF) |
| T-04 | Elevation of privilege | Viewer-role member mutates the tree because 5 actions skip `assertCanEditEstimate` | Tree integrity / role | E-1 | Med | High | F-19 → Phase 1.1. Add `await assertCanEditEstimate(supabase, estimateId)` to all 5 actions. RLS is current backstop but unverified (`13` §13 item 2). | Medium until both app gate and RLS audit land |
| T-05 | Elevation of privilege | Share recipient crosses into member-level tree mutation affordances because the public variant does not hide CRUD UI | Role boundary / UI | E-2 | Med | Med | Q-19 → Phase 6.10. Hide CRUD when `disableRouteSync === true` or `canEditEstimate === false`. Server RLS still backstops. | Low after fix; Medium until then (defense-in-depth gap) |
| T-06 | Tampering (data integrity) | Optimistic-create race resurrects a just-collapsed parent or remaps selection against stale Zustand snapshot | Selection/expansion state | E-1 (client) | Med | Med | F-01 → Phase 3.1. Capture snapshot at `handleAddTreeNode` entry instead of reading `useEstimateWorkspaceState.getState()` mid-promise. | Low after fix; data-integrity-only (no security impact) |
| T-07 | Tampering (data integrity) | Server cascade diverges from client-projected `planEstimateTreeDelete`, so `deletedNodeIds` returned to the client is wrong and selection desyncs | Tree / selection | E-1 | Med | Med | F-06 → Phase 1.2. RPC must OUTPUT authoritative deletedNodeIds; action must use server values not client projection (`actions.ts:2166`, `2182-2184`). | Medium until RPC migration (`16-DATA-MIGRATION-PLAN.md`) |
| T-08 | Tampering (data integrity) | Concurrent server echoes during a reorder overwrite each other in single-slot `pendingPropNodesRef`, losing updates | Tree cache | E-1 | Low | Med | F-07 → Phase 3.x. Convert ref to FIFO queue; flush in order. | Low after fix |
| T-09 | Tampering (data integrity) | Two browser tabs mutate the same estimate; last-write-wins silently discards the loser's edit (no realtime echo) | Tree integrity | E-1 (×2) | Med | Med | Q-25: documented as independent per-tab state; LWW by design. No mitigation planned for v1. | Medium (accepted for v1; revisit if collab conflicts surface) |
| T-10 | Tampering (data integrity) | sortOrder scheme divergence between client (multiples of 10) and server (consecutive +1) causes full-sibling renumbering on every move | sortOrder integrity | E-1 | High | Low | F-18 → Phase 1.x. Standardize on multiples-of-10 server-side (`actions.ts:2090-2097`). | Low after fix |
| T-11 | Repudiation | A tree mutation occurs with no audit row, letting an actor deny having performed it | Audit trail | E-1 | Low | High | All 5 actions call `*_with_history` RPCs (`01-SYSTEM-MAP.md` §10), each writes `estimate_sheet_events`. Verified at the action-body level; RPC bodies themselves not audited (`13` §13 item 2). | Low at app layer; Medium pending RPC body audit (F-10 follow-up) |
| T-12 | Information disclosure | Public share reveals soft-archived child nodes if F-06's client/server cascade diverges (client treats as deleted, server keeps visible) | Snapshot confidentiality | E-2 | Low | Med | F-06 fix (Phase 1.2) plus snapshot isolation. Publication snapshot is versioned (`security.ts:208-220` view-token carries `snapshotVersion`). | Low after F-06 fix |
| T-13 | Information disclosure | Share token leaks via URL in server logs, browser history, or `Referer` header on third-party subresources | Publication token | E-2 | Med | High | Tokens are path components (`/share/[token]`); `proxy.ts:82-84` sets `Cache-Control: no-store` on `/share`. **No `Referrer-Policy: no-referrer` enforcement observed** in `proxy.ts` for share routes. | Medium — needs verification that response headers suppress Referer |
| T-14 | Denial of service | Recursive tree op (create/reorder/delete) at depth 1000+ exhausts client stack or DB recursive CTE | Availability | E-1 | Low | High | F-MAXDEPTH / Q-20 → Phase 1.5. No max-depth SQL guard found in migrations or pending-review scripts (only cycle detection at `scripts/sql/unify-rollback-pre-apply.sql:209-226`). Client `validateEstimateTreeHierarchy` is a no-op (F-10). | High until Q-20 decision (recommended default: 100) lands and guards ship |
| T-15 | Denial of service | Bulk delete on a 10 000-node tree holds a long Postgres transaction plus two full-tree refreshes (`actions.ts:2163` + `2177`), degrading shared DB performance | Availability | E-1 | Low | Med | F-03 (double refresh) → Phase 2.x removes pre-delete fetch. No per-workspace rate limit observed on bulk RPCs. | Medium — fix F-03; per-workspace concurrency cap is post-launch |

---

## 4. Per-Threat Detail (likelihood × impact × mitigation × residual × finding link)

Detailed narrative for the threats whose one-line table row is not self-sufficient.

### T-04 — Viewer → editor via missing `assertCanEditEstimate` (F-19)

- **Likelihood**: Medium. Requires (a) the actor to hold `project_members.role = 'viewer'` on the project AND (b) an RLS gap on `estimate_nodes` writes. (a) is realistic for any invited estimator or client reviewer; (b) is **unverified** (`13-PLAN-AUDIT-AND-SCORECARD.md` §13 item 2) — the audit did not read RLS policy bodies.
- **Impact**: High. All five tree-mutation affordances become writable: create, rename, delete, bulk delete, reorder. Each is irreversible at the RPC layer (`_with_history` writes audit but does not auto-restore).
- **Current mitigation**: `requireAuth()` + `getCurrentWorkspaceProject()` only (`actions.ts:1377, 1389`; `2036`; `2138`; `2161`; `2200`). RLS assumed.
- **Comparison control**: `insertEstimateTemplateIntoEstimate` at `actions.ts:2296` DOES call `assertCanEditEstimate(supabase, estimateId)` — proving the guard exists and is one line away from each missing site.
- **Recommended mitigation**: Phase 1.1 — add `await assertCanEditEstimate(supabase, estimateId)` to all 5 actions. Pair with the RLS audit in `16-DATA-MIGRATION-PLAN.md` so the residual risk drops to Low.
- **Residual**: Medium until both gates ship. Drops to Low after.
- **Finding link**: F-19 (`09-PRIORITIZED-FINDINGS.md`).

### T-05 — Share recipient → CRUD affordance (Q-19)

- **Likelihood**: Medium. The public variant `ShareEstimateTreePanel` reuses tree components; CRUD buttons are visible. Server RLS rejects writes from unauthenticated sessions, but the user sees enabled buttons that 404/error on click.
- **Impact**: Medium. No data corruption (RLS holds), but UX implies edit access that does not exist — a trust/expectation failure that can become a security finding in customer review.
- **Recommended mitigation**: Q-19 default `YES` (hide CRUD when `disableRouteSync === true` or `canEditEstimate === false`). Phase 6.10.
- **Residual**: Low after fix.
- **Finding link**: Q-19, F-20.

### T-07 — Server cascade mismatch (F-06)

- **Likelihood**: Medium. Triggers only if the server RPC's cascade behavior (soft-archive vs hard-delete) diverges from `planEstimateTreeDelete`'s client projection. The RPC bodies are unaudited; divergence is plausible but unconfirmed.
- **Impact**: Medium. No data loss at the server; client-side selection/URL desync only. Users see "selection skipped to fallback" and may believe a node was deleted when it was archived.
- **Recommended mitigation**: Phase 1.2 — RPC outputs authoritative `deletedNodeIds`; action passes them through unchanged. Migration tracked in `16-DATA-MIGRATION-PLAN.md`.
- **Residual**: Medium until migration ships; Low after.
- **Finding link**: F-06.

### T-11 — Audit coverage (repudiation)

- **Likelihood**: Low at the application layer. All 5 actions call `*_with_history` RPCs and each is named in `01-SYSTEM-MAP.md` §10 as writing `estimate_sheet_events`. The pattern is consistent with non-repudiation.
- **Impact**: High if a gap exists (a tree mutation with no audit row breaks dispute resolution and SOC2-style evidence).
- **Residual**: Medium pending the RPC body audit (F-10 follow-up in `16-DATA-MIGRATION-PLAN.md`). Drops to Low once each RPC is confirmed to INSERT exactly one event row per call inside the same transaction as the data mutation.
- **Finding link**: F-10 (related — client-side structural validation no-op), `06-STATE-NETWORK-DATA-AUDIT.md` §6.7.2.

### T-13 — Share token leak via URL

- **Likelihood**: Medium. `/share/[token]` puts the secret in the path. Path appears in: browser history, server access logs (Vercel default), and `Referer` headers on any third-party resource loaded by the share page.
- **Impact**: High. A leaked token grants read access to the publication snapshot until the owner rotates it.
- **Current mitigation**: `proxy.ts:82-84` sets `Cache-Control: no-store` for `/share` — protects CDN/browser cache leaks. **Not observed**: `Referrer-Policy: no-referrer` (or `same-origin`) header on `/share` responses.
- **Recommended mitigation**: Add `Referrer-Policy: no-referrer` to `/share/*` responses in `proxy.ts` (one-line header set). Confirm Vercel access-log retention policy with Philip.
- **Residual**: Medium until header ships; Low after.
- **Finding link**: new (not in `09-PRIORITIZED-FINDINGS.md` — surfaced by this threat model). Tracked in `15-RISK-REGISTER.md`.

### T-14 — Recursive tree ops at depth 1000+ (F-MAXDEPTH / Q-20)

- **Likelihood**: Low (requires an attacker willing to script 1000+ nested creates, or an unwary user with a deep import).
- **Impact**: High. A pathologically deep tree can blow the JS stack in recursive reducers (e.g., `getEstimateTreeContentSignature` recursion, F-27) and can degrade DB recursive CTEs (the cycle-detection CTE in `scripts/sql/unify-rollback-pre-apply.sql:209-226` walks the full path).
- **Current mitigation**: None. Grep for `max_depth` / `depth` across `supabase/migrations/` returns no guard (only chart-bucket CTEs use a depth counter). Client `validateEstimateTreeHierarchy` is a no-op (F-10).
- **Recommended mitigation**: Q-20 decision (recommended default: 100) → Phase 1.5. Add DB-side `CHECK`/trigger rejecting depth > N; mirror in client for early feedback.
- **Residual**: High until Q-20 is decided and guards ship.
- **Finding link**: Q-20, F-10, F-27.

---

## 5. Coverage Check (required by A4 scope)

| Required coverage | Threat(s) | Notes |
|---|---|---|
| Authentication | T-01, T-02, T-03 | Token/password/invite spoofing surface |
| Authorization (F-19) | T-04 | Primary elevation-of-privilege finding |
| Share-token publication | T-01, T-03, T-12, T-13 | Token strength, password lockout, snapshot leakage, URL leak |
| Viewer-role escalation | T-04, T-05 | App-layer gap (F-19) + UI-layer gap (Q-19) |
| Optimistic-UI race conditions as data-integrity threat | T-06 (F-01), T-07 (F-06), T-08 (F-07), T-09 (Q-25), T-10 (F-18) | Treated as Tampering, not Spoofing — integrity-of-client-state, no confidentiality impact |

---

## 6. Open Threats Requiring Philip's Decision

These are the threats whose mitigation is gated on a product/scope decision, not on engineering effort.

1. **T-09 (Q-25)** — Two-tab concurrent mutation silently loses one user's work (LWW by design). **Decision needed**: ship as-is for v1 (recommended) OR invest in Supabase Realtime echo of tree mutations to other tabs/sessions. Default if no answer: ship LWW, document as known limitation.
2. **T-14 (Q-20)** — Max tree depth is unbounded. **Decision needed**: pick the cap (recommended: 100) so the DB guard can ship. Default if no answer: 100.
3. **T-13** — Share token lives in the URL path. **Decision needed**: confirm acceptable for v1 (with `Referrer-Policy: no-referrer` header added) vs. move token to a cookie/session-only model post-launch. Default if no answer: add the header, keep path token for v1.

(Philip's confirmation cadence and deadlines are owned by A3 in `12-OPEN-QUESTIONS-AND-DECISIONS.md`.)

---

## 7. References

- `09-PRIORITIZED-FINDINGS.md` — F-01, F-06, F-07, F-10, F-18, F-19, F-27 (evidence and root causes).
- `15-RISK-REGISTER.md` (A5, parallel) — severity × probability × owner × mitigation × deadline scoring view of the same threat set.
- `13-PLAN-AUDIT-AND-SCORECARD.md` §5 (roles), §10 (decision defaults), §13 (residual-risk disclosures).
- `06-STATE-NETWORK-DATA-AUDIT.md` §6.7.2 (audit trail), §6.9 (authorization matrix), §6.10 (validation summary).
- `01-SYSTEM-MAP.md` §10–11 (DB surface, security boundary).
- `16-DATA-MIGRATION-PLAN.md` (A6, parallel) — RPC body audit and the F-06 output-shape migration.

---

**Status**: Wave 1 · A4 complete. 15 threats catalogued, 3 open for Philip's decision.
