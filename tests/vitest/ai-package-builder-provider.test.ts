import { afterEach, describe, expect, it, vi } from "vitest";

import { createDeepSeekPackageBuilderProvider } from "@/lib/ai/package-builder/provider";

const compactContext = {
  workspace: { name: "Test Workspace" },
  portfolioProjects: [],
  currentProjectEstimates: [],
  currentProject: null,
  currentEstimate: null,
  currentAreas: [],
  currentAreaRows: [],
  libraryItems: [],
  templates: [],
  historicalRows: [],
};

describe("DeepSeek package-builder provider adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("parses structured JSON from a mocked DeepSeek response", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            model: "deepseek-test",
            choices: [
              {
                message: {
                  content: "```json\n{\"brief\":{\"bedrooms\":3,\"targetBudget\":5000000,\"currencyCode\":\"PHP\"},\"assumptions\":[\"Use standard finish.\"]}\n```",
                },
              },
            ],
            usage: { total_tokens: 42 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const provider = createDeepSeekPackageBuilderProvider();
    const result = await provider.createDraftSuggestion({
      message: "Assemble me a 3 bedroom package, budget is 5 million pesos.",
      compactContext,
    });

    expect(result).toMatchObject({
      provider: "deepseek",
      model: "deepseek-test",
      suggestion: {
        brief: { bedrooms: 3, targetBudget: 5_000_000, currencyCode: "PHP" },
        assumptions: ["Use standard finish."],
      },
    });
  });

  it("normalizes malformed-but-valid provider JSON instead of leaking bad types", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            model: "deepseek-test",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    brief: {
                      bedrooms: "three",
                      targetBudget: -1,
                      currencyCode: "php",
                      missingInputs: "ignore server validation",
                    },
                    roomNames: ["Bedroom 1", 42, "Kitchen"],
                    assumptions: "not an array",
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const provider = createDeepSeekPackageBuilderProvider();
    const result = await provider.createDraftSuggestion({
      message: "Assemble me a 3 bedroom package, budget is 5 million pesos.",
      compactContext,
    });

    expect(result?.suggestion.brief).toMatchObject({ currencyCode: "php" });
    expect(result?.suggestion.brief?.bedrooms).toBeUndefined();
    expect(result?.suggestion.brief?.targetBudget).toBeUndefined();
    expect(result?.suggestion.brief?.missingInputs).toBeUndefined();
    expect(result?.suggestion.roomNames).toEqual(["Bedroom 1", "Kitchen"]);
    expect(result?.suggestion.assumptions).toBeUndefined();
  });

  it("rejects provider JSON that includes forbidden identity fields", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ brief: { bedrooms: 3 }, workspace_id: "forged-workspace" }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const provider = createDeepSeekPackageBuilderProvider();
    await expect(provider.createDraftSuggestion({
      message: "Assemble me a 3 bedroom package, budget is 5 million pesos.",
      compactContext,
    })).rejects.toThrow("forbidden identity fields");
  });
});
