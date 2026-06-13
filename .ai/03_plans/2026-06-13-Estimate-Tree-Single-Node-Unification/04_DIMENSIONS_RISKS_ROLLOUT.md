# 04 — Dimensions, Risks & Rollout

Every dimension that matters for a change this size, with the adversarial findings baked in as concrete risks.

---

## Dimension sweep

### 1. Database & schema
- One relax-only migration (both `estimate_nodes` + `estimate_template_nodes`); enum frozen; `kind` kept vestigial; zero data movement; transactional integrity gate. **Forward-only** (no clean rollback once a real mixed node exists). Verify: dry-run on branch, restore-drill the dump, post-apply integrity check. Risk: **medium** (the irreversibility), mitigated by isolating it (P5 value-less) from the first write (P6).

### 2. Performance
- Removing `kind='area'` filters from triggers/RPCs is a tiny win. Rendering a mixed node issues children + rows (already indexed). Negligible either way. Verify: no new N+1 in render/aggregate. Risk: **negligible.**

### 3. Codebase / maintainability
- Net reduction (~14 deletions; the wrap path gone). `kind` becomes a non-semantic label. Verify: no orphaned references to deleted helpers (the `getEstimateNodeDisplayKind` build-breakers in `activity-history.tsx`/`node-visuals.tsx` — P4). Risk: **low**; main cost is brittle-test churn (handled P0).

### 4. UX/UI (incl. the middle estimate sheet)
- The sheet is already a recursive renderer that puts rows + children in every node; unification mostly opens gates. The genuinely new surface is the **mixed-content node** (rows-first, one icon, unified empty state). Verify: the V3 conditions (sticky cascade, own-rows distinction). Risk: **medium** on layout polish, **low** on plumbing.

### 5. Product / domain
- Removes the section/item discipline that maps to BOQ output — accepted trade for simplicity (owner decision). "Area" keeps domain familiarity. Risk: **low–medium** (messier trees possible; acceptable for beta).

