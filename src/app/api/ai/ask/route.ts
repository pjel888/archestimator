import { handleAiAskRequest } from "./handler";

export async function POST(request: Request) {
  return handleAiAskRequest(request);
}
