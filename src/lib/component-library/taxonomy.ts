import taxonomyJson from "./category-taxonomy.v2.json";

export type ComponentLibraryTaxonomyNode = {
  id: string;
  label: string;
  code?: string;
  meta?: string;
  kind?: string;
  aliases?: string[];
  children?: ComponentLibraryTaxonomyNode[];
};

type RawTaxonomyChild = string | RawTaxonomyNode;

type RawTaxonomyNode = {
  id?: string;
  label: string;
  code?: string;
  kind?: string;
  defaultVisibility?: string;
  children?: RawTaxonomyChild[];
};

type RawBrowseSection = {
  id: string;
  label: string;
  rootIds: string[];
};

type RawTaxonomy = {
  version: string;
  categories: RawTaxonomyNode[];
  views: {
    primaryBrowseSections: RawBrowseSection[];
  };
  aliases?: Record<string, string[]>;
};

const componentTaxonomy = taxonomyJson as RawTaxonomy;

const rootCategoryById = new Map(componentTaxonomy.categories.map((category) => [category.id, category]));
const globalAliasPairs = Object.entries(componentTaxonomy.aliases ?? {});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatKind(kind?: string) {
  if (!kind) return undefined;
  return kind.replace(/-/g, " ");
}

function aliasesForNode(nodeId: string, label: string) {
  const normalized = `${nodeId} ${label}`.toLowerCase();
  return globalAliasPairs.flatMap(([alias, targets]) => (
    targets.some((target) => normalized.includes(target.toLowerCase()) || target.toLowerCase().includes(label.toLowerCase()))
      ? [alias, ...targets]
      : []
  ));
}

function buildTaxonomyNode(rawChild: RawTaxonomyChild, parentId: string, depth = 0): ComponentLibraryTaxonomyNode {
  if (typeof rawChild === "string") {
    const id = `${parentId}-${slugify(rawChild)}`;
    return {
      id,
      label: rawChild,
      aliases: aliasesForNode(id, rawChild),
    };
  }

  const id = rawChild.id ?? `${parentId}-${slugify(rawChild.label)}`;
  const childCount = rawChild.children?.length ?? 0;
  const meta = [
    formatKind(rawChild.kind),
    depth === 0 && childCount > 0 ? `${childCount} subcategories` : null,
  ].filter(Boolean).join(" - ");

  return {
    id,
    label: rawChild.label,
    code: rawChild.code,
    kind: rawChild.kind,
    meta,
    aliases: aliasesForNode(id, rawChild.label),
    children: rawChild.children?.map((child) => buildTaxonomyNode(child, id, depth + 1)),
  };
}

export const componentCategoryTree: ComponentLibraryTaxonomyNode[] = componentTaxonomy.views.primaryBrowseSections.map((section) => ({
  id: `section-${section.id}`,
  label: section.label,
  meta: `${section.rootIds.length} categories`,
  kind: "organizer",
  children: section.rootIds
    .map((rootId) => rootCategoryById.get(rootId))
    .filter((category): category is RawTaxonomyNode => Boolean(category))
    .map((category) => buildTaxonomyNode(category, `section-${section.id}`)),
}));

export const componentCategoryTaxonomyVersion = componentTaxonomy.version;
