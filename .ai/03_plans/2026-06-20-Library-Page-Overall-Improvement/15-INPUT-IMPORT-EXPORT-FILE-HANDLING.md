# 15 - Input, Import, Export, And File Handling

## Purpose

Quick Add and future catalog import/export must be designed around safe data
entry. Even if bulk import/export is deferred, the MVP should avoid choices that
make future file workflows unsafe.

## Field Validation

Component fields:

- name: required, trimmed, length-limited
- category: required or controlled fallback, workspace-scoped
- unit: required, controlled or normalized where possible
- unit cost: required, numeric, non-negative unless explicit credit/allowance
  behavior is later designed
- supplier/brand: optional, trimmed, length-limited
- pricing date: optional, valid date, not absurdly future-dated
- source confidence: controlled enum
- source URL: optional, valid URL scheme, length-limited, protected field

Text fields:

- trim leading/trailing whitespace
- reject or neutralize control characters
- preserve normal punctuation needed for construction names
- avoid rendering raw HTML

## CSV/Spreadsheet Formula Safety

Any future import/export path must protect against spreadsheet formula
injection.

Rules:

- escape or prefix exported cells that begin with formula-triggering characters
  when opened in spreadsheet tools
- validate imported text cells before saving
- never execute formulas from import files

## Import Workflow Contract

Bulk import is deferred, but future-safe design requires:

- preview before commit
- column mapping
- validation summary
- duplicate detection
- per-row error reporting
- rollback or partial-commit reporting
- private-field classification before import
- no mutation until user confirms preview

Imported rows should not become trusted/current automatically unless the import
source is verified and the user confirms source confidence.

## Export Workflow Contract

Future export must support:

- protected workspace export for authorized users
- public/client-safe export with private fields redacted
- clear indication of included/excluded fields
- rate/size limits
- audit/log entry for large exports when practical

Private by default:

- raw source URLs
- internal supplier notes
- confidence labels
- price history
- provider evidence attachments
- internal usage/link history

## File Upload Contract

If images, attachments, or import files are touched:

- validate file type by content and extension when possible
- enforce size limits
- scan or reject unsupported formats
- store files under workspace-scoped paths
- verify object ownership before read/delete
- strip or ignore unsafe metadata where practical
- show per-file error states
- do not leave orphaned files after failed mutation when avoidable

## Error Copy

Input/file errors should name the fix:

- "Enter a non-negative unit cost."
- "Use a valid https URL."
- "This file is too large."
- "This row is missing a unit."
- "This export excludes private source details."

Avoid generic invalid/error copy when the field and fix are known.

## Tests To Add When Implemented

- invalid source URL
- unsafe formula-like imported/exported text
- oversized file
- unsupported file type
- cross-workspace file ID
- import preview with valid and invalid rows
- public export redacts private fields
