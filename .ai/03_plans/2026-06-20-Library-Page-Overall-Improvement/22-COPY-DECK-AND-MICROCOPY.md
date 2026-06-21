# 22 — Copy Deck And Microcopy

> **Status:** Living document. Canonical user-facing strings for the Library work, with copy hierarchy, pluralization/i18n rules, per-surface completeness, locale-safe interpolation/escaping, and rollback/variant guidance.
>
> **Scope:** Every user-facing string for the Library work, in one authoritative place. Resolves `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001 (`very stale` copy), C-002 (canonical term is **chip**, not badge), C-012 (`trust.public_snapshot.label`), and C-013 (archive vs delete).
>
> **Companion docs:** [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md), [11-SOURCE-TRUST-STATE-MATRIX.md](11-SOURCE-TRUST-STATE-MATRIX.md), [15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md), [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md), [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md), [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md), [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md), [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).

---

## 1. Purpose

Every user-facing string for the Library work lives here so implementers copy rather than invent. Copy is otherwise scattered across `10-LIBRARY-SURFACE-SPECS.md`, `11-SOURCE-TRUST-STATE-MATRIX.md`, and `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`. This deck consolidates those into final strings and resolves the bulk-archive copy conflict.

Owner: Copy lead | Phase: all | Flag: n/a | Rollback: revert copy change | Evidence: EV-COPY-01 | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: key-based | Binding: `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` §Canonical Glossary

---

## 2. Copy hierarchy

Every string is classified by role so implementers know which token and tone to apply:

| Tier | Role | Examples | Tone token | Owner | Phase | Evidence |
|---|---|---|---|---|---|---|
| 1 — Title/heading | Primary action or state label | "New folder", "Archive {n} components?" | `foreground` | Copy lead | all | EV-COPY-01 |
| 2 — Body/helper | Explanation, consequence, or guidance | "Archived components are hidden from browse..." | `secondary` | Copy lead | all | EV-COPY-01 |
| 3 — Action label | Button, link, or menu item | "Create folder", "Discard draft" | `primary`/`destructive` | Copy lead | all | EV-COPY-01 |
| 4 — Validation/error | Field or surface error | "Enter a folder name." | `danger` | Copy lead | all | EV-COPY-01 |
| 5 — Meta/trust | Chip, badge, tooltip, status | "Stale price", "Verified source" | `secondary`/`success`/`warning`/`danger` | Copy lead | 2 | EV-COPY-01 |
| 6 — Screen-reader only | Accessible name not visible | "Close inspector", "{n} components selected" | n/a | A11y lead | all | EV-A11Y-01 |

> **WCAG:** meta/trust text must not rely on `#7F7F7F` (`tertiary`) for load-bearing meaning — it fails AA. Use `secondary` (`#5D5D5D`) for any chip label, validation message, or consequence line the user must read. `tertiary` is allowed only for non-load-bearing decoration.

---

## 3. Copy rules

| Rule | Rationale | Owner | Phase | Evidence |
|---|---|---|---|---|
| Plain professional copy. State issue, then fix. | Reduces cognitive load. | Copy lead | all | EV-COPY-01 |
| Destructive copy names the object and consequence. | Meets WCAG 2.4.6 / 3.3.2. | Copy lead | all | EV-COPY-01 |
| Reversible actions never say "cannot be undone". | Archive is recoverable. | Copy lead | all | EV-COPY-01 |
| Archive, delete, hide, and detach use distinct copy. | Prevents accidental irreversible actions. | Copy lead | all | EV-COPY-01 |
| Confirm verbs match domain action (Archive, Delete, Discard). | Predictable UX. | Copy lead | all | EV-COPY-01 |
| No bare "Something went wrong" without concrete next step. | Actionable error recovery. | Copy lead | all | EV-COPY-01 |
| Helper copy stays short enough for compact workspace. | Dense-mode readability. | Copy lead | 5 | EV-COPY-01 |
| Canonical term for trust/freshness/status labels is **chip** (not badge). | Resolves C-002 with `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`. | Copy lead | all | EV-COPY-01 |

---

## 4. Folder create / rename dialog

