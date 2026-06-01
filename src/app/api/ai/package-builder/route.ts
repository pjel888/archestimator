import { handlePackageBuilderRequest } from "./handler";

export async function POST(request: Request) {
  return handlePackageBuilderRequest(request);
}
