# Mockups

Four high-fidelity static HTML mockups (1440×900), built with the workshop design tokens (SF Pro stack, 10–12px type, 3px radius, hairline `#F2F2F2`, ink `#292929`). Open the `.html` files in any browser, or view the rendered PNGs in `screenshots/`.

| File | Screen | What to look at |
|---|---|---|
| `00-library-home.html` | `/workshop/library` — Overview home (default landing) | Three-tab strip (Overview active), cross-library search + creates, recent component cards, recent template rows, library health line (stale prices / discontinued-in-use / missing brands) with deep links |
| `01-components-tab.html` | `/workshop/library/components` — Components tab | Left category tree with view-mode picker; ONE header row owning all sheet controls (search shown OPEN as the estimate-page disclosure dropping over content, wired filter, neutral `Add component`); lifecycle badge on a card; selected card driving the NEW right detail-inspector dock (price history, confidence pill, used-in counts) |
| `02-templates-browse.html` | `/workshop/library/templates` | Templates tab active, left tree with ₱ totals per group/template, gallery rows with real actions (`Open`, `Insert into estimate ▾`, kebab), singular-correct counts, right template-preview dock |
| `03-template-editor.html` | `/workshop/library/templates/[id]` | Breadcrumb + TEMPLATE mode chip, back-strip + structure tree left, estimate-style editable grid with an active drop zone, right Components dock with a dragging leaf and bulk `Add to template`, footer `Template total` + re-pricing caption |

Regenerate screenshots:

```bash
cd <repo root>
DIR=".ai/03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates/mockups"
for f in 00-library-home 01-components-tab 02-templates-browse 03-template-editor; do
  npx playwright screenshot --viewport-size=1440,900 "file://$PWD/$DIR/$f.html" "$DIR/screenshots/$f.png"
done
```

Notes:
- The dark global rail + orange logo block stand in for the existing `MainSidebar`; it is out of scope and unchanged.
- Data is the real seed/workspace content where known (Powder Room Basic ₱61,150.00, Condo Fit-Out Starter ₱71,883.00, Roof Deck Lounge ₱97,400.00, the 9 component roots); component cards use representative PH-market fixtures.
- These are direction artifacts, not pixel specs — `03_SCREEN_SPECS.md` is the implementation contract.
