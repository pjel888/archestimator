export const ESTIMATE_SYSTEM_VIEWS = ["product", "features", "pages"] as const;

export type EstimateSystemView = (typeof ESTIMATE_SYSTEM_VIEWS)[number];

export type EstimateSystemSource = Readonly<{
  file: string;
  note: string;
}>;

export type EstimateSystemArea = Readonly<{
  id: string;
  title: string;
  summary: string;
  userOutcome: string;
  pageIds: readonly string[];
  featureIds: readonly string[];
}>;

export type EstimateSystemJourneyStep = Readonly<{
  id: string;
  title: string;
  summary: string;
  areaId: string;
  pageId: string;
}>;

export type EstimateSystemFlowStep = Readonly<{
  id: string;
  title: string;
  description: string;
  pageId?: string;
  result?: string;
}>;

export type EstimateSystemFeature = Readonly<{
  id: string;
  title: string;
  summary: string;
  userNeed: string;
  ownerAreaId: string;
  pageIds: readonly string[];
  entryPoints: readonly string[];
  steps: readonly EstimateSystemFlowStep[];
  rules: readonly string[];
  relatedFeatureIds: readonly string[];
  sources: readonly EstimateSystemSource[];
}>;

export type EstimateSystemPageRegion = Readonly<{
  title: string;
  description: string;
}>;

export type EstimateSystemPage = Readonly<{
  id: string;
  title: string;
  route: string;
  summary: string;
  purpose: string;
  audience: string;
  ownerAreaId: string;
  regions: readonly EstimateSystemPageRegion[];
  actions: readonly string[];
  featureIds: readonly string[];
  nextPageIds: readonly string[];
  sources: readonly EstimateSystemSource[];
}>;

export type EstimateSystemDocumentation = Readonly<{
  version: string;
  lastVerified: string;
  title: string;
  summary: string;
  journey: Readonly<{
    title: string;
    summary: string;
    steps: readonly EstimateSystemJourneyStep[];
    supportingAreaIds: readonly string[];
  }>;
  areas: readonly EstimateSystemArea[];
  features: readonly EstimateSystemFeature[];
  pages: readonly EstimateSystemPage[];
  integrity: Readonly<{
    ok: true;
    areaCount: number;
    featureCount: number;
    pageCount: number;
  }>;
}>;

type EstimateSystemDocumentationInput = Omit<EstimateSystemDocumentation, "integrity">;

function assertUniqueIds(items: readonly { id: string }[], label: string) {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
    ids.add(item.id);
  }
}

function assertReferences(
  owner: string,
  references: readonly string[],
  validIds: ReadonlySet<string>,
  targetLabel: string,
) {
  for (const reference of references) {
    if (!validIds.has(reference)) {
      throw new Error(`${owner} references missing ${targetLabel}: ${reference}`);
    }
  }
}

function assertReciprocalFeaturePageReferences(
  features: readonly EstimateSystemFeature[],
  pages: readonly EstimateSystemPage[],
) {
  const featuresById = new Map(features.map((feature) => [feature.id, feature]));
  const pagesById = new Map(pages.map((page) => [page.id, page]));

  for (const feature of features) {
    for (const pageId of feature.pageIds) {
      const page = pagesById.get(pageId);
      if (!page?.featureIds.includes(feature.id)) {
        throw new Error(`Feature ${feature.id} references page ${pageId}, but the page does not reference the feature`);
      }
    }
  }

  for (const page of pages) {
    for (const featureId of page.featureIds) {
      const feature = featuresById.get(featureId);
      if (!feature?.pageIds.includes(page.id)) {
        throw new Error(`Page ${page.id} references feature ${featureId}, but the feature does not reference the page`);
      }
    }
  }
}

export function defineEstimateSystemDocumentation(
  input: EstimateSystemDocumentationInput,
): EstimateSystemDocumentation {
  assertUniqueIds(input.areas, "area");
  assertUniqueIds(input.features, "feature");
  assertUniqueIds(input.pages, "page");
  assertUniqueIds(input.journey.steps, "journey step");

  const areaIds = new Set(input.areas.map((area) => area.id));
  const featureIds = new Set(input.features.map((feature) => feature.id));
  const pageIds = new Set(input.pages.map((page) => page.id));

  assertReferences("Product journey", input.journey.supportingAreaIds, areaIds, "area");
  for (const step of input.journey.steps) {
    assertReferences(`Journey step ${step.id}`, [step.areaId], areaIds, "area");
    assertReferences(`Journey step ${step.id}`, [step.pageId], pageIds, "page");
  }

  for (const area of input.areas) {
    assertReferences(`Area ${area.id}`, area.pageIds, pageIds, "page");
    assertReferences(`Area ${area.id}`, area.featureIds, featureIds, "feature");
  }

  for (const feature of input.features) {
    assertReferences(`Feature ${feature.id}`, [feature.ownerAreaId], areaIds, "area");
    assertReferences(`Feature ${feature.id}`, feature.pageIds, pageIds, "page");
    assertReferences(`Feature ${feature.id}`, feature.relatedFeatureIds, featureIds, "feature");
    assertReferences(
      `Feature ${feature.id}`,
      feature.steps.flatMap((step) => (step.pageId ? [step.pageId] : [])),
      pageIds,
      "page",
    );
  }

  for (const page of input.pages) {
    if (!page.route.startsWith("/")) throw new Error(`Page ${page.id} has an invalid route`);
    assertReferences(`Page ${page.id}`, [page.ownerAreaId], areaIds, "area");
    assertReferences(`Page ${page.id}`, page.featureIds, featureIds, "feature");
    assertReferences(`Page ${page.id}`, page.nextPageIds, pageIds, "page");
  }

  assertReciprocalFeaturePageReferences(input.features, input.pages);

  return {
    ...input,
    integrity: {
      ok: true,
      areaCount: input.areas.length,
      featureCount: input.features.length,
      pageCount: input.pages.length,
    },
  };
}

export function findEstimateSystemArea(
  documentation: EstimateSystemDocumentation,
  areaId: string,
) {
  return documentation.areas.find((area) => area.id === areaId) ?? null;
}

export function findEstimateSystemFeature(
  documentation: EstimateSystemDocumentation,
  featureId: string,
) {
  return documentation.features.find((feature) => feature.id === featureId) ?? null;
}

export function findEstimateSystemPage(
  documentation: EstimateSystemDocumentation,
  pageId: string,
) {
  return documentation.pages.find((page) => page.id === pageId) ?? null;
}
