import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";

describe("ProjectPublicationPasswordForm", () => {
  it("reveals the password only on request and explains how to recover access", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationPasswordForm token="shared-token" />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    expect(screen.getByText("Don't have the password? Contact the sender who shared this proposal.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show entered value" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide entered value" })).toHaveAttribute("aria-pressed", "true");
  });
});
