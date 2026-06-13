# 03 — Database, Backend & RLS

**Bottom line: no database, RPC, or RLS change is required.** Everything the
"+" needs already shipped in `20260612094734_estimate_tabs_foundation.sql`.
This document is here to *prove* that (the owner asked for the data angle) and
to nail the one real database concern: **the hosted migration must be applied.**

---

## 1. Schema (already present)

`public.estimate_tabs` (`supabase/migrations/20260612094734_estimate_tabs_foundation.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `estimate_id` | uuid NOT NULL | FK → `estimates(id)` `ON DELETE CASCADE` |
| `name` | text NOT NULL | `CHECK (char_length(trim(name)) > 0)` |
| `sort_order` | integer NOT NULL | default 0; new tabs get `max+10` |
| `is_default` | boolean NOT NULL | default false; exactly one true per estimate |
| `archived_at` | timestamptz NULL | soft-delete; archived ≠ default (check) |
| `metadata` | jsonb NOT NULL | default `'{}'` (e.g. `duplicatedFromTabId`) |
| `created_by` | uuid NULL | FK → `auth.users(id)` `ON DELETE SET NULL` |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger-maintained |

Constraints / indexes that matter for create:
- `unique (estimate_id, sort_order) DEFERRABLE INITIALLY DEFERRED` — lets bulk
  reorder pass through an intermediate collision; irrelevant to single insert.
- partial unique index on `(estimate_id) WHERE is_default` — one default per
  estimate. New tabs are `is_default=false`, so create never touches it.
- `CHECK (archived_at IS NULL OR is_default = false)`.

**No name-uniqueness constraint** — duplicate tab names are allowed by design.
Collision avoidance is purely client-side (`getNextTabName` skips used `tab N`).
Do **not** add a uniqueness constraint expecting one (see
[08 KTD](08_DECISIONS_AND_OPEN_QUESTIONS.md)).

---

## 2. RLS (already correct — do not loosen)

Three policies on `estimate_tabs`:

- **SELECT** → `public.can_access_estimate(estimate_id)`
- **ALL (insert/update/delete)** → `public.can_edit_estimate(estimate_id)`
  (both `USING` and `WITH CHECK`)
- **Platform admin** → `public.is_platform_admin()`

Grants: `anon`/`public` get nothing; `authenticated` gets
`select, insert, update, delete`, with the policies above doing the real
gating.

**An INSERT by an editor is already permitted.** No new policy is needed. The
create RPC additionally runs `assert_can_edit_estimate_for_history` (the strict
D-6 posture), closing the older asymmetry where a restricted viewer could mutate
via a history RPC. **Lifting the gate does not widen access** — server
authorization is unchanged. The client `canEditEstimate` gate is purely UX; the
server remains the source of truth.

---

## 3. The create RPC (already shipped)

`create_estimate_tab_with_history(target_project_id, target_estimate_id,
tab_name, acting_user_id, correlation_id)`:

1. Asserts edit access (`assert_can_edit_estimate_for_history`).
2. `next_sort_order := coalesce(max(sort_order), -10) + 10` for the estimate.
3. Inserts the tab with `is_default = false`.
4. Writes a `tab_created` activity/history event (payload: tab id, name,
   sort_order, correlation id).
5. Returns the canonical result consumed by `readEstimateTabMutationResult`.

Server action `createEstimateTab` ([actions.ts:1843](src/lib/estimates/actions.ts#L1843))
normalizes the name, calls the RPC, and returns
`{ estimateTabId, tabs: getEstimateTabs(...) }`.

**Invariant safety:** because new tabs are non-default with `max+10` ordering,
create cannot violate the single-default index, the sort-order uniqueness, or
the archived≠default check. There is nothing for the UI to manage.

---

## 4. The one real database concern — hosted apply

The schema, RPCs, and RLS exist **in a migration**, but applying that migration
to the **hosted/linked Supabase** is unproven (current-state:
`provider-proof-open`), and **agents cannot apply it here** (Docker absent;
hosted SQL via MCP denied — memory `archestimator-db-channel-boundaries.md`).

**Implications:**
- Applying `20260612094734_estimate_tabs_foundation.sql` (and the generated
  types in `src/lib/supabase/types.ts`) to production is an **owner-gated
  prerequisite** for the "+" to function. It is *not* in this plan's code scope.
- **Fails closed:** if the schema is missing in an environment,
  `resolveEstimateTabRouteContext` detects `isEstimateTabsSchemaMissing` and
  falls back to the legacy tab-less tree; `estimateTabs` is `[]`; the strip and
  "+" never render. No 500 from the "+" path specifically — the *editor* simply
  shows the pre-tabs experience.
- **Verification before flipping the gate in prod:** confirm `estimate_tabs`
  exists and `create_estimate_tab_with_history` is callable in the target
  environment (a single `select` against `pg_proc` / a smoke insert by an
  editor). This is a deploy checklist item, not code.

> If implementation discovers any needed RPC/schema tweak (not expected), it
> must be written as a **ready design and deferred** — not applied — per the
> no-DB-channel constraint.

---

## 5. Generated types

⚠️ **Audit correction:** `src/lib/supabase/types.ts` **already contains** the
full `estimate_tabs` table and all six tab RPCs (verified against the file) —
they are **not** missing or stale, so there is **no type gap and no build risk**
from types for this work. (An earlier draft of this plan worried typegen "may
lag"; that is incorrect for the current tree.) Keep the standing guardrail: this
file is generated output and is **not** hand-edited — if a *future* schema change
were ever needed (none is, here), regenerate via authorized `supabase gen types`
rather than patching by hand.

---

## 6. Summary

| Concern | Status |
|---|---|
| Table / columns / constraints | ✅ shipped |
| RLS (select/insert/update/delete) | ✅ shipped, correct, do not change |
| Create RPC + history event | ✅ shipped |
| Server action | ✅ shipped |
| Ordering / default invariants | ✅ safe by construction |
| **Hosted migration applied** | ⚠️ **owner-gated prerequisite** (mostly fails closed; verify the RPC, not just the table — partial drift fails open, see [07 U7](07_IMPLEMENTATION_PLAN.md)) |
| Generated types | ✅ already present in `types.ts` (verified); do not hand-edit |
