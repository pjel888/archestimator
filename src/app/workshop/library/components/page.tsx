import { LibraryComponentsRoute } from "@/components/workshop/library/LibraryComponentsRoute";
import { assertRouteErrorSmoke } from "@/lib/route-error-smoke";

type LibraryComponentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LibraryComponentsPage({ searchParams }: LibraryComponentsPageProps) {
  const resolvedSearchParams = await searchParams;
  assertRouteErrorSmoke({ routeLabel: "Components", searchParams: resolvedSearchParams });

  return <LibraryComponentsRoute searchParams={resolvedSearchParams} />;
}
