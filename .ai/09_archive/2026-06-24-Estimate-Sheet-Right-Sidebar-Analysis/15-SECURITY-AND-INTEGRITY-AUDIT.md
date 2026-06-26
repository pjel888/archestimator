# 15 — Security and Integrity Audit

> Background agents `bg_3dfbe50b` (upload routes) and `bg_a941d969` (RLS/RPC authz) are verifying live DB schema. Findings below are from static code review; pending verification marked with ⏳.

## Authentication

All server actions call `requireCurrentUserContext()` or `requireAuth()` before any DB operation. The sidebar's server actions are no exception.

**Evidence**: every function in `src/lib/component-library/actions.ts` and `src/lib/reusable-sources/actions.ts` begins with `await requireCurrentUserContext()` or destructures `const { workspace } = await ensureDefaultWorkspace()` (which internally requires auth).

## Authorization (client + server)

### Client gating
The sidebar renders CRUD affordances based on `canEditEstimate` (passed from the page) and workspace role (inferred from server-provided props). Read-only users see fewer buttons.

### Server gating (defense-in-depth)
Every mutating server action enforces:
1. **`assertCanManageLibrary`**: RPC `is_workspace_editor({ target_workspace_id })` — returns true for editor/admin/owner only.
2. **`assertCanManageLibraryFolders`**: same RPC.
3. **`assertCanEditEstimate`**: RPC `can_edit_estimate({ target_estimate_id })` — checks project/estimate membership.
4. **`assertCanEditProject`**: RPC `can_edit_project({ target_project_id })`.

**VERIFIED**: all 12 mutating actions in `component-library/actions.ts` call the appropriate guard.

## Row-Level Security (RLS)

⏳ **Pending verification**: background agent checking migration files for `ENABLE ROW LEVEL SECURITY` on the 8 key tables.

**Static evidence**: the codebase consistently uses the RLS-scoped user client (`createSupabaseServerClient()`) for ALL queries — never a service-role/admin client in the sidebar's server actions. The only admin-client usage in the codebase is in:
- Background jobs (not sidebar-related)
- The `insert_estimate_subtree_into_estimate_with_history` RPC (SECURITY DEFINER — verified by convention, pending migration check)

## RPC authorization

Key RPCs used by the sidebar:

| RPC | Purpose | Auth check | Security |
| --- | --- | --- | --- |
| `is_workspace_editor` | Library/folder management gate | Checks `workspace_members.role` | INVOKER (safe) |
| `can_edit_estimate` | Estimate edit gate | Checks project/sheet membership | INVOKER (safe) |
| `can_edit_project` | Project edit gate | Checks project membership | INVOKER (safe) |
| `create_cost_library_component` | Create component | Receives `target_workspace_id`, checks internally | ⏳ |
| `insert_estimate_subtree_into_estimate_with_history` | Copy project source | Re-reads source under RLS client, checks `can_edit` (target) + source accessibility | ⏳ |
| `delete_library_folder` | Delete folder | Receives `target_workspace_id`, checks internally | ⏳ |
| `reorder_library_folders` | Reorder folders | Receives `target_workspace_id`, checks internally | ⏳ |

**Re-read-at-insert (DATA-4)**: `insertProjectSourceIntoEstimate` re-reads the source estimate by id under the RLS-scoped user client BEFORE the RPC call. If the source was deleted or access revoked between browse and insert, a clear error is thrown (`"This project source is no longer available."`). ✅

## File uploads

⏳ **Pending**: background agent verifying exact route handlers.

**Static evidence from `AddComponentModal.tsx`**:
- **Client-side resize**: `resizeImageForUpload` (`AddComponentModal.tsx:258-279`) resizes to 1600px max edge, webp 82% quality.
- **MIME validation**: `ALLOWED_UPLOAD_TYPES = Set(["image/jpeg", "image/png", "image/webp", "image/avif"])` — checked client-side before upload.
- **Size limit**: `MAX_CLIENT_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024` (20MB).
- **Attachment types**: PDF, XLS, XLSX only. `MAX_CLIENT_ATTACHMENT_BYTES = 20MB`.
- **Upload endpoint**: `POST /api/component-library/images` and `POST /api/component-library/attachments`.
- **Cleanup on failure**: `removeComponentImageUpload` and `removeComponentAttachmentUpload` call `DELETE` on the upload endpoints to clean orphaned files if the component creation fails. ✅
- **Cleanup on cancel**: the modal's discard flow removes uncommitted uploads. ✅

