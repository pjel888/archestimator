source visual truth path: /var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/codex-clipboard-212abbb3-3c33-469c-b4ee-1357bc1458a7.png
implementation screenshot path: unavailable - Codex app blocks direct Computer Use control of its in-app browser, and no browser screenshot tool was exposed in this thread.
viewport: source reference 1600x744 image; implementation target http://localhost:3000/ hero overlay.
state: landing hero image overlay after copying the /workshop dashboard card line grammar into the three frosted overlay blocks.

full-view comparison evidence:
- Source reference shows the workshop dashboard destination cards: frosted transparent cards with top-left numeric index, top-right arrow, a bordered count/ledger panel, a vertical count divider, row hairlines, and a bottom-right Doto uppercase title.
- Implementation source now renders three hero overlay cards with the same visible grammar: 01 Projects, 02 Components, and 03 Proposals; each has the frosted surface, index, arrow, count column, ledger header, ledger rows, and bottom-right display label.
- Fresh rendered screenshot comparison is blocked because the current Codex app session cannot control or capture its in-app browser.

focused region comparison evidence:
- Focused region should be the top-left hero image overlay on http://localhost:3000/ compared to the 01/02 card region in the supplied reference.
- This focused comparison is blocked by the same missing rendered screenshot capture path.

findings:
- [blocked] Fresh visual comparison unavailable.
  Location: landing hero overlay.
  Evidence: source code and static reference were inspected, but a current rendered screenshot could not be captured through the available tools.
  Impact: the implementation structure is present and type-valid, but exact pixel fidelity for spacing, crop, and text density still needs visual confirmation in the browser.
  Fix: refresh http://localhost:3000/ in the in-app browser and visually compare the hero overlay against the supplied /workshop reference; adjust spacing or font scale if the card density feels too heavy.

patches made since the previous QA pass:
- Replaced blank frosted hero overlay blocks with reusable HeroMetricCard markup.
- Added workshop-style index, arrow, count/ledger panel, vertical divider, row hairlines, and bottom-right display labels.
- Added CSS module rules for frosted card surfaces, Doto display titles, Roboto Mono numeric labels, responsive count columns, and a narrow-container fallback.

final result: blocked
