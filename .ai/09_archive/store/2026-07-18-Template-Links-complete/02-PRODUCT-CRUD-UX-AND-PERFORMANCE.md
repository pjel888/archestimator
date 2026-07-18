# Product, CRUD, UX, And Performance Contract

## 1. Ownership Model

While an instance remains linked, fields have one owner.

| Owner | Fields/behavior |
| --- | --- |
| Template master | node existence, kind, name, parent topology, internal order; row existence, node placement, order; Component identity/selected variant; custom-row material, description, supplier, unit, unit cost, misc cost, discipline, designation, category/supplier IDs, pricing provenance, and stable Template metadata. |
| Estimate instance | root placement under the target Estimate parent; `quantity`, `quantity_base`, `quantity_contingency_amount`, canonical adjustment/contingency input, and derived totals; local selection/focus/draft UI. |
| Component Library | current linked Component name/description/supplier/unit/pricing, source snapshot, lifecycle, selected variant definition, and Component version. |
| System | IDs, revisions, timestamps, intent receipts, mapping state, history/outbox, publication revision, job lease/retry state. |

Any edit outside the fixed instance-owned set is a shared Template mutation. Users needing broader local changes detach the entire instance first.

## 2. Insertion Experience

An empty Template remains a valid editable master, but **linked insertion is disabled until it has at least one root node**. This avoids an invisible instance with no focus, status, detach, or delete owner.

Every whole-Template insertion exposes two explicit modes:

- **Insert linked** — primary; whole Template only; creates one linked instance.
- **Insert copy** — secondary; preserves current snapshot semantics.

The linked description is direct: “Changes to this Template update every linked Estimate. Quantities and adjustments stay project-specific.”

### Entry-point matrix

| Entry point | Selected mode contract | Chooser/default | Keyboard equivalent | Retry retention |
| --- | --- | --- | --- | --- |
| Whole Template from `InsertIntoEstimatePicker` | Linked or copy | Mode chooser opens; `Insert linked` selected by default | Radio group; arrows change mode, `Enter` submits, `Escape` cancels | Template, target Estimate/tab/parent, mode, retained `intentId`, and unavailable-source decision |
| Single whole-Template drag/drop | Linked or copy | Drop opens the same chooser at the resolved target before any mutation; linked default | The Template row/context menu exposes `Insert into Estimate…` with the same target picker; drag is never the only route | Same as picker, including original drop target |
| Multi-Template/category drop | Copy only | No linked chooser; confirmation says `Insert {n} independent copies` | Existing category/multi-select insert command | Ordered Template IDs, target, and retained copy intent |
| Template subtree/node drop | Copy only | Explicit `Insert subtree copy`; never implies a live link | Node context menu/picker equivalent | Source subtree, target, and retained copy intent |
| Template inserted into Template Editor | Copy-only composition | Explicit `Copy into Template`; linked nesting excluded | Editor command/menu equivalent | Source graph, destination node, and retained copy intent |
| Save Estimate node/tab as Template | New independent master | No linked option | Existing save-as-Template command | Source Estimate selection and creation intent |

The chooser has loading, unavailable, and retry states; no drag/drop or picker path commits before the mode is explicit. A retry after a transient server error reuses the retained intent and selected mode so it cannot switch from copy to linked or vice versa.

Linked mode also requires an active target `estimate_tab_id`. If the resolved target or parent is legacy tabless or the tab is archived, preflight shows: `Linked Templates need an active Estimate tab. Insert an independent copy here instead?` Actions are `Cancel` and `Insert copy instead`; no instance row is attempted, and no migration silently assigns legacy content to a tab.

If a Template contains an unavailable Component source, the existing saved-snapshot confirmation appears after mode selection and before commit:

- linked wording: “This Component is unavailable. Insert its saved values? The row will still follow the linked Template's structure, but it will no longer follow that Component.”
- copy wording: “This Component is unavailable. Insert its saved values into the independent copy?”

A saved-snapshot fallback in linked mode remains structurally owned by the Template but is explicitly unlinked from the missing Component source.

