import {
  defineEstimateSystemKnowledgeGraph,
  type EstimateSystemKnowledgeImpactItem,
  type EstimateSystemKnowledgeNode,
  type EstimateSystemKnowledgeOperation,
  type EstimateSystemKnowledgeRelation,
  type EstimateSystemKnowledgeSource,
} from "@/lib/admin/estimate-system-knowledge";

const source = (file: string, note: string): EstimateSystemKnowledgeSource => ({ file, note });
const sources = {
  estimates: source("src/lib/estimates/actions.ts", "Estimate, hierarchy, row, template insertion, and publication-facing source actions"),
  persistence: source("src/lib/estimates/d1-action-client.ts", "Guarded D1 mutations, history records, cascade behavior, and template materialization"),
  rowUi: source("src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts", "Optimistic estimate-row editing, deletion, undo, localization, and promotion flows"),
  totals: source("src/lib/estimates/estimate-row-total.ts", "Canonical row and estimate calculation rules"),
  projection: source("src/lib/component-library/project-component-projection.ts", "Project-bounded component projection semantics"),
  library: source("src/lib/component-library/actions.ts", "Library component versioning, synchronization, preview, and permanent deletion"),
  promotion: source("src/lib/estimates/express-promotion-actions.ts", "Project component promotion into the shared Library"),
  legacyPublish: source("src/lib/publication/actions.ts", "Legacy publication snapshot creation and republish behavior"),
  legacyRead: source("src/lib/publication/public-repository.ts", "Public reads from stored legacy snapshots"),
  portalPublish: source("src/lib/client-portal/publish-service.ts", "Stable source reads and immutable portal issue creation"),
  portalIssue: source("src/lib/client-portal/issue-builder.ts", "Issued sections and row projection construction"),
  portalContract: source("src/lib/client-portal/contracts.ts", "Immutable issued-content contract"),
  portalComposer: source("src/lib/client-portal/composer-service.ts", "Draft section creation, editing, ordering, and composer reads"),
  portalAccess: source("src/lib/client-portal/access-service.ts", "Current access-on/off mutation; archived portals are recognized but cannot be changed here"),
  portalPublic: source("src/lib/client-portal/public-repository.ts", "Recipient-safe reads of current immutable issue content"),
  portalThreads: source("src/lib/client-portal/thread-repository.ts", "Issue-scoped discussions, messages, authorization, and activity facts"),
  decision: source("src/lib/client-portal/decision-service.ts", "Client decision guards, audit events, and owner notifications"),
  realtime: source("src/hooks/use-estimate-row-update-broadcast.ts", "Current row-update broadcast boundary; deletion waits for refresh"),
  templateUi: source("src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts", "Explicit saved-snapshot confirmation and retry flow in the estimate editor"),
} as const;

const nodes = ([
  {
    id: "library-component", title: "Library component", kind: "definition", stageId: "reuse", x: 120, y: 120,
    summary: "A workspace-wide reusable component definition.",
    plainLanguage: "The shared master component. Editing it can reach still-linked rows in more than one project.",
    scope: "Workspace", status: "current", pageIds: ["component-library"], featureIds: ["use-components"], tags: ["shared", "component", "crud"], sources: [sources.library],
  },
  {
    id: "library-variant", title: "Library variant", kind: "definition", stageId: "reuse", x: 120, y: 280,
    summary: "A stable reusable option belonging to one Library component.",
    plainLanguage: "A named version of a component, with its own cost and descriptive fields.",
    scope: "Workspace", status: "current", pageIds: ["component-library"], featureIds: ["select-variants"], tags: ["shared", "variant"], sources: [sources.library],
  },
  {
    id: "estimate-template", title: "Estimate template", kind: "definition", stageId: "reuse", x: 120, y: 440,
    summary: "A reusable blueprint for estimate structure and rows.",
    plainLanguage: "A starting pattern. Inserting it creates fresh estimate records rather than a permanent live link.",
    scope: "Workspace", status: "current", pageIds: ["templates", "template-editor"], featureIds: ["reuse-templates"], tags: ["template", "copy"], sources: [sources.estimates, sources.persistence],
  },
  {
    id: "project-component", title: "Project component identity", kind: "definition", stageId: "reuse", x: 120, y: 600,
    summary: "A shared component identity bounded to one project.",
    plainLanguage: "Rows in the same project can share it; the identity never silently fans out to another project.",
    scope: "Project", status: "current", pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components"], tags: ["project", "shared", "boundary"], sources: [sources.projection, sources.persistence],
  },
  {
    id: "source-receipt", title: "Source receipt and revision", kind: "boundary", stageId: "reuse", x: 120, y: 760,
    summary: "Source identity, version, link state, and revision facts carried by a row.",
    plainLanguage: "The safety label that says where a row came from and whether it is still cleanly linked or locally overridden.",
    scope: "Row and source", status: "current", pageIds: ["estimate-workspace"], featureIds: ["use-components", "select-variants"], tags: ["guard", "revision", "receipt"], sources: [sources.estimates, sources.library],
  },
  {
    id: "project", title: "Project", kind: "structure", stageId: "author", x: 430, y: 80,
    summary: "The job-level container for estimates, people, data, and client work.",
    plainLanguage: "Everything for one job lives under this container.",
    scope: "Project", status: "current", pageIds: ["project-data", "estimate-list"], featureIds: ["review-project-data", "organize-estimate"], tags: ["container"], sources: [sources.estimates],
  },
  {
    id: "estimate", title: "Estimate", kind: "structure", stageId: "author", x: 430, y: 220,
    summary: "The live authoring record for one body of estimated work.",
    plainLanguage: "This is the editable source. Client publications are copies of it at a point in time.",
    scope: "Project", status: "current", pageIds: ["estimate-list", "estimate-workspace"], featureIds: ["organize-estimate"], tags: ["live-source", "crud"], sources: [sources.estimates, sources.persistence],
  },
  {
    id: "estimate-structure", title: "Tab, area, or group", kind: "structure", stageId: "author", x: 430, y: 380,
    summary: "An ordered hierarchy node that contains branches and estimate rows.",
    plainLanguage: "The folders and headings that give the estimate its shape.",
    scope: "Estimate", status: "current", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], tags: ["hierarchy", "structure"], sources: [sources.estimates, sources.persistence],
  },
  {
    id: "estimate-row", title: "Estimate row", kind: "instance", stageId: "author", x: 430, y: 540,
    summary: "A placed, revisioned line item with row-local quantity, costs, adjustments, and selected variant.",
    plainLanguage: "One priced item in the live estimate. Deleting it does not rewrite an already-issued client copy.",
    scope: "Estimate", status: "current", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate", "use-components", "select-variants"], tags: ["instance", "row", "crud"], sources: [sources.estimates, sources.persistence, sources.rowUi],
  },
  {
    id: "selected-variant", title: "Selected row variant", kind: "instance", stageId: "author", x: 430, y: 700,
    summary: "The stable variant identity selected by one estimate row.",
    plainLanguage: "This choice belongs to the row. Selecting V-2 does not edit the shared V-2 definition.",
    scope: "Row", status: "current", pageIds: ["estimate-workspace"], featureIds: ["select-variants"], tags: ["row-owned", "variant"], sources: [sources.estimates, sources.rowUi],
  },
  {
    id: "history-event", title: "History event", kind: "event", stageId: "author", x: 430, y: 860,
    summary: "An auditable before/after record for a live mutation.",
    plainLanguage: "The paper trail. Destructive row and structure actions keep enough prior state for supported undo paths.",
    scope: "Estimate", status: "current", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], tags: ["history", "undo"], sources: [sources.persistence],
  },
  {
    id: "projection-cache", title: "Editor projection and query cache", kind: "boundary", stageId: "author", x: 430, y: 1020,
    summary: "Client-side and projected views refreshed after source mutations.",
    plainLanguage: "Other screens usually catch up through invalidation or refresh. A row delete is not currently broadcast as a guaranteed live delete to another open editor.",
    scope: "Open session", status: "partial", pageIds: ["estimate-workspace", "component-library"], featureIds: ["organize-estimate", "use-components"], tags: ["refresh", "realtime", "partial"], sources: [sources.realtime, sources.projection],
  },
  {
    id: "row-total", title: "Row total", kind: "calculation", stageId: "calculate", x: 740, y: 300,
    summary: "The derived total for one estimate row.",
    plainLanguage: "Quantity, unit cost, miscellaneous cost, contingency, and row adjustment flow into this number.",
    scope: "Row", status: "current", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], tags: ["derived", "money"], sources: [sources.totals],
  },
  {
    id: "sheet-adjustment", title: "Sheet adjustment", kind: "calculation", stageId: "calculate", x: 740, y: 500,
    summary: "Estimate-level contingency or discount persisted on the sheet.",
    plainLanguage: "A whole-sheet adjustment. It is separate from the adjustment stored on an individual row.",
    scope: "Estimate", status: "current", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], tags: ["input", "money"], sources: [sources.persistence, sources.totals],
  },
  {
    id: "estimate-total", title: "Estimate and proposal total", kind: "calculation", stageId: "calculate", x: 740, y: 700,
    summary: "The rolled-up financial result used by authoring and publication contexts.",
    plainLanguage: "The sum after current rows and applicable sheet or proposal adjustments are evaluated.",
    scope: "Estimate or proposal", status: "current", pageIds: ["estimate-workspace", "portal-control", "client-review"], featureIds: ["organize-estimate", "publish-client-portal", "review-and-decide"], tags: ["derived", "rollup"], sources: [sources.totals, sources.portalIssue],
  },
  {
    id: "legacy-snapshot", title: "Legacy publication snapshot", kind: "snapshot", stageId: "issue", x: 1050, y: 100,
    summary: "The serialized public-safe copy stored for the older shared-link flow.",
    plainLanguage: "A historical copy. Later edits to the live estimate do not change it; republishing creates a replacement snapshot.",
    scope: "Legacy publication", status: "legacy", pageIds: ["share-overview"], featureIds: ["publish-client-portal"], tags: ["immutable-copy", "legacy"], sources: [sources.legacyPublish, sources.legacyRead],
  },
  {
    id: "legacy-token", title: "Legacy public token", kind: "boundary", stageId: "issue", x: 1050, y: 240,
    summary: "The access key for a stored legacy publication.",
    plainLanguage: "The older public link points to the stored snapshot, not to live estimate rows.",
    scope: "Legacy public access", status: "legacy", pageIds: ["share-overview", "client-review"], featureIds: ["publish-client-portal"], tags: ["token", "legacy"], sources: [sources.legacyPublish, sources.legacyRead],
  },
  {
    id: "portal-draft", title: "Portal draft", kind: "instance", stageId: "issue", x: 1050, y: 400,
    summary: "Internal composition and recipient state before a new issue is published.",
    plainLanguage: "The preparation room. Editors can change it before issuing a client-visible version.",
    scope: "Client Portal", status: "current", pageIds: ["portal-control"], featureIds: ["publish-client-portal"], tags: ["draft", "internal"], sources: [sources.portalComposer],
  },
  {
    id: "portal-issue", title: "Current Portal issue", kind: "snapshot", stageId: "issue", x: 1050, y: 560,
    summary: "The current immutable client-visible issue.",
    plainLanguage: "A numbered, frozen client package. Source edits require another publication to create a new issue.",
    scope: "Portal issue", status: "current", pageIds: ["portal-control", "client-review"], featureIds: ["publish-client-portal", "review-and-decide"], tags: ["immutable-copy", "current-issue"], sources: [sources.portalPublish, sources.portalContract],
  },
  {
    id: "prior-portal-issue", title: "Prior Portal issue", kind: "snapshot", stageId: "issue", x: 1050, y: 720,
    summary: "An earlier immutable issue retained after a newer issue becomes current.",
    plainLanguage: "The previous client package remains historical; it is marked superseded rather than rewritten.",
    scope: "Portal issue history", status: "current", pageIds: ["portal-control", "client-review"], featureIds: ["publish-client-portal", "review-and-decide"], tags: ["immutable-copy", "superseded"], sources: [sources.portalPublish, sources.portalContract],
  },
  {
    id: "issued-row-projection", title: "Issued row projection", kind: "snapshot", stageId: "issue", x: 1050, y: 880,
    summary: "A public-safe row copied into a Portal issue section.",
    plainLanguage: "What the client sees for one row in that issue. It stays as issued even if the live row changes or is deleted.",
    scope: "Portal issue", status: "current", pageIds: ["client-review"], featureIds: ["review-and-decide"], tags: ["row-copy", "public-safe"], sources: [sources.portalIssue, sources.portalContract],
  },
  {
    id: "stable-portal-token", title: "Stable Portal token", kind: "boundary", stageId: "issue", x: 1050, y: 1040,
    summary: "A durable public route that resolves the currently accessible Portal issue.",
    plainLanguage: "The link can remain stable while a new numbered issue becomes current behind it.",
    scope: "Portal access", status: "current", pageIds: ["portal-control", "client-review"], featureIds: ["publish-client-portal", "review-and-decide"], tags: ["token", "access"], sources: [sources.portalPublish, sources.portalAccess, sources.portalPublic],
  },
  {
    id: "portal-access-state", title: "Portal access state", kind: "boundary", stageId: "issue", x: 1050, y: 1200,
    summary: "The Client Portal record state and credential version that control recipient availability.",
    plainLanguage: "The access switch for the Portal. Turning it off blocks the stable link without rewriting the immutable issue behind it.",
    scope: "Client Portal", status: "current", pageIds: ["portal-control", "portal-list"], featureIds: ["publish-client-portal"], tags: ["access", "credential", "lifecycle"], sources: [sources.portalAccess, sources.portalPublic],
  },
  {
    id: "public-review-page", title: "Public review page", kind: "surface", stageId: "review", x: 1360, y: 300,
    summary: "The client-facing read, discussion, and decision surface.",
    plainLanguage: "The client reads issued content here. The page never edits the source estimate directly.",
    scope: "Portal recipient", status: "current", pageIds: ["client-review"], featureIds: ["review-and-decide"], tags: ["client", "read-only-source"], sources: [sources.legacyRead, sources.portalPublic, sources.portalContract],
  },
  {
    id: "discussion", title: "Discussion", kind: "event", stageId: "review", x: 1360, y: 500,
    summary: "Issue-local client and internal conversation.",
    plainLanguage: "Comments belong to the review lifecycle; they do not rewrite estimate rows.",
    scope: "Portal issue", status: "current", pageIds: ["portal-control", "client-review"], featureIds: ["review-and-decide", "publish-client-portal"], tags: ["conversation", "issue-local"], sources: [sources.portalThreads, sources.portalContract],
  },
  {
    id: "client-decision", title: "Client decision", kind: "event", stageId: "review", x: 1360, y: 700,
    summary: "An approval, decline, or request-for-changes recorded against one issue.",
    plainLanguage: "The response is tied to exactly what was issued, protected by the issue content hash.",
    scope: "Portal issue and recipient", status: "current", pageIds: ["client-review", "portal-control"], featureIds: ["review-and-decide", "publish-client-portal"], tags: ["decision", "guarded"], sources: [sources.decision],
  },
  {
    id: "activity-notification", title: "Activity and notification", kind: "event", stageId: "review", x: 1360, y: 900,
    summary: "The audit trail and owner-facing signal created by review events.",
    plainLanguage: "A decision creates an activity fact and a notification so the internal team can respond.",
    scope: "Client Portal", status: "current", pageIds: ["portal-control"], featureIds: ["publish-client-portal"], tags: ["audit", "notification"], sources: [sources.decision],
  },
] satisfies readonly Omit<EstimateSystemKnowledgeNode, "confidence">[]).map((node) => ({
  ...node,
  confidence: node.status === "partial" ? "medium" as const : "high" as const,
}));

