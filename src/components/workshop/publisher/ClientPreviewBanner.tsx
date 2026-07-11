import Link from "next/link";

export function ClientPreviewBanner({ projectId }: { projectId: string }) {
  return (
    <aside role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-[12px]">
        <p><strong>Manager preview.</strong> This shows the recipient layout; comments and responses are disabled.</p>
        <Link href={`/workshop/publisher?wizard=${encodeURIComponent(projectId)}`} className="font-medium underline underline-offset-2">Back to Share</Link>
      </div>
    </aside>
  );
}
