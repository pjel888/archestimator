type CoverImagePlaceholderProps = {
  projectName: string;
};

export function CoverImagePlaceholder({ projectName }: CoverImagePlaceholderProps) {
  return (
    <div
      aria-label={`${projectName} proposal cover placeholder`}
      className="flex aspect-[16/6] w-full items-end rounded-xs border border-hairline bg-gradient-to-br from-surfaceMuted via-surface to-surfaceMuted p-4 sm:aspect-[16/5]"
    >
      <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-tertiary">Proposal</p>
    </div>
  );
}
