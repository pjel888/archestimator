# 22 — Security & RLS Threat Plan (Performance Refactor)

> **Authoring agent:** W-SEC (round 2). **Status:** Plan. Planning only — no `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config changes; no migrations applied; no DB writes. Every new `prove:*` / gate below is a **proposal** marked "(new, Phase N)" for `FIX-9` to wire into `15_VALIDATION_MATRIX.md`.
>
> **Authoritative inputs:** `_research/_SYNTHESIS.md` (V2 IMPROVEMENT CONTRACT — pinned `RISK-19/20/21`, §V2-FACTS), `10_PHASE_4_DATA_AND_CACHE_PLAN.md`, `11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md`, `13_PHASE_7_BUNDLE_RUNTIME_PLAN.md`, `14_PHASE_8_SUPABASE_DB_PLAN.md`, `_research/R5-data-supabase.md`. Live code grounded read-only: `src/app/workshop/layout.tsx`, `src/app/providers.tsx`, `src/components/realtime-auth-bridge.tsx`, `src/app/layout.tsx`, `src/app/share/[token]/page.tsx`, `src/lib/favorites/query-keys.ts`.
>
> **Conventions (contract §4):** Priority `P0–P3`, Risk `Low/Medium/High/Critical`, evidence `path:line — observation`. Risk IDs `RISK-NN`, Open-question IDs `Q-NN`, Decision IDs `D-NN`.

---

## 0. Why this document exists

The round-2 review panel scored the pack **52/100 on security** — the second-lowest dimension. The refactor's own moves *create or expand* security surfaces:

- The **provider-topology move** (Phase 7, `13` §2) relocates the auth/realtime boundary — a naive impl can drop a server-side redirect.
- **New read RPCs** (Phase 8, `14` §3) introduce three fresh data-egress paths that must be cross-tenant-proofed.
- The **`ActionResult<T>` wrapping refactor** (Phase 4, `10` §2) restructures every mutation action — a refactor can silently relocate an authz check below a happy-path return.

None of these are caught by `bun run validate` today: it runs `type-check + lint + lint:design-system + lint:design + test + test:dom` (synthesis §0.70) — **no unauthenticated-route gate, no cross-tenant denial proof, no app-layer-authz-removed proof.** This document is the plan-level threat model that makes those surfaces explicit and maps each to a `prove:*` gate.

**Threat posture:** the refactor is a *performance* change. The security bar is **"no access decision changes."** Every gate below is an equivalence / denial assertion, not a new feature.

---

## 1. Provider topology move — workshop auth-boundary continuity — **P0 / Risk: Critical — RISK-19**

**Resolves:** `RISK-19` (workshop-layout RSC→client conversion drops the auth redirect), `13` §2, RISK-09 (route remount/focus from the same move).

### 1.1 Current state (PINNED, grounded)

- `src/app/workshop/layout.tsx` is an **`async` RSC** (`:17`). It runs, server-side and **above any client boundary**, in order:
  - terms-gate bypass check (`:21-23`),
  - `getCurrentUserContext()` → `if (!currentUser) redirect("/login")` (`:25-26`),
  - terms-acceptance gate → `redirect(buildTermsAcceptanceRedirectPath(...))` (`:28-31`).
- `src/app/providers.tsx:1` is `"use client"`; `AppProviders` (`:30-46`) mounts `RealtimeAuthBridge` (`:40`), `NotificationProvider` (`:36`), `PerformanceMonitor` (`:38`), `NavigationListener` (`:39`) for **every** route via root `src/app/layout.tsx:27`.
- `/share/[token]` has **no local provider** (`src/app/share/[token]/page.tsx`; no `AppProviders`/`WorkshopProviders` reference) — it inherits the global `AppProviders` from root layout today, so it currently *does* mount `RealtimeAuthBridge` + `NotificationProvider`.

### 1.2 The hazard

The Phase 7 target (`13` §2) relocates the authed providers into a `<WorkshopProviders>` client component. The **constraint**: `src/app/workshop/layout.tsx` MUST remain an RSC (or render `<WorkshopProviders>` as its **child**, never become `"use client"` itself). A `"use client"` directive on the layout file would:

1. erase the server-side `getCurrentUserContext()` + `redirect("/login")` + terms gate (`:25-31`) — those cannot run in a client component;
2. silently expose every `/workshop/**` route to **unauthenticated** GETs, relying only on downstream RLS (which protects *data*, not *route shell render* — an attacker still gets the authed HTML scaffold, nav, and any client-island error surface);
3. pass `type-check`, `lint`, and `test:dom` — **none of those assert an unauthenticated route is redirected.**

### 1.3 Required gates

| Gate | Assertion | Status |
|---|---|---|
| `prove:workshop-auth-boundary` | e2e: an **unauthenticated** GET of a representative `/workshop/**` route → **302 to `/login`** (and the terms-gate path → 302 to the acceptance route). Fails closed: any 200 with workshop shell HTML is a FAIL. | **(new, Phase 7)** |
| `prove:workshop-auth-boundary` (assertion 2) | The layout module is an RSC — a structural check (no `"use client"` at the top of `workshop/layout.tsx`; `redirect` import retained) so the e2e's intent is double-anchored. | **(new, Phase 7)** |
| `/share` session-residue check | After the move, `RealtimeAuthBridge`'s `SIGNED_OUT` cleanup (`realtime-auth-bridge.tsx:54-59`, `queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() })`) **no longer runs on `/share/[token]`** because the bridge no longer mounts there. Assert that a public share GET (a) opens **no realtime WS**, (b) leaves **no `favoritesQueryKeys`** cache residue, (c) fires no `supabase.auth.getSession()` roundtrip (`realtime-auth-bridge.tsx:45`). | **(new, Phase 7)** part of `shared-link-receiver.spec.ts` extension |

### 1.4 Why the share residue check matters (RISK-09 adjacency)

Today the bridge mounts on `/share` and *would* evict favorites on `SIGNED_OUT`. After the move it does not mount there at all — which is the **desired** end state (a public recipient should never have had a favorites cache), but the move must be proven to **remove** the surface, not merely relocate the cleanup. The risk is the inverse of the original bug: a transitional state where a user navigates authed-workshop → `/share` and the now-unmounted bridge leaves stale authed cache visible on the public page. The residue check asserts the public share render starts clean.

**Citations:** `src/app/workshop/layout.tsx:17,25-31`; `providers.tsx:30-46` (esp. `:36,38,39,40`); `realtime-auth-bridge.tsx:45,50-59`; `13` §2; RISK-09; RISK-19.

---

## 2. New RPC SECURITY model + cross-tenant proofs — **P1 / Risk: High — RISK-20**

**Resolves:** `RISK-20` (new-RPC cross-tenant data leak), `14` §3, RISK-05.

### 2.1 The three new read RPCs (from `14` §3)

| RPC | Replaces | Egress shape | Tenant key |
|---|---|---|---|
| `get_project_chart_buckets` | JS `.reduce`/bucketing (`src/lib/repositories/project-charts-repository.ts:106`) | per-project chart buckets over ≤5000 rows / ≤1500 nodes (`ESTIMATE_ROW_LIMIT`/`ESTIMATE_NODE_LIMIT`, `src/lib/repositories/project-charts-repository.ts:17-18`) | `project_id` → workspace |
| `workspace_homebase_summary` | serial tail (`workspace-repository.ts:1126-1222`) | favorites/recent/members summary | `workspace_id` |
| `estimate_activity_node_scope` | JS BFS full-node fetch (`actions.ts:670-719`) | descendant node-id set | `estimate_id` → sheet/project/workspace |

Note (CORRECTED): `get_project_chart_buckets` **already exists** as a deferred migration — `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql` (`create or replace function public.get_project_chart_buckets(...)` :21; `grant execute … to authenticated` :150), referenced at `src/lib/repositories/project-charts-repository.ts:117`. It is **already** `security invoker` + `set search_path = public` (those §2.2 mandates are MET). **BUT** its body filters only on `where ri.estimate_id = any(target_estimate_ids)` (:51,:57) with **NO `is_workspace_member(...)` join** — exactly the defense-in-depth gap §2.2 mandates against. So the Phase-8 task is **REVIEW-AND-HARDEN of the existing migration, not fresh authoring**: the membership-join mandate (§2.2) is currently **UNMET** and must be added before cutover. The other two RPCs (`workspace_homebase_summary`, `estimate_activity_node_scope`) are still to-be-authored, so their SECURITY model is a design decision. Highest-leverage place to get it right.

### 2.2 Mandated SECURITY model (every one of the three)

- **`security invoker`** (NOT `definer`) + **`set search_path = public`** — follow the `project_estimate_list_summaries` precedent (`…rpc.sql`, `language sql stable security invoker`, revoked `anon`, granted `authenticated`; R5 RPC inventory). `security invoker` means the caller's RLS applies, so the RPC cannot egress rows the caller's policies forbid.
- **`revoke … from anon; grant execute … to authenticated`** on each — no anon execute (the chart/homebase/activity data is authed-only).
- **The WHERE clause must join *through workspace-membership*, not rely solely on child-table RLS.** Defense-in-depth: even under `security invoker`, an aggregate RPC that joins many tables can leak a count/bucket if one joined table's RLS is weaker than the parent's. The RPC body must filter on `is_workspace_member((select auth.uid()), workspace_id)` (the remediated helper, `14` §5) so a guessed `project_id`/`estimate_id` in another tenant returns **zero rows**, independent of any single child policy.
- **If any RPC is justified as `security definer`** (it should not need to be), it must **not** put a bare `auth.uid()` in its body re-evaluated per row (`14` §5; `RISK-05`) and must re-assert membership explicitly.

### 2.3 Required gates (cross-tenant DENIAL proofs)

For each RPC, a **denial** proof: a user **not** a member of workspace/project/estimate X cannot retrieve X's data **even with a correctly-guessed UUID**.

| Gate | Assertion | Status |
|---|---|---|
| `prove:project-chart-buckets` (extend) | (a) golden-master SQL==JS equivalence over a fixture (already mandated `14` §6.2); **(b) cross-tenant denial:** caller in workspace A passes a valid `project_id` from workspace B → RPC returns **empty**, not B's buckets. This gate **must run against the EXISTING deferred migration (`…20260614021500…`) and is EXPECTED TO FAIL today** — that migration has no membership join (§2.1), so it would leak B's buckets to a workspace-A caller who guesses B's ids. The failure is the point: it is the regression-catcher proving the harden is needed, and must flip to PASS only once the `is_workspace_member(...)` join (§2.2) is added before cutover. | **(new, Phase 8 — expected-fail until §2.2 join added)** |
| `prove:estimate-tabs-rls` (extend) | Add an `estimate_activity_node_scope` axis: a user with no `estimate_sheet_members` access to estimate B who passes B's `estimate_id` gets an **empty** node-scope set (see also §5). | extend existing `prove:estimate-tabs-rls` |
| `prove:workspace-homebase-summary` | caller in workspace A passing workspace B's id (or with the RPC defaulting to the caller's workspace) cannot read B's favorites/members summary. | **(new, Phase 8)** |
| `bun run prove:rls-initplan` + `get_advisors` (security) | each new RPC adds no `auth_rls_initplan` / `multiple_permissive_policies` lint, no new bare-`auth.uid()` policy (`Q-I`, `14` §5). | existing |

**Citations:** `14` §3 (RPC table), `14` §5 (helper reuse + initplan), `14` §6.2 (proof harness pattern), R5 RPC inventory (`project_estimate_list_summaries` precedent), `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql:21,51,57,150`, `src/lib/repositories/project-charts-repository.ts:17-18,106,117`, `workspace-repository.ts:1126-1222`, `actions.ts:670-719`; RISK-05.

---

## 3. `ActionResult<T>` authz-preservation — **P1 / Risk: High — RISK-21**

**Resolves:** `RISK-21` (`ActionResult<T>` wrapping silently drops an interior authz check), `10` §2.3, `11` §6 (`SCHEMA_MISSING` fail-closed default).

### 3.1 The hazard

Phase 4 wraps every mutation action to return `ActionResult<Row>` (`10` §2.3). Many actions today have an **interior app-layer authz check** finer than RLS — e.g. `can_edit_estimate` / `can_edit_project` RPCs (R5 authz helpers), or a `getCurrentUserContext()` null-check. A wrapping refactor can move that check **below an early happy-path `return ok(...)`**, or replace a thrown error with a silent `ok()`. The result:

- `type-check` passes (the return type is still `ActionResult<Row>`);
- `test:dom` passes (the mock returns `ok`);
- **RLS still blocks the DB write** — so data is not corrupted — but the **app-layer authz** (which is *finer* than RLS: e.g. a viewer-role member who can read but not edit, where RLS permits the read-scoped row but the app forbids the mutation path) is **silently removed**, and the client gets a misleading `ok` instead of `FORBIDDEN`.

This is the most subtle of the three exploit classes (§6) because the DB does not error — the regression is invisible without an app-layer authz assertion.

### 3.2 Mandated per-action checklist (Phase 4 wrapping)

For **every** wrapped mutation action:

1. **The authz check sits BEFORE any mutation call AND before any `return ok(...)`.** Order is: `getCurrentUserContext()` / `can_edit_*` → on failure `return err({ code: "FORBIDDEN" })` → only then the RPC mutation.
2. **A failed authz check returns `err({ code: "FORBIDDEN" })`** — never a silent `ok()`, never a swallowed throw.
3. **`SCHEMA_MISSING` stays fail-closed by default** (`10` §2.3, `11` §6) — do not widen the `isEstimateTabsSchemaMissing` fail-open surface while normalizing return shapes (`RISK-05` adjacency).
4. **Run `bun run build` after each actions file** — a `"use server"` file exports only async fns; `tsc` + Vitest miss a sync export, only `next build` catches it (`10` §2.4; MEMORY).

### 3.3 Required gate

| Gate | Assertion | Status |
|---|---|---|
| `prove:action-authz` | Per wrapped action: a **no-session** (and where applicable, **wrong-role**) call returns `{ ok: false, error.code: "FORBIDDEN" }` — **never** `ok: true`. Parametrized over the wrapped action set; fails closed (an `ok:true` from a no-session call is a FAIL). | **(new, Phase 4)** |

This gate is the app-layer complement to the RPC denial proofs (§2) and the optimistic FORBIDDEN-path tests (§4): §2 proves the DB denies, §3 proves the *action* denies, §4 proves the *client* rolls back on denial.

**Citations:** `10` §2.3, `10` §2.4, `11` §6 (`SCHEMA_MISSING`), R5 authz helpers (`can_edit_estimate`/`can_edit_project`); RISK-21; RISK-05.

---

## 4. Optimistic FORBIDDEN-path tests (defense-in-depth) — **P1 / Risk: Medium**

**Resolves:** `11` §11 (test matrix), defense-in-depth for `RISK-21` at the client.

### 4.1 The gap

The Phase 5 test matrix (`11` §11) has axes apply / reconcile / rollback / conflict. Only two flows currently carry a FORBIDDEN-shaped conflict cell (#12 collaborator-role: "RLS-reject → rollback + toast `FORBIDDEN`", #13). The hazard: an optimistic flow that does **not** test the `ok:false {FORBIDDEN}` path can leave the optimistic write **showing in the UI** after the server rejected it — the same data-integrity class the Phase 5 "close the 2 holes first" work targets (`11` §0, §5).

### 4.2 Mandated addition — a "forbidden" axis

Add a **forbidden** column to the `11` §11 matrix for the flows where an authz reject is realistic:

| Flow (`11` §11 #) | Forbidden scenario | Assertion |
|---|---|---|
| #12 collaborator-role | viewer attempts a role change RLS forbids | server `ok:false {FORBIDDEN}` → map rollback fires → pre-mutation role restored → toast `FORBIDDEN` |
| #6 row-promote | member lacking edit-rights promotes a row | `ok:false {FORBIDDEN}` → demoted state restored (no cross-key invalidation leaks the optimistic promote) |
| #8 tree-reorder | member lacking edit-rights reorders | `ok:false {FORBIDDEN}` → **revision-guarded** restore fires (NOT a naive snapshot — RISK-07); reordered state reverted |

**Rule:** on `ok:false {FORBIDDEN}`, rollback fires and **pre-mutation state is fully restored** — for multi-key flows, atomically (`11` §5 rollback-ordering rule).

### 4.3 Required gate

| Gate | Assertion | Status |
|---|---|---|
| `optimistic-mutation-contract.test.tsx` (extend) | the new **forbidden** axis for #12/#6/#8: server returns `ok:false {FORBIDDEN}` → rollback restores pre-mutation state, no `temp_`/optimistic residue survives. Wired into the Phase 9 aggregate, not `validate` directly (`11` §11). | extend the proposed `optimistic-mutation-contract.test.tsx` **(new, Phase 5)** |

**Citations:** `11` §11 (matrix), `11` §5 (rollback contract, atomic multi-key), `11` §0/§5 (the 2 no-rollback holes), RISK-07 (do not flatten #8's revision guard).

---

## 5. Recursive-CTE multi-role isolation — **P1 / Risk: High**

**Resolves:** `14` §3 (`estimate_activity_node_scope`), cross-tenant within a workspace (sheet-member granularity).

### 5.1 The hazard

`estimate_activity_node_scope` (the `WITH RECURSIVE` CTE replacing the JS BFS, `14` §3; `actions.ts:670-719`) traverses descendant nodes of an estimate. RLS at the workspace level is **not sufficient**: access to estimate nodes is gated finer, at `estimate_sheet_members` (R5; the §2.1 hot-path FK `estimate_sheet_members(estimate_id)`). A workspace **member** who lacks sheet-member access to a specific estimate must **not** be able to traverse that estimate's nodes via the CTE — even though they are in the same workspace.

A recursive CTE is a classic place to leak: if RLS is checked only on the **anchor** row and not re-applied to the recursive term, the traversal can walk into descendant nodes the caller cannot see.

### 5.2 Required gate

| Gate | Assertion | Status |
|---|---|---|
| `prove:estimate-tabs-rls` (extend — multi-role) | The CTE descendant-set equivalence proof (`14` §3: CTE == `collectDescendantNodeIds` BFS) runs under **multiple user contexts**: (a) a sheet-member of estimate E gets E's full descendant set; (b) a workspace member who is **not** a sheet-member of E gets an **empty** set (RLS denies the anchor AND every recursive step); (c) respects the `includeDescendants=false` short-circuit (`actions.ts`). | extend `prove:estimate-tabs-rls` **(multi-role axis, Phase 8)** |

This is the same gate named in §2.3 for `estimate_activity_node_scope`, with the explicit multi-role requirement: the equivalence proof is **not** trustworthy if run under a single super-privileged context.

**Citations:** `14` §3 (`estimate_activity_node_scope` CTE + equivalence requirement), `actions.ts:670-719` (`:698-701` no-limit fetch, `:640-662` BFS), R5 (`estimate_sheet_members` granularity, §2.1 FK index).

---

## 5b. Public-share cache isolation under Cache Components — **P0 / Risk: Critical — RISK-23**

**Resolves:** `RISK-23` (the Next 16 Cache Components / `use cache` layer over the public `/share/[token]` route serves a tenant- or token-crossed cached response), `26` (Cache Components rollout, Track F / C1), and the §7.2 "share-token model is OUT OF SCOPE" boundary (the token *authorization* path is unchanged; what is new is a **cache layer in front of it**).

### 5b.1 The hazard

`26`'s C1 rollout wraps the public share read path in a cached scope (Next 16 Cache Components / `use cache` with `cacheTag`/`cacheLife`). The share page is the one route that is intentionally *public* yet *per-token tenant-scoped*: `src/app/share/[token]/page.tsx` resolves a token to a single publication's snapshot (R5 best-in-class token-hash collapse + split column sets in `public-repository.ts`). A cache layer introduced in front of it can break that scoping in four distinct ways — none caught by `bun run validate`, none caught by the existing share-token tests (which assume no cache), and all of them cross-tenant or cross-recipient data egress on a **public, unauthenticated** surface (highest blast radius — no login needed to exploit):

1. **Stale-after-revocation:** a revoked / expired / rotated token continues to be served from a cached scope after its underlying publication access was withdrawn — the cache outlives the authorization.
2. **Password-gate bypass:** a password-gated publication (the **P10** gate) is served from cache *past* the gate — a cached HTML/RSC payload that already contains the gated snapshot is replayed to a caller who never satisfied the password challenge.
3. **Token-in-key leakage / collision:** the `cacheTag` key is computed from a bare/raw token instead of the publication id, so (a) the raw secret token leaks into cache-key space (logs, eviction telemetry), and/or (b) two tokens resolving to different publications collide or one token's cached entry is served for another.
4. **Cross-recipient snapshot bleed:** one recipient's per-token snapshot (or a recipient-specific column set / split) is served to a different recipient because the cached scope is keyed too coarsely (e.g. by route, not by publication id).

This is **Critical** because the exploit needs no authentication, the data is business-sensitive cost/snapshot data, and the failure mode (a too-coarse `cacheTag` or a missing revalidation on revoke) is a one-line cache-config mistake that passes every existing gate — exactly the C1 leak class `26` flags.

### 5b.2 Mandated cache-isolation model (Track F / C1)

- **`cacheTag` is keyed on the publication id, NEVER on a bare/raw token.** The token is a secret credential, not a cache key; the cache scope is tagged with (and revalidated by) the resolved publication id. The token→publication resolution (token-hash collapse, `public-repository.ts`) runs **outside / before** the cached scope so the secret never enters cache-key space.
- **Revocation / expiry / rotation revalidates the publication's cache tag.** A revoke / expire / rotate path must `revalidateTag(<publication-id-tag>)` (or equivalent) so no withdrawn-access snapshot survives in cache. Cache lifetime must not exceed the authorization lifetime; fail-closed on any ambiguity (treat unknown-state as uncached).
- **The P10 password gate sits OUTSIDE the cached scope.** The password challenge + verification is request-scoped and must run before the cached snapshot is reachable — the gated snapshot is never part of a scope a non-passing caller can be served. (Consistent with `26`'s `lint:no-request-in-cache` / `prove:no-private-in-public-cache`: request-scoped credential checks may not be folded into a cached output.)
- **Cache scope is keyed finely enough that one recipient's snapshot is never served to another** — publication id (and, where the snapshot is recipient/column-set specific, the recipient/variant) participates in the key; route-only keying is forbidden.

### 5b.3 Required gate

| Gate | Assertion | Status |
|---|---|---|
| `prove:share-*` | The public `/share/[token]` cache layer is tenant- and token-isolated under Next 16 Cache Components. Four fail-closed isolation properties: **(a) revocation freshness** — a revoked/expired/rotated token is **never served stale** from a cached scope (post-revoke fetch → not-found/denied, not the cached snapshot); **(b) password-gate non-bypass** — a P10 password-gated publication is **not served from cache past the gate** (a non-passing caller never receives the gated snapshot from a cached entry); **(c) key hygiene** — the `cacheTag` for a publication **includes the publication id and NEVER a bare/raw token** (structural assertion over the tag derivation); **(d) cross-recipient isolation** — one recipient's snapshot is **never served to another** (distinct publications/recipients never collide on a cache key). Fails **closed**: any cached cross-tenant/cross-token/stale-after-revoke/past-gate serve is a FAIL. | **(new, Track F / C1)** |

This is the cache-layer complement to the share-token authorization model: §7.2 keeps the token *authorization* path unchanged; `prove:share-*` proves the **new cache layer in front of it** does not silently widen that authorization in time (revocation), across the gate (P10), in key-space (raw token), or across recipients.

**Citations:** `26` (Cache Components C1 rollout + `lint:no-request-in-cache` / `prove:no-private-in-public-cache`); `src/app/share/[token]/page.tsx`; `public-repository.ts` (`cache()` + token-hash collapse + split column sets, R5); §7.2 (share-token model OUT OF SCOPE — authorization path unchanged); RISK-23 (Critical); P10 (password-gated publication).

---

## 6. Top-3 exploit scenarios (ranked by likelihood × impact)

### 6.1 Workshop RSC→client conversion (MOST LIKELY) — RISK-19

**Attack:** an unauthenticated user (or a logged-out attacker) issues a plain GET to `/workshop/projects/<id>` or any workshop route. **Why it works:** if the Phase 7 provider move converts `src/app/workshop/layout.tsx` to `"use client"` (or moves the auth check below the client boundary), the server-side `getCurrentUserContext()` + `redirect("/login")` (`:25-26`) and the terms gate (`:28-31`) no longer run — the route renders its authed shell to anyone; data is still RLS-protected, but the route boundary (the app's first authz gate) is gone, and `bun run validate` has no test that would catch it. This is the most *likely* failure because the move is a hands-on refactor of exactly that file and the failure mode (a stray `"use client"`) is a one-line mistake that passes every existing gate. **Mitigation gate:** `prove:workshop-auth-boundary` (§1.3) — unauthenticated workshop GET → 302 login, fail-closed; plus the RSC structural check.

### 6.2 Chart-RPC project-scope bypass (HIGHEST IMPACT) — RISK-20

**Attack:** an authenticated user in workspace A calls `get_project_chart_buckets` (or `workspace_homebase_summary`) with a `project_id`/`workspace_id` belonging to workspace B (UUIDs are guessable/enumerable from shared links, URLs, or prior membership). **Why it works:** an aggregate RPC that (a) is mistakenly `security definer`, or (b) is `security invoker` but joins a child table whose RLS is weaker than the parent and filters only on the passed id rather than re-asserting workspace membership, will return **another tenant's financial chart data**. This is concrete, not hypothetical: the **already-existing** deferred `get_project_chart_buckets` migration (`…20260614021500…`) is `security invoker` but filters only `where ri.estimate_id = any(target_estimate_ids)` (:51,:57) with **no membership join** — case (b) exactly (§2.1). The JS path it replaces is `src/lib/repositories/project-charts-repository.ts:106` — the highest-impact outcome because it is a direct cross-tenant data egress of business-sensitive cost data. **Mitigation gate:** `prove:project-chart-buckets` + `prove:workspace-homebase-summary` cross-tenant denial proofs (§2.3) — guessed foreign UUID → empty; plus the mandated `security invoker` + membership-join WHERE clause (§2.2).

### 6.3 ActionResult authz drop (MOST SUBTLE) — RISK-21

**Attack:** a member with read-but-not-edit rights (finer than RLS permits at the row level) invokes a mutation action whose interior `can_edit_*` / session check was relocated below the happy-path `return ok(...)` during the `ActionResult<T>` wrapping. **Why it works:** RLS blocks the actual DB write, so no data is corrupted and no DB error surfaces — but the action returns `ok:true` to the client (misleading success), and any app-layer-only authorization (paths RLS doesn't model) is silently bypassed. It is the most *subtle* because nothing errors: `type-check`, `test:dom`, and even RLS all stay green; only an explicit app-layer authz assertion reveals it. **Mitigation gate:** `prove:action-authz` (§3.3) — no-session/wrong-role call → `ok:false {FORBIDDEN}`, fail-closed; the per-action checklist (§3.2) keeps the check before any return; `prove:rls-initplan` confirms RLS itself is unchanged.

---

## 7. Phase → security-gate matrix + "do not regress" list

### 7.1 Phase → security-gate matrix

| Phase | Security surface introduced | Gate(s) | Risk |
|---|---|---|---|
| **Phase 4** (`10`) | `ActionResult<T>` wrapping relocates interior authz checks | `prove:action-authz` (new); `bun run build` per actions file; `prove:rls-initplan` on any RLS-touching read | High — RISK-21 |
| **Phase 5** (`11`) | optimistic flows must roll back on server FORBIDDEN | `optimistic-mutation-contract.test.tsx` forbidden axis (#12/#6/#8) (new) | Medium |
| **Phase 7** (`13`) | provider move can drop the workshop auth redirect; share session residue | `prove:workshop-auth-boundary` (new); `/share` session-residue check in `shared-link-receiver.spec.ts` (new) | **Critical** — RISK-19, RISK-09 |
| **Phase 8** (`14`) | 3 new read RPCs; recursive CTE; FK indexes; RLS pass | `prove:project-chart-buckets` (cross-tenant), `prove:workspace-homebase-summary` (new), `prove:estimate-tabs-rls` (CTE multi-role), `prove:rls-initplan`, `get_advisors` security | High — RISK-20, RISK-05 |

### 7.2 What the pack already gets right (DO NOT REGRESS)

These are existing, verified-good security properties the refactor must **preserve**, not rebuild:

- **`security invoker` default for read RPCs** — the `project_estimate_list_summaries` precedent (`language sql stable security invoker`, revoked anon / granted authenticated; R5). New RPCs inherit this; mutations stay `*_with_history` SECURITY DEFINER deliberately.
- **`prove:rls-initplan`** harness + the active initplan remediation (migrations `…192344`, `…201302`, `…162000`; `14` §5) — proven to change no access decision. Reuse the remediated helpers (`is_workspace_member`, `current_project_access_rank`, `can_access_estimate`); do not inline new `auth.uid()` predicates.
- **`SCHEMA_MISSING` fail-closed default** (`10` §2.3, `11` §6) — do not widen the `isEstimateTabsSchemaMissing` fail-open surface during the envelope normalization.
- **Share-page token model is OUT OF SCOPE** — the `/share/[token]` token/access model (`public-repository.ts` `cache()` + split column sets, token-hash collapse; R5 best-in-class) is not changed by this refactor. Phase 7 only *removes* the authed-provider mount from that page (§1.3); it must not touch the token authorization path.
- **`favoritesQueryKeys` `SIGNED_OUT` eviction** (`realtime-auth-bridge.tsx:54-59`) — the existing per-session cache hygiene. The provider move must preserve clean public-page state (the §1.3 residue check), not silently leave authed cache on `/share`.

---

## 8. Threat items tracked via RISK-19/20/21 + their `prove:*` gates

These are **not** separate tracked open-question IDs — they are the safe-default resolutions of the pinned risks, each already anchored to a `prove:*` gate in §§1–5 and §9. They are restated here so the threat-model reasoning is visible in one place; the authoritative tracking is RISK-19/RISK-20/RISK-21 and their gates, not a standalone Q-ID series.

- **Action-authz coverage set (RISK-21 / `prove:action-authz`, §3)** — Which mutation actions have an app-layer authz check *finer* than RLS (so `prove:action-authz` covers the right set)? Owner: eng + caller trace of `can_edit_*` usage. Safe default: treat **every** wrapped mutation action as authz-bearing and assert `FORBIDDEN` on no-session.
- **Chart-RPC egress scope (RISK-20 / `prove:project-chart-buckets`, §2)** — Does `get_project_chart_buckets` need any field RLS *weaker* than `is_workspace_member` (e.g. a viewer who can see charts but not edit)? Owner: product. Safe default: workspace-member-only egress (the membership join §2.2 mandates).
- **CTE isolation boundary (RISK-20 / `prove:estimate-tabs-rls` multi-role, §5)** — For `estimate_activity_node_scope`, is sheet-member access the correct isolation boundary, or is project-member sufficient? (Affects §5 case (b).) Owner: eng. Safe default: the finer `estimate_sheet_members` boundary (fail-closed).
- **Bare-`auth.uid()` regression (RISK-20 / `prove:rls-initplan` + `get_advisors`, §2.3; cross-ref `Q-I`, `14` §5)** — Has any policy after migration `…162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? Run `prove:rls-initplan` + `get_advisors` security before Phase 8 closes.

---

## 9. Validation summary (existing + proposed gates)

**Existing (reuse):** `bun run prove:rls-initplan`, `bun run prove:estimate-tabs-rls`, `bun run prove:notification-rls`, `bun run prove:estimate-list-summaries`, `bun run build` (sync-export trap), `get_advisors` (performance + security), `bun run validate`.

**Proposed (new — for `FIX-9` to add to `15_VALIDATION_MATRIX.md`):**
- `prove:workshop-auth-boundary` (new, Phase 7) — unauthenticated workshop route → 302 login + RSC structural check.
- `/share` session-residue assertion in `shared-link-receiver.spec.ts` (new, Phase 7) — no WS, no `favoritesQueryKeys` residue, no auth roundtrip on public share.
- `prove:project-chart-buckets` (new, Phase 8) — golden-master + **cross-tenant denial**; runs against the **existing** deferred migration (`…20260614021500…`) and is **expected-fail until the §2.2 membership join is added** (review-and-harden, not fresh authoring).
- `prove:workspace-homebase-summary` (new, Phase 8) — cross-tenant denial.
- `prove:estimate-tabs-rls` **multi-role / CTE axis** (extend, Phase 8) — `estimate_activity_node_scope` denial under non-sheet-member context.
- `prove:action-authz` (new, Phase 4) — no-session/wrong-role mutation → `ok:false {FORBIDDEN}`.
- `optimistic-mutation-contract.test.tsx` **forbidden axis** (extend, Phase 5) — server FORBIDDEN → rollback restores pre-mutation state.
- `prove:share-*` (new, Track F / C1) — public `/share/[token]` cache layer tenant- and token-isolated under Next 16 Cache Components: (a) no stale serve after revoke/expire/rotate, (b) no P10 password-gate bypass from cache, (c) `cacheTag` keyed on publication id never a raw token, (d) no cross-recipient snapshot bleed. Mitigation gate for **RISK-23** (Critical); see §5b.

All new gates fail **closed**. None run inside `bun run validate` today (contract §0); they wire into the Phase 9 aggregate + the relevant phase's done-when.
