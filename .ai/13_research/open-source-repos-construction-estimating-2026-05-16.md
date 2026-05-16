# Open-source repos to study for Archestimator

Date: 2026-05-16

Scope: GitHub open-source projects/libraries relevant to construction estimating, BOQ, quantity takeoff, spreadsheet estimate sheets, quote/invoice generation, and cost calculators. This is for product/implementation inspiration only; do not copy proprietary code or license-incompatible code into Archestimator.

## Construction estimating / BOQ / takeoff

- https://github.com/datadrivenconstruction/OpenConstructionERP — Open-source construction ERP covering BOQ, cost matching, CAD/BIM takeoff, catalogues and modules. Learn: end-to-end domain objects, BOQ workflow breadth, catalogue localization, ERP boundaries to avoid in Archestimator MVP. Check license carefully before reuse; use conceptually only unless compatible.
- https://github.com/ocni-dtu/boom — “Bill Of Open Materials”, quantity take-off app for Speckle. Learn: model-linked quantity extraction, grouping, material quantities from BIM/cloud models, lightweight takeoff UX. Apache-2.0.
- https://github.com/datadrivenconstruction/QuantityTakeoff-Python — Python quantity takeoff examples using element filters/grouping. Learn: QTO pipeline shape: collect elements, filter, group, summarize, export. GPL-3.0, so avoid code reuse in non-GPL product.
- https://github.com/datadrivenconstruction/QuantityTakeoff-JupyterNotebook — notebook version of quantity takeoff. Learn: estimator-friendly exploratory workflows and transparent calculations. GPL-3.0 caution.
- https://github.com/autodesk-platform-services/aps-acc-takeoff-cost — Autodesk Platform Services sample connecting Autodesk Takeoff quantities to a cost DB. Learn: integration pattern for external takeoff source + price table + budget calculation; useful if Archestimator later imports from Autodesk/ACC. MIT.
- https://github.com/simondilhas/qto_buccaneer — Quantity takeoff tools for BIM/data-savvy users. Learn: data import/export affordances, scriptable QTO ideas. MIT.
- https://github.com/SwanaWJ/pyrevit-CostEstimates.extension — pyRevit extension for Revit quantity takeoffs, item costs, BOQs and totals. Learn: Revit schedule/parameter mapping, model-to-BOQ UX, cost fields on model elements. MIT.
- https://github.com/jeremylongshore/cad-ai-agent — Drawing intelligence platform for DXF/PDF/DWG, compliance, QTO, drawing summaries. Learn: AI-assisted CAD workflow, non-destructive source-file handling, structured extraction boundaries. MIT, but verify maturity.
- https://github.com/muchirivictor/planvector — Floor-plan/PDF to SVG/DXF and quantity extraction concept. Learn: human-review checkpoint for AI takeoff trust, PDF/vector extraction positioning. No clear license found; do not reuse code.
- https://github.com/frameIQ/pygaeb — Python parser for GAEB DA XML construction data exchange files. Learn: import/export support for structured construction BOQ/item exchange, classification of line items. MIT. Relevant if supporting European BOQ workflows.

## Construction/project ERP systems with estimating-adjacent concepts

- https://github.com/frappe/erpnext — ERPNext includes accounting, projects, selling/buying, items, taxes and print formats. Learn: item master, UOM, taxes, estimate/quotation/invoice lifecycle, customizable doctypes, print templates. GPL-3.0; concept only unless license-compatible.
- https://github.com/Dolibarr/dolibarr — Business ERP/CRM with proposals, orders, invoices, products/services, projects. Learn: practical quote→order→invoice flow, line-item tax/discount handling, PDF generation, customer/project linking. GPL-3.0 or later; concept only.
- https://github.com/odoo/odoo — Broad business apps incl. sales, invoicing, projects, inventory. Learn: modular data model, quotation templates, pricelists, units, taxes, PDF reports. LGPL-3 core/community nuances; avoid copying.
- https://github.com/akaunting/akaunting — Accounting/invoicing app for small businesses. Learn: customer/vendor documents, invoice/estimate statuses, payment tracking, multi-currency/tax UI. License/commercial ecosystem should be checked before reuse.

## Invoice / quote / estimate generation apps

