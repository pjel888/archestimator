# Legacy Cutover and Recovery

## Goal

Finish the migration already present in the repository:

```text
legacy project publication/shared link
→ modern project Client Portal
→ persistent timeline and issue history
```

Do not create a second migration bridge or preserve new legacy authoring indefinitely.

## Current dual system

### Legacy

- `project_publications`;
- selected estimate IDs and snapshot JSON;
- shared-link recipients;
- comments;
- responses;
- events;
- `/workshop/publisher` authoring through Share Wizard;
- `/share/[token]` legacy view.

### Modern

- `client_portals`;
- stable portal token;
- sections;
- numbered immutable issues;
- recipients and role policy;
- discussions;
- decisions;
- audit;
- legacy mapping;
- public token dispatch to `ClientPortalShell`.

The target removes legacy authoring while preserving historical access.

## Cutover principles

1. Modern portal is the only target.
2. No new legacy publication after cutover.
3. Stable public links must not silently break.
4. Existing comments and decisions must remain attributable.
5. Migration is idempotent.
6. Legacy writes freeze before final mapping.
7. Historical rows remain until explicit later archival.
8. Backfill limitations are visible, not guessed.
9. Rollback means re-enabling an audited write boundary only before destructive removal.
10. Do not hard-delete legacy data in this plan.

## Phase 0 — Inventory

Create an operator-readable inventory:

- project count;
- legacy publication count by status;
- publications with missing encrypted token;
- recipient count;
- comment count;
- response/decision count;
- event count;
- current legacy mappings;
- mapping status;
- modern portal count;
- projects with both legacy and modern records;
- orphaned or inconsistent rows;
- hosted/local distinction.

Record hashes and timestamps.

## Phase 1 — Stop new legacy creation

Change user-facing creation paths:

- Share Wizard no longer calls legacy republish/create mutation.
- “Create client link” becomes “Create portal” or “Open portal”.
- Estimate Publish to Timeline opens modern issue draft.
- Workspace Publisher deep links to modern project/portal surface.

Keep legacy read and current mutation paths available only until migration/writes freeze.

## Phase 2 — Create/match portals

For each legacy publication:

1. look for existing verified `client_portal_legacy_mappings`;
2. if present, verify project/workspace/token relationship;
3. if absent, find unambiguous modern portal intended for migration;
4. otherwise create one portal with:
   - project/workspace;
   - suitable name;
   - audience kind `client`;
   - purpose `Migrated legacy client link`;
   - stable token or mapped legacy token behavior;
5. create mapping idempotently;
6. do not create duplicate issue when content hash already migrated.

## Phase 3 — Backfill issue

Map legacy snapshot to an immutable Client Portal issue:

- project identity;
- selected estimates;
- total/currency;
- version/snapshot number;
- published at/by;
- expiration/validity;
- password/access;
- issue sections;
- content hash;
- recipients.

Use existing migration service behavior where current. Extend only where needed for package/timeline/baseline.

## Phase 4 — Backfill recipients

For each legacy recipient:

- create or match portal recipient;
- preserve display/email/organization where permitted;
- map permission role conservatively;
- preserve invited/active/revoked state;
- do not expose raw recipient credential;
- create new credential only through normal invite/reissue flow;
- preserve historic recipient IDs in migration metadata.

Suggested role mapping:

```text
legacy view-only → viewer
legacy comment identity → commenter
legacy decision signer → approver if decision policy proves it, otherwise reviewer
```

Do not infer legal authority.

## Phase 5 — Backfill discussions

Map legacy comments to:

- portal/issue/estimate/row targets where reliable;
- client-visible messages;
- author snapshots;
- created time;
- snapshot version metadata.

If a target row cannot be mapped to a modern public ID:

- preserve as issue-level or estimate-level historic comment;
- retain original target label in metadata;
- do not invent a row mapping.

## Phase 6 — Backfill decisions

Map legacy responses:

- approved;
- changes requested;
- declined;
- signer;
- note;
- created time;
- snapshot version;
- content identity.

Where the exact modern content hash can be proved, link it.

Where it cannot:

- preserve as legacy decision metadata;
- do not use it to establish a new active baseline automatically unless the approved issued content is unambiguous.

## Phase 7 — Backfill baseline

For unambiguous approved modern issues:

- create baseline records in acceptance order;
- newest accepted becomes active;
- emit baseline history events.

For legacy approval without sufficient content identity:

- mark for manual review;
- no invented baseline.

## Phase 8 — Backfill commitment events

Create only meaningful events:

- issue published;
- comment/discussion started;
- decision submitted;
- issue accepted/declined/changes requested;
- baseline established where valid;
- access withdrawn if historically relevant.

Do not import every open/password/security event into the contractual timeline.

## Phase 9 — Source-comparison capability

### Full source backfill

Allowed only if stored authoring semantic hash and current source hash match exactly.

Then:

- create private source estimate/row projections;
- mark `comparison_capability=full`.

### Aggregate-only