Surface: text-prompt dialog (inline `ConfirmDialog` + child `<input>` pattern from `TemplatesBrowseManager.tsx`, NOT a standalone primitive). Replaces `ComponentLibraryManager.tsx` `window.prompt("Folder name")` at create and rename. Lands in Phase 0B.

| Slot | Key | Create | Rename | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dialog title | `folder.create.title` / `folder.rename.title` | New folder | Rename folder | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | focus-trap | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Field label | `folder.name.label` | Folder name | Folder name | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | label-visible | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Placeholder | `folder.name.placeholder` | e.g. Exterior finishes | (prefilled) | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | n/a | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Primary button | `folder.create.button` / `folder.rename.button` | Create folder | Save name | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | focus-visible | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Cancel button | `folder.cancel.button` | Cancel | Cancel | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | n/a | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Empty-field validation | `folder.error.empty` | Enter a folder name. | Enter a folder name. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | aria-invalid | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Unchanged-name (rename) | `folder.rename.unchanged` | n/a | Name is unchanged. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | aria-invalid | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1515` |
| Length validation | `folder.error.too_long` | Use 80 characters or fewer. | Use 80 characters or fewer. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | aria-invalid | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |
| Duplicate name (client) | `folder.error.duplicate` | A folder named "{name}" already exists here. | A folder named "{name}" already exists here. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key (ICU `{name}`) | aria-invalid | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1493` |

### Folder server-error strings

| Condition | Key | Message | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|
| Permission denied (viewer) | `folder.error.permission` | You do not have permission to change folders in this workspace. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | key-based |
| Duplicate (server) | `folder.error.duplicate_server` | A folder with that name already exists. Choose another name. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | key-based |
| Concurrent change | `folder.error.concurrent` | This folder changed in another session. Close and reopen to see the latest. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | key-based |
| Network/database | `folder.error.network` | Could not save the folder. Check your connection and try again. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | key-based |

---

## 5. Folder delete dialog

Surface: destructive `ConfirmDialog` (`role="alertdialog"`). Replaces `window.confirm("Delete \"{name}\"? ...")` in `ComponentLibraryManager.tsx`. Folder delete is destructive for the folder, but components survive.

