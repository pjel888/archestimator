"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { useToggleProjectFavorite } from "@/hooks/use-toggle-project-favorite";

import { Button } from "@/components/ui/button";
import { WorkshopDashboard } from "@/components/workshop/dashboard/WorkshopDashboard";
import type { DashboardLibrarySpotlight } from "@/components/workshop/dashboard/lib";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { acceptPendingInvitationById, signOutForPendingInvite } from "@/lib/collaboration/pending-invite-actions";
import type { WorkshopInviteBannerState } from "@/lib/collaboration/workshop-pending-invite";
import type {
  WorkshopHomebaseData,
  WorkshopPendingInviteSummary,
  WorkshopRemovedProjectFavoriteSummary,
} from "@/lib/repositories/workspace-repository";

type WorkshopHomebaseClientProps = {
  homebase: WorkshopHomebaseData;
  favoriteProjects: MainSidebarFavoriteProject[];
  librarySpotlight: DashboardLibrarySpotlight | null;
  inviteBanner?: WorkshopInviteBannerState;
  removedProjectBanner?: WorkshopRemovedProjectBannerState;
  favoritesScope: { workspaceId: string; userId: string };
  userDisplayName?: string | null;
};

export type WorkshopRemovedProjectBannerState = {
  projectId: string;
  projectName: string | null;
};

type WorkshopRemovedProjectNotice = WorkshopRemovedProjectFavoriteSummary & {
  projectName: string | null;
};

export function WorkshopHomebaseClient({
  homebase,
  favoriteProjects,
  librarySpotlight,
  inviteBanner,
  removedProjectBanner,
  favoritesScope,
  userDisplayName,
}: WorkshopHomebaseClientProps) {
  const router = useNavigationRouter();
  const toggleProjectFavoriteMutation = useToggleProjectFavorite(favoritesScope);
  const [pendingFavoriteKey, setPendingFavoriteKey] = useState<string | null>(null);
  const [dismissedRemovedProjectIds, setDismissedRemovedProjectIds] = useState<Record<string, boolean>>({});

  const removedProjectNotice = useMemo(() => {
    const byId = new Map<string, WorkshopRemovedProjectNotice>();
    if (removedProjectBanner) {
      byId.set(removedProjectBanner.projectId, {
        id: removedProjectBanner.projectId,
        name: removedProjectBanner.projectName,
        projectName: removedProjectBanner.projectName,
        projectCode: null,
        favoriteCreatedAt: null,
      });
    }
    for (const favorite of homebase.removedProjectFavorites) {
      if (byId.has(favorite.id)) continue;
      byId.set(favorite.id, {
        ...favorite,
        projectName: favorite.name,
      });
    }
    return Array.from(byId.values()).find((notice) => !dismissedRemovedProjectIds[notice.id]) ?? null;
  }, [dismissedRemovedProjectIds, homebase.removedProjectFavorites, removedProjectBanner]);

  function removeRemovedProjectFavorite(projectId: string) {
    const notice = removedProjectNotice;
    setPendingFavoriteKey(`removed-project:${projectId}`);
    toggleProjectFavoriteMutation.toggle(
      {
        project: {
          id: projectId,
          name: notice?.projectName ?? "",
          projectCode: notice?.projectCode ?? null,
          href: `/workshop/projects/${projectId}/estimates`,
          favoriteCreatedAt: null,
        },
        favorite: false,
      },
      {
        onSuccess: () => {
          setDismissedRemovedProjectIds((current) => ({ ...current, [projectId]: true }));
          // D8: navigation dismisses the banner + returns home — a separate concern
          // from favorite cache propagation, so it survives the no-full-tree-refresh rule.
          router.replace("/workshop", { scroll: false });
        },
        onSettled: () => setPendingFavoriteKey(null),
      },
    );
  }

  const hasBanners =
    (inviteBanner ? inviteBanner.kind !== "none" : false) ||
    Boolean(removedProjectNotice) ||
    homebase.pendingInvites.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      {hasBanners ? (
        <div className="flex flex-col gap-2 p-2 pb-0">
          <InviteResolutionBanner inviteBanner={inviteBanner} />
          <RemovedProjectFavoriteBanner
            notice={removedProjectNotice}
            pending={removedProjectNotice ? pendingFavoriteKey === `removed-project:${removedProjectNotice.id}` : false}
            onRemoveFavorite={removeRemovedProjectFavorite}
          />
          <PendingInvitesPanel invites={homebase.pendingInvites} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <WorkshopDashboard
          homebase={homebase}
          favoriteProjects={favoriteProjects}
          librarySpotlight={librarySpotlight}
          userDisplayName={userDisplayName}
        />
      </div>
    </div>
  );
}

function RemovedProjectFavoriteBanner({
  notice,
  pending,
  onRemoveFavorite,
}: {
  notice: WorkshopRemovedProjectNotice | null;
  pending: boolean;
  onRemoveFavorite: (projectId: string) => void;
}) {
  if (!notice) return null;

  const projectLabel = notice.projectName?.trim() || "this project";
  const message = notice.projectName
    ? `You no longer have access to ${projectLabel}. The project owner may have changed your access.`
    : "You no longer have access to this project. The project owner may have changed your access.";

  return (
    <section
      className="flex min-h-10 items-center justify-between gap-3 border border-hairline bg-surfaceMuted px-3 py-2"
      aria-label="Project access removed"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-4 text-ink">Project access removed</p>
        <p className="truncate text-[9px] leading-4 text-tertiary">{message}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]"
        disabled={pending}
        onClick={() => onRemoveFavorite(notice.id)}
      >
        Remove from favorites
      </Button>
    </section>
  );
}

