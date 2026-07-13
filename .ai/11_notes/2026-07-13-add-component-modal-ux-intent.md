# Add Component Modal: UX Intent And Variant Interaction Model

Research date: 2026-07-13. This is a source-only UX reading of the supplied Open Design project, reference HTML, screenshot, and current worktree. No product code was changed.

## Intent

The modal is an **express component-creation flow with optional pricing depth**. A user should be able to create a library component by entering its identity, catalogue placement, and one base cost. Variants are progressive disclosure: only open the right-hand drawer when the user needs product-specific identity, pricing units/equivalencies, imagery, or supporting files. Orange communicates the selected/default/primary action state, not general decoration.

The source design is explicit that Express is the stable required path; cost stays in the main form until a variant exists, then the V1 detail owns it. [Open Design critique](file:///Users/philiplewis/Library/Application%20Support/Open%20Design/namespaces/release-stable/data/projects/48c33336-06b3-4b4a-be58-e0bb3014cbfc/critique.json)

## Field Order

1. **Header:** Add/Edit Component, close.
2. **Top tabs:** `Component` then `Activity`.
3. **Component tab, left media column:** square thumbnail preview, Choose image, `Use same image for all variants`, upload/status text.
4. **Component tab, main column:**
   - Component: **Name**, **Description**.
   - Catalogue: **Category**, **Supplier**, **Brand** (search/create controls).
   - Base Cost, only before variants: **Unit cost (PHP)**, **Unit**.
5. **Activity tab:** Component state, Effective date, read-only PHP currency, Change note, then a concise state/default-cost summary.
6. **Variant drawer, after a variant is selected:** thumbnail, **Variant Name**, **Variant Description**, **SKU / Reference**, then **Unit cost**, **Unit**, conditional equivalency (`1 <package unit> = <quantity> <content unit>`), and attachments.

The Open Design reference orders base Cost before Catalogue in its DOM, while the current shared worktree renders Catalogue before base Cost. The supplied screenshot corroborates the intended grouped sections and the variant-detail order, but shows the cost in V1 rather than the base form. Treat the design/reference order as the UX target and the source order as the current implementation observation.

## Alignment Grid

- Desktop modal: **793 px** wide; 45 px header, 32 px section tabs, 49 px footer; the core spacing unit is **8 px**.
- Component view: **260 px** square-media column + **533 px** fluid form column. The media and main form scroll independently.
- Main sections are quiet inset panels with 8 px padding and 10 px vertical gaps. In the reference grid, a section uses a `2fr : 1fr` field grid; the base-cost pair is `1fr : 0.5fr`.
- The variants drawer is **533 px** wide and attaches to the form’s right edge. Its 30 px outside rail holds manager, add, and `V#` affordances; a 16 px left inset aligns drawer content with the parent’s main form rhythm.
- Variant pricing is a three-part row: cost (widest), unit (narrow), then equivalency. At narrower widths the drawer becomes a bounded overlay (430 px maximum) and, at mobile width, both the form and drawer collapse to one column/full width.

## Variant State Model

| State | User action | Result |
| --- | --- | --- |
| `0 variants` | Open drawer | Manager shows the empty state and the plus affordance; base Cost remains in the main form. |
| `0 -> 1` | Add variant | Create **V1**, make it the sole default, hide the main base-cost section, open V1 editor. |
| `N -> N+1` | Add variant | Create `V{N+1}`, inherit the default variant’s unit, select/open the new editor. |
| variant selected | Use Default | Exactly that variant becomes default; the manager chip and button state update. |
| `N -> N-1` | Delete active variant | Remove its variant-only image and attachments; select the nearest surviving variant. If the deleted one was the sole default, first survivor becomes default. |
| `1 -> 0` | Delete V1 | Return to the manager’s empty state and restore the base-Cost surface. |

The reference prototype limits itself to two visible variant tabs, but current source maps an unbounded `draft.variants` collection to rail tabs and manager rows. Therefore the interaction model is not intrinsically two-variant-only.

## Cost Migration And Persistence Semantics

**Design intent.** Base cost is a temporary simple-mode representation. The reference’s zero-state copy says, “Use + to create V1. The base cost will move into the variant”; after V1 exists, pricing belongs to its drawer detail, including its unit and any construction-unit equivalency.

**Current source behavior.** New drafts begin with no variants. Editing base cost/unit calls `updatePrimaryVariant`, which creates V1 if none exists; adding a variant creates `V#` and carries forward only the default unit. The current conditional renders base Cost only when the variant list is empty. Thus base-cost input itself currently promotes V1, rather than waiting solely for the explicit Add-variant action. An image upload can also create V1. Deleting the last variant restores blank base fields rather than retaining a separately stored pre-variant cost. This is a notable implementation nuance against the explicit-migration phrasing in the design.

**Persistence contract.** Submission sends every variant as a `priceOption` and requires at least one variant with exactly one default. The selected default becomes the component’s denormalized `unit`, `unit_cost`, and `active_price_option_id`; each price option is also persisted with its own current cost entry. Reads resolve the row’s cost from the default option/current cost entry, not merely a possibly stale item column. Consequently, changing the default is a cost-selection operation for the component and estimate-sheet representation, not merely a visual badge.

## Source Evidence

- Open Design project artifact, updated 2026-06-25: [artifact metadata](file:///Users/philiplewis/Library/Application%20Support/Open%20Design/namespaces/release-stable/data/projects/48c33336-06b3-4b4a-be58-e0bb3014cbfc/add-component-modal.html.artifact.json), [reference markup and behavior](file:///Users/philiplewis/Library/Application%20Support/Open%20Design/namespaces/release-stable/data/projects/48c33336-06b3-4b4a-be58-e0bb3014cbfc/add-component-modal.html) (layout variables 55-80; field structure 1478-1906; variant transitions 2210-2380).
- Supplied screenshot: `/Users/philiplewis/.codex/attachments/31851009-516e-41e1-aa02-df9efbd6cd73/image-1.png` — confirms the desktop component-plus-V1-drawer composition.
- Current UI model: `src/components/workshop/component-library-manager/AddComponentModal.tsx` (draft initialization 428-567; primary/add/remove/default transitions 988-1061; payload 1084-1135; component grid 1551-1825; drawer 1925-2300).
- Current persistence/read semantics: `src/lib/component-library/actions.ts` (variant validation 637-667; create/write/default projection 1242-1391) and `src/lib/repositories/component-library-repository.ts` (price option/current-entry normalization 580-631; default-cost loading 1150-1179).

## Implementation Note

The current modal source is modified in this shared worktree. This note reports the visible source state only and deliberately makes no claim about whether those uncommitted changes are final.
