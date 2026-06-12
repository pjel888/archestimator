"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProjectCollaboratorSummary } from "@/lib/collaboration/types";

export const PROJECT_COLLABORATION_CHANNEL_PREFIX = "project:";
export const PRESENCE_STATE_PURPOSE = "online-state";

type ProjectPresencePayload = {
  purpose: typeof PRESENCE_STATE_PURPOSE;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  activeRoute: string | null;
  activeEstimateId: string | null;
  activeTabId: string | null;
  focusedCell: string | null;
  onlineAt: string;
};

type UseProjectPresenceInput = {
  projectId: string | null | undefined;
  currentUser: Pick<ProjectCollaboratorSummary, "id" | "displayName" | "avatarUrl"> | null | undefined;
  activeEstimateId?: string | null;
  activeTabId?: string | null;
  focusedCell?: string | null;
  enabled?: boolean;
};

export function useProjectPresence({
  projectId,
  currentUser,
  activeEstimateId = null,
  activeTabId = null,
  focusedCell = null,
  enabled = true,
}: UseProjectPresenceInput) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!enabled || !projectId || !currentUser) return;

    let cancelled = false;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = supabase.channel(`${PROJECT_COLLABORATION_CHANNEL_PREFIX}${projectId}`, {
      config: { private: true },
    });

    function syncOnlineUsers() {
      const state = channel.presenceState() as Record<string, ProjectPresencePayload[]>;
      const nextOnlineUserIds = new Set<string>();

      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          if (presence?.purpose === PRESENCE_STATE_PURPOSE && presence.userId) {
            nextOnlineUserIds.add(presence.userId);
          }
        }
      }

      if (!cancelled) setOnlineUserIds(nextOnlineUserIds);
    }

    channel
      .on("presence", { event: "sync" }, syncOnlineUsers)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          purpose: PRESENCE_STATE_PURPOSE,
          userId: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          activeRoute: typeof window === "undefined" ? null : window.location.pathname,
          activeEstimateId,
          activeTabId,
          focusedCell,
          onlineAt: new Date().toISOString(),
        } satisfies ProjectPresencePayload);
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeEstimateId, activeTabId, currentUser, enabled, focusedCell, projectId]);

  return useMemo(() => onlineUserIds, [onlineUserIds]);
}
