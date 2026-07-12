# UX-034 Issue Definition

**Issue ID:** UX-034
**Severity:** Medium
**Area:** Library attachments
**Persona:** Owner, reviewer, estimator
**Implementation Unit:** IU-17
**Priority:** P1

## Problem Statement

Component attachment/spec-sheet upload exists without explicit approval, version, or validation lifecycle. The attachment APIs and version primitives exist, but there is no workflow to:

1. Validate uploaded attachments
2. Track attachment versions
3. Approve or reject attachments
4. Tie attachments to specific component variants or cost entries
5. Keep old revisions auditable

## Current Behavior

- `src/app/api/component-library/attachments/route.ts` line 129: `POST` handler uploads files to `component-attachments` bucket
- `src/app/api/component-library/attachments/route.ts` line 14: `MAX_UPLOAD_BYTES = 20 * 1024 * 1024`
- `src/app/api/component-library/attachments/route.ts` lines 15-19: Allowed MIME types: PDF, XLS, XLSX
- `src/app/api/component-library/attachments/route.ts` lines 46-77: Magic-mime validation for PDF and Excel
- `src/app/api/component-library/attachments/route.ts` line 179: `DELETE` handler checks `is_current_approved` before allowing removal
- `src/app/api/component-library/attachments/route.ts` line 188: Selects `review_status` and `is_current_approved` from `cost_library_item_variant_attachments`
- `src/lib/component-library/actions.ts` line 108: `ComponentVariantAttachmentInput` has `id`, `bucket`, `path`, `fileName`, `contentType`, `sizeBytes`, `kind`, `metadata`
- No `review_status` field in client-side types
- No approval UI in `AddComponentModal` or component manager

## Expected Behavior (Post-Fix)

Reviewer approves the correct spec-sheet revision for a component variant and old files remain auditable. Current approved attachment is clear and older revisions are not lost.

## Canonical Feature Status Row

| Row ID | Feature | Current Status |
|---|---|---|
| LIB-007 | Attachment and spec-sheet version approval | Underrepresented / partially supported by data fields |

## Decision Gate

`DEC-UX-034-ATTACHMENT-APPROVAL`: Accepted as lightweight first step. Add reviewed/current metadata before approve/reject lifecycle.

## Stop Conditions

- Do not build a full approval workflow UI in the first pass.
- Add `reviewed_by`, `reviewed_at`, `review_note`, `is_current_approved` metadata first.
- Do not modify the upload API's core file handling.
- Do not change allowed file types or size limits without explicit approval.

## User Story

As an owner/reviewer, I can version, validate, approve, or reject component attachments/spec sheets per variant so that estimators trust the spec sheets they reference.

## Personas

- **Primary:** Owner or reviewer (workspace admin) — validates, approves, rejects attachments
- **Secondary:** Estimator — sees approved attachments and knows old revisions exist
- **Uploader:** Any workspace editor — uploads attachments for review

## Priority Justification

P1 (Medium): Spec-sheet trust and revision context are missing. Without approval, estimators may reference unvalidated or outdated spec sheets, leading to wrong assumptions in estimates.

## Evidence Sources

- `canonical-feature-status.csv` line 83: LIB-007
- `post-fix-scenario-tests.md` line 52: UX-034 test scenario
- `05-security-data-and-provider-blast-radius.md` line 102: Blast-radius checklist

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reviewer does not approve attachments | Medium | Medium | Show upload status; require approval before "current" |
| Old revisions lost | Low | High | Supersede mechanism keeps old rows with audit trail |
| Storage quota exceeded | Medium | Medium | 20MB limit enforced; review before large uploads |
| Wrong file type uploaded | Low | Medium | Magic-mime validation already in place |

## Dependencies

- `supabase/migrations/20260622143000_library_trust_governance.sql` must be applied
- `src/app/api/component-library/attachments/route.ts` must remain stable
- Storage bucket `component-attachments` must exist and be accessible

## Historical Context

This issue was identified during the second-pass UX audit (2026-06-22). The first pass had attachment upload as a data primitive but no governance workflow. The second pass added persona-level stories for owner/reviewer, revealing the gap between file storage and operational trust.

## Notes for Implementers

- The schema is already migrated. Do not write a new migration.
- The RPCs are already deployed. Do not modify them unless a bug is found.
- Focus on UI surfaces and server action wrappers.
- Keep changes scoped to library surfaces only.

## Related Test IDs

- `TV-LIBRARY-SOURCING`: Primary verification ID for attachment governance
- `TV-ASSET-API`: Attachment API verification for upload/delete guards
- `LIB-007`: Attachment and spec-sheet version approval
