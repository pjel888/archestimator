"use client";

import type { OnboardingTargetKey } from "@/lib/onboarding/target-catalog";

type EstimateVirtualTargetKey = Extract<
  OnboardingTargetKey,
  "estimate.price_input" | "estimate.row_math"
>;

type EstimateTargetAdapter = {
  target: EstimateVirtualTargetKey;
  owner: () => HTMLElement | null;
  priority?: () => number;
  prepare: (signal: AbortSignal) => Promise<HTMLElement | null>;
};

const adapters = new Map<symbol, EstimateTargetAdapter>();

function isVisibleOwner(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected
    && !element.closest("[inert]")
    && element.getClientRects().length > 0,
  );
}

function compareDocumentOrder(
  left: EstimateTargetAdapter,
  right: EstimateTargetAdapter,
) {
  const priorityDifference = (right.priority?.() ?? 0) - (left.priority?.() ?? 0);
  if (priorityDifference !== 0) return priorityDifference;
  const leftOwner = left.owner();
  const rightOwner = right.owner();
  if (!leftOwner || !rightOwner) return 0;
  const position = leftOwner.compareDocumentPosition(rightOwner);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export function registerEstimateOnboardingTargetAdapter(
  adapter: EstimateTargetAdapter,
) {
  const registrationId = Symbol(adapter.target);
  adapters.set(registrationId, adapter);
  return () => adapters.delete(registrationId);
}

export async function prepareEstimateOnboardingTarget(
  target: OnboardingTargetKey,
  signal: AbortSignal,
) {
  if (
    target !== "estimate.price_input"
    && target !== "estimate.row_math"
  ) {
    return null;
  }

  const candidates = [...adapters.values()]
    .filter((adapter) => adapter.target === target && isVisibleOwner(adapter.owner()))
    .sort(compareDocumentOrder);

  for (const adapter of candidates) {
    if (signal.aborted) return null;
    const resolved = await adapter.prepare(signal);
    if (resolved?.isConnected) return resolved;
  }
  return null;
}