const baseRelations = ([
  { id: "project-materializes-estimate", fromId: "project", toId: "estimate", effect: "materializes", label: "creates a live estimate", explanation: "Create and duplicate actions make a new estimate identity under the project.", status: "current", timing: "When the server action succeeds", operationIds: ["create-estimate", "duplicate-estimate"], sources: [sources.estimates] },
  { id: "estimate-contains-structure", fromId: "estimate", toId: "estimate-structure", effect: "contains", label: "contains its hierarchy", explanation: "Tabs, areas, and groups are owned by the live estimate.", status: "current", timing: "Immediately after creation or copy", operationIds: ["create-estimate", "duplicate-estimate"], sources: [sources.estimates, sources.persistence] },
  { id: "estimate-contains-rows", fromId: "estimate", toId: "estimate-row", effect: "contains", label: "contains copied rows", explanation: "Duplication deep-copies rows under new estimate identities.", status: "current", timing: "During duplication", operationIds: ["duplicate-estimate"], sources: [sources.estimates] },
  { id: "estimate-deletes-live", fromId: "project", toId: "estimate", effect: "deletes", label: "removes the live estimate", explanation: "Guarded cascade deletion removes the selected estimate and its dependent live records.", status: "guarded", timing: "After preview-hash verification", operationIds: ["delete-estimate"], sources: [sources.persistence] },
  { id: "estimate-keeps-legacy", fromId: "estimate", toId: "legacy-snapshot", effect: "keeps-unchanged", label: "does not rewrite legacy history", explanation: "Deleting live source records does not mutate the already-stored legacy snapshot.", status: "boundary", timing: "After live deletion", operationIds: ["delete-estimate"], sources: [sources.persistence, sources.legacyRead] },
  { id: "estimate-keeps-portal", fromId: "estimate", toId: "portal-issue", effect: "keeps-unchanged", label: "does not rewrite issued content", explanation: "An already-issued Portal package remains immutable after source deletion.", status: "boundary", timing: "After live deletion", operationIds: ["delete-estimate"], sources: [sources.portalContract] },
  { id: "structure-contains-row", fromId: "estimate-structure", toId: "estimate-row", effect: "contains", label: "places rows in a branch", explanation: "Each live row belongs at a specific hierarchy location.", status: "current", timing: "While authoring", operationIds: ["delete-structure", "move-estimate-row"], sources: [sources.persistence] },
  { id: "structure-deletes-descendants", fromId: "estimate-structure", toId: "estimate-row", effect: "deletes", label: "removes descendant rows", explanation: "Deleting a hierarchy node removes its descendant subtree and contained live rows.", status: "guarded", timing: "After structure revision checks", operationIds: ["delete-structure"], sources: [sources.persistence] },
  { id: "structure-records-history", fromId: "estimate-structure", toId: "history-event", effect: "records", label: "stores a restorable snapshot", explanation: "The deleted subtree and its rows are captured in history for supported restoration.", status: "current", timing: "In the same mutation", operationIds: ["delete-structure"], sources: [sources.persistence] },
  { id: "row-recalculates-total", fromId: "estimate-row", toId: "row-total", effect: "recalculates", label: "recalculates row money", explanation: "A saved row change, variant choice, insertion, replacement, deletion, restoration, or shared-field update changes the derived row result.", status: "current", timing: "Optimistically, then from persisted state", operationIds: ["edit-estimate-row", "delete-estimate-row", "restore-estimate-row", "select-row-variant", "edit-project-component", "edit-library-component", "row-insert-library", "row-replace", "row-bulk-delete", "project-component-remove-replace-variant", "library-variant-edit", "library-variant-remove"], sources: [sources.totals, sources.rowUi] },
  { id: "row-records-history", fromId: "estimate-row", toId: "history-event", effect: "records", label: "records the mutation", explanation: "Row mutations keep before/after or deletion facts in estimate history.", status: "current", timing: "With the persisted mutation", operationIds: ["edit-estimate-row", "move-estimate-row", "delete-estimate-row", "restore-estimate-row", "select-row-variant", "edit-project-component"], sources: [sources.persistence] },
  { id: "row-refreshes-projection", fromId: "estimate-row", toId: "projection-cache", effect: "refreshes", label: "refreshes open projections", explanation: "Successful mutations update or invalidate client projections and query state.", status: "current", timing: "After success", operationIds: ["edit-estimate-row", "move-estimate-row", "restore-estimate-row", "select-row-variant"], sources: [sources.rowUi, sources.projection] },
  { id: "structure-changes-placement", fromId: "estimate-structure", toId: "estimate-row", effect: "changes", label: "changes row placement", explanation: "Moving a row changes its hierarchy parent or order without changing the row identity.", status: "guarded", timing: "After destination validation", operationIds: ["move-estimate-row"], sources: [sources.estimates, sources.persistence] },
  { id: "row-delete-live", fromId: "estimate-structure", toId: "estimate-row", effect: "deletes", label: "deletes the live row", explanation: "The editor removes the row optimistically and persistence deletes it after a row-revision guard.", status: "guarded", timing: "Optimistically, then persisted", operationIds: ["delete-estimate-row"], sources: [sources.rowUi, sources.persistence] },
  { id: "row-keeps-legacy", fromId: "estimate-row", toId: "legacy-snapshot", effect: "keeps-unchanged", label: "leaves the old shared link unchanged", explanation: "The stored legacy publication still contains the previously issued row until republish creates a replacement snapshot.", status: "boundary", timing: "After live row deletion", operationIds: ["delete-estimate-row"], sources: [sources.legacyPublish, sources.legacyRead] },
  { id: "row-keeps-portal", fromId: "estimate-row", toId: "issued-row-projection", effect: "keeps-unchanged", label: "leaves issued rows unchanged", explanation: "The row projection in an already-issued Portal package remains exactly as issued.", status: "boundary", timing: "After live row deletion", operationIds: ["delete-estimate-row"], sources: [sources.portalContract, sources.portalIssue] },
  { id: "delete-refresh-partial", fromId: "estimate-row", toId: "projection-cache", effect: "refreshes", label: "needs refresh in another editor", explanation: "Current realtime row updates do not carry a guaranteed delete semantic, so another open editor may retain the row until refetch.", status: "partial", timing: "On invalidation or later refresh", operationIds: ["delete-estimate-row"], sources: [sources.realtime] },
  { id: "history-restores-row", fromId: "history-event", toId: "estimate-row", effect: "restores", label: "restores deleted row state", explanation: "Undo recreates the canonical row from its stored history snapshot.", status: "guarded", timing: "When Undo succeeds", operationIds: ["restore-estimate-row"], sources: [sources.persistence, sources.rowUi] },
  { id: "variant-defines-selection", fromId: "library-variant", toId: "selected-variant", effect: "defines", label: "provides the selectable option", explanation: "The Library owns the shared variant definition and stable identity.", status: "current", timing: "Before selection", operationIds: ["select-row-variant"], sources: [sources.library] },
  { id: "selection-selects-row", fromId: "selected-variant", toId: "estimate-row", effect: "selects", label: "belongs to one row", explanation: "Changing the selected variant updates row-owned estimate state, not the shared definition.", status: "guarded", timing: "When the row save succeeds", operationIds: ["select-row-variant"], sources: [sources.estimates, sources.rowUi] },
  { id: "project-component-projects-row", fromId: "project-component", toId: "estimate-row", effect: "projects", label: "appears as project rows", explanation: "Rows carrying the same project component identity form project-bounded instances.", status: "current", timing: "While the identity is present", operationIds: ["edit-project-component", "localize-component"], sources: [sources.projection] },
  { id: "project-component-sync-row", fromId: "project-component", toId: "estimate-row", effect: "synchronizes", label: "updates eligible project rows", explanation: "A project component edit fans shared fields out to eligible rows with that identity inside the project.", status: "guarded", timing: "In the guarded component mutation", operationIds: ["edit-project-component"], sources: [sources.persistence, sources.projection] },
  { id: "library-defines-variant", fromId: "library-component", toId: "library-variant", effect: "defines", label: "owns shared variants", explanation: "Library component versions include their reusable variant graph.", status: "current", timing: "At Library version creation", operationIds: ["edit-library-component", "delete-library-component"], sources: [sources.library] },
  { id: "library-sync-project", fromId: "library-component", toId: "project-component", effect: "synchronizes", label: "refreshes still-linked source facts", explanation: "A new Library version advances source/version facts for still-linked project usage.", status: "guarded", timing: "After impact fingerprint verification", operationIds: ["edit-library-component"], sources: [sources.library] },
  { id: "library-sync-row", fromId: "library-component", toId: "estimate-row", effect: "synchronizes", label: "updates linked-clean rows", explanation: "Still-clean linked rows receive the new visible shared values.", status: "guarded", timing: "In the Library update transaction", operationIds: ["edit-library-component", "promote-project-component"], sources: [sources.library, sources.promotion] },
  { id: "library-keeps-overrides", fromId: "library-component", toId: "estimate-row", effect: "keeps-unchanged", label: "preserves local visible overrides", explanation: "Linked-overridden rows keep their local visible fields while source receipt and version facts advance.", status: "boundary", timing: "During Library synchronization", operationIds: ["edit-library-component"], sources: [sources.library] },
  { id: "library-deletes-row", fromId: "library-component", toId: "estimate-row", effect: "deletes", label: "removes linked live rows", explanation: "Permanent Library deletion removes dependent linked estimate usage reported by preview.", status: "guarded", timing: "After preview-hash confirmation", operationIds: ["delete-library-component"], sources: [sources.library] },
  { id: "library-deletes-template", fromId: "library-component", toId: "estimate-template", effect: "deletes", label: "removes linked template usage", explanation: "Permanent deletion also removes linked template usage before deleting the shared definition.", status: "guarded", timing: "In the deletion cascade", operationIds: ["delete-library-component"], sources: [sources.library] },
  { id: "template-materializes-structure", fromId: "estimate-template", toId: "estimate-structure", effect: "materializes", label: "copies fresh structure", explanation: "Template insertion creates new destination hierarchy identities.", status: "current", timing: "During template insertion", operationIds: ["insert-template"], sources: [sources.estimates, sources.persistence] },
  { id: "template-materializes-row", fromId: "estimate-template", toId: "estimate-row", effect: "materializes", label: "copies fresh rows", explanation: "Template row content is copied into fresh destination row identities without a lasting live template link.", status: "boundary", timing: "During template insertion", operationIds: ["insert-template"], sources: [sources.estimates, sources.persistence] },
  { id: "adjustment-recalculates-total", fromId: "sheet-adjustment", toId: "estimate-total", effect: "recalculates", label: "changes the sheet rollup", explanation: "Persisted sheet contingency or discount changes the current estimate total.", status: "current", timing: "After adjustment save", operationIds: ["set-sheet-adjustment"], sources: [sources.persistence, sources.totals] },
  { id: "adjustment-records-history", fromId: "sheet-adjustment", toId: "history-event", effect: "records", label: "records the adjustment", explanation: "The sheet-level financial mutation is written with estimate history.", status: "current", timing: "In the same mutation", operationIds: ["set-sheet-adjustment"], sources: [sources.persistence] },
  { id: "estimate-snapshots-legacy", fromId: "estimate", toId: "legacy-snapshot", effect: "snapshots", label: "builds a legacy public copy", explanation: "Publish or republish serializes current source into stored public-safe snapshot JSON.", status: "current", timing: "At publish time", operationIds: ["publish-legacy-link"], sources: [sources.legacyPublish] },
  { id: "legacy-snapshot-serves-token", fromId: "legacy-snapshot", toId: "legacy-token", effect: "serves", label: "is addressed by the token", explanation: "The legacy access token resolves the stored publication record.", status: "current", timing: "On public request", operationIds: ["publish-legacy-link"], sources: [sources.legacyRead] },
  { id: "legacy-token-serves-review", fromId: "legacy-token", toId: "public-review-page", effect: "serves", label: "opens the legacy review", explanation: "The public route sanitizes and renders the stored legacy snapshot.", status: "current", timing: "On link open", operationIds: ["publish-legacy-link"], sources: [sources.legacyRead] },
  { id: "estimate-snapshots-issue", fromId: "estimate", toId: "portal-issue", effect: "snapshots", label: "copies stable source into an issue", explanation: "Portal publication reads source until a stable fingerprint is observed, then builds immutable issue content.", status: "guarded", timing: "At issue publication", operationIds: ["issue-client-portal"], sources: [sources.portalPublish] },
  { id: "draft-snapshots-issue", fromId: "portal-draft", toId: "portal-issue", effect: "snapshots", label: "issues the prepared package", explanation: "The prepared Portal configuration and selected source become a numbered client-visible issue.", status: "guarded", timing: "When Publish succeeds", operationIds: ["issue-client-portal"], sources: [sources.portalPublish] },
  { id: "issue-contains-projection", fromId: "portal-issue", toId: "issued-row-projection", effect: "contains", label: "contains immutable row projections", explanation: "Issued sections own public-safe copies of the selected estimate rows.", status: "current", timing: "For the lifetime of the issue", operationIds: ["issue-client-portal"], sources: [sources.portalIssue, sources.portalContract] },
  { id: "issue-supersedes-prior", fromId: "portal-issue", toId: "prior-portal-issue", effect: "supersedes", label: "becomes current without rewriting history", explanation: "A new issue advances the current pointer and marks the prior issue superseded.", status: "current", timing: "When the new issue is committed", operationIds: ["issue-client-portal"], sources: [sources.portalPublish] },
  { id: "token-serves-issue", fromId: "stable-portal-token", toId: "portal-issue", effect: "serves", label: "resolves the accessible issue", explanation: "The stable Portal link resolves the current issue allowed for that recipient.", status: "guarded", timing: "On recipient access", operationIds: ["issue-client-portal"], sources: [sources.portalContract] },
  { id: "issue-serves-review", fromId: "portal-issue", toId: "public-review-page", effect: "serves", label: "renders the client package", explanation: "The public review page reads immutable issue content rather than live estimate state.", status: "boundary", timing: "On recipient access", operationIds: ["issue-client-portal", "record-client-decision"], sources: [sources.portalContract] },
  { id: "review-records-decision", fromId: "public-review-page", toId: "client-decision", effect: "records", label: "records a response to this issue", explanation: "An authorized recipient submits one guarded decision against the issue content hash.", status: "guarded", timing: "On decision submission", operationIds: ["record-client-decision"], sources: [sources.decision] },
  { id: "decision-notifies-activity", fromId: "client-decision", toId: "activity-notification", effect: "notifies", label: "creates audit and owner signals", explanation: "Decision persistence also writes audit and analytics events and schedules an owner notification.", status: "current", timing: "In the decision transaction", operationIds: ["record-client-decision"], sources: [sources.decision] },
  { id: "review-keeps-source", fromId: "client-decision", toId: "estimate", effect: "keeps-unchanged", label: "does not edit the source estimate", explanation: "A client decision changes Portal lifecycle records, not estimate rows or totals.", status: "boundary", timing: "After submission", operationIds: ["record-client-decision"], sources: [sources.decision] },
  { id: "library-localizes-project", fromId: "library-component", toId: "project-component", effect: "localizes", label: "creates a project-bounded copy", explanation: "Make project-specific removes the Library link and keeps editable component facts inside the project boundary.", status: "guarded", timing: "When the row mutation succeeds", operationIds: ["localize-component"], sources: [sources.rowUi, sources.projection] },
  { id: "project-promotes-library", fromId: "project-component", toId: "library-component", effect: "promotes", label: "creates a shared Library definition", explanation: "An eligible project component can be promoted into a workspace Library item under access and idempotency guards.", status: "guarded", timing: "When promotion succeeds", operationIds: ["promote-project-component"], sources: [sources.promotion] },
  { id: "receipt-guards-row", fromId: "source-receipt", toId: "estimate-row", effect: "guards", label: "guards stale row and source writes", explanation: "Row revision, source version, and impact receipts prevent stale or wrongly scoped mutations.", status: "guarded", timing: "Before persistence", operationIds: ["edit-estimate-row", "delete-estimate-row", "restore-estimate-row", "select-row-variant", "edit-project-component", "edit-library-component", "localize-component", "promote-project-component"], sources: [sources.estimates, sources.library, sources.promotion] },
  { id: "issue-fingerprint-guard", fromId: "source-receipt", toId: "portal-issue", effect: "guards", label: "requires a stable source fingerprint", explanation: "Publication retries source reads until the content fingerprint is stable before issuing.", status: "guarded", timing: "Immediately before issue creation", operationIds: ["issue-client-portal"], sources: [sources.portalPublish] },
  { id: "estimate-opens-editor", fromId: "estimate", toId: "projection-cache", effect: "serves", label: "loads the live editor", explanation: "Opening an estimate reads the current hierarchy, rows, and revision facts into the authoring view.", status: "current", timing: "On estimate open or refresh", operationIds: ["estimate-read-open"], sources: [sources.estimates, sources.rowUi] },
  { id: "estimate-manages-structure", fromId: "estimate", toId: "estimate-structure", effect: "changes", label: "creates and orders hierarchy", explanation: "Structure actions create, rename, reorder, or duplicate hierarchy records inside one estimate.", status: "guarded", timing: "After hierarchy validation", operationIds: ["structure-create", "structure-rename", "structure-reorder", "structure-duplicate-tab"], sources: [sources.estimates, sources.persistence] },
  { id: "history-restores-structure", fromId: "history-event", toId: "estimate-structure", effect: "restores", label: "restores a deleted subtree", explanation: "A supported restore recreates the saved hierarchy and contained rows from deletion history.", status: "guarded", timing: "When restore succeeds", operationIds: ["structure-restore"], sources: [sources.persistence] },
  { id: "structure-creates-blank-row", fromId: "estimate-structure", toId: "estimate-row", effect: "materializes", label: "creates a blank row", explanation: "Adding a blank row creates one editable row identity at the chosen hierarchy location.", status: "current", timing: "On successful insertion", operationIds: ["row-create-blank"], sources: [sources.estimates, sources.persistence] },
  { id: "library-materializes-row", fromId: "library-component", toId: "estimate-row", effect: "materializes", label: "inserts a linked row", explanation: "Library insertion creates a row with stable source and variant receipts instead of editing the Library definition.", status: "guarded", timing: "On successful insertion", operationIds: ["row-insert-library"], sources: [sources.estimates, sources.library] },
  { id: "row-serves-editor", fromId: "estimate-row", toId: "projection-cache", effect: "serves", label: "appears in the editor", explanation: "Reading a row exposes its current persisted values and revision without mutating them.", status: "current", timing: "On estimate read", operationIds: ["row-read"], sources: [sources.estimates, sources.rowUi] },
  { id: "row-replaces-component", fromId: "project-component", toId: "estimate-row", effect: "changes", label: "replaces the placed component", explanation: "Replacement keeps the row position while changing its component or variant identity through an explicit guarded action.", status: "guarded", timing: "On replacement success", operationIds: ["row-replace"], sources: [sources.estimates, sources.rowUi] },
  { id: "structure-bulk-deletes-rows", fromId: "estimate-structure", toId: "estimate-row", effect: "deletes", label: "deletes selected live rows", explanation: "Bulk deletion removes the selected row identities together and records their live estimate effects.", status: "guarded", timing: "After selection and revision checks", operationIds: ["row-bulk-delete"], sources: [sources.rowUi, sources.persistence] },
  { id: "project-reuses-component", fromId: "project-component", toId: "estimate-row", effect: "materializes", label: "reuses within one project", explanation: "The same project-bounded identity may create eligible row instances only inside its project.", status: "current", timing: "When inserted or reused", operationIds: ["project-component-reuse"], sources: [sources.projection, sources.persistence] },
  { id: "project-replaces-used-variant", fromId: "project-component", toId: "selected-variant", effect: "changes", label: "replaces a variant in use", explanation: "Removing a used project variant requires an explicit replacement so affected project rows retain a valid selection.", status: "guarded", timing: "After impact confirmation", operationIds: ["project-component-remove-replace-variant"], sources: [sources.persistence, sources.projection] },
  { id: "library-component-lifecycle", fromId: "library-component", toId: "library-variant", effect: "defines", label: "manages reusable definitions", explanation: "Create and archive change the reusable component lifecycle; read exposes the current version without mutation.", status: "current", timing: "On the requested Library action", operationIds: ["library-component-create", "library-component-read", "library-component-archive"], sources: [sources.library] },
  { id: "library-variant-lifecycle", fromId: "library-component", toId: "library-variant", effect: "changes", label: "manages stable variants", explanation: "Variant actions add, edit, order, choose a default, or guardedly remove stable variant identities.", status: "guarded", timing: "On Library version save", operationIds: ["library-variant-add", "library-variant-edit", "library-variant-reorder", "library-variant-set-default", "library-variant-remove"], sources: [sources.library] },
  { id: "library-variant-removal-remaps-selection", fromId: "library-variant", toId: "selected-variant", effect: "synchronizes", label: "requires an explicit replacement", explanation: "A selected variant cannot disappear silently: the mutation validates a replacement mapping and remaps affected linked-row selections.", status: "guarded", timing: "During the Library version mutation", operationIds: ["library-variant-remove"], sources: [sources.library] },
  { id: "library-variant-removal-updates-row", fromId: "selected-variant", toId: "estimate-row", effect: "changes", label: "rewrites linked-row variant facts", explanation: "Eligible linked rows receive the replacement variant ID, refreshed source snapshot, and a new revision while locally overridden visible fields remain preserved.", status: "guarded", timing: "In the guarded synchronization transaction", operationIds: ["library-variant-remove"], sources: [sources.library] },
  { id: "library-variant-removal-refreshes-receipt", fromId: "library-variant", toId: "source-receipt", effect: "refreshes", label: "advances source and revision receipts", explanation: "Affected linked usage records the new source version, replacement variant, synchronization facts, and updated row revision.", status: "guarded", timing: "In the guarded synchronization transaction", operationIds: ["library-variant-remove"], sources: [sources.library] },
  { id: "template-manages-blueprint", fromId: "estimate-template", toId: "estimate-structure", effect: "defines", label: "stores an ordered blueprint", explanation: "Template editing changes the reusable blueprint; reordering and deletion affect the template, not copies already inserted into estimates.", status: "guarded", timing: "On template save or deletion", operationIds: ["template-create-edit", "template-reorder", "template-delete"], sources: [sources.estimates, sources.persistence] },
  { id: "template-fallback-materializes-row", fromId: "estimate-template", toId: "estimate-row", effect: "materializes", label: "uses a saved fallback snapshot", explanation: "When a referenced source is unavailable, guarded insertion may materialize the template's retained row snapshot rather than inventing a live source link.", status: "guarded", timing: "Only during eligible fallback insertion", operationIds: ["template-saved-snapshot-fallback"], sources: [sources.estimates, sources.persistence] },
  { id: "row-inputs-recalculate-total", fromId: "estimate-row", toId: "row-total", effect: "recalculates", label: "derives the row amount", explanation: "Quantity, unit cost, miscellaneous cost, contingency, and row adjustment feed the canonical row calculation.", status: "current", timing: "Immediately after an input changes", operationIds: ["charges-edit-row-inputs"], sources: [sources.totals, sources.rowUi] },
  { id: "row-total-rolls-up-estimate", fromId: "row-total", toId: "estimate-total", effect: "recalculates", label: "rolls into estimate totals", explanation: "Canonical row totals aggregate into the current sheet and proposal calculation contexts.", status: "current", timing: "Whenever live inputs or applicable adjustments change", operationIds: ["edit-estimate-row", "delete-estimate-row", "restore-estimate-row", "select-row-variant", "edit-project-component", "edit-library-component", "row-insert-library", "row-replace", "row-bulk-delete", "project-component-remove-replace-variant", "library-variant-edit", "library-variant-remove", "charges-edit-row-inputs", "charges-derive-totals"], sources: [sources.totals, sources.portalIssue] },
  { id: "legacy-read-serves-snapshot", fromId: "legacy-snapshot", toId: "public-review-page", effect: "serves", label: "reads the stored legacy copy", explanation: "The legacy public route sanitizes and renders snapshot JSON rather than querying live estimate rows.", status: "boundary", timing: "On public link open", operationIds: ["legacy-publication-read"], sources: [sources.legacyRead] },
  { id: "legacy-token-revokes-access", fromId: "legacy-token", toId: "public-review-page", effect: "guards", label: "can stop public access", explanation: "Revocation makes the legacy token unavailable without rewriting the stored historical snapshot.", status: "guarded", timing: "After revocation", operationIds: ["legacy-publication-revoke"], sources: [sources.legacyPublish, sources.legacyRead] },
  { id: "estimate-composes-portal-draft", fromId: "estimate", toId: "portal-draft", effect: "changes", label: "prepares draft sections", explanation: "Composer actions select source and save ordered internal section drafts before publication.", status: "guarded", timing: "While composing", operationIds: ["portal-draft"], sources: [sources.portalComposer] },
  { id: "portal-read-serves-issue", fromId: "portal-issue", toId: "public-review-page", effect: "serves", label: "reads immutable issued content", explanation: "Authorized public reads resolve the current accessible issue and return its frozen sections and row projections.", status: "boundary", timing: "On recipient access", operationIds: ["portal-read-issued-content"], sources: [sources.portalPublic, sources.portalContract] },
  { id: "portal-access-controls-token", fromId: "portal-access-state", toId: "stable-portal-token", effect: "guards", label: "turns recipient access on or off", explanation: "The current access action updates the Client Portal status and access credential version that the stable public route checks.", status: "guarded", timing: "After the guarded access mutation", operationIds: ["portal-withdraw-archive"], sources: [sources.portalAccess, sources.portalPublic] },
  { id: "portal-withdraw-archive-gap", fromId: "portal-access-state", toId: "portal-issue", effect: "keeps-unchanged", label: "does not withdraw or archive the issue", explanation: "Access-off is implemented on the Portal record. Withdrawal and archive statuses are recognized by policy, but this audit did not find a user-facing mutation that applies those states to an issue.", status: "partial", timing: "Access-off is current; withdrawal/archive mutation not located", operationIds: ["portal-withdraw-archive"], sources: [sources.portalAccess, sources.portalContract, sources.portalPublic] },
  { id: "review-records-discussion", fromId: "public-review-page", toId: "discussion", effect: "records", label: "records an issue-scoped thread", explanation: "Authorized recipients create or reply to discussion threads against the current issue and selected target.", status: "guarded", timing: "On thread or message submission", operationIds: ["portal-discuss"], sources: [sources.portalThreads] },
  { id: "discussion-notifies-owner", fromId: "discussion", toId: "activity-notification", effect: "notifies", label: "creates activity and owner signals", explanation: "Discussion writes include audit, analytics, subscription, read-state, and owner-notification facts.", status: "current", timing: "In the discussion transaction", operationIds: ["portal-discuss"], sources: [sources.portalThreads] },
] satisfies readonly Omit<EstimateSystemKnowledgeRelation, "confidence">[]).map((relation) => ({
  ...relation,
  confidence: relation.status === "partial" ? "medium" as const : "high" as const,
}));

