import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(PROJECT_ROOT, path), "utf8");
}

describe("library copy contract", () => {
  it("does not reintroduce stale destructive-dialog or source-trust copy", () => {
    const sources = [
      "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx",
      "src/components/workshop/component-library-manager/AddComponentModal.tsx",
      "src/components/workshop/BulkDestructivePreviewModal.tsx",
      "src/components/workshop/library/source-trust-model.ts",
      "src/components/workshop/library/overview/LibraryOverview.tsx",
      "src/components/workshop/library/templates-browse/TemplateGallery.tsx",
      "src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx",
    ].map(readProjectFile).join("\n");

    expect(sources).toContain('title: "New folder"');
    expect(sources).toContain('confirmLabel: "Save name"');
    expect(sources).toContain('title="Discard this draft?"');
    expect(sources).toContain("Archived components are hidden from browse and blocked from new inserts. You can restore them later.");
    expect(sources).toContain('unlinked: "Not linked"');
    expect(sources).toContain('"linked-overridden": "Local override"');
    expect(sources).toContain('detached: "Detached"');
    expect(sources).toContain('title: "No source confidence recorded."');
    expect(sources).toContain('"No pricing date recorded. Add one to track freshness."');
    expect(sources).toContain('label: "Verified source"');
    expect(sources).toContain('label: "Likely source"');
    expect(sources).toContain('label: "Low confidence"');
    expect(sources).toContain('title: "Recorded confidence note."');
    expect(sources).toContain('title="Your library is empty."');
    expect(sources).toContain('description="Add a component to reuse it across estimates."');
    expect(sources).toContain('title="No templates yet."');
    expect(sources).toContain('description="Save a template to reuse line items."');

    expect(sources).not.toContain('title: "Create folder"');
    expect(sources).not.toContain('confirmLabel: "Rename folder"');
    expect(sources).not.toContain("Discard component draft?");
    expect(sources).not.toContain("Unsaved component details, uploaded images, and attachments for this draft will be removed.");
    expect(sources).not.toContain("Archiving is reversible. Archived components can be restored later.");
    expect(sources).not.toContain("Row items assigned to it will stay in the library without a folder.");
    expect(sources).not.toContain('unlinked: "Unlinked"');
    expect(sources).not.toContain('"linked-overridden": "Local overrides"');
    expect(sources).not.toContain('detached: "Detached rows"');
    expect(sources).not.toContain('title: "Confidence is not set"');
    expect(sources).not.toContain("Pricing date is not set");
    expect(sources).not.toContain("Build your component library");
    expect(sources).not.toContain("Add your first component, or import from a price list.");
    expect(sources).not.toContain("Create a template from scratch, or save any estimate group as a template from the estimate page.");
  });
});
