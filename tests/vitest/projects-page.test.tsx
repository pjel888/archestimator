import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import seedData from "../../data/local/seed.json";
import { localDatabaseSchema } from "@/lib/local-data/schemas";

const database = localDatabaseSchema.parse(seedData);
const { getDatabase } = vi.hoisted(() => ({
  getDatabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/local-data/repository", () => ({
  createMutableLocalRepository: vi.fn(async () => ({ getDatabase })),
}));

vi.mock("@/app/actions", () => ({
  createProjectAction: vi.fn(),
}));

describe("ProjectsIndexPage", () => {
  beforeEach(() => {
    getDatabase.mockReset();
    getDatabase.mockResolvedValue(database);
  });

  it("renders the projects dashboard inside the full-browser app shell", async () => {
    const { default: ProjectsIndexPage } = await import("@/app/projects/page");

    render(await ProjectsIndexPage());

    expect(screen.getByTestId("app-workspace-shell")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Projects/i })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("heading", { name: "Project command center" })).toBeInTheDocument();
    expect(screen.getByText(/Fit-Out Proposal Sample/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create draft project" })).toBeInTheDocument();
  });
});
