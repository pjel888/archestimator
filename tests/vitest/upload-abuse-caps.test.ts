import { beforeEach, describe, expect, it } from "vitest";

import { reserveUploadAdmission, resetUploadAdmissionStateForTests } from "@/lib/uploads/admission-control";

function requestForIp(ip: string) {
  return {
    headers: new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }),
  } as Request;
}

describe("upload admission control", () => {
  beforeEach(() => {
    resetUploadAdmissionStateForTests();
  });

  it("rate limits upload attempts per surface, workspace, actor, and client IP", () => {
    for (let index = 0; index < 12; index += 1) {
      const admission = reserveUploadAdmission({
        surface: "component-image",
        workspaceId: "workspace-1",
        userId: "user-1",
        request: requestForIp("203.0.113.1"),
      });
      expect(admission.allowed).toBe(true);
      if (admission.allowed) admission.release();
    }

    const denied = reserveUploadAdmission({
      surface: "component-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      request: requestForIp("203.0.113.1"),
    });

    expect(denied).toMatchObject({
      allowed: false,
      message: "Too many upload attempts. Please wait a moment and try again.",
      retryAfter: expect.any(Number),
    });
  });

  it("rate limits an actor even when forwarded client IPs rotate", () => {
    for (let index = 0; index < 12; index += 1) {
      const admission = reserveUploadAdmission({
        surface: "component-image",
        workspaceId: "workspace-1",
        userId: "user-1",
        request: requestForIp(`203.0.113.${index + 1}`),
      });
      expect(admission.allowed).toBe(true);
      if (admission.allowed) admission.release();
    }

    const denied = reserveUploadAdmission({
      surface: "component-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      request: requestForIp("198.51.100.99"),
    });

    expect(denied).toMatchObject({
      allowed: false,
      message: "Too many upload attempts. Please wait a moment and try again.",
      retryAfter: expect.any(Number),
    });
  });

  it("caps active uploads for one actor and releases capacity when work finishes", () => {
    const reservations = Array.from({ length: 3 }, () => reserveUploadAdmission({
      surface: "project-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      request: requestForIp("203.0.113.2"),
    }));

    expect(reservations.every((reservation) => reservation.allowed)).toBe(true);
    expect(reserveUploadAdmission({
      surface: "project-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      request: requestForIp("203.0.113.2"),
    })).toMatchObject({
      allowed: false,
      message: "Too many uploads are already running. Wait for one to finish and try again.",
      retryAfter: 10,
    });

    const first = reservations[0];
    if (first?.allowed) first.release();

    expect(reserveUploadAdmission({
      surface: "project-image",
      workspaceId: "workspace-1",
      userId: "user-1",
      request: requestForIp("203.0.113.2"),
    }).allowed).toBe(true);
  });

  it("caps active uploads across a workspace", () => {
    for (let index = 0; index < 6; index += 1) {
      const admission = reserveUploadAdmission({
        surface: "component-attachment",
        workspaceId: "workspace-1",
        userId: `user-${index}`,
        request: requestForIp(`203.0.113.${index}`),
      });
      expect(admission.allowed).toBe(true);
    }

    expect(reserveUploadAdmission({
      surface: "component-attachment",
      workspaceId: "workspace-1",
      userId: "user-7",
      request: requestForIp("203.0.113.7"),
    })).toMatchObject({
      allowed: false,
      message: "Upload capacity is busy for this workspace. Wait for an upload to finish and try again.",
      retryAfter: 10,
    });
  });
});