Whole/subtree Template-node insertion and multi-Template category drops remain copy-only in the MVP. This prevents ambiguous partial instance boundaries.

## 3. Shared Mutation Classifier

| User action inside a linked instance | Classification | Confirmation | Propagation |
| --- | --- | --- | --- |
| Add group/area under a mapped node | Shared Template structure | Always while at least one active instance exists | All active instances |
| Rename, reorder, move, or delete an internal mapped node | Shared Template structure | Always while at least one active instance exists | All active instances |
| Add blank/allowance/Component row | Shared Template membership/content | Always while at least one active instance exists | All active instances |
| Edit material, description, supplier, unit, custom cost, discipline, designation, or selected Component variant | Shared Template content | Always while at least one active instance exists | All active instances; Component precedence applies |
| Reorder, move, replace, or delete a mapped row | Shared Template structure/content | Always while at least one active instance exists | All active instances |
| Edit quantity/base/contingency amount/adjustment | Estimate-local takeoff | No | Visible instance only |
| Move all linked roots together to another parent in the same Estimate/tab | Instance-local placement | Local confirmation only if current move UX requires it | Visible instance only |
| Delete an entire linked instance root set | Instance delete | Local destructive confirmation | Visible instance only; master unchanged |
| Choose `Detach this instance…` | Whole-instance detach | Yes | Stops all future propagation; does not replay a pending edit |

The classifier lives at the command boundary, not only in React. Server actions reject a local mutation that attempts to change a master-owned field on an active mapped node/row.

### Mixed and bulk command policy

Bulk commands are preflighted by **field owner** and **Template master**, before optimistic state or local Undo registration:

| Selection/command | Behavior |
| --- | --- |
| All affected fields are Estimate-local, even across several instances/local rows | Run the ordinary local bulk command per authoritative row revision; no Template preview. |
| All mapped targets belong to one Template and the command can be expressed as one deterministic master patch | Show one action-specific impact preview and commit one Template revision. Supported MVP forms are bulk delete, same-parent reorder/move, duplicate-as-shared-addition, replace master-owned fields, and clear master-owned fields. |
| Selection mixes local content with master-owned linked content | Reject before mutation: “Select local items or items from one linked Template.” Preserve selection. |
| Selection spans more than one Template master | Reject before mutation: “Bulk linked changes can update one Template at a time.” Group the selection by Template in the error detail. |
| Generic delete includes a complete linked root set | Reject the generic bulk delete and route to the explicit whole-instance `Delete instance…` action. |
| A bulk move/reorder cannot map to one source parent/order transaction | Reject; do not partition into several hidden master revisions. |

Shared master commits are never pushed onto the Estimate Sheet's local Undo stack. `Undo` remains available for local quantity/adjustment and independent content commands only. Reversing a propagated delete/replace requires a new explicit master mutation and the same preview/confirmation; there is no one-keystroke shared Undo in the MVP.

## 4. Impact Preview And Confirmation

Preview response:

```ts
type TemplateLinkImpactPreview = {
  templateId: string;
  templateName: string;
  currentVersionNumber: number;
  change: {
    kind: string;
    summary: string;
    itemCount: number;
    beforeLabel?: string;
    afterLabel?: string;
  };
  instanceCount: number;
  projectCount: number;
  estimateCount: number;
  affectedEstimates: Array<{
    projectId: string;
    projectName: string;
    estimateId: string;
    estimateName: string;
    instanceCount: number;
  }>;
  fingerprint: string;
};
```

### Eligibility by origin and active-instance count

| Origin | Zero active instances | One active instance | Many active instances |
| --- | --- | --- | --- |
| Template Editor | Save as a new immutable master version without an impact dialog; no jobs exist. | Preview and confirmation required before the master mutation. | Preview and confirmation required before the master mutation. |
| Estimate Sheet mapped node/row | Stale classification: reject, refresh the sheet, and require the user to retry against detached/local state. | Preview and confirmation required. | Preview and confirmation required. |

Therefore adding a row or Component to any Template that has at least one active linked instance **always warns and asks for confirmation**, regardless of whether the action starts in the Template Editor or an Estimate Sheet.