| Slot | Key | Copy | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Title | `folder.delete.title` | Delete folder? | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | alertdialog | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Body (with components) | `folder.delete.body_with_components` | Delete "{name}"? Its {n} components stay in the library and lose this folder. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | Playwright | ICU plural | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Body (empty folder) | `folder.delete.body_empty` | Delete "{name}"? This folder is empty. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key (ICU `{name}`) | alertdialog | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Body (subfolders) | `folder.delete.body_with_subfolders` | Delete "{name}"? Its {n} components and {m} subfolders move out of this folder; nothing is deleted from the library. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key (ICU plural `{n}`, `{m}`) | alertdialog | n/a | Playwright | ICU plural | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Primary button | `folder.delete.button` | Delete folder | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | destructive | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Cancel button | `folder.delete.cancel_button` | Keep folder | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | n/a | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Concurrent-change error | `folder.delete.error.concurrent` | This folder changed in another session. Close and reopen before deleting. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | alertdialog | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |
| Permission denied | `folder.delete.error.permission` | You do not have permission to delete folders in this workspace. | Copy lead | 0B | `library_folder_dialogs` | redeploy flag=false | EV-COPY-01 | n/a | key | alertdialog | n/a | Playwright | key-based | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1534` |

---

## 6. Add component dirty-discard confirm

Surface: design-system `ConfirmDialog`. Replaces `AddComponentModal.tsx` `window.confirm("Discard this component draft?")` at line ~963. Lands in Phase 0B.

| Slot | Key | Copy | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Title | `component.dirty_discard.title` | Discard this draft? | Copy lead | 0B | `library_folder_dialogs` (overlay policy) | git revert | EV-COPY-01 | `quick_add_abandoned` | key | alertdialog | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |
| Body | `component.dirty_discard.body` | You have unsaved changes to this component. They are lost if you leave. | Copy lead | 0B | `library_folder_dialogs` | git revert | EV-COPY-01 | n/a | key | alertdialog | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |
| Primary button | `component.dirty_discard.confirm_button` | Discard draft | Copy lead | 0B | `library_folder_dialogs` | git revert | EV-COPY-01 | n/a | key | destructive | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |
| Cancel button | `component.dirty_discard.cancel_button` | Keep editing | Copy lead | 0B | `library_folder_dialogs` | git revert | EV-COPY-01 | n/a | key | n/a | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |
| Upload-in-flight guard | `component.dirty_discard.upload_guard` | Wait for uploads to finish before closing. | Copy lead | 0B | `library_folder_dialogs` | git revert | EV-COPY-01 | n/a | key | live-region | n/a | jsdom | key-based | `src/components/workshop/component-library-manager/AddComponentModal.tsx:963` |

---

## 7. Bulk archive vs delete (resolves C-013)

Surface: `BulkDestructivePreviewModal.tsx`. The current code sets `confirmationHint` gated on `canExecute` (`BulkDestructivePreviewModal.tsx:107-108`), so it reads "This action cannot be undone." for BOTH archive and delete. The fix branches the hint on `actionCopy.verb`.

> **Canonical distinction:** "Archive" = soft-delete (recoverable via `changeCostLibraryComponentLifecycleState` back out of `archived`). "Delete" = hard-delete (permanent, irreversible).

### Archive path (reversible)

| Slot | Key | Copy | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Title | `bulk_archive.title` | Archive {n} components? | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | jsdom | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Lead (this-will) | `bulk_archive.lead` | This will archive {n} components. | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | jsdom | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Lead (single) | `bulk_archive.lead_single` | This will archive this component. | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | alertdialog | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Confirmation hint | `bulk_archive.hint` | Archived components are hidden from browse and blocked from new inserts. You can restore them later. | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | alertdialog | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:108` |
| Execute button | `bulk_archive.execute_button` | Archive components | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | destructive | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Cancel button | `bulk_archive.cancel_button` | Cancel | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | n/a | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Ready status | `bulk_archive.status_ready` | Ready to archive | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | status | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Blocked status | `bulk_archive.status_blocked` | Cannot archive yet | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key | status | n/a | jsdom | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Partial-blocker line | `bulk_archive.partial_blocker` | Only the {n} components marked ready will be archived. | Copy lead | 0B | n/a | git revert | EV-COPY-01 | n/a | key (ICU plural `{n}`) | status | n/a | jsdom | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |

### Delete path (irreversible, if/when a delete variant exists)

| Slot | Key | Copy | Owner | Phase | Flag | Rollback | Evidence | Telemetry | Copy | A11y | Perf | Browser-proof | i18n | Binding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Title | `bulk_delete.title` | Delete {n} components? | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | n/a | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Lead | `bulk_delete.lead` | This will delete {n} components. | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | n/a | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Confirmation hint | `bulk_delete.hint` | This permanently removes {n} components from the library. This cannot be undone. | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key (ICU plural `{n}`) | alertdialog | n/a | n/a | ICU plural | `src/components/workshop/BulkDestructivePreviewModal.tsx:108` |
| Execute button | `bulk_delete.execute_button` | Delete components | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key | destructive | n/a | n/a | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Cancel button | `bulk_delete.cancel_button` | Cancel | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key | n/a | n/a | n/a | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |
| Type-to-confirm prompt | `bulk_delete.type_to_confirm` | Type {requiredPhrase} to confirm | Copy lead | Phase-later | n/a | n/a | EV-COPY-01 | n/a | key (ICU `{requiredPhrase}`) | alertdialog | n/a | n/a | key-based | `src/components/workshop/BulkDestructivePreviewModal.tsx:107` |

---

## 8. Trust chip copy and tooltips (canonical term: **chip**, not badge)

One label per canonical state. Labels are `secondary`/tone tokens, never `tertiary`. Chips that gate an action carry an accessible name on the focusable row/card/inspector. Use "source changed" for link drift and "stale" only for pricing freshness (`19` CANON glossary).

### Freshness (derived from `pricing_date`; helpers `getComponentPricingFreshness`, `getStalenessTone`/`getStalenessLabel`)

