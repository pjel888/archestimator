import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDetailsModal } from "@/components/workshop/ProjectDetailsModal";
import { updateProjectDetails } from "@/lib/projects/actions";
import type { Tables } from "@/lib/supabase/types";

vi.mock("@/lib/projects/actions", () => ({
  updateProjectDetails: vi.fn(async () => undefined),
}));

const PROJECT = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

const updateProjectDetailsMock = vi.mocked(updateProjectDetails);

describe("ProjectDetailsModal", () => {
  beforeEach(() => {
    updateProjectDetailsMock.mockReset();
    updateProjectDetailsMock.mockResolvedValue(undefined);
  });

  it("closes and refreshes only after a successful details save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Updated Residence");
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => {
      expect(updateProjectDetailsMock).toHaveBeenCalledTimes(1);
    });
    expect(updateProjectDetailsMock.mock.calls[0]?.[0].get("name")).toBe("Updated Residence");
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onSaved.mock.invocationCallOrder[0]);
  });

  it("keeps edited values visible and exposes the save error when the action fails", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    updateProjectDetailsMock.mockRejectedValueOnce(new Error("Database unavailable"));

    render(<ProjectDetailsModal project={PROJECT} onClose={onClose} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Project name"));
    await user.type(screen.getByLabelText("Project name"), "Unsaved Residence");
    await user.click(screen.getByRole("button", { name: "Save details" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
    expect(screen.getByLabelText("Project name")).toHaveValue("Unsaved Residence");
    expect(screen.getByRole("button", { name: "Save details" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
