import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { UploadOperationsDashboardPanel } from "@/components/admin/UploadOperationsDashboardPanel";
import { Button } from "@/components/ui/button";
import { readUploadOperationsDashboardSnapshot } from "@/lib/uploads/operations-dashboard";

const windowOptions = [
  { value: "1", label: "Last hour" },
  { value: "6", label: "Last 6 hours" },
  { value: "24", label: "Last 24 hours" },
  { value: "72", label: "Last 3 days" },
  { value: "168", label: "Last 7 days" },
] as const;

function parseWindowHours(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 24;
  if (parsed <= 1) return 1;
  if (parsed <= 6) return 6;
  if (parsed <= 24) return 24;
  if (parsed <= 72) return 72;
  return 168;
}

export default async function AdminUploadOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ windowHours?: string }>;
}) {
  const params = await searchParams;
  const windowHours = parseWindowHours(params.windowHours);
  const dashboard = await readUploadOperationsDashboardSnapshot({ windowHours });

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Upload operations"
        description="Review upload throughput, scan queue health, cleanup backlog, and operational event counters."
      />

      {!dashboard.authorized ? (
        <section className="border border-hairline bg-white p-2">
          <p className="text-[10px] leading-4 text-tertiary">
            Only platform admins can review upload operations.
          </p>
        </section>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action="/admin/upload-operations">
            <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
              Window
              <AdminStatusSelect
                name="windowHours"
                defaultValue={String(windowHours)}
                options={windowOptions}
                aria-label="Upload operations window"
                className="min-w-36"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Refresh
            </Button>
          </form>

          {dashboard.error ? (
            <div className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
              {dashboard.error}
            </div>
          ) : null}

          {dashboard.snapshot ? (
            <UploadOperationsDashboardPanel snapshot={dashboard.snapshot} />
          ) : (
            <section className="border border-hairline bg-white p-2">
              <p className="text-[10px] leading-4 text-tertiary">
                Upload operations metrics are unavailable.
              </p>
            </section>
          )}
        </>
      )}
    </AdminPage>
  );
}