The 90-day window is `COMPONENT_FACET_STALE_DAYS` / `LIBRARY_OVERVIEW_STALE_PRICING_DAYS`. A 180-day "Very stale" tier is NEW and must EXTEND these constants together (resolves C-001).

| State | Key | Chip label | Tone | Tooltip | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|---|---|
| Current | `trust.current.label` / `trust.current.tooltip` | Current | success | Priced within the last {window} days. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Stale | `trust.stale.label` / `trust.stale.tooltip` | Stale price | warning | Priced more than {window} days ago. Review before reuse. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Very stale | `trust.very_stale.label` / `trust.very_stale.tooltip` | Very stale | danger | Priced over {longWindow} days ago. Confirm the price before inserting. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Missing date | `trust.missing_date.label` / `trust.missing_date.tooltip` | No price date | secondary | No pricing date recorded. Add one to track freshness. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Unknown | `trust.unknown.label` / `trust.unknown.tooltip` | Freshness unknown | secondary | Freshness cannot be computed for this item. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |

### Confidence (free-text `confidence` column — UI derives a label; no enum)

| Derived tier | Key | Chip label | Tone | Tooltip | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|---|---|
| High | `trust.confidence.high.label` / `.tooltip` | Verified source | success | Marked as a verified or trusted source. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Medium | `trust.confidence.medium.label` / `.tooltip` | Likely source | secondary | Plausible but not fully verified. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Low | `trust.confidence.low.label` / `.tooltip` | Low confidence | warning | User-entered or uncertain source. Review before reuse. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Free text | `trust.confidence.free_text.label` / `.tooltip` | {confidence text} | secondary | Recorded confidence note. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based (escaped) |
| Missing | `trust.confidence.missing.label` / `.tooltip` | No confidence | secondary | No source confidence recorded. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |

### Lifecycle (`component_lifecycle_state` enum — five real values)

| Enum value | Key | Chip label | Tone | Tooltip | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|---|---|
| draft | `lifecycle.draft.label` / `.tooltip` | Draft | secondary | Incomplete or internal. Visible to editors; warned on insert. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| in_production | `lifecycle.in_production.label` / `.tooltip` | In production | secondary | Being built up; usable but not finalized. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| available | `lifecycle.available.label` / `.tooltip` | Available | success | Ready for new estimates. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| discontinued | `lifecycle.discontinued.label` / `.tooltip` | Discontinued | warning | No longer recommended. Inserting requires confirmation. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| archived | `lifecycle.archived.label` / `.tooltip` | Archived | secondary | Hidden from browse and blocked from new inserts. | Copy lead | 2 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |

### Link / snapshot (`estimate_row_link_state` enum)

| Enum value | Key | Chip label | Tone | Tooltip | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|---|---|
| linked-clean | `link.linked_clean.label` / `.tooltip` | Linked | success | Matches the current library source. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| source-changed | `link.source_changed.label` / `.tooltip` | Source changed | warning | The library source changed after insertion. Review changes before updating. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| linked-overridden | `link.linked_overridden.label` / `.tooltip` | Local override | secondary | Edited locally and differs from the library source. Not overwritten automatically. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| detached | `link.detached.label` / `.tooltip` | Detached | secondary | No longer linked to a library source. Reconnect if appropriate. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| unlinked | `link.unlinked.label` / `.tooltip` | Not linked | secondary | Added directly without a library source. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| (derived) missing source | `link.missing_source.label` / `.tooltip` | Source missing | danger | The linked library source was deleted or is unavailable. | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |

### Public snapshot (resolves C-012)

| Key | Copy | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|
| `trust.public_snapshot.label` | Snapshot verified on {date} | Copy lead | 0B | n/a | revert snapshot builder change | EV-COPY-01 | key-based (ICU `{date}`) |

---

## 9. Insert-target disclosure line

Surface: `InsertIntoEstimatePicker.tsx` (Modal) and inspector insert action. Backed by `listEstimateInsertTargets` / `resolveEstimateTemplateInsertTarget`.

