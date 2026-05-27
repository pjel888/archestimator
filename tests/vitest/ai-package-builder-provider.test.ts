import { afterEach, describe, expect, it, vi } from "vitest";

import { createDeepSeekPackageBuilderProvider } from "@/lib/ai/package-builder/provider";

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
      compactContext: { workspace: { name: "Test Workspace" }, libraryItems: [], templates: [] },
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
});
