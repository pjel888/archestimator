import { AdminNotificationBroadcast } from "@/components/admin/AdminNotificationBroadcast";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { Card } from "@/components/ui/card";

export default function AdminNotificationsPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Notifications"
        description="Broadcast system notices, release announcements, and security alerts to all active users."
      />
      <Card className="p-2">
        <AdminNotificationBroadcast />
      </Card>
    </AdminPage>
  );
}
