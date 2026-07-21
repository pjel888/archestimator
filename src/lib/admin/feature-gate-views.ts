import "server-only";

import {
  getFeatureGateDefinition,
  listFeatureGateDefinitions,
  type FeatureGateCategory,
  type FeatureGateDefinition,
  type FeatureGateEnforcement,
} from "@/lib/feature-gates/catalog";
import { listFeatureFlags, type AdminFeatureFlag } from "@/lib/admin/feature-flags";

export type AdminFeatureGateView = AdminFeatureFlag & {
  title: string;
  category: FeatureGateCategory | "other";
  enforcement: FeatureGateEnforcement | "unknown";
  toggleable: boolean;
  catalogDescription: string | null;
};

const CATEGORY_ORDER: Record<FeatureGateCategory | "other", number> = {
  beta_product: 0,
  admin_ops: 1,
  client_portal: 2,
  other: 3,
};

function toView(flag: AdminFeatureFlag, definition: FeatureGateDefinition | null): AdminFeatureGateView {
  return {
    ...flag,
    title: definition?.title ?? flag.key,
    category: definition?.category ?? "other",
    enforcement: definition?.enforcement ?? "unknown",
    toggleable: definition ? definition.toggleable : true,
    catalogDescription: definition?.description ?? null,
    description: flag.description ?? definition?.description ?? null,
  };
}

export async function listAdminFeatureGateViews(): Promise<AdminFeatureGateView[]> {
  const flags = await listFeatureFlags();
  const byKey = new Map(flags.map((flag) => [flag.key, flag]));

  // Ensure catalog keys appear even before migration apply (synthetic OFF/ON from defaults).
  const views: AdminFeatureGateView[] = [];
  for (const definition of listFeatureGateDefinitions()) {
    const existing = byKey.get(definition.key);
    if (existing) {
      views.push(toView(existing, definition));
      byKey.delete(definition.key);
      continue;
    }
    views.push(
      toView(
        {
          key: definition.key,
          enabled: definition.defaultEnabled,
          description: definition.description,
          updated_at: "not seeded",
          updated_by: null,
        },
        definition,
      ),
    );
  }

  for (const leftover of byKey.values()) {
    views.push(toView(leftover, getFeatureGateDefinition(leftover.key)));
  }

  return views.sort((a, b) => {
    const categoryDelta = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDelta !== 0) return categoryDelta;
    return a.key.localeCompare(b.key);
  });
}
