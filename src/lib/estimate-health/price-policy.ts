import type { PriceFreshnessPolicy } from "./types";

export const DEFAULT_PRICE_FRESHNESS_POLICY: PriceFreshnessPolicy = { revision: 0, staleDays: 90, veryStaleDays: 180 };

function isValidPolicy(policy: PriceFreshnessPolicy | null | undefined): policy is PriceFreshnessPolicy {
  if (!policy) return false;
  return Number.isSafeInteger(policy.revision)
    && Number.isFinite(policy.staleDays)
    && Number.isFinite(policy.veryStaleDays)
    && policy.staleDays > 0
    && policy.veryStaleDays > policy.staleDays;
}

export function resolvePriceFreshnessPolicy({
  workspacePolicy,
  categoryPolicy,
  categoryNodeId,
}: {
  workspacePolicy: PriceFreshnessPolicy | null | undefined;
  categoryPolicy?: (PriceFreshnessPolicy & { categoryNodeId: string }) | null;
  categoryNodeId?: string | null;
}): PriceFreshnessPolicy {
  if (categoryPolicy && categoryPolicy.categoryNodeId === categoryNodeId && isValidPolicy(categoryPolicy)) {
    return { revision: categoryPolicy.revision, staleDays: categoryPolicy.staleDays, veryStaleDays: categoryPolicy.veryStaleDays };
  }
  if (isValidPolicy(workspacePolicy)) return { revision: workspacePolicy.revision, staleDays: workspacePolicy.staleDays, veryStaleDays: workspacePolicy.veryStaleDays };
  return { ...DEFAULT_PRICE_FRESHNESS_POLICY };
}

export function getPriceFreshness({
  timestamp,
  now,
  policy,
}: {
  timestamp: number | null;
  now: number;
  policy: PriceFreshnessPolicy | null | undefined;
}): "fresh" | "stale" | "very-stale" | "missing" {
  if (timestamp === null || !Number.isFinite(timestamp) || !Number.isFinite(now) || !isValidPolicy(policy)) return "missing";
  const ageDays = (now - timestamp) / 86_400_000;
  if (ageDays > policy.veryStaleDays) return "very-stale";
  if (ageDays > policy.staleDays) return "stale";
  return "fresh";
}
