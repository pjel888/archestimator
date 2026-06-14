"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowsOutSimple,
  Clock,
  LinkSimple,
  MapPin,
  Plus,
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
  selectedForDeletion?: boolean;
  selectionActive?: boolean;
  onToggleSelected?: (projectId: string) => void;
  onToggleFavorite?: (projectId: string, favorite: boolean) => void;
  onExpand?: (project: Tables<"projects">) => void;
};

// Action affordances rest hidden and reveal on hover or keyboard focus so the
// thumbnail reads as the project image first. While hidden they are
// pointer-events-none, so a click on the image corner falls through to the tile
// link instead of hitting an invisible button. They stay keyboard-focusable
// (Tab reveals them via focus-within). Touch devices (no hover) keep them visible.
const REVEAL_ON_INTENT =
  "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100";

const CONTROL_BUTTON = "size-6 border-hairline bg-white";

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

function getProjectMotif(project: Tables<"projects">) {
  // A quiet name monogram for image-absent tiles; the project code already lives
  // in the footer, so the thumbnail stays a distinct, non-duplicate identifier.
  const words = project.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return project.project_code?.trim() || "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
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
  if (accessKind === "sheet-member") return "Estimate-only";
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
  if (accessKind === "sheet-member") return `${projectName} project, estimate-only access, ${role} access`;
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
  selectedForDeletion = false,
  selectionActive = false,
  onToggleSelected,
  onToggleFavorite,
  onExpand,
}: LiveProjectCardProps) {
  const imageUrl = getProjectImageUrl(project.metadata);
  const isListView = viewMode === "list";
  const isPendingInvite = accessKind === "pending-invite";
  const isExpiredPendingInvite = isPendingInvite && pendingInvite?.state === "expired";
  const isSharedAccess = accessKind !== "owned" && !isPendingInvite;
  const canToggleFavorite = Boolean(onToggleFavorite) && !isPendingInvite;
  const canSelect = Boolean(onToggleSelected) && !isPendingInvite;
  const livePublication = publicationSummary?.status === "published" ? publicationSummary : null;
  const openLabel = accessKind === "sheet-member" && sharedEstimateCount === 1 ? "Open estimate" : "Open";
  const projectHref = `/workshop/projects/${project.id}`;
  const prefetchRoutes = useMemo(() => [{ pathname: projectHref }], [projectHref]);
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);
  const motif = getProjectMotif(project);
  const canAddImage = !imageUrl && accessKind === "owned" && Boolean(onExpand);

  // Density ladder: "small" = compact tile (image + title + client); "medium" adds
  // one meta line + footer; "large" is the full showcase. Pending invites keep
  // their action in every mode.
  const showMeta = !isListView && viewMode !== "small";
  const showSecondaryMeta = viewMode === "large";
  const showFooter = !isListView && viewMode !== "small";
  // Owned "small" tiles stay minimal, but a shared / estimate-only / pending tile
  // keeps its access chip even in small mode — that context is load-bearing, not
  // decorative (a user must not mistake estimate-only access for full ownership).
  const showChips =
    !isListView && (viewMode !== "small" || isSharedAccess || isPendingInvite || Boolean(livePublication));

  const accessChip = isPendingInvite ? (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-warningSoft px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-warning">
      {getAccessBadgeLabel(accessKind)}
    </span>
  ) : isSharedAccess ? (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
      {getAccessBadgeLabel(accessKind)}
    </span>
  ) : null;

  const sharedLinkChip = livePublication ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
      <LinkSimple size={9} weight="regular" aria-hidden="true" />
      Shared link
    </span>
  ) : null;

  const selectControl = canSelect ? (
    <label
      className={cn(
        "grid size-6 shrink-0 cursor-pointer place-items-center rounded-xs border border-hairline bg-white text-ink hover:bg-surfaceMuted",
        // When a selection is active the checkbox must stay clickable, so it drops
        // the reveal gate entirely rather than fighting its pointer-events.
        selectedForDeletion || selectionActive ? "opacity-100" : REVEAL_ON_INTENT,
      )}
      title="Select project for deletion"
    >
      <span className="sr-only">{`Select ${project.name} for deletion`}</span>
      <input
        type="checkbox"
        className="size-3 rounded-xs border-hairline accent-danger"
        aria-label={`Select ${project.name} for deletion`}
        checked={selectedForDeletion}
        onChange={() => onToggleSelected?.(project.id)}
      />
    </label>
  ) : null;

  const favoriteControl = canToggleFavorite ? (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={cn(
        CONTROL_BUTTON,
        "disabled:cursor-wait",
        // Favorited reads as a solid ink "pressed" toggle (not a hue change), so the
        // state survives without color (WCAG 1.4.1) and stays legible even on the
        // muted monogram thumb where a surfaceMuted fill would vanish. While a toggle
        // is in flight it stays visible so the un-favorite transition doesn't ghost.
        isFavorite
          ? "opacity-100 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
          : cn("text-tertiary hover:text-ink", favoriteBusy ? "opacity-100" : REVEAL_ON_INTENT),
      )}
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
  ) : null;

  const expandControl = isPendingInvite ? null : (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      className={cn(CONTROL_BUTTON, "text-ink", REVEAL_ON_INTENT)}
      aria-label={`Expand ${project.name} details`}
      onClick={() => onExpand?.(project)}
    >
      <ArrowsOutSimple size={13} weight="regular" aria-hidden="true" />
    </Button>
  );

  function renderThumb({
    wrapperClass,
    motifSize,
    withOverlay,
  }: {
    wrapperClass: string;
    motifSize: string;
    withOverlay: boolean;
  }) {
    return (
      <div className={cn("relative overflow-hidden bg-surfaceMuted", wrapperClass)}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2">
            <span className={cn("truncate font-medium tracking-normal text-tertiary", motifSize)}>
              {motif}
            </span>
          </div>
        )}

        {withOverlay ? (
          <>
            {selectControl ? <div className="absolute left-1.5 top-1.5 z-20">{selectControl}</div> : null}
            {favoriteControl || expandControl ? (
              <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
                {favoriteControl}
                {expandControl}
              </div>
            ) : null}
            {canAddImage ? (
              <button
                type="button"
                className={cn(
                  "absolute inset-x-1.5 bottom-1.5 z-20 inline-flex items-center justify-center gap-1 rounded-xs border border-hairline bg-white py-1 text-[9px] font-medium text-secondary hover:bg-surfaceMuted hover:text-ink",
                  REVEAL_ON_INTENT,
                )}
                aria-label={`Add an image to ${project.name}`}
                onClick={() => onExpand?.(project)}
              >
                <Plus size={11} weight="regular" aria-hidden="true" />
                Add image
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  function renderFooterAction(): ReactNode {
    if (isExpiredPendingInvite) {
      return (
        <Button type="button" variant="secondary" size="sm" className="min-h-7 shrink-0 px-2.5 text-[10px]" disabled>
          Expired
        </Button>
      );
    }
    if (isPendingInvite && pendingInvite) {
      return (
        <form action={acceptPendingInvitationById}>
          <input type="hidden" name="invitationId" value={pendingInvite.id} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="min-h-7 shrink-0 px-2.5 text-[10px]"
            aria-label={`Accept invite for ${project.name}`}
          >
            Accept
            <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
          </Button>
        </form>
      );
    }
    return (
      <Link
        href={projectHref}
        prefetch={false}
        onBlur={() => cancel(projectHref)}
        onFocus={() => prefetch(projectHref)}
        onMouseEnter={() => prefetch(projectHref)}
        onMouseLeave={() => cancel(projectHref)}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-2.5 text-[10px] font-medium text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {openLabel}
        <ArrowRight
          size={13}
          className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          aria-hidden="true"
        />
      </Link>
    );
  }

  const cardLabel = getAccessibleAccessLabel({
    accessKind,
    projectName: project.name,
    role: currentUserRole,
  });

  // ----- LIST: one horizontal scan-line row (container supplies the border + dividers) -----
  if (isListView) {
    return (
      <article
        data-project-card-view={viewMode}
        data-project-access-kind={accessKind}
        aria-label={cardLabel}
        className={cn(
          "group relative flex min-w-0 items-center gap-3 px-3 py-2 transition-colors duration-150 motion-reduce:transition-none",
          // accentSoft and surfaceMuted are the same grey, so a selected row needs a
          // ring to stay distinct from a merely hovered one during bulk delete.
          selectedForDeletion ? "bg-accentSoft ring-1 ring-inset ring-ink" : "bg-white hover:bg-surfaceMuted",
        )}
      >
        {renderThumb({
          wrapperClass: "size-12 shrink-0 rounded-xs border border-hairline",
          motifSize: "text-[9px]",
          withOverlay: false,
        })}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="min-w-0 truncate text-[11px] font-medium leading-[1.2] tracking-normal text-ink">
              {project.name}
            </h2>
            {accessChip}
            {sharedLinkChip}
          </div>
          <p className="truncate text-[9px] leading-3 text-tertiary">
            {project.client_name ?? "No client yet"}
          </p>
        </div>

        <p className="hidden min-w-0 max-w-[180px] items-center gap-1 text-[9px] leading-3 text-tertiary sm:flex">
          <MapPin size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{project.location ?? "No location"}</span>
        </p>
        <p className="hidden w-[78px] shrink-0 items-center gap-1 text-[9px] leading-3 text-tertiary md:flex">
          <Clock size={12} aria-hidden="true" className="shrink-0" />
          <span className="truncate">
            {isPendingInvite && pendingInvite?.expiresAt
              ? formatUpdatedAt(pendingInvite.expiresAt)
              : formatUpdatedAt(project.updated_at)}
          </span>
        </p>
        <span className="hidden w-[88px] shrink-0 truncate text-right font-sans text-[9px] font-medium text-tertiary lg:block">
          {project.project_code ?? "—"}
        </span>

        <div className="relative z-20 ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          {selectControl}
          {favoriteControl}
          {expandControl}
          {isPendingInvite ? (
            renderFooterAction()
          ) : (
            <span
              aria-hidden="true"
              className="pointer-events-none inline-flex h-7 shrink-0 items-center gap-1 rounded-xs px-2.5 text-[10px] font-medium text-ink"
            >
              {openLabel}
              <ArrowRight
                size={13}
                className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </span>
          )}
        </div>

        {/* Whole-row navigation; interactive controls sit above this at z-20. */}
        {isPendingInvite ? null : (
          <Link
            href={projectHref}
            prefetch={false}
            aria-label={`${openLabel} ${project.name}`}
            onBlur={() => cancel(projectHref)}
            onFocus={() => prefetch(projectHref)}
            onMouseEnter={() => prefetch(projectHref)}
            onMouseLeave={() => cancel(projectHref)}
            className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          />
        )}
      </article>
    );
  }

  // ----- TILE: small / medium / large -----
  const aspectClass = viewMode === "small" ? "aspect-square" : "aspect-[4/3]";
  const motifSize = "text-[10px]";
  const contentPad = viewMode === "large" ? "p-3" : "p-2";

  return (
    <article
      data-project-card-view={viewMode}
      data-project-access-kind={accessKind}
      aria-label={cardLabel}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-xs border bg-white transition-colors duration-150 motion-reduce:transition-none",
        selectedForDeletion ? "border-ink" : "border-hairline hover:border-tertiary/30",
      )}
    >
      {renderThumb({
        wrapperClass: cn("w-full border-b border-hairline", aspectClass),
        motifSize,
        withOverlay: true,
      })}

      <div className={cn("flex min-w-0 flex-1 flex-col", contentPad)}>
        <div className="min-w-0 space-y-1">
          {showChips && (isSharedAccess || isPendingInvite || livePublication) ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {accessChip}
              {sharedLinkChip}
            </div>
          ) : null}
          <p className="min-w-0 truncate text-[8px] font-medium uppercase tracking-normal text-tertiary">
            {project.client_name ?? "No client yet"}
          </p>
          <h2
            className={cn(
              "font-medium tracking-normal text-ink [overflow-wrap:anywhere]",
              viewMode === "large" ? "line-clamp-2 text-[12px] leading-[1.18]" : null,
              viewMode === "medium" ? "line-clamp-2 text-[11px] leading-[1.18]" : null,
              viewMode === "small" ? "line-clamp-2 text-[10px] leading-[1.2]" : null,
            )}
          >
            {project.name}
          </h2>
        </div>

        {showMeta ? (
          <div className={cn("space-y-1", viewMode === "large" ? "mt-2.5" : "mt-2")}>
            {showSecondaryMeta && livePublication ? (
              <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
                <LinkSimple size={12} weight="regular" aria-hidden="true" className="shrink-0" />
                <span className="truncate">{formatOpenCount(livePublication.openCount)}</span>
              </p>
            ) : null}
            {showSecondaryMeta && isSharedAccess ? (
              <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
                <span className="shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                  {roleLabels[currentUserRole]}
                </span>
                <span className="truncate">
                  {accessKind === "sheet-member"
                    ? `${sharedEstimateCount} ${sharedEstimateCount === 1 ? "shared estimate" : "shared estimates"}`
                    : ownerWorkspaceName
                      ? `Shared by ${ownerWorkspaceName}`
                      : "Shared with you"}
                </span>
              </p>
            ) : null}
            {showSecondaryMeta && pendingInviteCount > 0 ? (
              <p className="flex min-w-0 items-center gap-1.5 text-[9px] leading-3 text-secondary">
                <span className="shrink-0 rounded-xs bg-warningSoft px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-warning">
                  Invites
                </span>
                <span className="truncate">{formatPendingInviteCount(pendingInviteCount)}</span>
              </p>
            ) : null}
            <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{project.location ?? "No location"}</span>
            </p>
            {showSecondaryMeta ? (
              <p className="flex items-center gap-1.5 text-[9px] leading-3 text-tertiary">
                <Clock size={12} aria-hidden="true" className="shrink-0" />
                <span className="truncate">
                  {isPendingInvite && pendingInvite?.expiresAt
                    ? `${isExpiredPendingInvite ? "Expired" : "Expires"} ${formatUpdatedAt(pendingInvite.expiresAt)}`
                    : `Updated ${formatUpdatedAt(project.updated_at)}`}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {showFooter || isPendingInvite ? (
          <div
            className={cn(
              "mt-auto flex items-center justify-between gap-2 border-t border-hairline",
              viewMode === "large" ? "pt-3" : "pt-2",
            )}
          >
            <span className="truncate font-sans text-[9px] font-medium text-tertiary">
              {project.project_code ?? "—"}
            </span>
            {renderFooterAction()}
          </div>
        ) : null}
      </div>

      {/* Small tiles have no footer link: the whole tile is the navigation target. */}
      {viewMode === "small" && !isPendingInvite ? (
        <Link
          href={projectHref}
          prefetch={false}
          aria-label={`Open ${project.name}`}
          onBlur={() => cancel(projectHref)}
          onFocus={() => prefetch(projectHref)}
          onMouseEnter={() => prefetch(projectHref)}
          onMouseLeave={() => cancel(projectHref)}
          className="absolute inset-0 z-10 rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      ) : null}
    </article>
  );
}
