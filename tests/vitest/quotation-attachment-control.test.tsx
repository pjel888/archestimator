import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuotationAttachmentControl } from "@/components/workshop/estimate-sheet/QuotationAttachmentControl";

describe("QuotationAttachmentControl", () => {
  it("requests linking without receiving or rendering a private version id", () => {
    const onLinkRequested = vi.fn();
    const { container } = render(
      <QuotationAttachmentControl
        attachmentState="none"
        hasAttachment={false}
        canEdit
        onLinkRequested={onLinkRequested}
        onUnlink={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Attach quotation" }));
    expect(onLinkRequested).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Unlink quotation" })).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("version-");
  });

  it("supports replacement and unlinking only for a live attachment", () => {
    const onLinkRequested = vi.fn();
    const onUnlink = vi.fn();
    render(
      <QuotationAttachmentControl
        attachmentState="available"
        hasAttachment
        canEdit
        onLinkRequested={onLinkRequested}
        onUnlink={onUnlink}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replace quotation" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink quotation" }));
    expect(onLinkRequested).toHaveBeenCalledOnce();
    expect(onUnlink).toHaveBeenCalledOnce();
  });

  it("shows unavailable truth without an invalidation reason or unlink affordance", () => {
    render(
      <QuotationAttachmentControl
        attachmentState="unavailable"
        hasAttachment={false}
        canEdit
        pending
        onLinkRequested={vi.fn()}
        onUnlink={vi.fn()}
      />,
    );

    expect(screen.getByText("Quotation attachment unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace quotation" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Unlink quotation" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saving quotation attachment");
  });
});
