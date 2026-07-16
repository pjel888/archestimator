import type { EstimateSystemKnowledgeGraph } from "@/lib/admin/estimate-system-knowledge";

export const ESTIMATE_SYSTEM_VIEWS = ["overview", "browse", "journeys", "knowledge"] as const;

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

export type EstimateSystemPersonaGroup = "internal" | "external" | "operational";

export type EstimateSystemPersona = Readonly<{
  id: string;
  title: string;
  group: EstimateSystemPersonaGroup;
  evidenceConfidence: "high" | "medium";
  accessPath: string;
  summary: string;
  contexts: readonly string[];
  jobs: readonly string[];
  behaviors: readonly string[];
  needs: readonly string[];
  constraints: readonly string[];
  successSignal: string;
  unresolvedAssumptions: readonly string[];
  featureIds: readonly string[];
  pageIds: readonly string[];
  sources: readonly EstimateSystemSource[];
}>;

export type EstimateSystemExperienceState = "current" | "partial";

export type EstimateSystemCurrentExperienceStep = Readonly<{
  id: string;
  state: "current";
  actorPersonaId: string;
  featureId: string;
  featureStepId: string;
}>;

export type EstimateSystemPartialExperienceStep = Readonly<{
  id: string;
  state: "partial";
  actorPersonaId: string;
  title: string;
  description: string;
  result: string;
  pageId?: string;
  featureIds: readonly string[];
}>;

export type EstimateSystemExperienceStep =
  | EstimateSystemCurrentExperienceStep
  | EstimateSystemPartialExperienceStep;

export type EstimateSystemExperiencePath = Readonly<{
  id: string;
  title: string;
  summary: string;
  status: EstimateSystemExperienceState;
  primaryPersonaId: string;
  supportingPersonaIds: readonly string[];
  trigger: string;
  outcome: string;
  steps: readonly EstimateSystemExperienceStep[];
  sources: readonly EstimateSystemSource[];
}>;

export type EstimateSystemIntersection = Readonly<{
  id: string;
  title: string;
  summary: string;
  kind: "handoff" | "support" | "feedback";
  status: EstimateSystemExperienceState;
  fromPathId: string;
  fromStepId: string;
  toPathId: string;
  toStepId: string;
  responsiblePersonaId: string;
  condition: string;
  result: string;
  pageId?: string;
  featureIds: readonly string[];
}>;

export type EstimateSystemExperienceMap = Readonly<{
  corePathIds: readonly string[];
  supportPathIds: readonly string[];
  partialReturnPathId: string;
}>;

export type EstimateSystemResolvedExperienceStep = Readonly<{
  state: EstimateSystemExperienceState;
  actorPersonaId: string;
  title: string;
  description: string;
  result?: string;
  pageId?: string;
  featureIds: readonly string[];
}>;