const relationIdsFor = (operationId: string) => baseRelations
  .filter((relation) => relation.operationIds.includes(operationId))
  .map((relation) => relation.id);

const effect = (
  title: string,
  description: string,
  nodeId: string,
  scope: string,
  timing: string,
): EstimateSystemKnowledgeImpactItem => ({ title, description, nodeId, scope, timing });

const baseOperations = ([
  {
    id: "create-estimate", title: "Create an estimate", question: "What happens when I create an estimate?", kind: "create", status: "current", actor: "Estimator", entryPoint: "Project > Estimates > Create estimate",
    summary: "Creates a new live estimate plus its initial hierarchy node under the current project.", targetNodeId: "estimate", relatedNodeIds: ["project", "estimate-structure"], relationIds: relationIdsFor("create-estimate"),
    changes: [effect("New estimate identity", "A new editable estimate is stored under the project.", "estimate", "Project", "On save"), effect("Initial structure", "The estimate receives its first tab or root node.", "estimate-structure", "Estimate", "In the same action")],
    unchanged: [effect("Existing estimates", "Other estimates in the project are not modified.", "project", "Project", "Always")],
    guards: ["The user must be allowed to edit the project.", "Required estimate fields are validated."], recovery: ["Delete the new estimate through the guarded delete flow if it was created by mistake."], pageIds: ["estimate-list"], featureIds: ["organize-estimate"], sources: [sources.estimates],
  },
  {
    id: "duplicate-estimate", title: "Duplicate an estimate", question: "What is copied when I duplicate an estimate?", kind: "copy", status: "current", actor: "Estimator", entryPoint: "Project estimate actions > Duplicate",
    summary: "Deep-copies live estimate metadata, structure, rows, and source receipts under fresh destination IDs; it does not duplicate issued client publications.", targetNodeId: "estimate", relatedNodeIds: ["project", "estimate-structure", "estimate-row", "source-receipt"], relationIds: relationIdsFor("duplicate-estimate"),
    changes: [effect("Fresh estimate copy", "A separate editable estimate is created.", "estimate", "Project", "On success"), effect("Fresh child identities", "Copied tabs, hierarchy, and rows receive destination identities.", "estimate-row", "New estimate", "During copy")],
    unchanged: [effect("Original estimate", "The source estimate remains editable and unchanged.", "estimate", "Source estimate", "Always")],
    guards: ["The user must have project edit access.", "The source estimate must still exist."], recovery: ["Delete the duplicate through guarded estimate deletion; the original remains available."], pageIds: ["estimate-list"], featureIds: ["organize-estimate"], sources: [sources.estimates],
  },
  {
    id: "delete-estimate", title: "Delete an estimate", question: "What disappears when I delete an estimate?", kind: "delete", status: "guarded", actor: "Estimator", entryPoint: "Project estimate actions > Delete",
    summary: "Deletes the selected live estimate and dependent live records after a preview-hash guard; historical issued snapshots are not rewritten.", targetNodeId: "estimate", relatedNodeIds: ["project", "legacy-snapshot", "portal-issue"], relationIds: relationIdsFor("delete-estimate"),
    changes: [effect("Live estimate removed", "The estimate and its dependent live authoring records are deleted.", "estimate", "Project", "After confirmation")],
    unchanged: [effect("Legacy publication history", "Previously stored legacy snapshots remain historical copies.", "legacy-snapshot", "Issued copy", "After deletion"), effect("Portal issue history", "Already-issued Portal content stays immutable.", "portal-issue", "Issued copy", "After deletion")],
    guards: ["Deletion requires a current preview hash.", "The cascade is scoped to the selected estimate."], recovery: ["There is no ordinary estimate-level undo; restore from a separate retained copy or recreate the estimate."], pageIds: ["estimate-list"], featureIds: ["organize-estimate"], sources: [sources.persistence],
  },
  {
    id: "delete-structure", title: "Delete a tab, area, or group", question: "What happens to rows inside a structure I delete?", kind: "delete", status: "guarded", actor: "Estimator", entryPoint: "Estimate hierarchy > Delete",
    summary: "Deletes the selected hierarchy subtree and every contained live row while recording restorable history.", targetNodeId: "estimate-structure", relatedNodeIds: ["estimate-row", "history-event"], relationIds: relationIdsFor("delete-structure"),
    changes: [effect("Subtree removed", "The selected node, descendants, and contained rows leave the live estimate.", "estimate-structure", "Estimate", "On success"), effect("Rows removed", "Rows in the deleted subtree stop contributing to live totals.", "estimate-row", "Estimate", "On success")],
    unchanged: [effect("Other branches", "Sibling and ancestor branches outside the subtree remain.", "estimate-structure", "Estimate", "Always")],
    guards: ["The structure revision and valid parent shape are checked."], recovery: ["Use the supported history restoration path while the deletion snapshot is available."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.persistence],
  },
  {
    id: "edit-estimate-row", title: "Edit one estimate row", question: "How far does a normal row edit reach?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Row fields",
    summary: "Updates row-local values, recalculates derived money, records history, and marks an ordinary linked row locally overridden.", targetNodeId: "estimate-row", relatedNodeIds: ["row-total", "estimate-total", "history-event", "projection-cache", "source-receipt"], relationIds: relationIdsFor("edit-estimate-row"),
    changes: [effect("Row-local values", "Quantity, costs, description, or row adjustment change on this row.", "estimate-row", "Row", "Optimistically, then persisted"), effect("Derived total", "The row and sheet rollups recalculate from the new values.", "row-total", "Estimate", "Immediately")],
    unchanged: [effect("Shared Library definition", "A normal row edit does not rewrite the workspace Library component.", "library-component", "Workspace", "Always"), effect("Issued client copies", "Existing snapshots retain their issued values.", "portal-issue", "Issued copy", "Always")],
    guards: ["The expected row revision must match.", "Shared edits use a separate explicit mutation intent."], recovery: ["A failed optimistic save rolls back; later changes can be corrected with another row edit."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate", "use-components"], sources: [sources.estimates, sources.rowUi],
  },
  {
    id: "move-estimate-row", title: "Move an estimate row", question: "What changes when I move a row?", kind: "move", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Move row",
    summary: "Changes the row's hierarchy placement or order while preserving its identity and content.", targetNodeId: "estimate-row", relatedNodeIds: ["estimate-structure", "history-event", "projection-cache"], relationIds: relationIdsFor("move-estimate-row"),
    changes: [effect("Hierarchy placement", "The row is assigned to its validated destination and ordering.", "estimate-structure", "Estimate", "On success")],
    unchanged: [effect("Row identity and pricing", "The same row and its saved values move together.", "estimate-row", "Row", "Always")],
    guards: ["The destination must be valid and the mutation must use current revisions."], recovery: ["A failed move rolls back; move the row back to its prior branch if needed."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.rowUi, sources.persistence],
  },
  {
    id: "delete-estimate-row", title: "Delete an estimate row", question: "If I delete a row, does it disappear from the client page too?", kind: "delete", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Row actions > Delete",
    summary: "Removes the row from live source and totals, but leaves already-published legacy and Portal copies unchanged until a new publication is made.", targetNodeId: "estimate-row", relatedNodeIds: ["estimate-structure", "row-total", "estimate-total", "history-event", "projection-cache", "legacy-snapshot", "issued-row-projection", "source-receipt"], relationIds: relationIdsFor("delete-estimate-row"),
    changes: [effect("Live editor", "The row disappears optimistically; failure restores it.", "estimate-row", "Current editor", "Immediately"), effect("Canonical row contribution", "The persisted row is deleted and no longer contributes its derived row total.", "row-total", "Estimate", "On success"), effect("Estimate and proposal rollup", "The current estimate total recalculates without the deleted row; future publication uses that new live result.", "estimate-total", "Estimate", "On success"), effect("Projection refresh", "Other projections invalidate, but another already-open editor may wait for refetch.", "projection-cache", "Open sessions", "After success")],
    unchanged: [effect("Existing legacy shared link", "Its stored snapshot still contains the issued row until republish.", "legacy-snapshot", "Legacy publication", "After deletion"), effect("Already-issued Portal issue", "Its immutable row projection remains exactly as issued.", "issued-row-projection", "Portal issue", "After deletion")],
    guards: ["The row revision must match the persisted row.", "History stores the deleted row for supported Undo."], recovery: ["Use Undo to restore the canonical row from history; this does not rewrite issued snapshots."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.rowUi, sources.persistence, sources.legacyPublish, sources.portalContract, sources.realtime],
  },
  {
    id: "restore-estimate-row", title: "Undo a row deletion", question: "What does Undo restore after a row deletion?", kind: "restore", status: "guarded", actor: "Estimator", entryPoint: "Deletion success message > Undo",
    summary: "Recreates the canonical live row from its history snapshot and recalculates live projections.", targetNodeId: "estimate-row", relatedNodeIds: ["history-event", "row-total", "estimate-total", "projection-cache", "source-receipt"], relationIds: relationIdsFor("restore-estimate-row"),
    changes: [effect("Live row restored", "The deleted row returns with the stored canonical state.", "estimate-row", "Estimate", "On Undo success"), effect("Totals restored", "The restored row contributes to live calculations again.", "row-total", "Estimate", "Immediately after restoration")],
    unchanged: [effect("Issued copies", "Undo does not retroactively modify either publication family.", "portal-issue", "Issued copy", "Always")],
    guards: ["The restore history snapshot must still be valid and applicable."], recovery: ["If restore is unavailable, recreate the row or reinsert its component manually."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.rowUi, sources.persistence],
  },
  {
    id: "select-row-variant", title: "Select a row variant", question: "Does choosing V-2 edit the shared variant?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Estimate row > Variant selector",
    summary: "Stores one stable variant ID on the row and reloads variant-scoped values without changing the shared variant definition.", targetNodeId: "selected-variant", relatedNodeIds: ["library-variant", "estimate-row", "row-total", "estimate-total", "history-event", "projection-cache", "source-receipt"], relationIds: relationIdsFor("select-row-variant"),
    changes: [effect("Row-owned selection", "The selected variant identity changes for this row.", "selected-variant", "Row", "On save"), effect("Row values and total", "Variant-specific row values and calculations refresh.", "row-total", "Row", "Immediately")],
    unchanged: [effect("Shared variant definition", "The Library variant itself is not edited.", "library-variant", "Workspace", "Always")],
    guards: ["The variant must belong to the component identity and the row revision must match."], recovery: ["Select the previous variant again; failed persistence rolls the optimistic choice back."], pageIds: ["estimate-workspace"], featureIds: ["select-variants"], sources: [sources.estimates, sources.rowUi, sources.library],
  },
  {
    id: "edit-project-component", title: "Edit a Project component", question: "Which rows change when I edit a Project component?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Project components or shared row edit",
    summary: "Updates shared fields for eligible rows carrying the same project component identity, only inside the current project.", targetNodeId: "project-component", relatedNodeIds: ["estimate-row", "row-total", "estimate-total", "history-event", "source-receipt"], relationIds: relationIdsFor("edit-project-component"),
    changes: [effect("Eligible project rows", "Shared fields fan out to rows with the same project component identity.", "estimate-row", "Current project", "In the component mutation"), effect("Live totals", "Affected rows recalculate from changed shared values.", "row-total", "Current project", "Immediately")],
    unchanged: [effect("Other projects", "No project component identity crosses the project boundary.", "project-component", "Other projects", "Always"), effect("Library master", "The workspace Library definition is not changed.", "library-component", "Workspace", "Always")],
    guards: ["The component impact fingerprint and eligible row revisions must be current."], recovery: ["Correct the shared fields with a follow-up Project component edit."], pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components"], sources: [sources.persistence, sources.projection],
  },
  {
    id: "edit-library-component", title: "Edit a Library component", question: "How far does a Library edit fan out?", kind: "update", status: "guarded", actor: "Library steward", entryPoint: "Library > Component editor",
    summary: "Creates a new shared source version and synchronizes still-linked workspace usage while preserving local visible overrides.", targetNodeId: "library-component", relatedNodeIds: ["library-variant", "project-component", "estimate-row", "row-total", "estimate-total", "source-receipt"], relationIds: relationIdsFor("edit-library-component"),
    changes: [effect("Shared source version", "The Library definition and source version advance.", "library-component", "Workspace", "On save"), effect("Linked-clean rows", "Still-clean usage receives new visible shared values.", "estimate-row", "Workspace projects", "In synchronization"), effect("Source receipts", "Still-linked usage receives refreshed source/version facts.", "source-receipt", "Workspace projects", "In synchronization")],
    unchanged: [effect("Local visible overrides", "Linked-overridden rows preserve their visible local fields.", "estimate-row", "Overridden rows", "During synchronization"), effect("Issued client copies", "Existing snapshots remain historical.", "portal-issue", "Issued copy", "Always")],
    guards: ["A current impact fingerprint prevents stale high-blast-radius writes.", "Only still-linked usage participates in synchronization."], recovery: ["Publish a corrective Library version; local overrides remain available on overridden rows."], pageIds: ["component-library"], featureIds: ["use-components", "select-variants"], sources: [sources.library],
  },
  {
    id: "delete-library-component", title: "Permanently delete a Library component", question: "What else is deleted with a Library component?", kind: "delete", status: "guarded", actor: "Library steward", entryPoint: "Library > Component actions > Delete permanently",
    summary: "Previews linked estimate and template usage, then removes that linked live usage before deleting the shared definition.", targetNodeId: "library-component", relatedNodeIds: ["library-variant", "estimate-row", "estimate-template"], relationIds: relationIdsFor("delete-library-component"),
    changes: [effect("Shared definition removed", "The Library component and its variants are deleted.", "library-component", "Workspace", "After confirmation"), effect("Linked estimate usage removed", "Reported linked live rows are removed.", "estimate-row", "Workspace projects", "In cascade"), effect("Linked template usage removed", "Reported linked template rows are removed.", "estimate-template", "Workspace templates", "In cascade")],
    unchanged: [effect("Unlinked local rows", "Materialized or project-specific rows without the Library link are outside this cascade.", "project-component", "Projects", "Always")],
    guards: ["The user reviews a current impact preview.", "Execution requires the matching preview hash."], recovery: ["Permanent Library deletion has no ordinary undo; recreate the definition and affected usage from retained source if necessary."], pageIds: ["component-library"], featureIds: ["use-components", "reuse-templates"], sources: [sources.library],
  },
  {
    id: "insert-template", title: "Insert an estimate template", question: "Does an inserted template stay linked to its source?", kind: "copy", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Templates > Insert",
    summary: "Materializes fresh destination hierarchy and row identities; later template edits do not update the inserted copy.", targetNodeId: "estimate-template", relatedNodeIds: ["estimate-structure", "estimate-row", "estimate"], relationIds: relationIdsFor("insert-template"),
    changes: [effect("Fresh hierarchy", "Template nodes are copied into new estimate structure records.", "estimate-structure", "Destination estimate", "During insertion"), effect("Fresh rows", "Template row content becomes new destination row identities.", "estimate-row", "Destination estimate", "During insertion")],
    unchanged: [effect("Template source", "The reusable template is not consumed or changed.", "estimate-template", "Workspace", "Always"), effect("Future independence", "Later template edits do not fan out to the materialized estimate copy.", "estimate-row", "Destination estimate", "After insertion")],
    guards: ["The destination branch and template access are validated.", "If a referenced source is unavailable, insertion stops with requires_saved_snapshot_confirmation; no fallback row is created until the user explicitly confirms the saved snapshot path."], recovery: ["Cancel the fallback when source provenance matters, or delete the inserted subtree through the guarded structure-delete flow."], pageIds: ["estimate-workspace", "templates"], featureIds: ["reuse-templates"], sources: [sources.estimates, sources.persistence],
  },
  {
    id: "set-sheet-adjustment", title: "Set sheet contingency or discount", question: "Where does a sheet adjustment apply?", kind: "update", status: "current", actor: "Estimator", entryPoint: "Estimate workspace > Sheet totals",
    summary: "Persists estimate-level adjustment state and recalculates the sheet rollup without changing row-owned adjustments.", targetNodeId: "sheet-adjustment", relatedNodeIds: ["estimate-total", "history-event", "estimate-row"], relationIds: relationIdsFor("set-sheet-adjustment"),
    changes: [effect("Sheet adjustment", "The estimate-level contingency or discount changes.", "sheet-adjustment", "Estimate", "On save"), effect("Estimate rollup", "The current sheet total recalculates.", "estimate-total", "Estimate", "Immediately")],
    unchanged: [effect("Row adjustments", "Per-row adjustment values stay attached to their rows.", "estimate-row", "Rows", "Always")],
    guards: ["Adjustment values are normalized and the estimate must be editable."], recovery: ["Set the prior value again or clear the sheet adjustment."], pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.persistence, sources.totals],
  },
  {
    id: "publish-legacy-link", title: "Publish or republish a legacy shared link", question: "When does the old shared link pick up estimate changes?", kind: "publish", status: "current", actor: "Estimator", entryPoint: "Client Links (Legacy) > Publish or republish",
    summary: "Serializes current source into a stored public snapshot; later source edits wait for another republish.", targetNodeId: "legacy-snapshot", relatedNodeIds: ["estimate", "legacy-token", "public-review-page"], relationIds: relationIdsFor("publish-legacy-link"),
    changes: [effect("Stored public snapshot", "Current estimate content is serialized into the legacy publication record.", "legacy-snapshot", "Legacy publication", "At publish time"), effect("Public rendering", "The legacy token now serves that stored snapshot.", "public-review-page", "Public link", "After publish")],
    unchanged: [effect("Live source", "Publishing does not freeze or replace the editable estimate.", "estimate", "Project", "Always"), effect("Snapshot after later edits", "Later live changes do not alter this stored copy until republish.", "legacy-snapshot", "Legacy publication", "After publish")],
    guards: ["The publisher must have access and the selected estimate must be readable."], recovery: ["Republish from corrected current source or revoke access to the legacy link."], pageIds: ["share-overview"], featureIds: ["publish-client-portal"], sources: [sources.legacyPublish, sources.legacyRead],
  },
  {
    id: "issue-client-portal", title: "Publish a Client Portal issue", question: "What freezes when I publish a Portal issue?", kind: "publish", status: "guarded", actor: "Estimator or project lead", entryPoint: "Client Portal control center > Publish issue",
    summary: "Builds a numbered immutable issue from stable source, supersedes the former current issue, and keeps the public token stable.", targetNodeId: "portal-issue", relatedNodeIds: ["portal-draft", "estimate", "issued-row-projection", "prior-portal-issue", "stable-portal-token", "public-review-page", "source-receipt"], relationIds: relationIdsFor("issue-client-portal"),
    changes: [effect("New immutable issue", "Prepared content and stable estimate source become a new numbered issue.", "portal-issue", "Client Portal", "At publish time"), effect("Current issue pointer", "The new issue becomes current and the former issue becomes superseded history.", "prior-portal-issue", "Client Portal", "In the same transaction"), effect("Client-visible row copies", "Public-safe row projections are frozen into issued sections.", "issued-row-projection", "Portal issue", "At publish time")],
    unchanged: [effect("Prior issue content", "The superseded issue remains immutable and is not rewritten.", "prior-portal-issue", "Issue history", "Always"), effect("Stable public link", "The token stays stable while resolving the newly current issue.", "stable-portal-token", "Portal access", "After publish")],
    guards: ["Source reads must produce a stable fingerprint.", "Publication policy and recipient configuration must be valid."], recovery: ["Correct the live source or draft and publish a newer issue; do not mutate the issued package."], pageIds: ["portal-control", "portal-list"], featureIds: ["publish-client-portal"], sources: [sources.portalPublish, sources.portalIssue, sources.portalContract],
  },
  {
    id: "record-client-decision", title: "Record a client decision", question: "Does a client approval change the estimate?", kind: "review", status: "guarded", actor: "Authorized client recipient", entryPoint: "Public review page > Approve, decline, or request changes",
    summary: "Records one issue-scoped decision, audit facts, and an owner notification without editing the source estimate.", targetNodeId: "client-decision", relatedNodeIds: ["public-review-page", "portal-issue", "activity-notification", "estimate"], relationIds: relationIdsFor("record-client-decision"),
    changes: [effect("Issue-scoped decision", "The recipient response is recorded against the exact issue content hash.", "client-decision", "Portal issue", "On submit"), effect("Activity and owner signal", "Audit, analytics, and notification records are created.", "activity-notification", "Client Portal", "In the same transaction")],
    unchanged: [effect("Source estimate", "Approval or change request does not directly edit rows, structure, or totals.", "estimate", "Project", "Always"), effect("Issued content", "The reviewed issue remains immutable.", "portal-issue", "Portal issue", "Always")],
    guards: ["The recipient must be authorized.", "The expected issue content hash and idempotency key must be valid.", "Duplicate active decisions are rejected."], recovery: ["A stale submission reloads the current issue; lifecycle services can void or supersede decisions under their own rules."], pageIds: ["client-review", "portal-control"], featureIds: ["review-and-decide", "publish-client-portal"], sources: [sources.decision],
  },
  {
    id: "localize-component", title: "Make a component project-specific", question: "What happens when I make a Library-linked row project-specific?", kind: "convert", status: "guarded", actor: "Estimator", entryPoint: "Estimate row > Make project component",
    summary: "Removes the workspace Library link and creates project-bounded component facts for the row and eligible project projection.", targetNodeId: "project-component", relatedNodeIds: ["library-component", "estimate-row", "source-receipt"], relationIds: relationIdsFor("localize-component"),
    changes: [effect("Project-bounded identity", "The component becomes editable within the current project boundary.", "project-component", "Project", "On success"), effect("Row source receipt", "The row no longer carries the workspace Library link.", "source-receipt", "Row", "On success")],
    unchanged: [effect("Library master", "The shared Library component remains available for other linked usage.", "library-component", "Workspace", "Always"), effect("Other projects", "No live project component link is created elsewhere.", "project-component", "Other projects", "Always")],
    guards: ["The row must be eligible and its current revision must match.", "Library-only attachment ownership is not silently transferred."], recovery: ["Promote the project component to a new Library item when it is ready for workspace reuse."], pageIds: ["estimate-workspace"], featureIds: ["use-components"], sources: [sources.rowUi, sources.projection],
  },
  {
    id: "promote-project-component", title: "Promote a Project component to the Library", question: "What changes when I promote a project component?", kind: "convert", status: "guarded", actor: "Estimator with Library access", entryPoint: "Estimate row or Project components > Promote",
    summary: "Creates or resolves an idempotent workspace Library item and relinks the eligible row as linked-clean.", targetNodeId: "library-component", relatedNodeIds: ["project-component", "estimate-row", "source-receipt"], relationIds: relationIdsFor("promote-project-component"),
    changes: [effect("Shared Library definition", "A workspace-reusable component and variant graph are created.", "library-component", "Workspace", "On success"), effect("Promoted row link", "The source row points to the Library item and becomes linked-clean.", "estimate-row", "Row", "On success")],
    unchanged: [effect("Other project components", "Unrelated project-bounded identities are not automatically promoted.", "project-component", "Project", "Always")],
    guards: ["Estimate edit access and workspace Library access are both required.", "Promotion is idempotent and the row must be eligible."], recovery: ["Make the row project-specific again if it should no longer follow the shared Library source."], pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components"], sources: [sources.promotion, sources.rowUi],
  },
] satisfies readonly Omit<EstimateSystemKnowledgeOperation, "confidence">[]).map((operation) => ({
  ...operation,
  confidence: operation.id === "delete-estimate-row" ? "medium" as const : "high" as const,
}));

