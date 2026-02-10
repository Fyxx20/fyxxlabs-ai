export const STORE_SELECTION_COOKIE = "axis_store_id";

export function resolveSelectedStore<T extends { id: string }>(
  stores: T[] | null | undefined,
  selectedStoreId: string | null | undefined
): T | null {
  if (!stores || stores.length === 0) return null;
  if (selectedStoreId) {
    const selected = stores.find((s) => s.id === selectedStoreId);
    if (selected) return selected;
  }
  return stores[0] ?? null;
}
