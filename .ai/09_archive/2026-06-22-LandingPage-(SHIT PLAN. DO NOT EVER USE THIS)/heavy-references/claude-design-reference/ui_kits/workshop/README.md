# Workshop UI kit — Estimate workspace

A faithful recreation of the live Archestimator estimate workspace, the heart of the product. Full-browser, document-like, dense.

`index.html` mounts `Workshop.jsx` and composes the design-system primitives inside the real product shell (`src/components/workshop/WorkshopPageShell.tsx`):

- **Floating glass nav rail** (64px) — orange clay logo slab + Phosphor nav icons, active pill in brand-orange (clay `#AA412A`) glass. Offset by the live `--sidebar-content-offset` (8 inset + 64 collapsed + 8 gap = 80px).
- **One liquid-glass workspace surface** — the live shell wraps the workspace bar, the estimate sheet, the library dock, and the budget bar in a **single frosted panel** (`.workshop-workspace-glass-surface`): one `backdrop-filter`, a warm chrome wash (`--workshop-shell-chrome-bg`), 12px radius, glass border + soft float shadow + inset top specular. The tree, centre sheet, and dock are **transparent chrome zones inside it**, divided only by hairlines — there is no longer a per-panel paper float.
  - **Project tree** (248px zone) — Group/Area hierarchy with the orange occupied-node glyph and the light-orange "Add" affordance.
  - **Centre work surface** — workspace bar (ES-001 · Lewis Residence · shared link · teamspaces · avatars), search, and the estimate sheet (Group → Area bars → rows table: Materials / Qty / Subtotal / Adjustment / Misc Cost / Total Item Cost). The sheet itself stays document-like (white paper rows on hairlines) so the data reads as a crisp document inside the frost.
  - **Right library dock** (380px zone) — Components / Templates tabs, the Default / Suppliers / Brand SegmentedControl, the component library tree with prices.
  - **Budget bar** — transparent glass-chrome footer (budget · health · ongoing cost · Ask Flip), Ask Flip rendered as a liquid-glass button with the clay accent glyph.
- **Chrome controls** use the `.liquid-btn` recipe (mirrors `.workshop-liquid-button`): translucent fill, bright top edge, soft shadow, **no child `backdrop-filter`** (the surface owns the one blur). `@supports not (backdrop-filter)` and `prefers-reduced-transparency` fall back to an opaque surface, matching globals.css.

Data is illustrative (Lewis Residence, ₱ peso). Surface treatment, density, color discipline (clay brand, never signal `#F24405` in chrome), and the single-glass-surface-over-grey-backdrop elevation match the live shell.
