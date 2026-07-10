import { AdminNotificationBroadcast } from "@/components/admin/AdminNotificationBroadcast";
import { Card } from "@/components/ui/card";

export default function AdminNotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Notifications</h1>
        <p className="text-[10px] leading-4 text-tertiary">Broadcast system notices, release announcements, and security alerts to all active users.</p>
      </div>
      <Card className="p-2">
        <AdminNotificationBroadcast />
      </Card>
    </div>
  );
}
