import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(PROJECT_ROOT, path), "utf8");
}

function expectSourceToContain(source: string, expected: string) {
  expect(source.includes(expected), `Expected source bundle to contain: ${expected}`).toBe(true);
}

function expectSourceNotToContain(source: string, staleCopy: string) {
  expect(source.includes(staleCopy), `Expected source bundle not to contain: ${staleCopy}`).toBe(false);
}

describe("library copy contract", () => {
  const copyDeck = readProjectFile(
    ".ai/09_archive/2026-06-20-Library-Page-Overall-Improvement/22-COPY-DECK-AND-MICROCOPY.md",
  );

  const sources = [
    "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx",
    "src/components/workshop/component-library-manager/AddComponentModal.tsx",
    "src/components/workshop/BulkDestructivePreviewModal.tsx",
    "src/components/workshop/library/overview/LibraryOverview.tsx",
    "src/components/workshop/library/overview/LibraryOverviewSearch.tsx",
    "src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx",
    "src/components/workshop/library/templates-browse/TemplateGallery.tsx",
    "src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx",
    "src/components/workshop/library/component-facet-filter-model.ts",
    "src/lib/component-library/quick-add-validation.ts",
  ].map(readProjectFile).join("\n");

  it("keeps implemented Library all-flow copy covered by active source and archived deck", () => {
    [
      "New folder",
      "Rename folder",
      "Folder name",
      "Create folder",
      "Save name",
      "Delete folder?",
      "Delete folder",
      "Keep folder",
      "Discard unsaved component?",
      "This component has unsaved edits. Choose how to handle it before closing.",
      "Unsaved changes are not stored after you discard them.",
      "Discard changes",
      "Keep editing",
      "Archive components",
      "Archiving keeps component history intact while hiding selected components from library insertion.",
      "Ready to ${actionCopy.verb}",
      "Cannot ${actionCopy.verb} yet",
      "Stale price",
      "Very stale price",
      "Missing price source",
      "Search components and templates",
      "No components or templates match",
      "Clear search",
      "Inserting into {selectedEstimate.name}",
      "Select where to insert.",
      "No open estimate to insert into.",
      "Open or create an estimate",
      "That estimate is no longer available. Choose another target.",
      "You cannot edit ${estimateName}. Choose a target you can edit.",
      "Loading projects",
      "Reload projects",
      "Insert template",
      "Enter a component name.",
      "Use 120 characters or fewer for the name.",
      "Enter a unit (e.g. each, m2, hr).",
      "Enter a unit cost.",
      "Enter a number for unit cost.",
      "Enter a unit cost of zero or more.",
      "Enter a pricing date that is not in the future.",
      "Enter a valid https URL.",
      "Shorten this URL.",
    ].forEach((expected) => {
      expectSourceToContain(sources, expected);
    });

    [
      "No source",
      "Pricing source is not set",
      "Archived components are hidden from browse and blocked from new inserts. You can restore them later.",
      "Ready to archive",
      "Cannot archive yet",
      "That estimate is no longer available. Choose another target.",
      "You cannot edit {estimateName}. Choose a target you can edit.",
      "Enter a component name.",
      "Enter a valid https URL.",
    ].forEach((expected) => {
      expectSourceToContain(copyDeck, expected);
    });
  });

  it("does not reintroduce stale destructive-dialog copy", () => {
    [
      'title: "Create folder"',
      'confirmLabel: "Rename folder"',
      "Discard component draft?",
      "Unsaved component details, uploaded images, and attachments for this draft will be removed.",
      "Archiving is reversible. Archived components can be restored later.",
      "Row items assigned to it will stay in the library without a folder.",
      'unlinked: "Unlinked"',
      '"linked-overridden": "Local overrides"',
      'detached: "Detached rows"',
      "Pricing date is not set",
      "Add your first component, or import from a price list.",
      "Create a template from scratch, or save any estimate group as a template from the estimate page.",
    ].forEach((staleCopy) => {
      expectSourceNotToContain(sources, staleCopy);
    });
  });
});