export type EstimateSystemDocumentation = Readonly<{
  version: string;
  lastVerified: string;
  title: string;
  summary: string;
  knowledgeGraph: EstimateSystemKnowledgeGraph;
  journey: Readonly<{
    title: string;
    summary: string;
    steps: readonly EstimateSystemJourneyStep[];
    supportingAreaIds: readonly string[];
  }>;
  areas: readonly EstimateSystemArea[];
  features: readonly EstimateSystemFeature[];
  pages: readonly EstimateSystemPage[];
  personas: readonly EstimateSystemPersona[];
  experiencePaths: readonly EstimateSystemExperiencePath[];
  experienceMap: EstimateSystemExperienceMap;
  intersections: readonly EstimateSystemIntersection[];
  integrity: Readonly<{
    ok: true;
    areaCount: number;
    featureCount: number;
    pageCount: number;
    personaCount: number;
    experiencePathCount: number;
    intersectionCount: number;
    knowledgeNodeCount: number;
    knowledgeRelationCount: number;
    knowledgeOperationCount: number;
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
  assertUniqueIds(input.personas, "persona");
  assertUniqueIds(input.experiencePaths, "experience path");
  assertUniqueIds(input.experiencePaths.flatMap((path) => path.steps), "experience path step");
  assertUniqueIds(input.intersections, "intersection");

  const areaIds = new Set(input.areas.map((area) => area.id));
  const featureIds = new Set(input.features.map((feature) => feature.id));
  const pageIds = new Set(input.pages.map((page) => page.id));
  const personaIds = new Set(input.personas.map((persona) => persona.id));
  const experiencePathIds = new Set(input.experiencePaths.map((path) => path.id));
  const experiencePathsById = new Map(input.experiencePaths.map((path) => [path.id, path]));

  for (const node of input.knowledgeGraph.nodes) {
    assertReferences(`Knowledge node ${node.id}`, node.pageIds, pageIds, "page");
    assertReferences(`Knowledge node ${node.id}`, node.featureIds, featureIds, "feature");
  }
  for (const operation of input.knowledgeGraph.operations) {
    assertReferences(`Knowledge operation ${operation.id}`, operation.pageIds, pageIds, "page");
    assertReferences(`Knowledge operation ${operation.id}`, operation.featureIds, featureIds, "feature");
  }

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

  for (const persona of input.personas) {
    assertReferences(`Persona ${persona.id}`, persona.featureIds, featureIds, "feature");
    assertReferences(`Persona ${persona.id}`, persona.pageIds, pageIds, "page");
  }

  for (const path of input.experiencePaths) {
    if (path.steps.length < 2 || path.steps.length > 7) {
      throw new Error(`Experience path ${path.id} must contain between 2 and 7 steps`);
    }
    assertReferences(`Experience path ${path.id}`, [path.primaryPersonaId], personaIds, "persona");
    assertReferences(`Experience path ${path.id}`, path.supportingPersonaIds, personaIds, "persona");

    const partialSteps = path.steps.filter((step) => step.state === "partial");
    if (path.status === "current" && partialSteps.length > 0) {
      throw new Error(`Current experience path ${path.id} contains a partial step`);
    }
    if (path.status === "partial" && partialSteps.length === 0) {
      throw new Error(`Partial experience path ${path.id} requires at least one partial step`);
    }

    for (const step of path.steps) {
      assertReferences(`Experience path step ${step.id}`, [step.actorPersonaId], personaIds, "persona");
      if (step.state === "current") {
        assertReferences(`Experience path step ${step.id}`, [step.featureId], featureIds, "feature");
        const feature = input.features.find((candidate) => candidate.id === step.featureId);
        const featureStep = feature?.steps.find((candidate) => candidate.id === step.featureStepId);
        if (!featureStep) {
          throw new Error(`Experience path step ${step.id} references missing feature step: ${step.featureStepId}`);
        }
        if (!featureStep.pageId) {
          throw new Error(`Experience path step ${step.id} references a feature step without a page`);
        }
      } else {
        if (!step.title.trim() || !step.description.trim() || !step.result.trim()) {
          throw new Error(`Partial experience path step ${step.id} requires title, description, and result`);
        }
        assertReferences(
          `Experience path step ${step.id}`,
          step.pageId ? [step.pageId] : [],
          pageIds,
          "page",
        );
        assertReferences(`Experience path step ${step.id}`, step.featureIds, featureIds, "feature");
      }
    }
  }

  for (const intersection of input.intersections) {
    if (intersection.fromPathId === intersection.toPathId) {
      throw new Error(`Intersection ${intersection.id} cannot connect a path to itself`);
    }
    assertReferences(
      `Intersection ${intersection.id}`,
      [intersection.fromPathId, intersection.toPathId],
      experiencePathIds,
      "experience path",
    );
    assertReferences(
      `Intersection ${intersection.id}`,
      [intersection.responsiblePersonaId],
      personaIds,
      "persona",
    );
    assertReferences(
      `Intersection ${intersection.id}`,
      intersection.pageId ? [intersection.pageId] : [],
      pageIds,
      "page",
    );
    assertReferences(`Intersection ${intersection.id}`, intersection.featureIds, featureIds, "feature");

    const fromStep = experiencePathsById
      .get(intersection.fromPathId)
      ?.steps.find((step) => step.id === intersection.fromStepId);
    const toStep = experiencePathsById
      .get(intersection.toPathId)
      ?.steps.find((step) => step.id === intersection.toStepId);
    if (!fromStep) {
      throw new Error(`Intersection ${intersection.id} references missing from step: ${intersection.fromStepId}`);
    }
    if (!toStep) {
      throw new Error(`Intersection ${intersection.id} references missing to step: ${intersection.toStepId}`);
    }
    const touchesPartialStep = fromStep.state === "partial" || toStep.state === "partial";
    if (intersection.status === "current" && touchesPartialStep) {
      throw new Error(`Current intersection ${intersection.id} touches a partial step`);
    }
    if (intersection.status === "partial" && !touchesPartialStep) {
      throw new Error(`Partial intersection ${intersection.id} requires a partial endpoint`);
    }
  }

  const mappedPathIds = [
    ...input.experienceMap.corePathIds,
    ...input.experienceMap.supportPathIds,
    input.experienceMap.partialReturnPathId,
  ];
  assertReferences("Experience map", mappedPathIds, experiencePathIds, "experience path");
  if (new Set(mappedPathIds).size !== mappedPathIds.length) {
    throw new Error("Experience map cannot repeat a path");
  }
  if (mappedPathIds.length !== input.experiencePaths.length) {
    throw new Error("Experience map must classify every experience path exactly once");
  }
  if (input.experienceMap.corePathIds.length < 2) {
    throw new Error("Experience map requires at least two core paths");
  }

  for (const pathId of [...input.experienceMap.corePathIds, ...input.experienceMap.supportPathIds]) {
    if (experiencePathsById.get(pathId)?.status !== "current") {
      throw new Error(`Experience map current path is not current: ${pathId}`);
    }
  }
  if (experiencePathsById.get(input.experienceMap.partialReturnPathId)?.status !== "partial") {
    throw new Error(`Experience map partial return path is not partial: ${input.experienceMap.partialReturnPathId}`);
  }

  for (let index = 0; index < input.experienceMap.corePathIds.length - 1; index += 1) {
    const fromPathId = input.experienceMap.corePathIds[index];
    const toPathId = input.experienceMap.corePathIds[index + 1];
    const hasDirectedIntersection = input.intersections.some(
      (intersection) => intersection.fromPathId === fromPathId && intersection.toPathId === toPathId,
    );
    if (!hasDirectedIntersection) {
      throw new Error(`Experience map core handoff is missing: ${fromPathId} -> ${toPathId}`);
    }
  }

  const corePathIds = new Set(input.experienceMap.corePathIds);
  for (const supportPathId of input.experienceMap.supportPathIds) {
    const connectsToCore = input.intersections.some(
      (intersection) =>
        (intersection.fromPathId === supportPathId && corePathIds.has(intersection.toPathId))
        || (intersection.toPathId === supportPathId && corePathIds.has(intersection.fromPathId)),
    );
    if (!connectsToCore) {
      throw new Error(`Experience map support path is disconnected from the core chain: ${supportPathId}`);
    }
  }

  const partialReturnPathId = input.experienceMap.partialReturnPathId;
  const hasCoreEntryToPartialReturn = input.intersections.some(
    (intersection) => corePathIds.has(intersection.fromPathId) && intersection.toPathId === partialReturnPathId,
  );
  const hasPartialReturnToCore = input.intersections.some(
    (intersection) => intersection.fromPathId === partialReturnPathId && corePathIds.has(intersection.toPathId),
  );
  if (!hasCoreEntryToPartialReturn || !hasPartialReturnToCore) {
    throw new Error(`Experience map partial return path lacks a directed core return loop: ${partialReturnPathId}`);
  }

  assertReciprocalFeaturePageReferences(input.features, input.pages);

  return {
    ...input,
    integrity: {
      ok: true,
      areaCount: input.areas.length,
      featureCount: input.features.length,
      pageCount: input.pages.length,
      personaCount: input.personas.length,
      experiencePathCount: input.experiencePaths.length,
      intersectionCount: input.intersections.length,
      knowledgeNodeCount: input.knowledgeGraph.integrity.nodeCount,
      knowledgeRelationCount: input.knowledgeGraph.integrity.relationCount,
      knowledgeOperationCount: input.knowledgeGraph.integrity.operationCount,
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

export function findEstimateSystemPersona(
  documentation: EstimateSystemDocumentation,
  personaId: string,
) {
  return documentation.personas.find((persona) => persona.id === personaId) ?? null;
}

export function findEstimateSystemExperiencePath(
  documentation: EstimateSystemDocumentation,
  pathId: string,
) {
  return documentation.experiencePaths.find((path) => path.id === pathId) ?? null;
}

export function resolveEstimateSystemExperienceStep(
  documentation: EstimateSystemDocumentation,
  step: EstimateSystemExperienceStep,
): EstimateSystemResolvedExperienceStep | null {
  if (step.state === "partial") {
    return {
      state: step.state,
      actorPersonaId: step.actorPersonaId,
      title: step.title,
      description: step.description,
      result: step.result,
      pageId: step.pageId,
      featureIds: step.featureIds,
    };
  }

  const feature = findEstimateSystemFeature(documentation, step.featureId);
  const featureStep = feature?.steps.find((candidate) => candidate.id === step.featureStepId);
  if (!feature || !featureStep) return null;

  return {
    state: step.state,
    actorPersonaId: step.actorPersonaId,
    title: featureStep.title,
    description: featureStep.description,
    result: featureStep.result,
    pageId: featureStep.pageId,
    featureIds: [feature.id],
  };
}