type CoverageOperationSpec = Readonly<{
  id: string;
  title: string;
  question: string;
  kind: EstimateSystemKnowledgeOperation["kind"];
  status: EstimateSystemKnowledgeOperation["status"];
  actor: string;
  entryPoint: string;
  summary: string;
  targetNodeId: string;
  relatedNodeIds: readonly string[];
  relationIds: readonly string[];
  change?: string;
  changeScope?: string;
  unchanged?: Readonly<{ title: string; description: string; nodeId: string; scope: string }>;
  guard: string;
  recovery: string;
  pageIds: readonly string[];
  featureIds: readonly string[];
  sources: readonly EstimateSystemKnowledgeSource[];
  confidence?: EstimateSystemKnowledgeOperation["confidence"];
}>;

function coverageOperation(spec: CoverageOperationSpec): EstimateSystemKnowledgeOperation {
  const unchanged = spec.unchanged ?? {
    title: "Already-issued client content",
    description: "This live or reusable-source action does not rewrite an existing legacy snapshot or immutable Portal issue.",
    nodeId: "portal-issue",
    scope: "Issued copy",
  };
  return {
    id: spec.id,
    title: spec.title,
    question: spec.question,
    kind: spec.kind,
    status: spec.status,
    confidence: spec.confidence ?? "high",
    actor: spec.actor,
    entryPoint: spec.entryPoint,
    summary: spec.summary,
    targetNodeId: spec.targetNodeId,
    relatedNodeIds: spec.relatedNodeIds,
    relationIds: spec.relationIds,
    changes: spec.kind === "read" || !spec.change
      ? []
      : [effect(spec.title, spec.change, spec.targetNodeId, spec.changeScope ?? "Current record", "On success")],
    unchanged: [effect(unchanged.title, unchanged.description, unchanged.nodeId, unchanged.scope, "After the action")],
    guards: [spec.guard],
    recovery: [spec.recovery],
    pageIds: spec.pageIds,
    featureIds: spec.featureIds,
    sources: spec.sources,
  };
}