| Variant | Key | Disclosure line | Action affordance | Owner | Phase | Flag | Rollback | Evidence | i18n |
|---|---|---|---|---|---|---|---|---|---|
| Single resolved target | `insert_target.single_resolved` | Inserting into {estimateName} — {projectName}. | Change target | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Choose target | `insert_target.choose` | Select where to insert. | Target picker | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| No valid target | `insert_target.none` | No open estimate to insert into. | Open or create an estimate | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Stale target | `insert_target.stale_target` | That estimate is no longer available. Choose another target. | Reselect target | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |
| Permission on target | `insert_target.permission` | You cannot edit {estimateName}. Choose a target you can edit. | Reselect target | Copy lead | 4 | `library_trust_chips` | redeploy flag=false | EV-COPY-01 | key-based |

---

## 10. Per-surface copy completeness

Each table below confirms loading/empty/error/permission states have copy keys.

### Library overview

| State | Key | Copy | Action | Owner | Phase | Flag | i18n |
|---|---|---|---|---|---|---|---|
| Loading | `library.loading` | Loading your library… | stable frame | Copy lead | 0B | n/a | key-based |
| Empty (no components) | `library.empty` | Your library is empty. Add a component to reuse it across estimates. | Add component | Copy lead | 0B | n/a | key-based |
| Permission denied | `library.permission_denied` | You do not have access to this workspace's library. | Switch workspace | Copy lead | 0B | n/a | key-based |
| Network/database error | `library.error.network` | Could not load the library. Check your connection and retry. | Retry | Copy lead | 0B | n/a | key-based |
| Workspace switch in flight | `library.loading_workspace` | Loading {workspaceName}'s library… | no prior data | Copy lead | 0B | n/a | key-based (ICU `{workspaceName}`) |

### Components tab

| State | Key | Copy | Action | Owner | Phase | Flag | i18n |
|---|---|---|---|---|---|---|---|
| Loading | `components.loading` | Loading components… | stable frame | Copy lead | 0B | n/a | key-based |
| Empty (no components) | `components.empty` | No components yet. Add your first reusable component. | Add component | Copy lead | 0B | n/a | key-based |
| Empty (filtered) | `components.empty_filtered` | No components match these filters. | Clear filters | Copy lead | 1 | `library_component_deep_link` | key-based |
| Empty (search) | `components.empty_search` | No components match "{query}". | Clear search | Copy lead | 1 | `library_component_deep_link` | key-based (ICU `{query}`) |
| Permission denied | `components.permission_denied` | You can view but not edit this library. | read-only state | Copy lead | 0B | n/a | key-based |
| Error | `components.error.network` | Could not load components. Retry. | Retry | Copy lead | 0B | n/a | key-based |

### Component inspector (`ComponentInspectorDock.tsx`)

| State | Key | Copy | Action | Owner | Phase | Flag | i18n |
|---|---|---|---|---|---|---|---|
| Loading detail | `component_inspector.loading_detail` | Loading component… | keep dock frame | Copy lead | 0B | `library_component_deep_link` | key-based |
| Invalid `component` id | `component_inspector.invalid` | That component could not be found here. | Clear selection | Copy lead | 0B | `library_component_deep_link` | key-based |
| Deleted after open | `component_inspector.deleted` | This component was removed. | Clear selection | Copy lead | 0B | `library_component_deep_link` | key-based |
| Permission denied | `component_inspector.permission_denied` | You do not have access to this component. | Clear selection | Copy lead | 0B | `library_component_deep_link` | key-based |
| Stale after open | `component_inspector.stale_after_open` | This component changed since you opened it. Reload to see the latest. | Reload | Copy lead | 0B | `library_component_deep_link` | key-based |
| Network error | `component_inspector.error.network` | Could not load this component. Retry. | Retry | Copy lead | 0B | `library_component_deep_link` | key-based |

### Templates / insert

