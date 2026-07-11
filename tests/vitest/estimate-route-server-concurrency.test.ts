import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const estimateNodePageSource = readFileSync(
  "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx",
  "utf8",
);
const workshopLayoutSource = readFileSync("src/app/workshop/layout.tsx", "utf8");

function readFunctionBody(source: string, signature: string): string {
  const signatureStart = source.indexOf(signature);
  expect(signatureStart).toBeGreaterThanOrEqual(0);
  const bodyMarkerStart = source.indexOf(") {", signatureStart);
  expect(bodyMarkerStart).toBeGreaterThanOrEqual(0);
  const bodyStart = bodyMarkerStart + 2;

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart + 1, index);
    }
  }

  throw new Error(`Could not find function body for ${signature}`);
}

function expectBefore(source: string, before: string, after: string) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  expect(beforeIndex, `${before} should exist`).toBeGreaterThanOrEqual(0);
  expect(afterIndex, `${after} should exist`).toBeGreaterThanOrEqual(0);
  expect(beforeIndex, `${before} should appear before ${after}`).toBeLessThan(afterIndex);
}

describe("estimate node route server concurrency", () => {
  it("returns the leaf Suspense boundary before awaiting protected route work", () => {
    const pageBody = readFunctionBody(estimateNodePageSource, "export default function ProjectEstimateNodePage");

    expect(estimateNodePageSource).not.toContain('"use client"');
    expect(estimateNodePageSource).not.toContain("'use client'");
    expect(pageBody).toContain("<Suspense fallback={<EstimateSheetRouteSkeleton />}>");
    expect(pageBody).toContain("<EstimateRouteContent params={params} searchParams={searchParams} />");
    expect(pageBody).not.toContain("await params");
    expect(pageBody).not.toContain("await searchParams");
    expect(pageBody).not.toContain("assertRouteErrorSmoke");
    expect(pageBody).not.toContain("resolveEstimateTabRouteContext");
    expect(pageBody).not.toContain("requireCurrentUserContext");
    expect(pageBody).not.toContain("notFound()");
    expect(pageBody).not.toContain("ProjectEstimateMetadataPublisher");
    expect(pageBody).not.toContain("EstimateWorkspaceClient");
    expectBefore(estimateNodePageSource, "<Suspense fallback={<EstimateSheetRouteSkeleton />}>", 'withPerfTraceRequest("workshop.estimate-sheet"');
  });

  it("keeps only the critical route context load in the async route content block", () => {
    const routeContentBody = readFunctionBody(estimateNodePageSource, "async function EstimateRouteContent");

    expect(routeContentBody).toContain("const { projectId, nodeId } = await params;");
    expect(routeContentBody).toContain("assertRouteErrorSmoke");
    expect(routeContentBody).toContain('withPerfTraceRequest("workshop.estimate-sheet"');
    expect(routeContentBody).toContain('traced("estimate-sheet.route-context"');
    expect(routeContentBody).toContain("resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)");
    expect(routeContentBody).not.toContain("Promise.all([");
    expect(estimateNodePageSource).not.toContain('traced("estimate-sheet.current-user"');
    expect(estimateNodePageSource).not.toContain("requireCurrentUserContext");
  });

  it("keeps tab fallback out of the route tail while tracing edit capability separately", () => {
    expect(estimateNodePageSource).not.toContain('withPerfTraceRequest("workshop.estimate-sheet-tail"');
    expect(estimateNodePageSource).not.toContain('traced("estimate-sheet.tabs"');
    expect(estimateNodePageSource).toContain('traced("estimate-sheet.edit-capability"');
    expect(estimateNodePageSource).toContain("resolveEstimateEditCapability");
    expect(estimateNodePageSource).not.toContain("getEstimateTabs");
    expect(estimateNodePageSource).toContain("const estimateTabs = tabs ?? []");
    expect(estimateNodePageSource).toContain("canEditEstimate={prefetchedCanEditEstimate === true}");
  });

  it("keeps project/estimate validation ahead of real sheet rendering", () => {
    const routeContentBody = readFunctionBody(estimateNodePageSource, "async function EstimateRouteContent");
    const pageBody = readFunctionBody(estimateNodePageSource, "export default function ProjectEstimateNodePage");

    expectBefore(routeContentBody, "resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)", "if (!project || !estimate) notFound()");
    expectBefore(routeContentBody, "if (!project || !estimate) notFound()", "readEstimateVersionLabel(estimate.metadata)");
    expectBefore(routeContentBody, "if (!project || !estimate) notFound()", "<EstimateWorkspaceResolved");
    expectBefore(estimateNodePageSource, "if (!project || !estimate) notFound()", "<EstimateWorkspaceClient");
    expect(estimateNodePageSource).toContain("estimateName={estimate.name}");
    expect(estimateNodePageSource).toContain("estimateSheetCode={estimate.sheet_code}");
    expect(estimateNodePageSource).toContain("projectBudget={estimate.project_budget}");
    expect(pageBody).not.toContain("ProjectEstimateMetadataPublisher");
    expect(pageBody).not.toContain("EstimateWorkspaceClient");
  });

  it("relies on the workshop layout for auth before protected route children render", () => {
    const layoutBody = readFunctionBody(workshopLayoutSource, "export default async function WorkshopLayout");
    const finalShellReturnIndex = layoutBody.lastIndexOf("return <WorkshopShell>{children}</WorkshopShell>;");
    const loginRedirectIndex = layoutBody.indexOf('if (!currentUser) redirect("/login")');
    const termsGateIndex = layoutBody.indexOf("getCurrentUserTermsAcceptanceStatus(currentUser.userId)");
    const bypassBranchIndex = layoutBody.indexOf("if (termsGateBypassed)");

    expect(workshopLayoutSource).toContain('import { getCurrentUserContext } from "@/lib/auth/session"');
    expect(layoutBody).toContain("shouldBypassTermsAcceptanceGate(requestPath)");
    expect(layoutBody).toContain("const currentUser = await getCurrentUserContext();");
    expect(finalShellReturnIndex).toBeGreaterThanOrEqual(0);
    expect(loginRedirectIndex).toBeGreaterThanOrEqual(0);
    expect(termsGateIndex).toBeGreaterThanOrEqual(0);
    expect(bypassBranchIndex).toBeGreaterThanOrEqual(0);
    expect(bypassBranchIndex).toBeLessThan(loginRedirectIndex);
    expect(loginRedirectIndex).toBeLessThan(termsGateIndex);
    expect(termsGateIndex).toBeLessThan(finalShellReturnIndex);
  });

  it("does not introduce route-level caches or privileged clients around request-scoped helpers", () => {
    expect(estimateNodePageSource).not.toContain("unstable_cache");
    expect(estimateNodePageSource).not.toContain("createSupabaseServiceRoleClient");
    expect(estimateNodePageSource).not.toContain("service_role");
  });

  it("streams the synchronous sheet behind the sheet-shaped route fallback", () => {
    expect(estimateNodePageSource).toContain('import { Suspense } from "react"');
    expect(estimateNodePageSource).toContain("EstimateSheetRouteSkeleton");
    expect(estimateNodePageSource).toContain("<Suspense fallback={<EstimateSheetRouteSkeleton />}>");
    expect(estimateNodePageSource).toContain("<EstimateRouteContent params={params} searchParams={searchParams} />");
    expect(estimateNodePageSource).toContain("<EstimateWorkspaceResolved");
    expect(estimateNodePageSource).toContain("async function EstimateRouteContent");
    expect(estimateNodePageSource).toContain("function EstimateWorkspaceResolved");
    expect(estimateNodePageSource).not.toContain("async function EstimateWorkspaceResolved");
    expect(estimateNodePageSource.indexOf("<Suspense fallback={<EstimateSheetRouteSkeleton />}>")).toBeLessThan(
      estimateNodePageSource.indexOf("<EstimateRouteContent params={params} searchParams={searchParams} />"),
    );
    expect(estimateNodePageSource.indexOf("<EstimateRouteContent params={params} searchParams={searchParams} />")).toBeLessThan(
      estimateNodePageSource.indexOf('withPerfTraceRequest("workshop.estimate-sheet"'),
    );
    expect(estimateNodePageSource).not.toContain('withPerfTraceRequest("workshop.estimate-sheet-tail"');
  });
});