### Action-specific confirmation

Default non-destructive shape:

> **Update linked Template?**  
> **{change.summary}**  
> This changes **{templateName}** in **{instanceScopeLabel} across {estimateScopeLabel} and {projectScopeLabel}**. Quantities and adjustments in each Estimate stay unchanged.

The renderer uses explicit singular/plural forms rather than slash text. Examples:

- add: `Add “Concrete footing” after “Excavation” in all 3 linked instances?`
- edit: `Change unit from “m²” to “ft²” in the linked Template and its 1 instance?`
- move: `Move “Finishes” under “Level 2” in all 8 linked instances?`
- delete: `Delete “Allowance” from the linked Template and all 8 instances? This cannot be undone from the Estimate Sheet.`

Actions:

- Secondary: `Cancel`
- Contextual secondary for any action originating inside an instance: `Detach this instance…`
- Primary for one: `Update linked instance`
- Primary for many: `Update all {instanceCount} instances`

For destructive node/row removal, the body names the removed item and explicitly says it is removed from every active instance. The list of affected Estimates is bounded in the modal with a count and expandable detail, never a large unvirtualized list.

### Dialog state machine

1. `loading-preview`: focus the title, show the proposed change, disable confirm, and allow cancel.
2. `preview-error`: keep the draft/selection; show redacted error copy with `Retry preview` and `Cancel`.
3. `ready`: show exact scope, action-specific before/after text, and enabled actions.
4. `stale`: if source revision or fingerprint changes, replace counts/details with a fresh preview, explain what changed, and require a new confirm click.
5. `submitting`: disable all actions and dismissal; the request may already commit and cannot be cancelled safely.
6. `resolving`: a timeout/disconnect keeps the retained `intentId`; the normalized payload, original request fingerprint, expected version, and impact fingerprint already live in `estimate_template_mutation_intents`. Copy says `We couldn't confirm whether the linked Template updated. Don't repeat this change elsewhere.` The primary `Resolve update` sends only the same intent ID; the server authorizes the actor, loads the canonical payload, and checks committed/not-applied state before every source/impact guard, so it returns the existing outcome or safely attempts the originally authorized change exactly once.
7. `not-applied`: only an authoritative guard/validation/authorization result can prove no commit for that intent. Copy says `This change was not applied.` Actions are `Refresh impact` and `Cancel`; the draft/selection remains and a fresh confirm is required.
8. `outcome-unknown`: another transport failure during resolution keeps the same intent single-flight. Actions are `Check again` and `Close and check later`; neither creates a new intent.
9. `accepted`: an existing/new committed receipt returns the authoritative version/progress. Close to the initiating instance/template progress surface; return focus to the initiating control only when it still exists and no status needs attention.

Cancel before submit or after a definite `not-applied` result preserves the editor draft, selection, and focus target. `Close and check later` stores only the non-secret intent/template/request fingerprint in session state, moves focus to an `Outcome unknown` status card, and invokes the server-owned intent resolver on reconnect/focus or explicit action. On reload, app bootstrap resolves a session intent by ID before relying on the Template route; if the result is a committed permanent delete, it redirects to the Template Library and shows the authoritative completion count even though the master is gone. Otherwise Template/Estimate bootstrap also queries any authorized pending intent for that Template and restores the same card. The server's partial unique index rejects a new intent until resolution. A committed/not-applied result clears the block and session pointer. No success toast or optimistic patch appears while unknown, and the original normalized payload never needs client persistence.

## 5. Visual Language

### Linked-current

- a fixed-width accent rail on every mapped branch section;
- the deterministic primary root shows `Linked Template`, master name, `v4`, and whole-instance actions;
- additional roots show `Linked part {ordinal} of {rootCount}` and use the same rail without duplicating actions;
- tooltip/status text: “Linked to {Template}; quantities and adjustments are project-specific.”

### Updating

- same rail and geometry;
- non-blocking `Updating to v5…` status in the existing branch status area;
- shared master-owned controls disabled for that instance; local quantity/adjustment edits remain available;
- one sheet-level `aria-live="polite"` owner announces the instance transition once, even when roots mount independently.

