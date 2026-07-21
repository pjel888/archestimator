import { SupportChatWidgetClient } from "@/components/support/SupportChatWidgetClient";

/**
 * In-app support intake for signed-in workshop users.
 * Creates a `channel: in_app` conversation that appears in `/admin/support`.
 */
export async function SupportChatWidget() {
  return <SupportChatWidgetClient />;
}
