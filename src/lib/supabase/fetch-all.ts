const PAGE_SIZE = 1000;

/** PostgREST caps every response at 1000 rows, so any "load everything"
 *  query silently truncates past that. Pages through until a short page.
 *  The query passed in must have a stable .order() for paging to be correct. */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
