# UX, IA, Copy, And Accessibility Contract

This file turns the UX requirements into implementation contracts. It is the
source of truth for visible states, copy vocabulary, and keyboard/screen-reader
behavior in the Library-to-Estimate reuse workflow. `14-PER-SURFACE-UX-STATE-AND-VISUAL-QA.md`
extends this file with the required per-surface state matrix and responsive proof
contract.

## Role And Task Model

| Role | Primary task | Trust information needed | Actions allowed by this plan |
| --- | --- | --- | --- |
| Estimator | Add or replace estimate rows from Library, Project, or Templates. | Freshness, lifecycle, source link state, accepted-cost status, thumbnail mismatch, target validity. | Preview, insert, compare, replace, insert as new, cancel, retry, refetch. |
| Library curator | Refresh stale costs and reconcile supplier/source conflicts. | Supplier identity, pricing source, pricing date, confidence, active/accepted state, assignee, review age. | Assign refresh and propose cost when existing Library permissions allow it; accept, reject, supersede, lock, and unlock only when the acting user also has platform-admin or workspace-admin authority in beta. |
| Reviewer | Approve cost and spec-sheet evidence. | Review status, reviewer, reviewed date, attachment applicability, prior revisions. | Review and request refresh as a UX task label; approve, reject, and supersede durable trust evidence only when the acting user also has platform-admin or workspace-admin authority in beta. |
| Admin/manager | Resolve cross-workspace/project access and governance setup. | Workspace membership, project access, RLS outcomes, audit trail. | Manage access using existing app permissions; no special bypass is added by this plan. |

## Source IA Contract

| Surface | User goal | Primary content | Required actions | Required non-happy states |
| --- | --- | --- | --- | --- |
| Estimate Sheet right sidebar: `Library` tab | Reuse workspace Library components. | Component name, unit, unit cost, pricing freshness, lifecycle, safe source label, accepted-cost status. | Preview, insert, drag, compare/replace when targeting an existing row. | Loading, empty, stale cache, failed refresh, archived/discontinued, target invalid. |
| Estimate Sheet right sidebar: `Project` tab | Reuse project-specific or detached rows. | Project/estimate provenance, detached/project-specific label, unit, cost, target constraints. | Preview, insert, promote when eligible. | Wrong project, source deleted, target moved, edit access revoked. |
| Estimate Sheet right sidebar: `Templates` tab | Insert reusable estimate structure. | Template name, scope, resolved target, dependency health. | Preview target, insert template. | Missing target, stale estimate, permission loss, dependency conflict. |
| Compare-before-replace dialog | Decide whether a Library item can replace a row. | Current row vs incoming source, preserved fields, replaced fields, trust warnings, thumbnail/source mismatch. | Refresh source, replace selected row, insert as new row, cancel. | Stale row revision, source archived, row deleted, source refresh failed. |
| Cost refresh queue | Convert stale or conflicting costs into reviewed costs. | Stale tier, supplier, source URL presence, pricing date, confidence, assignee, review status. | Assign, accept, reject, supersede, lock accepted cost. | Duplicate accepted cost, stale assignment, missing source, insufficient permission. |
| Attachment review panel | Approve spec-sheet evidence. | File kind, size, variant/cost applicability, review state, reviewer, prior revisions. | Approve, reject, supersede, download if authorized. | Bad MIME, wrong path, upload failure, supersede conflict, private/public exposure block. |

## State And Copy Vocabulary

Use these exact user-facing labels unless a later explicit copy decision is
recorded in this pack before implementation.

| State | Visible label | Meaning | Recovery action |
| --- | --- | --- | --- |
| Fresh price | `Current` | Pricing date is within the current threshold. | None. |
| Stale price | `Stale price` | Pricing date exceeds the stale threshold. | Refresh source or compare before replace. |
| Very stale price | `Very stale price` | Pricing date exceeds the very-stale threshold. | Refresh before relying on cost, or explicitly continue as project-specific. |
| Missing source | `Missing price source` | Pricing source or URL is absent. | Add source detail; U1-U3 may continue as project-specific with explicit warning, while full governance cannot mark the cost reviewed. |
| Source changed | `Source changed` | Link/snapshot drift exists; price may still be current. | Review source before replacing. |
| Archived | `Archived component` | Library item is no longer a fresh reusable source. | Block fresh insert; allow only explicit non-fresh/project-specific path with evidence. |
| Discontinued | `Discontinued component` | Component lifecycle warns against normal reuse. | Require explicit decision; block only if a recorded lifecycle policy requires it. |
| Pending mutation | `Saving...` | Local intent submitted, server response pending. | Disable duplicate submit; show cancel only if operation is cancellable. |
| Saved | `Saved` | Server confirmed the Library-derived change. | Show brief confirmation without hiding the row/source summary. |
| Failed mutation | `Could not save` | Server rejected or network failed; local state rolled back or draft retained. | Retry, refetch source, or cancel. |
| Retrying | `Retrying...` | Same intended operation is being revalidated. | Keep target/source summary visible. |
| Resumed | `Recovered edit` | User returned after reload/navigation/mobile interruption. | Show saved/failed state and next action. |
| Accepted cost | `Accepted cost` | Reviewed current cost chosen for reuse. | Use for insert/replace unless locked state requires review. |
| Locked accepted cost | `Accepted cost locked` | Accepted cost cannot be changed without a new review event. | Start review or request unlock through authorized action. |
| Needs review | `Needs review` | Cost or attachment is not trusted enough for silent reuse. | Assign refresh or review. |

