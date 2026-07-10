import type { Instrumentation } from "next";

import { logAppError } from "@/lib/observability/logger";
import { getCurrentRequestId } from "@/lib/observability/request-id";
import { normalizePathForLog } from "@/lib/observability/safe-path";

export const logNodeRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  logAppError(error, {
    event: "next_request_error",
    requestId: getCurrentRequestId() ?? undefined,
    context: {
      method: request.method,
      path: normalizePathForLog(request.path),
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
