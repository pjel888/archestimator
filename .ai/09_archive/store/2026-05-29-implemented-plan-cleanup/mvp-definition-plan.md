# MVP Definition Plan

**Date:** 2026-05-16
**Status:** Proposed next planning sequence

## Goal

Define a focused Archestimator MVP that helps contractors produce construction cost estimates quickly and handle design changes without rebuilding estimates from scratch.

## Non-goals for MVP definition

- Do not select final tech stack yet.
- Do not design every future module.
- Do not build supplier bidding, project scheduling, FF&E, or full takeoff before validating the estimating wedge.

## Proposed MVP cutline

### Must have

1. Project list/dashboard
2. Project creation
3. Estimate creation from blank/template
4. Spreadsheet-like estimate sheet
5. Sections/areas/trades
6. Line item calculations: quantity × unit cost = subtotal
7. Markup/contingency/totals
8. Simple material/cost library
9. Estimate duplication/versioning
10. Revision delta view
11. Export/share to PDF/Excel or printable quote

### Should have

1. Quick calculators that output line items
2. Contractor branding on proposal
3. Assumption/confidence notes per line item
4. Import from previous project/template
5. CSV/Excel import/export

### Later

1. Supplier RFQ/bidding
2. Client approval portal
3. AI from drawing/PDF
4. Full digital takeoff
5. Multi-user permissions
6. Accounting integrations
7. Mobile site-visit mode
8. Local supplier marketplace

## Product risks to resolve

- How much detail contractors expect in a first estimate
- Whether they prefer trade sections, area sections, or CSI-like categories
- Whether Philippine/local pricing data can be trusted or should be fully user-controlled first
- How to make AI useful without hiding assumptions
- Whether contractors will switch from Excel if export/import is not strong

## Discovery questions for Philip / users

1. What exact estimate do contractors need fastest: rough budget, detailed BOQ, client proposal, supplier RFQ, or change order?
2. What project type should v1 target: residential, fit-out, small commercial, renovations, or all small projects?
3. What is the typical estimate format contractors already send?
4. What does a design change look like in practice: new drawing, revised scope note, client chat, supplier change, site condition?
5. What output would make a contractor immediately trust the product?
6. What should be editable before sending to a client?
7. What is the acceptable error/uncertainty range for a quick estimate?

## Definition of done for Phase 0

- Product thesis accepted or revised
- MVP cutline accepted or revised
- Initial data model drafted
- First UX flow drafted
- Source/pricing policy drafted
- Competitor assumptions validated enough for first prototype
