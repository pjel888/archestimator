# BOQ Reference Extraction — Redacted

Security note (2026-06-15): this archived research note previously summarized identifiable data from raw construction bid/proposal spreadsheets. The extracted real project/client names, addresses, contact details, and bid/cost values were removed.

## Safe synthetic observations

The original research goal was to understand how proposal/BOQ workbooks encode information that the XLSX export flow should preserve. The following non-sensitive, synthetic observations are sufficient for that planning purpose:

- Workbooks may include project metadata near the top of one or more sheets: project name, location, client, prepared-for recipient, estimator, date, subject, and currency.
- Proposal sheets may contain a letter-like header before tabular BOQ rows.
- BOQ rows commonly include section, item number, description, unit, quantity, rate, and amount columns.
- Summary areas commonly include subtotal, contingency/markup/tax, and grand total rows.
- Export validation should verify layout, formulas, currency formatting, merged header cells, and printable proposal pages without relying on real customer data.

## Sanitized formula and convention summary

The sensitive workbook names, project identifiers, contacts, addresses, and monetary values are intentionally omitted. The non-sensitive conventions that downstream export work may rely on are:

- Detail rows use a stable column family: `ITEM`, `PARTICULARS`, `UNIT`, `QTY`, `MATERIAL`, `LABOR`, `COST TOTAL`, `LINE TOTAL`, and optional notes/scope.
- `COST TOTAL` is the combined unit rate. In spreadsheet terms it is equivalent to `MATERIAL + LABOR`.
- `LINE TOTAL` is the extended row amount. In spreadsheet terms it is equivalent to `QTY * COST TOTAL`, with excluded or owner-supplied scope values treated as zero where applicable.
- Section subtotal rows sum the `LINE TOTAL` cells in that section.
- Summary sheets commonly reference section subtotal cells from detail sheets, then compute `Direct Cost`, `Contingency`, `VAT`, and `Grand Total`.
- Common non-sensitive display conventions include hierarchical item numbering, per-section subtotal rows, a summary/abstract sheet, printable landscape layout, frozen headers, scope legends, signature/conforme blocks, and accounting-style currency formatting.

## Synthetic fixture pattern

Use fixtures that follow this pattern instead of raw customer files:

```text
Project: Example Project
Client: Example Client LLC
Location: Example City
Recipient: Example Recipient
Email: estimator@example.invalid
Phone: +1-555-0100
Total: 6545.00 USD
```

## Repository data policy

Raw BOQ/tender/proposal extracts with customer identifiers, addresses, personal contact details, or real bid/cost amounts must not be committed. If realistic coverage is needed, create reviewed synthetic data or store approved confidential samples outside Git in a controlled provider location.
