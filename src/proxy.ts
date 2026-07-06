import type { NextRequest } from "next/server";
import { proxy as requestProxy } from "@/lib/auth/request-proxy";

export function proxy(request: NextRequest) {
  return requestProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
