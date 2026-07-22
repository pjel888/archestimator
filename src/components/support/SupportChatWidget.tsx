import { SupportChatWidgetClient } from "@/components/support/SupportChatWidgetClient";
import { getCurrentUserContext } from "@/lib/auth/session";

/**
 * Full-page Support Center host for signed-in workshop users.
 * Realtime may degrade independently; durable D1 support remains available.
 */
export async function SupportChatWidget() {
  const currentUser = await getCurrentUserContext();
  return (
    <SupportChatWidgetClient
      host="page"
      workspaceId={currentUser?.profile.default_workspace_id ?? null}
    />
  );
}
