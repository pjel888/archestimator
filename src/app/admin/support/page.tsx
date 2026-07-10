import { AdminSupportInbox } from "@/components/admin/AdminSupportInbox";
import { listSupportConversations, listSupportMessages } from "@/lib/repositories/support-conversations-repository";

export default async function AdminSupportPage() {
  const conversations = await listSupportConversations({ limit: 50 });
  const firstConversationId = conversations.data[0]?.id;
  const initialMessages = firstConversationId ? await listSupportMessages(firstConversationId) : { data: [], error: null };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Support</h1>
        <p className="text-[10px] leading-4 text-tertiary">In-app support inbox backed by D1 and audited admin actions.</p>
      </div>
      {conversations.error && <p className="text-[10px] leading-4 text-tertiary">{conversations.error}</p>}
      <AdminSupportInbox conversations={conversations.data} initialMessages={initialMessages.data} />
    </div>
  );
}
