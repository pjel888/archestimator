import { Button } from "@/components/ui/button";
import { UploadScanOverridePanel } from "@/components/workshop/UploadScanOverridePanel";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
import { requirePlatformAdminPage } from "@/lib/auth/require-platform-admin-page";
import {
  isUploadScanOverrideReviewStatus,
  readUploadScanOverrideReviewQueue,
  UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES,
  type UploadScanOverrideReviewStatus,
} from "@/lib/uploads/scan-override-review";

const statusLabels: Record<UploadScanOverrideReviewStatus, string> = {
  failed_permanent: "Failed permanent",
  unsupported: "Unsupported",
};

const statusOptions = UPLOAD_SCAN_OVERRIDE_REVIEW_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const statusFilterOptions = [{ value: "", label: "All override statuses" }, ...statusOptions];

export default async function UploadScanOverridesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatformAdminPage();
  const params = await searchParams;
  const queue = await readUploadScanOverrideReviewQueue(params.status);

  return (
    <WorkshopRouteHeader
      title="Scan overrides"
      eyebrow="Settings"
      description="Review failed or unsupported component attachment scans before approving a temporary audited override."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Scan overrides",
      ]}
      contentClassName="overflow-y-auto p-2"
    >

      <div className="max-w-6xl space-y-3">
        {!queue.authorized ? (
          <section className="border border-hairline bg-white p-2">
            <p className="text-[10px] leading-4 text-tertiary">
              Only platform admins can approve upload scan overrides.
            </p>
          </section>
        ) : (
          <>
            <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action="/workshop/settings/scan-overrides">
              <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                Status
                <AdminStatusSelect
                  name="status"
                  defaultValue={params.status && isUploadScanOverrideReviewStatus(params.status) ? params.status : ""}
                  options={statusFilterOptions}
                  aria-label="Scan override status filter"
                  className="min-w-44"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </form>

            {queue.error ? (
              <div className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
                {queue.error}
              </div>
            ) : null}

            <UploadScanOverridePanel rows={queue.rows} />
          </>
        )}
      </div>
    </WorkshopRouteHeader>
  );
}