### Failed

- same geometry with danger tone and `Update failed` plus actions allowed by the redacted failure class;
- last complete applied version remains visible and editable for instance-owned fields;
- error copy uses the retryable/terminal taxonomy below, not raw D1/provider text.

### Detached/local

After detach, active mappings are deleted and the branch renders exactly like ordinary local Estimate content. The activity history preserves source Template/version and detach actor/time. No permanent “detached” border is shown on the working sheet.

### Virtualization rule

Do not wrap an entire linked graph in one new DOM container. `virtual-branch-list.tsx` can mount branches independently. Every mapped node receives the same compact `templateLink.instanceId` and per-node root flag; `branch.tsx` renders the rail consistently. Styling may change horizontal border/rail color but must not change measured row height.

For multi-root instances, root ordinal/count comes from stable source order. The first surviving root by source sort order then stable master ID is the primary visual action owner. Any root's context menu can open the same whole-instance actions, so virtualization never makes detach/delete/retry unreachable. The sheet-level announcer, not a mounted root, is the sole live-region owner.

### Template-level propagation owner

The Template Editor header owns a persistent `Linked instances` status surface whenever the master has active instances:

- current, updating, and failed counts plus current master version;
- terminal text: `All {n} linked instances updated` or `{failed} of {n} need attention`;
- an expandable, virtualized list of affected Estimates with project/Estimate names, applied/target version, and status;
- `Retry {n} retryable` for retryable failed instances only, class-specific per-instance actions, and navigation to the affected Estimate when authorized;
- polling only while updating work exists, then a final authoritative refresh.

A success toast may summarize a mutation, but the persistent Template-level surface remains the owner of partial-global progress and failure recovery.

The surface has its own query states:

- `loading`: fixed-height skeleton; no zero-count claim;
- `ready`/`updating`/`partial`: authoritative counts and paged detail;
- `stale-data`: retain the last successful counts with `Status may be outdated` and `Refresh`; never relabel jobs from cached data;
- `query-error-with-cache`: keep last counts, show `Couldn't refresh linked-instance status`, and allow query `Retry`;
- `query-error-empty`: error panel with query `Retry`; no job action is shown until status loads.

### Failure taxonomy and permitted actions

| Redacted class | Retryability | User copy | Actions |
| --- | --- | --- | --- |
| `transient` (`D1_TRANSIENT`, timeout, lease loss) | Retryable; automatic backoff until attempt limit | `Temporary update problem. The last complete version is still available.` | `Retry now`, `Detach this instance…` |
| `attempts_exhausted` | Retryable by explicit reset | `Automatic retries stopped after repeated failures.` | Per-instance `Retry`, bulk retry eligible, `Detach this instance…` |
| `component_unavailable` | Terminal until the Template/Component source is corrected | `A required Component is unavailable. Fix the Template source or detach this instance.` | `Open Template`, `Detach this instance…`; no retry |
| `access_revoked` | Terminal for the current actor | `Access changed, so this instance could not be updated.` | Authorized owner/admin navigation only; no retry, and detach only when the actor still has Estimate mutation permission |
| `scope_integrity` | Terminal fail-closed | `Update stopped to protect Estimate data because its ownership scope did not match.` | `Review details` in existing authorized observability and safe detach when permitted; no retry |
| `mapping_repair_required` | Terminal until repaired/recreated | `Linked instance data needs repair before it can update.` | `Review details`, `Detach this instance…`; no bulk retry |

Component/source-version races that can be replanned do not enter `failed`; the job remains pending with bounded backoff. Detached/deleted/not-found instances leave the active progress set rather than appearing as failures. Bulk retry derives its eligible IDs server-side from `retryable = true`, rechecks authorization/state, and reports skipped terminal instances.

## 6. Compact Read Projection

