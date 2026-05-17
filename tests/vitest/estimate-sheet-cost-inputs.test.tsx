import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";

describe("estimate sheet cost inputs", () => {
  it("displays cost inputs as pesos when idle but keeps focused typing uninterrupted", async () => {
    const user = userEvent.setup();
    render(<EstimateSheetContent selectedNodeId="main-house" />);

    const otherCostInput = screen.getByLabelText("HEMLINGBY Loveseat other costs");
    const laborCostInput = screen.getByLabelText("HEMLINGBY Loveseat labor cost");
    const row = otherCostInput.closest("tr");
    expect(row).not.toBeNull();

    expect(otherCostInput).toHaveValue("₱0.00");
    expect(laborCostInput).toHaveValue("₱1,200.00");

    await user.click(otherCostInput);
    expect(otherCostInput).toHaveValue("0");
    await user.clear(otherCostInput);
    await user.type(otherCostInput, "400");
    expect(otherCostInput).toHaveValue("400");
    expect(otherCostInput).toHaveFocus();

    await user.click(laborCostInput);
    expect(otherCostInput).toHaveValue("₱400.00");
    expect(laborCostInput).toHaveValue("1200");
    await user.clear(laborCostInput);
    await user.type(laborCostInput, "400");
    expect(laborCostInput).toHaveValue("400");
    expect(laborCostInput).toHaveFocus();

    await user.tab();
    expect(laborCostInput).toHaveValue("₱400.00");
    expect(within(row as HTMLElement).getByText("₱8,799.00")).toBeInTheDocument();
  });
});
