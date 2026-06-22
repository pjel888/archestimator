# Location, Map, CSP, And Provider ADR

Date: 2026-06-19
Status: required before Phase 3; Google Maps/Places addendum supersedes prior OpenFreeMap/MapLibre target

## Decision

Use `project_locations` as the structured exact-coordinate boundary. Do not add exact latitude/longitude columns to `projects` while broad `select("*")` readers remain.

Interactive maps/search are optional for Phase 3. A structured non-map location editor may ship first. If autocomplete or an interactive map ships, use Google Maps Platform as the single provider: Google Places Autocomplete for setup/edit search and Google Maps JavaScript API for display.

The earlier OpenFreeMap/MapLibre direction is superseded. Do not display Google Places results on OpenFreeMap/MapLibre, and do not keep the old provider path as an active alternate unless a later plan explicitly reopens provider strategy.

## Provider Evidence

- Google Maps JavaScript API loading: `https://developers.google.com/maps/documentation/javascript/load-maps-js-api`
  - Requires a Google Maps Platform API key and supports client-side lazy loading.
- Google Places Autocomplete: `https://developers.google.com/maps/documentation/javascript/place-autocomplete-new`
  - Provides the set/edit type-ahead search UI and can fetch selected-place fields such as formatted address and location.
- Google Autocomplete session pricing: `https://developers.google.com/maps/documentation/javascript/session-pricing`
  - Fits a low-frequency setup/edit flow where a user selects a project location once and the app stores coordinates.
- Google Places policies: `https://developers.google.com/maps/documentation/places/web-service/policies`
  - Places results displayed on a map should be shown on a Google Map with required attribution/branding.
- Google Maps Platform pricing: `https://mapsplatform.google.com/pricing/`
  - Requires budget/quota controls before beta enablement.
- OSMF Nominatim policy: `https://operations.osmfoundation.org/policies/nominatim/`
  - Public Nominatim remains rejected for autocomplete/systematic queries and confidential project material.

## Network Privacy Decision

Exact coordinates are internal project data. Loading a Google map centered on a pin reveals an approximate job-site area plus browser/IP timing to Google. Using Places autocomplete also sends the user's typed location query to Google during set/edit.

Closed-beta acceptance rule:

- Owner/product must explicitly accept this Google provider inference before enabling Google Maps/Places by default.
- If not accepted, use text coordinates, manual coordinate fields, a disabled map, or a non-provider setup flow.
- No project name, client name, proposal details, internal ids, or raw Google response payloads may be encoded into provider URLs or stored by default.
- Autocomplete is allowed only in set/edit flows. Normal dashboard display must use stored coordinates and stored address text rather than repeated geocoding.

## Config Contract

Expected environment/config names may change during implementation, but the concepts are required:

- map/search enabled flag, for example `NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED`;
- provider flag/name, with `google` as the active target;
- browser public API key, for example `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`;
- optional Google Map ID/styling key if required by implementation;
- optional autocomplete region bias, for example `NEXT_PUBLIC_GOOGLE_PLACES_REGION`;
- provider name for user-facing copy;
- budget/quota ownership and alerting note outside source-controlled env files;
- kill switch that leaves the location text UI usable.

Absent or invalid config fails closed: render text fallback, not a broken map.

## CSP And Header Contract

Implementation must account for:

- `script-src` for Google Maps JavaScript loader domains;
- `connect-src` for Google Maps/Places API calls;
- `img-src` for Google map tiles, marker/icon assets, and data URLs when required;
- `style-src` if Google-rendered controls require injected styles;
- no wildcard map domains unless separately justified;
- no legacy OpenFreeMap/MapLibre CSP allowances after the implementation removes that provider path.

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
- whether `geocoder_name`, `provider_place_id`, `geocoded_at`, and metadata are retained, cleared, or never written in MVP;
- audit/logging behavior for location changes;
- backup/restore note consistent with closed-beta no-PITR posture.

Exact location must be included in DSAR/delete/export runbooks before Phase 3 beta-ready claims.

## Telemetry And Analytics

- No custom location analytics leaves the browser by default.
- Google Maps/Places provider requests are limited to map display and set/edit autocomplete behavior; do not add extra telemetry or provider-side enrichment.
- Any future location analytics must be server-side sanitized with rounded coordinates, geohash, or regional aggregation.
- Vercel analytics `/workshop` redaction must remain true after map implementation.
- No provider URL may include project/client/proposal/internal metadata.

## Abuse Controls

- Reject out-of-range latitude/longitude.
- Debounce or rate-limit repeated save attempts.
- Do not enable non-Google geocoding.
- Do not add a server-side bulk geocoding endpoint in this pass.
- Tests must mock Google provider failure and block accidental live provider calls.
- Configure Google Cloud budget alerts, quota caps, browser key restrictions, and localhost/production-domain restrictions before enabling the feature outside local development.

## Acceptance

Phase 3 cannot claim complete unless:

- map/search can be disabled without breaking location read/edit;
- Google attribution/branding is visible and unobstructed when map renders;
- missing key, disabled provider, quota, CSP, or load failure leaves the dashboard usable;
- CSP/header proof is present;
- Google key restriction, budget, and quota proof is recorded before beta enablement;
- RLS/grants/generated types are present;
- DSAR/export/delete/lifecycle proof is present;
- coordinates are absent from public share, proposal/export, AI/context, analytics, and broad project row readers by default.
