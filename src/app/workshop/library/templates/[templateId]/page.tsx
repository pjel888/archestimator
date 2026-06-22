import { notFound } from "next/navigation";

import { TemplateEditorClient } from "@/components/workshop/library/template-editor/TemplateEditorClient";
import { getEstimateTemplateById } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type TemplateEditorPageProps = {
  params: Promise<{ templateId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TemplateEditorPage({ params, searchParams }: TemplateEditorPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Template editor", searchParams: await searchParams });

  const { templateId } = await params;
  const template = await getEstimateTemplateById(templateId);
  if (!template) notFound();
  if (!template.workspaceId) notFound();

  return <TemplateEditorClient template={template} workspaceId={template.workspaceId} />;
}
