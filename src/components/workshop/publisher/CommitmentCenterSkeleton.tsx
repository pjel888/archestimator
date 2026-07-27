export function CommitmentCenterSkeleton() {
  return (
    <div className="min-h-full animate-pulse bg-canvas p-4 sm:p-6 lg:p-8" aria-label="Loading Commitment Center">
      <div className="h-24 border border-hairline bg-white" />
      <div className="mt-5 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div className="h-24 bg-white" key={index} />)}
      </div>
      <div className="mt-5 h-80 border border-hairline bg-white" />
    </div>
  );
}
