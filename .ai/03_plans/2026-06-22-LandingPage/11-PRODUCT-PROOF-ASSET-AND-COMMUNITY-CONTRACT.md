# Product Proof Asset And Community Contract

Date: 2026-06-22
Scope: future Archestimator landing-page implementation

This document defines what counts as acceptable product proof and community
presence for the next homepage. It exists so the future implementation can show
real software without inventing proof, fake traction, or dead social links.

## Product Proof Priority

The homepage should sell through visible Archestimator surfaces, not generic SaaS
cards. Product proof priority:

1. Estimate Sheet with project tree, areas, rows, quantities, totals, and save
   state.
2. Reusable Cost Library/Templates with supplier/source metadata.
3. Revision or Activity record tied to estimate changes.
4. Shared Proposal Review with comment/decision state.
5. Workshop Dashboard, charts, and export as supporting proof.

The `/workshop` route is the visual baseline for all faithful panels: gray
canvas, tight grid, liquid glass, precise orange accents, small labels, and
controlled empty space.

## Asset Manifest

Every landing proof asset should have a short manifest entry:

```ts
type LandingProofAsset = {
  id: string;
  kind: "real-screenshot" | "faithful-panel" | "generated-background";
  sourceRoute?: string;
  sourceComponents?: string[];
  viewport?: string;
  fixtureOrDataset?: string;
  capturedAt?: string;
  privacyChecked: boolean;
  format?: "avif" | "webp" | "png" | "tsx";
  maxBytes?: number;
  landingUse: "hero" | "proof-strip" | "feature-section" | "supporting";
};
```

Manifest entries may live near the future landing component or in the PR notes,
but they must exist before screenshots are treated as proof.

## Real Screenshot Rules

Use real screenshots when clean demo data is available.

Required:

- capture from a local/demo account only;
- remove private client, supplier, address, email, phone, token, or project data;
- use stable viewport dimensions;
- crop intentionally so the product remains readable;
- compress to AVIF/WebP where practical;
- set explicit dimensions or `aspect-ratio` in the page.

Recommended capture set:

| Asset | Suggested route/surface | Landing role |
| --- | --- | --- |
| Estimate Sheet hero | `/workshop/projects/[projectId]/estimates/[nodeId]` | Above-the-fold proof |
| Library panel | `/workshop/library` or templates route | Reuse/source proof |
| Shared review | `/share/[token]` using demo token | Client approval proof |
| Workshop dashboard | `/workshop` | System overview/support |

## Faithful Panel Rules

If real screenshots are not ready, faithful TSX panels are acceptable. They must
be visibly grounded in the current product and should inspect source components
first.

Required:

- use real Archestimator vocabulary: estimate sheet, area, item, quantity, unit,
  rate, subtotal, revision, library, proposal, comment, approved/rejected;
- use realistic AEC data, not fake enterprise metrics;
- match `/workshop` visual language rather than external template chrome;
- avoid fake logos, fake customers, fake testimonials, fake usage counts, or fake
  "trusted by" sections;
- keep text selectable and accessible whenever the panel is built in TSX.

Suggested demo data shape:

```ts
const landingEstimateRows = [
  { area: "Lobby", item: "Wall finish", qty: "184", unit: "sqm", rate: "$42.00" },
  { area: "Level 02", item: "Acoustic ceiling", qty: "96", unit: "sqm", rate: "$68.00" },
  { area: "Core", item: "Fire-rated door set", qty: "8", unit: "ea", rate: "$1,420" },
];
```

## Generated Image Rules

Generated images are allowed for textures, material scenes, subtle background
fields, or editorial visual support. They are not product proof.

Allowed:

- abstract drafting/net/signal fields;
- soft material backdrops;
- orange/gray glass textures;
- non-specific product-adjacent scenes.

Forbidden:

- generated screenshots presented as real UI;
- generated people presented as customers or team members;
- generated logos, testimonials, metrics, or partner proof.

## Community Contract

Community/follow links are useful, but only if real.

Render the community section when at least one maintained destination exists:

1. LinkedIn
2. Instagram
3. WhatsApp
4. Facebook
5. Newsletter/email

If no maintained destination exists, omit the section and record:

```text
Community section omitted: no live maintained destinations confirmed.
```

Required for each rendered channel:

- real `href`;
- visible icon plus visible label;
- accessible name that includes the visible label;
- no placeholder `#`, empty strings, or "coming soon" social links;
- WhatsApp must be a maintained number, group, or channel link.

Recommended section copy:

```text
Follow the build.
Get launch notes, product updates, and early workflow examples as Archestimator moves through closed beta.
```

## Stop Condition

Do not call the landing proof layer ready until:

- the hero shows an Estimate Sheet or faithful equivalent;
- at least one below-fold proof section shows Library, Activity, or Shared
  Proposal context;
- every screenshot/panel has either a manifest entry or a documented source
  component basis;
- community links are either real and accessible or intentionally omitted;
- no proof element depends on fake customers, fake metrics, fake logos, or
  contractor-first framing.
