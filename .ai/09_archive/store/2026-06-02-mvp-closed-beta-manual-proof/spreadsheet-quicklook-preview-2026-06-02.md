# Spreadsheet Quick Look Preview Evidence - 2026-06-02

Scope: local macOS Quick Look thumbnail render of the previously generated demo workbook.

Result: partial/local preview render passed; Excel, Numbers, LibreOffice, open/recalc, and print proof remain missing.

2026-06-04 security update: the raw workbook and generated Quick Look PNG were removed from the repository because rendered proposal previews can contain client-identifying estimate data. This note remains as historical process evidence only.

## Command

The original `qlmanage` command rendered the now-withdrawn workbook into the now-withdrawn preview folder under this proof packet.

## Output

The original command produced one thumbnail and exited successfully.

## Artifact

- Raw preview PNG: withdrawn from git on 2026-06-04.
- Historical `file` result before withdrawal: `PNG image data, 1200 x 892, 8-bit/color RGBA, non-interlaced`.

## Visual Check

The thumbnail showed the bid form header, project/location/date fields, general notes, item table header, section rows, and subtotal bands. Because that visual can reveal proposal details, it is no longer retained in the repository.

## Launch Meaning

This is historical fallback preview evidence and confirms macOS Quick Look rendered a thumbnail for the workbook before the raw preview was withdrawn. It does not prove Microsoft Excel, Apple Numbers, LibreOffice, formula recalculation, print preview, or secondary spreadsheet compatibility. The spreadsheet compatibility gate remains **NO-GO** until fresh authorized spreadsheet-app open/recalc/print screenshots or notes are archived without raw client data.
