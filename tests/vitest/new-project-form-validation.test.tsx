import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewProjectForm } from "@/components/workshop/NewProjectForm";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const createProjectRecordMock = vi.hoisted(() => vi.fn());
const updateProjectImageMetadataMock = vi.hoisted(() => vi.fn());
const createEstimateSheetDraftMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/projects/actions", () => ({
  createProjectRecord: createProjectRecordMock,
  updateProjectImageMetadata: updateProjectImageMetadataMock,
}));

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateSheetDraft: createEstimateSheetDraftMock,
}));

describe("NewProjectForm validation", () => {
  beforeEach(() => {
    routerMock.refresh.mockClear();
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    createProjectRecordMock.mockReset();
    updateProjectImageMetadataMock.mockReset();
    createEstimateSheetDraftMock.mockReset();
  });

  it("stops whitespace-only project creation locally with a field-scoped error", async () => {
    const user = userEvent.setup();
    render(<NewProjectForm />);

    const projectName = screen.getByRole("textbox", {
      name: "Project name",
    });

    await user.type(projectName, "   ");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(createProjectRecordMock).not.toHaveBeenCalled();
    expect(createEstimateSheetDraftMock).not.toHaveBeenCalled();
    expect(projectName).toHaveFocus();
    expect(projectName).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add a project name before creating this project.",
    );
    expect(projectName).toHaveAccessibleDescription(
      "Add a project name before creating this project.",
    );

    await user.type(projectName, "Lewis Residence");

    await waitFor(() => {
      expect(projectName).not.toHaveAttribute("aria-invalid", "true");
    });
    expect(
      screen.queryByText("Add a project name before creating this project."),
    ).not.toBeInTheDocument();
  });
});
