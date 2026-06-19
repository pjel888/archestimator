# Test Fixtures And Stop Conditions

Date: 2026-06-19
Status: required before implementation closeout

## Fixture Matrix

| Fixture | Phase | Target tests | Expected assertion |
|---|---|---|---|
| `recentSheets.empty` | 1 | Recent sheets repository/component | Empty row and estimate-route action render. |
| `recentSheets.single` | 1 | Recent sheets repository/component | One row links correctly. |
| `recentSheets.moreThanLimit` | 1 | Repository | Default limit 5, hard clamp 10. |
| `recentSheets.sameTimestamp` | 1 | Repository | Deterministic secondary sort. |
| `recentSheets.noFirstNode` | 1 | Component | Row uses estimate-level fallback route. |
| `publication.unpublished` | 1 | Published-link component | Manage/create only. |
| `publication.activeNoOpens` | 1 | Published-link component | Copy primary, no false open claim. |
| `publication.activeWithPassword` | 1 | Published-link component | Password badge without password value. |
| `publication.revokedOrExpired` | 1 | Published-link component | Open/copy hidden or disabled. |
| `publication.recipientIdentity` | 1 | DTO/component | Email/display name absent by default. |
| `identityRail.editAndBlur` | 1 | Project dashboard client/action | Name/client/address save still works or replacement save passes. |
| `identityRail.hiddenMetadata` | 1 | Project dashboard client | Image, currency, project code preservation. |
| `activity.empty` | 2 | Activity repository/component | Empty estimate-activity row. |
| `activity.twoPages` | 2 | Repository | Cursor returns next page once, no duplicates. |
| `activity.concurrentInsert` | 2 | Repository | New insert does not duplicate/skip cursor window. |
| `activity.restrictedSheet` | 2 | Repository/RLS | Restricted events omitted. |
| `activity.sensitivePayload` | 2 | DTO/component | Forbidden fields absent from client props. |
| `activity.deletedSheet` | 2 | Component | Historical context renders safely. |
| `location.none` | 1/3 | Location component | No fake pin. |
| `location.addressOnly` | 1/3 | Location component | Address text plus no exact pin state. |
| `location.validManualPin` | 3 | Repository/action/component | Save/reload exact pin. |
| `location.invalidLatLng` | 3 | Repository/action/component | Save rejected with field-level error. |
| `location.googleDisabledOrMissingKey` | 3 | Component/source | Text fallback, no Google import/network. |
| `location.googleLoaderOrQuotaFailure` | 3 | Component/browser | Text fallback remains useful. |
| `location.googleAutocompleteSelect` | 3 | Component/action | Google place selection stores formatted address, place id, latitude, and longitude once. |
| `privacy.publicShare` | 3 | Share/proposal tests | Coordinates absent by default. |
| `privacy.aiContext` | 3 | AI/context tests | Coordinates absent by default. |
| `privacy.exportProposal` | 3 | Export/proposal tests | Coordinates absent by default. |
| `privacy.broadProjectReader` | 3 | Repository/source tests | Broad `projects` DTOs do not include exact coordinates. |

## Browser Artifact Contract

Use `.omx/artifacts/project-dashboard-command-surface/<phase>/` for implementation artifacts.

Required Phase 1 browser artifacts:

- desktop project route screenshot or equivalent proof;
- mobile project route screenshot around 390px width;
- no white route slab proof;
- no horizontal overflow proof;
- focus/tap sizing notes.

Required Phase 3 browser artifacts:

- Google branding/attribution visible;
- map controls do not overlap dashboard chrome;
- disabled/missing-key fallback;
- quota/load-failure fallback or documented safe substitute;
- autocomplete set/edit proof with mocked Google response;
- text coordinates/address visible without map.

## Stop Conditions

PASS:

- every implemented phase has green targeted tests;
- database phases have migration/RLS/generated-type proof;
- `git diff --check` passes;
- browser artifacts exist for browser-only claims;
- no P0 privacy, authz, raw-payload, fan-out, or shell regression remains.

PARTIAL PASS:

- all implemented phase rows are green;
- later phases are explicitly deferred;
- deferred rows are marked non-blocking for the current phase.

BLOCKED:

- required provider, linked Supabase, local DB, or browser proof is unavailable;
- next-best local/source proof is recorded;
- residual risk is explicit.

FAIL:

- project activity fans out per estimate sheet;
- restricted sheet events leak;
- forbidden activity fields reach client props;
- coordinates reach public share, proposal/export, AI/context, analytics, or broad project readers by default;
- map/provider tests call live Google Maps/Places or public network;
- chrome streaming is collapsed into a monolithic dashboard fetch;
- `loading.tsx` or `ProjectRouteContentFallback` still renders the old white slab;
- location write authz, RLS/grants, generated types, or migration proof is missing for implemented database changes.

## Review Checklist

Before claiming this planning pack has been followed, the implementer must mark each row:

- passed with evidence;
- intentionally deferred by phase;
- blocked with next-best proof and residual risk;
- failed and fixed before closeout.
