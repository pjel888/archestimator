"use client";

import { useCallback } from "react";

import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import { loadPublisherWorkspaceActivity } from "@/lib/publisher/activity-actions";

type PublisherActivityFeedProps = {
  projectId?: string | null;
};

export function PublisherActivityFeed({ projectId = null }: PublisherActivityFeedProps) {
  const loadActivity = useCallback(
    (cursor?: string | null) =>
      loadPublisherWorkspaceActivity({
        cursor,
        limit: 50,
        projectId,
      }),
    [projectId],
  );

  return (
    <SharedLinkActivityFeed
      loadActivity={loadActivity}
      feedLabel={projectId ? "Publisher project activity" : "Publisher workspace activity"}
      loadingLabel="Loading Publisher activity"
      emptyLabel="No Publisher activity yet."
      footerLabel="Publisher activity refreshes when you reopen this tab. Use Refresh for the latest."
      isOwner
    />
  );
}
