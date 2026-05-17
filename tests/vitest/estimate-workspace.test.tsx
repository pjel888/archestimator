import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EstimateWorkspace } from "@/components/estimate-workspace";
import seedData from "../../data/local/seed.json";
import { localDatabaseSchema } from "@/lib/local-data/schemas";

const database = localDatabaseSchema.parse(seedData);

describe("EstimateWorkspace", () => {
  it("renders the estimate route as a full-browser workspace with docked row controls", async () => {
    render(<EstimateWorkspace database={database} />);

    expect(screen.getByTestId("app-workspace-shell")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
    expect(screen.getByTestId("project-tree-rail")).toHaveTextContent("Ground Floor · Bathroom");
    expect(screen.getByTestId("estimate-grid-surface")).toContainElement(await screen.findByTestId("production-estimate-glide-grid"));

    const dock = screen.getByTestId("workspace-right-dock");
    expect(within(dock).getByRole("heading", { name: "Cost library" })).toBeInTheDocument();
    expect(dock).toContainElement(screen.getByTestId("production-row-inspector"));
  });

  it("filters and collapses the v4-style project tree navigator", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    const tree = screen.getByTestId("project-tree-rail");
    expect(within(tree).getByRole("button", { name: /Ground Floor · Bathroom/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search project tree"), "project-wide");
    expect(within(tree).queryByRole("button", { name: /Ground Floor · Bathroom/i })).not.toBeInTheDocument();
    expect(within(tree).getByRole("button", { name: /Project-wide/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse project tree" }));
    expect(screen.getByRole("button", { name: "Expand project tree" })).toBeInTheDocument();
  });

  it("updates totals when a quantity changes", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    const quantity = screen.getByLabelText(/Quantity for Tile A/i);
    await user.clear(quantity);
    await user.type(quantity, "30");

    expect(screen.getByText("₱42,600")).toBeInTheDocument();
  });

  it("adds a linked row from the cost library", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.click(screen.getAllByRole("button", { name: /Add to estimate/i })[0]);

    expect(screen.getByTestId("production-row-inspector")).toHaveTextContent("linked-clean");
    expect(screen.getAllByLabelText(/Proposal section for/i).at(-1)).toHaveValue("proposal_section_floor_finishes");
  });

  it("lets users remap a row to a proposal section", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.selectOptions(screen.getByLabelText(/Proposal section for Tile A/i), "proposal_section_general_conditions");

    expect(screen.getByLabelText(/Proposal section for Tile A/i)).toHaveValue("proposal_section_general_conditions");
  });

  it("maps new rows to the proposal section used by the selected working section", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.selectOptions(screen.getByLabelText("Selected estimate section for new rows"), "space_general_conditions");
    await user.click(screen.getByRole("button", { name: /Add blank row/i }));

    expect(screen.getAllByLabelText(/Proposal section for Untitled estimate item/i).at(-1)).toHaveValue("proposal_section_general_conditions");
  });

  it("keeps the row inspector selection valid after deleting the selected row", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.click(screen.getByRole("button", { name: /Delete Tile A - bathroom floor/i }));

    expect(screen.getByLabelText("Selected production grid row")).not.toHaveValue("line_tile_a_bathroom");
  });

  it("lets users assign a selected row to a floor and room location", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.selectOptions(screen.getByLabelText(/Location for Tile A/i), "space_bathroom_floor_area");

    expect(screen.getByLabelText(/Location for Tile A/i)).toHaveValue("space_bathroom_floor_area");
    expect(screen.getAllByText("Ground Floor / Bathroom / Floor Area").length).toBeGreaterThan(1);
  });

  it("shows proposal detail rows with space references", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.click(screen.getByRole("tab", { name: "proposal" }));

    expect(screen.getAllByText("Tile A - bathroom floor").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Ground Floor / Bathroom / Floor Area").length).toBeGreaterThan(1);
  });

  it("edits proposal terms in the proposal package builder", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.click(screen.getByRole("tab", { name: "proposal" }));
    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "Updated client proposal");

    expect(screen.getByRole("heading", { name: "Updated client proposal" })).toBeInTheDocument();
  });

  it("creates and edits cost library items from the library management surface", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.click(screen.getByRole("button", { name: "Create library item" }));
    await user.clear(screen.getByLabelText("Library item name"));
    await user.type(screen.getByLabelText("Library item name"), "Gypsum partition board");
    await user.clear(screen.getByLabelText("Library category"));
    await user.type(screen.getByLabelText("Library category"), "Drywall");
    await user.selectOptions(screen.getByLabelText("Library item type"), "material");
    await user.clear(screen.getByLabelText("Library unit"));
    await user.type(screen.getByLabelText("Library unit"), "sqm");
    await user.clear(screen.getByLabelText("Library material unit cost"));
    await user.type(screen.getByLabelText("Library material unit cost"), "650");
    await user.clear(screen.getByLabelText("Library labor unit cost"));
    await user.type(screen.getByLabelText("Library labor unit cost"), "180");
    await user.clear(screen.getByLabelText("Library source note"));
    await user.type(screen.getByLabelText("Library source note"), "Supplier quote Q-101");
    await user.selectOptions(screen.getByLabelText("Library confidence"), "medium");
    await user.click(screen.getByRole("button", { name: "Save library item" }));

    expect(screen.getAllByText("Gypsum partition board").length).toBeGreaterThan(0);
    expect(screen.getByText(/Drywall · material · sqm/i)).toBeInTheDocument();
    expect(screen.getByText(/Source: Supplier quote Q-101/i)).toBeInTheDocument();
  });

  it("moves and copies the selected row between spaces while preserving proposal mapping", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.selectOptions(screen.getByLabelText("Row operation target location"), "space_project_wide");
    await user.click(screen.getByRole("button", { name: /Move Tile A - bathroom floor to selected location/i }));

    expect(screen.getByLabelText(/Location for Tile A/i)).toHaveValue("space_project_wide");
    expect(screen.getByLabelText(/Proposal section for Tile A/i)).toHaveValue("proposal_section_floor_finishes");

    await user.selectOptions(screen.getByLabelText("Row operation target location"), "space_bathroom_floor_area");
    await user.click(screen.getByRole("button", { name: /Copy Tile A - bathroom floor to selected location/i }));

    expect(screen.getAllByText("Tile A - bathroom floor").length).toBeGreaterThan(1);
    expect(screen.getByLabelText("Selected production grid row")).not.toHaveValue("line_tile_a_bathroom");
    expect(screen.getAllByLabelText(/Proposal section for Tile A/i).at(-1)).toHaveValue("proposal_section_floor_finishes");
  });
});
