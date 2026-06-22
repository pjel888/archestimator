import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import type { BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";

const BLOCKED_PROJECT_ISSUE = {
  code: "forbidden",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Recipes",
  message: "Only project owners/admins can delete projects.",
} as const;

const BLOCKED_PROJECT_PREVIEW = {
  ok: false,
  targetType: "project",
  ids: ["11111111-1111-4111-8111-111111111111"],
  eligibleIds: [],
  previewHash: null,
  summary: {
    requestedCount: 1,
    eligibleCount: 0,
    blockedCount: 1,
  },
  issues: [BLOCKED_PROJECT_ISSUE],
  blocked: [BLOCKED_PROJECT_ISSUE],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

const READY_PROJECT_PREVIEW = {
  ok: true,
  targetType: "project",
  ids: ["22222222-2222-4222-8222-222222222222"],
  eligibleIds: ["22222222-2222-4222-8222-222222222222"],
  previewHash: "preview-hash",
  summary: {
    requestedCount: 1,
    eligibleCount: 1,
    blockedCount: 0,
  },
  issues: [],
  blocked: [],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

const ACTIVE_PUBLICATION_WARNING_PREVIEW = {
  ok: true,
  targetType: "project",
  ids: ["33333333-3333-4333-8333-333333333333"],
  eligibleIds: ["33333333-3333-4333-8333-333333333333"],
  previewHash: "warning-preview-hash",
  summary: {
    requestedCount: 1,
    eligibleCount: 1,
    blockedCount: 0,
    warningsCount: 1,
  },
  issues: [
    {
      code: "active_publication",
      id: "33333333-3333-4333-8333-333333333333",
      name: "Shared clinic",
      message: "This project has an active published shared link that will be revoked upon deletion.",
    },
  ],
  blocked: [],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

const PARTIAL_BLOCKED_PROJECT_PREVIEW = {
  ok: false,
  targetType: "project",
  ids: [
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
  ],
  eligibleIds: ["44444444-4444-4444-8444-444444444444"],
  previewHash: null,
  summary: {
    requestedCount: 2,
    eligibleCount: 1,
    blockedCount: 1,
  },
  issues: [],
  blocked: [
    {
      code: "forbidden",
      id: "55555555-5555-4555-8555-555555555555",
      name: "Restricted project",
      message: "Only project owners/admins can delete projects.",
    },
  ],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

const READY_ARCHIVE_PREVIEW = {
  ok: true,
  targetType: "library_component",
  ids: [
    "55555555-5555-4555-8555-555555555555",
    "66666666-6666-4666-8666-666666666666",
  ],
  eligibleIds: [
    "55555555-5555-4555-8555-555555555555",
    "66666666-6666-4666-8666-666666666666",
  ],
  previewHash: "archive-preview-hash",
  summary: {
    requestedCount: 2,
    eligibleCount: 2,
    blockedCount: 0,
  },
  issues: [],
  blocked: [],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

const BLOCKED_ARCHIVE_PREVIEW = {
  ok: false,
  targetType: "library_component",
  ids: ["77777777-7777-4777-8777-777777777777"],
  eligibleIds: [],
  previewHash: null,
  summary: {
    requestedCount: 1,
    eligibleCount: 0,
    blockedCount: 1,
  },
  issues: [
    {
      code: "blocked",
      id: "77777777-7777-4777-8777-777777777777",
      name: "Concrete mix",
      message: "Component is currently in use.",
    },
  ],
  blocked: [],
  storageTargets: [],
} satisfies BulkActionPreviewResult;

describe("BulkDestructivePreviewModal", () => {
  it("explains blocked project deletion with permission and active-publication warning copy", () => {
    render(
      <BulkDestructivePreviewModal
        open
        title="Delete project"
        description="This permanently deletes the project, its estimates, and project data. Active shared links will be revoked."
        requiredPhrase="DELETE PROJECT"
        executeLabel="Delete project"
        preview={BLOCKED_PROJECT_PREVIEW}
        onExecute={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete project" });

    expect(dialog).toHaveTextContent("This permanently deletes the project, its estimates, and project data.");
    expect(dialog).toHaveTextContent("Cannot delete yet");
    expect(dialog).toHaveTextContent("You do not have permission to perform this action.");
    expect(within(dialog).getAllByText("You do not have permission to perform this action.")).toHaveLength(1);
    expect(dialog).toHaveTextContent("Needs attention");
    expect(dialog).not.toHaveTextContent(/server-side|execution|dependency preview|published/i);
    expect(dialog).not.toHaveTextContent(/Requested|Eligible|Blocked/);
    expect(within(dialog).getByRole("button", { name: "Delete project" })).toBeDisabled();
  });

  it("keeps the typed confirmation gate for ready project deletion", () => {
    const onExecute = vi.fn();

    render(
      <BulkDestructivePreviewModal
        open
        title="Delete project"
        description="This permanently deletes the project, its estimates, and project data. Active shared links will be revoked."
        requiredPhrase="DELETE PROJECT"
        executeLabel="Delete project"
        preview={READY_PROJECT_PREVIEW}
        onExecute={onExecute}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete project" });
    const deleteButton = within(dialog).getByRole("button", { name: "Delete project" });

    expect(dialog).toHaveTextContent("Ready to delete");
    expect(deleteButton).toBeDisabled();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Type DELETE PROJECT to confirm" }), {
      target: { value: "DELETE PROJECT" },
    });
    fireEvent.click(deleteButton);

    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("allows deletion with active publication warnings shown as informational", () => {
    const onExecute = vi.fn();

    render(
      <BulkDestructivePreviewModal
        open
        title="Delete project"
        description="This permanently deletes the project, its estimates, and project data. Active shared links will be revoked."
        requiredPhrase="DELETE PROJECT"
        executeLabel="Delete project"
        preview={ACTIVE_PUBLICATION_WARNING_PREVIEW}
        onExecute={onExecute}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete project" });
    const deleteButton = within(dialog).getByRole("button", { name: "Delete project" });

    expect(dialog).toHaveTextContent("Ready to delete");
    expect(dialog).toHaveTextContent("Active shared link will be revoked when this project is deleted.");
    expect(dialog).not.toHaveTextContent("Cannot delete");
    expect(deleteButton).toBeDisabled();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Type DELETE PROJECT to confirm" }), {
      target: { value: "DELETE PROJECT" },
    });
    fireEvent.click(deleteButton);

    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("keeps partial blocked deletion disabled instead of promising a partial delete", () => {
    const onExecute = vi.fn();

    render(
      <BulkDestructivePreviewModal
        open
        title="Delete 2 projects"
        description="This permanently deletes the selected projects, their estimates, and project data. Active shared links will be revoked upon deletion."
        requiredPhrase="DELETE 2 PROJECTS"
        executeLabel="Delete projects"
        preview={PARTIAL_BLOCKED_PROJECT_PREVIEW}
        onExecute={onExecute}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete 2 projects" });
    const deleteButton = within(dialog).getByRole("button", { name: "Delete projects" });

    expect(dialog).toHaveTextContent("Cannot delete yet");
    expect(dialog).toHaveTextContent("Resolve the item below before deleting projects.");
    expect(dialog).not.toHaveTextContent(/marked ready will be deleted/i);

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Type DELETE 2 PROJECTS to confirm" }), {
      target: { value: "DELETE 2 PROJECTS" },
    });
    fireEvent.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(onExecute).not.toHaveBeenCalled();
  });

  it("uses archive copy for component archive flows", () => {
    render(
      <BulkDestructivePreviewModal
        open
        title="Archive 2 components?"
        description="Archiving keeps component history intact while hiding selected components from library insertion."
        requiredPhrase="ARCHIVE 2 COMPONENTS"
        executeLabel="Archive components"
        preview={READY_ARCHIVE_PREVIEW}
        onExecute={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive 2 components?" });

    expect(dialog).toHaveTextContent("Ready to archive");
    expect(dialog).toHaveTextContent("This will archive 2 components.");
    expect(dialog).toHaveTextContent("Type ARCHIVE 2 COMPONENTS to enable archive components.");
    expect(dialog).not.toHaveTextContent(/Ready to delete|This will delete/i);
  });

  it("keeps ready archive confirmation copy recoverable", () => {
    render(
      <BulkDestructivePreviewModal
        open
        title="Archive 2 components?"
        description="Archiving keeps component history intact while hiding selected components from library insertion."
        requiredPhrase="ARCHIVE 2 COMPONENTS"
        executeLabel="Archive components"
        preview={READY_ARCHIVE_PREVIEW}
        onExecute={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive 2 components?" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Type ARCHIVE 2 COMPONENTS to confirm" }), {
      target: { value: "ARCHIVE 2 COMPONENTS" },
    });

    expect(dialog).toHaveTextContent("Archived components are hidden from browse and blocked from new inserts. You can restore them later.");
    expect(dialog).not.toHaveTextContent("This action cannot be undone.");
  });

  it("uses archive copy when archive is blocked", () => {
    render(
      <BulkDestructivePreviewModal
        open
        title="Archive 1 component?"
        description="Archiving keeps component history intact while hiding selected components from library insertion."
        requiredPhrase="ARCHIVE COMPONENT"
        executeLabel="Archive component"
        preview={BLOCKED_ARCHIVE_PREVIEW}
        onExecute={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive 1 component?" });

    expect(dialog).toHaveTextContent("Cannot archive yet");
    expect(dialog).toHaveTextContent("Resolve the item above before archiving.");
    expect(dialog).not.toHaveTextContent(/Cannot delete yet|before deleting/i);
  });
});
