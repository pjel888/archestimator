import { libraryOverviewSearchOptionDomId, type LibraryOverviewSearchEntry } from "./LibraryOverviewSearchModel";

type LibraryOverviewSearchGroupProps = {
  label: string;
  entries: LibraryOverviewSearchEntry[];
  highlightedId: string | null;
  onActivate: (entry: LibraryOverviewSearchEntry) => void;
  onHighlight: (entryId: string) => void;
};

export function LibraryOverviewSearchGroup({
  label,
  entries,
  highlightedId,
  onActivate,
  onHighlight,
}: LibraryOverviewSearchGroupProps) {
  if (entries.length === 0) return null;

  return (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Result groups are named ARIA groups inside a listbox; <address> would be incorrect.
    <div role="group" aria-label={label}>
      <p className="px-2 pb-0.5 pt-2 text-[8px] font-medium uppercase leading-3 text-tertiary" aria-hidden="true">
        {label}
      </p>
      {entries.map((entry) => {
        const highlighted = entry.id === highlightedId;
        return (
          <button
            key={entry.id}
            type="button"
            id={libraryOverviewSearchOptionDomId(entry.id)}
            role="option"
            aria-selected={highlighted}
            data-library-overview-search-result={entry.id}
            className={`flex w-full items-baseline gap-1.5 px-2 py-1.5 text-left transition hover:bg-surfaceMuted ${highlighted ? "bg-surfaceMuted" : ""}`}
            onPointerEnter={() => onHighlight(entry.id)}
            onClick={() => onActivate(entry)}
          >
            {entry.kind === "see-all" ? (
              <span className="text-[9px] font-medium leading-3 text-secondary">{entry.title}</span>
            ) : (
              <>
                <span className="min-w-0 truncate text-[10px] font-medium leading-4 text-ink">{entry.title}</span>
                {entry.meta ? (
                  <span className="min-w-0 truncate text-[9px] font-normal leading-3 text-tertiary">{entry.meta}</span>
                ) : null}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