### 6. Onboarding & education
- The group-vs-area tour step is **deleted** (the model's confusion source). One "Add Area" concept. Coordinate copy with the [onboarding plan](../2026-06-03-react-joyride-onboarding-implementation-plan/). Risk: **low** (net simplification).

### 7. Naming / IA
- One name ("Area"); ~40 strings unified; "Group"/"Node" removed. Risk: **low**; partial application is the failure mode — do the vocabulary in one pass (P4).

### 8. Accessibility (WCAG 2.1 AA)
- **Strictly simpler:** one icon (removes an icon-only type distinction), one Add button (removes a state-dependent disabled/error path), one empty state. Verify: single Add `aria-label`; `aria-current` preserved; caret is the (shape-based, color-blind-safe) container signal; removed "select a group first" live-region message; reduced-motion unaffected (the wrap animation is gone). Risk: **low** (net reduction).

### 9. Testing & QA
- Breaks (by design, inverted): `estimate-tree-data` (nesting asserts flip), `estimate-tree-modal` (one Add, no block), `estimate-template-drop-zones` (wrap tests **deleted**), `estimate-tree-reorder` (`:142/:155` now succeed), `estimate-tree-context-menu` (`:355-357` invert), `estimate-sheet-library-insert` (target labels). Brittle: `live-estimate-node-route` (138 source-string asserts) + `supabase-performance-migrations` (assert two-kind in migration text) — **neutralized P0**, final assertions P5. New: mixed-content, rows-at-any-depth export/share/total/snapshot parity, single-Add, migration integrity, **cycle+cross-tab regression**. Risk: **medium churn**, fully mapped; the oracle is the regression spine.

### 10. Telemetry / measurement
- `estimate_sheet_events` (free-form `event_type`) is kind-agnostic and survives; measure **time-to-first-row** and the dead-group signal. Vercel analytics redacts `/workshop` (confirmed) — tree telemetry must come from events. Risk: **low**; no schema change forced.

### 11. Rollout / beta
- Closed-beta allowlist; **no runtime feature-flag infra** for non-AI (and a flag can't gate a `validate_*` trigger anyway). Forward-only migration; PITR off ⇒ **manual logical dump is the only rollback**; brief maintenance window acceptable. Verify: branch dry-run + restore drill + blocking integrity pre-flight (P5). Risk: **medium**, structurally mitigated by the P5/P6 split.

### 12. Downstream consistency (share, export, charts, snapshots, collaboration)
- The hazard *is* downstream: share/export/charts must be kind-agnostic **before** writes (P1–P2). Snapshot v2 stack dormant — untouched. Collaboration uses cache invalidation — unaffected. Verify: the oracle covers all five totals surfaces. Risk: **high if mis-sequenced** → the entire route exists to neutralize it.

### 13. Security / RLS
- Kind invisible to RLS; relaxed RPCs replay `SECURITY DEFINER` grants exactly. Verify: revoke-anon/grant-authenticated on every `create or replace`d function; staged security scan. Risk: **low** if the grant pattern is copied exactly.

### 14. Copy / i18n
- English-only, inline strings; ~40 unified in P4. Risk: **low.**

### 15. Design system
- Reuse `EmptyState`/`Modal`/`Toast`/`TreePanelHeader`; 3px radius, ≤12px type, Phosphor icons, no orange. Risk: **low.**

### 16. Migrations / data integrity
- Zero backfill; existing data valid under the relaxed rules; the integrity assertion block proves it transactionally. Risk: **low** on data, **medium** on irreversibility (dimension 1).

### 17. Documentation / decisions
- Author the new decisions (below); supersede the 2026-05-20 two-kind entry; align the onboarding plan. Risk: **low**; omission would mislead future readers.

### 18. Collaboration / multi-user
- Same cache-invalidation path as today. Risk: **low.**

### 19. Error handling / rollback
- The route's defining property. The two **throw** paths (V4) are fixed before writes; rollback posture is explicit per phase; mid-P6-rollback loses no data (reads already kind-agnostic). Risk: **low** given the sequencing.

### 20. Mobile / touch & power-user
- One Add button + context menu must be touch-reachable; the single-Add flow must stay fast for rapid adds. Risk: **low.**

---

## Risks & mitigations (the adversarial findings)

| Risk | Severity | Source | Mitigation |
|---|---|---|---|
| Live **public share** drops rows + understates client totals on mixed nodes | **High** | V1 | Fix `reconstruct-share-tree.ts:297` + render gates **first, standalone** (P1), monotonic, oracle-verified |
| Chart rewrite **double-counts**; export consolidation **merges container+leaf rows** | High | V2 | leaf-or-has-rows detection; header carries direct-only counts; consolidation key includes provenance (P2) |
| Activity-scope `includeDescendants` time-varying → **cache key corruption** | High | V3 B2 | Make it a **stored stable choice** while trees are all-area (P3) — cannot retrofit |
| Two **throw** paths crash on row-drag / error on validate | High | V4 | `estimate-mutations.ts:12` + `estimate-tree-data.ts:409` fixed in P3 |
| Build-breakers (deleted helper still imported) | Medium | V4 | Update `activity-history.tsx`/`node-visuals.tsx` in P4 |
| `save-as-template` hits stricter template triggers | Medium | V4 | Template DB + UI relax **in the same migration** (P5/R7) |
| Forward-only migration; PITR off | Medium | research 01/06 | P5/P6 split; fresh pre-migration dump; branch dry-run; blocking integrity pre-flight |
| Preserved cycle/cross-tab checks share a body with removed ones | Medium | research 06 | Explicit regression tests (P5) before editing the validators |
| Brittle 138-assert source-string test churns every phase | Medium | research 06 | Neutralize once in P0; oracle is the real regression spine |
| Sticky header collision on deep mixed nodes | Medium | V3 B3 | Sticky-offset cascade (P4) |
| Own-rows mistaken for first child's rows | Low–Med | V3 C1 | Distinct "own items" affordance (P4) |
| "Area" reads oddly for trade/phase-organized trees | Low | research 05 | Owner picks "Section" instead if applicable (open Q-1) |

---

## Open questions

| Q | Question | Recommendation | Blocks |
|---|---|---|---|
| **Q-1** | Node name: "Area" or "Section"? | "Area" (unless trees are trade/phase-organized) | P4 |
| **Q-2** | Mixed-node row order: rows-first or children-first? | rows-first | P4 |
| **Q-3** | Maintenance-window timing for P5/P6? | low-traffic window; cohort is small | P5 |
| **Q-4** | Keep `kind` column vestigial, or schedule the drop? | keep vestigial; defer drop to a later optional migration | P7 |

Execution-time unknowns (exact final SQL after touching real code, precise optimistic-cache shapes, final helper names) are intentionally deferred to implementation.

---

## Decisions to author (in [`.ai/10_state/decisions.md`](../../10_state/decisions.md))

1. **Single node type.** `estimate_nodes` (and `estimate_template_nodes`) collapse to one node type; any node holds children and row items. Supersedes the 2026-05-20 two-kind decision. `kind` retained as a vestigial label.
2. **Reads-first, migration-late sequencing.** Read paths go kind-agnostic before the relax-only migration; writes enabled last; the irreversible step is isolated and value-less; golden-master oracle is the proof mechanism.
3. **Forward-only migration posture.** PITR off → fresh pre-migration logical dump is the rollback artifact; blocking prod integrity pre-flight; Supabase-branch dry-run.
4. **Vocabulary → "Area"** (display-only; internal `kind` unchanged). Onboarding group-vs-area step deleted.
5. **Template tree unifies in lockstep** with the estimate tree in the same migration + release.

---

## Consolidated verification checklist (gate before each irreversible step)

**Proof spine**
- [ ] Golden-master oracle established (P0); every read phase reproduces it byte-for-byte on all-area data.
- [ ] Synthetic mixed-content fixtures prove rows survive in share, export, charts, totals, activity.

**Data-safety (the window never opens)**
- [ ] P1–P3 land **before** the migration; each verified as a prod no-op.
- [ ] `reconstruct-share-tree.ts:297` + share render gates fixed and isolated (P1).
- [ ] export/charts/workshop reads kind-agnostic, no double-count, no cross-provenance merge (P2).
- [ ] both throw paths fixed; `includeDescendants` stored-stable; cache key stable across child-add (P3).

**Irreversible step (P5/P6)**
- [ ] Blocking integrity pre-flight returns 0 mixed nodes (both tables).
- [ ] Migration dry-run + dump restore-drill green on the Supabase branch.
- [ ] Fresh logical dump taken against frozen writes immediately pre-apply.
- [ ] Template DB + editor UI relaxed in the **same** release.
- [ ] Post-apply integrity assertion block passes; row counts unchanged; orphan scan clean.
- [ ] Cycle + cross-tab regression tests pass on the rewritten validators.
- [ ] Write flow (P6) is a **separate** PR from the migration (P5).

**Invariants (I1–I7)**
- [ ] Cycle, cross-tab, missing-parent still rejected after the validator rewrite.
- [ ] All create/rename/move still go through `_with_history` RPCs.
- [ ] `SECURITY DEFINER` grants replayed exactly; security scan clean.
- [ ] No sixth totals path introduced; the five surfaces agree (note: snapshot RPC's pre-existing contingency gap is tracked, not folded in).

**Cross-cutting**
- [ ] a11y: single Add `aria-label`, one icon, `aria-current`, empty state announced once, no stale "select a group first" message.
- [ ] Vocabulary applied across estimate tree **and** template editor; no "Group"/"Node" in rendered copy.
- [ ] Telemetry: time-to-first-row query validated; `/workshop` Vercel redaction confirmed.
- [ ] design-lint: 3px radius, ≤12px type, Phosphor icons, no orange.

**Process (I-gate)**
- [ ] `bun run validate` green at every phase.
- [ ] Gated e2e smokes (`ARCHESTIMATOR_E2E_*`, dev-auth) pass.
- [ ] `decisions.md` updated.
- [ ] No provider/production claims from local-only checks.
