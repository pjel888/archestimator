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

  it("renders a package draft preview and requires confirmation before Apply", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify({
            mode: "draft",
            draftHash: "sha256:draft",
            productionWrite: false,
            serverValidation: { eligible: true, reasons: [] },
            draft: {
              schemaVersion: 1,
              mode: "draft",
              intent: "create_package_project",
              draftId: "draft-1",
              brief: { projectName: "3 Bedroom Package", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: ["gross floor area"] },
              projectDraft: { name: "3 Bedroom Package", clientName: null, location: null, projectBudget: 5000000 },
              estimateDraft: { name: "Initial 3 Bedroom Package Estimate", sheetCode: "ES-001" },
              treeDraft: [
                { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
                { clientDraftId: "area-bedroom-1", kind: "area", name: "Bedroom 1", parentClientDraftId: "group-house", sortOrder: 0 },
              ],
              rowDraft: [
                { clientDraftId: "row-1", targetAreaClientDraftId: "area-bedroom-1", sourceType: "allowance", material: "Bedroom 1 allowance", description: "Allowance", supplier: null, quantity: 1, unit: "allowance", unitCost: 100000, miscCost: 0, contingencyPercentage: 0, confidence: "requires-user-review", assumption: "No match.", warnings: ["Review."], applyEligible: true },
              ],
              componentMatches: [],
              templateMatches: [],
              operations: [
                { operationId: "op-project", type: "create_project", applyEligible: true },
                { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
              ],
              budgetSummary: { targetBudget: 5000000, draftSubtotal: 100000, allowanceTotal: 100000, contingencyTotal: 0, draftTotal: 100000, variance: -4900000, currencyCode: "PHP", completeness: "partial" },
              assumptions: ["Budget is a target."],
              warnings: ["Allowances are not supplier-priced rows."],
              applyEligibility: { eligible: true, reasons: [] },
              requiresConfirmation: true,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          mode: "apply",
          result: {
            projectId: "project-1",
            estimateId: "estimate-1",
            selectedNodeId: "area-1",
            createdNodeIds: { "area-bedroom-1": "area-1" },
            insertedRowIds: ["row-1"],
            total: 100000,
            warnings: [],
            recoveryStatus: "completed",
            idempotencyKey: body.idempotencyKey,
            idempotentReplay: false,
            auditRunId: "run-1",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText("3 Bedroom Package")).toBeInTheDocument();
    const applyButton = screen.getByRole("button", { name: "Apply package" });
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    expect(applyButton).toBeEnabled();
    await user.click(applyButton);

    expect(await screen.findByText(/Applied project project-/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/package-builder", expect.objectContaining({ method: "POST" }));
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
