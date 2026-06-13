"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

const TemplatesBrowseManager = dynamic(
  () => import("./TemplatesBrowseManager").then((module) => module.TemplatesBrowseManager),
  {
    loading: () => <TemplatesBrowseFallback />,
  },
);

function TemplatesBrowseFallback() {
  return (
    <div
      className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white"
      role="status"
      aria-label="Loading templates"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-hidden="true">
          <div className="hidden w-[312px] shrink-0 border-r border-hairline p-2 lg:block">
            <Skeleton className="h-7 w-full" />
            <div className="mt-2 space-y-1">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-2">
            <Skeleton className="h-7 w-32" />
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-[72px] w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading templates</span>
    </div>
  );
}

type TemplatesBrowsePageClientProps = {
  templates?: EstimateTemplate[];
};

export function TemplatesBrowsePageClient({ templates }: TemplatesBrowsePageClientProps = {}) {
  return <TemplatesBrowseManager templates={templates} />;
}
