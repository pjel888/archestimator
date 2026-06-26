# 13 — Rollout, Rollback, And Operations

## Rollout

Archestimator is still pre-first-user, so this can ship as one application change after the additive migration is verified locally. The implementation phases remain useful checkpoints:

1. Phase 1 deploy: additive DB objects and generated/selectors updated; no visual behavior change.
2. Phases 2-3: persistence contract, strict parser, and row math tests pass.
3. Phases 4-5: per-row UI, Contingency cell, and chip editor live.
4. Phase 6: totals-area Adjustment row live.
5. Phase 7: export, collaboration event, and regression evidence complete.

Optional feature flag: `NEXT_PUBLIC_QTY_EXPRESSION_ENABLED`. Default can remain `true` for the first implementation, but the flag is useful if UI bugs appear after deploy.

## Pre-Deploy Checklist

- [ ] Migration applies locally and is additive only.
- [ ] Existing rows keep `quantity_base IS NULL` and `quantity_contingency_amount IS NULL`.
- [ ] `estimate_sheet_adjustments` table exists with `UNIQUE(estimate_id)` and RLS.
- [ ] `update_estimate_row_item_with_history` persists new fields and history snapshots.
- [ ] Generated Supabase types, repository selectors, route context selectors, and mutation payloads include new fields.
- [ ] Parser unit tests cover S1-S12 invalid and valid syntax.
- [ ] Server/action tests reject invalid numeric payloads and unauthorized users.
- [ ] Export tests prove legacy/new row math and no double-counting.
- [ ] Broadcast tests validate row-update event safety.
- [ ] `bun run type-check`, `bun run lint`, and `bun run build` pass.
- [ ] Manual QA scenarios S1-S12 complete after implementation.

## Post-Deploy Verification

- [ ] Legacy estimates load unchanged.
- [ ] New QTY expression workflow works end-to-end.
- [ ] Chip edit `100+20 -> base 150` yields `170`, `150+20`, and `13%`.
- [ ] Totals-area Adjustment saves, reloads, and exports once.
- [ ] Viewer/non-member adjustment writes are blocked.
- [ ] Two-client row-update display remains consistent after server refetch.
- [ ] No Sentry errors in estimate sheet flow.

## Deployment Order

1. Apply additive migration to Archestimator Supabase project `ebxxqidacheyapmmzavr`.
2. Regenerate DB types.
3. Deploy application code.
4. Run smoke tests S1, S2, S4, S7, S8, and S9.
5. Monitor row mutation failures, parser rejection rate, and estimate sheet JS errors.

## Rollback And Recovery

Default recovery is non-destructive:

| Scenario | Action |
|---|---|
| Migration fails before app deploy | Fix migration locally and re-apply; no app rollback needed |
| Parser/UI bug after deploy | Disable feature flag or revert app code; leave additive columns/table in place |
| Server validation too strict | Fix forward in action/parser tests; preserve DB objects |
| Export double-counting found | Disable affected export path if needed; fix forward and re-run export tests |
| Realtime mismatch | Disable row-update broadcast; rely on server refetch while fixing |
| Data corruption | Stop writes, take logical backup, inspect affected rows, then choose fold-forward repair SQL |

Do not drop columns or the adjustment table as a routine rollback. Destructive cleanup requires a fresh backup, confirmed corruption scope, and explicit owner approval. The migration should not rely on `supabase migration repair` as a rollback mechanism.

### Disaster-Only Data Repair Sketch

Use only in a disposable local test or after explicit approval for production:

```sql
-- Optional fold-forward repair for quantity-mode rows.
UPDATE public.estimate_row_items
SET quantity = quantity_base + COALESCE(quantity_contingency_amount, 0)
WHERE quantity_base IS NOT NULL;
```

After repair, code can either keep columns for future use or a separately approved cleanup migration can remove unused additive objects.

## Monitoring

| Metric | Threshold | Response |
|---|---|---|
| Estimate sheet JS error rate | >5% of sessions | Disable flag or revert UI code |
| Row update mutation failure rate | >2% of mutations | Inspect server validation and RPC payloads |
| `updateEstimateRowItem` latency p95 | >500ms | Profile RPC/action path |
| Parser validation rejection rate | >10% of QTY edits | Review UX copy and parser edge cases |
| Adjustment save failure rate | >2% of attempts | Check RLS/action auth and table upsert |
| Export mismatch reports | Any confirmed mismatch | Block affected export flow until fixed |

## Support

### In-App Guidance

- QTY placeholder: `100 or 100+20`.
- Contingency tooltip on chip rows: `Calculated from the QTY add-on. Edit the chip to change it.`
- Contingency tooltip on plain rows: `Enter a percentage to create an extra QTY allowance.`
- Totals-area Adjustment tooltip: `Percentage applied to direct cost for project-level contingency or discount.`

### FAQ Entries

| Question | Answer |
|---|---|
| How do I add contingency to a row? | Type `100+20` in QTY. The row uses `120` as the quantity, shows a chip for `100+20`, and displays the derived Contingency percentage. |
| What happens if I edit the base in the chip? | The extra amount stays fixed. `100+20` changed to base `150` becomes `150+20`, total `170`, about `13%`. |
| Can I still type a percentage? | Yes on a plain row with no chip. Once the row has a QTY chip, edit the chip because the percentage is derived. |
| What happened to the old Adjustment column? | It is now per-row Contingency and is quantity-based for new/converted rows. Legacy rows remain unchanged until edited. |
| Where did discount go? | Per-row discount is removed for new/converted rows. Use the totals-area Adjustment discount mode for project-level discounts. |
| Will existing estimates break? | No. Existing rows with `quantityBase = NULL` stay in legacy mode and preserve old subtotal-adjustment behavior. |
| What if I type something invalid? | The cell shows an inline error and does not commit. Use explicit forms like `100+20`; `+20` is invalid, use `0+20` if the base is intentionally zero. |

## Known Limitations

- The surplus row is not part of this implementation. The Adjustment row ships in the totals area and can be moved below a future surplus row later.
- Per-node adjustment rates are deferred. The first implementation stores one adjustment per estimate.
- Concurrent row edits remain last-write-wins with optimistic rollback and server refetch, consistent with existing row edits.
- Browser visual proof is required during implementation because chip focus, touch behavior, and totals layout are interaction-sensitive.
