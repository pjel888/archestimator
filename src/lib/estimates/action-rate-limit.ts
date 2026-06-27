import "server-only";

export type EstimateActionRateLimitSurface = "estimate-mutation" | "project-estimate-create";

export type EstimateActionRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

type EstimateActionRateLimitWindow = {
  limit: number;
  seconds: number;
};

const ESTIMATE_ACTION_RATE_LIMIT_WINDOWS: EstimateActionRateLimitWindow[] = [
  { seconds: 10, limit: 40 },
  { seconds: 60, limit: 120 },
];

const maxWindowMs = Math.max(...ESTIMATE_ACTION_RATE_LIMIT_WINDOWS.map((window) => window.seconds * 1000));
const buckets = new Map<string, number[]>();

function rateLimitMessage(retryAfter: number) {
  return `Too many estimate changes. Please wait ${retryAfter} seconds.`;
}

function rateLimitKey({
  resourceId,
  surface,
  userId,
}: {
  resourceId: string;
  surface: EstimateActionRateLimitSurface;
  userId: string;
}) {
  return [surface, userId.trim() || "unknown-user", resourceId.trim() || "unknown-resource"].join("\u001f");
}

export function checkEstimateActionRateLimit({
  now = Date.now(),
  resourceId,
  surface,
  userId,
}: {
  now?: number;
  resourceId: string;
  surface: EstimateActionRateLimitSurface;
  userId: string;
}): EstimateActionRateLimitResult {
  const key = rateLimitKey({ resourceId, surface, userId });
  const cutoff = now - maxWindowMs;
  const events = (buckets.get(key) ?? []).filter((occurredAt) => occurredAt > cutoff);
  events.push(now);
  buckets.set(key, events);

  for (const window of ESTIMATE_ACTION_RATE_LIMIT_WINDOWS) {
    const windowStart = now - window.seconds * 1000;
    const count = events.filter((occurredAt) => occurredAt > windowStart).length;
    if (count > window.limit) {
      return {
        allowed: false,
        message: rateLimitMessage(window.seconds),
        retryAfter: window.seconds,
      };
    }
  }

  return { allowed: true };
}

export function assertEstimateActionRateLimit(input: {
  resourceId: string;
  surface: EstimateActionRateLimitSurface;
  userId: string;
}) {
  const result = checkEstimateActionRateLimit(input);
  if (result.allowed) return;
  throw new Error(result.message);
}

export function resetEstimateActionRateLimitForTests() {
  buckets.clear();
}
