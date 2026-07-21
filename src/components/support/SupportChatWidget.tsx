import { SupportChatWidgetClient } from "@/components/support/SupportChatWidgetClient";
import { isSupportChatEnabled } from "@/lib/feature-gates/enforce";

/**
 * In-app support intake for signed-in workshop users.
 * Creates a `channel: in_app` conversation that appears in `/admin/support`.
 * Gated by `admin_support_realtime` so operators can disable it from /admin/flags.
 */
export async function SupportChatWidget() {
  if (!(await isSupportChatEnabled())) return null;
  return <SupportChatWidgetClient />;
}
