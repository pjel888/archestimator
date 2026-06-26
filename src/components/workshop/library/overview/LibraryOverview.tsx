/**
 * Empty Overview landing surface. The persistent Library header now owns
 * search and creation actions, and the overview content below it is
 * intentionally cleared at the owner's request.
 */
export function LibraryOverview() {
  return <div className="h-full min-h-0 bg-transparent" data-library-overview="empty" />;
}
