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

    expect(screen.getAllByText("linked-clean").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByLabelText(/Proposal section for/i).at(-1)).toHaveValue("proposal_section_floor_finishes");
  });

  it("lets users remap a row to a proposal section", async () => {
    const user = userEvent.setup();
    render(<EstimateWorkspace database={database} />);

    await user.selectOptions(screen.getByLabelText(/Proposal section for Tile A/i), "proposal_section_general_conditions");

    expect(screen.getByLabelText(/Proposal section for Tile A/i)).toHaveValue("proposal_section_general_conditions");
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
