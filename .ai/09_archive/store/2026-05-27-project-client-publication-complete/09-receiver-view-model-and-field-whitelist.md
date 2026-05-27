# Receiver View Model And Field Whitelist

**Date:** 2026-05-27
**Status:** Implemented V1 safe payload contract. Keep this aligned with `src/lib/publication/snapshot.ts` and receiver rendering.

## Rule

Receiver routes render sanitized snapshot DTOs only. They must never render raw database rows, raw metadata blobs, raw source snapshots, collaboration objects, auth profiles, or internal route data.

## V1 Receiver DTO

```ts
type PublicationReceiverView = {
  publication: {
    title: string;
    publishedAt: string;
    snapshotVersion: number;
    contentMode: "snapshot";
    openedTrackingLabel: "best-effort";
  };
  project: {
    name: string;
    code: string | null;
    clientName: string | null;
    location: string | null;
  };
  estimates: PublishedEstimateSummary[];
  notes: PublishedNote[];
};
```

```ts
type PublishedEstimateSummary = {
  id: string;
  sheetCode: string | null;
  name: string;
  total: number;
  currency: string;
  groups: PublishedGroupTotal[];
  rows: PublishedLineItem[] | null;
};
```

```ts
type PublishedGroupTotal = {
  label: string;
  amount: number;
  currency: string;
  children?: PublishedGroupTotal[];
};
```

```ts
type PublishedLineItem = {
  label: string;
  quantity: number | null;
  unit: string | null;
  unitCost: number | null;
  miscCost: number | null;
  contingencyPercentage: number | null;
  total: number;
  supplierName: string | null;
  categoryName: string | null;
  note: string | null;
};
```

```ts
type PublishedNote = {
  label: "Inclusion" | "Exclusion" | "Assumption" | "Validity" | "Other";
  text: string;
};
```

The final implementation may adjust TypeScript names, but it must preserve the whitelist discipline.

## Allowed Source Mapping

| Receiver field | Allowed source | Notes |
| --- | --- | --- |
| `project.name` | `projects.name` | Required if included in snapshot |
| `project.code` | `projects.project_code` | Optional |
| `project.clientName` | `projects.client_name` only if manager includes it | Default off if privacy decision requires |
| `project.location` | explicit project field/metadata only if whitelisted | Never dump raw metadata |
| `estimate.sheetCode` | estimate sheet code | Optional |
| `estimate.name` | estimate name | Required |
| `estimate.total` | computed from included rows | Use current formula below |
| `groups` | estimate tree group/area names plus totals | No raw node ids |
| `rows.label` | row component/manual label | Required for detail mode |
| `rows.quantity` | row quantity | Optional if detail mode |
| `rows.unit` | row unit | Optional if detail mode |
| `rows.unitCost` | row unit cost | Optional if detail mode |
| `rows.miscCost` | row misc cost | Optional if detail mode |
| `rows.contingencyPercentage` | row contingency percentage | Optional if detail mode |
| `rows.supplierName` | sanitized snapshot supplier name | No supplier ids |
| `rows.categoryName` | sanitized category display name | No taxonomy ids |
| `notes` | explicit publication-safe fields only | No arbitrary project metadata dump |

## Total Formula

Use the current estimate/charts/proposal-compatible formula:

```txt
subTotal = quantity * unit_cost
contingencyValue = subTotal * contingency_percentage / 100
total = subTotal + contingencyValue + misc_cost
```

Rules:

- Treat missing numeric values according to existing estimate row total conventions.
- Do not invent proposal/export totals that differ from current app totals.
- Snapshot stores calculated totals so receiver output does not drift.

## Explicitly Excluded Fields

Never include by default:

- `workspace_id`;
- user ids;
- member ids;
- member emails;
- collaborator names unless copied into explicit published notes later;
- role names;
- Teamspaces invitation state;
- project Presence channel;
- estimate Broadcast channel;
- Supabase auth profile metadata;
- raw `projects.metadata`;
- raw `estimates.metadata`;
- raw `estimate_nodes.id`;
- raw `estimate_row_items.id`;
- raw `source_snapshot`;
- cost library item ids;
- component price-option ids;
- private storage paths;
- private attachment object keys;
- AI audit metadata;
- account security events;
- service-role or provider details.

## Media And Attachment Rules

V1 default:

- Do not publish downloads.
- Do not publish private component attachments.
- Project/component images may appear only if copied into the snapshot as explicitly published media with safe URL, alt text, dimensions, and no private storage path exposure.
- If media is not explicitly whitelisted, omit it.

Future attachment/download support requires a new artifact/download plan.

## Detail Levels

V1 may support these detail choices:

| Level | Receiver output |
| --- | --- |
| Summary | project and estimate totals only |
| Grouped totals | totals by space/category/supplier as snapshot permits |
| Line detail | selected row detail using `PublishedLineItem` |

The manager UI must show which level will be published before creating the snapshot.

## Snapshot Payload Metadata

Snapshot JSON may include internal schema metadata for server use:

```ts
type PublicationSnapshotEnvelope = {
  schemaVersion: 1;
  createdAt: string;
  contentHash: string;
  view: PublicationReceiverView;
};
```

Server-only metadata can exist in DB columns, but receiver route should render only `view`.

## Validation Requirements

Tests must prove:

- receiver route never receives raw table rows from the resolver;
- safe DTO excludes collaboration fields;
- safe DTO excludes raw ids and raw source snapshots;
- password gate loads no DTO data before password success;
- snapshot total formula matches current estimate total formula;
- later estimate edits do not mutate stored snapshot DTO;
- media/attachment paths are omitted unless explicitly published.
