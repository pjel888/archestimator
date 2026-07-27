import { isAiRoutesEnabled } from "@/lib/ai/feature-flags";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { handleClientPortalNarrativeRequest } = await import("./handler");
  return handleClientPortalNarrativeRequest(request, { aiEnabled: isAiRoutesEnabled() });
}
