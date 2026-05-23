import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { EstimateCopilotFloatingButton } from "@/components/workshop/EstimateCopilotFloatingButton";

describe("EstimateCopilotFloatingButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a floating Ask-only chat panel", async () => {
    const user = userEvent.setup();
    render(<EstimateCopilotFloatingButton projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);

    expect(document.querySelector("[data-estimate-copilot-root='true']")).toHaveClass("fixed");
    expect(screen.getByRole("button", { name: "Open Estimate Copilot" })).not.toHaveClass("fixed");

    await user.click(screen.getByRole("button", { name: "Open Estimate Copilot" }));

    expect(screen.getByRole("region", { name: "Estimate Copilot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Estimate Copilot" })).not.toHaveClass("fixed");
    expect(screen.getByText("Ask only")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask about this estimate...")).toBeInTheDocument();
  });

  it("sends the prompt and renders the assistant answer", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "The estimate needs quantities before pricing is reliable.", provider: "deepseek", model: "deepseek-v4-flash" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<EstimateCopilotFloatingButton projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);
    await user.click(screen.getByRole("button", { name: "Open Estimate Copilot" }));
    await user.type(screen.getByPlaceholderText("Ask about this estimate..."), "Summarize this estimate");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/ask",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await screen.findByText("The estimate needs quantities before pricing is reliable.")).toBeInTheDocument();
  });

  it("renders a safe error when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "AI provider is not configured." }), { status: 503 })));

    render(<EstimateCopilotFloatingButton projectName="Lewis Residence" estimateName="Initial Estimate" />);
    await user.click(screen.getByRole("button", { name: "Open Estimate Copilot" }));
    await user.type(screen.getByPlaceholderText("Ask about this estimate..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("AI provider is not configured.");
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("is mounted by the global app providers so it persists across pages", () => {
    render(
      <AppProviders>
        <main>Any Archestimator page</main>
      </AppProviders>,
    );

    expect(screen.getByText("Any Archestimator page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Estimate Copilot" })).toBeInTheDocument();
  });
});
