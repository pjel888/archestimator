import { AdminPage } from "@/components/admin/AdminPage";

export default function AdminAllowlistLoading() {
  return (
    <AdminPage aria-busy="true" aria-label="Loading allowlist">
      <div className="flex flex-col gap-1">
        <div className="h-3 w-12 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-5 w-44 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-xs bg-surfaceMuted" />
      </div>
      <div className="h-40 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
      <div className="h-56 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
    </AdminPage>
  );
}
