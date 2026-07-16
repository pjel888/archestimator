import { AdminActionInbox } from "@/components/admin/AdminActionInbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Today</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          What needs your attention now. Snoozed items return automatically; resolved/dismissed stay
          closed. Initial source: open incidents — more sources arrive with later slices.
        </p>
      </div>

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Action inbox</h2>
          <Badge
            tone={items.length > 0 ? "warning" : "success"}
            size="xs"
            className="min-w-0 px-1"
          >
            {derived ? "" : "stale · "}
            {items.length} open
          </Badge>
        </div>
        <AdminActionInbox items={items} />
      </Card>
    </div>
  );
}
