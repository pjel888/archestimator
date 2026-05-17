import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EstimateWorkspace } from "@/components/estimate-workspace";
import seedData from "../../data/local/seed.json";
import { localDatabaseSchema } from "@/lib/local-data/schemas";

const database = localDatabaseSchema.parse(seedData);

describe("EstimateWorkspace", () => {
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
});
