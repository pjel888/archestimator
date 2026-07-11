import { readBoundedRequestBody } from "@/lib/http/read-bounded-body";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function chunkedRequest(chunks: string[], headers: HeadersInit = {}) {
  const encoder = new TextEncoder();
  let cancelled = false;
  let nextChunk = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[nextChunk++];
      if (chunk) controller.enqueue(encoder.encode(chunk));
    },
    cancel() {
      cancelled = true;
    },
  });

  return {
    request: { headers: new Headers(headers), body } as Request,
    wasCancelled: () => cancelled,
  };
}

describe("publication public-request body limits", () => {
  it("accepts a body exactly at the limit", async () => {
    const result = await readBoundedRequestBody(new Request("https://archestimator.test", {
      method: "POST",
      body: "1234",
    }), 4);

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(new TextDecoder().decode(result.value)).toBe("1234");
  });

  it("rejects an oversized chunked body without relying on Content-Length", async () => {
    const { request, wasCancelled } = chunkedRequest(["12", "345"]);
    const result = await readBoundedRequestBody(request, 4);

    expect(result).toEqual({ ok: false, status: 413, error: "Request body is too large." });
    expect(wasCancelled()).toBe(true);
  });

  it("rejects a body whose Content-Length understates the actual streamed bytes", async () => {
    const { request } = chunkedRequest(["123", "45"], { "content-length": "1" });

    await expect(readBoundedRequestBody(request, 4)).resolves.toEqual({
      ok: false,
      status: 413,
      error: "Request body is too large.",
    });
  });

  it("rejects compressed request encodings before parsing", async () => {
    const result = await readBoundedRequestBody(new Request("https://archestimator.test", {
      method: "POST",
      headers: { "content-encoding": "gzip" },
      body: "{}",
    }), 4);

    expect(result).toEqual({ ok: false, status: 415, error: "Unsupported Content-Encoding." });
  });

  it("routes every public mutation through the bounded reader", () => {
    for (const path of [
      "src/app/api/share/[token]/password/route.ts",
      "src/app/api/share/[token]/comment/route.ts",
      "src/app/api/share/[token]/decision/route.ts",
      "src/app/api/share/[token]/session/route.ts",
      "src/app/api/share/[token]/unsubscribe/route.ts",
    ]) {
      expect(readFileSync(path, "utf8")).toContain("readBounded");
    }
  });
});
