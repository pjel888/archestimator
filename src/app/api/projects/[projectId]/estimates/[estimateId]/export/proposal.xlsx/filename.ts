export function buildProposalWorkbookFilename(projectCodeOrName: string | null | undefined, estimateCodeOrName: string | null | undefined) {
  const safeStem = [projectCodeOrName, estimateCodeOrName]
    .map((value) =>
      (value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");

  return `${safeStem || "estimate"}-proposal.xlsx`;
}
