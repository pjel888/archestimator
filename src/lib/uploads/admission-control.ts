import type { UploadSurface } from "./policy";
import { reportUploadAdmissionRejected } from "./operational-telemetry";

type UploadAdmissionInput = {
  surface: UploadSurface;
  workspaceId: string;
  userId: string;
  request: Pick<Request, "headers">;
};

type UploadAdmissionDenied = {
  allowed: false;
  message: string;
  retryAfter: number;
};

type UploadAdmissionAllowed = {
  allowed: true;
  release: () => void;
};

export type UploadAdmissionResult = UploadAdmissionAllowed | UploadAdmissionDenied;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const MAX_ACTIVE_PER_ACTOR = 3;
const MAX_ACTIVE_PER_WORKSPACE = 6;
const ACTIVE_RETRY_AFTER_SECONDS = 10;

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const activeByActor = new Map<string, number>();
const activeByWorkspace = new Map<string, number>();

function getClientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("cf-connecting-ip")?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function decrement(map: Map<string, number>, key: string) {
  const nextValue = (map.get(key) ?? 0) - 1;
  if (nextValue <= 0) {
    map.delete(key);
    return;
  }
  map.set(key, nextValue);
}

function checkRequestWindow(key: string, now: number): UploadAdmissionDenied | null {
  const existing = requestBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : existing;

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (bucket.count <= MAX_REQUESTS_PER_WINDOW) return null;

  return {
    allowed: false,
    message: "Too many upload attempts. Please wait a moment and try again.",
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function reserveUploadAdmission(input: UploadAdmissionInput): UploadAdmissionResult {
  const actorKey = `${input.surface}:${input.workspaceId}:${input.userId}`;
  const workspaceKey = `${input.surface}:${input.workspaceId}`;
  const actorActive = activeByActor.get(actorKey) ?? 0;
  if (actorActive >= MAX_ACTIVE_PER_ACTOR) {
    reportUploadAdmissionRejected({
      surface: input.surface,
      workspaceId: input.workspaceId,
      quotaClass: "active_actor",
      retryAfterSeconds: ACTIVE_RETRY_AFTER_SECONDS,
    });
    return {
      allowed: false,
      message: "Too many uploads are already running. Wait for one to finish and try again.",
      retryAfter: ACTIVE_RETRY_AFTER_SECONDS,
    };
  }

  const workspaceActive = activeByWorkspace.get(workspaceKey) ?? 0;
  if (workspaceActive >= MAX_ACTIVE_PER_WORKSPACE) {
    reportUploadAdmissionRejected({
      surface: input.surface,
      workspaceId: input.workspaceId,
      quotaClass: "active_workspace",
      retryAfterSeconds: ACTIVE_RETRY_AFTER_SECONDS,
    });
    return {
      allowed: false,
      message: "Upload capacity is busy for this workspace. Wait for an upload to finish and try again.",
      retryAfter: ACTIVE_RETRY_AFTER_SECONDS,
    };
  }

  const now = Date.now();
  const actorRateLimit = checkRequestWindow(`${actorKey}:actor`, now);
  if (actorRateLimit) {
    reportUploadAdmissionRejected({
      surface: input.surface,
      workspaceId: input.workspaceId,
      quotaClass: "request_rate_actor",
      retryAfterSeconds: actorRateLimit.retryAfter,
    });
    return actorRateLimit;
  }

  const ip = getClientIp(input.request.headers as Headers);
  const clientRateLimit = checkRequestWindow(`${actorKey}:client:${ip}`, now);
  if (clientRateLimit) {
    reportUploadAdmissionRejected({
      surface: input.surface,
      workspaceId: input.workspaceId,
      quotaClass: "request_rate_client",
      retryAfterSeconds: clientRateLimit.retryAfter,
    });
    return clientRateLimit;
  }

  let released = false;
  increment(activeByActor, actorKey);
  increment(activeByWorkspace, workspaceKey);

  return {
    allowed: true,
    release: () => {
      if (released) return;
      released = true;
      decrement(activeByActor, actorKey);
      decrement(activeByWorkspace, workspaceKey);
    },
  };
}

export function resetUploadAdmissionStateForTests() {
  requestBuckets.clear();
  activeByActor.clear();
  activeByWorkspace.clear();
}