const coverageOperations = [
  coverageOperation({ id: "estimate-read-open", title: "Open an estimate", question: "What do I read when I open an estimate?", kind: "read", status: "current", actor: "Estimator", entryPoint: "Project > Estimates > Open", summary: "Loads the current live hierarchy, rows, calculations, and revisions into the editor without changing them.", targetNodeId: "estimate", relatedNodeIds: ["estimate-structure", "estimate-row", "projection-cache"], relationIds: ["estimate-opens-editor"], guard: "Project and estimate read access are required.", recovery: "Refresh or reopen if a concurrent mutation makes the loaded projection stale.", pageIds: ["estimate-list", "estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.rowUi] }),
  coverageOperation({ id: "structure-create", title: "Create an estimate structure", question: "What changes when I add a tab, area, or group?", kind: "create", status: "guarded", actor: "Estimator", entryPoint: "Estimate hierarchy > Add", summary: "Creates one ordered hierarchy node under a validated estimate parent.", targetNodeId: "estimate-structure", relatedNodeIds: ["estimate"], relationIds: ["estimate-manages-structure"], change: "A new tab, area, or group appears at the chosen valid position.", guard: "The parent, node kind, and estimate edit access must be valid.", recovery: "Rename, move, or delete the new empty node if it was added in error.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "structure-rename", title: "Rename estimate structure", question: "What changes when I rename a tab, area, or group?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Estimate hierarchy > Rename", summary: "Changes the display name of one hierarchy node while keeping its identity and contents.", targetNodeId: "estimate-structure", relatedNodeIds: ["estimate-row"], relationIds: ["estimate-manages-structure"], change: "The node label changes wherever the live estimate renders that structure.", guard: "The structure revision and edit access must still be current.", recovery: "Rename the node again to restore the previous label.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "structure-reorder", title: "Reorder estimate structure", question: "What changes when I reorder estimate structure?", kind: "move", status: "guarded", actor: "Estimator", entryPoint: "Estimate hierarchy > Drag or move", summary: "Changes a hierarchy node's sibling order or valid parent without recreating contained rows.", targetNodeId: "estimate-structure", relatedNodeIds: ["estimate-row"], relationIds: ["estimate-manages-structure"], change: "The branch appears in its new validated order or parent.", guard: "Cycle prevention, parent-kind rules, and current revisions must pass.", recovery: "Move the branch back to its previous position.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "structure-duplicate-tab", title: "Duplicate an estimate tab", question: "What is copied when I duplicate a tab?", kind: "copy", status: "guarded", actor: "Estimator", entryPoint: "Estimate tab actions > Duplicate", summary: "Creates a separate tab subtree with fresh structure and row identities copied from the selected tab.", targetNodeId: "estimate-structure", relatedNodeIds: ["estimate-row", "estimate"], relationIds: ["estimate-manages-structure"], change: "A new independent tab subtree and fresh row identities are added to the same estimate.", guard: "The source tab must exist and the destination estimate must be editable.", recovery: "Delete the duplicate subtree through the guarded structure-delete flow.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "structure-restore", title: "Restore deleted estimate structure", question: "What returns when I restore a deleted subtree?", kind: "restore", status: "guarded", actor: "Estimator", entryPoint: "Estimate history > Restore structure", summary: "Recreates a supported deleted hierarchy snapshot and its contained live rows.", targetNodeId: "estimate-structure", relatedNodeIds: ["history-event", "estimate-row"], relationIds: ["history-restores-structure"], change: "The saved subtree and eligible contained rows return to the live estimate.", guard: "A valid unconsumed deletion snapshot and compatible destination are required.", recovery: "If restoration is no longer applicable, rebuild the branch from retained source or a template.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.persistence] }),
  coverageOperation({ id: "row-create-blank", title: "Create a blank estimate row", question: "What starts when I add a blank row?", kind: "create", status: "current", actor: "Estimator", entryPoint: "Estimate structure > Add row", summary: "Creates one editable row identity without attaching a shared Library source.", targetNodeId: "estimate-row", relatedNodeIds: ["estimate-structure", "row-total"], relationIds: ["structure-creates-blank-row"], change: "A new row is placed in the chosen branch with editable local fields.", guard: "The destination branch must accept rows and the estimate must be editable.", recovery: "Delete the empty row or fill it with the intended local values.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "row-insert-library", title: "Insert a row from the Library", question: "What link is created when I insert a Library component?", kind: "create", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Library > Insert", summary: "Creates a placed row with stable component, variant, source-version, and linked-clean receipt facts.", targetNodeId: "estimate-row", relatedNodeIds: ["library-component", "library-variant", "source-receipt", "row-total", "estimate-total"], relationIds: ["library-materializes-row", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "A new linked-clean row is materialized from the selected Library component and variant and contributes to live totals.", guard: "The source version, selected variant, destination, and edit access must be valid.", recovery: "Delete the row, select another variant, or explicitly make it project-specific.", pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components", "select-variants"], sources: [sources.estimates, sources.library] }),
  coverageOperation({ id: "row-read", title: "Read an estimate row", question: "Which row state is shown in the editor?", kind: "read", status: "current", actor: "Estimator", entryPoint: "Estimate workspace > Row", summary: "Shows the row's current persisted values, placement, selected variant, link state, and revision without changing them.", targetNodeId: "estimate-row", relatedNodeIds: ["selected-variant", "source-receipt", "projection-cache"], relationIds: ["row-serves-editor"], guard: "Estimate read access is required; mutations use the returned revision separately.", recovery: "Refresh if the displayed revision becomes stale.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate", "use-components"], sources: [sources.estimates, sources.rowUi] }),
  coverageOperation({ id: "row-replace", title: "Replace a row component or variant", question: "What is preserved when I replace a row's source?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Estimate row > Replace", summary: "Explicitly changes the placed component or variant while preserving the row's validated estimate position.", targetNodeId: "estimate-row", relatedNodeIds: ["project-component", "selected-variant", "source-receipt", "row-total", "estimate-total"], relationIds: ["row-replaces-component", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "The row receives the replacement identity and refreshed source facts at the same estimate location, then live totals recalculate.", guard: "The replacement must be compatible and the row revision must match.", recovery: "Replace the row again with the prior component or restore retained values manually.", pageIds: ["estimate-workspace"], featureIds: ["use-components", "select-variants"], sources: [sources.estimates, sources.rowUi] }),
  coverageOperation({ id: "row-bulk-delete", title: "Bulk delete estimate rows", question: "What disappears when I delete several selected rows?", kind: "delete", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Multi-select > Delete", summary: "Removes the selected live rows as one bounded action while leaving unselected rows and issued copies unchanged.", targetNodeId: "estimate-row", relatedNodeIds: ["estimate-structure", "history-event", "row-total", "estimate-total"], relationIds: ["structure-bulk-deletes-rows", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "Every selected live row is removed and the current estimate and proposal rollups recalculate without those contributions.", guard: "The selection, edit access, and current row state must remain valid through confirmation.", recovery: "Use any supported grouped undo/history path or recreate the deleted rows from retained source.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.rowUi, sources.persistence] }),
  coverageOperation({ id: "project-component-reuse", title: "Reuse a Project component", question: "How far does a Project component reuse reach?", kind: "create", status: "current", actor: "Estimator", entryPoint: "Project components > Insert", summary: "Creates another row instance carrying the same project-bounded identity inside the current project.", targetNodeId: "project-component", relatedNodeIds: ["estimate-row", "project"], relationIds: ["project-reuses-component"], change: "A new eligible row instance is added within the same project boundary.", guard: "The component and destination estimate must belong to the same project.", recovery: "Delete or replace the new row without affecting the project component identity itself.", pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components"], sources: [sources.projection, sources.persistence] }),
  coverageOperation({ id: "project-component-remove-replace-variant", title: "Remove or replace a used Project variant", question: "What protects rows using a Project variant I remove?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Project component editor > Variants", summary: "Requires an explicit replacement for affected project rows before a used variant identity can disappear.", targetNodeId: "selected-variant", relatedNodeIds: ["project-component", "estimate-row", "row-total", "estimate-total"], relationIds: ["project-replaces-used-variant", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "Affected project rows move to the confirmed replacement variant before removal completes, then their live totals recalculate.", guard: "Current usage impact and a valid replacement variant must be confirmed.", recovery: "Add the variant back or run another guarded replacement across eligible project rows.", pageIds: ["estimate-workspace", "component-library"], featureIds: ["use-components", "select-variants"], sources: [sources.persistence, sources.projection] }),
  coverageOperation({ id: "library-component-create", title: "Create a Library component", question: "What becomes reusable when I create a Library component?", kind: "create", status: "current", actor: "Library steward", entryPoint: "Library > Add component", summary: "Creates a workspace reusable component with its initial stable version and variant definition.", targetNodeId: "library-component", relatedNodeIds: ["library-variant"], relationIds: ["library-component-lifecycle"], change: "A new workspace component and initial variant become available for insertion.", guard: "Workspace Library access and valid component fields are required.", recovery: "Archive the unused definition or permanently delete it after reviewing impact.", pageIds: ["component-library"], featureIds: ["use-components"], sources: [sources.library] }),
  coverageOperation({ id: "library-component-read", title: "Read a Library component", question: "What does the Library show without changing usage?", kind: "read", status: "current", actor: "Library steward or estimator", entryPoint: "Library > Component", summary: "Reads the current component version, variants, and usage-facing facts without mutating linked rows.", targetNodeId: "library-component", relatedNodeIds: ["library-variant", "source-receipt"], relationIds: ["library-component-lifecycle"], guard: "Workspace Library read access is required.", recovery: "Refresh the Library view if a newer version is published concurrently.", pageIds: ["component-library"], featureIds: ["use-components", "select-variants"], sources: [sources.library] }),
  coverageOperation({ id: "library-component-archive", title: "Archive a Library component", question: "What changes when I archive a Library component?", kind: "update", status: "guarded", actor: "Library steward", entryPoint: "Library > Component actions > Archive", summary: "Removes a reusable component from ordinary active selection without cascading deletion through existing live usage.", targetNodeId: "library-component", relatedNodeIds: ["estimate-row", "source-receipt"], relationIds: ["library-component-lifecycle"], change: "The component leaves the active Library selection lifecycle.", guard: "Library edit access and current component state are required.", recovery: "Restore or unarchive the component if the lifecycle supports it, or create a successor definition.", pageIds: ["component-library"], featureIds: ["use-components"], sources: [sources.library] }),
  coverageOperation({ id: "library-variant-add", title: "Add a Library variant", question: "What becomes selectable when I add a Library variant?", kind: "create", status: "guarded", actor: "Library steward", entryPoint: "Library component > Variants > Add", summary: "Adds a stable variant identity to a new Library component version.", targetNodeId: "library-variant", relatedNodeIds: ["library-component"], relationIds: ["library-variant-lifecycle"], change: "A new stable variant becomes available for future linked selection.", guard: "Variant identity and fields must be valid within the current component version.", recovery: "Edit or guardedly remove the unused variant.", pageIds: ["component-library"], featureIds: ["select-variants"], sources: [sources.library] }),
  coverageOperation({ id: "library-variant-edit", title: "Edit a Library variant", question: "Which linked rows can a Library variant edit reach?", kind: "update", status: "guarded", actor: "Library steward", entryPoint: "Library component > Variant editor", summary: "Creates a new source version and synchronizes still-linked usage under clean-versus-overridden rules.", targetNodeId: "library-variant", relatedNodeIds: ["library-component", "estimate-row", "source-receipt", "row-total", "estimate-total"], relationIds: ["library-variant-lifecycle", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "The shared variant version advances; eligible linked-clean usage receives shared visible values and its live totals recalculate.", guard: "A current impact fingerprint and valid stable variant identity are required.", recovery: "Publish a corrective variant version; overridden local visible fields remain preserved.", pageIds: ["component-library"], featureIds: ["select-variants", "use-components"], sources: [sources.library] }),
  coverageOperation({ id: "library-variant-reorder", title: "Reorder Library variants", question: "Does reordering variants change row selections?", kind: "move", status: "guarded", actor: "Library steward", entryPoint: "Library component > Variants > Reorder", summary: "Changes variant display order while preserving each stable identity and existing row selection.", targetNodeId: "library-variant", relatedNodeIds: ["selected-variant", "library-component"], relationIds: ["library-variant-lifecycle"], change: "The Library presents variants in the saved order.", unchanged: { title: "Existing row selections", description: "Rows keep the same stable selected variant ID; ordering is not selection.", nodeId: "selected-variant", scope: "Linked rows" }, guard: "The submitted order must contain valid variants for the component.", recovery: "Reorder the variants again.", pageIds: ["component-library"], featureIds: ["select-variants"], sources: [sources.library] }),
  coverageOperation({ id: "library-variant-set-default", title: "Set the default Library variant", question: "Which rows change when I choose a new default variant?", kind: "update", status: "guarded", actor: "Library steward", entryPoint: "Library component > Variants > Set default", summary: "Changes the default used for future selection contexts without replacing stable selections already stored on rows.", targetNodeId: "library-variant", relatedNodeIds: ["selected-variant", "library-component"], relationIds: ["library-variant-lifecycle"], change: "The component points to the chosen stable variant as its default.", unchanged: { title: "Existing selected variants", description: "Rows with an explicit stable variant selection keep that selection.", nodeId: "selected-variant", scope: "Existing rows" }, guard: "The default must be a current variant belonging to the component.", recovery: "Set the former variant as default again.", pageIds: ["component-library"], featureIds: ["select-variants"], sources: [sources.library] }),
  coverageOperation({ id: "library-variant-remove", title: "Remove a Library variant", question: "What protects linked usage when I remove a Library variant?", kind: "delete", status: "guarded", actor: "Library steward", entryPoint: "Library component > Variant actions > Remove", summary: "Requires an explicit replacement mapping, then remaps affected linked rows, source receipts, snapshots, revisions, and derived totals while preserving local visible overrides.", targetNodeId: "library-variant", relatedNodeIds: ["selected-variant", "estimate-row", "source-receipt", "row-total", "estimate-total"], relationIds: ["library-variant-lifecycle", "library-variant-removal-remaps-selection", "library-variant-removal-updates-row", "library-variant-removal-refreshes-receipt", "row-recalculates-total", "row-total-rolls-up-estimate"], change: "The variant leaves the new Library version only after affected linked rows are remapped to the confirmed replacement and their source/revision facts are refreshed.", unchanged: { title: "Local visible overrides", description: "Linked-overridden rows keep their local visible fields while their shared source, replacement variant, and revision receipts advance.", nodeId: "estimate-row", scope: "Overridden linked rows" }, guard: "Current linked usage, default status, impact fingerprint, and the explicit replacement mapping must be confirmed.", recovery: "Recreate the variant as a new stable identity or publish a corrective component version and remap affected usage again.", pageIds: ["component-library"], featureIds: ["select-variants", "use-components"], sources: [sources.library] }),
  coverageOperation({ id: "template-create-edit", title: "Create or edit an estimate template", question: "What changes when I edit a template?", kind: "update", status: "guarded", actor: "Template editor", entryPoint: "Templates > New or Edit", summary: "Saves the reusable template blueprint and row snapshots used by future insertions.", targetNodeId: "estimate-template", relatedNodeIds: ["estimate-structure", "estimate-row"], relationIds: ["template-manages-blueprint"], change: "Future insertions use the saved template structure and row content.", unchanged: { title: "Already-inserted estimates", description: "Materialized copies already placed in estimates do not stay live-linked to later template edits.", nodeId: "estimate-row", scope: "Existing estimates" }, guard: "Template edit access and a valid hierarchy shape are required.", recovery: "Edit the template again or create a corrected successor template.", pageIds: ["templates", "template-editor"], featureIds: ["reuse-templates"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "template-reorder", title: "Reorder an estimate template", question: "What does template reordering affect?", kind: "move", status: "guarded", actor: "Template editor", entryPoint: "Template editor > Drag or move", summary: "Changes the saved order of template structure or rows for future materialization.", targetNodeId: "estimate-template", relatedNodeIds: ["estimate-structure"], relationIds: ["template-manages-blueprint"], change: "Future insertions follow the newly saved template order.", unchanged: { title: "Existing materialized copies", description: "Previously inserted estimate structure keeps its own order.", nodeId: "estimate-structure", scope: "Existing estimates" }, guard: "The reordered template hierarchy must remain valid.", recovery: "Move the template item back to its prior position.", pageIds: ["template-editor"], featureIds: ["reuse-templates"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "template-delete", title: "Delete an estimate template", question: "Does deleting a template remove inserted estimates?", kind: "delete", status: "guarded", actor: "Template editor", entryPoint: "Templates > Delete", summary: "Deletes the reusable blueprint while leaving already-materialized estimate copies independent.", targetNodeId: "estimate-template", relatedNodeIds: ["estimate-structure", "estimate-row"], relationIds: ["template-manages-blueprint"], change: "The template is no longer available for future insertion.", unchanged: { title: "Already-inserted estimate content", description: "Fresh identities created by prior materialization remain in their destination estimates.", nodeId: "estimate-row", scope: "Existing estimates" }, guard: "Template delete access and any current usage confirmation are required.", recovery: "Recreate the template from retained source or save a new template from an estimate.", pageIds: ["templates"], featureIds: ["reuse-templates"], sources: [sources.estimates, sources.persistence] }),
  coverageOperation({ id: "template-saved-snapshot-fallback", title: "Use a template's saved fallback snapshot", question: "What happens when a template source is unavailable?", kind: "copy", status: "guarded", actor: "Estimator", entryPoint: "Estimate workspace > Templates > Insert", summary: "Stops for explicit confirmation, then materializes the retained template row snapshot only when the referenced source cannot be resolved and fallback is eligible.", targetNodeId: "estimate-row", relatedNodeIds: ["estimate-template", "source-receipt"], relationIds: ["template-fallback-materializes-row"], change: "After explicit confirmation, a fresh destination row is created from retained snapshot values without pretending the unavailable source is live-linked.", guard: "The first attempt must return requires_saved_snapshot_confirmation; the user must explicitly confirm, and the saved fallback snapshot must remain valid under current insertion policy.", recovery: "Cancel instead of confirming when source provenance matters, or replace/relink the materialized row when the intended source becomes available.", pageIds: ["estimate-workspace", "templates"], featureIds: ["reuse-templates"], sources: [sources.templateUi, sources.estimates, sources.persistence] }),
  coverageOperation({ id: "charges-edit-row-inputs", title: "Edit row pricing inputs", question: "Which totals change when I edit quantity or row costs?", kind: "update", status: "guarded", actor: "Estimator", entryPoint: "Estimate row > Quantity and cost fields", summary: "Changes row-owned quantity, unit cost, miscellaneous cost, contingency, or row adjustment and recalculates derived totals.", targetNodeId: "estimate-row", relatedNodeIds: ["row-total", "estimate-total"], relationIds: ["row-inputs-recalculate-total", "row-total-rolls-up-estimate"], change: "The row result and current estimate rollup recalculate from the saved inputs.", guard: "The row revision and normalized numeric inputs must be valid.", recovery: "Restore the prior inputs or correct the row with a later edit.", pageIds: ["estimate-workspace"], featureIds: ["organize-estimate"], sources: [sources.totals, sources.rowUi] }),
  coverageOperation({ id: "charges-derive-totals", title: "Derive row, sheet, and proposal totals", question: "Where do displayed estimate totals come from?", kind: "read", status: "current", actor: "System", entryPoint: "Estimate and publication calculation views", summary: "Evaluates canonical row totals and rolls them into the applicable estimate, sheet, or proposal calculation context.", targetNodeId: "estimate-total", relatedNodeIds: ["row-total", "sheet-adjustment", "estimate-row"], relationIds: ["row-total-rolls-up-estimate"], guard: "The calculation uses the current normalized inputs and the adjustment context for the surface being rendered.", recovery: "Correct the underlying live inputs or applicable adjustment; totals are derived rather than directly edited.", pageIds: ["estimate-workspace", "portal-control", "client-review"], featureIds: ["organize-estimate", "publish-client-portal"], sources: [sources.totals, sources.portalIssue] }),
  coverageOperation({ id: "legacy-publication-read", title: "Read a legacy publication", question: "Does the old shared link read the live estimate?", kind: "read", status: "legacy", actor: "Public link visitor", entryPoint: "Legacy shared URL", summary: "Sanitizes and renders the stored publication snapshot; it does not query the live estimate for row content.", targetNodeId: "legacy-snapshot", relatedNodeIds: ["legacy-token", "public-review-page", "estimate"], relationIds: ["legacy-read-serves-snapshot"], unchanged: { title: "Live estimate", description: "Opening the shared link does not edit or refresh the source estimate.", nodeId: "estimate", scope: "Project" }, guard: "The token must resolve an accessible non-revoked publication.", recovery: "The publisher can republish current source or issue a Client Portal replacement.", pageIds: ["share-overview", "client-review"], featureIds: ["publish-client-portal"], sources: [sources.legacyRead] }),
  coverageOperation({ id: "legacy-publication-revoke", title: "Revoke a legacy publication", question: "What remains after I revoke an old shared link?", kind: "update", status: "legacy", actor: "Estimator", entryPoint: "Client Links (Legacy) > Revoke", summary: "Stops the legacy token from serving the publication without rewriting its stored historical snapshot or live source.", targetNodeId: "legacy-token", relatedNodeIds: ["legacy-snapshot", "public-review-page"], relationIds: ["legacy-token-revokes-access"], change: "The legacy public link no longer grants access.", unchanged: { title: "Stored snapshot history", description: "Revocation changes access state rather than mutating the captured publication content.", nodeId: "legacy-snapshot", scope: "Legacy publication" }, guard: "Publisher access and the current publication identity are required.", recovery: "Publish or republish an authorized replacement link when sharing should resume.", pageIds: ["share-overview"], featureIds: ["publish-client-portal"], sources: [sources.legacyPublish, sources.legacyRead] }),
  coverageOperation({ id: "portal-draft", title: "Create or edit a Portal draft", question: "What can change before a Portal issue is published?", kind: "update", status: "guarded", actor: "Estimator or project lead", entryPoint: "Client Portal control center > Composer", summary: "Creates, edits, orders, and configures internal draft sections and selected source before issue publication.", targetNodeId: "portal-draft", relatedNodeIds: ["estimate", "portal-issue"], relationIds: ["estimate-composes-portal-draft"], change: "Internal section content, order, scope, and interaction settings are saved for the next issue.", unchanged: { title: "Current issued Portal content", description: "Draft edits remain internal and do not mutate the currently issued package.", nodeId: "portal-issue", scope: "Current issue" }, guard: "Internal Portal edit access and valid section contracts are required.", recovery: "Continue editing the draft or discard the unwanted draft section before publication.", pageIds: ["portal-control"], featureIds: ["publish-client-portal"], sources: [sources.portalComposer] }),
  coverageOperation({ id: "portal-read-issued-content", title: "Read issued Portal content", question: "What does a client read on the Portal?", kind: "read", status: "boundary", actor: "Authorized client recipient", entryPoint: "Stable Client Portal URL", summary: "Resolves the accessible immutable issue and reads public-safe issued sections and row projections.", targetNodeId: "portal-issue", relatedNodeIds: ["stable-portal-token", "issued-row-projection", "public-review-page"], relationIds: ["portal-read-serves-issue"], unchanged: { title: "Live source estimate", description: "Reading the Portal does not query or edit live authoring rows as the client-visible content source.", nodeId: "estimate", scope: "Project" }, guard: "Recipient session, token, issue status, and policy checks must allow access.", recovery: "Reload the current accessible issue or contact the publisher if access has changed.", pageIds: ["client-review"], featureIds: ["review-and-decide"], sources: [sources.portalPublic, sources.portalContract] }),
  coverageOperation({ id: "portal-withdraw-archive", title: "Turn off, withdraw, or archive Portal access", question: "Which Portal shutdown actions are implemented today?", kind: "update", status: "partial", confidence: "medium", actor: "Project lead", entryPoint: "Client Portal control center > Access or lifecycle actions", summary: "Turning Portal access off is implemented on the Client Portal record. Issue withdrawal and archive states exist in contracts and read guards, but no user-facing mutation for those two issue transitions was located in this audit.", targetNodeId: "portal-access-state", relatedNodeIds: ["stable-portal-token", "portal-issue", "prior-portal-issue"], relationIds: ["portal-access-controls-token", "portal-withdraw-archive-gap"], change: "The current access mutation changes the Portal status and credential version so the stable route becomes unavailable to recipients.", unchanged: { title: "Immutable issue content", description: "Disabling Portal access does not mutate the frozen issue payload. Withdrawal/archive remain documented issue lifecycle boundaries until a current mutation is verified.", nodeId: "portal-issue", scope: "Issue history" }, guard: "Access changes require current Portal administration rights; archived portals are explicitly rejected by the access service.", recovery: "Re-enable access through the supported access action, or implement and verify a dedicated issue withdrawal/archive mutation before treating those states as current CRUD.", pageIds: ["portal-control", "portal-list"], featureIds: ["publish-client-portal"], sources: [sources.portalAccess, sources.portalContract, sources.portalPublic] }),
  coverageOperation({ id: "portal-discuss", title: "Discuss an issued Portal item", question: "Does a Portal comment edit the estimate row it mentions?", kind: "review", status: "guarded", actor: "Authorized recipient or publisher", entryPoint: "Client review or Portal discussions", summary: "Creates or replies to an issue-scoped thread, with read state, audit, analytics, and owner notifications.", targetNodeId: "discussion", relatedNodeIds: ["public-review-page", "portal-issue", "activity-notification", "estimate-row"], relationIds: ["review-records-discussion", "discussion-notifies-owner"], change: "The issue gains a discussion thread or message and the appropriate activity signals.", unchanged: { title: "Source estimate row", description: "Discussion records review context; they do not directly mutate the live row they reference.", nodeId: "estimate-row", scope: "Live estimate" }, guard: "The actor, current issue, target, idempotency key, and discussion policy must be valid.", recovery: "Resolve, reopen, reply, or tombstone messages through the guarded discussion lifecycle.", pageIds: ["client-review", "portal-control"], featureIds: ["review-and-decide", "publish-client-portal"], sources: [sources.portalThreads, sources.portalPublic] }),
] satisfies readonly EstimateSystemKnowledgeOperation[];

const operations = [...baseOperations, ...coverageOperations] satisfies readonly EstimateSystemKnowledgeOperation[];
const relations = baseRelations satisfies readonly EstimateSystemKnowledgeRelation[];

const inventoryOperationAliases: Readonly<Record<string, string>> = {
  "estimate-create": "create-estimate",
  "estimate-duplicate": "duplicate-estimate",
  "estimate-archive-delete": "delete-estimate",
  "structure-delete-subtree": "delete-structure",
  "row-edit-local-fields": "edit-estimate-row",
  "row-select-variant": "select-row-variant",
  "row-move-reorder": "move-estimate-row",
  "row-delete": "delete-estimate-row",
  "row-undo-restore": "restore-estimate-row",
  "project-component-edit-shared-fields": "edit-project-component",
  "project-component-localize": "localize-component",
  "project-component-promote": "promote-project-component",
  "library-component-update": "edit-library-component",
  "library-component-permanent-delete": "delete-library-component",
  "template-insert-materialize": "insert-template",
  "charges-edit-sheet-adjustment": "set-sheet-adjustment",
  "legacy-publication-create": "publish-legacy-link",
  "legacy-publication-republish": "publish-legacy-link",
  "portal-publish-issue": "issue-client-portal",
  "portal-supersede": "issue-client-portal",
  "portal-decide": "record-client-decision",
};

const inventoryItemLabels: Readonly<Record<string, string>> = {
  "legacy-publication-create": "Create a legacy publication",
  "legacy-publication-republish": "Republish a legacy publication",
  "portal-publish-issue": "Publish a Client Portal issue",
  "portal-supersede": "Supersede the prior Portal issue",
};

const inventoryGroupsInput = [
  { id: "estimate", title: "Estimate", summary: "Create, open, copy, and remove the live authoring container.", ids: ["estimate-create", "estimate-read-open", "estimate-duplicate", "estimate-archive-delete"] },
  { id: "structure", title: "Structure", summary: "Build, order, copy, delete, and restore the estimate hierarchy.", ids: ["structure-create", "structure-rename", "structure-reorder", "structure-duplicate-tab", "structure-delete-subtree", "structure-restore"] },
  { id: "row", title: "Estimate row", summary: "Place, read, edit, move, replace, delete, and restore priced instances.", ids: ["row-create-blank", "row-insert-library", "row-read", "row-edit-local-fields", "row-select-variant", "row-move-reorder", "row-replace", "row-delete", "row-bulk-delete", "row-undo-restore"] },
  { id: "project-component", title: "Project component", summary: "Reuse and synchronize shared identity inside one project boundary.", ids: ["project-component-reuse", "project-component-edit-shared-fields", "project-component-remove-replace-variant", "project-component-localize", "project-component-promote"] },
  { id: "library", title: "Library component and variants", summary: "Manage workspace-wide reusable definitions and stable variants.", ids: ["library-component-create", "library-component-read", "library-component-update", "library-component-archive", "library-component-permanent-delete", "library-variant-add", "library-variant-edit", "library-variant-reorder", "library-variant-set-default", "library-variant-remove"] },
  { id: "template", title: "Template", summary: "Manage reusable blueprints and materialize independent estimate copies.", ids: ["template-create-edit", "template-insert-materialize", "template-reorder", "template-delete", "template-saved-snapshot-fallback"] },
  { id: "charges", title: "Charges and totals", summary: "Edit financial inputs and derive row, sheet, and proposal results.", ids: ["charges-edit-row-inputs", "charges-edit-sheet-adjustment", "charges-derive-totals"] },
  { id: "legacy-publication", title: "Legacy publication", summary: "Create, read, replace, and revoke the older stored-snapshot link.", ids: ["legacy-publication-create", "legacy-publication-read", "legacy-publication-republish", "legacy-publication-revoke"] },
  { id: "client-portal", title: "Client Portal", summary: "Compose, issue, read, supersede, control access, discuss, and decide against immutable content; unsupported lifecycle mutations stay explicit.", ids: ["portal-draft", "portal-publish-issue", "portal-read-issued-content", "portal-supersede", "portal-withdraw-archive", "portal-discuss", "portal-decide"] },
] as const;

const operationsById = new Map(operations.map((operation) => [operation.id, operation]));
const inventory = inventoryGroupsInput.map((group) => ({
  id: group.id,
  title: group.title,
  summary: group.summary,
  items: group.ids.map((id) => {
    const operationId = inventoryOperationAliases[id] ?? id;
    const operation = operationsById.get(operationId);
    if (!operation) throw new Error(`Inventory ${id} references missing operation: ${operationId}`);
    return { id, label: inventoryItemLabels[id] ?? operation.title, status: operation.status, operationId, note: operation.summary };
  }),
}));

export const estimateSystemKnowledgeGraph = defineEstimateSystemKnowledgeGraph({
  version: "2026-07-15",
  lastVerified: "15 July 2026",
  title: "Estimate System Knowledge",
  summary: "A human-readable map of the live estimating model, reusable sources, calculations, immutable client issues, and the exact blast radius of high-value operations.",
  stages: [
    { id: "reuse", title: "Reuse", summary: "Shared definitions and materialized blueprints used to start faster.", order: 0 },
    { id: "author", title: "Author", summary: "The editable project, estimate hierarchy, row instances, and history.", order: 1 },
    { id: "calculate", title: "Calculate", summary: "Derived row and estimate money from current live inputs.", order: 2 },
    { id: "issue", title: "Issue", summary: "Point-in-time public copies and the access boundaries that serve them.", order: 3 },
    { id: "review", title: "Review", summary: "Client-facing reading, discussion, decisions, and owner signals.", order: 4 },
  ],
  nodes,
  relations,
  operations,
  inventory,
  defaultOperationId: "delete-estimate-row",
});
