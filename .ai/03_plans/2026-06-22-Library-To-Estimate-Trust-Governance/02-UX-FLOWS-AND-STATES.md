# UX Flows And States

## Flow 1: Compare Before Replacing A Row

Trigger: an estimator drags or selects a Library item to replace an existing Estimate Sheet row.

Required states:

- No-risk replace: incoming component is current, available, source-present, and thumbnail/source metadata match the preview.
- Stale price: pricing date is older than the stale threshold; copy says `Stale price`, not `stale source`.
- Very stale price: pricing date is beyond the very-stale threshold; copy warns that cost should be refreshed before relying on it.
- Source changed: link/snapshot changed even if price is current; copy asks for source review.
- Missing source: pricing source or source URL is missing; copy says what is missing and lets the user insert as project-specific if allowed.
- Thumbnail mismatch: preview thumbnail or image source differs from the current row snapshot; copy calls this out before replacement.
- Archived/discontinued: archived blocks fresh insert; discontinued requires an explicit decision or is blocked by lifecycle policy.

Decision actions:

- `Refresh source`: refetch the Library item and re-run the risk check.
- `Replace selected row`: commit the incoming source after explicit decision.
- `Insert as new row`: keep the current row and add the incoming source as another row under the same target.
- `Cancel`: return focus to the initiating row or Library item.

## Flow 2: Insert From Sidebar Source Sections

The right sidebar source sections must communicate different behavior:

- `Library`: workspace reusable components. Adds a component row and preserves source snapshot/link state.
- `Project`: project-specific or detached estimate rows projected as reusable sources. Adds a project-scoped component row; it is not a workspace Library source until promoted.
- `Templates`: reusable estimate structure. Inserts nodes/rows after target and dependency checks.

Target rules:

- Component insert requires a valid selected area target.
- Project source insert uses the same selected target semantics as component insert unless the source represents a template-like group.
- Template insert must show the resolved project, estimate, and group/area before commit and re-resolve on submit.

## Flow 3: Failed Or Interrupted Reuse

Every joined Library-to-Estimate mutation needs a visible state:

- `pending`: local optimistic change exists and server confirmation is in flight.
- `saved`: server returned the canonical row/tree state.
- `failed`: local state rolled back or draft stayed pending with retry.
- `retrying`: same intended operation is being revalidated and retried.
- `resumed`: user returned after navigation, reload, or mobile interruption and sees what happened.

Recovery copy must name the failing layer:

- Library source could not refresh.
- Estimate target moved or was deleted.
- User no longer has edit access.
- Row changed while replacing.
- Project source could not be inserted.
- Attachment or spec-sheet could not be uploaded.

## Flow 4: Supplier And Cost-Source Governance

Curator workflow:

1. Filter Library components by stale, very stale, missing source, conflicting supplier, or low/no confidence.
2. Assign an owner or mark the refresh owner if owner fields exist.
3. Compare cost entries by supplier, source URL, pricing date, confidence, and current/accepted status.
4. Accept one current cost, reject or supersede alternatives, and record reason.
5. Reuse decisions in the Estimate Sheet read the accepted/current state or warn that review is pending.

User-facing language must avoid pretending that supplier text equals a verified supplier record. Supplier name, supplier ID, pricing source, source URL, confidence, source date, and accepted cost are separate concepts.

## Flow 5: Attachment And Spec-Sheet Review

Reviewer workflow:

1. Upload PDF/XLS/XLSX spec sheet to a variant.
2. Mark which variant and cost entry the file supports.
3. Review and approve, reject, or supersede the file.
4. Keep older file revisions visible as audit history.
5. Surface the current approved attachment in Library review and Estimate Sheet compare flows.

The upload API already accepts files, so the missing UX is lifecycle and accountability, not raw file transfer.

## Mobile And Accessibility Acceptance

- The sidebar or drawer must not reflow the Estimate Sheet while the Library dataset loads.
- Mobile users must be able to close, retry, and resume insert/replace without losing dirty row edits.
- Keyboard users must reach source section tabs, preview, compare dialog, replace/insert actions, cancel, and retry.
- Focus must return to the initiating row or source item after cancel, error, or success.
- Error text must be visible and announced; stale or failed states cannot be hover-title only.
- Numeric validation must use visible text and `aria-invalid` where applicable.

