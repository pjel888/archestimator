import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CommercialCell } from "@/components/workshop/estimate-sheet/CommercialCell";

describe("CommercialCell", () => {
  const value = {
    remarks: "Quoted 30 July",
    quotationRequirement: "required" as const,
    quotationStatus: "available" as const,
    quotationReference: "Q-104",
    vatTreatment: "inclusive" as const,
    vatRateBps: 1200,
  };

  it("exposes separately labelled remarks, quotation, and VAT controls", () => {
    render(<CommercialCell
      rowLabel="WPC plank"
      value={value}
      onRemarksCommit={vi.fn()}
      onCommercialChange={vi.fn()}
    />);

    expect(screen.getByLabelText("Remarks for WPC plank")).toHaveValue("Quoted 30 July");
    expect(screen.getByLabelText("WPC plank quotation requirement")).toHaveValue("required");
    expect(screen.getByLabelText("WPC plank quotation status")).toHaveValue("available");
    expect(screen.getByLabelText("Quotation reference for WPC plank")).toHaveValue("Q-104");
    expect(screen.getByLabelText("WPC plank VAT treatment")).toHaveValue("inclusive");
    expect(screen.getByLabelText("WPC plank VAT rate percent")).toHaveValue(12);
  });

  it("commits remarks on blur and forces exempt VAT to zero", () => {
    const onRemarksCommit = vi.fn();
    const onCommercialChange = vi.fn();
    render(<CommercialCell
      rowLabel="WPC plank"
      value={value}
      onRemarksCommit={onRemarksCommit}
      onCommercialChange={onCommercialChange}
    />);
    const remarks = screen.getByLabelText("Remarks for WPC plank");
    fireEvent.change(remarks, { target: { value: "  VAT quote attached  " } });
    fireEvent.blur(remarks);
    const quotationReference = screen.getByLabelText("Quotation reference for WPC plank");
    fireEvent.change(quotationReference, { target: { value: "  SUP-2026-104  " } });
    fireEvent.blur(quotationReference);
    fireEvent.change(screen.getByLabelText("WPC plank VAT treatment"), { target: { value: "exempt" } });

    expect(onRemarksCommit).toHaveBeenCalledWith("VAT quote attached");
    expect(onCommercialChange).toHaveBeenCalledWith(expect.objectContaining({
      quotationReference: "SUP-2026-104",
    }));
    expect(onCommercialChange).toHaveBeenCalledWith(expect.objectContaining({
      vatTreatment: "exempt",
      vatRateBps: 0,
    }));
  });

  it("synchronizes rolled-back drafts and exposes pending and error state", () => {
    const { rerender } = render(<CommercialCell
      rowLabel="WPC plank"
      value={value}
      pending
      error="Commercial terms changed elsewhere."
      onRemarksCommit={vi.fn()}
      onCommercialChange={vi.fn()}
    />);

    expect(screen.getByTestId("commercial-cell")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Saving commercial terms");
    expect(screen.getByRole("alert")).toHaveTextContent("Commercial terms changed elsewhere.");
    expect(screen.getByLabelText("Remarks for WPC plank")).toBeDisabled();

    rerender(<CommercialCell
      rowLabel="WPC plank"
      value={{ ...value, remarks: "Server value", quotationReference: "Q-105" }}
      onRemarksCommit={vi.fn()}
      onCommercialChange={vi.fn()}
    />);

    expect(screen.getByLabelText("Remarks for WPC plank")).toHaveValue("Server value");
    expect(screen.getByLabelText("Quotation reference for WPC plank")).toHaveValue("Q-105");
  });
});
