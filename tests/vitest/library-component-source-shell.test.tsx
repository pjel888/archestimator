import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMocks.push }),
}));

import { LibraryComponentSourceShell } from "@/components/workshop/library/LibraryComponentSourceShell";

const projects = [
  { id: "project-a", label: "Lewis Residence" },
  { id: "project-b", label: "North Studio" },
];

beforeEach(() => {
  navigationMocks.push.mockReset();
});

describe("LibraryComponentSourceShell", () => {
  it("routes Library and Project tabs while keeping Supplier Soon discoverable and unavailable", () => {
    render(
      <LibraryComponentSourceShell activeSource="library" projects={projects}>
        <p>Library catalogue</p>
      </LibraryComponentSourceShell>,
    );

    expect(screen.getByRole("tablist", { name: "Component sources" })).toBeInTheDocument();
    const libraryTab = screen.getByRole("tab", { name: "Library" });
    const projectTab = screen.getByRole("tab", { name: "Project" });
    const supplierTab = screen.getByRole("tab", { name: /Supplier.*Soon/ });

    expect(libraryTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Library catalogue");

    fireEvent.click(projectTab);
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/workshop/library/components?source=project&projectId=project-a",
    );

    navigationMocks.push.mockClear();
    expect(supplierTab).toHaveAttribute("aria-disabled", "true");
    expect(supplierTab).not.toBeDisabled();
    expect(supplierTab).toHaveAccessibleDescription("Supplier content is planned and is not available yet.");

    fireEvent.keyDown(libraryTab, { key: "End" });
    expect(supplierTab).toHaveFocus();
    fireEvent.keyDown(supplierTab, { key: "Enter" });
    fireEvent.click(supplierTab);
    expect(navigationMocks.push).not.toHaveBeenCalled();
  });

  it("routes project selection and the return to the shared library", () => {
    render(
      <LibraryComponentSourceShell
        activeSource="project"
        activeProjectId="project-a"
        projects={projects}
      >
        <p>Project catalogue</p>
      </LibraryComponentSourceShell>,
    );

    expect(screen.getByRole("tab", { name: "Project" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Project catalogue");

    const projectSource = screen.getByRole("combobox", { name: "Project component source" });
    expect(projectSource).toHaveTextContent("Lewis Residence");
    fireEvent.click(projectSource);
    fireEvent.click(screen.getByRole("option", { name: "North Studio" }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/workshop/library/components?source=project&projectId=project-b",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Library" }));
    expect(navigationMocks.push).toHaveBeenLastCalledWith("/workshop/library/components");
  });
});
