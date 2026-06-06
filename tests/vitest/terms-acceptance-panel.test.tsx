import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TermsAcceptancePanel } from "@/components/workshop/TermsAcceptancePanel";
import { CURRENT_TERMS } from "@/lib/legal/terms-content";

describe("TermsAcceptancePanel", () => {
  it("requires explicit affirmative clickwrap before the user can submit", async () => {
    const user = userEvent.setup();
    const acceptAction = vi.fn();

    render(
      <TermsAcceptancePanel
        terms={CURRENT_TERMS}
        returnTo="/workshop/projects?view=active"
        acceptAction={acceptAction}
        userEmail="owner@example.com"
      />,
    );

    expect(screen.getByRole("heading", { name: /review and accept terms/i })).toBeInTheDocument();
    expect(screen.getByText(CURRENT_TERMS.version)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /full terms/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy notice/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getAllByText(/ArchEstimator is a software tool/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not an architect-of-record/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum extent permitted by law/i)).toBeInTheDocument();
    expect(screen.queryByText(/zero liability/i)).not.toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox", { name: /i have read and agree/i });
    const submit = screen.getByRole("button", { name: /accept and continue/i });

    expect(checkbox).toBeRequired();
    expect(submit).toBeDisabled();

    await user.click(checkbox);

    expect(submit).toBeEnabled();
    expect(screen.getByDisplayValue("/workshop/projects?view=active")).toHaveAttribute("name", "next");
    expect(screen.getByDisplayValue(CURRENT_TERMS.version)).toHaveAttribute("name", "terms_version");
  });
});
