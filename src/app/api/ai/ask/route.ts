import { createAiDisabledResponse, isAiRoutesEnabled } from "@/lib/ai/feature-flags";

export async function POST(request: Request) {
  if (!isAiRoutesEnabled()) return createAiDisabledResponse();
  const { handleAiAskRequest } = await import("./handler");
  return handleAiAskRequest(request);
}
