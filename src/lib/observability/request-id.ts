import { AsyncLocalStorage } from "node:async_hooks";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestIdSource = "generated" | "inbound" | "invalid-inbound";

export type ResolvedRequestId = {
  internalId: string;
  echoId: string;
  source: RequestIdSource;
};

const requestIdStorage = new AsyncLocalStorage<ResolvedRequestId>();
const VALID_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function createInternalRequestId() {
  return `req_${crypto.randomUUID()}`;
}

export function isValidInboundRequestId(value: string) {
  return VALID_REQUEST_ID_PATTERN.test(value);
}

export function resolveRequestId(headers: Headers): ResolvedRequestId {
  const internalId = createInternalRequestId();
  const inbound = headers.get(REQUEST_ID_HEADER)?.trim();

  if (inbound && isValidInboundRequestId(inbound)) {
    return { internalId, echoId: inbound, source: "inbound" };
  }

  return {
    internalId,
    echoId: internalId,
    source: inbound ? "invalid-inbound" : "generated",
  };
}

export function withRequestIdContext<T>(
  requestId: ResolvedRequestId,
  operation: () => T,
): T {
  return requestIdStorage.run(requestId, operation);
}

export function getCurrentRequestIdContext() {
  return requestIdStorage.getStore() ?? null;
}

export function getCurrentRequestId() {
  return getCurrentRequestIdContext()?.internalId ?? null;
}

export function responseWithRequestId(response: Response, requestId = getCurrentRequestIdContext()) {
  if (!requestId) return response;
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId.echoId);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