```ts
type EstimateTemplateLinkProjection = {
  instanceId: string;
  templateId: string;
  templateName: string;
  linkState: "linked" | "updating" | "failed";
  appliedVersionNumber: number;
  targetVersionNumber: number;
  failureClass: "transient" | "attempts_exhausted" | "component_unavailable" | "access_revoked" | "scope_integrity" | "mapping_repair_required" | null;
  retryable: boolean;
  isInstanceRoot: boolean;
  rootOrdinal: number | null;
  rootCount: number;
  isPrimaryRoot: boolean;
};
```

`EstimateTreeNode.templateLink` is optional. The tree repository loads link projections with one set-based join/CTE over node mappings and active instances. It does not query per node and does not add Template state to every row. Row mutation routing resolves the mapping server-side by `estimate_row_item_id`; the client does not clone all row items to carry instance metadata.

`EstimateSheetBranch` memo comparison adds only stable scalar values from `templateLink`. Callbacks remain stable through existing handlers. No broad `Map` or newly allocated affected-instance array is passed to every branch. The sheet-level announcer receives a compact instance-status projection keyed by `instanceId`, not cloned branch graphs.

## 7. Cache And React State

- The master mutation response is authoritative for source version and job counts.
- The initiating instance is drained first; if it completes before response, the server returns an authoritative refreshed subtree/tree revision.
- Other affected Estimates are invalidated by exact `estimateQueryKeys`, not by replacing every cached tree in the workspace.
- A visible `updating` instance uses TanStack Query `refetchInterval` only while `appliedVersionNumber < targetVersionNumber`; polling stops at current/failed/detached.
- `EditableRowStore.syncAuthoritativeRows` continues protecting dirty and awaiting-confirmation rows for non-destructive refreshes.
- If authoritative reconciliation removes a dirty shared row, deletion is **server-authoritative and immediate**; the client does not pause or block the instance transaction. Before removing active editor state, the store moves the unsaved values into a bounded session draft record keyed by Estimate, instance, and deleted row ID.
- The resulting notice says `Row removed from linked Template. Your unsaved draft was not applied.` It exposes `View/copy draft` and `Dismiss`; it does not offer `Keep row` inside the active link. Draft records survive refresh in `sessionStorage`, are capped at 20 per Estimate, expire after 24 hours, and contain no provider error or hidden source data.
- Focus moves to the nearest surviving row by stable order, then the mapped parent/root action if no sibling remains. The instance is current at the applied target version; there is no conflict-paused link state.
- No fetch-in-effect loop is introduced. Existing query and action boundaries remain the data owners.
- Shared edits do not receive an optimistic local patch before confirmation. Local takeoff edits retain current optimistic/revision behavior.
- Before applying a topology refresh, the virtual list captures the first visible stable node/row ID and pixel offset. If that ID survives, the same offset is restored; otherwise scroll anchors to the nearest surviving sibling then parent. Expanded IDs and selection survive only for existing IDs, removed selections are cleared, and one concise announcement identifies removed focused/selected content.

## 8. CRUD And Lifecycle Matrix

| Lifecycle action | Selected behavior |
| --- | --- |
| Create blank Template | Create master at version `1` with an empty snapshot. |
| Save Estimate node/tab as Template | Create an independent master at version `1`; never inherit a live instance link. |
| Duplicate Template | Create independent master/version `1`; instances are not copied. |
| Insert linked | Whole non-empty Template only; create one active instance and complete mappings atomically. |
| Insert copy | Current snapshot semantics; no instance/mappings. |
| Duplicate linked instance | Explicit action creates a second active instance to the same master with new Estimate IDs. |
| Duplicate as local copy | Copies materialized content without mappings. |
| Detach instance | Available from current/updating/failed; preserve the last atomically applied content, abandon any higher unapplied target, remove active mappings/job, null active master FK, no relink. |
| Delete instance | Delete its materialized roots/descendants and active instance/mappings; master and other instances remain. |
| Archive Template | Move to the library's `Archived` view; hide from active insertion/editor lists; existing linked instances remain active and continue current/recovery work. Restore is allowed. |
| Edit archived Template | Refuse normal edits until restore; recovery can still finish an already committed target. |
| Permanent delete master with no active instances | Delete versions/source graph after typed confirmation. |
| Permanent delete master with active instances | Exact impact preview plus typed Template name; one atomic set-based transaction detaches all instances, removes mappings/jobs, and deletes the master. Estimate content remains. |
| Insert Template into Template | Copy-only composition. No linked nesting or cycles. |
| AI package-builder apply | Remains snapshot provenance; no linked instance. |
| Existing historical copy | Remains independent; no automatic conversion. |
| Move instance root set | Local placement within one Estimate/tab; mapping source topology starts below the roots. |
| Move one internal mapped node | Shared Template mutation. |

