import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = process.cwd();

const requiredStories = [
  {
    title: "Actions/Button",
    exports: [
      "Default",
      "Variants",
      "Sizes",
      "SizeScale",
      "WithIcon",
      "IconLeft",
      "IconRight",
      "IconOnly",
      "IconSizeScale",
      "SolidBackgrounds",
      "NoBackground",
      "ModeButtons",
      "FullWidth",
      "Disabled",
      "Loading",
      "Destructive",
      "LongContent",
      "CompleteMatrix",
      "KeyboardFocus",
    ],
  },
  { title: "Actions/IconButton", exports: ["Default", "Toolbar", "WithVisibleLabel", "Disabled", "Destructive", "KeyboardFocus"] },
  { title: "Actions/ButtonGroup", exports: ["Default", "WithMixedActions"] },
  { title: "Forms/Input", exports: ["Default", "WithHelper", "Invalid", "Disabled", "Readonly", "WithPrefixSuffix", "LongValue", "CompactDensity", "KeyboardFocus"] },
  { title: "Forms/SearchInput", exports: ["Default", "ControlledWithClear", "Disabled", "LongValue", "KeyboardFocus"] },
  { title: "Forms/Textarea", exports: ["Default", "WithHelper", "Invalid", "Disabled", "Readonly", "LongValue", "KeyboardFocus"] },
  { title: "Forms/Checkbox", exports: ["Default", "Invalid", "Disabled", "KeyboardFocus"] },
  { title: "Forms/RadioGroup", exports: ["Default", "Invalid", "Disabled", "KeyboardFocus"] },
  { title: "Forms/Switch", exports: ["Default", "Checked", "Disabled", "KeyboardFocus"] },
  { title: "Menus/ActionMenu", exports: ["Default", "Grouped", "DisabledItem", "DestructiveItem", "WithShortcut", "KeyboardFocus"] },
  { title: "Menus/ContextMenu", exports: ["Default", "RightClickExample", "DisabledAndDestructive", "NestedOrSubmenu", "KeyboardFocus"] },
  { title: "Menus/DropdownMenu", exports: ["Default", "WithGroups", "WithShortcuts", "Disabled"] },
  { title: "Menus/DropdownSelect", exports: ["Default", "Variants", "States", "LongContent", "KeyboardFocus"] },
  { title: "Overlays/DialogSystem", exports: ["HeaderLayout", "CloseButtonPosition", "WithDescription", "InternalScroll", "FooterActions", "Sizes", "Tones", "LongContent", "AccessibilityNotes"] },
  { title: "Overlays/AppModal", exports: ["Default", "SizeXs", "SizeSm", "SizeMd", "SizeLg", "SizeXl", "Fullscreen", "WithBlurBackdrop", "WithoutBlurBackdrop", "FormContent", "TableContent", "LoadingState", "ErrorState", "DestructiveState"] },
  { title: "Overlays/ResizableModal", exports: ["Default", "NoBackdrop", "TransparentOverlay", "ResizableSmall", "ResizableMedium", "ResizableLarge", "MinMaxSize", "InspectorPopup", "FloatingToolWindow", "WithFooterActions", "InternalScroll", "ResizeNotes", "KeyboardFocus"] },
  { title: "Overlays/Modal", exports: ["Default", "WithDescription", "FormDialog", "DestructiveConfirm", "Busy", "ErrorState", "LongContent", "FocusNotes"] },
  { title: "Overlays/ConfirmDialog", exports: ["Default", "Destructive", "DestructiveConfirm", "Busy", "Error", "UnsavedChanges", "LongContent", "FocusNotes"] },
  { title: "Overlays/SheetDrawer", exports: ["RightSheet", "LeftSheet", "BottomDrawer", "InspectorPanel", "WithForm", "WithTable", "LoadingState", "ErrorState", "NoBlur"] },
  { title: "Overlays/Tooltip", exports: ["Default", "ToolbarTooltip", "LongContent", "KeyboardFocus"] },
  { title: "Overlays/Popover", exports: ["Default", "Info", "Help", "Filter", "WithFooterActions", "KeyboardFocus"] },
  { title: "Overlays/HoverCard", exports: ["Default", "ReviewerPreview", "CostPreview", "KeyboardFocus"] },
  { title: "Overlays/CommandDialog", exports: ["Default", "CommandPalette", "CommandMenuInline", "LoadingState", "EmptyState", "KeyboardFocus"] },
  { title: "Feedback/Toast", exports: ["Info", "Success", "Warning", "Error", "Persistent", "TriggeredProviderExample", "StaticStateMatrix"] },
  { title: "Feedback/EmptyState", exports: ["Default", "WithAction", "ErrorState", "StateMatrix"] },
  { title: "Feedback/Skeleton", exports: ["Default", "SkeletonText", "SkeletonCard", "SkeletonTable"] },
  { title: "Cards/Card", exports: ["Default", "WithHeader", "WithActions", "Selected", "Interactive", "Loading", "Empty", "Error", "LongContent"] },
  { title: "Cards/Panel", exports: ["Default", "WithHeader", "WithActions", "Loading", "Empty", "Error", "LongContent"] },
  { title: "Data Display/Table", exports: ["Default", "Empty", "Loading", "Sortable", "Selectable", "Overflow", "EditableCell", "ErrorState"] },
  { title: "Data Display/DataTable", exports: ["Default", "WithToolbar", "Empty", "Loading", "ErrorState"] },
  { title: "Data Display/EditableCell", exports: ["Default", "KeyboardFocus"] },
  { title: "Trees/Tree", exports: ["Default", "Selectable", "Draggable", "DraggableAndSelectable", "SingleLevel", "AllExpanded"] },
  { title: "Navigation/Tabs", exports: ["Default", "KeyboardFocus"] },
  { title: "Navigation/Sidebar", exports: ["Default"] },
  { title: "Layout/Stack", exports: ["Default"] },
  { title: "Layout/Toolbar", exports: ["Default"] },
  { title: "Domain/Workshop/ProjectCard", exports: ["Default", "WithActions", "Selected", "Loading", "LongContent"] },
  { title: "Domain/Workshop/EstimateRow", exports: ["Default", "Dirty", "Saving", "Invalid", "Editable", "LongContent"] },
  { title: "Domain/Workshop/ComponentLibraryCard", exports: ["Default", "Approved", "NeedsReview", "Draft", "Grid"] },
  { title: "Domain/Share/ShareReviewPanel", exports: ["Pending", "Approved", "ChangesRequested", "Expired"] },
  {
    title: "Domain/Share/ReceiverStates",
    exports: [
      "PasswordValid",
      "PasswordInvalid",
      "PasswordLocked429",
      "Anonymous",
      "BannerRecipient",
      "BannerAnon",
      "DecisionAccept",
      "DecisionDecline",
      "DecisionRevision",
      "DecisionLocked",
      "CommentsLoading",
      "CommentsError",
      "CommentsEmpty",
      "CommentsOfflineQueued",
      "ScopeGroupsExpanded",
      "ScopeGroupsFallback",
      "TrustBlocks",
      "NotFound",
      "LoadingBoundary",
      "PrintPackage",
      "StickyRespond",
    ],
  },
  { title: "Domain/Notifications/NotificationCenter", exports: ["Default", "Unread", "Empty", "Warning", "ReleaseAnnouncement"] },
  { title: "Governance/StoryCoverageDashboard", exports: ["ActualStandaloneCoverage", "PlanBacklogDistinction"] },
];

