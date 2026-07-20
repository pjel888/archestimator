# Archestimator Executive Summary

This folder contains the A4 executive summary artifact for Archestimator. It is
designed as a simple, text-led decision memo rather than a visual pitch sheet.

- `index.html` is the print-ready source.
- `Archestimator Executive Summary.pdf` is generated from the HTML.
- `assets/` contains local copies of the Archestimator logo used by the summary.

Primary sources used:

- `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` — working startup narrative
- `README.md` — current source-grounded product summary
- `.ai/10_state/current-state.md` FAST PATH and `.ai/10_state/decisions.md`
- `.ai/06_specs/brand/`

The executive summary is an AEC-first, pre-launch document. It must not expand
Archestimator into a generic quoting product or imply that deferred AI,
procurement execution, immutable issued records, or legal-document automation
are current capabilities.
- `README.md`
- `DESIGN.md`

Regenerate the PDF:

```bash
node archestimator_executive_summary/generate-pdf.mjs
```
