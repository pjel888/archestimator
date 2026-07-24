import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { LibraryReuseRail } from "@/components/workshop/library/LibraryReuseRail";
import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";
import { loadCurrentOnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-actions";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import {
  getCurrentWorkspaceComponentRowsLibrary,
  getCurrentWorkspaceEstimateTemplatesSeed,
  SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
} from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function TemplatesBrowseData() {
  const [templateSeed, componentLibrary, onboardingSnapshot] = await withPerfTraceRequest("workshop.library.templates", () =>
    Promise.all([
      traced("library.templates.seed", () => getCurrentWorkspaceEstimateTemplatesSeed()),
      traced("library.templates.components", () => getCurrentWorkspaceComponentRowsLibrary({
        includeDetailGraph: false,
        itemLimit: SIDEBAR_COMPONENT_LIBRARY_DEFAULT_LIMIT,
      })),
      traced("library.templates.onboarding", () =>
        loadCurrentOnboardingEligibilitySnapshot().catch(() => null),
      ),
    ]),
  );
  const hasMeaningfulTemplates = templateSeed.status === "available"
    && templateSeed.templates.some((template) =>
      template.nodes.length > 0
      || Boolean(template.summary && template.summary.groupCount + template.summary.areaCount > 0),
    );
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <LibraryReuseRail
        snapshot={onboardingSnapshot}
        surface="templates"
        hasReusableComponents={componentLibrary.libraryItems.length > 0}
        hasMeaningfulTemplates={hasMeaningfulTemplates}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <TemplatesBrowsePageClient
          templateSeed={templateSeed}
          componentLibrary={componentLibrary}
          queryScope={{ userId: templateSeed.userId, workspaceId: templateSeed.workspaceId }}
        />
      </div>
    </div>
  );
}

export default async function LibraryTemplatesPage({ searchParams }: LibraryTemplatesPageProps) {
  await assertBetaFeaturePathAllowed("/workshop/library/templates");
  assertRouteErrorSmoke({ routeLabel: "Templates", searchParams: await searchParams });

  return <TemplatesBrowseData />;
}
