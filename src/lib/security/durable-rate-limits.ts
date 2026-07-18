import "server-only";

import { createHash } from "node:crypto";

import {
  cleanupExpiredDurableRateLimitEvents,
  countDurableRateLimitEvents,
  deleteDurableRateLimitEvents,
  insertDurableRateLimitEvent,
} from "@/lib/security/durable-rate-limit-d1";

type DurableRateLimitJsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: DurableRateLimitJsonValue | undefined }
  | DurableRateLimitJsonValue[];

export type DurableRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

export type DurableRateLimitWindow = {
  limit: number;
  message: (retryAfter: number) => string;
  seconds: number;
};

type DurableRateLimitKeyParts = Array<string | null | undefined>;

const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;
let lastRateLimitCleanupAt = 0;
let rateLimitCleanupPromise: Promise<void> | null = null;

function hashDurableRateLimitKey(scope: string, keyParts: DurableRateLimitKeyParts) {
  return createHash("sha256")
    .update([scope, ...keyParts.map((part) => part?.trim() || "-")].join("\u001f"))
    .digest("base64url");
}

async function cleanupExpiredRateLimitEventsIfDue(now: number) {
  if (rateLimitCleanupPromise) {
    await rateLimitCleanupPromise;
    return;
  }
  if (now - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;

  lastRateLimitCleanupAt = now;
  rateLimitCleanupPromise = cleanupExpiredDurableRateLimitEvents(now)
    .catch((error) => {
      lastRateLimitCleanupAt = 0;
      throw error;
    })
    .finally(() => {
      rateLimitCleanupPromise = null;
    });
  await rateLimitCleanupPromise;
}

export async function checkRecordedDurableRateLimit({
  keyParts,
  metadata,
  scope,
  windows,
}: {
  keyParts: DurableRateLimitKeyParts;
  metadata?: Record<string, DurableRateLimitJsonValue>;
  scope: string;
  windows: DurableRateLimitWindow[];
}): Promise<DurableRateLimitResult> {
  const now = Date.now();
  const keyHash = hashDurableRateLimitKey(scope, keyParts);
  const maxWindowSeconds = Math.max(...windows.map((window) => window.seconds));

  await cleanupExpiredRateLimitEventsIfDue(now);
  await insertDurableRateLimitEvent({ keyHash, metadata, scope, ttlSeconds: maxWindowSeconds });

  for (const window of windows) {
    const since = new Date(now - window.seconds * 1000).toISOString();
    const count = await countDurableRateLimitEvents({ keyHash, scope, since });
    if (count > window.limit) {
      return { allowed: false, retryAfter: window.seconds, message: window.message(window.seconds) };
    }
  }

  return { allowed: true };
}

export async function checkExistingDurableRateLimit({
  keyParts,
  scope,
  window,
}: {
  keyParts: DurableRateLimitKeyParts;
  scope: string;
  window: DurableRateLimitWindow;
}): Promise<DurableRateLimitResult> {
  const now = Date.now();
  const keyHash = hashDurableRateLimitKey(scope, keyParts);

  await cleanupExpiredRateLimitEventsIfDue(now);
  const activeAt = new Date(now).toISOString();
  const since = new Date(now - window.seconds * 1000).toISOString();
  const count = await countDurableRateLimitEvents({ activeAt, keyHash, scope, since });
  if (count >= window.limit) {
    return { allowed: false, retryAfter: window.seconds, message: window.message(window.seconds) };
  }
  return { allowed: true };
}

export async function recordDurableRateLimitEvent({
  keyParts,
  metadata,
  scope,
  ttlSeconds,
}: {
  keyParts: DurableRateLimitKeyParts;
  metadata?: Record<string, DurableRateLimitJsonValue>;
  scope: string;
  ttlSeconds: number;
}) {
  const now = Date.now();
  const keyHash = hashDurableRateLimitKey(scope, keyParts);

  await cleanupExpiredRateLimitEventsIfDue(now);
  await insertDurableRateLimitEvent({ keyHash, metadata, scope, ttlSeconds });
}

export async function clearDurableRateLimitEvents(scope: string, keyParts: DurableRateLimitKeyParts) {
  await deleteDurableRateLimitEvents(scope, hashDurableRateLimitKey(scope, keyParts));
}
