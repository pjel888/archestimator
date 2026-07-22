import { AdminPage } from "@/components/admin/AdminPage";

/**
 * Shared admin segment loading skeleton — keeps route transitions feeling
 * instant while RSC payloads stream in.
 */
export default function AdminLoading() {
  return (
    <AdminPage aria-busy="true" aria-label="Loading admin page">
      <div className="flex flex-col gap-1">
        <div className="h-3 w-12 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-5 w-40 animate-pulse rounded-xs bg-surfaceMuted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-xs bg-surfaceMuted" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
      <div className="h-64 animate-pulse rounded-xs border border-hairline bg-surfaceMuted/50" />
    </AdminPage>
  );
}
