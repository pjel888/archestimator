"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/ui/cn";
import { useProjectEstimateMetadata } from "./ProjectEstimateMetadataStrip";

export type WorkshopBreadcrumb = string | { label: string; href?: string };

type WorkshopBreadcrumbsProps = {
  breadcrumbs: WorkshopBreadcrumb[];
  projectId?: string;
  className?: string;
};

function normalizeBreadcrumb(crumb: WorkshopBreadcrumb) {
  return typeof crumb === "string" ? { label: crumb } : crumb;
}

function getProjectSectionBreadcrumb(pathname: string | null, projectId?: string) {
  if (!projectId || !pathname) return null;
  const projectRoute = `/workshop/projects/${projectId}`;
  if (pathname === `${projectRoute}/estimates` || pathname.startsWith(`${projectRoute}/estimates/`)) {
    return { label: "Estimates", href: `${projectRoute}/estimates` };
  }
  if (pathname === `${projectRoute}/data` || pathname.startsWith(`${projectRoute}/data/`)) {
    return { label: "Data", href: `${projectRoute}/data` };
  }
  return null;
}

export function WorkshopBreadcrumbs({ breadcrumbs, projectId, className }: WorkshopBreadcrumbsProps) {
  const pathname = usePathname();
  const estimateMetadata = useProjectEstimateMetadata();
  const sectionBreadcrumb = getProjectSectionBreadcrumb(pathname, projectId);
  const resolvedBreadcrumbs = [...breadcrumbs.map(normalizeBreadcrumb)];
  const projectRoute = projectId ? `/workshop/projects/${projectId}` : null;
  const isEstimateDetailRoute = Boolean(projectRoute && pathname?.startsWith(`${projectRoute}/estimates/`));
  const estimateName = estimateMetadata && estimateMetadata.projectId === projectId ? estimateMetadata.estimateName.trim() : "";
  const estimateBreadcrumb =
    isEstimateDetailRoute && estimateName
      ? { label: estimateName }
      : null;

  if (sectionBreadcrumb && resolvedBreadcrumbs[resolvedBreadcrumbs.length - 1]?.label !== sectionBreadcrumb.label) {
    resolvedBreadcrumbs.push(sectionBreadcrumb);
  }
  if (estimateBreadcrumb && resolvedBreadcrumbs[resolvedBreadcrumbs.length - 1]?.label !== estimateBreadcrumb.label) {
    resolvedBreadcrumbs.push(estimateBreadcrumb);
  }

  return (
    <nav
      className={cn("flex min-w-0 items-center gap-1 text-[9px] font-medium leading-3 text-tertiary", className)}
      aria-label="Project breadcrumbs"
      data-workshop-layout="workshop-breadcrumbs"
    >
      {resolvedBreadcrumbs.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {item.href ? (
            <Link href={item.href} className="inline-flex min-h-3 items-center truncate hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="truncate">{item.label}</span>
          )}
          {index < resolvedBreadcrumbs.length - 1 ? <span className="text-current" aria-hidden="true">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
