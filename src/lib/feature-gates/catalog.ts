/**
 * Canonical feature-gate catalog for closed beta.
 *
 * D1 `feature_flags` rows are the runtime source of truth for enabled/disabled.
 * This catalog supplies operator-facing metadata for `/admin/flags` and documents
 * which keys are enforced in product code vs reserved for later wiring.
 *
 * Additive only: never delete existing flag rows or user data.
 */

export type FeatureGateCategory =
  | "admin_ops"
  | "beta_product"
  | "client_portal";

export type FeatureGateEnforcement = "enforced" | "reserved";

export type FeatureGateDefinition = {
  key: string;
  category: FeatureGateCategory;
  title: string;
  description: string;
  /** When true, `/admin/flags` may toggle the row. Reserved gates stay read-only. */
  toggleable: boolean;
  enforcement: FeatureGateEnforcement;
  /** Default used only when seeding a missing row via migration. */
  defaultEnabled: boolean;
  /** Optional workshop path prefixes gated when the flag is off. */
  gatedPathPrefixes?: readonly string[];
  /** Optional sidebar nav item ids hidden when the flag is off. */
  gatedNavIds?: readonly string[];
};

export const FEATURE_GATE_CATALOG = [
  {
    key: "admin_dashboard_enabled",
    category: "admin_ops",
    title: "Admin dashboard",
    description: "Master switch for the /admin founder surface.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: true,
  },
  {
    key: "admin_support_realtime",
    category: "admin_ops",
    title: "In-app support chat",
    description: "Shows the workshop support chat intake that feeds /admin/support.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: true,
  },
  {
    key: "admin_analytics_server_pulls",
    category: "admin_ops",
    title: "Admin analytics server pulls",
    description: "Reserved for deferred GA4/Clarity/Cloudflare server pulls. Not enforced yet.",
    toggleable: false,
    enforcement: "reserved",
    defaultEnabled: false,
  },
  {
    key: "admin_maintenance_mode",
    category: "admin_ops",
    title: "Workshop maintenance mode",
    description:
      "When enabled, blocks workshop write mutations for non-platform-admins while leaving reads available.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: false,
  },
  {
    key: "beta_proposals_enabled",
    category: "beta_product",
    title: "Proposals",
    description: "Workshop proposals inbox and /workshop/proposals navigation.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: false,
    gatedPathPrefixes: ["/workshop/proposals"],
    gatedNavIds: ["proposals"],
  },
  {
    key: "beta_publisher_enabled",
    category: "beta_product",
    title: "Share / Publisher",
    description: "Workshop Share surface and /workshop/publisher navigation.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: true,
    gatedPathPrefixes: ["/workshop/publisher"],
    gatedNavIds: ["publisher"],
  },
  {
    key: "beta_templates_enabled",
    category: "beta_product",
    title: "Estimate templates",
    description: "Standalone /workshop/templates surface for linked estimate templates.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: true,
    gatedPathPrefixes: ["/workshop/templates", "/workshop/library/templates"],
  },
  {
    key: "client_portal_legacy_migration",
    category: "client_portal",
    title: "Client portal legacy migration",
    description: "Allows legacy Client Portal migration tooling when enabled.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: false,
  },
  {
    key: "client_portal_legacy_write_freeze",
    category: "client_portal",
    title: "Client portal legacy write freeze",
    description: "Freezes legacy Client Portal write paths during migration.",
    toggleable: true,
    enforcement: "enforced",
    defaultEnabled: false,
  },
] as const satisfies readonly FeatureGateDefinition[];

export type FeatureGateKey = (typeof FEATURE_GATE_CATALOG)[number]["key"];

const CATALOG_BY_KEY = new Map<string, FeatureGateDefinition>(
  FEATURE_GATE_CATALOG.map((gate) => [gate.key, gate]),
);

export function getFeatureGateDefinition(key: string): FeatureGateDefinition | null {
  return CATALOG_BY_KEY.get(key) ?? null;
}

export function listFeatureGateDefinitions(): readonly FeatureGateDefinition[] {
  return FEATURE_GATE_CATALOG;
}

export function isToggleableFeatureGate(key: string): boolean {
  const definition = getFeatureGateDefinition(key);
  // Unknown D1 rows stay toggleable so operators can still manage legacy keys.
  if (!definition) return true;
  return definition.toggleable;
}

export function listBetaNavGateKeys(): readonly FeatureGateKey[] {
  return FEATURE_GATE_CATALOG.filter(
    (gate): gate is (typeof FEATURE_GATE_CATALOG)[number] & { gatedNavIds: readonly string[] } =>
      Array.isArray((gate as FeatureGateDefinition).gatedNavIds) &&
      ((gate as FeatureGateDefinition).gatedNavIds?.length ?? 0) > 0,
  ).map((gate) => gate.key);
}

export function resolveDisabledNavIds(enabledByKey: ReadonlyMap<string, boolean>): Set<string> {
  const disabled = new Set<string>();
  for (const gate of FEATURE_GATE_CATALOG as readonly FeatureGateDefinition[]) {
    if (!gate.gatedNavIds?.length) continue;
    if (enabledByKey.get(gate.key) === true) continue;
    for (const navId of gate.gatedNavIds) disabled.add(navId);
  }
  return disabled;
}

export function resolveFeatureGateForPath(pathname: string): FeatureGateDefinition | null {
  for (const gate of FEATURE_GATE_CATALOG as readonly FeatureGateDefinition[]) {
    if (!gate.gatedPathPrefixes?.length) continue;
    for (const prefix of gate.gatedPathPrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return gate;
      }
    }
  }
  return null;
}
