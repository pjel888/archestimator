import type { Instrumentation } from "next";

import { normalizePathForLog } from "@/lib/observability/safe-path";

let logNodeRequestError: Instrumentation.onRequestError | undefined;
let nodeRegistration: Promise<void> | undefined;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    nodeRegistration ??= import("./instrumentation.node").then((nodeInstrumentation) => {
      logNodeRequestError = nodeInstrumentation.logNodeRequestError;
    });
    await nodeRegistration;
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") {
    console.error(
      JSON.stringify({
        event: "next_request_error",
        level: "error",
        message: error instanceof Error ? error.message : "Unhandled Next.js request error.",
        context: {
          method: request.method,
          path: normalizePathForLog(request.path),
          route_path: context.routePath,
          route_type: context.routeType,
          router_kind: context.routerKind,
          runtime: "edge",
        },
      }),
    );
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs" && !logNodeRequestError && nodeRegistration) {
    await nodeRegistration;
  }

  if (logNodeRequestError) {
    await logNodeRequestError(error, request, context);
    return;
  }

  console.error(
    JSON.stringify({
      event: "next_request_error",
      level: "error",
      message: "Unhandled Next.js request error.",
      context: {
        method: request.method,
        path: normalizePathForLog(request.path),
        route_path: context.routePath,
        route_type: context.routeType,
        router_kind: context.routerKind,
        runtime: "nodejs",
        logger_ready: false,
      },
    }),
  );
};
