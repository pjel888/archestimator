import { LibraryOverview } from "@/components/workshop/library/overview/LibraryOverview";
import { getLibraryOverview } from "@/lib/repositories/component-library-repository";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Library Overview home: one lightweight `getLibraryOverview()` fetch
 * (counts, recents, health stats) — the full component and template
 * datasets stay on their own tabs.
 */
export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Library", searchParams: await searchParams });

  const overview = await getLibraryOverview();

  return <LibraryOverview overview={overview} />;
}
