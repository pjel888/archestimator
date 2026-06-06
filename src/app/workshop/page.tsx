import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import {
  WorkshopHomebaseClient,
  type WorkshopRemovedProjectBannerState,
} from "@/components/workshop/WorkshopHomebaseClient";
import { PENDING_INVITE_COOKIE } from "@/lib/collaboration/pending-invite";
import type { WorkshopInviteBannerState } from "@/lib/collaboration/workshop-pending-invite";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { isUuid } from "@/lib/ids";
import { getWorkshopHomebaseData } from "@/lib/repositories/workspace-repository";

type WorkshopPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function readDisplayParam(params: Record<string, string | string[] | undefined>, key: string, maxLength: number) {
  const value = readParam(params, key)?.trim();
  if (!value) return null;
  return value.slice(0, maxLength);
}

function readInviteBannerFromSearchParams(params: Record<string, string | string[] | undefined>): WorkshopInviteBannerState {
  const invite = readParam(params, "invite");
  if (invite === "accepted") {
    const scope = readParam(params, "scope") === "estimate" ? "estimate" : "project";
    const targetHref = readParam(params, "targetHref");
    const targetLabel = readParam(params, "targetLabel");
    return {
      kind: "accepted",
      projectName: readDisplayParam(params, "projectName", 96),
      roleLabel: readDisplayParam(params, "roleLabel", 32),
      scope,
      targetHref: targetHref?.startsWith("/workshop/projects") ? targetHref : "/workshop/projects",
      targetLabel: targetLabel === "Open sheet" ? "Open sheet" : "Open project",
    };
  }
  if (invite === "wrong-account") {
    return { kind: "wrong-account", invitedEmail: readParam(params, "email") };
  }
  if (invite === "unavailable") {
    const reason = readParam(params, "reason");
    if (reason === "expired" || reason === "revoked" || reason === "already-used" || reason === "error") {
      return { kind: "unavailable", reason };
    }
    return { kind: "unavailable", reason: "invalid" };
  }
  return { kind: "none" };
}

function readRemovedProjectBannerFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): WorkshopRemovedProjectBannerState | undefined {
  const projectId = readParam(params, "removedProject");
  if (!projectId || !isUuid(projectId)) return undefined;

  return {
    projectId,
    projectName: readDisplayParam(params, "projectName", 96),
  };
}

export default async function WorkshopPage({ searchParams }: WorkshopPageProps) {
  // Pending invite bridge cookie: archestimator_pending_invite.
  const resolvedSearchParams = await searchParams ?? {};
  const inviteBanner = readInviteBannerFromSearchParams(resolvedSearchParams);
  const removedProjectBanner = readRemovedProjectBannerFromSearchParams(resolvedSearchParams);
  const cookieStore = await cookies();
  if (cookieStore.get(PENDING_INVITE_COOKIE)?.value && inviteBanner.kind === "none") {
    redirect("/workshop/pending-invite");
  }

  const homebase = await getWorkshopHomebaseData();
  const currentUser = await requireCurrentUserContext();

  return (
    <WorkshopPageShell
      title="Workshop"
      showEyebrow={false}
      breadcrumbs={["Workshop"]}
      contentClassName="overflow-hidden"
      sidebarStatus={{ projectsBadgeCount: homebase.receivedPendingInviteCount }}
    >
      <WorkshopHomebaseClient
        homebase={homebase}
        inviteBanner={inviteBanner}
        removedProjectBanner={removedProjectBanner}
        userDisplayName={currentUser.displayName}
      />
    </WorkshopPageShell>
  );
}
