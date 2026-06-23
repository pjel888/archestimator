export function filterMap<T, U>(
  items: Iterable<T>,
  mapper: (item: T, index: number) => U | null | undefined,
): U[] {
  const out: U[] = [];
  let index = 0;
  for (const item of items) {
    const mapped = mapper(item, index);
    index += 1;
    if (mapped !== null && mapped !== undefined) out.push(mapped);
  }
  return out;
}

export function filterMapBy<T, U>(
  items: Iterable<T>,
  predicate: (item: T, index: number) => boolean,
  mapper: (item: T, index: number) => U,
): U[] {
  const out: U[] = [];
  let index = 0;
  for (const item of items) {
    if (predicate(item, index)) out.push(mapper(item, index));
    index += 1;
  }
  return out;
}