function PendingInvitesPanel({ invites }: { invites: WorkshopPendingInviteSummary[] }) {
  if (invites.length === 0) return null;
  const actionableInviteCount = invites.filter((invite) => invite.state !== "expired").length;

  return (
    <section
      className="border border-hairline bg-surfaceMuted/35 p-2"
      aria-label="Pending invites"
    >
      <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Shared with you</p>
          <h2 className="truncate text-[12px] font-medium leading-4 text-ink">Pending invites</h2>
        </div>
        <span className="shrink-0 rounded-xs bg-white px-1.5 py-0.5 text-[9px] font-medium leading-4 text-secondary ring-1 ring-hairline">
          {formatPendingInviteCount(actionableInviteCount)}
        </span>
      </div>
      <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
        {invites.map((invite) => {
          const targetName = invite.scope === "estimate" && invite.estimateName ? invite.estimateName : invite.projectName;
          const isExpiredInvite = invite.state === "expired";
          const expiryLabel = invite.expiresAt ? `${isExpiredInvite ? "Expired" : "Expires"} ${formatUpdatedAt(invite.expiresAt)}` : null;
          const openedLabel = invite.lastOpenedAt ? `Opened ${formatUpdatedAt(invite.lastOpenedAt)}` : null;

          return (
            <div key={invite.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 border border-hairline bg-white p-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium leading-4 text-ink">{invite.projectName}</p>
                <span className="mt-0.5 flex max-w-full flex-wrap items-center gap-1">
                  <span className="inline-flex max-w-full rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-tertiary">
                    {invite.projectCode ?? "No project code"}
                  </span>
                  <span className="inline-flex max-w-full rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-secondary">
                    {homebaseRoleLabels[invite.role]}
                  </span>
                  <span className="inline-flex max-w-full rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium leading-[10px] text-tertiary">
                    <span className="truncate">{invite.inviterLabel ?? "Archestimator collaborator"}</span>
                  </span>
                </span>
                {invite.scope === "estimate" && invite.estimateName ? (
                  <p className="truncate text-[9px] leading-4 text-secondary">{invite.estimateName}</p>
                ) : null}
                {expiryLabel || openedLabel ? (
                  <span className="mt-0.5 flex max-w-full flex-wrap items-center gap-1">
                    {expiryLabel ? <span className="text-[8px] leading-4 text-tertiary">{expiryLabel}</span> : null}
                    {openedLabel ? <span className="text-[8px] leading-4 text-tertiary">{openedLabel}</span> : null}
                  </span>
                ) : null}
              </div>
              {isExpiredInvite ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]"
                  disabled
                >
                  Expired
                </Button>
              ) : (
                <form action={acceptPendingInvitationById} className="self-center">
                  <input type="hidden" name="invitationId" value={invite.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]"
                    aria-label={`Accept invite for ${targetName}`}
                  >
                    Accept
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InviteResolutionBanner({
  inviteBanner,
}: {
  inviteBanner?: WorkshopInviteBannerState;
}) {
  if (!inviteBanner || inviteBanner.kind === "none") return null;

  if (inviteBanner.kind === "accepted") {
    const title = inviteBanner.scope === "estimate" ? "Estimate shared" : "Project added";
    const acceptedDetail = inviteBanner.projectName && inviteBanner.roleLabel
      ? `You've been added as ${inviteBanner.roleLabel} to ${inviteBanner.projectName}.`
      : "The shared workspace is ready.";
    return (
      <section
        className="flex min-h-10 items-center justify-between gap-3 border border-hairline bg-surfaceMuted px-3 py-2"
        aria-label={title}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-ink">{title}</p>
          <p className="truncate text-[9px] leading-4 text-tertiary">{acceptedDetail}</p>
        </div>
        <Link href={inviteBanner.targetHref} className="shrink-0 text-[10px] font-medium leading-none text-ink underline">
          {inviteBanner.targetLabel}
        </Link>
      </section>
    );
  }

  if (inviteBanner.kind === "wrong-account") {
    const invitedEmail = inviteBanner.invitedEmail ?? "the invited email";
    return (
      <section
        className="flex min-h-10 items-center justify-between gap-3 border border-hairline bg-surfaceMuted px-3 py-2"
        aria-label="Invite unavailable"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-4 text-ink">Invite not applied</p>
          <p className="text-[9px] leading-4 text-tertiary">
            Sign out and continue with {invitedEmail} to accept this invite.
          </p>
        </div>
        <form action={signOutForPendingInvite}>
          <Button type="submit" variant="secondary" size="sm" className="min-h-7 shrink-0 rounded-xs px-2 text-[10px]">
            Sign out and continue
          </Button>
        </form>
      </section>
    );
  }

  const message = inviteBanner.reason === "expired"
    ? "That invite expired. Ask the sender for a new link."
    : "That invite is no longer available.";

  return (
    <section
      className="min-h-10 border border-hairline bg-surfaceMuted px-3 py-2"
      aria-label="Invite unavailable"
    >
      <p className="text-[11px] font-medium leading-4 text-ink">Invite not applied</p>
      <p className="text-[9px] leading-4 text-tertiary">{message}</p>
    </section>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatPendingInviteCount(count: number) {
  return `${count} pending ${count === 1 ? "invite" : "invites"}`;
}

const homebaseRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
} as const;
