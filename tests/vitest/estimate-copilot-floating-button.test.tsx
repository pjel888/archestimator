import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { AskFlipFooterAssistant } from "@/components/workshop/EstimateCopilotFloatingButton";

describe("AskFlipFooterAssistant", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a footer-mounted two-column Ask-only chat panel", async () => {
    const user = userEvent.setup();
    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);

    expect(document.querySelector("[data-ask-flip-root='true']")).not.toHaveClass("fixed");
    expect(screen.getByRole("button", { name: "Open Ask Flip" })).not.toHaveClass("fixed");

    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));

    expect(screen.getByRole("region", { name: "Ask Flip" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Ask Flip chat sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Ask Flip" })).not.toHaveClass("fixed");
    expect(screen.getByRole("heading", { name: "Ask Flip" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask Flip")).toBeInTheDocument();
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

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Summarize this estimate");
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

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("AI provider is not configured.");
    });
    expect(screen.getAllByText("Hello").length).toBeGreaterThan(0);
  });

  it("keeps multiple chat sessions local to the footer panel", async () => {
    const user = userEvent.setup();
    render(<AskFlipFooterAssistant />);

    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.click(screen.getByRole("button", { name: "Start new Ask Flip chat" }));

    expect(screen.getByRole("button", { name: /New chat\s*No questions yet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current page\s*No questions yet/i })).toBeInTheDocument();
  });

  it("is no longer mounted by global app providers", () => {
    render(
      <AppProviders>
        <main>Any Archestimator page</main>
      </AppProviders>,
    );

    expect(screen.getByText("Any Archestimator page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).not.toBeInTheDocument();
  });
});
