"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ArrowsOutSimple,
  Clock,
  ImageSquare,
  MapPin,
  Star,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import type { Json, Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";

export type ProjectCardViewMode = "list" | "small" | "medium" | "large";
export type ProjectAccessKind = "owned" | "project-member" | "sheet-member";

type LiveProjectCardProps = {
  project: Tables<"projects">;
  viewMode?: ProjectCardViewMode;
  accessKind?: ProjectAccessKind;
  currentUserRole?: CollaborationRole;
  ownerWorkspaceName?: string | null;
  sharedEstimateCount?: number;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite?: (projectId: string, favorite: boolean) => void;
  onExpand?: (project: Tables<"projects">) => void;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getProjectImageUrl(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return null;
  const value = (metadata as Record<string, Json>).projectImageUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

const roleLabels: Record<CollaborationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function getAccessBadgeLabel(accessKind: ProjectAccessKind) {
  if (accessKind === "project-member") return "Shared project";
  if (accessKind === "sheet-member") return "Sheet-only";
  return "Owned";
}

function getAccessibleAccessLabel({
  accessKind,
  projectName,
  role,
}: {
  accessKind: ProjectAccessKind;
  projectName: string;
  role: CollaborationRole;
}) {
  if (accessKind === "owned") return `${projectName} project, owned access`;
  if (accessKind === "sheet-member") return `${projectName} project, sheet-only access, ${role} access`;
  return `${projectName} project, shared project, ${role} access`;
}

export function LiveProjectCard({
  project,
  viewMode = "large",
  accessKind = "owned",
  currentUserRole = "owner",
  ownerWorkspaceName = null,
  sharedEstimateCount = 0,
  isFavorite = false,
  favoriteBusy = false,
  onToggleFavorite,
  onExpand,
}: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);
  const isListView = viewMode === "list";
  const isSharedAccess = accessKind !== "owned";
  const openLabel = accessKind === "sheet-member" && sharedEstimateCount === 1 ? "Open sheet" : "Open";
  const projectHref = `/workshop/projects/${project.id}`;
  const prefetchRoutes = useMemo(() => [{ pathname: projectHref }], [projectHref]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);

  return (
    <article
      data-project-card-view={viewMode}
      data-project-access-kind={accessKind}
      aria-label={getAccessibleAccessLabel({
        accessKind,
        projectName: project.name,
        role: currentUserRole,
      })}
      className={cn(
        "group flex min-w-0 overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_16px_38px_-34px_rgba(17,17,17,0.5)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_24px_52px_-38px_rgba(17,17,17,0.58)]",
        accessKind === "project-member" ? "border-l-2 border-l-emerald-500" : null,
        accessKind === "sheet-member" ? "border-l-2 border-l-sky-500" : null,
        isListView ? "min-h-[92px] flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-surfaceMuted",
          isListView
            ? "h-auto w-28 shrink-0 border-r border-hairline sm:w-32"
            : "w-full border-b border-hairline",
          viewMode === "large" ? "aspect-square" : null,
          viewMode === "medium" ? "aspect-[4/3]" : null,
          viewMode === "small" ? "aspect-square" : null,
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-[linear-gradient(135deg,#fff0e5_0%,#f4f7fa_55%,#ffffff_100%)] text-tertiary">
            <ImageSquare
              size={viewMode === "large" ? 28 : 20}
              weight="regular"
              aria-hidden="true"
            />
            <span className="px-1 text-center text-[8px] font-medium uppercase tracking-normal">
              Add project image
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className={`absolute left-2 top-2 size-7 border-white/70 bg-white/86 shadow-sm backdrop-blur hover:bg-white disabled:cursor-wait disabled:opacity-70 ${
            isFavorite
              ? "text-orange-600 hover:text-orange-700"
              : "text-tertiary hover:text-ink"
          }`}
          aria-label={
            isFavorite
              ? `Remove ${project.name} from favorite projects`
              : `Add ${project.name} to favorite projects`
          }
          aria-pressed={isFavorite}
          disabled={favoriteBusy}
          onClick={() => onToggleFavorite?.(project.id, !isFavorite)}
        >
          <Star size={13} weight="regular" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute right-2 top-2 size-7 border-white/70 bg-white/86 text-ink shadow-sm backdrop-blur hover:bg-white"
          aria-label={`Expand ${project.name} details`}
          onClick={() => onExpand?.(project)}
        >
          <ArrowsOutSimple size={13} weight="regular" aria-hidden="true" />
        </Button>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          viewMode === "large" ? "min-h-[176px] p-3" : null,
          viewMode === "medium" ? "min-h-[134px] p-2" : null,
          viewMode === "small" ? "min-h-[108px] p-2" : null,
          isListView ? "min-h-[92px] p-2" : null,
        )}
      >
        <div className={cn("min-w-0", viewMode === "large" ? "space-y-2" : "space-y-1")}>
          <div className="flex min-w-0 items-center gap-1">
            <p className="min-w-0 flex-1 truncate text-[8px] font-medium uppercase tracking-normal text-tertiary">
              {project.client_name ?? "No client yet"}
            </p>
            {isSharedAccess ? (
              <span
                className={cn(
                  "shrink-0 rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px]",
                  accessKind === "project-member" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700",
                )}
              >
                {getAccessBadgeLabel(accessKind)}
              </span>
            ) : null}
          </div>
          <h2
            className={cn(
              "font-medium tracking-normal text-ink",
              viewMode === "large" ? "line-clamp-3 text-[12px] leading-[1.18]" : null,
              viewMode === "medium" ? "line-clamp-2 text-[11px] leading-[1.18]" : null,
              viewMode === "small" ? "line-clamp-2 text-[10px] leading-[1.2]" : null,
              isListView ? "line-clamp-1 text-[11px] leading-[1.2]" : null,
            )}
          >
            {project.name}
          </h2>
        </div>

        <div className={cn("space-y-1", viewMode === "large" ? "mt-3" : "mt-2")}>
          {isSharedAccess ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
              <span className="shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                {roleLabels[currentUserRole]}
              </span>
              <span className="truncate">
                {accessKind === "sheet-member"
                  ? `${sharedEstimateCount} ${sharedEstimateCount === 1 ? "shared sheet" : "shared sheets"}`
                  : ownerWorkspaceName
                    ? `Shared by ${ownerWorkspaceName}`
                    : "Shared with you"}
              </span>
            </p>
          ) : null}
          <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
            <MapPin size={12} aria-hidden="true" />
            <span className="truncate">
              {project.location ?? "No location"}
            </span>
          </p>
          <p
            className={cn(
              "items-center gap-1.5 text-[9px] leading-3 text-tertiary",
              viewMode === "small" ? "hidden" : "flex",
            )}
          >
            <Clock size={12} aria-hidden="true" />
            Updated {formatUpdatedAt(project.updated_at)}
          </p>
        </div>

        <div
          className={cn(
            "mt-auto flex items-center justify-between gap-2 border-t border-hairline",
            viewMode === "large" ? "pt-3" : "pt-2",
          )}
        >
          <span className="truncate font-sans text-[9px] font-medium text-tertiary">
            {project.project_code ?? "—"}
          </span>
          <Link
            href={projectHref}
            prefetch={false}
            onBlur={() => cancel(projectHref)}
            onFocus={() => prefetch(projectHref)}
            onMouseEnter={() => prefetch(projectHref)}
            onMouseLeave={() => cancel(projectHref)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-1.5 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {openLabel}
            <ArrowRight
              size={13}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