## Compare Dialog Content Contract

The compare dialog must show:

| Section | Required content | Pass/fail rule |
| --- | --- | --- |
| Current row | Name, unit, quantity, contingency, misc cost, current source/link state, current thumbnail when available. | User can identify what will be preserved and what may be replaced. |
| Incoming source | Library item name, lifecycle, unit, unit cost, pricing freshness, supplier, safe source label, accepted-cost status, thumbnail. | User can identify the incoming trust state without opening the Library page. |
| Preserved fields | Quantity, contingency, misc cost, local notes or row-specific fields that the replace path preserves. | Preserved fields are named before submit. |
| Replaced fields | Component identity, unit cost/source snapshot/link state, source metadata, thumbnail where applicable. | Replaced fields are named before submit. |
| Warnings | Stale/very stale, source changed, missing source, archived/discontinued, thumbnail mismatch, row revision risk. | Any risk that triggers compare is visible in text, not color alone. |
| Actions | Refresh source, replace selected row, insert as new row, insert as project-specific when source trust is insufficient, cancel. | Cancel and Escape return focus to the initiating row or source item. |

Canonical action labels:

- `Insert as new row` adds another eligible linked row under the selected target.
- `Insert as project-specific` is the explicit warning path for missing source,
  accepted-cost-missing, archived non-fresh, or detached/project-specific reuse.
  It must not claim reviewed Library trust.

## Severity And Decision Precedence

When multiple states apply, present the highest-severity blocking state first and
the rest as secondary warnings.

| Severity | State | Default decision |
| --- | --- | --- |
| Block | Foreign workspace, no edit access, invalid target, deleted row, archived blocked by policy, bad attachment path, public exposure risk. | Do not submit; show recovery/refetch path. |
| Confirm | Very stale price, source changed, thumbnail mismatch, discontinued, missing source, accepted cost missing. | Require compare or explicit continue action. |
| Warn | Stale price, low confidence, unreviewed attachment, pending refresh assignment. | Allow insert/replace only with visible warning. |
| Inform | Current price, accepted cost, approved attachment. | No extra decision gate. |

## Mobile And Interruption Matrix

| Interruption | Required behavior | Evidence |
| --- | --- | --- |
| Reload during pending insert | On return, show saved/failed/retry state; do not silently duplicate insert. | QA-011, ADV-011 |
| Route change during compare | Preserve current estimate row edits and return focus when dialog closes. | QA-011, QA-012 |
| Mobile rotation with compare open | Dialog/drawer remains scrollable, actions remain visible, focus trap remains valid. | Browser proof if implementation changes mobile geometry; otherwise record static/DOM rationale. |
| Network timeout | Show `Could not save`, retain intent summary, retry revalidates source and target. | QA-011 |
| Workspace switch | Drop stale sidebar data; no prior-workspace source is visible or submittable. | QA-005, ADV-001 |
| Duplicate submit tap | Second submit is ignored or coalesced with first operation; no double insert. | QA-011, PERF-006 |

## Accessibility Contract

| Area | Requirement | Preferred evidence |
| --- | --- | --- |
| Tabs | Source sections expose tabs with accessible names `Library`, `Project`, and `Templates`. | DOM test. |
| Compare dialog | Dialog has title, description, focus trap, Escape/cancel, and return-focus behavior. | DOM test; browser only for portal/focus issues. |
| Warnings | Stale, failed, archived, and missing-source states are visible text and announced when state changes. | DOM test with live region/assertion. |
| Keyboard insert/replace | Keyboard users can preview, insert, compare, replace, insert as new, cancel, and retry without drag/drop. | DOM test plus selective browser if DnD parity is claimed. |
| Invalid numeric edits | Invalid cost/quantity inputs use visible error text and `aria-invalid`. | Existing cost-input DOM tests. |
| Non-color cues | Trust states use text/icon/shape, not color alone. | DOM/static review. |
| Long text | Source labels and warning copy wrap inside sidebars/dialogs without covering actions. | DOM/static review; browser if responsive layout is changed. |

## User-Observable Acceptance

Implementation is not accepted if the only proof is internal action payloads. For
each unit, the evidence must include at least one user-observable assertion:

- A visible label, warning, state, or action appears.
- Focus moves to the expected control after cancel/error/success.
- A disabled or blocked action has explanatory text.
- A retry/refetch path remains available after failure.
- Private source/attachment data is absent from public-facing output.