const requiredTopLevelGroups = [
  "Foundations",
  "Icons",
  "Typography",
  "Actions",
  "Forms",
  "Status",
  "Menus",
  "Overlays",
  "Navigation",
  "Cards",
  "Data Display",
  "Trees",
  "Feedback",
  "Layout",
  "Media",
  "Charts",
  "Domain",
  "Motion",
  "Blocks",
  "Governance",
];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      walk(absolute, files);
      continue;
    }

    if (/\.stories\.(ts|tsx|js|jsx|mdx)$/.test(entry)) files.push(absolute);
  }

  return files;
}

function parseStoryFile(file) {
  const source = readFileSync(file, "utf8");
  const titleMatch = source.match(/\btitle:\s*["']([^"']+)["']/);
  const exports = Array.from(source.matchAll(/\bexport\s+const\s+([A-Za-z0-9_]+)/g), (match) => match[1]);
  const title = titleMatch?.[1] ?? null;
  const overview = Boolean(title && /(Primitive Stories|P0 States|Compositions|Dashboard|Boundary|Matrix|Blocks)$/i.test(title));
  const componentName = source.match(/\bcomponent:\s*([A-Za-z_$][\w$]*)/)?.[1] ?? null;
  const storybookContract = source.match(/\bstorybookContract:\s*["'](real-component|story-composition|fixture-only|deferred|governance)["']/)?.[1] ?? null;

  return {
    absoluteFile: file,
    title,
    exports,
    overview,
    componentName,
    storybookContract,
    source,
  };
}

function hasComponentImportLink(story) {
  if (!story.componentName) return false;

  const escaped = story.componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const namedImportPattern = new RegExp(`import\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}\\s+from\\s+["']@/components/`, "m");
  const defaultImportPattern = new RegExp(`import\\s+${escaped}\\s+from\\s+["']@/components/`, "m");

  return namedImportPattern.test(story.source) || defaultImportPattern.test(story.source);
}

function markdownTableRows(source, rowPrefix) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`| ${rowPrefix}`))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function readPlanCounts(root = defaultRoot) {
  const planRoot = join(root, ".ai/03_plans/2026-06-06-ui-component-optimization-componentization");
  const inventoryPath = join(planRoot, "15_COMPONENT_INVENTORY_MATRIX.md");
  const coveragePath = join(planRoot, "17_STORYBOOK_STORY_COVERAGE_MATRIX.md");

  if (!existsSync(inventoryPath) || !existsSync(coveragePath)) {
    return { inventoryRows: 0, storyRows: 0 };
  }

  const inventoryRows = markdownTableRows(readFileSync(inventoryPath, "utf8"), "").filter((cells) => /^[A-Z]{3}-\d{3}$/.test(cells[0] ?? ""));
  const storyRows = markdownTableRows(readFileSync(coveragePath, "utf8"), "ST-");

  return { inventoryRows: inventoryRows.length, storyRows: storyRows.length };
}

