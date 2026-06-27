import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getUploadClientStatusRole,
  IDLE_UPLOAD_CLIENT_STATE,
  isUploadClientBusy,
  isUploadClientRetryable,
  reduceUploadClientState,
} from "@/lib/uploads/client-state";
import { isUploadAbortError, postUploadFormData, UploadClientError } from "@/lib/uploads/client-upload";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("upload client state machine", () => {
  it("covers selected, processing, upload, retryable error, cancel, and removal states", () => {
    const selected = reduceUploadClientState(IDLE_UPLOAD_CLIENT_STATE, { type: "select", message: "reference.png selected." });
    expect(selected).toEqual({ state: "selected", message: "reference.png selected." });

    const processing = reduceUploadClientState(selected, { type: "processing", message: "Optimizing image before upload." });
    expect(isUploadClientBusy(processing)).toBe(true);
    expect(getUploadClientStatusRole(processing)).toBe("status");

    const uploading = reduceUploadClientState(processing, { type: "uploading", message: "Uploading image.", progress: 42 });
    expect(uploading).toEqual({ state: "uploading", message: "Uploading image.", progress: 42 });
    expect(isUploadClientBusy(uploading)).toBe(true);

    const retryable = reduceUploadClientState(uploading, { type: "retryable-error", message: "Network failed." });
    expect(isUploadClientBusy(retryable)).toBe(false);
    expect(isUploadClientRetryable(retryable)).toBe(true);
    expect(getUploadClientStatusRole(retryable)).toBe("alert");

    const cancelled = reduceUploadClientState(uploading, { type: "cancelled" });
    expect(cancelled).toEqual({ state: "cancelled", message: "Upload cancelled." });
    expect(isUploadClientRetryable(cancelled)).toBe(true);

    const removeFailed = reduceUploadClientState(cancelled, { type: "remove-failed", message: "Could not remove upload." });
    expect(isUploadClientRetryable(removeFailed)).toBe(true);
    expect(getUploadClientStatusRole(removeFailed)).toBe("alert");
  });
});

describe("upload client transport", () => {
  it("passes an abort signal to fetch and reports cancellation as retryable", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = postUploadFormData("/api/component-library/images", new FormData(), {
      signal: controller.signal,
      timeoutMs: 30_000,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ kind: "aborted", retryable: true });
    await expect(promise).rejects.toSatisfy(isUploadAbortError);
    expect(fetchMock).toHaveBeenCalledWith("/api/component-library/images", expect.objectContaining({
      method: "POST",
      signal: expect.any(AbortSignal),
    }));
  });

  it("preserves route error messages and marks server errors retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Upload capacity is busy." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(postUploadFormData("/api/component-library/images", new FormData())).rejects.toMatchObject({
      message: "Upload capacity is busy.",
      kind: "http",
      retryable: true,
      status: 429,
    } satisfies Partial<UploadClientError>);
  });
});