| State | Key | Copy | Action | Owner | Phase | Flag | i18n |
|---|---|---|---|---|---|---|---|
| Loading | `templates.loading` | Loading templates… | stable frame | Copy lead | 4 | `library_trust_chips` | key-based |
| Empty | `templates.empty` | No templates yet. Save a template to reuse line items. | Create template | Copy lead | 4 | `library_trust_chips` | key-based |
| Insert partial failure | `templates.insert_partial_failure` | Some rows could not be inserted. Review and retry the rest. | Review | Copy lead | 4 | `library_trust_chips` | key-based |
| Insert success (returns to estimate) | `templates.insert_success_return` | Added to {estimateName}. | View estimate | Copy lead | 4 | `library_trust_chips` | key-based |
| Insert success (stays in library) | `templates.insert_success_stay` | Added to {estimateName}. You can keep browsing. | Go to estimate | Copy lead | 4 | `library_trust_chips` | key-based |
| Target gone before insert | `templates.target_gone` | That estimate is no longer available. Nothing was inserted. | Choose another target | Copy lead | 4 | `library_trust_chips` | key-based |

---

## 11. Input / file validation messages

Quick Add required fields are `name`, `category`, `unit`, `unit_cost` (CANON Quick Add Contract). Backed by `createCostLibraryComponent` / `updateCostLibraryComponent` validation.

| Field / case | Key | Message | Owner | Phase | Flag | i18n |
|---|---|---|---|---|---|---|
| Name missing | `validation.name_required` | Enter a component name. | Copy lead | 3 | `library_quick_add` | key-based |
| Name too long | `validation.name_too_long` | Use 120 characters or fewer for the name. | Copy lead | 3 | `library_quick_add` | key-based |
| Category missing | `validation.category_required` | Choose or enter a category. | Copy lead | 3 | `library_quick_add` | key-based |
| Unit missing | `validation.unit_required` | Enter a unit (e.g. each, m2, hr). | Copy lead | 3 | `library_quick_add` | key-based |
| Unit cost missing | `validation.unit_cost_required` | Enter a unit cost. | Copy lead | 3 | `library_quick_add` | key-based |
| Unit cost not numeric | `validation.unit_cost_numeric` | Enter a number for unit cost. | Copy lead | 3 | `library_quick_add` | key-based |
| Unit cost negative | `validation.unit_cost_negative` | Enter a unit cost of zero or more. | Copy lead | 3 | `library_quick_add` | key-based |
| Supplier/brand too long | `validation.supplier_too_long` | Use 120 characters or fewer. | Copy lead | 3 | `library_quick_add` | key-based |
| Pricing date invalid | `validation.pricing_date_invalid` | Enter a valid date. | Copy lead | 3 | `library_quick_add` | key-based |
| Pricing date far future | `validation.pricing_date_future` | Enter a pricing date that is not in the future. | Copy lead | 3 | `library_quick_add` | key-based |
| Source URL invalid | `validation.source_url_invalid` | Enter a valid https URL. | Copy lead | 3 | `library_quick_add` | key-based |
| Source URL too long | `validation.source_url_too_long` | Shorten this URL. | Copy lead | 3 | `library_quick_add` | key-based |
| Confidence note too long | `validation.confidence_too_long` | Use 120 characters or fewer for the confidence note. | Copy lead | 3 | `library_quick_add` | key-based |
| Possible duplicate | `validation.possible_duplicate` | A component named "{name}" already exists. Add anyway or open the existing one. | Copy lead | 3 | `library_quick_add` | key-based (ICU `{name}`) |
| File too large (future upload) | `validation.file_too_large` | This file is too large. Use a file under {limit}. | Copy lead | Phase-later | n/a | key-based (ICU `{limit}`) |
| Unsupported file type (future) | `validation.file_unsupported` | This file type is not supported. | Copy lead | Phase-later | n/a | key-based |
| Import row missing unit (future) | `validation.import_row_missing_unit` | Row {n} is missing a unit. | Copy lead | Phase-later | n/a | key-based (ICU `{n}`) |
| Export redaction notice (future) | `validation.export_redaction_notice` | This export excludes private source details. | Copy lead | Phase-later | n/a | key-based |

`source_url` maps to the `pricing_source` column (free text; URL validity checked app-side). `confidence` is free text; the note-length message applies to the raw string, not an enum.

---

## 12. Pluralization and i18n rules

Every count-based string MUST use ICU MessageFormat pluralization.

