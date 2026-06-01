# Archestimator Executive Summary

This folder contains the A4 executive summary artifact for Archestimator. It is
designed as a simple, text-led decision memo rather than a visual pitch sheet.

- `index.html` is the print-ready source.
- `Archestimator Executive Summary.pdf` is generated from the HTML.
- `assets/` contains local copies of the Archestimator logo used by the summary.

Primary sources used:

- `archestimator_pitch deck/Archestimator Deck.html`
- `archestimator_pitch deck/scratchpad.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/06_specs/brand/`
- `README.md`
- `DESIGN.md`

Regenerate the PDF:

```bash
node archestimator_executive_summary/generate-pdf.mjs
```
