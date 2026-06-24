export type LibraryOverviewSearchEntry = {
  id: string;
  title: string;
  meta?: string;
  href: string;
  kind: "component" | "template" | "see-all";
};

export function libraryOverviewSearchOptionDomId(entryId: string) {
  return `library-overview-search-option-${entryId}`;
}
