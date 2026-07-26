import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TooltipRenderProps } from "react-joyride";

import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip";
import { ONBOARDING_TARGET_HANDOFF_EVENT } from "@/components/onboarding/onboarding-runtime-events";

function tooltipProps(interaction: "passive" | "handoff_to_target") {
  const noop = vi.fn();
  return {
    backProps: { "aria-label": "Back", "data-action": "back", onClick: noop, role: "button", title: "Back" },
    closeProps: { "aria-label": "Close", "data-action": "close", onClick: noop, role: "button", title: "Close" },
    controls: {},
    index: 1,
    isLastStep: false,
    primaryProps: { "aria-label": "Next", "data-action": "primary", onClick: noop, role: "button", title: "Next" },
    size: 4,
    skipProps: { "aria-label": "Skip", "data-action": "skip", onClick: noop, role: "button", title: "Skip" },
    step: {
      content: "content",
      data: {
        contentKey: "add_priced_row",
        flowKey: "first_estimate_value",
        interaction,
        stepKey: "add_priced_row",
      },
      target: "[data-onboarding-target='estimate.add_row']",
    },
    tooltipProps: { "aria-modal": true, role: "alertdialog" },
  } as unknown as TooltipRenderProps;
}

describe("OnboardingTooltip", () => {
  it("replaces Next with a target handoff for interactive steps", () => {
    const listener = vi.fn();
    window.addEventListener(ONBOARDING_TARGET_HANDOFF_EVENT, listener);
    render(<OnboardingTooltip {...tooltipProps("handoff_to_target")} />);

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try it now" }));

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      detail: {
        flowKey: "first_estimate_value",
        stepKey: "add_priced_row",
      },
    }));
    window.removeEventListener(ONBOARDING_TARGET_HANDOFF_EVENT, listener);
  });

  it("keeps normal navigation for passive steps", () => {
    render(<OnboardingTooltip {...tooltipProps("passive")} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try it now" })).not.toBeInTheDocument();
  });
});
