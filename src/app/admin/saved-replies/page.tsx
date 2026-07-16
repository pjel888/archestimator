import { AdminSavedReplies } from "@/components/admin/AdminSavedReplies";
import { Card } from "@/components/ui/card";
import { listSavedReplies } from "@/lib/admin/saved-replies-repository";

export const dynamic = "force-dynamic";

// F4 (UNIT-005) Saved replies — admin canned responses for support/customer comms.
export default async function AdminSavedRepliesPage() {
  const replies = await listSavedReplies();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Saved replies</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Canned responses for support and customer communications.
        </p>
      </div>
      <Card className="p-2">
        <AdminSavedReplies initialReplies={replies} />
      </Card>
    </div>
  );
}