If total and issued public rows are available but stable source identity is not:

- preserve issued content;
- allow total/section comparison;
- mark `aggregate_only`.

### Unavailable

If content is incomplete or inconsistent:

- preserve read/decision;
- mark comparison unavailable;
- show limitation.

Never use semantic/AI matching to invent historical row identity.

## Phase 10 — Write freeze

Use existing audited controls:

```text
client_portal_legacy_migration
client_portal_legacy_write_freeze
```

Sequence:

1. verify mapping/backfill;
2. enable write freeze;
3. prove legacy comment/decision mutation returns the intended migration response;
4. prove modern portal mutation works;
5. monitor local/preview logs;
6. switch Publisher data source;
7. stop new legacy publication actions.

Do not create a new flag unless current controls cannot express the required safe transition.

## Phase 11 — Public access cutover

The stable legacy link should:

- continue to resolve;
- dispatch or map to the modern portal;
- preserve password/recipient session behavior where possible;
- show an explicit safe migration message only during a bounded transition;
- never reveal the new raw token.

Verify:

- anonymous read rules;
- password;
- personalized recipient link;
- comments;
- decisions;
- issue history;
- artifact reads;
- request creation;
- link rotation/access off.

## Phase 12 — Workspace Publisher cutover

Replace legacy roster query with modern commitment-center query.

The UI no longer presents:

- legacy snapshot staleness as the primary model;
- create/update legacy link;
- replace legacy link as ordinary workflow.

It presents:

- portal;
- baseline;
- pending issue;
- requests;
- waiting discussions;
- decisions;
- access/delivery.

Legacy migration status may remain in an operator-only detail until all rows are complete.

## Phase 13 — Authoring removal

After proof:

- remove legacy create/republish calls;
- remove Share Wizard;
- remove legacy publisher drawer actions;
- remove unused server actions;
- remove onboarding references to Client Links;
- retain legacy read repository and migration tooling;
- enforce a static/contract check that no normal UI imports legacy write actions.

Do not delete tables.

## Future archival, outside this plan

Only after a later explicit decision:

- archive legacy read UI;
- export final evidence;
- remove legacy tables;
- purge old tokens;
- remove mapping code.

That is not part of this implementation.

## Idempotency

Each migration operation uses a deterministic key:

```text
legacy publication ID
legacy recipient ID
legacy comment ID
legacy response ID
legacy event ID
```

Unique mapping indexes prevent duplicates.

Rerun behavior:

- existing valid mapping → verify and skip;
- partial mapping → resume missing pieces;
- conflicting mapping → fail and record operator issue;
- source changed → fail, do not overwrite;
- public token mismatch → fail closed.

## Recovery

### Before write freeze

Fix forward or discard newly created modern mapping rows if no public/user action exists and the operation is proven isolated. Prefer fix forward.

### After write freeze, before Publisher switch

Disable freeze only through the existing audited control if modern mutation is unavailable and no conflicting modern writes occurred.

### After Publisher switch

Do not revert ordinary users to legacy authoring. Fix modern path. Legacy remains read-only.

### After modern decisions/requests

Never roll back by deleting those records. Fix forward and preserve history.

## Failure scenarios

### Missing legacy token

- migrate data internally;
- mark public-link preservation blocked;
- require recipient reissue;
- no false “migrated” status.

### Duplicate modern portals

- do not merge automatically;
- mark conflict;
- operator chooses correct commitment scope.

### Legacy publication newer than mapped issue

- migration state becomes stale;
- freeze/write sequence waits;
- republish modern issue from verified source.

### Comment target unavailable

- preserve at nearest valid issue/estimate target;
- include historic target label;
- no silent drop.

### Decision content identity unavailable

- preserve decision as legacy history;
- do not create baseline automatically.

### Backfill interrupted

- rerun idempotently;
- no partial status “complete” until all child rows verify.

### Public route fails after cutover

- legacy read path may remain as emergency read-only fallback only if exact mapping state is safe;
- no dual writes;
- record incident and fix modern path.

## Evidence artifacts

Required:

```text
artifacts/quality/legacy-inventory.json
artifacts/quality/legacy-migration-dry-run.json
artifacts/quality/legacy-migration-apply-local.json
artifacts/quality/legacy-migration-replay.json
artifacts/quality/legacy-write-freeze.json
artifacts/quality/legacy-public-link-browser.json
artifacts/quality/legacy-zero-write-scan.json
```

Each records:

- source head;
- schema version;
- counts;
- mappings;
- conflicts;
- hashes;
- command;
- timestamp;
- result.

## Completion criteria

- no normal UI creates legacy publication;
- no normal public mutation writes legacy comment/decision after freeze;
- every eligible legacy publication is mapped or explicitly blocked with reason;
- stable links are proven or reissue is explicit;
- modern portal contains preserved content, recipients, discussions, decisions;
- baseline is created only from unambiguous acceptance;
- workspace Publisher reads modern data;
- legacy authoring components/actions are removed;
- legacy read/history remains until later archival.
