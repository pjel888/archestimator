# BOQ Reference Extraction — Redacted

Security note (2026-06-15): this archived research note previously summarized identifiable data from raw construction bid/proposal spreadsheets. The extracted real project/client names, addresses, contact details, and bid/cost values were removed.

## Safe synthetic observations

The original research goal was to understand how proposal/BOQ workbooks encode information that the XLSX export flow should preserve. The following non-sensitive, synthetic observations are sufficient for that planning purpose:

- Workbooks may include project metadata near the top of one or more sheets: project name, location, client, prepared-for recipient, estimator, date, subject, and currency.
- Proposal sheets may contain a letter-like header before tabular BOQ rows.
- BOQ rows commonly include section, item number, description, unit, quantity, rate, and amount columns.
- Summary areas commonly include subtotal, contingency/markup/tax, and grand total rows.
- Export validation should verify layout, formulas, currency formatting, merged header cells, and printable proposal pages without relying on real customer data.

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
