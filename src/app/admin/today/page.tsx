import { AdminActionInbox } from "@/components/admin/AdminActionInbox";
import { AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { Badge } from "@/components/ui/badge";
import {
  deriveActionItemsFromSources,
  listOpenActionItems,
} from "@/lib/admin/action-inbox-repository";

export const dynamic = "force-dynamic";

// F2 (UNIT-003) "Today" — the founder's action inbox. Reconciles items from
// sources (currently open incidents) on load, then lists what needs attention.
// Snoozed items resurface automatically once their window passes.
export default async function AdminTodayPage() {
  // Best-effort reconciliation: a derive failure must not blank the inbox —
  // we still show the last-known list below.
  const derived = await deriveActionItemsFromSources().catch(() => false);
  const items = await listOpenActionItems();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Today"
        description="What needs your attention now. Snoozed items return automatically; resolved/dismissed stay closed. Initial source: open incidents — more sources arrive with later slices."
      />

      <AdminSection
        title="Action inbox"
        actions={
          <Badge
            tone={items.length > 0 ? "warning" : "success"}
            size="xs"
            className="min-w-0 px-1"
          >
            {derived ? "" : "stale · "}
            {items.length} open
          </Badge>
        }
      >
        <AdminActionInbox items={items} />
      </AdminSection>
    </AdminPage>
  );
}