### Detach flow

`Detach this instance…` is reachable from any mapped descendant context and the primary root action. It always opens a whole-instance dialog; there is no partial detach.

The dialog names the Template, Estimate, root count, applied version, target version, and consequence:

- current: `Keep the current v{applied} content as local Estimate data and stop future Template updates.`
- updating: `Keep the last complete v{applied} content. The pending v{target} update will not be applied.`
- failed: `Keep the last complete v{applied} content. The failed v{target} update will be abandoned.`

Submit uses an active-state/version guard and shows a non-dismissible busy state. If a processor wins the race, detach returns a fresh preview and requires reconfirmation against the new applied version. On success, focus returns to the initiating control if it survives; otherwise it moves to the first detached root. A shared edit that opened the dialog is cancelled and **not automatically replayed**. Its draft remains in the UI when safe, and completion copy says `Detached. Repeat your edit to apply it locally.`

### Archive, restore, and permanent delete

Template Library adds `Active` and `Archived` filters with counts. `Archived` owns loading, empty (`No archived Templates`), redacted error/retry, row action, and direct restore entry points. Restore returns the Template to `Active`, opens/focuses it, and does not create a new master version unless source content changes.

Permanent delete is available from the archived Template detail/menu:

- with zero active instances, type the exact Template name and confirm `Permanently delete`;
- with active instances, show project/Estimate/instance counts and require the exact Template name plus `Detach all {n} instances and permanently delete`;
- the D1 operation is atomic and set-based: either every instance is detached and the master is deleted, or nothing changes;
- the same batch commits a non-FK deletion receipt before removing the master, so same-intent resolution can show success after a disconnect even though the Template no longer exists;
- while submitting, show one busy state; on failure keep the Template and links unchanged with `Retry`; on success show `Template deleted; {n} instances kept as local Estimate content.`

Because this operation is atomic, it has no partial-detach recovery state. Any in-flight processor must fail its active-template/version guard after the delete transaction wins.

## 9. Performance Contract

### Database/read budgets

- Estimate tree load adds at most one D1 query/CTE for link projection and no per-node/per-row query.
- Component impact and Template impact are separate bounded queries; local quantity/adjustment edits do not execute Template impact queries.
- Master fan-out targeting uses set-based updates/upserts, not one statement per instance.
- Linked insertion and instance reconciliation use bounded JSON payloads plus set-based `json_each(?)` node, row, and mapping statements; neither path emits one D1 statement per graph item. The full immutable snapshot is rejected above 1.5 MB before mutation.
- Template-level progress reads use one indexed aggregate plus one paged detail query; no per-instance Estimate lookup is allowed.
- D1 target jobs run sequentially against `ARCH_DB`; no false parallelism is added.

### Request/recovery budgets

- Impact preview target: `<= 300 ms` local p95 for 100 active instances using indexed reads.
- Linked insertion target: no more than 20% slower than current copy for the same source graph, excluding unavailable-Component confirmation time.
- Confirmed edit target: initiating instance current or visibly updating within `1 s` local p95.
- Immediate drain: initiating instance plus up to eight additional targets or 750 ms of extra drain time after the current atomic target.
- Cron recovery: at most 25 targets per five-minute invocation; any pending target is retried by the next eligible trigger/backoff window.
- Estimate tree SQL duration target: link projection adds `<= 10%` at the representative 80-branch/75-row virtualization thresholds and `<= 15 ms` absolute local median, whichever allowance is larger.

### React/render budgets

