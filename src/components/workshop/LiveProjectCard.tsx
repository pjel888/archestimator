"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  ArrowsOutSimple,
  Clock,
  ImageSquare,
  LinkSimple,
  MapPin,
  Star,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { acceptPendingInvitationById } from "@/lib/collaboration/pending-invite-actions";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import type { Json, Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/ui/cn";
import type { CollaborationRole } from "@/lib/collaboration/types";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type { WorkshopPendingInviteSummary } from "@/lib/repositories/workspace-repository";

export type ProjectCardViewMode = "list" | "small" | "medium" | "large";
export type ProjectAccessKind = "owned" | "pending-invite" | "project-member" | "sheet-member";

type LiveProjectCardProps = {
  project: Tables<"projects">;
  viewMode?: ProjectCardViewMode;
  accessKind?: ProjectAccessKind;
  currentUserRole?: CollaborationRole;
  ownerWorkspaceName?: string | null;
  pendingInvite?: WorkshopPendingInviteSummary | null;
  pendingInviteCount?: number;
  publicationSummary?: ProjectPublicationListSummary | null;
  sharedEstimateCount?: number;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  selectionMode?: boolean;
  selectionChecked?: boolean;
  selectionDisabled?: boolean;
  selectionDisabledReason?: string;
  onToggleSelection?: (projectId: string, checked: boolean) => void;
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
  if (accessKind === "pending-invite") return "Pending invite";
  if (accessKind === "project-member") return "Shared project";
  if (accessKind === "sheet-member") return "Sheet-only";
  return "Owned";
}

function formatOpenCount(count: number) {
  return `${count} ${count === 1 ? "open" : "opens"}`;
}

function formatPendingInviteCount(count: number) {
  return `${count} pending ${count === 1 ? "invite" : "invites"}`;
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
  if (accessKind === "pending-invite") return `${projectName} project, pending invite, ${role} access`;
  if (accessKind === "sheet-member") return `${projectName} project, sheet-only access, ${role} access`;
  return `${projectName} project, shared project, ${role} access`;
}

export function LiveProjectCard({
  project,
  viewMode = "large",
  accessKind = "owned",
  currentUserRole = "owner",
  ownerWorkspaceName = null,
  pendingInvite = null,
  pendingInviteCount = 0,
  publicationSummary = null,
  sharedEstimateCount = 0,
  isFavorite = false,
  favoriteBusy = false,
  selectionMode = false,
  selectionChecked = false,
  selectionDisabled = false,
  selectionDisabledReason,
  onToggleSelection,
  onToggleFavorite,
  onExpand,
}: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);
  const isListView = viewMode === "list";
  const isPendingInvite = accessKind === "pending-invite";
  const isExpiredPendingInvite = isPendingInvite && pendingInvite?.state === "expired";
  const isSharedAccess = accessKind !== "owned" && !isPendingInvite;
  const livePublication = publicationSummary?.status === "published" ? publicationSummary : null;
  const openLabel = accessKind === "sheet-member" && sharedEstimateCount === 1 ? "Open sheet" : "Open";
  const projectHref = `/workshop/projects/${project.id}`;
  const prefetchRoutes = useMemo(() => [{ pathname: projectHref }], [projectHref]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);

  return (
    <article
      data-project-card-view={viewMode}
      data-project-access-kind={accessKind}
      data-project-bulk-selected={selectionChecked ? "true" : undefined}
      aria-label={getAccessibleAccessLabel({
        accessKind,
        projectName: project.name,
        role: currentUserRole,
      })}
      className={cn(
        "group flex min-w-0 overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_16px_38px_-34px_rgba(17,17,17,0.5)] transition duration-150 hover:-translate-y-0.5 hover:border-divider hover:shadow-[0_24px_52px_-38px_rgba(17,17,17,0.58)]",
        isPendingInvite ? "border-l-2 border-l-orange-500" : null,
        accessKind === "project-member" ? "border-l-2 border-l-emerald-500" : null,
        accessKind === "sheet-member" ? "border-l-2 border-l-sky-500" : null,
        isListView ? "min-h-[92px] flex-row" : "flex-col",
        selectionChecked ? "border-accent bg-accentSoft" : null,
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
              {isPendingInvite ? "Pending access" : "Add project image"}
            </span>
          </div>
        )}
        <label
          className={cn(
            "absolute left-2 top-2 z-10 grid size-7 place-items-center rounded-xs border border-white/70 bg-white/86 shadow-sm backdrop-blur transition",
            selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            selectionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          )}
          title={selectionDisabled ? selectionDisabledReason : `Select ${project.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            className="size-3 rounded-xs accent-ink"
            aria-label={`Select ${project.name}`}
            checked={selectionChecked}
            disabled={selectionDisabled}
            onChange={(event) => onToggleSelection?.(project.id, event.currentTarget.checked)}
          />
        </label>
        {isPendingInvite ? null : (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className={`absolute left-10 top-2 size-7 border-white/70 bg-white/86 shadow-sm backdrop-blur hover:bg-white disabled:cursor-wait disabled:opacity-70 ${
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
          </>
        )}
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
            <div className="flex shrink-0 items-center gap-1">
              {isSharedAccess || isPendingInvite ? (
                <span
                  className={cn(
                    "shrink-0 rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px]",
                    accessKind === "pending-invite"
                      ? "bg-orange-50 text-orange-700"
                      : accessKind === "project-member"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-sky-50 text-sky-700",
                  )}
                >
                  {getAccessBadgeLabel(accessKind)}
                </span>
              ) : null}
              {livePublication ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-orange-50 px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-orange-700">
                  <LinkSimple size={9} weight="regular" aria-hidden="true" />
                  Shared link
                </span>
              ) : null}
            </div>
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
          {livePublication ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
              <LinkSimple size={12} weight="regular" aria-hidden="true" />
              <span className="truncate">{formatOpenCount(livePublication.openCount)}</span>
              <span className="shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                {livePublication.passwordRequired ? "Password on" : "Open access"}
              </span>
            </p>
          ) : null}
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
          {isPendingInvite ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
              <span className="shrink-0 rounded-xs bg-orange-50 px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-orange-700">
                {roleLabels[currentUserRole]}
              </span>
              <span className="truncate">
                {isExpiredPendingInvite
                  ? "Invite expired"
                  : pendingInvite?.inviterLabel
                    ? `Invited by ${pendingInvite.inviterLabel}`
                    : "Invitation pending"}
              </span>
            </p>
          ) : null}
          {pendingInviteCount > 0 ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-primary">
              <span className="shrink-0 rounded-xs bg-orange-50 px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-orange-700">
                Invites
              </span>
              <span className="truncate">{formatPendingInviteCount(pendingInviteCount)}</span>
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
            {isPendingInvite && pendingInvite?.expiresAt
              ? `${isExpiredPendingInvite ? "Expired" : "Expires"} ${formatUpdatedAt(pendingInvite.expiresAt)}`
              : `Updated ${formatUpdatedAt(project.updated_at)}`}
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
          {isExpiredPendingInvite ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]"
              disabled
            >
              Expired
            </Button>
          ) : isPendingInvite && pendingInvite ? (
            <form action={acceptPendingInvitationById}>
              <input type="hidden" name="invitationId" value={pendingInvite.id} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]"
                aria-label={`Accept invite for ${project.name}`}
              >
                Accept
                <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
              </Button>
            </form>
          ) : (
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
          )}
        </div>
      </div>
    </article>
  );
}
