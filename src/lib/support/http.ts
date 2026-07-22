import "server-only";

export const SUPPORT_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
} as const;

export function assertSupportSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin")?.trim();
  if (!origin || origin === "null") {
    return supportJsonError("Same-origin request required.", 403);
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    if (new URL(origin).origin !== requestOrigin) {
      return supportJsonError("Cross-origin request blocked.", 403);
    }
  } catch {
    return supportJsonError("Invalid request origin.", 403);
  }

  return null;
}

export function supportJsonError(
  error: string,
  status: number,
  headers?: HeadersInit,
) {
  return Response.json(
    { error },
    {
      status,
      headers: { ...SUPPORT_NO_STORE_HEADERS, ...headers },
    },
  );
}
