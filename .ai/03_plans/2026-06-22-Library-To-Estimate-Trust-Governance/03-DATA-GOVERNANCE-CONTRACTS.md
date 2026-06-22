# Data Governance Contracts

## Source Vocabulary

These terms must stay separate in code, UI, tests, and telemetry.

| Term | Meaning | Current anchor |
| --- | --- | --- |
| `pricingDate` | Date used to compute price freshness | `src/components/workshop/library/source-trust-model.ts:85` |
| `pricingSource` | Raw pricing source text or URL-equivalent input; safe display labels must be derived separately | `src/lib/estimates/actions.ts:807` |
| `sourceUrl` | URL or internal path after validation | `src/lib/estimates/actions.ts:809` |
| `supplier` | Display supplier text; may coexist with normalized supplier identity during transition | `src/lib/estimates/actions.ts:811` |
| `supplierId` | Normalized supplier identity when available | `src/lib/estimates/actions.ts:812` |
| `confidence` | Free-text confidence, not enum | `src/components/workshop/library/source-trust-model.ts:121` |
| `lifecycleState` | Library component lifecycle | `src/components/workshop/library/source-trust-model.ts:9` |
| `linkState` | Estimate row relationship to source | `src/components/workshop/library/source-trust-model.ts:66` |
| `sourceSnapshot` | Frozen estimate-row source facts | `src/lib/estimates/actions.ts:794` |
| `attachments` | Variant files with MIME/path metadata | `src/lib/component-library/actions.ts:415` |

## Cache Contracts

The plan must preserve these cache-shape boundaries:

- Full Library dataset: `workspaceComponentLibraryQueryKey(workspaceId)` for management/editor surfaces with detail graph.
- Lite Estimate Sheet dataset: `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)` for right-sidebar consumer use.
- Component rows management dataset: `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`.
- Templates dataset: `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })`.

Rules:

- A mutation must name the exact key or scoped prefix it invalidates.
- A non-exact full scoped prefix invalidation can cover lite and full Library datasets within one workspace.
- No operation can reuse unscoped `["workspace-component-library"]` data across workspaces, and direct consumers should not construct the unscoped base key outside the key factory.
- Sidebar local optimistic state can stay responsive while the heavy cache is marked stale.

## Insert And Replace Contracts

- Insert target must be validated against current project, estimate, node, workspace, and edit access before write.
- Replace must use expected row revision and fail on stale revision.
- Insert and replace both write source snapshot and link state from the incoming source.
- Local optimistic changes must carry rollback or retry state.
- Archived or foreign Library items must fail closed before mutation.
- Server actions remain authoritative: the client can preview and optimistically queue intent, but submit-time code must re-resolve target, workspace, role, and row state.

## Cost Governance Contract

Canonical app-layer states:

| State | Meaning | Durable storage rule |
| --- | --- | --- |
| `proposed` | Entered or imported but not reviewed. | May be transient unless visible after reload. |
| `needs_review` | Stale, conflicting, or missing source detail. | Migration required if used for queues, assignments, or insert/replace decisions after reload. |
| `accepted` | Selected as the current trusted cost. | Migration required if treated as reviewed truth. |
| `accepted` plus lock modifier | Accepted cost cannot change without a new review event. | Lock is a modifier such as `locked_at` or a lock event, not a peer lifecycle state. |
| `rejected` | Reviewed and not used. | Migration required if audit history must survive reload. |
| `superseded` | Replaced by a newer cost entry. | Migration required if audit history must survive reload. |

Schema/migration candidates:

- Add reviewer/assignee fields if assignment cannot be represented safely with existing metadata.
- Add accepted status and lock modifier fields if the current-cost boolean cannot distinguish reviewed accepted cost from merely active cost.
- Add review timestamp when "last reviewed" becomes product-visible. Do not invent a `last_reviewed` UI over `updated_at` without labeling it accurately.
- Keep existing append-only version/history primitives as the first audit surface. Add a parallel acceptance table only if the workflow needs a durable acceptance object that cannot fit existing cost/version history.
- Follow the decision gates, SQL probes, and RPC/action boundaries in `10-DATABASE-MIGRATION-AND-RPC-READINESS.md`.

## Attachment Governance Contract

Minimum app-layer fields:

- storage bucket and path
- original file name
- content type
- size
- kind (`pdf` or `excel`)
- applicable variant or cost entry
- review state (`uploaded`, `approved`, `rejected`, `superseded`)
- reviewer and review date when durable approval is implemented
- prior revision relation when superseded

Rules:

- Upload accepts only PDF/XLS/XLSX by magic MIME, not just extension.
- Delete/remove only acts on owned workspace/user paths.
- Draft cleanup must not remove persisted approved files.
- Approval of a new attachment must not erase old audit history.
- Approval/version state should be added only if it must persist across reloads and appear in audit trails; otherwise attachments remain private evidence assets.
- Public/proposal snapshots must never include raw storage paths, signed URLs, original filenames, or attachment review notes.

## Telemetry And Redaction

Telemetry for this work may include IDs, booleans, reason codes, counts, lifecycle state, freshness tier, and timing.

Telemetry must not include:

- raw component names
- raw row text
- pricing source free text
- confidence prose
- source URLs
- file names or storage paths
- user-entered notes

Public share snapshots must remain frozen and redacted. Re-run `tests/vitest/share-snapshot-redaction.test.tsx` for any source-trust or attachment field that could enter proposal/public output.

Nested telemetry payloads must be sanitized recursively. Arrays or objects that
contain source URLs, file names, storage paths, confidence prose, raw row text,
or user-entered notes must be dropped or converted to safe reason codes before
emission.

## Required Companion Contracts

- UX state and copy: `07-UX-IA-COPY-AND-A11Y-CONTRACT.md`.
- Authz, storage, public redaction, URL, and telemetry security: `09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`.
- Migration, source snapshot, SQL, and RPC gates: `10-DATABASE-MIGRATION-AND-RPC-READINESS.md`.
- Cache, payload, network, retry, and attachment budgets: `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`.