function collectCoverage(options = {}) {
  const root = options.root ?? defaultRoot;
  const storyRoot = options.storyRoot ?? join(root, "src/stories");
  const requiredStoryList = options.requiredStories ?? requiredStories;
  const requiredGroupList = options.requiredTopLevelGroups ?? requiredTopLevelGroups;
  const files = walk(storyRoot);
  const stories = files.map(parseStoryFile).filter((story) => story.title).map((story) => ({
    ...story,
    file: relative(root, story.absoluteFile).replaceAll("\\", "/"),
  }));
  const byTitle = new Map(stories.map((story) => [story.title, story]));
  const missingStories = [];
  const missingExports = [];
  const missingComponentFields = [];
  const missingContracts = [];

  for (const required of requiredStoryList) {
    const story = byTitle.get(required.title);
    if (!story) {
      missingStories.push(required.title);
      continue;
    }

    const missing = required.exports.filter((exportName) => !story.exports.includes(exportName));
    if (missing.length > 0) {
      missingExports.push({ title: required.title, file: story.file, missing });
    }

    if (!story.componentName) {
      missingComponentFields.push({ title: required.title, file: story.file });
      continue;
    }

    if (!hasComponentImportLink(story) && !story.storybookContract) {
      missingContracts.push({ title: required.title, file: story.file, componentName: story.componentName });
    }
  }

  const topLevelGroups = new Set(stories.map((story) => story.title.split("/")[0]));
  const missingGroups = requiredGroupList.filter((group) => !topLevelGroups.has(group));
  const planCounts = readPlanCounts(root);
  const actualExportCount = stories.reduce((count, story) => count + story.exports.length, 0);

  return {
    files,
    stories,
    byTitle,
    missingStories,
    missingExports,
    missingComponentFields,
    missingContracts,
    missingGroups,
    planCounts,
    actualExportCount,
    linkedComponentStories: stories.filter(hasComponentImportLink),
    explicitContractStories: stories.filter((story) => story.storybookContract),
    overviewStories: stories.filter((story) => story.overview),
    componentStories: stories.filter((story) => !story.overview),
  };
}

function printReport(coverage) {
  console.log("Storybook component coverage");
  console.log(`- Planned inventory rows: ${coverage.planCounts.inventoryRows}`);
  console.log(`- Planned story rows: ${coverage.planCounts.storyRows}`);
  console.log(`- Actual story files: ${coverage.files.length}`);
  console.log(`- Actual titled stories: ${coverage.stories.length}`);
  console.log(`- Actual story exports: ${coverage.actualExportCount}`);
  console.log(`- Actual component-level stories: ${coverage.componentStories.length}`);
  console.log(`- Overview/governance stories: ${coverage.overviewStories.length}`);
  console.log(`- Linked repo component stories: ${coverage.linkedComponentStories.length}`);
  console.log(`- Explicit fixture/composition contracts: ${coverage.explicitContractStories.length}`);
  console.log(`- Required standalone titles checked: ${requiredStories.length}`);
}

function evaluateCoverage(coverage) {
  const errors = [];

  if (coverage.files.length === 0) {
    errors.push({
      heading: "No Storybook story files found under src/stories.",
      items: [],
    });
  }

  if (coverage.missingGroups.length > 0) {
    errors.push({
      heading: "Missing required top-level Storybook groups:",
      items: coverage.missingGroups,
    });
  }

  if (coverage.missingStories.length > 0) {
    errors.push({
      heading: "Missing required standalone Storybook titles:",
      items: coverage.missingStories,
    });
  }

  if (coverage.missingExports.length > 0) {
    errors.push({
      heading: "Missing required story exports:",
      items: coverage.missingExports.map((item) => `${item.title} (${item.file}): ${item.missing.join(", ")}`),
    });
  }

  if (coverage.missingComponentFields.length > 0) {
    errors.push({
      heading: "Missing Storybook component fields:",
      items: coverage.missingComponentFields.map((item) => `${item.title} (${item.file})`),
    });
  }

  if (coverage.missingContracts.length > 0) {
    errors.push({
      heading: "Missing repo component linkage or explicit fixture/composition contract:",
      items: coverage.missingContracts.map((item) => `${item.title} (${item.file}) uses local ${item.componentName}`),
    });
  }

  return errors;
}

function main() {
  const coverage = collectCoverage();
  printReport(coverage);

  const errors = evaluateCoverage(coverage);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error.heading);
      for (const item of error.items) console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log("Storybook component coverage OK: actual standalone stories and exports are present. Plan matrix rows are informational backlog evidence only.");
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) main();

export { collectCoverage, evaluateCoverage, requiredStories, requiredTopLevelGroups };
