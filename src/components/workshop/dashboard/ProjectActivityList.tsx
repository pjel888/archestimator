import { SectionHeading } from "@/components/ui/section-heading";
import { formatRelativeTime } from "@/lib/util/relative-time";

/**
 * Zone D — the curated recent-activity strip (R10). Slim by design: ≤8 rows,
 * day-grouped, hairline dividers, never a third of the canvas. When the feature
 * flag is off (`activities === null`) or there is simply nothing yet, it degrades
 * to a single muted line — never a large empty box.
 */
const MAX_VISIBLE_ROWS = 8;

export type ProjectActivityListItem = {
  id: string;
  title: string;
  occurredAt: string;
};

type ProjectActivityListProps = {
  /** Narrow client-safe rows, or `null` when the feature flag is off. */
  activities: ProjectActivityListItem[] | null;
};

type ActivityDayGroup = { key: string; label: string; items: ProjectActivityListItem[] };

export function ProjectActivityList({ activities }: ProjectActivityListProps) {
  if (activities === null) {
    return (
      <section aria-label="Recent activity" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
        <SectionHeading>Recent activity</SectionHeading>
        <p className="text-[9px] leading-3 text-secondary">Activity is not enabled in this environment.</p>
      </section>
    );
  }

  const rows = activities ?? [];

  if (rows.length === 0) {
    return (
      <section aria-label="Recent activity" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
        <SectionHeading>Recent activity</SectionHeading>
        <p className="text-[9px] leading-3 text-secondary">No recent activity yet.</p>
      </section>
    );
  }

  const groups = groupByDay(rows.slice(0, MAX_VISIBLE_ROWS));

  return (
    <section aria-label="Recent activity" className="flex flex-col gap-2 rounded-xs border border-hairline bg-white p-3">
      <SectionHeading>Recent activity</SectionHeading>
      <div className="flex flex-col">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="sticky top-0 z-[1] bg-white py-1 text-[8px] font-medium uppercase tracking-normal text-secondary">
              {group.label}
            </p>
            <ul className="flex flex-col">
              {group.items.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between gap-2 border-t border-hairline py-1.5 text-[9px] leading-3 first:border-t-0"
                >
                  <span className="min-w-0 truncate text-ink">{activity.title}</span>
                  <time className="shrink-0 tabular-nums text-secondary" dateTime={activity.occurredAt}>
                    {formatRelativeTime(activity.occurredAt)}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByDay(rows: ProjectActivityListItem[], now: Date = new Date()): ActivityDayGroup[] {
  const groups: ActivityDayGroup[] = [];
  const byKey = new Map<string, ActivityDayGroup>();

  for (const row of rows) {
    const date = new Date(row.occurredAt);
    const key = Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: dayLabel(date, now), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(row);
  }

  return groups;
}

function dayLabel(date: Date, now: Date): string {
  if (Number.isNaN(date.getTime())) return "Earlier";
  const startOf = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  const dayDiff = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
