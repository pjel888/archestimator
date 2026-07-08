# 15 — Decisions, Assumptions, and Alternatives

## Major decisions (load-bearing, with rationale + rejected alternatives)

### `DEC-1` — D1 is the single active governance runtime
- **Problem:** Dual persistence (Supabase governance RPCs vs D1 actions) drift.
- **Constraints:** `AGENTS.md` Cloudflare-first; Supabase is exit archaeology.
- **Options:** (A) Reactivate Supabase RPCs; (B) Port contract to D1; (C) Hybrid.
- **Advantages of B:** single runtime, no provider coupling, matches active write path.
- **Disadvantages of B:** must re-implement governance logic D1-natively.
- **Security:** D1 has no RLS → app-authz must be rigorous (covered `08`).
- **Performance:** D1 actions are the hot path; no cross-provider latency.
- **Ops:** single deploy surface.
- **Recommended:** B (port contract to D1).
- **Reason:** aligns with Cloudflare-first mandate and active write path.
- **Consequences:** Supabase governance migration becomes pure reference; governance logic maintained in `actions.ts` + authz.
- **Conditions changing decision:** owner re-approves Supabase as active runtime (not expected).

### `DEC-2` — Port the review enum + conflict-guard *contract*; do not call Supabase RPCs
- **Problem:** How to bring governance to D1.
- **Recommended:** native D1 columns + Server Actions + app-authz + optimistic `review_revision`, mirroring Supabase semantics.
- **Rejected:** `supabase.rpc(...)` calls — violates `DEC-1`; the existing test `component-library-cost-governance-actions.test.ts` will be updated to assert D1-native equivalents instead.

### `DEC-3` — Extend existing audit tables, do not create a parallel silo
- **Problem:** Where review events live.
- **Options:** (A) new `cost_library_cost_review_events` table; (B) extend `cost_library_item_state_history`.
- **Recommended:** B (extend) — reuse, single audit view, less schema.
- **Reason:** existing history already captures lifecycle transitions; review is a refinement.

### `DEC-4` — Stale propagation via computed-on-read (default)
- **Problem:** `source-changed` is read but never written (`G3`).
- **Options:** (A) materialized flag written on library update; (B) computed-on-read; (C) async queue materialization.
- **Recommended:** B (computed-on-read) as default; C (async) as optional P4 stretch if overview regresses.
- **Reason:** always honest, no write fan-out, no stale-flag drift.
- **Consequences:** estimate read does +1 compare per linked row (cheap); overview aggregation indexed.
- **Conditions changing:** if read p95 regresses >5%, add async materialization for overview counts only.

### `DEC-5` — Import = CSV first + JSON round-trip; Excel later; dry-run mandatory
- **Problem:** Import format priority (`OPEN-6`).
- **Recommended:** CSV first (lowest injection/parse risk), JSON for lossless round-trip, Excel deferred.
- **Reason:** CSV is the common supplier format; JSON proves round-trip parity; Excel adds binary-parse risk.

### `DEC-6` — Reuse existing trust model, chips, gate; extend inputs
- **Problem:** Avoid forking the trust model.
- **Recommended:** extend `source-trust-model.ts` inputs + chip variants; do not create a parallel trust model.
- **Reason:** existing model is well-tested and widely consumed.

## Assumptions (with validation status)

| ID | Assumption | Source strength | Validated? |
|---|---|---|---|
| ASSUMP-1 | D1 remains the active runtime for the foreseeable future | repo evidence (AGENTS.md) | yes |
| ASSUMP-2 | Better Auth identity supplies `userId`/role for `reviewed_by`/`assigned_to` | repo evidence | yes |
| ASSUMP-3 | Free-tier Cloudflare posture sufficient for closed beta | repo evidence | yes |
| ASSUMP-4 | Workspace owner/admin role = governance-admin (`OPEN-5` assumption) | derived | pending owner confirm |
| ASSUMP-5 | Mode A backfill (existing current → accepted) preserves current behavior | derived | pending owner confirm (`OPEN-1`) |
| ASSUMP-6 | Existing test asserting "no supabase.rpc" is intentionally updatable | repo evidence | yes (test exists) |
| ASSUMP-7 | `LIBRARY_COMPONENT_CAP=10_000` bounds per-workspace volume | repo evidence | yes |

## Open decisions (owner-required) — detailed

### `OPEN-1` — Seed/import authoritative cost data
- **Why external:** PROMPT.md forbids inventing authoritative cost data.
- **Options:** (a) owner names a source; (b) owner accepts "no seed, all user-entered"; (c) owner imports supplier CSV.
- **Recommendation:** (b) for closed beta; add (c) when owner has a CSV.
- **Impact if deferred:** review workflow has no real accepted costs to govern; still functional with user-entered data.

### `OPEN-2` — Currency/region model
- **Options:** (a) PHP-only; (b) record currency + region labels (no FX); (c) FX engine.
- **Recommendation:** (b) now; defer (c).
- **Impact:** blocks multi-region trust labeling; does not block PHP governance.

### `OPEN-3` — Confidence taxonomy
- **Options:** (a) free text; (b) enum + note.
- **Recommendation:** (b) enum + note; keep free-text fallback via regex chip copy.
- **Impact:** chip labels remain regex-derived if (a).

### `OPEN-4` — Stale-propagation mechanism
- **Resolved by `DEC-4`:** computed-on-read default. Listed for transparency.

### `OPEN-5` — Reviewer role boundary
- **Options:** (a) workspace admin only; (b) editor-with-admin-override; (c) platform admin only.
- **Recommendation:** (a) workspace admin (= Supabase parity), platform admin bypass.
- **Impact:** affects authz helper + denial tests; not architectural.

### `OPEN-6` — Import format priority
- **Resolved by `DEC-5`:** CSV first. Listed for transparency.

## Alternatives rejected (summary)

- Reactivate Supabase RPCs (violates `DEC-1`).
- Materialized `source-changed` default (write fan-out; `DEC-4`).
- Parallel review-event table (silo; `DEC-3`).
- New trust-model module (fork; `DEC-6`).
- Excel-first import (binary risk; `DEC-5`).
- FX engine (out of scope; `OPEN-2`).
- New design-system primitives (reuse; `05`).

## Owner-delegated planning decisions

None taken without owner input. All `OPEN-*` remain owner decisions; the plan proceeds under documented assumptions.
