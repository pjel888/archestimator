# Location, Map, CSP, And Provider ADR

Date: 2026-06-19
Status: required before Phase 3

## Decision

Use `project_locations` as the structured exact-coordinate boundary. Do not add exact latitude/longitude columns to `projects` while broad `select("*")` readers remain.

Interactive maps are optional for Phase 3. A structured non-map location editor may ship first. If an interactive map ships, use MapLibre GL JS with a config-driven style URL and OpenFreeMap public vector styles for closed-beta only, with a self-hosted Protomaps/PMTiles path available later.

## Provider Evidence

- OSMF tile policy: `https://operations.osmfoundation.org/policies/tiles/`
  - OSMF raster tile servers are best-effort, capacity-limited, no SLA, require visible attribution and proper request posture, and prohibit bulk/preseed/offline scraping.
- OSMF Nominatim policy: `https://operations.osmfoundation.org/policies/nominatim/`
  - Public Nominatim is limited, requires identification/attribution, bans autocomplete/systematic queries, and says not to submit confidential material.
- OpenFreeMap: `https://openfreemap.org/`
  - Public use is free and commercial use is allowed, but there is no SLA or personalized support.
- MapLibre GL JS: `https://maplibre.org/maplibre-gl-js/docs/`
  - Browser WebGL/vector-tile renderer; requires CSS/worker/CSP planning.
- Protomaps PMTiles: `https://docs.protomaps.com/pmtiles/maplibre`
  - Later self-host/static vector tile path for MapLibre.

## Network Privacy Decision

Exact coordinates are internal project data. Loading third-party map tiles centered on a pin reveals an approximate job-site area plus browser/IP timing to the tile/style provider.

Closed-beta acceptance rule:

- Owner/product must explicitly accept this provider inference before enabling the interactive public provider map by default.
- If not accepted, use text coordinates, manual coordinate fields, a disabled map, low-zoom obfuscated preview, or self-hosted tiles.
- No project name, client name, address text, proposal details, or internal ids may be encoded into map, style, tile, or geocoding URLs.

## Config Contract

Expected environment/config names may change during implementation, but the concepts are required:

- map enabled flag, for example `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED`;
- style URL, for example `NEXT_PUBLIC_PROJECT_LOCATION_MAP_STYLE_URL`;
- allowed style/tile host list;
- attribution text/source;
- provider name for user-facing copy;
- kill switch that leaves the location text UI usable.

Absent or invalid config fails closed: render text fallback, not a broken map.

## CSP And Header Contract

Implementation must account for:

- `connect-src` for style/tile endpoints;
- `img-src` for sprite/glyph/tile/image resources if used by the style;
- `style-src` for MapLibre CSS requirements;
- `worker-src` and/or `child-src` for MapLibre worker behavior;
- `blob:` only if MapLibre worker setup requires it and no narrower option is practical;
- no wildcard map domains unless separately justified.

Phase 3 completion needs source proof that CSP/header changes are intentional and bounded.

## Location Authorization

| Actor | Read exact location | Write/clear exact location |
|---|---|---|
| Project owner/admin/manager | Yes | Yes |
| Project editor | Yes | Yes if current project edit semantics allow it |
| Project viewer | Yes only if project detail access includes location | No |
| Sheet-only collaborator | No by default unless they also have project detail access | No |
| Anonymous/public share recipient | No | No |
| Sample project | Read sample text only | No persistence |

RLS and server actions must enforce this matrix; UI hiding is not sufficient.

## Data Lifecycle

`project_locations` must define:

- FK cascade on project/workspace delete;
- behavior for account deletion when `updated_by` points to a deleted user;
- whether location appears in project/account export;
- whether `geocoder_provider`, `geocoder_place_id`, and `geocoded_at` are retained, cleared, or never written in MVP;
- audit/logging behavior for location changes;
- backup/restore note consistent with closed-beta no-PITR posture.

Exact location must be included in DSAR/delete/export runbooks before Phase 3 beta-ready claims.

## Telemetry And Analytics

- No map SDK telemetry or custom location analytics leaves the browser by default.
- Any future location analytics must be server-side sanitized with rounded coordinates, geohash, or regional aggregation.
- Vercel analytics `/workshop` redaction must remain true after map implementation.
- No provider URL may include project/client/address metadata.

## Abuse Controls

- Reject out-of-range latitude/longitude.
- Debounce or rate-limit repeated save attempts.
- Do not enable geocoding until a separate server-side, cached, rate-limited endpoint plan exists.
- Tests must mock provider failure and block accidental public provider calls.

## Acceptance

Phase 3 cannot claim complete unless:

- map can be disabled without breaking location read/edit;
- map attribution is visible when map renders;
- no WebGL/provider failure leaves the dashboard unusable;
- CSP/header proof is present;
- RLS/grants/generated types are present;
- DSAR/export/delete/lifecycle proof is present;
- coordinates are absent from public share, proposal/export, AI/context, analytics, and broad project row readers by default.
