import { createAiDisabledResponse, isAiRoutesEnabled } from "@/lib/ai/feature-flags";

export async function POST(request: Request) {
  if (!isAiRoutesEnabled()) return createAiDisabledResponse();
  const { handlePackageBuilderRequest } = await import("./handler");
  return handlePackageBuilderRequest(request);
}
