# Project Modal Location And Thumbnail Fallback Plan

Date: 2026-06-24

## Outcome

Fix the create/edit project modal location experience and project-card thumbnail fallback order.

## Scope

- Create project modal: verify existing fields still submit and location selection keeps working.
- Edit project modal: replace the plain location text field with the project address autocomplete flow, save selected Google place coordinates through `saveProjectLocation`, and update the preview map while editing.
- Project cards: keep uploaded thumbnails first; when absent, use a map screenshot derived from the saved project location; only fall back to generated motif/gradient placeholders when no map preview can be produced.

## Non-goals

- No database migration.
- No provider/project changes outside the Archestimator app.
- No broad project-card redesign.
- No production deploy.

## Acceptance Criteria

- All create/edit modal fields remain present and editable: name, client, currency, project code, location, and project image.
- Create modal still saves plain typed location text and saves exact `project_locations` data when a Google suggestion is selected.
- Edit modal supports Google address suggestions, updates the location field after selection, saves exact map data, and keeps manual typed text valid.
- Edit modal map preview reflects the selected place during editing.
- Project-card image fallback order is uploaded project thumbnail/full image, then map preview image when a saved location and map key exist, then generated motif/gradient fallback.
- Focused tests cover the edit modal location/autocomplete path and card fallback priority.

## Validation

- `bun run test:dom -- tests/vitest/new-project-form-validation.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/projects-page-create-optimistic.test.tsx`
- `bunx tsc --noEmit --pretty false`
- `git diff --check`
- UltraQA-style adversarial checks: manual typed address, Google-selected address, uploaded image priority over map fallback, no-location fallback, and unavailable map-key fallback.
