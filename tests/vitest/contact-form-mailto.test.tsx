import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildSupportMailto, ContactForm } from "@/components/landing/ContactForm";

describe("contact form support mailto", () => {
  it("builds a support email draft with beta feedback context", () => {
    const mailto = buildSupportMailto({
      name: "Alex Reviewer",
      email: "alex@example.com",
      org: "Beta Studio",
      inquiryType: "feedback",
      message: "The export summary needs one more qualifier field.",
    });

    expect(mailto).toContain("mailto:support@archestimator.com?");
    expect(decodeURIComponent(mailto)).toContain("subject=Archestimator Beta product feedback");
    expect(decodeURIComponent(mailto)).toContain("Name: Alex Reviewer");
    expect(decodeURIComponent(mailto)).toContain("Email: alex@example.com");
    expect(decodeURIComponent(mailto)).toContain("Organization: Beta Studio");
    expect(decodeURIComponent(mailto)).toContain("Inquiry type: Beta product feedback");
    expect(decodeURIComponent(mailto)).toContain("The export summary needs one more qualifier field.");
  });

  it("keeps missing organization explicit", () => {
    const mailto = buildSupportMailto({
      name: "Pat Founder",
      email: "pat@example.com",
      org: "  ",
      inquiryType: "access",
      message: "Please add this Google account to the beta.",
    });

    expect(decodeURIComponent(mailto)).toContain("Organization: Not provided");
    expect(decodeURIComponent(mailto)).toContain("Inquiry type: Closed beta access request");
  });

  it("renders validation and then the support draft fallback state", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: "Open Email Draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please fill out all required fields.");

    await user.type(screen.getByLabelText(/Full Name/), "Alex Reviewer");
    await user.type(screen.getByLabelText(/Email Address/), "alex@example.com");
    await user.selectOptions(screen.getByLabelText(/Inquiry Type/), "feedback");
    await user.type(screen.getByLabelText(/Message/), "Workbook formulas need a visible qualifier.");
    await user.click(screen.getByRole("button", { name: "Open Email Draft" }));

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("mailto:support@archestimator.com?"), "_self");
    expect(screen.getByRole("alert")).toHaveTextContent("Support email draft prepared");
    expect(screen.getByText(/If the draft did not open/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open email draft" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:support@archestimator.com?"),
    );
    openSpy.mockRestore();
  });
});
