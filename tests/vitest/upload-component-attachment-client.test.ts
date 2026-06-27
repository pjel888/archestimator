import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE,
  COMPONENT_ATTACHMENT_UPLOAD_ROUTE,
  resolveComponentAttachmentContentType,
  uploadComponentAttachment,
  validateComponentAttachmentFile,
} from "@/lib/uploads/component-attachment-client";

afterEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("component attachment client upload transport", () => {
  it("keeps files within the server-mediated cap on the existing FormData route", async () => {
    const file = new File(["%PDF-1.7\nsmall"], "spec.pdf", { type: "application/pdf" });
    const fetchMock = vi.fn(async () => jsonResponse({
      bucket: "component-attachments",
      path: "workspace/user/spec.pdf",
      fileName: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: file.size,
    }));

    const uploaded = await uploadComponentAttachment(file, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      serverMediatedMaxBytes: 20,
      signedDirectMaxBytes: 64,
    });

    expect(uploaded).toMatchObject({
      bucket: "component-attachments",
      path: "workspace/user/spec.pdf",
      fileName: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: file.size,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(COMPONENT_ATTACHMENT_UPLOAD_ROUTE, expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("file")).toBe(file);
    expect(fetchMock).not.toHaveBeenCalledWith(
      COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE,
      expect.anything(),
    );
  });

  it("uses signed single-part direct upload and finalize for larger attachments", async () => {
    const file = new File(["123456789"], "takeoff.xlsx", { type: "" });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE) {
        const body = JSON.parse(String(init?.body));
        if (body.action === "create") {
          return jsonResponse({
            provider: "supabase-storage",
            uploadMode: "signed_single_part",
            uploadSessionId: "session-1",
            bucket: "component-attachments",
            path: "workspace/user/takeoff.xlsx",
            fileName: "takeoff.xlsx",
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            sizeBytes: file.size,
            uploadUrl: "https://storage.example/upload/sign/component-attachments/path?token=secret",
            method: "PUT",
            finalizeUrl: COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE,
            scanStatus: "pending",
          });
        }
        if (body.action === "finalize") {
          return jsonResponse({
            bucket: "component-attachments",
            uploadSessionId: body.uploadSessionId,
            assetId: "asset-1",
            scanStatus: "pending",
            path: "workspace/user/takeoff.xlsx",
            fileName: "takeoff.xlsx",
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            sizeBytes: file.size,
          });
        }
      }
      if (url === "https://storage.example/upload/sign/component-attachments/path?token=secret") {
        return new Response(null, { status: 200 });
      }
      return jsonResponse({ error: `Unexpected fetch ${url}` }, { status: 500 });
    });

    const uploaded = await uploadComponentAttachment(file, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      serverMediatedMaxBytes: 5,
      signedDirectMaxBytes: 64,
    });

    expect(uploaded).toMatchObject({
      bucket: "component-attachments",
      uploadSessionId: "session-1",
      assetId: "asset-1",
      scanStatus: "pending",
      path: "workspace/user/takeoff.xlsx",
      fileName: "takeoff.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: file.size,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      action: "create",
      fileName: "takeoff.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: file.size,
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://storage.example/upload/sign/component-attachments/path?token=secret");
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      method: "PUT",
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      body: file,
    }));
    expect(fetchMock.mock.calls[1]?.[1]?.headers).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(COMPONENT_ATTACHMENT_DIRECT_UPLOAD_ROUTE);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      action: "finalize",
      uploadSessionId: "session-1",
    });
    expect(fetchMock).not.toHaveBeenCalledWith(COMPONENT_ATTACHMENT_UPLOAD_ROUTE, expect.anything());
  });

  it("keeps resumable-sized files blocked until multipart provider flow exists", async () => {
    const file = new File(["12345678901"], "oversize.pdf", { type: "application/pdf" });
    const fetchMock = vi.fn();

    await expect(uploadComponentAttachment(file, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      serverMediatedMaxBytes: 5,
      signedDirectMaxBytes: 10,
    })).rejects.toThrow("Choose an attachment under 64 MB.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates type by MIME or extension before route selection", () => {
    const xlsWithMissingMime = new File(["legacy"], "schedule.xls", { type: "" });
    const invalid = new File(["text"], "notes.txt", { type: "text/plain" });

    expect(resolveComponentAttachmentContentType(xlsWithMissingMime)).toBe("application/vnd.ms-excel");
    expect(validateComponentAttachmentFile(invalid)).toEqual({
      ok: false,
      message: "Use a PDF, XLS, or XLSX file.",
    });
  });
});
