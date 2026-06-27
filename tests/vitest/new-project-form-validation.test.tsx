import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewProjectForm } from "@/components/workshop/NewProjectForm";
import { NewProjectModal } from "@/components/workshop/NewProjectModal";
import { ProjectCodeField } from "@/components/workshop/NewProjectFormSections";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const createProjectRecordMock = vi.hoisted(() => vi.fn());
const updateProjectImageMetadataMock = vi.hoisted(() => vi.fn());
const createEstimateSheetDraftMock = vi.hoisted(() => vi.fn());
const saveProjectLocationMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/projects/location-actions", () => ({
  saveProjectLocation: saveProjectLocationMock,
}));

describe("NewProjectForm validation", () => {
  beforeEach(() => {
    routerMock.refresh.mockClear();
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    createProjectRecordMock.mockReset();
    updateProjectImageMetadataMock.mockReset();
    createEstimateSheetDraftMock.mockReset();
    saveProjectLocationMock.mockReset();
    saveProjectLocationMock.mockResolvedValue({ status: "success", message: "Project pin saved." });
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

  it("renders the create project modal as a stable centered dialog with required controls", () => {
    const onClose = vi.fn();

    render(<NewProjectModal onClose={onClose} googleMapsApiKey="test-google-browser-key" />);

    const dialog = screen.getByRole("dialog", { name: /create project/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("data-create-project-modal");
    expect(dialog).toHaveAttribute("data-create-project-modal-shell");
    expect(dialog).toHaveClass(
      "workshop-create-project-modal-glass",
      "max-h-[calc(100dvh-2rem)]",
      "w-[min(1380px,calc(100vw-2rem))]",
      "bg-transparent",
      "p-1",
    );
    expect(dialog.className).not.toMatch(/\b(translate-x-|translate-y-)\b/);

    const modalRoot = document.querySelector("[data-create-project-modal-root]");
    expect(modalRoot).toHaveClass(
      "fixed",
      "inset-0",
      "items-center",
      "justify-center",
    );
    const tray = dialog.querySelector("[data-create-project-modal-tray]");
    expect(tray).toHaveClass("overflow-hidden", "rounded-xs", "border", "border-white/70", "bg-white");

    const form = dialog.querySelector("form");
    expect(form).toHaveClass(
      "grid",
      "grid-rows-[minmax(0,1fr)_auto]",
    );
    expect(form?.firstElementChild).toHaveClass(
      "grid",
      "min-h-0",
      "gap-2",
      "overflow-auto",
      "p-2",
      "lg:grid-cols-[minmax(360px,460px)_minmax(300px,1fr)_minmax(360px,460px)]",
      "lg:items-start",
      "lg:overflow-hidden",
    );
    expect(dialog.querySelector("[data-create-project-details-panel]")).toHaveClass(
      "h-full",
      "overflow-hidden",
      "rounded-xs",
      "bg-white",
      "lg:self-stretch",
    );
    expect(dialog.querySelector("[data-create-project-details-panel] button[type='submit']")).toBeNull();
    expect(form?.lastElementChild).toHaveTextContent("Create project");

    const imageInput = screen.getByLabelText("Upload project image");
    expect(imageInput).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/avif",
    );
    expect(imageInput.closest("[data-project-image-panel]")).toHaveClass("aspect-[4/3]");
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveAttribute("name", "name");
    expect(screen.getByRole("combobox", { name: "Client" })).toHaveAttribute("name", "clientName");
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveValue("PHP");
    expect(screen.getByRole("textbox", { name: "Project Code" })).toHaveAttribute("name", "projectCode");
    expect(screen.getByRole("combobox", { name: "Location" })).toHaveAttribute("name", "location");
    const fields = dialog.querySelector("[data-create-project-fields]");
    expect(
      Array.from(fields?.querySelectorAll("input") ?? []).map((input) => input.getAttribute("name")),
    ).toEqual(["name", "clientName", "currencyCode", null, "projectCode", "location"]);
    expect(dialog.querySelector("[data-create-project-location-preview]")).toHaveClass("aspect-[4/3]", "h-auto");
    expect(screen.queryByText("Details and reference")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate project code" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Close create project" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create project" })).toBeEnabled();
  });

  it("lets project clients be selected from existing names or typed as a new client", async () => {
    const user = userEvent.setup();

    render(<NewProjectForm clientOptions={["Lewis Family", "Acme Developers"]} />);

    const clientInput = screen.getByRole("combobox", { name: "Client" });
    await user.click(clientInput);

    expect(screen.getByRole("listbox", { name: "Client options" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Lewis Family" }));
    expect(clientInput).toHaveValue("Lewis Family");
    expect(clientInput).toHaveAttribute("name", "clientName");

    await user.clear(clientInput);
    await user.type(clientInput, "New Client LLC");
    expect(clientInput).toHaveValue("New Client LLC");
    expect(screen.getByRole("option", { name: 'Create "New Client LLC"' })).toBeInTheDocument();
  });

  it("keeps the project code input controlled when the generated code arrives after first render", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onChange = vi.fn();
    const onGenerate = vi.fn();

    const { rerender } = render(
      <ProjectCodeField
        isSubmitting={false}
        projectCode={undefined}
        onChange={onChange}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Project Code" })).toHaveValue("");

    rerender(
      <ProjectCodeField
        isSubmitting={false}
        projectCode="ABC12345"
        onChange={onChange}
        onGenerate={onGenerate}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Project Code" })).toHaveValue("ABC12345");
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes("A component is changing an uncontrolled input to be controlled"),
      ),
    ).toBe(false);

    consoleError.mockRestore();
  });
});
