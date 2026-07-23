import { notFound } from "next/navigation";

import { TemplateEditorClient } from "@/components/workshop/library/template-editor/TemplateEditorClient";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
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
  const [template, currentUser, database] = await withPerfTraceRequest("workshop.library.template-detail", () =>
    Promise.all([
      traced("library.templateDetail.template", () => getEstimateTemplateById(templateId)),
      traced("library.templateDetail.user", () => requireCurrentUserContext()),
      traced("library.templateDetail.db", () => getCloudflareD1Database()),
    ]),
  );
  if (!template) notFound();
  if (!template.workspaceId) notFound();

  const canEditTemplate = database
    ? await traced("library.templateDetail.canEdit", () =>
        isWorkspaceEditorInD1(database, template.workspaceId as string, currentUser),
      )
    : false;

  return (
    <TemplateEditorClient
      template={template}
      workspaceId={template.workspaceId}
      canEditTemplate={canEditTemplate}
    />
  );
}