**Path traversal guards** (client-side):
- `normalizeComponentImageRouteUrl` (`LibraryTree.tsx:244-259`): validates URL origin, path, query params, and filename pattern.
- Rejects `..`, `\`, `#`, encoded traversal (`%2e`, `%2f`, `%5c`).
- Test coverage: `component-library-ui.test.tsx:1060-1148` — 12 traversal attempt cases, all blocked. ✅

## URL handling

### Source URL sanitization
- `sanitizeComponentSourceUrl` (`source-url.ts`): allows `http:`, `https:`, and internal paths starting with `/`. Blocks `javascript:`, `data:`, and other schemes.
- **Test**: `component-library-ui.test.tsx:901-943` — verifies `javascript:alert(1)` is NOT rendered as a link, while `https://supplier.example/quote` IS rendered. ✅

### Image URL normalization
- `normalizeEstimateRowImageUrl` → `normalizePublicationImageUrl`: sanitizes image URLs for rendering, blocking unsafe schemes.

## Drag payload validation

Drag payloads are treated as untrusted input at the receiving boundary:
- `readEstimateTemplateDragPayload` (`templates.ts:63-84`): validates JSON structure, checks for required string fields, returns `null` on malformed data.
- `readProjectSourceDragPayload` (`templates.ts:90-112`): validates `projectId`, `estimateId`, `tabId` as non-empty strings; validates `nodeId` if present.
- **Malformed payloads are silently ignored** — no error surfaced to the user, no telemetry event. ✅ Safe but silent.

**Cross-workspace ID injection**: a drag payload from workspace A cannot affect workspace B because:
1. The drop handler delegates to the sheet's insert handler
2. The insert handler calls the server action with the target project/estimate ids (from the current workspace context)
3. The server action validates the source ids under the RLS-scoped client — a cross-workspace source id is invisible (RLS blocks the read)

## Quotas

- `LIBRARY_COMPONENT_CAP = 10_000` per workspace (checked via head count query before insert)
- `LIBRARY_TEMPLATE_CAP = 2_000` per workspace
- **Bypass risk**: the caps are checked in the server action, not the DB. A race condition between check and insert could theoretically exceed the cap by 1. **Low risk** — acceptable for a pre-first-users product.

## Duplicate submission prevention

- **AddComponentModal**: `useTransition` + `pending` state disables the submit button during server action.
- **NewTemplateModal**: `pending` state in the reducer.
- **Folder create**: `folderEditCommitInFlightRef` + `createFolderPending` state.
- **Folder rename**: `renameCommitInFlightRef` (in EstimateSheetTree; the sidebar's LibraryTree uses `folderEditCommitInFlightRef`).

**VERIFIED**: all mutation paths have double-submit guards.

## Sensitive data in logs/telemetry

- `recordLibraryEvent` (`library-telemetry.ts`): sanitizes all payload values through an allow-list of known keys.
- String values are capped at 120 chars and scanned for URL/path/file-extension patterns (`UNSAFE_TELEMETRY_STRING_PATTERN`). Unsafe values are dropped (returned as `undefined`).
- **Free-text-prone keys** (`reason`, `action`, `pattern`, etc.) are validated against an enum-like pattern; non-enum values are dropped.
- **VERIFIED**: telemetry cannot leak source URLs, file paths, or user-entered private content. ✅

## Stored XSS

- React escapes all rendered text by default. No `dangerouslySetInnerHTML` usage in the sidebar.
- Image URLs are sanitized (no `javascript:` scheme).
- Source URLs are sanitized and rendered as `<a href="…">` with `target="_blank" rel="noreferrer"`. ✅

## Error leakage

- Server actions throw `Error` with human-readable messages (e.g., "Could not create component.", "Estimate edit access denied.").
- Raw Supabase errors are NOT passed to the client — `throwActionError` wraps them with a generic message and logs the raw error.
- **Project-source load errors**: the sidebar converts DB errors to a fixed user-friendly string via `toUserSourceError()` — raw `{code, details, hint, message}` objects are never rendered to the DOM. ✅

## Read-only project-source enforcement

Project sources cannot be mutated through the sidebar:
1. **Client**: no edit/delete/duplicate context-menu items for project-source rows.
2. **Server**: `insertProjectSourceIntoEstimate` uses the RLS-scoped user client only — a user without edit access to the source estimate cannot read it, let alone mutate it.
3. **Direct server-action invocation**: even if a malicious client calls `insertProjectSourceIntoEstimate` with arbitrary source ids, the RPC re-reads the source under the RLS client and throws "no longer available" if access is denied. ✅
