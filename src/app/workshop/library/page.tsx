import { LibraryOverview } from "@/components/workshop/library/overview/LibraryOverview";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  assertRouteErrorSmoke({ routeLabel: "Library", searchParams: await searchParams });

  return <LibraryOverview />;
}
