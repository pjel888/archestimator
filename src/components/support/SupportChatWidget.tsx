import { Button } from "@/components/ui/button";
import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags";
import { startConversation } from "@/lib/admin/support-actions";

export async function SupportChatWidget() {
  const enabled = await isFeatureFlagEnabled("admin_support_realtime");
  if (!enabled) return null;

  async function submitSupportMessage(formData: FormData) {
    "use server";

    const initialBody = String(formData.get("message") ?? "");
    const subject = String(formData.get("subject") ?? "");
    await startConversation({
      subject,
      initialBody,
      clientMessageId: `support-widget-${Date.now()}`,
    });
  }

  return (
    <form action={submitSupportMessage} className="rounded-xs border border-hairline bg-white p-2" aria-label="Support chat">
      <p className="text-[11px] font-medium leading-4 text-ink">Need help?</p>
      <p className="mb-2 text-[9px] leading-4 text-tertiary">Send a short in-app support note to the Archestimator team.</p>
      <input
        name="subject"
        className="mb-1 w-full rounded-xs border border-hairline px-2 py-1 text-[10px] leading-4 text-ink"
        placeholder="Subject"
      />
      <textarea
        name="message"
        className="min-h-16 w-full resize-none rounded-xs border border-hairline p-2 text-[10px] leading-4 text-ink"
        placeholder="How can we help?"
        required
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="xs" variant="outline">
          Send
        </Button>
      </div>
    </form>
  );
}
