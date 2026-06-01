type RouteErrorSmokeSearchParams = Record<string, string | string[] | undefined>;

type RouteErrorSmokeInput = {
  routeLabel: string;
  searchParams: RouteErrorSmokeSearchParams | undefined;
};

export function assertRouteErrorSmoke({ routeLabel, searchParams }: RouteErrorSmokeInput) {
  if (process.env.ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE !== "1") return;

  const value = searchParams?.routeErrorSmoke;
  const isEnabled = value === "1" || (Array.isArray(value) && value.includes("1"));
  if (!isEnabled) return;

  throw new Error(`Route error smoke: ${routeLabel}`);
}
