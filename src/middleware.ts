// ponytail: intentionally named `middleware.ts`, NOT `proxy.ts`.
// Next.js 16.2.10 deprecated the `middleware` convention in favor of `proxy`,
// but @opennextjs/cloudflare 1.20.1 (the Worker adapter) only honors
// `src/middleware.ts` as the Edge middleware entrypoint. Its `useNodeMiddleware()`
// (node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js) reads
// only `_middleware` manifest entries — there is no `proxy` equivalent. Renaming
// this file to `proxy.ts` breaks the Cloudflare Worker deploy. The `bun dev`
// deprecation warning is benign and tolerated until upstream OpenNext Cloudflare
// adds `proxy.ts` support.
//   Regression lock-in: tests/vitest/proxy-file-convention.test.ts
//   Revert commit: 5558c5fa4 (2026-07-08)
//   Full ADR + phased plan (Phases 2-4 blocked upstream):
//   .ai/09_archive/store/2026-07-10-middleware-to-proxy-migration/
import type { NextRequest } from "next/server";
import { proxy as requestProxy } from "@/lib/auth/request-proxy";

export function middleware(request: NextRequest) {
  return requestProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
