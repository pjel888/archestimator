/**
 * Admin nav active-state helpers with no icon imports — keeps the mobile
 * bottom-nav chunk free of the full sidebar icon set.
 */
export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminPrimaryNavRoute(
  pathname: string,
  primaryHrefs: readonly string[],
) {
  return primaryHrefs.some((href) => isAdminNavActive(pathname, href));
}
