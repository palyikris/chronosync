/** Retrieve every Data API page instead of silently accepting its row limit.
 * Callers must apply a stable, unique ordering to their query.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  while (true) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
    // Continue until empty: a project may configure a limit below pageSize.
  }
}