- https://github.com/InvoicePlane/InvoicePlane — Self-hosted invoices, quotes, clients, payments. Learn: simple document lifecycle, quote acceptance/conversion to invoice, item rows, taxes/discounts, PDF templates, client portal concepts. MIT.
- https://github.com/invoiceninja/invoiceninja — Mature invoicing/quotes/payments platform. Learn: document numbering, recurring invoices, PDF customization, client portal, tax/discount/multi-currency handling, API structure. AAL/license restrictions; study concepts, verify before reuse.
- https://github.com/crater-invoice/crater — Invoices, estimates, expenses, payments for small businesses. Learn: clean small-business estimate/invoice UX, Vue/Laravel-style data flows, status transitions. Check current maintenance/license before reuse.
- https://github.com/solidtime-io/solidtime — Time tracking and invoicing. Learn: time/cost-to-invoice bridge, project/client billing, simple report exports. Useful if Archestimator later adds labor tracking.
- https://github.com/firefly-iii/firefly-iii — Personal finance rather than estimating, but mature transaction/category reporting. Learn: auditability, import/export and financial reporting patterns. Less directly relevant.

## Spreadsheet/grid UX libraries for estimate sheets

- https://github.com/dream-num/univer — Open-source spreadsheet/document/presentation engine. Learn: Excel-like formula/grid architecture, collaborative sheet UX possibilities. Apache-2.0. Candidate for deep spreadsheet interface study.
- https://github.com/mengshukeji/Luckysheet — Web spreadsheet. Learn: spreadsheet UI, formulas, cell formatting, copy/paste, import/export; project status should be checked. MIT.
- https://github.com/jspreadsheet/ce — Jspreadsheet Community Edition. Learn: lightweight editable grid patterns, formulas/validation, tabular estimate entry. License is not permissive for all uses; verify.
- https://github.com/handsontable/handsontable — Data grid/spreadsheet component. Learn: high-quality spreadsheet interactions, fill handle, copy/paste, validation; commercial licensing may apply for many uses. Study UX, avoid code/license pitfalls.
- https://github.com/adazzle/react-data-grid — React data grid. Learn: performant editable grid, keyboard navigation, frozen columns, custom editors. MIT. Good candidate if using React.
- https://github.com/ag-grid/ag-grid — Feature-rich data grid. Learn: grouping, aggregation, pinned rows, Excel export patterns; community/commercial split, verify features/license.
- https://github.com/ether/ethercalc — Collaborative web spreadsheet. Learn: real-time collaboration model and formula persistence. Older codebase; study conceptually.

## PDF / Excel / document-generation libraries useful for Archestimator

- https://github.com/SheetJS/sheetjs — Spreadsheet file parsing/writing. Learn: XLSX import/export for estimate sheets, user cost libraries, BOQ exports. Apache-2.0 core; verify feature/licensing boundaries.
- https://github.com/exceljs/exceljs — Excel workbook generation/parsing in JS. Learn: styled XLSX estimate exports, formulas, sheets, totals. MIT.
- https://github.com/parallax/jsPDF — Browser/client PDF generation. Learn: quick quote/estimate PDF export. MIT.
- https://github.com/diegomura/react-pdf — React renderer for PDF. Learn: componentized branded quote/BOQ PDF templates. MIT.
- https://github.com/Hopding/pdf-lib — Create/modify PDFs in JS. Learn: filling templates, stamping, combining documents. MIT.
- https://github.com/foliojs/pdfkit — Programmatic PDF generation. Learn: server-side PDF reports and precise layout. MIT.

## Cost calculator / domain-specific inspiration

- https://github.com/Anu27n/layout — Office space calculator generating area calculations and BOQ. Learn: focused calculator-to-BOQ flow for fit-out/corporate interiors. No clear license; concept only.
- https://github.com/topics/construction-calculator and https://github.com/topics/quantity-takeoff — Topic pages worth periodically scanning; many small calculators are unlicensed or toy-quality, but useful for inputs/UX patterns.

## Main takeaways for Archestimator

1. Best MVP inspiration is not full ERP; combine a spreadsheet-like estimate grid with lightweight project/area/assembly structure and strong PDF/XLSX exports.
2. Treat external takeoff as importable quantities first. Full CAD/BIM/PDF takeoff is a later module; study Speckle/Revit/Autodesk samples for import contracts.
3. BOQ data model should support: project, version/revision, area/location, trade/category, item/description, quantity, UOM, unit cost, labor/material split, markup, tax, subtotal, notes/source.
4. Quote/invoice apps show robust document lifecycle patterns: draft/sent/accepted/rejected/revised/converted, numbering, client records, branded templates, payment/tax fields.
5. Spreadsheet/grid libraries are critical: keyboard-first editing, copy/paste from Excel, formulas, undo, bulk fill, pinned totals, import/export will likely matter more than fancy AI in v1.
6. Licensing matters: MIT/Apache libraries are easiest to reuse; GPL/AGPL/AAL/commercial or unlicensed repos should be treated as conceptual references only.
