export function buildProposalWorkbookFilename(...parts: Array<string | null | undefined>) {
  const safeStem = parts
    .flatMap((value) => {
      const safePart = (value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return safePart ? [safePart] : [];
    })
    .join("-");

  return `${safeStem || "estimate"}-proposal.xlsx`;
}
