"use client";

import { TemplateLibraryManager } from "./component-library-manager/TemplateLibraryManager";
import type { EstimateTemplate } from "./component-library/templates";

type TemplatesPageClientProps = {
  templates?: EstimateTemplate[];
};

export function TemplatesPageClient({ templates }: TemplatesPageClientProps = {}) {
  return <TemplateLibraryManager templates={templates} />;
}