- Local quantity edit rerenders only the edited row, its totals owners, and required ancestors; Template link status does not broaden the set.
- Link progress change rerenders only branches belonging to that instance plus existing aggregate status owners.
- Linked rail/badge adds no row-height change and no scroll jump in recursive or virtualized rendering.
- Topology refresh restores a stable-ID viewport anchor or deterministic sibling/parent fallback.
- No new full-sheet loading state appears for background propagation.

These are implementation acceptance targets, not current measurements.

## 10. Accessibility And Content Rules

- Color is never the only linkage/status signal; rail tone is paired with text/badge/icon.
- The sheet owns one instance-status live region. The primary root has the full semantic label; additional roots say `Linked part {ordinal} of {rootCount}` without repetitive live announcements.
- Shared controls expose `Changes all linked instances`; local takeoff controls expose `This Estimate only` in accessible descriptions where visual context is insufficient.
- Confirmation focus moves to the dialog title, returns to the initiating control on cancel, and moves to status on confirm only when needed.
- Destructive shared mutation copy names the scope and consequence in plain language.
- `Retry` and `Detach` are real buttons with disabled/busy state, not clickable text.
- Tooltips supplement persistent labels; they do not carry essential status alone.
- Updating state does not trap keyboard navigation or disable instance-owned cells.
- If reconciliation removes the focused item, focus and scroll move to the deterministic surviving sibling/parent fallback and the live region announces the removal once.
- At compact widths, the rail and textual `Linked`, `Updating`, or `Failed` state remain visible; the Template name truncates with an accessible full label, version and recovery actions move into a keyboard-operable overflow menu, and measured branch height stays unchanged.
- Impact/progress dialogs use `min(640px, calc(100vw - 32px))`, cap affected lists at 60 viewport height with virtualization, preserve `Escape` only before submit, and provide at least 44-by-44 CSS-pixel pointer targets without making drag/drop the only interaction.

## 11. Edge Cases Resolved

- **Multi-root Template:** one instance maps all roots; stable ordinals identify the group, one primary root owns visible status/actions, any root context can reach whole-instance actions, and the sheet owns announcements.
- **Empty Template:** remains editable but cannot be linked until it has at least one root; the chooser explains why and links back to the Template Editor.
- **Legacy tabless target:** linked preflight refuses it with the active-tab explanation and copy-only fallback; migration `0092` does not infer a tab.
- **Source row deleted while dirty locally:** confirmed master delete wins immediately; the row leaves the active link, the unsaved values move to the bounded recoverable session draft notice, and focus uses the stable fallback.
- **Mapped row manually missing:** reconciler repairs from stable mapping/master ID or fails visibly; it never guesses by text/order.
- **Estimate deleted:** FK cascade removes instance/mappings/job; master remains.
- **Project/workspace access revoked:** job guard refuses cross-scope work and moves to terminal `access_revoked`; bulk retry excludes it and actions depend on remaining authorization.
- **Archived master:** existing target jobs finish; new source edits/inserts are refused until restore.
- **Failed instance:** other instances continue; master version remains authoritative; retry or detach resolves the local state.
- **Two rapid master edits:** one coalescing job advances to the latest target; applied versions never regress.
- **Component discontinued/archived:** existing Component lifecycle rules remain authoritative; Template linkage does not fabricate availability.
- **Mixed bulk selection:** local+shared or multi-master commands fail before mutation and preserve selection; supported one-master bulk commands produce one revision/confirmation.
- **Shared Undo:** propagated commits never enter local Undo; reversal is another confirmed master mutation.
- **Updating/failed detach:** detach preserves the last complete applied version and explicitly abandons the higher target; no pending edit auto-replays.
- **Template Editor partial propagation:** the persistent linked-instance status surface remains available until all targets are current or failed/retried/detached.
- **Disconnect after confirm:** the dialog/card keeps the original intent single-flight; same-intent resolution returns the committed receipt or a definite not-applied result before any fresh preview is allowed.
- **Progress query fails:** last successful counts are labeled stale and query retry remains separate from job retry; with no cache, no mutation action is guessed.
