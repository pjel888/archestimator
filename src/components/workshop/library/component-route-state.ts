export const COMPONENTS_LIBRARY_PATH = "/workshop/library/components";
export const COMPONENT_ROUTE_PARAM = "component";

export function getComponentDetailsHref(componentId: string) {
  const params = new URLSearchParams();
  params.set(COMPONENT_ROUTE_PARAM, componentId);
  return `${COMPONENTS_LIBRARY_PATH}?${params.toString()}`;
}

export function buildComponentRouteStateHref({
  pathname,
  searchParams,
  componentId,
}: {
  pathname: string | null | undefined;
  searchParams: string;
  componentId: string | null;
}) {
  const params = new URLSearchParams(searchParams);
  if (componentId) params.set(COMPONENT_ROUTE_PARAM, componentId);
  else params.delete(COMPONENT_ROUTE_PARAM);

  const query = params.toString();
  return `${pathname || COMPONENTS_LIBRARY_PATH}${query ? `?${query}` : ""}`;
}
