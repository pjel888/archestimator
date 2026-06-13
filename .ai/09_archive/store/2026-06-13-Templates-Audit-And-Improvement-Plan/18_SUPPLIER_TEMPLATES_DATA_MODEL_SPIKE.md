# 18 — Supplier-Templates Data-Model Spike (U22)

**What this is:** The decision doc U22 calls for — **sequenced before U2's insert-RPC migration and U4's hardening** so the security-critical RPCs are not built on a workspace-equality assumption a later supplier phase must rip out ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U22, [10](10_STRATEGY_AND_SUCCESS_METRICS.md) §2b). **No code** — decisions only. Suppliers are **future / not near-roadmap** (the plan and the product memory both treat them as later), so this doc's job is to (a) make the workspace-equality assumption baked into U2/U4 **explicit and intentional**, and (b) pin the future supplier model so U2/U4 won't need a security-critical rewrite when suppliers land.

---

## 1. The constraints suppliers are blocked behind (verified)

| Layer | Constraint today | File |
|---|---|---|
| Data model | `estimate_templates.workspace_id` is `NOT NULL` FK → `workspaces` | `20260522091621_component_library_templates.sql:6` |
| RLS | all three template policies gate on `is_workspace_member(workspace_id)` — **no global-read path** | `…templates.sql:583-620` |
| Insert RPC | `insert_estimate_template_into_estimate` **hard-rejects** any template whose `source_workspace_id <> target_workspace_id` | `…templates.sql:250-252`; and the live RPC's `source_workspace_id = target_workspace_id` equality (`20260524033151`) |
| Cache key | `["workspace-component-library"]` (now `+["…","lite"]` after U18) is **not workspace-scoped** | `EstimateSheetContent.tsx` |
| Pricing freshness | supplier templates are *persisted* rows whose prices drift vs supplier reality — the **opposite** staleness problem from project read-through | `…templates.sql:41,543-544` (`source_snapshot` + price-date columns) |

---

## 2. Decision: the workspace-equality assumption is CORRECT for now — keep it explicit

**U2 and U4 deliberately assume `source_workspace_id = target_workspace_id`.** This is the right, safe assumption for the current product (custom + project-derived sources are all workspace-local). Building a cross-workspace copy exception now — with no supplier catalogue to test it against — would add an unproven privilege path to a security-critical RPC. **Do not add it speculatively.**

- **U2 (`insert_estimate_subtree_into_estimate_with_history`)** copies a project subtree within the same workspace; its check #4 asserts `source_workspace_id = target_workspace_id` (mirrors the template RPC). Keep it.
- **U4** (`assert_can_edit_estimate_for_history`) is orthogonal to source-workspace scope — it gates the **target** edit. Unaffected by suppliers. Keep it.

**Guardrail recorded:** the day suppliers ship, the cross-workspace copy exception is a **net-new, separately-reviewed RPC path** (see §3), not an edit that loosens U2's existing equality check. U2's equality check stays as the default-deny; suppliers get an explicit, narrow exception beside it.

---

## 3. The future supplier model (pin now, build later)

Recommended shape when suppliers become near-roadmap (borrowing the **versioned, read-only, licensed catalogue** pattern, distinct from user-authored editable rows — [10](10_STRATEGY_AND_SUCCESS_METRICS.md) §2b):

1. **Owning scope — licensed-per-workspace, not a nullable workspace.** Add a `supplier_templates` table (or a `template_class` discriminator + a `licensed_workspaces` join) rather than making `estimate_templates.workspace_id` nullable. A nullable/sentinel workspace would weaken every existing `is_workspace_member` policy; a separate table keeps the custom-template RLS untouched.
2. **RLS read/write split.** Read: `is_workspace_member(target) AND supplier_licensed_to(workspace, supplier)`. Write: admin/service-role only (suppliers are not user-authored). Never a global `using (true)`.
3. **Insert RPC exception (narrow, explicit).** A supplier insert is a **separate copy path** that asserts `supplier_licensed_to(target_workspace, source_supplier)` instead of `source_workspace_id = target_workspace_id`. It must still re-check target `can_edit_estimate` (the U4 gate) and stamp `sourceKind: 'supplier'` provenance. It does **not** relax U2's equality branch.
4. **Cache key — workspace-scope it when multi-tenant lands.** Key the library cache by workspace (`["workspace-component-library", workspaceId, …]`). No bug today (no workspace switcher), but a switcher + supplier licensing would otherwise serve the wrong workspace's library. The U18 lite sub-key composes cleanly: `["workspace-component-library", workspaceId, "lite"]`.
5. **Pricing provenance/freshness.** Supplier rows are persisted snapshots; define an "as-of" date + a re-pricing/attribution policy on the existing `source_snapshot` + price-date columns. Surface the as-of date in the UI (the inverse of the project read-through "Live source" chip).

---

## 4. Conclusion / action

- **No code in this pass.** U2/U4 proceed with the workspace-equality assumption, now explicitly justified.
- When suppliers reach the near roadmap, implement §3 as a **new** licensed-catalogue path; do not retrofit it into U2's equality check.
- Fold the §2 guardrail into `.ai/10_state/decisions.md` at closeout so the assumption is discoverable outside this (to-be-archived) plan folder.

## Truth & integrity
- **VERIFIED:** the five blocking constraints in §1 are cited from the live migration `20260522091621` and the live insert RPC; they match [10](10_STRATEGY_AND_SUCCESS_METRICS.md) §2b.
- **JUDGMENT:** §3 is a forward design recommendation for owner ratification, not a committed schema; §2 (keep the equality assumption) is the operative decision for U2/U4 in this implementation.
