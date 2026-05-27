export type PackageBuilderFeatureFlags = {
  readTools: boolean;
  draft: boolean;
  applyShell: boolean;
  applyTree: boolean;
  applyRows: boolean;
  memory: boolean;
};

function readBooleanFeatureFlag(name: string, defaultValue: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return defaultValue;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

export function getPackageBuilderFeatureFlags(): PackageBuilderFeatureFlags {
  return {
    readTools: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_READ_TOOLS_ENABLED", true),
    draft: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_DRAFT_ENABLED", true),
    applyShell: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_APPLY_SHELL_ENABLED", true),
    applyTree: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_APPLY_TREE_ENABLED", true),
    applyRows: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_APPLY_ROWS_ENABLED", true),
    memory: readBooleanFeatureFlag("AI_PACKAGE_BUILDER_MEMORY_ENABLED", false),
  };
}
