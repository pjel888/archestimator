import { CaretDown, CaretUp, CaretUpDown } from "@phosphor-icons/react/dist/ssr";

export function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <CaretUp size={10} weight="regular" aria-hidden="true" />;
  if (direction === "desc") return <CaretDown size={10} weight="regular" aria-hidden="true" />;
  return <CaretUpDown size={10} weight="regular" aria-hidden="true" />;
}
