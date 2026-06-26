# 23 — Rollout and Rollback Plan

> Closes the audit-prompt gaps: "Release sequencing", "Feature flags and staged rollout", "Rollback and recovery procedures."
> Complements [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) (which defines *what* to build) by defining *how to ship and unship* each task safely.

## Rollout principles

1. **Phase 1 ships as one bundle, not six independent PRs.** The persistence-honesty fixes are mutually reinforcing (e.g., removing `createComponent()` helper depends on Edit being routed through the modal). Shipping them separately leaves the sidebar in mixed states.
2. **Feature flag: `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1`** gates the entire Phase 1 bundle. Default ON after merge; flippable OFF without redeploy via Vercel env var.
3. **Staged release**: local → preview branch → `main` → production. Between each stage, run the verification gates in [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md).
4. **No DB migration required for Phase 1.** The `executeBulkArchiveLibraryComponents` RPC and `cost_library_items.lifecycle_state` column already exist (used by the Components page). Phase 1 only changes wiring.

## Per-task rollout + rollback

### Task 1.1 — Delete wired to archive RPC

**Rollout**
1. Replace local-only `setLibraryItems(filter)` with `await executeBulkArchiveLibraryComponents({ itemIds, expectedPreviewHash })`.
2. On success: remove item from `libraryItems` optimistically; toast `"${name} archived."` with **Restore** action.
3. Restore: calls `changeCostLibraryComponentLifecycleState({ lifecycleState: "available" })`.
4. Stop calling `onLibraryDataChanged()` for local-only paths (it remains for the persisted archive path).
5. Single + bulk Delete share the same handler.

**Rollback**
- Flip `NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1=false`.
- Revert the wiring commit (`git revert <sha>`).
- DB state is preserved: archived items can be un-archived individually via the same RPC, or in bulk via a one-shot SQL: `UPDATE cost_library_items SET lifecycle_state='available' WHERE lifecycle_state='archived' AND updated_at >= '<phase-1-deploy-time>';` (run by Eng, scoped by workspace).
- **No data loss**: archive is reversible by design.

### Task 1.2 — Edit routed through AddComponentModal

**Rollout**
1. Add edit-mode to `AddComponentModal` (load existing component, save calls `updateCostLibraryComponent`).
2. Sidebar Edit context-menu / preview button opens modal in edit mode instead of legacy `NewComponentForm`.
3. All variant/price-option/attachment/cost-entry fields preserved (the modal already supports them for create).

**Rollback**
- Flip flag OFF; revert commit.
- No data migration: any edits made during Phase 1 are persisted (correct behavior).
- If a user reports a corrupted component from a botched edit, restore from `cost_library_item_versions` (version history table).

### Task 1.3 — Duplicate via server create

**Rollout**
1. Duplicate opens `AddComponentModal` pre-filled with source fields + `name + " (copy)"`.
2. User reviews and saves → `createCostLibraryComponent`.

**Rollback**
- Flip flag OFF; revert commit.
- Duplicates created during Phase 1 are legitimate rows; no cleanup needed. Users can delete extras via the Components page if unwanted.

### Task 1.4 — Snapshot semantics labels

**Rollout**
1. Replace "Live source" / "Read-through source" chips with `<Chip>Snapshot copy</Chip>` + `<Chip>Captured {relativeTime}</Chip>`.
2. Insert toast: `"Inserted a copy of {sourceName}. Changes to the source will not propagate."`

**Rollback**
- Flip flag OFF; revert commit. Pure UI change, no data implications.

### Task 1.5 — Remove "New Template Group" affordance

**Rollout**
1. Remove toolbar button.
2. Remove `customTemplateGroups` state field.
3. Remove `customTemplateCategories` from `TemplatesTreeModel` builders.

**Rollback**
- Flip flag OFF; revert commit. No data implications (state was always local-only).

### Task 1.6 — Search request-identity guard

**Rollout**
1. Add `latestSearchRequestIdRef = useRef(0)` to the sidebar.
2. In the search effect: `const myId = ++latestSearchRequestIdRef.current;` then on response: `if (myId !== latestSearchRequestIdRef.current) return;`.
3. Drop stale responses silently (no UI flicker because newer response already rendered).

**Rollback**
- Flip flag OFF; revert commit. Returns to current race-prone behavior (acceptable for short rollback window).

## Feature flag design

```
NEXT_PUBLIC_SIDEBAR_PERSISTENCE_HONESTY_V1 = "true" | "false"  (default: "true")
```

- **True**: Phase 1 wiring active.
- **False**: Phase 1 wiring bypassed; legacy behavior restored.
- The flag is read once at sidebar module load and cached. Toggling requires a hard refresh (acceptable for a pre-first-users product).
- The flag gates: Delete handler, Edit handler, Duplicate handler, chips render, "New Template Group" render, search effect.

Flag rationale: if Phase 1 ships a regression we cannot diagnose in real-time, flipping the flag is faster than reverting + redeploying.

## Staged release

### Stage 1 — Local verification (Eng)
- `bun run validate` green.
- `bun run test:dom` green, including the new integration tests in [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md).
- Manual: open estimate → delete → refresh → confirm archived. Edit → refresh → confirm persisted. Duplicate → refresh → confirm new row. Search rapid-fire → confirm latest wins.

### Stage 2 — Preview branch (Eng)
- Push to `feat/sidebar-persistence-honesty-v1`.
- Vercel preview deploy.
- Smoke-test on preview with a non-production workspace.
- Approval gate: Eng signs off in PR.

### Stage 3 — Main (Eng)
- PR review: at least one reviewer.
- CI green (`bun run validate` + `bun run build`).
- Squash-merge to `main`.

### Stage 4 — Production (Eng + Philip)
- Vercel auto-deploys `main`.
- Monitor: error rate, archive RPC failure rate, user reports (Intercom).
- Hold period: 48 hours. If no regression, close the rollout. If regression, flip flag and diagnose.

## Rollback decision matrix

| Signal | Action |
|---|---|
| Archive RPC error rate > 5% on dashboard | Flip flag OFF; diagnose |
| User report: "I deleted a component and it's still there" (post-fix) | Diagnose (this is correct behavior — archived, not deleted); clarify copy |
| User report: "I edited a component and lost variants" | Flip flag OFF; investigate `updateCostLibraryComponent` field preservation |
| Search returns blank unexpectedly | Diagnose (likely unrelated); flip flag OFF if correlated with deploy |
| Build/lint failures post-merge | Revert merge commit; redeploy |

## Rollout timeline

| Day | Activity | Owner |
|---|---|---|
| T0 | Begin Phase 1 implementation | Eng |
| T0+5d | Local + preview verification | Eng |
| T0+7d | PR review + merge | Eng + Reviewer |
| T0+8d | Production deploy | Eng |
| T0+10d | Hold-period checkpoint 1 | Eng + Philip |
| T0+14d | Hold-period closeout; begin Phase 2 | Eng + Philip |

## Communication

- Pre-deploy: post in #engineering with the Phase 1 scope + flag name + rollback path.
- Post-deploy: post in #product with the user-visible changes (more honest persistence, accurate labels).
- Rollback: post in #engineering with the signal that triggered rollback + the flag flip.

## Out of scope for this plan

- Phase 2 (terminology + UX corrections) — separate rollout plan when Phase 2 begins.
- Phase 3 (accessibility + performance) — gated by F-13 extraction in `.ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md`.
- Phase 4 (mobile/tablet drawer) — XL complexity, not scheduled.