### Pattern

```
<key> = {count, plural,
  =0 {No items}
  =1 {1 item}
  other {# items}
}
```

### Required plural keys

| Key | ICU pattern | Surfaces | Owner | Phase |
|---|---|---|---|---|
| `component_card.count` | `{count, plural, =0 {No components} =1 {1 component} other {# components}}` | Components tab, overview | Copy lead | 1 |
| `folder.item_count` | `{count, plural, =0 {Empty} =1 {1 item} other {# items}}` | Folder tree | Copy lead | 0B |
| `search.result_count` | `{count, plural, =0 {No results} =1 {1 result} other {# results}}` | Search/filter | Copy lead | 1 |
| `bulk_archive.title` | `{n, plural, =1 {Archive 1 component?} other {Archive # components?}}` | Bulk archive modal | Copy lead | 0B |
| `bulk_archive.lead` | `{n, plural, =1 {This will archive 1 component.} other {This will archive # components.}}` | Bulk archive modal | Copy lead | 0B |
| `folder.delete.body_with_components` | `{n, plural, =1 {Its 1 component stays in the library...} other {Its # components stay in the library...}}` | Folder delete dialog | Copy lead | 0B |

### Locale-safe interpolation and escaping rules

| Rule | Rationale | Owner | Phase |
|---|---|---|---|
| Never concatenate strings with variables. | Word order varies by locale. | i18n lead | all |
| Always use ICU MessageFormat for variables. | `{name}`, `{count}`, `{date}`. | i18n lead | all |
| Escape user-generated content before interpolation. | Prevents injection and broken markup. | Frontend lead | all |
| Never interpolate HTML; use JSX interpolation. | No `dangerouslySetInnerHTML`. | Frontend lead | all |
| URL-encode parameters with `encodeURIComponent`. | Safe links. | Frontend lead | all |
| Use `Intl.DateTimeFormat`/`Intl.NumberFormat` for dates/numbers. | Locale-aware formatting. | i18n lead | all |

---

## 13. Rollback and variant management

| Scenario | Action | Owner | Evidence |
|---|---|---|---|
| Copy key change after release | Add a NEW key; keep old key until translation catch-up. Never rename in place. | Copy lead | EV-COPY-01 |
| A/B or variant copy test | Use a feature flag (`library_copy_variant_*`) and separate keys; do not hardcode branches. | Copy lead | EV-COPY-01 |
| Emergency rollback of a copy string | Revert the value change in translation file or redeploy previous env; keys remain stable. | Copy lead | EV-COPY-01 |
| Off-state copy for hidden flag surfaces | Every flag-off path must still have valid keys for fallback UI (no bare English). | Copy lead | EV-COPY-01 |

---

## 14. Verification

| Check | Command | Pass condition | Owner | Phase |
|---|---|---|---|---|
| No "badge" for trust/freshness/status labels | `rg -i "\bbadge\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" \| rg -i "trust\|freshness\|stale\|status"` | 0 matches | Copy lead | all |
| Every copy key has a surface/state mapping | `rg "^\| " 22-COPY-DECK-AND-MICROCOPY.md` | every row has key + copy | Copy lead | all |
| Count-based keys use ICU plural | `rg "plural" 22-COPY-DECK-AND-MICROCOPY.md` | all count strings listed in §12 | i18n lead | all |
| No hardcoded trust/stale strings in components (future) | `rg "['\"](?:Stale price\|Very stale\|No price date\|Verified source)['\"]" src/components/workshop/library/ --type ts --type tsx` | 0 matches | i18n lead | 2 |

---

## 15. Cross-references

- `10-LIBRARY-SURFACE-SPECS.md` — surfaces these strings render in.
- `11-SOURCE-TRUST-STATE-MATRIX.md` — state rules the chips express.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` — route-state and server-error shape.
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` — source of validation messages.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — authoritative names, enums, helpers, phase placement.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` — flags gating Very-stale tier and trust-chip rollout.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` — token-to-tone and overlay-primitive mapping.
- `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md` — ICU MessageFormat and RTL rules.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` C-001, C-002, C-012, C-013 — resolved conflicts.
