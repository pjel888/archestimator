import type { Instrumentation } from "next";

function isEdgeRuntime() {
  return process.env.NEXT_RUNTIME === "edge";
}

export function register() {
  // Sentry/provider registration is intentionally deferred. The local dev logger is
  // loaded lazily in onRequestError so edge/proxy runtimes never import node:fs.
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (isEdgeRuntime()) {
    console.error(
      JSON.stringify({
        event: "next_request_error",
        level: "error",
        message: error instanceof Error ? error.message : "Unhandled Next.js request error.",
        context: {
          method: request.method,
          path: request.path,
          route_path: context.routePath,
          route_type: context.routeType,
          router_kind: context.routerKind,
          runtime: "edge",
        },
      }),
    );
    return;
  }

  const { logAppError } = await import("@/lib/observability/logger");
  logAppError(error, {
    event: "next_request_error",
    context: {
      method: request.method,
      path: request.path,
      route: context.routePath,
      route_handler: context.routeType === "route" ? `${request.method} ${context.routePath}` : undefined,
      route_path: context.routePath,
      route_type: context.routeType,
      router_kind: context.routerKind,
      render_source: context.renderSource,
      revalidate_reason: context.revalidateReason,
    },
  });
};
