import { notFound } from "next/navigation";

import { TemplateEditorClient } from "@/components/workshop/library/template-editor/TemplateEditorClient";
import { assertBetaFeaturePathAllowed } from "@/lib/feature-gates/enforce";
import { traced, withPerfTraceRequest } from "@/lib/perf/server-timing";
import { getEstimateTemplateById } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type TemplateEditorPageProps = {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TemplateEditorPage({ params, searchParams }: TemplateEditorPageProps) {
  await assertBetaFeaturePathAllowed("/workshop/library/templates");
  assertRouteErrorSmoke({ routeLabel: "Template editor", searchParams: await searchParams });

  const { templateId } = await params;
  const template = await withPerfTraceRequest("workshop.library.template-detail", () =>
    traced("library.templateDetail.template", () => getEstimateTemplateById(templateId)),
  );
  if (!template) notFound();
  if (!template.workspaceId) notFound();

  return <TemplateEditorClient template={template} workspaceId={template.workspaceId} canEditTemplate />;
}
