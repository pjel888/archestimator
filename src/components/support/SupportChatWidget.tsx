import { Button } from "@/components/ui/button";
import { startConversation } from "@/lib/admin/support-actions";

/**
 * In-app support intake for signed-in workshop users.
 * Creates a `channel: in_app` conversation that appears in `/admin/support`.
 */
export async function SupportChatWidget() {
  async function submitSupportMessage(formData: FormData) {
    "use server";

    const initialBody = String(formData.get("message") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    if (initialBody.length < 2) return;
    await startConversation({
      subject: subject || "Support request",
      initialBody,
      clientMessageId: `support-widget-${crypto.randomUUID()}`,
    });
  }

  return (
    <form
      action={submitSupportMessage}
      className="rounded-xs border border-hairline bg-white p-2"
      aria-label="In-app support message"
    >
      <p className="text-[11px] font-medium leading-4 text-ink">Message support</p>
      <p className="mb-2 text-[9px] leading-4 text-tertiary">
        Sends an in-app note to the Archestimator team. It shows up in Admin → Support (not email).
      </p>
      <label className="mb-1 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-widget-subject">
        Subject
      </label>
      <input
        id="support-widget-subject"
        name="subject"
        className="mb-1.5 w-full rounded-xs border border-hairline px-2 py-1 text-[10px] leading-4 text-ink"
        placeholder="What do you need help with?"
      />
      <label className="mb-1 block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="support-widget-message">
        Message
      </label>
      <textarea
        id="support-widget-message"
        name="message"
        className="min-h-16 w-full resize-none rounded-xs border border-hairline p-2 text-[10px] leading-4 text-ink"
        placeholder="Describe the issue or question…"
        required
        minLength={2}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[9px] leading-3 text-tertiary">Visible to platform admins in the support inbox.</p>
        <Button type="submit" size="xs" variant="outline">
          Send to support
        </Button>
      </div>
    </form>
  );
}
